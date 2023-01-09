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
import Builder from './builder';
import path from 'path';

export default class WindowsBuilder extends Builder {
  private readonly MSBUILD: string = process.env.MSBUILD || '';

  async build(): Promise<string> {
    // Prepare envirnoment
    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Prepare sources
    core.debug('Preparing sources...');
    await this.prepareSources();
    core.debug('Sources ready');

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

    // Cleaning environment
    core.debug('Cleaning environment...');
    await this.cleanEnvironment();
    core.debug('Environment cleaned');

    return path.join(this.path, this.buildSuffix());
  }

  buildSuffix(): string {
    switch (this.arch) {
      case 'x64':
        return path.join('PCbuild', 'amd64');
      case 'x86':
        return path.join('PCbuild', 'win32');
    }
    throw new Error(`Architecture ${this.arch} not supported`);
  }

  CacheKeyOs(): string {
    return 'win32';
  }

  async prepareEnvironment(): Promise<void> {
    // Detect MSBUILD
    core.startGroup('Searching for msbuild.exe');
    try {
      await exec.exec('vswhere', [], {silent: true});
    } catch (error) {
      await exec.exec('choco install vswhere', [], {ignoreReturnCode: true});
    }
    let msBuildPath = '';
    await exec.exec(
      'vswhere -latest -requires Microsoft.Component.MSBuild -find "MSBuild\\**\\Bin\\MSBuild.exe"',
      [],
      {
        listeners: {
          stdout: (data: Buffer) => {
            msBuildPath += data.toString();
          }
        }
      }
    );
    core.info(`Found msbuild.exe at ${msBuildPath}`);
    core.info('Temporarily adding as environment variable...');
    core.exportVariable('MSBUILD', msBuildPath);
    core.endGroup();
  }

  async cleanEnvironment(): Promise<void> {
    core.startGroup('Cleaning environment');

    core.info('Cleaning temp MSBUILD variable...');
    core.exportVariable('MSBUILD', this.MSBUILD);

    core.endGroup();
  }
}
