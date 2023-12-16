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

import * as cache from '@actions/cache';
import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as utils from '../../utils';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test
} from '@jest/globals';
import Builder from '../builder';
import {OS} from '../patches';
import {PythonTag} from '../factory';
import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');
jest.mock('@actions/cache');
jest.mock('@actions/tool-cache');
jest.mock('../patches');
jest.mock('../../utils', () => {
  const actualUtils: typeof utils = jest.requireActual('../../utils');
  return {
    ...actualUtils,
    exists: jest.fn(),
    realpath: jest.fn(),
    realpathSync: jest.fn()
  };
});

const mockedIo = jest.mocked(io);
const mockedCache = jest.mocked(cache);
const mockedExec = jest.mocked(exec);
const mockedTc = jest.mocked(tc);
const mockedUtils = jest.mocked(utils);

mockedUtils.realpath.mockImplementation(async p => {
  return p.toString();
});
mockedUtils.realpathSync.mockImplementation(p => {
  return p.toString();
});
mockedUtils.exists.mockImplementation(async p => {
  const actualUtils: typeof utils = jest.requireActual('../../utils');
  return await actualUtils.exists(p);
});

class MockBuilder extends Builder {
  built = false;
  postInstalled = '';

  async build(): Promise<string> {
    this.built = true;
    return 'build/path';
  }

  protected buildSuffix(): string {
    return 'suffix';
  }

  protected CacheKeyOs(): string {
    return 'key';
  }

  protected async additionalCachePaths(): Promise<string[]> {
    return ['additional', 'paths'];
  }

  async postInstall(installedPath: string): Promise<void> {
    this.postInstalled = installedPath;
  }

  protected os(): OS {
    return 'linux';
  }
}

