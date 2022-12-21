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
import * as inputs from '../inputs';
import {MockedInputs, mockInput, pythonVersions} from './inputs.fixtures';
import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import fs from 'fs';

const mockedInputs: MockedInputs = {
  allowBuild: 'warn',
  architecture: 'x64',
  cacheBuild: 'false',
  pythonVersion: '3.9.2',
  pythonVersionFile: 'file',
  token: 'token'
};

jest.mock('@actions/core');
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    access: jest.fn()
  },
  readFileSync: jest.fn()
}));

const mockedCore = jest.mocked(core);
const mockedFs = jest.mocked(fs);

mockedCore.getBooleanInput.mockImplementation(
  (name: string, options: core.InputOptions | undefined) => {
    const input = mockInput(mockedInputs, name, options).trim().toLowerCase();
    if (input === 'true') {
      return true;
    }
    if (input === 'false') {
      return false;
    }
    throw new Error();
  }
);
mockedCore.getInput.mockImplementation(
  (name: string, options: core.InputOptions | undefined) => {
    return mockInput(mockedInputs, name, options);
  }
);

describe('Python version string', () => {
  describe.each(pythonVersions)(
    '"$inputVersionString"',
    ({inputVersionString, expectedVersion, expectedType}) => {
      const pythonVersion: inputs.PythonVersion = new inputs.PythonVersion(
        inputVersionString
      );

      test(`produces version string "${expectedVersion}"`, () => {
        expect(pythonVersion.version).toBe(expectedVersion);
      });

      test(`produces type "${expectedType}"`, () => {
        expect(pythonVersion.type).toBe(expectedType);
      });
    }
  );

  describe('Random string', () => {
    test('throws an Error', () => {
      expect(() => {
        new inputs.PythonVersion('Random string');
      }).toThrowErrorMatchingSnapshot();
    });
  });
});

describe('Parsed inputs', () => {
  beforeEach(() => {
    mockedInputs.allowBuild = 'warn';
    mockedInputs.architecture = 'x64';
    mockedInputs.cacheBuild = 'false';
    mockedInputs.pythonVersion = '3.9.2';
    mockedInputs.pythonVersionFile = 'file';
    mockedInputs.token = 'token';
  });

  describe('"python-version" and "python-version-file"', () => {
    test('both empty leads to using ".python-version"', async () => {
      mockedInputs.pythonVersion = '';
      mockedInputs.pythonVersionFile = '';

      await inputs.parseInputs();

      expect(mockedFs.existsSync).toBeCalledTimes(1);
      expect(mockedFs.existsSync).toBeCalledWith('.python-version');
      expect(mockedFs.readFileSync).not.toBeCalled();
    });

    test('specified "python-version" and empty "python-version-file" leads to using "python-version"', async () => {
      mockedInputs.pythonVersion = '3.5.4';
      mockedInputs.pythonVersionFile = '';

      const parsedInputs = await inputs.parseInputs();

      expect(mockedFs.existsSync).not.toBeCalled();
      expect(mockedFs.readFileSync).not.toBeCalled();
      expect(parsedInputs.version).toEqual(new inputs.PythonVersion('3.5.4'));
    });
  });
});
