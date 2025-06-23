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
    realpath: jest.fn(),
    symlink: jest.fn(),
    writeFile: jest.fn()
  },
  realpathSync: jest.fn()
}));

const mockedFs = jest.mocked(fs);

describe('Utils', () => {
  describe('readdir', () => {
    test('calls fs.promises.readdir', async () => {
      await utils.readdir('path');

      expect(mockedFs.promises.readdir).toHaveBeenCalledTimes(1);
      expect(mockedFs.promises.readdir).toHaveBeenCalledWith('path', undefined);
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

      expect(mockedFs.existsSync).toHaveBeenCalledTimes(1);
      expect(mockedFs.existsSync).toHaveBeenCalledWith('path');
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

      expect(mockedFs.promises.symlink).toHaveBeenCalledTimes(1);
      expect(mockedFs.promises.symlink).toHaveBeenCalledWith(
        'target',
        'path',
        undefined
      );
    });
  });

  describe('readFile', () => {
    test('calls fs.promises.readFile', async () => {
      mockedFs.promises.readFile.mockResolvedValueOnce('string content');
      await utils.readFile('path');

      expect(mockedFs.promises.readFile).toHaveBeenCalledTimes(1);
      expect(mockedFs.promises.readFile).toHaveBeenCalledWith(
        'path',
        undefined
      );
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

      expect(mockedFs.promises.writeFile).toHaveBeenCalledTimes(1);
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        'path',
        'content to write'
      );
    });
  });

  describe('realpath', () => {
    test('calls fs.promises.realpath', async () => {
      await utils.realpath('path');

      expect(mockedFs.promises.realpath).toHaveBeenCalledTimes(1);
      expect(mockedFs.promises.realpath).toHaveBeenCalledWith(
        'path',
        undefined
      );
    });

    test('returns what fs.promises.realpath returns', async () => {
      mockedFs.promises.realpath.mockResolvedValueOnce('realpath');

      const content = await utils.realpath('path');

      expect(content).toEqual('realpath');
    });
  });

  describe('realpathSync', () => {
    test('calls fs.realpathSync', () => {
      utils.realpathSync('path');

      expect(mockedFs.realpathSync).toHaveBeenCalledTimes(1);
      expect(mockedFs.realpathSync).toHaveBeenCalledWith('path', undefined);
    });

    test('returns what fs.realpathSync returns', () => {
      mockedFs.realpathSync.mockReturnValueOnce('realpath');

      const content = utils.realpathSync('path');

      expect(content).toEqual('realpath');
    });
  });
});
