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
import * as utils from '../../utils';
import Patch, {RequirePatch} from './patch';
import path from 'path';

export default class H2PYHeaders extends Patch {
  protected override description(): string {
    return 'add missing headers in Tools/scripts/h2py.py';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    let headerPath = '';
    await exec.exec('xcrun --sdk macosx --show-sdk-path', [], {
      listeners: {
        stdout: (buffer: Buffer) => {
          headerPath = headerPath.concat(buffer.toString());
        }
      },
      silent: true
    });
    headerPath = headerPath.trim();
    const h2py = (
      await utils.readFile(path.join(baseDir, 'Tools', 'scripts', 'h2py.py'))
    )
      .toString()
      .replace(
        "fp = open(filename, 'r')",
        `filename=filename.replace('/usr/lib', '${headerPath}/usr/lib').replace('/usr/include', '${headerPath}/usr/include');fp=open(filename, 'r')`
      );
    await utils.writeFile(
      path.join(baseDir, 'Tools', 'scripts', 'h2py.py'),
      h2py
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [{os: 'darwin', version: '3.0.x'}];
  }
}
