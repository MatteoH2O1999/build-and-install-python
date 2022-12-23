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
import {ManifestUrl, defaultPyPy2, defaultPyPy3} from './constants';

function isPyPy(version: PythonVersion): boolean {
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
    const semverSplice = completeVersion.split('.');
    if (semverSplice[0] === 'x') {
      resultVersionString = '';
      success = true;
    } else if (semverSplice[1] === 'x') {
      success = true;
      if (semverSplice[0] === '2') {
        resultVersionString = defaultPyPy2;
      } else if (semverSplice[0] === '3') {
        resultVersionString = defaultPyPy3;
      } else {
        success = false;
        resultVersionString = '';
      }
    } else {
      success = true;
      resultVersionString = `pypy${semverSplice[0]}.${semverSplice[1]}`;
    }
    if (success) {
      core.debug(`PyPy version resolved to "${resultVersionString}".`);
    } else {
      core.debug(`Could not resolve PyPy version "${inputs.version.version}".`);
    }
  } else {
    core.debug('Version is CPython.');
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
      success = false;
      resultVersionString = '';
      core.debug('Could not find specified version in manifest.');
    } else {
      resultVersionString = matchVersion.version;
      success = true;
      core.debug(`CPython version resolved to "${resultVersionString}"`);
    }
  }
  return {
    success,
    version: resultVersionString
  };
}
