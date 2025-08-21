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

import {describe, expect, jest, test} from '@jest/globals';
import {failingTests, nullTests, tests} from './factory.fixtures';
import LinuxBuilder from '../linux';
import MacOSBuilder from '../darwin';
import {PythonType} from '../../inputs';
import WindowsBuilder from '../windows';
import getBuilder from '../factory';

jest.mock('@actions/core');
jest.mock('../tags.json', () => {
  const actual: unknown[] = jest.requireActual('../tags.json');
  actual.reverse();
  return {
    __esModule: true,
    default: actual
  };
});

function detectExpectedClass():
  | typeof LinuxBuilder
  | typeof MacOSBuilder
  | typeof WindowsBuilder
  | null {
  if (process.platform === 'linux') {
    return LinuxBuilder;
  } else if (process.platform === 'darwin') {
    return MacOSBuilder;
  } else if (process.platform === 'win32') {
    return WindowsBuilder;
  }
  return null;
}

describe('getBuilder', () => {
  const expectedBuilder = detectExpectedClass();

  test.each(tests)(
    `Requesting Python $inputVersion for architecture $inputArchitecture leads to a ${
      expectedBuilder?.name || 'null'
    } with specific version $expectedSpecificVersion for architecture $expectedArchitecture`,
    async ({
      inputVersion,
      inputArchitecture,
      expectedSpecificVersion,
      expectedArchitecture
    }) => {
      const builder = await getBuilder(inputVersion, inputArchitecture);

      expect(builder).toBeInstanceOf(expectedBuilder);
      expect(builder?.specificVersion).toEqual(expectedSpecificVersion);
      expect(builder?.arch).toEqual(expectedArchitecture);
    }
  );

  test.each(failingTests)(
    'Requesting Python %s leads to an error',
    async pythonVersion => {
      await expect(
        getBuilder(pythonVersion, process.arch)
      ).rejects.toThrowErrorMatchingSnapshot();
    }
  );

  test.each(nullTests)(
    'Requesting Python %s leads to a null builder',
    async pythonVersion => {
      const builder = await getBuilder(pythonVersion, 'x64');

      expect(builder).toBeNull();
    }
  );

  test(`Requesting any CPython version from platform different from "win32", "darwin" or "linux" leads to a null builder`, async () => {
    const realProcess = process;
    global.process = {platform: 'freebsd'} as typeof process;

    const builder = await getBuilder(
      {freethreaded: false, type: PythonType.CPython, version: '3.x.x'},
      'x64'
    );

    expect(builder).toBeNull();

    global.process = realProcess;
  });
});
