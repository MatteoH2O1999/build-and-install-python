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
import * as tc from '@actions/tool-cache';
import {describe, expect, jest, test} from '@jest/globals';
import WindowsBuilder from '../windows';
import {ftpPythonUrl} from '../../constants';
import path from 'path';

jest.mock('path');
jest.mock('@actions/core');
jest.mock('@actions/cache');
jest.mock('@actions/tool-cache');
jest.mock('@actions/io');
jest.mock('@actions/exec');
jest.mock('../../utils');

const mockedTc = jest.mocked(tc);
const mockedPath = jest.mocked(path);

mockedPath.join.mockImplementation((...paths: string[]) => {
  return paths.join('/');
});

describe('WindowsBuilder.getInstaller method', () => {
  test('calls tc.downloadTool and returns the path if exe is present', async () => {
    const builder = new WindowsBuilder(
      {version: '3.4.1', zipBall: 'zipBall'},
      'x64',
      false
    );
    // @ts-expect-error readonly override
    builder['path'] = 'path';
    mockedTc.downloadTool.mockResolvedValueOnce('exe');

    const installer = await builder['getInstaller']();

    expect(installer).toEqual('exe');
    expect(mockedTc.downloadTool).toHaveBeenCalledTimes(1);
    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      `${ftpPythonUrl}/3.4.1/python-3.4.1-amd64.exe`,
      'path/python-3.4.1-amd64.exe'
    );
  });

  test('calls tc.downloadTool twice and returns the path if msi is present', async () => {
    const builder = new WindowsBuilder(
      {version: '3.4.1', zipBall: 'zipBall'},
      'x64',
      false
    );
    // @ts-expect-error readonly override
    builder['path'] = 'path';
    mockedTc.downloadTool.mockRejectedValueOnce('error');
    mockedTc.downloadTool.mockResolvedValueOnce('msi');

    const installer = await builder['getInstaller']();

    expect(installer).toEqual('msi');
    expect(mockedTc.downloadTool).toHaveBeenCalledTimes(2);
    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      `${ftpPythonUrl}/3.4.1/python-3.4.1-amd64.exe`,
      'path/python-3.4.1-amd64.exe'
    );
    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      `${ftpPythonUrl}/3.4.1/python-3.4.1.amd64.msi`,
      'path/python-3.4.1.amd64.msi'
    );
  });

  test('calls tc.downloadTool twice and returns an empty string if neither exe or msi are present', async () => {
    const builder = new WindowsBuilder(
      {version: '3.4.1', zipBall: 'zipBall'},
      'x64',
      false
    );
    // @ts-expect-error readonly override
    builder['path'] = 'path';
    mockedTc.downloadTool.mockRejectedValueOnce('error');
    mockedTc.downloadTool.mockRejectedValueOnce('error');

    const installer = await builder['getInstaller']();

    expect(installer).toEqual('');
    expect(mockedTc.downloadTool).toHaveBeenCalledTimes(2);
    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      `${ftpPythonUrl}/3.4.1/python-3.4.1-amd64.exe`,
      'path/python-3.4.1-amd64.exe'
    );
    expect(mockedTc.downloadTool).toHaveBeenCalledWith(
      `${ftpPythonUrl}/3.4.1/python-3.4.1.amd64.msi`,
      'path/python-3.4.1.amd64.msi'
    );
  });
});
