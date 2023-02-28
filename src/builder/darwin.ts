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
import * as utils from '../utils';
import {ssl102Url, sslUrl} from '../constants';
import Builder from './builder';
import os from 'os';
import path from 'path';
import semver from 'semver';

export default class MacOSBuilder extends Builder {
  private sslPath = '';

  override async build(): Promise<string> {
    process.env['LDFLAGS'] = '';
    process.env['CFLAGS'] = '-Wno-implicit-function-declaration ';
    process.env['CPPFLAGS'] = '';

    // Prepare envirnoment

    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Prepare sources

    core.debug('Preparing sources...');
    await this.prepareSources();
    core.debug('Sources ready');

    // Configure flags

    const flags: string[] = [];
    if (semver.lt(this.specificVersion, '3.0.0')) {
      flags.push('--enable-unicode=ucs4');
    }
    if (semver.gte(this.specificVersion, '3.2.0')) {
      flags.push('--enable-loadable-sqlite-extensions');
      let sqlite = '';
      await exec.exec('brew --prefix sqlite3', [], {
        listeners: {
          stdout: (buffer: Buffer) => {
            sqlite += buffer.toString();
          }
        },
        silent: true
      });
      sqlite = sqlite.trim();
      core.debug(`sqlite3 module path: ${sqlite}`);
      process.env['LDFLAGS'] += `-L${sqlite}/lib `;
      process.env['CFLAGS'] += `-I${sqlite}/include `;
      process.env['CPPFLAGS'] += `-I${sqlite}/include`;
    }
    if (semver.gte(this.specificVersion, '3.7.0')) {
      flags.push('--enable-optimizations');
      flags.push('--with-lto');
      flags.push(`--with-openssl=${this.sslPath}`);
    }
    const configCommand = './configure '.concat(
      `--prefix=${path.join(this.path, this.buildSuffix())} `,
      flags.join(' ')
    );

    // Run ./configure

    core.startGroup('Configuring makefile');
    await exec.exec(configCommand, [], {cwd: this.path});
    core.endGroup();

    // Run make and make install

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

    // Install general dependencies

    await this.installGeneralDependencies();

    // Install ssl

    let zlibPath = '';
    await exec.exec('brew --prefix zlib', [], {
      listeners: {
        stdout: (buffer: Buffer) => {
          zlibPath = zlibPath.concat(buffer.toString());
        }
      },
      silent: true
    });
    zlibPath = zlibPath.trim();
    let readLinePath = '';
    await exec.exec('brew --prefix readline', [], {
      listeners: {
        stdout: (buffer: Buffer) => {
          readLinePath = readLinePath.concat(buffer.toString());
        }
      },
      silent: true
    });
    readLinePath = readLinePath.trim();

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
    this.sslPath = this.sslPath.trim();
    if (semver.lt(this.specificVersion, '3.7.0')) {
      process.env[
        'LDFLAGS'
      ] += `-L${this.sslPath}/lib -L${zlibPath}/lib -L${readLinePath}/lib `;
      process.env[
        'CFLAGS'
      ] += `-I${this.sslPath}/include -I${zlibPath}/include -I${readLinePath}/include `;
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

    // Install general dependencies

    await this.installGeneralDependencies();

    // Handle ssl version

    if (semver.lt(this.specificVersion, '3.5.0')) {
      core.info('OpenSSL version 1.0.2 is already installed');
    } else if (semver.lt(this.specificVersion, '3.9.0')) {
      core.info(
        'Detected version <3.9. OpenSSL version 1.1 will be installed...'
      );
      await exec.exec('brew install openssl@1.1');
    } else {
      core.info('Detected version >=3.9. Default OpenSSL will be installed...');
      await exec.exec('brew install openssl');
    }

    // Create symlinks

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
    await utils.symlink(pythonExecutable, mainExecutable);
    const binExecutable = path.join(
      installedPath,
      'bin',
      `python${majorMinorString}`
    );
    core.info(`Creating symlink from ${pythonExecutable} to ${binExecutable}`);
    await utils.symlink(pythonExecutable, binExecutable);
    if (
      semver.gte(this.specificVersion, '3.0.0') &&
      semver.lt(this.specificVersion, '3.1.0')
    ) {
      const python3Executable = path.join(installedPath, 'bin', 'python3');
      core.info(
        `Creating symlink from ${pythonExecutable} to ${python3Executable}`
      );
      await utils.symlink(pythonExecutable, python3Executable);
    }
    const mainBinExecutable = path.join(installedPath, 'bin', 'python');
    core.info(
      `Creating symlink from ${pythonExecutable} to ${mainBinExecutable}`
    );
    await utils.symlink(pythonExecutable, mainBinExecutable);

    // Add executable bits

    const executables = [
      pythonExecutable,
      mainExecutable,
      binExecutable,
      mainBinExecutable,
      path.join(installedPath, 'bin', 'python3')
    ];
    for (const executable of executables) {
      core.info(`Adding executable bit to ${executable}`);
      await exec.exec(`chmod +x ${executable}`);
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

  private async installGeneralDependencies(): Promise<void> {
    await exec.exec('brew install zlib', [], {ignoreReturnCode: true});
    await exec.exec('brew install sqlite3', [], {ignoreReturnCode: true});
    await exec.exec('brew install readline', [], {ignoreReturnCode: true});
  }

  protected override async additionalCachePaths(): Promise<string[]> {
    const additionalPaths: string[] = [];
    if (semver.lt(this.specificVersion, '3.5.0')) {
      const tempPath = process.env['RUNNER_TEMP'] || os.tmpdir();
      const ssl = await tc.downloadTool(
        ssl102Url.url,
        path.join(tempPath, `${ssl102Url.name}.rb`)
      );
      let openssl102Path = '';
      await exec.exec(`brew --prefix ${ssl102Url.name}.rb`, [], {
        cwd: tempPath,
        listeners: {
          stdout: (buffer: Buffer) => {
            openssl102Path = openssl102Path.concat(buffer.toString());
          }
        },
        silent: true
      });
      let openssl102Cellar = '';
      await exec.exec(`brew --cellar ${ssl102Url.name}.rb`, [], {
        cwd: tempPath,
        listeners: {
          stdout: (buffer: Buffer) => {
            openssl102Cellar = openssl102Cellar.concat(buffer.toString());
          }
        },
        silent: true
      });
      await io.rmRF(ssl);
      additionalPaths.push(openssl102Path.trim());
      additionalPaths.push(openssl102Cellar.trim());
    }
    return additionalPaths;
  }

  protected override async prepareSources(): Promise<void> {
    await super.prepareSources();

    // Fix for missing header files

    if (
      semver.gte(this.specificVersion, '3.0.0') &&
      semver.lt(this.specificVersion, '3.1.0')
    ) {
      core.info(
        'Detected Python version==3.0.x. Applying fix for missing headers...'
      );
      let headerPath = '';
      await exec.exec('xcrun --sdk macosx --show-sdk-path', [], {
        listeners: {
          stdout: (buffer: Buffer) => {
            headerPath = headerPath.concat(buffer.toString());
          }
        },
        silent: true
      });
      headerPath = headerPath.trim();
      const h2py = (
        await utils.readFile(
          path.join(this.path, 'Tools', 'scripts', 'h2py.py')
        )
      )
        .toString()
        .replace(
          "fp = open(filename, 'r')",
          `filename=filename.replace('/usr/lib', '${headerPath}/usr/lib').replace('/usr/include', '${headerPath}/usr/include');fp=open(filename, 'r')`
        );
      await utils.writeFile(
        path.join(this.path, 'Tools', 'scripts', 'h2py.py'),
        h2py
      );
    }
  }
}
