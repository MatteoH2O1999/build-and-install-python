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
import {
  toolsetRe,
  toolsetVersion,
  vsInstallerUrl,
  winSdkRe,
  winSdkVersion,
  windowsBuildDependencies
} from '../constants';
import Builder from './builder';
import findPs from 'find-process';
import os from 'os';
import path from 'path';
import semver from 'semver';

const envCL32 = '/D_WIN32';
const envCL64 = '/D_WIN64 /D_AMD64_';

export default class WindowsBuilder extends Builder {
  private readonly MSBUILD: string = process.env.MSBUILD || '';
  private vsInstallationPath: string | undefined;
  private msbuild = '';

  override async build(): Promise<string> {
    // Prepare envirnoment

    core.debug('Preparing runner environment for build...');
    await this.prepareEnvironment();
    core.debug('Environment ready.');

    // Prepare sources

    core.debug('Preparing sources...');
    await this.prepareSources();
    core.debug('Sources ready');

    let installer: string;

    // Build python

    const buildFile = path.join(this.path, 'Tools', 'msi', 'build.bat');
    const pcBuild = path.join(this.path, 'PCbuild', 'build.bat');
    if (await utils.exists(buildFile)) {
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
      const props = path.join(this.path, 'PCbuild', 'python.props');
      const bootstrapper = path.join(
        this.path,
        'Tools',
        'msi',
        'bundle',
        'bootstrap',
        'pythonba.vcxproj'
      );
      let buildPath = path.join(this.path, 'PCbuild');
      switch (this.arch) {
        case 'x64':
          buildPath = path.join(buildPath, 'amd64', 'en-us');
          if (semver.lt(this.specificVersion, '3.7.0')) {
            process.env['CL'] = envCL64;
          }
          break;
        case 'x86':
          buildPath = path.join(buildPath, 'win32', 'en-us');
          if (semver.lt(this.specificVersion, '3.7.0')) {
            process.env['CL'] = envCL32;
          }
          break;
        default:
          throw new Error('Unsupported architecture');
      }

      // Fix windows build sdk and toolset version

      if (!(await utils.exists(props))) {
        throw new Error('Could not find "python.props" file');
      }
      if (!(await utils.exists(bootstrapper))) {
        throw new Error('Could not find "pythonba.vcxproj"');
      }

      const propsContent = await utils.readFile(props);
      const fixedProps = propsContent
        .replace(winSdkRe, winSdkVersion('10.0.17763.0'))
        .replace(toolsetRe, toolsetVersion('v143'));
      await utils.writeFile(props, fixedProps);
      const bootstrapperContent = await utils.readFile(bootstrapper);
      const fixedBootstrapperContent = bootstrapperContent
        .replace(winSdkRe, winSdkVersion('10.0.17763.0'))
        .replace(toolsetRe, toolsetVersion('v143'));
      await utils.writeFile(bootstrapper, fixedBootstrapperContent);

      // Fetch external dependencies

      core.startGroup('Fetching external dependencies');
      if (await utils.exists(externalsPcBuild)) {
        const externalsPcBuildContent = await utils.readFile(externalsPcBuild);
        await utils.writeFile(
          externalsPcBuild,
          externalsPcBuildContent
            .replace(/svn /g, 'git svn ')
            .replace(/export/g, 'clone')
            .replace(/svn co /g, 'svn clone ')
        );

        if (semver.lt(this.specificVersion, '3.7.0')) {
          core.info('Detected version < 3.7. Updating tcl/tk version...');
          const fileContent = await utils.readFile(externalsPcBuild);
          await utils.writeFile(
            externalsPcBuild,
            fileContent
              .replace(/ tk-[0-9.]+/, ' tk-8.6.10.0')
              .replace(/ tcl-core-[0-9.]+/, ' tcl-core-8.6.10.0')
          );
          const tkProps = path.join(this.path, 'PCbuild', 'tcltk.props');
          const tkPropsContent = await utils.readFile(tkProps);
          await utils.writeFile(
            tkProps,
            tkPropsContent.replace(
              /<TclPatchLevel>[0-9]+<\/TclPatchLevel>/,
              '<TclPatchLevel>10</TclPatchLevel>'
            )
          );
        }
        await exec.exec(externalsPcBuild);
      } else {
        throw new Error('Could not fetch external PCbuild dependencies');
      }
      if (await utils.exists(externalsMsi)) {
        const externalsMsiContent = await utils.readFile(externalsMsi);
        await utils.writeFile(
          externalsMsi,
          externalsMsiContent
            .replace(/svn /g, 'git svn ')
            .replace(/export/g, 'clone')
            .replace(/svn co /g, 'svn clone ')
        );

        await exec.exec(externalsMsi);
        if (semver.lt(this.specificVersion, '3.7.0')) {
          core.info(
            'Detected version < 3.7. Copying correct vcredist140.dll to main folder...'
          );
          const dllPath = path.join(
            this.path,
            'externals',
            'windows-installer',
            'redist',
            this.arch
          );
          await io.cp(
            dllPath,
            path.join(this.path, 'externals', 'windows-installer', 'redist'),
            {copySourceDirectory: false, recursive: true}
          );
        }
      } else {
        throw new Error('Could not fetch external msi dependencies');
      }
      core.endGroup();

      core.startGroup('Building Python');
      await exec.exec(pcBuild.concat(` -p ${this.arch}`), ['-e']);
      core.endGroup();

      core.startGroup('Building Python debug');
      await exec.exec(pcBuild.concat(` -p ${this.arch}`), ['-d', '-e']);
      core.endGroup();

      core.startGroup('Building installer');
      process.env['CL'] = envCL32;
      await exec.exec(`"${this.msbuild}"`, [
        path.join(this.path, 'Tools', 'msi', 'launcher', 'launcher.wixproj'),
        '/p:Platform=x86',
        '/p:PlatformToolset=v143'
      ]);
      process.env['CL'] = '';
      await exec.exec(`"${this.msbuild}"`, [
        path.join(this.path, 'Tools', 'msi', 'bundle', 'snapshot.wixproj'),
        `/p:Platform=${this.arch}`,
        '/p:PlatformToolset=v143'
      ]);
      core.endGroup();

      core.startGroup('Installing Python to temp folder');

      // Detect installer full path

      const candidates: string[] = [];
      for (const file of await utils.readdir(buildPath)) {
        if (file.startsWith('python-') && file.endsWith('.exe')) {
          candidates.push(file);
        }
      }
      if (candidates.length !== 1) {
        throw new Error(`Expected one candidate, got ${candidates}`);
      }
      installer = path.join(buildPath, candidates[0]);
      core.info(`Installer: ${installer}`);
    } else {
      // PCBuild + msi.py

      const externalsPcBuild = path.join(
        this.path,
        'PCbuild',
        'get_externals.bat'
      );
      const props = path.join(this.path, 'PCbuild', 'python.props');

      if (!(await utils.exists(props))) {
        throw new Error('Cannot use msbuild with a vcbuild project');
      }

      const pcBuildProject = path.join(this.path, 'PCbuild', 'pcbuild.sln');
      if (await utils.exists(externalsPcBuild)) {
        core.startGroup('Fetching external dependencies');
        await exec.exec(externalsPcBuild);
        core.endGroup();
      }

      core.startGroup('Building Python');
      await exec.exec(
        `"${this.msbuild}"`,
        [
          pcBuildProject,
          '/p:Configuration=Release',
          `/p:Platform=${this.arch}`,
          '/p:IncludeExternals=true',
          '/p:PlatformToolset=v143',
          '/p:WindowsTargetPlatformVersion=10.0.17763.0'
        ],
        {}
      );
      core.endGroup();

      await exec.exec('tree', [], {cwd: path.join(this.path, 'PCbuild')});

      installer = path.join(this.path, `python${this.specificVersion}.msi`);
    }

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

    const returnPath = path.join(this.path, this.buildSuffix());
    const pythonExecutable = path.join(returnPath, 'python.exe');
    if (!(await utils.exists(pythonExecutable))) {
      throw new Error('Could not find built Python executable');
    }
    core.info(`Python executable: ${pythonExecutable}`);

    core.endGroup();

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
    this.msbuild = msBuildPath;
    core.endGroup();

    // Detect Visual Studio

    core.startGroup('Searching for Visual Studio');
    let vsPath = '';
    await exec.exec('vswhere -property installationPath', [], {
      listeners: {
        stdout: (data: Buffer) => {
          vsPath += data.toString();
        }
      },
      silent: true
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
    core.info('vs_installer downloaded');
    for (const dependency of windowsBuildDependencies) {
      await exec.exec(
        `${installer} modify --installPath "${this.vsInstallationPath}" --add ${dependency} --quiet --norestart --force --wait`
      );
    }
    await io.rmRF(installer);
    core.info('vs_installer removed');
    core.endGroup();
  }

  protected async cleanEnvironment(): Promise<void> {
    core.startGroup('Cleaning environment');

    const processes = await findPs('name', /[mM][sS][bB][uU][iI][lL][dD]/);

    for (const p of processes) {
      core.info(`Killing process ${p.cmd} (${p.pid})...`);
      process.kill(p.pid);
    }

    core.info('Removing externals...');
    await exec.exec('powershell attrib -h -r /d /s', [], {
      cwd: path.join(this.path, 'externals')
    });

    core.info('Cleaning temp MSBUILD variable...');
    core.exportVariable('MSBUILD', this.MSBUILD);

    const installer = await tc.downloadTool(
      vsInstallerUrl,
      path.join(os.tmpdir(), 'vs_installer.exe')
    );
    core.info('vs_installer downloaded');
    for (const dependency of windowsBuildDependencies) {
      await exec.exec(
        `${installer} modify --installPath "${this.vsInstallationPath}" --remove ${dependency} --quiet --norestart --force --wait`
      );
    }
    await io.rmRF(installer);
    core.info('vs_installer removed');

    core.endGroup();
  }

  override async postInstall(installedPath: string): Promise<void> {
    core.startGroup('Performing post-install operations');

    // Create python3 symlink

    if (semver.gte(this.specificVersion, '3.0.0')) {
      const currentExecutable = path.join(installedPath, 'python.exe');
      if (!(await utils.exists(currentExecutable))) {
        throw new Error('Could not find installed python executable');
      }
      const targetLink = path.join(installedPath, 'python3.exe');
      core.info('Creating python3 symlink...');
      core.info(`Creating symlink from ${currentExecutable} to ${targetLink}`);
      await utils.symlink(currentExecutable, targetLink);
    } else {
      core.info('No python3 symlink needs to be created. Skipping step...');
    }

    core.endGroup();
  }

  protected override async additionalCachePaths(): Promise<string[]> {
    return [];
  }
}
