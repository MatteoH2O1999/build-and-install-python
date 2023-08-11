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

import * as constants from '../constants';
import * as core from '@actions/core';
import * as label from '../label';
import * as utils from 'setup-python/src/utils';
import {describe, expect, jest, test} from '@jest/globals';

jest.mock('setup-python/src/utils');
jest.mock('@actions/core');

const mockedUtils = jest.mocked(utils);
const mockedCore = jest.mocked(core);

//@ts-expect-error overwrite of const property for testing
constants.testedLabels = ['macos-12', 'ubuntu-22.04', 'windows-2022'];

describe('emitWarnings', () => {
  test('calls getOSInfo', async () => {
    await label.emitWarnings();

    expect(mockedUtils.getOSInfo).toBeCalledTimes(1);
  });

  test('logs impossibility to gather information in core.debug', async () => {
    mockedUtils.getOSInfo.mockResolvedValueOnce(undefined);

    await label.emitWarnings();

    expect(mockedCore.debug.mock.calls).toMatchSnapshot();
  });

  test.each([
    {osName: 'Ubuntu', osVersion: '20.04'},
    {osName: 'Macos', osVersion: '13.4.2'}
  ])(
    'emit warning if label is not tested with osName: "$osName" and osVersion: "$osVersion"',
    async detectedOs => {
      mockedUtils.getOSInfo.mockResolvedValueOnce(detectedOs);

      await label.emitWarnings();

      expect(mockedCore.warning.mock.calls).toMatchSnapshot();
    }
  );

  test.each([
    {osName: 'Ubuntu', osVersion: '22.04'},
    {osName: 'Macos', osVersion: '12.4.2'}
  ])(
    'do not emit warning if label is not tested with osName: "$osName" and osVersion: "$osVersion"',
    async detectedOs => {
      mockedUtils.getOSInfo.mockResolvedValueOnce(detectedOs);

      await label.emitWarnings();

      expect(mockedCore.warning).not.toBeCalled();
    }
  );
});
