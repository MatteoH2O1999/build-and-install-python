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

import {Abortable} from 'node:events';
import fs from 'fs';

export async function readdir(
  path: fs.PathLike,
  options?:
    | (fs.ObjectEncodingOptions & {withFileTypes?: false | undefined})
    | BufferEncoding
    | null
): Promise<string[]> {
  return await fs.promises.readdir(path, options);
}

export async function exists(path: fs.PathLike): Promise<boolean> {
  return fs.existsSync(path);
}

export async function symlink(
  target: fs.PathLike,
  path: fs.PathLike,
  type?: string | null | undefined
): Promise<void> {
  return await fs.promises.symlink(target, path, type);
}

export async function readFile(
  path: fs.PathLike | fs.promises.FileHandle,
  options?:
    | ({
        encoding: BufferEncoding;
        flag?: fs.OpenMode | undefined;
      } & Abortable)
    | BufferEncoding
): Promise<string> {
  const content = await fs.promises.readFile(path, options);
  if (content instanceof Buffer) {
    return content.toString();
  }
  return content;
}

export async function writeFile(
  file: fs.PathLike,
  data: string
): Promise<void> {
  return await fs.promises.writeFile(file, data);
}

export async function realpath(
  path: fs.PathLike,
  options?: BufferEncoding | fs.ObjectEncodingOptions | null
): Promise<string> {
  return await fs.promises.realpath(path, options);
}

export function realpathSync(
  path: fs.PathLike,
  options?: fs.EncodingOption
): string {
  return fs.realpathSync(path, options);
}
