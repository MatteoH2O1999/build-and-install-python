// Action to build any Python version on the latest labels and install it into the local tool cache.
// Copyright (C) 2025 Matteo Dell'Acqua
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
import * as tc from '@actions/tool-cache';
import {ActionInputs, PythonType, PythonVersion} from './inputs';
import {ManifestUrl, minSupportedVersion} from './constants';
import path from 'path';
import semver from 'semver';

export async function isPyPy(version: PythonVersion): Promise<boolean> {
  core.debug('Checking if version is PyPy.');
  return version.type === PythonType.PyPy;
}

export async function isGraalPy(version: PythonVersion): Promise<boolean> {
  core.debug('Checking if version is GraalPy.');
  return version.type === PythonType.GraalPy;
}

export async function isCpython(version: PythonVersion): Promise<boolean> {
  core.debug('checking if version is CPython');
  return version.type === PythonType.CPython;
}

export type SetupPythonResult = {
  version: string;
  freethreaded: boolean;
  success: boolean;
};

export async function getSetupPythonResult(
  inputs: ActionInputs
): Promise<SetupPythonResult> {
  let resultVersionString: string;
  let success: boolean;
  let freethreaded: boolean;
  if (await isPyPy(inputs.version)) {
    core.debug('Version is PyPy.');
    success = true;
    freethreaded = false;
    resultVersionString = inputs.version.version;
  } else if (await isGraalPy(inputs.version)) {
    core.debug('Version is GraalPy.');
    success = true;
    freethreaded = false;
    resultVersionString = inputs.version.version;
  } else {
    core.debug('Version is CPython.');
    const arch = inputs.version.freethreaded
      ? inputs.architecture + '-freethreaded'
      : inputs.architecture;
    freethreaded = inputs.version.freethreaded;
    core.debug(`Manifest architecture: ${arch}`);
    core.debug('Checking local tool cache...');
    const localPath = tc.find('Python', inputs.version.version, arch);
    if (localPath !== '' && !inputs.checkLatest) {
      const localVersion = path.basename(path.dirname(localPath));
      resultVersionString = localVersion;
      success = true;
      core.debug(`CPython version resolved to "${resultVersionString}"`);
    } else {
      core.debug('Downloading manifest...');
      const manifest = await tc.getManifestFromRepo(
        ManifestUrl.OWNER,
        ManifestUrl.REPO,
        `token ${inputs.token}`,
        ManifestUrl.BRANCH
      );
      core.debug(
        `Checking manifest for version "${inputs.version.version}" and arch "${arch}"...`
      );
      const matchVersion = await tc.findFromManifest(
        inputs.version.version,
        false,
        manifest,
        arch
      );
      if (matchVersion === undefined) {
        const minVersion = semver.minVersion(inputs.version.version);
        if (
          inputs.allowPrereleases &&
          minVersion &&
          !semver.intersects(
            inputs.version.version,
            `>=${minVersion.major}.${minVersion.minor + 1}.0-0`
          ) &&
          semver.intersects(
            inputs.version.version,
            `>=${minVersion.major}.${minVersion.minor}.${
              minVersion.patch + 1
            }-0`
          )
        ) {
          core.debug('Testing for prerelease versions');
          const preReleaseVersion = `~${minVersion.major}.${minVersion.minor}.0-0`;
          const matchPreRelease = await tc.findFromManifest(
            preReleaseVersion,
            false,
            manifest,
            arch
          );
          if (matchPreRelease === undefined) {
            success = false;
            resultVersionString = '';
            core.debug('Could not find specified version in manifest.');
          } else {
            success = true;
            resultVersionString = matchPreRelease.version;
            core.debug(
              `CPython version resolved to prerelease ${resultVersionString}`
            );
          }
        } else {
          success = false;
          resultVersionString = '';
          core.debug('Could not find specified version in manifest.');
        }
      } else {
        resultVersionString = matchVersion.version;
        success = true;
        core.debug(`CPython version resolved to "${resultVersionString}"`);
      }
    }
  }
  return {
    freethreaded,
    success,
    version: resultVersionString
  };
}

export async function checkMinVersion(specificVersion: string): Promise<void> {
  if (semver.lt(specificVersion, minSupportedVersion)) {
    core.warning(
      `Specific version ${specificVersion} is no longer officially supported. This action will not break support intentionally but no effort will be spent in supporting it.`
    );
  }
}
