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

import * as manifestTC from '@actions/tool-cache/lib/manifest';
import * as tc from '@actions/tool-cache';
import {BuildBehavior, PythonVersion} from '../inputs';
import {IsTypeTest, SetupPythonTests, manifestUrl} from './version.fixtures';
import {
  SetupPythonResult,
  getSetupPythonResult,
  isCpython,
  isGraalPy,
  isPyPy
} from '../version';
import {beforeAll, describe, expect, jest, test} from '@jest/globals';
import axios from 'axios';

jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
jest.mock('@actions/tool-cache/lib/manifest');

const mockedTC = jest.mocked(tc);
const originalModule: typeof tc = jest.requireActual('@actions/tool-cache');
mockedTC.findFromManifest.mockImplementation(
  async (versionSpec, stable, manifest, archFilter) => {
    return await originalModule.findFromManifest(
      versionSpec,
      stable,
      manifest,
      archFilter
    );
  }
);

const mockedManifestTC = jest.mocked(manifestTC);
const originalManifest: typeof manifestTC = jest.requireActual(
  '@actions/tool-cache/lib/manifest'
);
originalManifest['_getOsVersion'] = () => {
  if (process.platform === 'linux') {
    return '22.04';
  } else {
    return '';
  }
};
mockedManifestTC._findMatch.mockImplementation(
  async (versionSpec, stable, candidates, archFilter) => {
    return await originalManifest._findMatch(
      versionSpec,
      stable,
      candidates,
      archFilter
    );
  }
);

describe('Is PyPy', () => {
  test.each(IsTypeTest)(
    'returns $expectedPyPy with python version $pythonVersion.type-$pythonVersion.version',
    async ({pythonVersion, expectedPyPy}) => {
      expect(await isPyPy(pythonVersion)).toBe(expectedPyPy);
    }
  );
});

describe('Is GraalPy', () => {
  test.each(IsTypeTest)(
    'returns $expectedGraalPy with python version $pythonVersion.type-$pythonVersion.version',
    async ({pythonVersion, expectedGraalPy}) => {
      expect(await isGraalPy(pythonVersion)).toBe(expectedGraalPy);
    }
  );
});

describe('Is CPython', () => {
  test.each(IsTypeTest)(
    'returns $expectedCPython with python version $pythonVersion.type-$pythonVersion.version',
    async ({pythonVersion, expectedCPython}) => {
      expect(await isCpython(pythonVersion)).toBe(expectedCPython);
    }
  );
});

describe(`getSetupPythonResult with manifest url ${manifestUrl}`, () => {
  let manifest: tc.IToolRelease[];

  beforeAll(async () => {
    const response = await axios.get(manifestUrl);
    manifest = response.data;
    mockedTC.getManifestFromRepo.mockResolvedValue(manifest);
  });

  test('returns found version if present in local tool cache', async () => {
    mockedTC.find.mockReturnValue('/python/version/3.9.8/x64');
    const expected: SetupPythonResult = {
      success: true,
      version: '3.9.8'
    };

    const result = await getSetupPythonResult({
      allowPrereleases: false,
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: false,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.9')
    });

    expect(result).toEqual(expected);
    expect(mockedTC.findFromManifest).not.toBeCalled();
    expect(mockedTC.getManifestFromRepo).not.toBeCalled();
  });

  test('returns latest version in range if an older version is present in local tool cache and check-latest is true', async () => {
    mockedTC.find.mockReturnValue('/python/version/3.9.0/x64');
    const expected: SetupPythonResult = {
      success: true,
      version: process.platform === 'win32' ? '3.9.13' : '3.9.16'
    };

    const result = await getSetupPythonResult({
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: false,
      checkLatest: true,
      token: 'token',
      version: new PythonVersion('3.9')
    });

    expect(result).toEqual(expected);
  });

  test.each(SetupPythonTests)(
    `returns $expectedResult.${process.platform} for input version $inputs.version.type-$inputs.version.version for $inputs.architecture and allow prereleases $inputs.allowPrereleases`,
    async ({expectedResult, inputs}) => {
      mockedTC.find.mockReturnValue('');
      let platformResult: SetupPythonResult;
      if (process.platform === 'linux') {
        platformResult = expectedResult.linux;
      } else if (process.platform === 'darwin') {
        platformResult = expectedResult.darwin;
      } else if (process.platform === 'win32') {
        platformResult = expectedResult.win32;
      } else {
        throw new Error(`Action not supported on ${process.platform}`);
      }

      const result = await getSetupPythonResult(inputs);

      expect(result).toEqual(platformResult);
    }
  );
});
