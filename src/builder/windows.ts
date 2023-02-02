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
import {vsInstallerUrl, windowsBuildDependencies} from '../constants';
import Builder from './builder';
import fs from 'fs';
import os from 'os';
import path from 'path';
import semver from 'semver';

export default class WindowsBuilder extends Builder {
  private readonly MSBUILD: string = process.env.MSBUILD || '';
  private vsInstallationPath: string | undefined;

  override async build(): Promise<string> {
    // Prepare envirnoment

    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Prepare sources

    core.debug('Preparing sources...');
    await this.prepareSources();
    core.debug('Sources ready');

    let pythonExecutable: string;
    let returnPath: string;

    // Build python

    const buildFile = path.join(this.path, 'Tools', 'msi', 'build.bat');
    if (fs.existsSync(buildFile)) {
      // Can build with msi tool

      const externalsMsi = path.join(
        this.path,
        'Tools',
        'msi',
        'get_externals.bat'
      );
      const externalsPcBuild = path.join(
        this.path,
        'PCbuild',
        'get_externals.bat'
      );

      core.startGroup('Fetching external dependencies');
      if (fs.existsSync(externalsPcBuild)) {
        await exec.exec(externalsPcBuild);
      } else {
        throw new Error('Could not fetch external PCbuild dependencies');
      }
      if (fs.existsSync(externalsMsi)) {
        await exec.exec(externalsMsi);
      } else {
        throw new Error('Could not fetch external msi dependencies');
      }
      core.endGroup();

      core.startGroup('Building installer');
      await exec.exec(buildFile, [`-${this.arch}`]);
      core.endGroup();

      core.startGroup('Installing Python to temp folder');

      // Detect installer full path

      let buildPath = path.join(this.path, 'PCbuild');
      switch (this.arch) {
        case 'x64':
          buildPath = path.join(buildPath, 'amd64', 'en-us');
          break;
        case 'x86':
          buildPath = path.join(buildPath, 'win32', 'en-us');
          break;
        default:
          throw new Error('Unsupported architecture');
      }
      const candidates: string[] = [];
      for (const file of fs.readdirSync(buildPath)) {
        if (file.startsWith('python-') && file.endsWith('.exe')) {
          candidates.push(file);
        }
      }
      if (candidates.length !== 1) {
        throw new Error(`Expected one candidate, got ${candidates}`);
      }
      const installer = path.join(buildPath, candidates[0]);
      core.info(`Installer: ${installer}`);

      // Generate exec arguments

      const execArguments: string[] = [
        `TargetDir=${path.join(this.path, this.buildSuffix())}`,
        'Include_pip=0',
        'CompileAll=1',
        'Include_launcher=0',
        'InstallLauncherAllUsers=0'
      ];
      core.info(`Installer arguments: ${execArguments}`);

      await exec.exec(installer, [...execArguments, '/quiet']);

      returnPath = path.join(this.path, this.buildSuffix());
      pythonExecutable = path.join(returnPath, 'python.exe');
      if (!fs.existsSync(pythonExecutable)) {
        throw new Error('Could not find built Python executable');
      }
      core.info(`Python executable: ${pythonExecutable}`);

      core.endGroup();
    } else {
      throw new Error(
        'Unsupported build method, open an issue at https://github.com/MatteoH2O1999/build-and-install-python/issues'
      );
    }

    // Clean environment

    core.debug('Cleaning environment...');
    await this.cleanEnvironment();
    core.debug('Environment cleaned');

    return returnPath;
  }

  override buildSuffix(): string {
    return 'win32pythonInstalledFolder';
  }

  override CacheKeyOs(): string {
    return 'win32';
  }

  private async prepareEnvironment(): Promise<void> {
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
        },
        silent: true
      }
    );
    core.info(`Found msbuild.exe at ${msBuildPath}`);
    core.info('Temporarily adding as environment variable...');
    core.exportVariable('MSBUILD', msBuildPath);
    core.endGroup();

    // Detect Visual Studio

    core.startGroup('Searching for Visual Studio');
    let vsPath = '';
    await exec.exec('vswhere -property installationPath', [], {
      listeners: {
        stdout: (data: Buffer) => {
          vsPath += data.toString();
        }
      }
    });
    core.info(`Found Visual Studio at ${vsPath}`);
    this.vsInstallationPath = vsPath.trim();
    core.endGroup();

    // Installing dependencies

    core.startGroup('Installing dependencies');
    const installer = await tc.downloadTool(
      vsInstallerUrl,
      path.join(os.tmpdir(), 'vs_installer.exe')
    );
    for (const dependency of windowsBuildDependencies) {
      await exec.exec(
        `${installer} modify --installPath "${this.vsInstallationPath}" --add ${dependency} --quiet --norestart --force --wait`
      );
    }
    await io.rmRF(installer);
    core.endGroup();
  }

  protected async cleanEnvironment(): Promise<void> {
    core.startGroup('Cleaning environment');

    core.info('Cleaning temp MSBUILD variable...');
    core.exportVariable('MSBUILD', this.MSBUILD);

    const installer = await tc.downloadTool(
      vsInstallerUrl,
      path.join(os.tmpdir(), 'vs_installer.exe')
    );
    for (const dependency of windowsBuildDependencies) {
      await exec.exec(
        `${installer} modify --installPath "${this.vsInstallationPath}" --remove ${dependency} --quiet --norestart --force --wait`
      );
    }
    await io.rmRF(installer);

    core.endGroup();
  }

  override async postInstall(installedPath: string): Promise<void> {
    core.startGroup('Performing post-install operations');

    // Create python3 symlink

    if (semver.gte(this.specificVersion, '3.0.0')) {
      const currentExecutable = path.join(installedPath, 'python.exe');
      if (!fs.existsSync(currentExecutable)) {
        throw new Error('Could not find installed python executable');
      }
      const targetLink = path.join(installedPath, 'python3.exe');
      core.info('Creating python3 symlink...');
      core.info(`Creating symlink from ${currentExecutable} to ${targetLink}`);
      fs.symlinkSync(currentExecutable, targetLink);
    } else {
      core.info('No python3 symlink needs to be created. Skipping step...');
    }

    core.endGroup();
  }

  protected override async additionalCachePaths(): Promise<string[]> {
    return [];
  }
}
