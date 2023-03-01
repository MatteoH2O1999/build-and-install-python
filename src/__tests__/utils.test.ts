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

/* eslint-disable no-restricted-imports */

import * as utils from '../utils';
import {describe, expect, jest, test} from '@jest/globals';
import fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
    readdir: jest.fn(),
    symlink: jest.fn(),
    writeFile: jest.fn()
  }
}));

const mockedFs = jest.mocked(fs);

describe('Utils', () => {
  describe('readdir', () => {
    test('calls fs.promises.readdir', async () => {
      await utils.readdir('path');

      expect(mockedFs.promises.readdir).toBeCalledTimes(1);
      expect(mockedFs.promises.readdir).toBeCalledWith('path', undefined);
    });

    test('returns what fs.promises.readdir returns', async () => {
      // @ts-expect-error fs.Dirent overload
      mockedFs.promises.readdir.mockResolvedValueOnce(['dir1', 'dir2']);

      const dirs = await utils.readdir('path');

      expect(dirs).toEqual(['dir1', 'dir2']);
    });
  });

  describe('exists', () => {
    test('calls fs.existsSync', async () => {
      await utils.exists('path');

      expect(mockedFs.existsSync).toBeCalledTimes(1);
      expect(mockedFs.existsSync).toBeCalledWith('path');
    });

    test('returns what fs.existsSync returns', async () => {
      mockedFs.existsSync.mockReturnValueOnce(true);

      const fileExists = await utils.exists('path');

      expect(fileExists).toEqual(true);
    });
  });

  describe('symlink', () => {
    test('calls fs.promises.symlink', async () => {
      await utils.symlink('target', 'path');

      expect(mockedFs.promises.symlink).toBeCalledTimes(1);
      expect(mockedFs.promises.symlink).toBeCalledWith(
        'target',
        'path',
        undefined
      );
    });
  });

  describe('readFile', () => {
    test('calls fs.promises.readFile', async () => {
      await utils.readFile('path');

      expect(mockedFs.promises.readFile).toBeCalledTimes(1);
      expect(mockedFs.promises.readFile).toBeCalledWith('path', undefined);
    });

    test('returns what fs.promises.readFile returns if it is a string', async () => {
      mockedFs.promises.readFile.mockResolvedValueOnce('string content');

      const content = await utils.readFile('path');

      expect(content).toEqual('string content');
    });

    test('returns the string representation of what fs.promises.readFile returns if it is a Buffer', async () => {
      mockedFs.promises.readFile.mockResolvedValueOnce(
        Buffer.from('buffer content')
      );

      const content = await utils.readFile('path');

      expect(content).toEqual('buffer content');
    });
  });

  describe('writeFile', () => {
    test('calls fs.promises.writeFile', async () => {
      await utils.writeFile('path', 'content to write');

      expect(mockedFs.promises.writeFile).toBeCalledTimes(1);
      expect(mockedFs.promises.writeFile).toBeCalledWith(
        'path',
        'content to write'
      );
    });
  });
});