describe('class Builder', () => {
  test('can be instantiated', () => {
    const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};

    const builder = new MockBuilder(tag, 'x64');

    expect(builder).toBeTruthy();
    expect(builder).toBeInstanceOf(Builder);
  });

  describe('constructor', () => {
    test('saves specific version and source code zip ball download link', () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};

      const builder = new MockBuilder(tag, 'x64');

      expect(builder['specificVersion']).toEqual('version');
      expect(builder['tagZipUri']).toEqual('zipballUrl');
    });

    test('cache key is built as "CPython{specific version}{architecture}{cacheKeyOs}"', () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};

      const builder = new MockBuilder(tag, 'x64');

      expect(builder['cacheKey']).toEqual('CPythonversionx64key');
    });

    test('path is build as "os.tempdir/cacheKey"', () => {
      const oldTmpdir = os.tmpdir;
      os.tmpdir = () => {
        return 'tmp';
      };
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};

      const builder = new MockBuilder(tag, 'x64');

      expect(builder['path']).toEqual(path.join('tmp', 'CPythonversionx64key'));

      os.tmpdir = oldTmpdir;
    });
  });

  describe('clean method', () => {
    test('throws an error if path is not defined', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = null;

      await expect(builder.clean()).rejects.toThrowErrorMatchingSnapshot();
    });

    test('throws an error if path does not exist', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'nonExistingPath';

      await expect(builder.clean()).rejects.toThrowErrorMatchingSnapshot();
    });

    test('calls @actions/io.rmRf with the path if the path exists', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      const tmpDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = tmpDir;

      await builder.clean();

      expect(mockedIo.rmRF).toBeCalledTimes(1);
      expect(mockedIo.rmRF).toBeCalledWith(tmpDir);

      fs.rmdirSync(tmpDir);
    });
  });

  describe('restoreCache method', () => {
    test('returns null without doing anything if cache feature is not available', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(false);

      const restored = await builder.restoreCache();

      expect(restored).toBeNull();
      expect(mockedCache.restoreCache).not.toBeCalled();
      expect(builder['restored']).toBe(false);
    });

    test('returns null after trying to restore cache if a cache-miss occurs', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(true);
      mockedCache.restoreCache.mockResolvedValueOnce(undefined);

      const restored = await builder.restoreCache();

      expect(restored).toBeNull();
      expect(mockedCache.restoreCache).toBeCalledTimes(1);
      expect(mockedCache.restoreCache).toBeCalledWith(
        [path.join('srcPath', 'suffix'), 'additional', 'paths'],
        'CPythonversionx64key'
      );
      expect(builder['restored']).toBe(false);
    });

    test('returns the restored built path is a cache-hit occurs', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(true);
      mockedCache.restoreCache.mockResolvedValueOnce('CPythonversionx64key');

      const restored = await builder.restoreCache();

      expect(restored).toEqual(path.join('srcPath', 'suffix'));
      expect(mockedCache.restoreCache).toBeCalledTimes(1);
      expect(mockedCache.restoreCache).toBeCalledWith(
        [path.join('srcPath', 'suffix'), 'additional', 'paths'],
        'CPythonversionx64key'
      );
      expect(builder['restored']).toBe(true);
    });
  });

  describe('saveCache method', () => {
    test('returns null without doing anything if cache feature is not available', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(false);

      await builder.saveCache();

      expect(mockedCache.saveCache).not.toBeCalled();
    });

    test('throws an error after trying to save cache if an error occurs during @actions/cache.saveCache', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(true);
      mockedCache.saveCache.mockRejectedValueOnce(
        new Error('error in saving cache')
      );

      await expect(builder.saveCache()).rejects.toThrowError(
        new Error('error in saving cache')
      );
      expect(mockedCache.saveCache).toBeCalledTimes(1);
      expect(mockedCache.saveCache).toBeCalledWith(
        [path.join('srcPath', 'suffix'), 'additional', 'paths'],
        'CPythonversionx64key'
      );
    });

    test('returns successfully if cache is saved successful', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      //@ts-expect-error force path to be overwritten as it is readonly
      builder['path'] = 'srcPath';
      mockedCache.isFeatureAvailable.mockReturnValueOnce(true);

      await builder.saveCache();

      expect(mockedCache.saveCache).toBeCalledTimes(1);
      expect(mockedCache.saveCache).toBeCalledWith(
        [path.join('srcPath', 'suffix'), 'additional', 'paths'],
        'CPythonversionx64key'
      );
    });
  });

  describe('prepareSources method', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
      fs.mkdirSync(path.join(tempDir, 'python-cpython'));
    });

    afterEach(() => {
      fs.rmSync(tempDir, {recursive: true});
    });

    test('downloads sources from zipBallUrl', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      try {
        await builder['prepareSources']();
      } catch (error) {
        /* nop */
      }

      expect(mockedTc.downloadTool).toBeCalledWith('zipballUrl');
    });

    test('extracts downloaded sources', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      try {
        await builder['prepareSources']();
      } catch (error) {
        /* nop */
      }

      expect(mockedTc.extractZip).toBeCalledWith('downloadPath');
    });

    test('removes downloaded zipBall', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      try {
        await builder['prepareSources']();
      } catch (error) {
        /* nop */
      }

      expect(mockedIo.rmRF).toBeCalledWith('downloadPath');
    });

    test('throws an error if the extracted folder has more than 1 subfolders', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);
      fs.mkdirSync(path.join(tempDir, 'otherFolder'));

      await expect(
        builder['prepareSources']()
      ).rejects.toThrowErrorMatchingSnapshot();
    });

    test('throws an error if the extracted folder does not have a subfolder starting with "python-cpython"', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);
      fs.mkdirSync(path.join(tempDir, 'otherFolder'));
      fs.rmdirSync(path.join(tempDir, 'python-cpython'));

      await expect(
        builder['prepareSources']()
      ).rejects.toThrowErrorMatchingSnapshot();
    });

    test('copies the extracted sources to the work directory', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      await builder['prepareSources']();

      expect(mockedIo.cp).toBeCalledWith(
        path.join(tempDir, 'python-cpython'),
        path.join(os.tmpdir(), 'CPythonversionx64key'),
        {copySourceDirectory: false, recursive: true}
      );
    });

    test('removes extracted folder', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      await builder['prepareSources']();

      expect(mockedIo.rmRF).toBeCalledWith(tempDir);
    });

    test('returns successfully if folder structure is correct', async () => {
      const tag: PythonTag = {version: 'version', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedTc.downloadTool.mockResolvedValueOnce('downloadPath');
      mockedTc.extractZip.mockResolvedValueOnce(tempDir);

      await builder['prepareSources']();
    });
  });

  describe('initPip method', () => {
    let tempDir: string;
    let exePath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
      exePath = path.join(
        tempDir,
        process.platform === 'win32' ? 'python.exe' : 'python'
      );
      fs.writeFileSync(exePath, 'exe');
    });

    afterEach(() => {
      fs.rmSync(tempDir, {recursive: true});
    });

    test('Checks if path/python exists', async () => {
      const tag: PythonTag = {version: '3.5.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');

      await builder.initPip(tempDir);

      expect(mockedUtils.exists).toBeCalledTimes(1);
      expect(mockedUtils.exists).toBeCalledWith(exePath);
    });

    test('Fails if python executable does not exist', async () => {
      const tag: PythonTag = {version: '3.5.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');

      await expect(builder.initPip('installedDir')).rejects.toThrowError();
    });

    test('Calls ensurepip and returns if success', async () => {
      const tag: PythonTag = {version: '3.5.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedExec.exec.mockResolvedValueOnce(0);

      await builder.initPip(tempDir);

      expect(mockedExec.exec).toBeCalledTimes(2);
      expect(mockedExec.exec.mock.calls[0][0]).toEqual(
        `${exePath} -m ensurepip`
      );
      expect(mockedExec.exec.mock.calls[1][0]).toEqual(
        `${exePath} -m pip install --upgrade pip`
      );
    });

    test('Calls get_pip.py if ensurepip fails', async () => {
      const tag: PythonTag = {version: '3.5.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedExec.exec.mockRejectedValueOnce(new Error('ensurepip failed'));
      mockedExec.exec.mockResolvedValueOnce(0);
      mockedTc.downloadTool.mockResolvedValueOnce('get_pip.py');

      await builder.initPip(tempDir);

      expect(mockedExec.exec).toBeCalledTimes(2);
      expect(mockedExec.exec.mock.calls[0][0]).toEqual(
        `${exePath} -m ensurepip`
      );
      expect(mockedExec.exec.mock.calls[1][0]).toEqual(`${exePath} get_pip.py`);
      expect(mockedTc.downloadTool).toBeCalledTimes(1);
      expect(mockedTc.downloadTool.mock.calls[0][0]).toEqual(
        'https://bootstrap.pypa.io/pip/3.5/get-pip.py'
      );
    });

    test('Fails if get_pip.py fails and Python version >= 3.2', async () => {
      const tag: PythonTag = {version: '3.5.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedExec.exec.mockRejectedValueOnce(new Error('ensurepip failed'));
      mockedExec.exec.mockRejectedValueOnce(new Error('get_pip.py failed'));
      mockedTc.downloadTool.mockResolvedValueOnce('get_pip.py');

      await expect(
        builder.initPip(tempDir)
      ).rejects.toThrowErrorMatchingSnapshot();
      mockedExec.exec.mockReset();
    });

    test('Does nothing if get_pip.py fails and Python version < 3.2', async () => {
      const tag: PythonTag = {version: '3.1.2', zipBall: 'zipballUrl'};
      const builder = new MockBuilder(tag, 'x64');
      mockedExec.exec.mockRejectedValueOnce(new Error('ensurepip failed'));
      mockedExec.exec.mockRejectedValueOnce(new Error('get_pip.py failed'));
      mockedTc.downloadTool.mockResolvedValueOnce('get_pip.py');

      await builder.initPip(tempDir);

      expect(mockedExec.exec).toBeCalledTimes(2);
      expect(mockedExec.exec.mock.calls[0][0]).toEqual(
        `${exePath} -m ensurepip`
      );
      expect(mockedExec.exec.mock.calls[1][0]).toEqual(`${exePath} get_pip.py`);
      expect(mockedTc.downloadTool).toBeCalledTimes(1);
      expect(mockedTc.downloadTool.mock.calls[0][0]).toEqual(
        'https://bootstrap.pypa.io/pip/3.2/get-pip.py'
      );
    });
  });
});
