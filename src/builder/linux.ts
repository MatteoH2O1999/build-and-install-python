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
import fs from 'fs';
import path from 'path';
import semver from 'semver';
import {ubuntuDependencies} from '../constants';

export default class LinuxBuilder extends Builder {
  override async build(): Promise<string> {
    // Prepare envirnoment
    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Prepare sources
    core.debug('Preparing sources...');
    await this.prepareSources();
    core.debug('Sources ready');

    // Configuring flags
    const flags: string[] = ['--enable-shared'];
    if (semver.lt(this.specificVersion, '3.0.0')) {
      flags.push('--enable-unicode=ucs4');
    }
    if (semver.gte(this.specificVersion, '3.6.0')) {
      flags.push('--enable-loadable-sqlite-extensions');
    }
    if (semver.gte(this.specificVersion, '3.7.0')) {
      flags.push('--enable-optimizations');
    }
    const configCommand = './configure '.concat(
      `--prefix=${path.join(this.path, this.buildSuffix())} `,
      flags.join(' ')
    );

    // Running ./configure
    core.startGroup('Configuring makefile');
    await exec.exec(configCommand, [], {cwd: this.path});
    core.endGroup();

    // Running make and make install
    core.startGroup('Running make');
    await exec.exec('make', [], {cwd: this.path});
    core.endGroup();
    core.startGroup('Running make install');
    await exec.exec('make install', [], {cwd: this.path});
    core.endGroup();

    return path.join(this.path, this.buildSuffix());
  }

  override buildSuffix(): string {
    return 'installDir';
  }

  override CacheKeyOs(): string {
    return 'nix';
  }

  protected async prepareEnvironment(): Promise<void> {
    core.startGroup('Installing dependencies');
    await exec.exec('sudo apt install -y', ubuntuDependencies);
    core.endGroup();
  }

  override async postInstall(installedPath: string): Promise<void> {
    core.startGroup('Performing post-install operations');

    // Create symplinks
    const splitVersion = this.specificVersion.split('.');
    const majorDotMinorString = `${splitVersion[0]}.${splitVersion[1]}`;
    const majorMinorString = `${splitVersion[0]}${splitVersion[1]}`;
    const pythonExecutable = path.join(
      installedPath,
      'bin',
      `python${majorDotMinorString}`
    );
    core.info('Creating python symlinks...');
    const mainExecutable = path.join(installedPath, 'python');
    core.info(`Creating symlink from ${pythonExecutable} to ${mainExecutable}`);
    fs.symlinkSync(pythonExecutable, mainExecutable);
    const binExecutable = path.join(
      installedPath,
      'bin',
      `python${majorMinorString}`
    );
    core.info(`Creating symlink from ${pythonExecutable} to ${binExecutable}`);
    fs.symlinkSync(pythonExecutable, binExecutable);

    core.endGroup();
  }
}
