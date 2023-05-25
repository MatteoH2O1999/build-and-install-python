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
import * as utils from './utils';
import {InputNames} from './constants';
import os from 'os';
import semverValidRange from 'semver/ranges/valid';

export enum PythonType {
  CPython = 'cpython',
  PyPy = 'pypy'
}

export class PythonVersion {
  readonly type: PythonType;
  readonly version: string;

  constructor(pythonVersion: string) {
    core.debug(`Parsing version string "${pythonVersion}"...`);
    pythonVersion = pythonVersion.toLowerCase().trim();
    if (pythonVersion.length === 0) {
      pythonVersion = 'x';
    }
    while (pythonVersion.split('.').length < 3) {
      pythonVersion = pythonVersion.concat('.x');
    }
    core.debug(`Full semver range string: "${pythonVersion}".`);
    core.debug('Checking Python type (CPython or PyPy).');
    if (pythonVersion.includes('pypy')) {
      this.type = PythonType.PyPy;
      pythonVersion = pythonVersion.replace('pypy', '').replace('-', '');
    } else {
      this.type = PythonType.CPython;
    }
    core.debug(`Python type: "${this.type}".`);
    if (pythonVersion.startsWith('v')) {
      pythonVersion = pythonVersion.replace('v', '');
    }
    if (semverValidRange(pythonVersion) === null) {
      throw new Error(
        `An invalid semver string was supplied. Got "${pythonVersion}".`
      );
    }
    this.version = pythonVersion;
    core.debug(`Final resolved version range: "${this.version}".`);
  }
}

export enum BuildBehavior {
  Allow = 'allow',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
  Force = 'force'
}

export type ActionInputs = {
  version: PythonVersion;
  architecture: string;
  cache: boolean;
  buildBehavior: BuildBehavior;
  token: string;
  checkLatest: boolean;
  allowPrereleases: boolean;
};

async function getBehavior(): Promise<BuildBehavior> {
  const behaviorInput = core
    .getInput(InputNames.ALLOW_BUILD)
    .toLowerCase()
    .trim();
  core.debug(`Parsing build behavior string ${behaviorInput}...`);
  if (behaviorInput === 'error') {
    core.debug('Found behavior "error".');
    return BuildBehavior.Error;
  }
  if (behaviorInput === 'warn') {
    core.debug('Found behavior "warn".');
    return BuildBehavior.Warn;
  }
  if (behaviorInput === 'info') {
    core.debug('Found behavior "info".');
    return BuildBehavior.Info;
  }
  if (behaviorInput === 'allow') {
    core.debug('Found behavior "allow".');
    return BuildBehavior.Allow;
  }
  if (behaviorInput === 'force') {
    core.debug('Found behavior "force".');
    return BuildBehavior.Force;
  }
  throw new Error(
    `Unrecognized input value for "${
      InputNames.ALLOW_BUILD
    }". Expected one of "${BuildBehavior.Allow}", "${BuildBehavior.Info}", "${
      BuildBehavior.Warn
    }", "${BuildBehavior.Error}, ${BuildBehavior.Force}". Got "${core.getInput(
      InputNames.ALLOW_BUILD
    )}".`
  );
}

async function getCache(): Promise<boolean> {
  core.debug('Parsing cache behavior...');
  try {
    return core.getBooleanInput(InputNames.CACHE_BUILD);
  } catch (error) {
    throw new Error(
      `Expected boolean value for input "${
        InputNames.CACHE_BUILD
      }". Supported values are "true", "false", "True", "False", "TRUE", "FALSE". Got "${core.getInput(
        InputNames.CACHE_BUILD
      )}".`
    );
  }
}

async function getCheckLatest(): Promise<boolean> {
  core.debug('Parsing check latest input');
  try {
    return core.getBooleanInput(InputNames.CHECK_LATEST);
  } catch (error) {
    throw new Error(
      `Expected boolean value for input "${
        InputNames.CHECK_LATEST
      }". Supported values are "true", "false", "True", "False", "TRUE", "FALSE". Got "${core.getInput(
        InputNames.CHECK_LATEST
      )}".`
    );
  }
}

async function getAllowPrereleases(): Promise<boolean> {
  core.debug('Parsing allow prereleases input');
  try {
    return core.getBooleanInput(InputNames.PRERELEASES);
  } catch (error) {
    throw new Error(
      `Expected boolean value for input "${
        InputNames.PRERELEASES
      }". Supported values are "true", "false", "True", "False", "TRUE", "FALSE". Got "${core.getInput(
        InputNames.PRERELEASES
      )}".`
    );
  }
}

async function getArchitecture(): Promise<string> {
  const archString: string = core.getInput(InputNames.ARCHITECTURE);
  core.debug(`Parsing architecture string "${archString}"`);
  if (archString === '') {
    core.debug("architecture string is ''. Using os.arch()...");
    return os.arch();
  }
  core.debug(`Using architecture "${archString}"...`);
  return archString;
}

async function extractPythonVersion(): Promise<string> {
  let pythonVersion: string = core.getInput(InputNames.PYTHON_VERSION);
  let pythonVersionFile: string = core.getInput(InputNames.PYTHON_VERSION_FILE);
  core.debug(
    `Parsing python-version string "${pythonVersion}" and python-version-file string "${pythonVersionFile}"`
  );

  if (pythonVersion !== '' && pythonVersionFile !== '') {
    core.warning(
      `Both "${InputNames.PYTHON_VERSION}" and "${InputNames.PYTHON_VERSION_FILE}" inputs were supplied. Only "${InputNames.PYTHON_VERSION}" will be used.`
    );
  }

  if (pythonVersion === '' && pythonVersionFile === '') {
    core.info(
      `Neither "${InputNames.PYTHON_VERSION}" and "${InputNames.PYTHON_VERSION_FILE}" inputs were supplied. Defaulting to using ".python-version" file...`
    );
    pythonVersionFile = '.python-version';
  }

  if (pythonVersion !== '') {
    core.debug(`Using python-version specified version "${pythonVersion}"...`);
    return pythonVersion;
  }

  if (pythonVersionFile !== '') {
    if (await utils.exists(pythonVersionFile)) {
      core.info(`Obtaining version from ${pythonVersionFile}...`);
      pythonVersion = await utils.readFile(pythonVersionFile, 'utf-8');
      core.info(`Resolved ${pythonVersionFile} to ${pythonVersion}.`);
    } else {
      core.warning(`${pythonVersionFile} doesn't exist.`);
    }
  }
  core.debug(`Using python version string "${pythonVersion}"...`);
  return pythonVersion;
}

export async function parseInputs(): Promise<ActionInputs> {
  return {
    allowPrereleases: await getAllowPrereleases(),
    architecture: await getArchitecture(),
    buildBehavior: await getBehavior(),
    cache: await getCache(),
    checkLatest: await getCheckLatest(),
    token: core.getInput(InputNames.TOKEN),
    version: new PythonVersion(await extractPythonVersion())
  };
}
