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
import {InputNames} from './constants';
import fs from 'fs';
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
    pythonVersion = pythonVersion.toLowerCase().trim();
    if (pythonVersion.length === 0) {
      pythonVersion = 'x';
    }
    while (pythonVersion.split('.').length < 3) {
      pythonVersion = pythonVersion.concat('.x');
    }
    if (pythonVersion.includes('pypy')) {
      this.type = PythonType.PyPy;
      pythonVersion = pythonVersion.replace('pypy', '');
    } else {
      this.type = PythonType.CPython;
    }
    if (pythonVersion.startsWith('v')) {
      pythonVersion = pythonVersion.replace('v', '');
    }
    if (semverValidRange(pythonVersion) === null) {
      throw new Error(
        `An invalid semver string was supplied. Got "${pythonVersion}"`
      );
    }
    this.version = pythonVersion;
  }
}

export enum BuildBehavior {
  Allow = 'allow',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}

export type ActionInputs = {
  version: PythonVersion;
  architecture: string;
  cache: boolean;
  buildBehavior: BuildBehavior;
  token: string;
};

async function getBehavior(): Promise<BuildBehavior> {
  const behaviorInput = core
    .getInput(InputNames.ALLOW_BUILD)
    .toLowerCase()
    .trim();
  if (behaviorInput === 'error') {
    return BuildBehavior.Error;
  }
  if (behaviorInput === 'warn') {
    return BuildBehavior.Warn;
  }
  if (behaviorInput === 'info') {
    return BuildBehavior.Info;
  }
  if (behaviorInput === 'allow') {
    return BuildBehavior.Allow;
  }
  throw new Error(
    `Unrecognized input value for "${
      InputNames.ALLOW_BUILD
    }". Expected one of "allow", "info", "warn", "error". Got "${core.getInput(
      InputNames.ALLOW_BUILD
    )}"`
  );
}

async function getCache(): Promise<boolean> {
  try {
    return core.getBooleanInput(InputNames.CACHE_BUILD);
  } catch (error) {
    throw new Error(
      `Expected boolean value for input "${
        InputNames.CACHE_BUILD
      }". Supported values are "true", "false", "True", "False", "TRUE", "FALSE". Got "${core.getInput(
        InputNames.CACHE_BUILD
      )}"`
    );
  }
}

async function getArchitecture(): Promise<string> {
  const archString: string = core.getInput(InputNames.ARCHITECTURE);
  if (archString === '') {
    return os.arch();
  }
  return archString;
}

async function extractPythonVersion(): Promise<string> {
  let pythonVersion: string = core.getInput(InputNames.PYTHON_VERSION);
  let pythonVersionFile: string = core.getInput(InputNames.PYTHON_VERSION_FILE);

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
    return pythonVersion;
  }

  if (pythonVersionFile !== '') {
    if (fs.existsSync(pythonVersionFile)) {
      core.info(`Obtaining version from ${pythonVersionFile}...`);
      pythonVersion = fs.readFileSync(pythonVersionFile, 'utf-8');
      core.info(`Resolved ${pythonVersionFile} to ${pythonVersion}.`);
    } else {
      core.warning(`${pythonVersionFile} doesn't exist.`);
    }
  }
  return pythonVersion;
}

export async function parseInputs(): Promise<ActionInputs> {
  return {
    architecture: await getArchitecture(),
    buildBehavior: await getBehavior(),
    cache: await getCache(),
    token: core.getInput(InputNames.TOKEN),
    version: new PythonVersion(await extractPythonVersion())
  };
}
