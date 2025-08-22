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

import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import * as utils from '../../utils';
import {PythonTag} from '../factory';
import findPs from 'find-process';
import {jest} from '@jest/globals';
import os from 'os';
import path from 'path';
import semver from 'semver';
import tags from '../tags.json';
import treesJson from './cpython.trees.json';

const archs = ['x64', 'x86', 'arm64'];
const trees = treesJson as Record<string, string[]>;

function at<T>(this: T[], index: number): T | undefined {
  if (index < 0) {
    index += this.length;
  }
  return this[index];
}

declare global {
  interface Array<T> {
    at(index: number): T | undefined;
  }
}

Array.prototype.at = at;

export {archs};

export function getTags(): PythonTag[] {
  const versions: string[] = [];
  const filteredTags: PythonTag[] = [];
  for (const tag of tags) {
    const semverVersion = semver.valid(tag.version)?.replace('v', '');
    if (
      semverVersion &&
      semver.gte(semverVersion, '2.7.0') &&
      !versions.includes(semverVersion)
    ) {
      versions.push(semverVersion);
      filteredTags.push({version: semverVersion, zipBall: tag.zipBall});
    }
  }
  return filteredTags;
}

export async function mockToolkit(
  interactionVector: string[],
  zipBall: string,
  sep: string
): Promise<void> {
  const mockedExec = jest.mocked(exec);
  const mockedUtils = jest.mocked(utils);
  const mockedIo = jest.mocked(io);
  const mockedPath = jest.mocked(path);
  const mockedTc = jest.mocked(tc);
  const mockedOs = jest.mocked(os);
  const mockedFindPs = jest.mocked(findPs);

  const actualPath: typeof path = jest.requireActual('path');

  // Mock find-process implementation

  mockedFindPs.mockResolvedValue([]);

  // Mock os implementation

  mockedOs.tmpdir.mockReturnValue('tmpDir');

  // Mock @actions/tool-cache implementation

  mockedTc.downloadTool.mockImplementation(async (url, dest, auth, headers) => {
    if (!dest) {
      dest = path.join(
        'defaultDownloadPath',
        url.split('/')[url.split('/').length - 1]
      );
    }
    let interaction = `Download ${url} to ${dest}`;
    if (auth) {
      interaction = interaction.concat(` with auth ${auth}`);
    }
    if (headers) {
      interaction = interaction.concat(` with headers ${headers}`);
    }
    interactionVector.push(interaction);
    return dest;
  });
  mockedTc.extractZip.mockImplementation(async (file, dest) => {
    if (!dest) {
      dest = path.join(
        'defaultExtractedPath',
        `extracted${file.split(sep).at(-1)}`
      );
    }
    interactionVector.push(`Extract ${file} to ${dest}`);
    return dest;
  });
  mockedTc.cacheDir.mockImplementation(
    async (sourceDir, tool, version, arch) => {
      interactionVector.push(
        `Cache source directory ${sourceDir} as tool ${tool} version ${version} for architecture ${arch}`
      );
      return path.join('toolcache', tool, version, arch || 'noarch');
    }
  );

  // Mock path implementation

  mockedPath.join.mockImplementation((...paths) => {
    return paths.join(sep);
  });
  mockedPath.resolve.mockImplementation((...paths) =>
    actualPath.resolve(...paths)
  );
  mockedPath.dirname.mockImplementation(p => {
    return actualPath.dirname(p);
  });

  // Mock @actions/io implementation

  mockedIo.rmRF.mockImplementation(async inputPath => {
    interactionVector.push(`Recursively remove path ${inputPath}`);
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mockedIo.cp.mockImplementation(async (source, dest, _options) => {
    interactionVector.push(`Copy folder ${source} to ${dest}`);
  });
  mockedIo.mkdirP.mockImplementation(async fsPath => {
    interactionVector.push(`Create directory with path ${fsPath}`);
  });

  // Mock fs implementation

  mockedUtils.symlink.mockImplementation(async (target, dir, type) => {
    let interaction = `Create symlink in path ${dir} pointing to ${target}`;
    if (type) {
      interaction = interaction.concat(` of type ${type}`);
    }
    interactionVector.push(interaction);
  });
  mockedUtils.readdir.mockImplementation(async readDir => {
    const baseName = readDir.toString().split(sep).at(-1);
    const tag = zipBall.split('/').at(-1);
    if (baseName === `extracted${tag}`) {
      return ['python-cpython'];
    } else if (readDir.toString().includes('PCbuild\\')) {
      return [`python-${tag}.exe`];
    }
    return [readDir.toString()];
  });
  mockedUtils.exists.mockImplementation(async existPath => {
    if (existPath.toString().endsWith('.exe')) {
      return true;
    }
    if (existPath.toString().startsWith(path.join('tmpDir', 'CPython'))) {
      const tag = zipBall.split('/').at(-1) || '';
      const splitPath = existPath.toString().split(sep);
      const filePath = splitPath.slice(2).join('/');
      return await existCpython(filePath, tag);
    }
    return true;
  });
  mockedUtils.readFile.mockResolvedValue('');
  mockedUtils.realpath.mockImplementation(async p => {
    return p.toString();
  });
  mockedUtils.realpathSync.mockImplementation(p => {
    return p.toString();
  });
  mockedUtils.mktmpdir.mockReturnValue('tmpDir');

  // Mock @actions/exec implementation

  mockedExec.exec.mockImplementation(async (command, args, options) => {
    if (!args) {
      args = [];
    }
    if (!options) {
      options = {};
    }
    if (options.listeners && options.listeners.stdout) {
      options.listeners.stdout(Buffer.from(`${command} ${args.join(' ')}`));
    }
    interactionVector.push(`Execute command "${command} ${args.join(' ')}"`);
    return 0;
  });

  // Mock environment variables

  process.env['RUNNER_TEMP'] = '';
}

async function existCpython(filePath: string, tag: string): Promise<boolean> {
  const tagTree = trees[tag];
  return tagTree.includes(filePath);
}
