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

import {PythonType, PythonVersion} from '../../inputs';

export type ExpectedTestResult = {
  inputVersion: PythonVersion;
  inputArchitecture: string;
  expectedSpecificVersion: string;
  expectedArchitecture: string;
};

const tests: ExpectedTestResult[] = [
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: '2.7.18',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=2.7.0 <2.8.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: '3.0.1',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.0.0 <3.1.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.1.4' : '3.1.5',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.1.0 <3.2.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.2.5' : '3.2.6',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.2.0 <3.3.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.3.5' : '3.3.7',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.3.0 <3.4.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.4.4' : '3.4.10',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.4.0 <3.5.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.5.4' : '3.5.10',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.5.0 <3.6.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.6.8' : '3.6.15',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.6.0 <3.7.0-0'}
  },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: process.platform === 'win32' ? '3.7.9' : '3.7.17',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '>=3.7.0 <3.8.0-0'}
  },
  // {
  //   expectedArchitecture: 'x64',
  //   expectedSpecificVersion: '3.8.16',
  //   inputArchitecture: 'x64',
  //   inputVersion: {type: PythonType.CPython, version: '3.8.x'}
  // },
  // {
  //   expectedArchitecture: 'x64',
  //   expectedSpecificVersion: '3.9.16',
  //   inputArchitecture: 'x64',
  //   inputVersion: {type: PythonType.CPython, version: '3.9.x'}
  // },
  // {
  //   expectedArchitecture: 'x64',
  //   expectedSpecificVersion: '3.10.10',
  //   inputArchitecture: 'x64',
  //   inputVersion: {type: PythonType.CPython, version: '3.10.x'}
  // },
  // {
  //   expectedArchitecture: 'x64',
  //   expectedSpecificVersion: '3.11.2',
  //   inputArchitecture: 'x64',
  //   inputVersion: {type: PythonType.CPython, version: '3.11.x'}
  // },
  {
    expectedArchitecture: 'x64',
    expectedSpecificVersion: '3.6.2',
    inputArchitecture: 'x64',
    inputVersion: {type: PythonType.CPython, version: '3.6.2'}
  },
  // {
  //   expectedArchitecture: 'x32',
  //   expectedSpecificVersion: '3.11.2',
  //   inputArchitecture: 'x32',
  //   inputVersion: {type: PythonType.CPython, version: '3.x.x'}
  // },
  {
    expectedArchitecture: 'x32',
    expectedSpecificVersion: '2.7.18',
    inputArchitecture: 'x32',
    inputVersion: {type: PythonType.CPython, version: '>=2.0.0 <3.0.0-0'}
  }
];

export {tests};

const failingTests: PythonVersion[] = [
  {type: PythonType.PyPy, version: '3.x.x'},
  {type: PythonType.PyPy, version: '2.x.x'}
];

export {failingTests};

const nullTests: PythonVersion[] = [
  {type: PythonType.CPython, version: '3.0.2'},
  {type: PythonType.CPython, version: '3.6.20'},
  {type: PythonType.CPython, version: '3.5.15'}
];

export {nullTests};
