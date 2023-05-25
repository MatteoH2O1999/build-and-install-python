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
import * as utils from '../utils';
import {MockedInputs, mockInput, pythonVersions} from './inputs.fixtures';
import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import {InputNames} from '../constants';

const mockedInputs: MockedInputs = {
  allowBuild: 'warn',
  allowPrereleases: 'false',
  architecture: 'x64',
  cacheBuild: 'false',
  checkLatest: 'false',
  pythonVersion: '3.9.2',
  pythonVersionFile: 'file',
  token: 'token'
};

jest.mock('@actions/core');
jest.mock('../utils');

const mockedCore = jest.mocked(core);
const mockedUtils = jest.mocked(utils);

mockedCore.getBooleanInput.mockImplementation(
  (name: string, options: core.InputOptions | undefined) => {
    const trueValue = ['true', 'True', 'TRUE'];
    const falseValue = ['false', 'False', 'FALSE'];
    const val = core.getInput(name, options);
    if (trueValue.includes(val)) return true;
    if (falseValue.includes(val)) return false;
    throw new TypeError(
      `Input does not meet YAML 1.2 "Core Schema" specification: ${name}\n` +
        `Support boolean input list: \`true | True | TRUE | false | False | FALSE\``
    );
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
    mockedInputs.checkLatest = 'false';
    mockedInputs.allowPrereleases = 'false';
  });

  describe(`"${InputNames.PYTHON_VERSION}" and "${InputNames.PYTHON_VERSION_FILE}"`, () => {
    test('both empty leads to using ".python-version"', async () => {
      mockedInputs.pythonVersion = '';
      mockedInputs.pythonVersionFile = '';

      await inputs.parseInputs();

      expect(mockedUtils.exists).toBeCalledTimes(1);
      expect(mockedUtils.exists).toBeCalledWith('.python-version');
      expect(mockedUtils.readFile).not.toBeCalled();
    });

    test(`specified "${InputNames.PYTHON_VERSION}" and empty "${InputNames.PYTHON_VERSION_FILE}" leads to using "${InputNames.PYTHON_VERSION}"`, async () => {
      mockedInputs.pythonVersion = '3.5.4';
      mockedInputs.pythonVersionFile = '';
      mockedUtils.readFile.mockResolvedValue('3.9.0');

      const parsedInputs = await inputs.parseInputs();

      expect(mockedUtils.exists).not.toBeCalled();
      expect(mockedUtils.readFile).not.toBeCalled();
      expect(parsedInputs.version).toEqual(new inputs.PythonVersion('3.5.4'));
    });

    test(`empty "${InputNames.PYTHON_VERSION}" and specified existing "${InputNames.PYTHON_VERSION_FILE}" leads to using "${InputNames.PYTHON_VERSION_FILE}"`, async () => {
      mockedInputs.pythonVersion = '';
      mockedInputs.pythonVersionFile = 'file';
      mockedUtils.exists.mockResolvedValue(true);
      mockedUtils.readFile.mockResolvedValue('3.9.0');

      const parsedInputs = await inputs.parseInputs();

      expect(mockedUtils.exists).toBeCalledTimes(1);
      expect(mockedUtils.exists).toBeCalledWith('file');
      expect(mockedUtils.readFile).toBeCalledTimes(1);
      expect(mockedUtils.readFile).toBeCalledWith('file', 'utf-8');
      expect(parsedInputs.version).toEqual(new inputs.PythonVersion('3.9.0'));
    });

    test(`empty "${InputNames.PYTHON_VERSION}" and specified non-esisting "${InputNames.PYTHON_VERSION_FILE}" leads to a warning and a x.x.x version`, async () => {
      mockedInputs.pythonVersion = '';
      mockedInputs.pythonVersionFile = 'file';
      mockedUtils.exists.mockResolvedValue(false);
      mockedUtils.readFile.mockResolvedValue('3.9.0');

      const parsedInputs = await inputs.parseInputs();

      expect(mockedCore.warning.mock.calls).toMatchSnapshot();
      expect(mockedCore.warning).toBeCalledTimes(1);
      expect(mockedUtils.exists).toBeCalledTimes(1);
      expect(mockedUtils.exists).toBeCalledWith('file');
      expect(mockedUtils.readFile).not.toBeCalled();
      expect(parsedInputs.version).toEqual(new inputs.PythonVersion('x.x.x'));
    });

    test(`specified "${InputNames.PYTHON_VERSION}" and specified existing "${InputNames.PYTHON_VERSION_FILE}" leads to a warning and to using "${InputNames.PYTHON_VERSION}"`, async () => {
      mockedInputs.pythonVersion = '3.10.10';
      mockedInputs.pythonVersionFile = 'file';
      mockedUtils.exists.mockResolvedValue(true);
      mockedUtils.readFile.mockResolvedValue('3.9.0');

      const parsedInputs = await inputs.parseInputs();

      expect(mockedCore.warning.mock.calls).toMatchSnapshot();
      expect(mockedCore.warning).toBeCalledTimes(1);
      expect(mockedUtils.exists).not.toBeCalled();
      expect(mockedUtils.readFile).not.toBeCalled();
      expect(parsedInputs.version).toEqual(new inputs.PythonVersion('3.10.10'));
    });
  });

  describe(`"${InputNames.ARCHITECTURE}"`, () => {
    test(`empty "${InputNames.ARCHITECTURE}" defaults to current one`, async () => {
      mockedInputs.architecture = '';

      const parsedInputs = await inputs.parseInputs();

      expect(parsedInputs.architecture).toEqual(process.arch);
    });

    test(`specified "${InputNames.ARCHITECTURE}" leads to using it as is`, async () => {
      mockedInputs.architecture = 'not an architecture';

      const parsedInputs = await inputs.parseInputs();

      expect(parsedInputs.architecture).toBe('not an architecture');
    });
  });

  describe(`"${InputNames.CACHE_BUILD}"`, () => {
    test.each(['false', 'FALSE', 'False'])(
      `using "${InputNames.CACHE_BUILD}" with value "%s" leads to "false"`,
      async cache => {
        mockedInputs.cacheBuild = cache;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.cache).toBe(false);
      }
    );

    test.each(['true', 'TRUE', 'True'])(
      `using "${InputNames.CACHE_BUILD}" with value "%s" leads to "true"`,
      async cache => {
        mockedInputs.cacheBuild = cache;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.cache).toBe(true);
      }
    );

    test.each(['TRue', 'FalSe', '1', '0'])(
      `using "${InputNames.CACHE_BUILD}" with value "%s" throws an Error`,
      async cache => {
        mockedInputs.cacheBuild = cache;

        await expect(
          inputs.parseInputs()
        ).rejects.toThrowErrorMatchingSnapshot();
      }
    );

    test(`empty "${InputNames.CACHE_BUILD}" throws an Error`, async () => {
      mockedInputs.cacheBuild = '';

      await expect(inputs.parseInputs()).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe(`"${InputNames.CHECK_LATEST}"`, () => {
    test.each(['false', 'FALSE', 'False'])(
      `using "${InputNames.CHECK_LATEST}" with value "%s" leads to "false"`,
      async latest => {
        mockedInputs.checkLatest = latest;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.checkLatest).toBe(false);
      }
    );

    test.each(['true', 'TRUE', 'True'])(
      `using "${InputNames.CHECK_LATEST}" with value "%s" leads to "true"`,
      async latest => {
        mockedInputs.checkLatest = latest;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.checkLatest).toBe(true);
      }
    );

    test.each(['TRue', 'FalSe', '1', '0'])(
      `using "${InputNames.CHECK_LATEST}" with value "%s" throws an Error`,
      async latest => {
        mockedInputs.checkLatest = latest;

        await expect(
          inputs.parseInputs()
        ).rejects.toThrowErrorMatchingSnapshot();
      }
    );

    test(`empty "${InputNames.CHECK_LATEST}" throws an Error`, async () => {
      mockedInputs.checkLatest = '';

      await expect(inputs.parseInputs()).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe(`"${InputNames.PRERELEASES}"`, () => {
    test.each(['false', 'FALSE', 'False'])(
      `using "${InputNames.PRERELEASES}" with value "%s" leads to "false"`,
      async latest => {
        mockedInputs.allowPrereleases = latest;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.allowPrereleases).toBe(false);
      }
    );

    test.each(['true', 'TRUE', 'True'])(
      `using "${InputNames.PRERELEASES}" with value "%s" leads to "true"`,
      async latest => {
        mockedInputs.allowPrereleases = latest;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.allowPrereleases).toBe(true);
      }
    );

    test.each(['TRue', 'FalSe', '1', '0'])(
      `using "${InputNames.PRERELEASES}" with value "%s" throws an Error`,
      async latest => {
        mockedInputs.allowPrereleases = latest;

        await expect(
          inputs.parseInputs()
        ).rejects.toThrowErrorMatchingSnapshot();
      }
    );

    test(`empty "${InputNames.PRERELEASES}" throws an Error`, async () => {
      mockedInputs.allowPrereleases = '';

      await expect(inputs.parseInputs()).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe(`"${InputNames.ALLOW_BUILD}"`, () => {
    test(`empty "${InputNames.ALLOW_BUILD}" throws an Error`, async () => {
      mockedInputs.allowBuild = '';

      await expect(inputs.parseInputs()).rejects.toThrowErrorMatchingSnapshot();
    });

    test.each(['allow', 'Allow', 'ALLOW', ' AllOw'])(
      `using "${InputNames.ALLOW_BUILD}" with value "%s" leads to "allow" behavior`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.buildBehavior).toBe(inputs.BuildBehavior.Allow);
      }
    );

    test.each(['info', 'Info', 'INFO', 'InFo '])(
      `using "${InputNames.ALLOW_BUILD}" with value "%s" leads to "info" behavior`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.buildBehavior).toBe(inputs.BuildBehavior.Info);
      }
    );

    test.each(['warn', 'Warn', 'WARN', 'wARn   '])(
      `using "${InputNames.ALLOW_BUILD}" with value "%s" leads to "warn" behavior`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.buildBehavior).toBe(inputs.BuildBehavior.Warn);
      }
    );

    test.each(['error', 'Error', 'ERROR', ' ErRor  '])(
      `using "${InputNames.ALLOW_BUILD}" with value "%s" leads to "error" behavior`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.buildBehavior).toBe(inputs.BuildBehavior.Error);
      }
    );

    test.each(['force', 'Force', 'FORCE', ' FoRce  '])(
      `using "${InputNames.ALLOW_BUILD}" with value "%s" leads to "error" behavior`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.buildBehavior).toBe(inputs.BuildBehavior.Force);
      }
    );

    test.each([
      'In fo',
      'Al low',
      'ok',
      'forbid',
      'no',
      'yes',
      'True',
      'false'
    ])(
      `using ${InputNames.ALLOW_BUILD}" with value "%s" throws an Error`,
      async behavior => {
        mockedInputs.allowBuild = behavior;

        await expect(inputs.parseInputs).rejects.toThrowErrorMatchingSnapshot();
      }
    );
  });

  describe(`"${InputNames.TOKEN}" should be used as is`, () => {
    test.each(['token', '', 'a pretty long and unique string'])(
      `using "${InputNames.TOKEN}" with value "%s"`,
      async token => {
        mockedInputs.token = token;

        const parsedInputs = await inputs.parseInputs();

        expect(parsedInputs.token).toBe(token);
      }
    );
  });
});
