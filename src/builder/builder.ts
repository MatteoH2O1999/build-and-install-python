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

import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as utils from '../utils';
import {PythonTag} from './factory';
import os from 'os';
import path from 'path';

export default abstract class Builder {
  readonly specificVersion: string;
  readonly arch: string;
  private readonly cacheKey: string;
  protected readonly tagZipUri: string;
  protected readonly path: string;
  protected restored = false;

  constructor(specificVersion: PythonTag, arch: string) {
    this.specificVersion = specificVersion.version;
    this.tagZipUri = specificVersion.zipBall;
    this.arch = arch;
    this.cacheKey = `CPython${this.specificVersion}${
      this.arch
    }${this.CacheKeyOs()}`;
    this.path = path.join(os.tmpdir(), this.cacheKey);
    core.debug(`Builder cache key: ${this.cacheKey}`);
    core.debug(`Builder path: ${this.path}`);
  }

  async clean(): Promise<void> {
    if (!this.path) {
      throw new Error('Base dir is not set.');
    }
    if (!(await utils.exists(this.path))) {
      throw new Error(`Cannot clear ${this.path} as it does not exist.`);
    }
    core.info('Removing temporary build directories...');
    await io.rmRF(this.path);
    core.info('Build directories successfully removed.');
  }

  abstract build(): Promise<string>;

  protected abstract buildSuffix(): string;

  protected abstract CacheKeyOs(): string;

  protected abstract additionalCachePaths(): Promise<string[]>;

  abstract postInstall(installedPath: string): Promise<void>;

  async restoreCache(): Promise<string | null> {
    core.startGroup('Trying to use cached built version');
    if (!cache.isFeatureAvailable()) {
      core.info('Cache feature is not available on current runner.');
      core.endGroup();
      return null;
    }
    const restoredPath = path.join(this.path, this.buildSuffix());
    const restoredPaths = [restoredPath];
    const additionalPaths = await this.additionalCachePaths();
    if (additionalPaths.length > 0) {
      restoredPaths.push(...additionalPaths);
    }
    core.info(`Restoring cached version with key ${this.cacheKey}...`);
    core.debug(`Restoring paths ${restoredPaths}`);
    const restoredKey = await cache.restoreCache(restoredPaths, this.cacheKey);
    if (restoredKey === undefined) {
      core.info('Cached version not found.');
      core.endGroup();
      return null;
    }
    core.info(`CPython ${this.specificVersion} restored from cache.`);
    core.endGroup();
    this.restored = true;
    return restoredPath;
  }

  async saveCache(): Promise<void> {
    core.startGroup('Caching built files');
    if (!cache.isFeatureAvailable()) {
      core.info('Cache feature is not available on current runner.');
      core.endGroup();
      return;
    }
    core.info(`Saving built files with key ${this.cacheKey}...`);
    const savePath = path.join(this.path, this.buildSuffix());
    const savePaths = [savePath];
    const additionalPaths = await this.additionalCachePaths();
    if (additionalPaths.length > 0) {
      savePaths.push(...additionalPaths);
    }
    core.debug(`Saving paths: ${savePaths}`);
    await cache.saveCache(savePaths, this.cacheKey);
    core.info('Files successfully saved in cache.');
    core.endGroup();
  }

  protected async prepareSources(): Promise<void> {
    core.startGroup('Preparing sources');

    core.info('Downloading source zipBall...');
    core.info(`Zipball uri: ${this.tagZipUri}`);
    const zipPath = await tc.downloadTool(this.tagZipUri);

    core.info('Extracting zip...');
    const sourcePath = await tc.extractZip(zipPath);

    core.info('Removing source zip...');
    await io.rmRF(zipPath);

    const dirNames = await utils.readdir(sourcePath);
    if (dirNames.length !== 1) {
      throw new Error(`Expected only one folder. Got ${dirNames}`);
    }
    const dirName = dirNames[0];
    if (!dirName.startsWith('python-cpython')) {
      throw new Error(
        `Expected directory to start with "python-cpython...", got ${dirName}`
      );
    }
    const sources = path.join(sourcePath, dirName);
    core.debug(`Sources extracted in ${sources}`);

    core.info('Moving sources to base directory...');
    await io.cp(sources, this.path, {
      copySourceDirectory: false,
      recursive: true
    });
    await io.rmRF(sourcePath);
    core.endGroup();
  }
}
