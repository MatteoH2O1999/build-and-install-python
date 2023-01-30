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
import {ssl102Url, sslUrl} from '../constants';
import Builder from './builder';
import os from 'os';
import path from 'path';
import semver from 'semver';

export default class MacOSBuilder extends Builder {
  private sslPath = '';

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
      `--prefix=${path.join(this.path, this.buildSuffix())} --with-ssl=${
        this.sslPath
      } `,
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
    return 'darwin';
  }

  private async prepareEnvironment(): Promise<void> {
    core.startGroup('Installing dependencies');

    // Install XCode

    await exec.exec('xcode-select --install', [], {ignoreReturnCode: true});

    // Use older compilers for python versions >3.7

    if (semver.lt(this.specificVersion, '3.5.0')) {
      core.info('Detected version <3.5. An older compiler will be used...');
      await exec.exec('brew install gcc@9');
      process.env['CC'] = 'gcc-9';
    } else if (semver.lt(this.specificVersion, '3.7.0')) {
      core.info('Detected version <3.7. An older compiler will be used...');
      await exec.exec('brew install gcc@10');
      process.env['CC'] = 'gcc-10';
    }

    // Install ssl

    if (semver.lt(this.specificVersion, '3.5.0')) {
      core.info('Detected version <3.5. OpenSSL version 1.0.2 will be used...');
      this.sslPath = await this.installOldSsl(ssl102Url);
    } else if (semver.lt(this.specificVersion, '3.9.0')) {
      core.info('Detected version <3.9. OpenSSL version 1.1 will be used...');
      await exec.exec('brew install openssl@1.1');
      this.sslPath = '';
      await exec.exec('brew --prefix openssl@1.1', [], {
        listeners: {
          stdout: (buffer: Buffer) => {
            this.sslPath = this.sslPath.concat(buffer.toString());
          }
        }
      });
    } else {
      core.info('Detected version >=3.9. Default OpenSSL will be used...');
      await exec.exec('brew install openssl');
      this.sslPath = '';
      await exec.exec('brew --prefix openssl', [], {
        listeners: {
          stdout: (buffer: Buffer) => {
            this.sslPath = this.sslPath.concat(buffer.toString());
          }
        }
      });
    }
    core.info(`OpenSSL path: ${this.sslPath}`);

    // Fix for Python 3.0 SVN version

    if (
      semver.gte(this.specificVersion, '3.0.0') &&
      semver.lt(this.specificVersion, '3.1.0')
    ) {
      core.info(
        'Detected Python version==3.0.x. Applying fix for SVNVERSION...'
      );
      process.env['SVNVERSION'] = 'Unversioned directory';
    }

    core.endGroup();
  }

  override async postInstall(installedPath: string): Promise<void> {
    core.startGroup('Performing post-install operations');

    core.info(`InstallDir: ${installedPath}`);

    // Handle ssl installations

    if (semver.lt(this.specificVersion, '3.5.0')) {
      core.info('Detected version <3.5. OpenSSL version 1.0.2 will be used...');
      if (this.sslPath === '') {
        this.sslPath = await this.installOldSsl(ssl102Url);
      } else {
        core.info('OpenSSL version 1.0.2 is already installed.');
      }
    } else if (semver.lt(this.specificVersion, '3.9.0')) {
      core.info('Detected version <3.9. OpenSSL version 1.1 will be used...');
      if (this.sslPath === '') {
        await exec.exec('brew install openssl@1.1');
        this.sslPath = '';
        await exec.exec('brew --prefix openssl@1.1', [], {
          listeners: {
            stdout: (buffer: Buffer) => {
              this.sslPath = this.sslPath.concat(buffer.toString());
            }
          }
        });
      } else {
        core.info('OpenSSL version 1.1 is already installed.');
      }
    } else {
      core.info('Detected version >=3.9. Default OpenSSL will be used...');
      if (this.sslPath === '') {
        await exec.exec('brew install openssl');
        this.sslPath = '';
        await exec.exec('brew --prefix openssl', [], {
          listeners: {
            stdout: (buffer: Buffer) => {
              this.sslPath = this.sslPath.concat(buffer.toString());
            }
          }
        });
      } else {
        core.info('OpenSSL is already installed.');
      }
    }

    core.endGroup();
  }

  private async installOldSsl(url: sslUrl): Promise<string> {
    core.info(`Downloading ${url.url}`);
    const tempPath = process.env['RUNNER_TEMP'] || os.tmpdir();
    const ssl = await tc.downloadTool(
      url.url,
      path.join(tempPath, `${url.name}.rb`)
    );
    await exec.exec(`brew install ./${url.name}.rb`, [], {cwd: tempPath});
    let installPath = '';
    await exec.exec(`brew --prefix ${url.name}`, [], {
      listeners: {
        stdout: (buffer: Buffer) => {
          installPath = installPath.concat(buffer.toString());
        }
      }
    });
    await io.rmRF(ssl);
    return installPath;
  }
}
