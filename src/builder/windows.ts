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
  ftpPythonUrl,
  vsInstallerUrl,
  windowsBuildDependencies
} from '../constants';
import Builder from './builder';
import {OS} from './patches';
import {PythonTag} from './factory';
import findPs from 'find-process';
import os from 'os';
import path from 'path';
import semver from 'semver';

const envCL32 = '/D_WIN32';
const envCL64 = '/D_WIN64 /D_AMD64_';

function winSdkVersion(version: string): string {
  return `<DefaultWindowsSDKVersion>${version}</DefaultWindowsSDKVersion>`;
}
const winSdkRe =
  /<DefaultWindowsSDKVersion>[0-9.]+<\/DefaultWindowsSDKVersion>/;
function toolsetVersion(version: string): string {
  return `<PlatformToolset>${version}</PlatformToolset>`;
}
const toolsetRe =
  /<PlatformToolset[a-zA-Z0-9.()[\]{}_\-:,;!"£$%&/()='?^\s]*>[a-zA-Z0-9.()[\]{}_\-:,;!"£$%&/()='?^\s]+<\/PlatformToolset>/;

export default class WindowsBuilder extends Builder {
  private readonly MSBUILD: string = process.env.MSBUILD || '';
  private vsInstallationPath: string | undefined;
  private msbuild = '';
  private readonly toolset: string;
  private readonly sdk: string;
  private readonly vsDependencies: string[];

  constructor(specificVersion: PythonTag, arch: string) {
    super(specificVersion, arch);

    let toolsetVer = 'v140';
    const sdkVer = '10.0.17763.0';
    const dependencies = [...windowsBuildDependencies];

    if (semver.gte(this.specificVersion, '3.7.0')) {
      toolsetVer = 'v141';
    }
    if (semver.gte(this.specificVersion, '3.8.0')) {
      toolsetVer = 'v142';
    }
    if (semver.gte(this.specificVersion, '3.11.0')) {
      toolsetVer = 'v143';
    }

    if (toolsetVer === 'v140') {
      dependencies.push('Microsoft.VisualStudio.Component.VC.140');
    }

    this.toolset = toolsetVer;
    this.sdk = sdkVer;
    this.vsDependencies = dependencies;
  }

  override async build(): Promise<string> {
    let installer: string;

    installer = await this.getInstaller();

    if (!installer) {
      // Prepare envirnoment

      core.debug('Preparing runner environment for build...');
      await this.prepareEnvironment();
      core.debug('Environment ready.');

      // Prepare sources

      core.debug('Preparing sources...');
      await this.prepareSources();
      core.debug('Sources ready');

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
        const docs = path.join(this.path, 'Doc', 'make.bat');
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
        await utils.writeFile(
          props,
          propsContent
            .replace(winSdkRe, winSdkVersion(this.sdk))
            .replace(toolsetRe, toolsetVersion(this.toolset))
        );
        const bootstrapperContent = await utils.readFile(bootstrapper);
        await utils.writeFile(
          bootstrapper,
          bootstrapperContent
            .replace(winSdkRe, winSdkVersion(this.sdk))
            .replace(toolsetRe, toolsetVersion(this.toolset))
        );

        // Fetch external dependencies

        core.startGroup('Fetching external dependencies');
        if (await utils.exists(externalsPcBuild)) {
          await exec.exec(externalsPcBuild);
        } else {
          throw new Error('Could not fetch external PCbuild dependencies');
        }
        if (await utils.exists(externalsMsi)) {
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
        await exec.exec(
          pcBuild,
          [
            `-p ${this.arch}`,
            '-e',
            `"/p:PlatformToolset=${this.toolset}"`,
            `"/p:WindowsTargetPlatformVersion=${this.sdk}"`
          ],
          {
            windowsVerbatimArguments: true
          }
        );
        core.endGroup();

        core.startGroup('Building Python debug');
        await exec.exec(
          pcBuild,
          [
            `-p ${this.arch}`,
            '-d',
            '-e',
            `"/p:PlatformToolset=${this.toolset}"`,
            `"/p:WindowsTargetPlatformVersion=${this.sdk}"`
          ],
          {
            windowsVerbatimArguments: true
          }
        );
        core.endGroup();

        if (semver.gte(this.specificVersion, '3.7.0')) {
          core.startGroup('Building docs');
          await exec.exec(docs, ['html']);
          core.endGroup();
        }

        core.startGroup('Building installer');
        process.env['CL'] = envCL32;
        await exec.exec(`"${this.msbuild}"`, [
          path.join(this.path, 'Tools', 'msi', 'launcher', 'launcher.wixproj'),
          '/p:Platform=x86',
          `/p:PlatformToolset=${this.toolset}`,
          `/p:WindowsTargetPlatformVersion=${this.sdk}`
        ]);
        process.env['CL'] = '';
        await exec.exec(`"${this.msbuild}"`, [
          path.join(this.path, 'Tools', 'msi', 'bundle', 'snapshot.wixproj'),
          `/p:Platform=${this.arch}`,
          `/p:PlatformToolset=${this.toolset}`,
          `/p:WindowsTargetPlatformVersion=${this.sdk}`
        ]);
        core.endGroup();

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
        throw new Error(
          'Cannot build CPython versions that do not include msi project'
        );
      }
      // Clean environment

      core.debug('Cleaning environment...');
      await this.cleanEnvironment();
      core.debug('Environment cleaned');
    }

    core.startGroup('Installing Python to temp folder');

    const returnPath = await this.install(installer);
    const pythonExecutable = path.join(returnPath, 'python.exe');
    if (!(await utils.exists(pythonExecutable))) {
      throw new Error('Could not find built Python executable');
    }
    core.info(`Python executable: ${pythonExecutable}`);

    core.endGroup();

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
    for (const dependency of this.vsDependencies) {
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
    for (const dependency of this.vsDependencies) {
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

  private async getInstaller(): Promise<string> {
    let archLabel: string;
    switch (this.arch) {
      case 'x64':
        archLabel = 'amd64';
        break;
      case 'arm64':
        archLabel = 'arm64';
        break;
      default:
        return '';
    }
    const filename = `python-${this.specificVersion}.${archLabel}`;
    let installerPath = '';
    try {
      const exeName = `${filename}.exe`;
      installerPath = await tc.downloadTool(
        `${ftpPythonUrl}/${this.specificVersion}/${exeName}`,
        path.join(this.path, exeName)
      );
    } catch (error) {
      installerPath = '';
    }
    if (!installerPath) {
      try {
        const msiName = `${filename}.msi`;
        installerPath = await tc.downloadTool(
          `${ftpPythonUrl}/${this.specificVersion}/${msiName}`,
          path.join(this.path, msiName)
        );
      } catch (error) {
        installerPath = '';
      }
    }
    if (installerPath) {
      core.info(`Using installer from python.org/ftp/python: ${installerPath}`);
    } else {
      core.info(
        `No installer found from python.org/ftp/python. Will build from source`
      );
    }
    return installerPath;
  }

  private async install(installerPath: string): Promise<string> {
    if (installerPath.endsWith('.exe')) {
      const execArguments: string[] = [
        `TargetDir=${path.join(this.path, this.buildSuffix())}`,
        'Include_pip=0',
        'CompileAll=1',
        'Include_launcher=0',
        'InstallLauncherAllUsers=0',
        '/quiet'
      ];
      core.info(`Installer arguments: ${execArguments}`);
      await exec.exec(installerPath, [...execArguments]);
    } else if (installerPath.endsWith('.msi')) {
      const installerArguments: string[] = [
        '/i',
        installerPath,
        `TARGETDIR=${path.join(this.path, this.buildSuffix())}`,
        '/qn'
      ];
      await exec.exec('msiexec', [...installerArguments]);
    } else {
      throw new Error(
        `Invalid installer extension. Expected .exe or .msi, got ${installerPath
          .split('.')
          .at(-1)}`
      );
    }

    return path.join(this.path, this.buildSuffix());
  }

  protected override async additionalCachePaths(): Promise<string[]> {
    return [];
  }

  protected override os(): OS {
    return 'windows';
  }
}
