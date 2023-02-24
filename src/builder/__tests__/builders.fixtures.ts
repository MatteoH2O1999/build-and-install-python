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

import * as exec from '@actions/exec';
import * as io from '@actions/io';
import * as tc from '@actions/tool-cache';
import {PythonTag} from '../factory';
import fs from 'fs';
import {jest} from '@jest/globals';
import os from 'os';
import path from 'path';
import semver from 'semver';
import tags from '../tags.json';

export function getTags(): PythonTag[] {
  const versions: string[] = [];
  const filteredTags: PythonTag[] = [];
  for (const tag of tags) {
    const severVersion = semver.valid(tag.version)?.replace('v', '');
    if (
      severVersion &&
      semver.gte(severVersion, '2.7.0') &&
      !versions.includes(severVersion)
    ) {
      versions.push(severVersion);
      filteredTags.push({version: severVersion, zipBall: tag.zipBall});
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
  const mockedFs = jest.mocked(fs);
  const mockedIo = jest.mocked(io);
  const mockedPath = jest.mocked(path);
  const mockedTc = jest.mocked(tc);
  const mockedOs = jest.mocked(os);

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

  // Mock path implementation

  mockedPath.join.mockImplementation((...paths) => {
    return paths.join(sep);
  });

  // Mock @actions/io implementation

  mockedIo.rmRF.mockImplementation(async inputPath => {
    interactionVector.push(`Recursively remove path ${inputPath}`);
  });
  mockedIo.cp.mockImplementation(async (source, dest, options) => {
    if (!options) {
      options = {};
    }
    interactionVector.push(`Copy folder ${source} to ${dest}`);
  });

  // Mock fs implementation

  mockedFs.symlinkSync.mockImplementation((target, dir, type) => {
    let interaction = `Create symlink in path ${dir} pointing to ${target}`;
    if (type) {
      interaction = interaction.concat(` of type ${type}`);
    }
    interactionVector.push(interaction);
  });
  // @ts-expect-error fs.readdirSync typing is a mess
  mockedFs.readdirSync.mockImplementation((readDir: fs.PathLike) => {
    // TODO
    const baseName = readDir.toString().split(sep).at(-1);
    const tag = zipBall.split('/').at(-1);
    if (baseName === `extracted${tag}`) {
      return ['python-cpython'];
    }
    return [readDir.toString()];
  });
  mockedFs.existsSync.mockImplementation((existPath: fs.PathLike) => {
    // TODO
    return true;
  });

  // Mock @actions/exec implementation

  mockedExec.exec.mockImplementation(async (command, args, options) => {
    if (!args) {
      args = [];
    }
    if (!options) {
      options = {};
    }
    if (options && options.listeners && options.listeners.stdout) {
      options.listeners.stdout(Buffer.from(`${command} ${args.join(' ')}`));
    }
    interactionVector.push(`Execute command "${command} ${args.join(' ')}"`);
    return 0;
  });
}
