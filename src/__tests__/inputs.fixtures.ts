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
import {InputNames} from '../constants';
import {PythonType} from '../inputs';

export type PythonVersionTest = {
  inputVersionString: string;
  expectedVersion: string;
  expectedType: PythonType;
};

const pythonVersions: PythonVersionTest[] = [
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=2.7.0 <2.8.0-0',
    inputVersionString: '2.7'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=3.0.0 <4.0.0-0',
    inputVersionString: '3'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=3.9.0 <3.10.0-0',
    inputVersionString: '3.9'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=3.8.0 <3.9.0-0',
    inputVersionString: '3.8.X'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '3.2.5',
    inputVersionString: '3.2.5'
  },
  {
    expectedType: PythonType.PyPy,
    expectedVersion: 'pypy3.9',
    inputVersionString: 'pypy3.9'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=3.3.0 <3.4.0-0',
    inputVersionString: 'v3.3'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '3.9.0-a2',
    inputVersionString: '3.9.0a2'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '>=3.9.0-0 <3.10.0-0',
    inputVersionString: '3.9-dev'
  },
  {
    expectedType: PythonType.CPython,
    expectedVersion: '*',
    inputVersionString: ''
  },
  {
    expectedType: PythonType.PyPy,
    expectedVersion: 'pypy-3.9',
    inputVersionString: 'pypy-3.9'
  },
  {
    expectedType: PythonType.GraalPy,
    expectedVersion: 'graalpy-22.3',
    inputVersionString: 'graalpy-22.3'
  },
  {
    expectedType: PythonType.GraalPy,
    expectedVersion: 'graalpy22.3',
    inputVersionString: 'graalpy22.3'
  },
  {
    expectedType: PythonType.GraalPy,
    expectedVersion: 'graalpy-22.3',
    inputVersionString: 'Graalpy-22.3'
  }
];

export {pythonVersions};

export type MockedInputs = {
  pythonVersion: string;
  pythonVersionFile: string;
  architecture: string;
  cacheBuild: string;
  allowBuild: string;
  token: string;
  checkLatest: string;
  allowPrereleases: string;
};

export function mockInput(
  inputs: MockedInputs,
  input: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: core.InputOptions | undefined
): string {
  if (input === InputNames.PYTHON_VERSION) {
    return inputs.pythonVersion;
  } else if (input === InputNames.PYTHON_VERSION_FILE) {
    return inputs.pythonVersionFile;
  } else if (input === InputNames.ARCHITECTURE) {
    return inputs.architecture;
  } else if (input === InputNames.ALLOW_BUILD) {
    return inputs.allowBuild;
  } else if (input === InputNames.CACHE_BUILD) {
    return inputs.cacheBuild;
  } else if (input === InputNames.TOKEN) {
    return inputs.token;
  } else if (input === InputNames.CHECK_LATEST) {
    return inputs.checkLatest;
  } else if (input === InputNames.PRERELEASES) {
    return inputs.allowPrereleases;
  } else {
    return '';
  }
}
