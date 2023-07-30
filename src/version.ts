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
import * as tc from '@actions/tool-cache';
import {ActionInputs, PythonType, PythonVersion} from './inputs';
import {
  ManifestUrl,
  anyVersionString,
  defaultPyPy2,
  defaultPyPy3
} from './constants';
import path from 'path';
import semver from 'semver';

export function isPyPy(version: PythonVersion): boolean {
  core.debug('Checking if version is PyPy.');
  return version.type === PythonType.PyPy;
}

export type SetupPythonResult = {
  version: string;
  success: boolean;
};

export async function getSetupPythonResult(
  inputs: ActionInputs
): Promise<SetupPythonResult> {
  let resultVersionString: string;
  let success: boolean;
  if (isPyPy(inputs.version)) {
    core.debug('Version is PyPy.');
    const completeVersion = inputs.version.version;
    if (completeVersion === anyVersionString) {
      resultVersionString = defaultPyPy3;
      success = true;
    } else {
      const minVersion =
        semver.minVersion(completeVersion) || new semver.SemVer('*');
      const vers = minVersion.major;
      const major = minVersion.minor;
      const nextVer = `>=${vers + 1}.0.0-0`;
      const nextMajor = `>=${vers}.${major + 1}.0-0`;
      if (
        !semver.intersects(completeVersion, nextVer) &&
        semver.intersects(completeVersion, nextMajor)
      ) {
        core.debug('Detected range a.x.x');
        switch (vers) {
          case 2:
            success = true;
            resultVersionString = defaultPyPy2;
            break;
          case 3:
            success = true;
            resultVersionString = defaultPyPy3;
            break;
          default:
            success = false;
            resultVersionString = '';
            break;
        }
      } else if (!semver.intersects(completeVersion, nextMajor)) {
        core.debug('Detected range a.b.x');
        success = true;
        resultVersionString = `pypy${vers}.${major}`;
      } else {
        core.debug(`Impossible to solve range ${completeVersion}`);
        success = false;
        resultVersionString = '';
      }
    }
    if (success) {
      core.debug(`PyPy version resolved to "${resultVersionString}".`);
    } else {
      core.debug(`Could not resolve PyPy version "${inputs.version.version}".`);
    }
  } else {
    core.debug('Version is CPython.');
    core.debug('Checking local tool cache...');
    const localPath = tc.find(
      'Python',
      inputs.version.version,
      inputs.architecture
    );
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
        `Checking manifest for version "${inputs.version.version}" and arch "${inputs.architecture}"...`
      );
      const matchVersion = await tc.findFromManifest(
        inputs.version.version,
        false,
        manifest,
        inputs.architecture
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
            inputs.architecture
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
    success,
    version: resultVersionString
  };
}
