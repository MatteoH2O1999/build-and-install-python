// Action to build any Python version on the latest labels and install it into the local tool cache.
// Copyright (C) 2022 Matteo Dell'Acqua
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import Builder from './builder';
import fs from 'fs';
import path from 'path';

export default class WindowsBuilder extends Builder {
  async build(): Promise<string> {
    // Prepare envirnoment
    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Build python
    const command = `${path.join(this.path, 'PCbuild', 'build.bat')} -e -p ${
      this.arch
    }`;
    core.debug(`Build command: ${command}`);
    core.startGroup('Building Python');
    const result = await exec.exec(command, [], {ignoreReturnCode: true});
    core.endGroup();
    if (result !== 0) {
      throw new Error('Build task failed');
    }

    // Test built python
    const testCommand = `${path.join(
      this.path,
      'PCbuild',
      this.buildSuffix(),
      'python.exe'
    )} -m test`;
    core.debug(`Test command: ${testCommand}`);
    core.startGroup('Testing built Python');
    const testResult = await exec.exec(testCommand, [], {
      ignoreReturnCode: true
    });
    core.endGroup();
    if (testResult !== 0) {
      throw new Error('Built Python does not pass tests');
    }

    return path.join(this.path, this.buildSuffix());
  }

  buildSuffix(): string {
    switch (this.arch) {
      case 'x64':
        return path.join(this.path, 'PCbuild', 'amd64');
      case 'x86':
        return path.join(this.path, 'PCbuild', 'win32');
    }
    throw new Error(`Architecture ${this.arch} not supported`);
  }

  CacheKeyOs(): string {
    return 'win32';
  }

  async prepareEnvironment(): Promise<void> {
    // Download source and move it to path
    core.startGroup('Preparing sources');

    core.info('Downloading source zipBall...');
    core.info(`Zipball uri: ${this.tagZipUri}`);
    const zipPath = await tc.downloadTool(this.tagZipUri);

    core.info('Extracting zip...');
    const sourcePath = await tc.extractZip(zipPath);

    core.info('Removing source zip...');
    await io.rmRF(zipPath);

    const dirNames = fs.readdirSync(sourcePath);
    if (dirNames.length !== 1) {
      throw new Error(`Expected only one folder. Got ${dirNames}`);
    }
    const dirName = dirNames[0];
    if (!dirName.startsWith('python-cpython')) {
      throw new Error(
        `Expected directory to start with "python-cpython...", got ${dirName}`
      );
    }
    const sources = path.join(sourcePath, dirName);
    core.debug(`Sources extracted in ${sources}`);

    core.info('Moving sources to base directory...');
    await io.cp(sources, this.path, {
      copySourceDirectory: false,
      recursive: true
    });
    await io.rmRF(sourcePath);
    core.endGroup();
    await exec.exec(`tree ${this.path}`);
    throw new Error();
  }
}
