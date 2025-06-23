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

import * as builder from '../builder';
import * as constants from '../constants';
import * as core from '@actions/core';
import * as inputs from '../inputs';
import * as tc from '@actions/tool-cache';
import * as utils from '../utils';
import * as version from '../version';
import {describe, expect, jest, test} from '@jest/globals';
import {OS} from '../builder/patches';
import main from '../main';
import os from 'os';

jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
jest.mock('@actions/exec');
jest.mock('@actions/io');
jest.mock('../inputs');
jest.mock('../version');
jest.mock('../builder/factory');
jest.mock('os');
jest.mock('../utils');
jest.mock('../label');

const mockedCore = jest.mocked(core);
const mockedTc = jest.mocked(tc);
const mockedInputs = jest.mocked(inputs);
const mockedVersion = jest.mocked(version);
const mockedBuilder = jest.mocked(builder);
const mockedOs = jest.mocked(os);
const mockedUtils = jest.mocked(utils);

mockedOs.tmpdir.mockReturnValue('');
mockedUtils.realpath.mockImplementation(async p => {
  return p.toString();
});
mockedUtils.realpathSync.mockImplementation(p => {
  return p.toString();
});

class MockBuilder extends builder.Builder {
  override async build(): Promise<string> {
    return 'build/path';
  }
  protected buildSuffix(): string {
    return 'build suffix';
  }
  protected CacheKeyOs(): string {
    return 'os';
  }
  protected async additionalCachePaths(): Promise<string[]> {
    return ['additional/path'];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async postInstall(_installedPath: string): Promise<void> {}
  override async clean(): Promise<void> {}
  override async saveCache(): Promise<void> {}
  override async restoreCache(): Promise<string | null> {
    return 'restored/path';
  }
  protected override async prepareSources(): Promise<void> {}
  protected os(): OS {
    return 'linux';
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async initPip(_pythonPath: string): Promise<void> {}
}

describe('main', () => {
  describe('input parsing', () => {
    test('calls inputs.parseInputs', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.10.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValue({
        success: true,
        version: '3.10.0'
      });

      await main();

      expect(mockedInputs.parseInputs).toHaveBeenCalledTimes(1);
    });

    test('handles a failure in inputs.parseInputs', async () => {
      mockedInputs.parseInputs.mockRejectedValueOnce(
        new Error('fail input parsing')
      );

      await main();

      expect(mockedInputs.parseInputs).toHaveBeenCalledTimes(1);
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedVersion.getSetupPythonResult).not.toHaveBeenCalled();
    });
  });

  describe('actions/setup-python result', () => {
    test('calls version.getSetupPythonResult', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.10.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: true,
        version: '3.10.0'
      });

      await main();

      expect(mockedVersion.getSetupPythonResult).toHaveBeenCalledTimes(1);
    });

    test('handles a failure in version.getSetupPythonResult with CPython', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.10.x'}
      });
      mockedVersion.getSetupPythonResult.mockRejectedValueOnce(
        new Error('fail actions/setup-python')
      );

      await main();

      expect(mockedVersion.getSetupPythonResult).toHaveBeenCalledTimes(1);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        '3.10.x'
      );
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
    });

    test('handles a failure in version.getSetupPythonResult with PyPy', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.PyPy, version: 'pyp3.6'}
      });
      mockedVersion.getSetupPythonResult.mockRejectedValueOnce(
        new Error('fail actions/setup-python')
      );

      await main();

      expect(mockedVersion.getSetupPythonResult).toHaveBeenCalledTimes(1);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        'pyp3.6'
      );
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
    });

    test('handles a failure in version.getSetupPythonResult with GraalPy', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.GraalPy, version: 'pyp3.6'}
      });
      mockedVersion.getSetupPythonResult.mockRejectedValueOnce(
        new Error('fail actions/setup-python')
      );

      await main();

      expect(mockedVersion.getSetupPythonResult).toHaveBeenCalledTimes(1);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        'pyp3.6'
      );
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
    });

    describe('CPython', () => {
      test('success', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.CPython, version: '3.6.x'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: true,
          version: '3.6.2'
        });
        mockedVersion.isPyPy.mockResolvedValue(false);
        mockedVersion.isGraalPy.mockResolvedValue(false);
        mockedVersion.isCpython.mockResolvedValue(true);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.PYTHON_VERSION,
          '3.6.2'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
        expect(mockedVersion.isCpython).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isCpython).toHaveBeenCalledWith({
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        });
        expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
        expect(mockedCore.setFailed).not.toHaveBeenCalled();
      });

      test('failure', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.CPython, version: '3.6.x'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: false,
          version: '3.6.2'
        });
        mockedVersion.isPyPy.mockResolvedValue(false);
        mockedVersion.isGraalPy.mockResolvedValue(false);
        mockedVersion.isCpython.mockResolvedValue(true);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isCpython).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isCpython).toHaveBeenCalledWith({
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        });
        expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      });
    });

    describe('PyPy', () => {
      test('success', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.PyPy, version: 'pypy3.6'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: true,
          version: 'pypy3.6'
        });
        mockedVersion.isPyPy.mockResolvedValue(true);
        mockedVersion.isGraalPy.mockResolvedValue(false);
        mockedVersion.isCpython.mockResolvedValue(false);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.PYTHON_VERSION,
          'pypy3.6'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
        expect(mockedVersion.isPyPy).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isPyPy).toHaveBeenCalledWith({
          type: inputs.PythonType.PyPy,
          version: 'pypy3.6'
        });
        expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
        expect(mockedCore.setFailed).not.toHaveBeenCalled();
      });

      test('failure', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.PyPy, version: 'pypy3.6'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: false,
          version: 'pypy3.6'
        });
        mockedVersion.isPyPy.mockResolvedValue(true);
        mockedVersion.isGraalPy.mockResolvedValue(false);
        mockedVersion.isCpython.mockResolvedValue(false);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.PYTHON_VERSION,
          'pypy3.6'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
        expect(mockedVersion.isPyPy).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isPyPy).toHaveBeenCalledWith({
          type: inputs.PythonType.PyPy,
          version: 'pypy3.6'
        });
        expect(mockedCore.setFailed).not.toHaveBeenCalled();
      });
    });

    describe('GraalPy', () => {
      test('success', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.GraalPy, version: 'graalpy-22.3'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: true,
          version: 'graalpy-22.3'
        });
        mockedVersion.isPyPy.mockResolvedValue(false);
        mockedVersion.isGraalPy.mockResolvedValue(true);
        mockedVersion.isCpython.mockResolvedValue(false);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.PYTHON_VERSION,
          'graalpy-22.3'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
        expect(mockedVersion.isGraalPy).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isGraalPy).toHaveBeenCalledWith({
          type: inputs.PythonType.GraalPy,
          version: 'graalpy-22.3'
        });
        expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
        expect(mockedCore.setFailed).not.toHaveBeenCalled();
      });

      test('failure', async () => {
        mockedInputs.parseInputs.mockResolvedValueOnce({
          allowPrereleases: false,
          architecture: 'x64',
          buildBehavior: inputs.BuildBehavior.Info,
          cache: false,
          checkLatest: false,
          token: 'token',
          version: {type: inputs.PythonType.GraalPy, version: 'graalpy-22.3'}
        });
        mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
          success: false,
          version: 'graalpy-22.3'
        });
        mockedVersion.isPyPy.mockResolvedValue(false);
        mockedVersion.isGraalPy.mockResolvedValue(true);
        mockedVersion.isCpython.mockResolvedValue(false);

        await main();

        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.ARCHITECTURE,
          'x64'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledWith(
          constants.OutputNames.PYTHON_VERSION,
          'graalpy-22.3'
        );
        expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
        expect(mockedVersion.isGraalPy).toHaveBeenCalledTimes(1);
        expect(mockedVersion.isGraalPy).toHaveBeenCalledWith({
          type: inputs.PythonType.GraalPy,
          version: 'graalpy-22.3'
        });
        expect(mockedCore.setFailed).not.toHaveBeenCalled();
      });
    });
  });

  describe('Build behavior', () => {
    test('Error leads to a failed action with an error message', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Error,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);

      await main();

      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedCore.warning).not.toHaveBeenCalled();
      expect(mockedBuilder.getBuilder).not.toHaveBeenCalled();
    });

    test('Warn leads to building from source with a warning', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Warn,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(
        new MockBuilder({version: '3.6.15', zipBall: 'zipballUri'}, 'x64')
      );

      await main();

      expect(mockedCore.warning.mock.calls).toMatchSnapshot();
      expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.ARCHITECTURE,
        'x64'
      );
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        '3.6.15'
      );
      expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      expect(mockedBuilder.getBuilder).toHaveBeenCalledWith(
        {
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        },
        'x64'
      );
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });

    test('Info leads to building from source with a message in the logs', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(
        new MockBuilder({version: '3.6.15', zipBall: 'zipballUri'}, 'x64')
      );

      await main();

      expect(mockedCore.info.mock.calls).toMatchSnapshot();
      expect(mockedCore.debug.mock.calls).toMatchSnapshot();
      expect(mockedCore.warning).not.toHaveBeenCalled();
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.ARCHITECTURE,
        'x64'
      );
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        '3.6.15'
      );
      expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      expect(mockedBuilder.getBuilder).toHaveBeenCalledWith(
        {
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        },
        'x64'
      );
    });

    test('Allow leads to building from source with a message in the debug logs', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Allow,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(
        new MockBuilder({version: '3.6.15', zipBall: 'zipballUri'}, 'x64')
      );

      await main();

      expect(mockedCore.info.mock.calls).toMatchSnapshot();
      expect(mockedCore.debug.mock.calls).toMatchSnapshot();
      expect(mockedCore.warning).not.toHaveBeenCalled();
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
      expect(mockedCore.setOutput).toHaveBeenCalledTimes(2);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.ARCHITECTURE,
        'x64'
      );
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.PYTHON_VERSION,
        '3.6.15'
      );
      expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      expect(mockedBuilder.getBuilder).toHaveBeenCalledWith(
        {
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        },
        'x64'
      );
    });
  });

  describe('builder.getBuilder', () => {
    test('calls builder.getBuilder', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(
        new MockBuilder({version: '3.6.15', zipBall: 'zipballUri'}, 'x64')
      );

      await main();

      expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      expect(mockedBuilder.getBuilder).toHaveBeenCalledWith(
        {
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        },
        'x64'
      );
    });

    test('calls builder.getBuilder with build behavior "force" and setup python result successful', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Force,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: true,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(
        new MockBuilder({version: '3.6.15', zipBall: 'zipballUri'}, 'x64')
      );

      await main();

      expect(mockedBuilder.getBuilder).toHaveBeenCalledTimes(1);
      expect(mockedBuilder.getBuilder).toHaveBeenCalledWith(
        {
          type: inputs.PythonType.CPython,
          version: '3.6.x'
        },
        'x64'
      );
    });

    test('handles builder.getBuilder returning null', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockResolvedValueOnce(null);

      await main();

      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockedCore.setOutput).toHaveBeenCalledTimes(1);
      expect(mockedCore.setOutput).toHaveBeenCalledWith(
        constants.OutputNames.ARCHITECTURE,
        'x64'
      );
    });

    test('fails to handle a failure in builder.getBuilder', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      mockedBuilder.getBuilder.mockRejectedValueOnce(
        new Error('error getBuilder')
      );

      await expect(main()).rejects.toThrow(new Error('error getBuilder'));
    });
  });

  describe('Builder', () => {
    test('cache false leads to calling build, clean, initPip and postInstall on the builder', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: false,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledWith('install/path');
      expect(mockInstanceClean).toHaveBeenCalledTimes(1);
      expect(mockInstanceSaveCache).not.toHaveBeenCalled();
      expect(mockInstanceRestoreCache).not.toHaveBeenCalled();
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'build/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceInitPip).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledWith('install/path');
    });

    test('cache-hit leads to calling restoreCache, postInstall, initPip and clean on the builder', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).not.toHaveBeenCalled();
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledWith('install/path');
      expect(mockInstanceClean).toHaveBeenCalledTimes(1);
      expect(mockInstanceSaveCache).not.toHaveBeenCalled();
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'restored/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceInitPip).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledWith('install/path');
    });

    test('cache-miss leads to calling restoreCache, build, saveCache, postInstall, initPip and clean on the builder', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledWith('install/path');
      expect(mockInstanceClean).toHaveBeenCalledTimes(1);
      expect(mockInstanceSaveCache).toHaveBeenCalledTimes(1);
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'build/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceInitPip).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledWith('install/path');
    });

    test('handles failure in restoreCache', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.restoreCache = async () => {
        throw new Error('Failure in restoreCache');
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).not.toHaveBeenCalled();
      expect(mockInstancePostInstall).not.toHaveBeenCalled();
      expect(mockInstanceClean).not.toHaveBeenCalled();
      expect(mockInstanceSaveCache).not.toHaveBeenCalled();
      expect(mockedTc.cacheDir).not.toHaveBeenCalled();
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockInstanceInitPip).not.toHaveBeenCalled();
    });

    test('handles failure in build', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.build = async () => {
        throw new Error('Failure in build');
      };
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).not.toHaveBeenCalled();
      expect(mockInstanceClean).not.toHaveBeenCalled();
      expect(mockInstanceSaveCache).not.toHaveBeenCalled();
      expect(mockedTc.cacheDir).not.toHaveBeenCalled();
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockInstanceInitPip).not.toHaveBeenCalled();
    });

    test('handles failure in saveCache', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.saveCache = async () => {
        throw new Error('Failure in saveCache');
      };
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).not.toHaveBeenCalled();
      expect(mockInstanceClean).not.toHaveBeenCalled();
      expect(mockInstanceSaveCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).not.toHaveBeenCalled();
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockInstanceInitPip).not.toHaveBeenCalled();
    });

    test('handles failure in postInstall', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.postInstall = async () => {
        throw new Error('Failure in postInstall');
      };
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstanceClean).not.toHaveBeenCalled();
      expect(mockInstanceSaveCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'build/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
      expect(mockInstanceInitPip).not.toHaveBeenCalled();
    });

    test('handles failure in initPip', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.initPip = async () => {
        throw new Error('Failure in initPip');
      };
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await main();

      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstanceClean).not.toHaveBeenCalled();
      expect(mockInstanceSaveCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'build/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledWith('install/path');
      expect(mockedCore.setFailed.mock.calls).toMatchSnapshot();
    });

    test('fails to handle failure in clean', async () => {
      mockedInputs.parseInputs.mockResolvedValueOnce({
        allowPrereleases: false,
        architecture: 'x64',
        buildBehavior: inputs.BuildBehavior.Info,
        cache: true,
        checkLatest: false,
        token: 'token',
        version: {type: inputs.PythonType.CPython, version: '3.6.x'}
      });
      mockedVersion.getSetupPythonResult.mockResolvedValueOnce({
        success: false,
        version: '3.6.15'
      });
      mockedVersion.isPyPy.mockResolvedValue(false);
      mockedVersion.isGraalPy.mockResolvedValue(false);
      mockedVersion.isCpython.mockResolvedValue(true);
      const instance = new MockBuilder(
        {version: '3.6.15', zipBall: 'zipballUri'},
        'x64'
      );
      instance.clean = async () => {
        throw new Error('Failure in clean');
      };
      instance.restoreCache = async () => {
        return null;
      };
      const mockInstanceBuild = jest.spyOn(instance, 'build');
      const mockInstancePostInstall = jest.spyOn(instance, 'postInstall');
      const mockInstanceClean = jest.spyOn(instance, 'clean');
      const mockInstanceSaveCache = jest.spyOn(instance, 'saveCache');
      const mockInstanceRestoreCache = jest.spyOn(instance, 'restoreCache');
      const mockInstanceInitPip = jest.spyOn(instance, 'initPip');
      mockedBuilder.getBuilder.mockResolvedValueOnce(instance);
      mockedTc.cacheDir.mockResolvedValueOnce('install/path');

      await expect(main()).rejects.toThrow(new Error('Failure in clean'));
      expect(mockInstanceBuild).toHaveBeenCalledTimes(1);
      expect(mockInstancePostInstall).toHaveBeenCalledTimes(1);
      expect(mockInstanceClean).toHaveBeenCalledTimes(1);
      expect(mockInstanceSaveCache).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledTimes(1);
      expect(mockedTc.cacheDir).toHaveBeenCalledWith(
        'build/path',
        'Python',
        '3.6.15',
        'x64'
      );
      expect(mockInstanceRestoreCache).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledTimes(1);
      expect(mockInstanceInitPip).toHaveBeenCalledWith('install/path');
      expect(mockedCore.setFailed).not.toHaveBeenCalled();
    });
  });
});
