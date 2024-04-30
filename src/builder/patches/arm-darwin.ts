// Action to build any Python version on the latest labels and install it into the local tool cache.
// Copyright (C) 2024 Matteo Dell'Acqua
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

import * as utils from '../../utils';
import Patch, {RequirePatch} from './patch';
import path from 'path';

export default class ArmDarwin extends Patch {
  protected override description(): string {
    return 'fix arm arch on darwin';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    const configureFile = await utils.readFile(path.join(baseDir, 'configure'));
    await utils.writeFile(
      path.join(baseDir, 'configure'),
      configureFile.replace(
        /case `\/usr\/bin\/arch` in/g,
        'case `/usr/bin/arch` in\narm64)\nMACOSX_DEFAULT_ARCH="arm64"\n;;'
      )
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [
      {os: 'darwin', version: '2.x.x'},
      {os: 'darwin', version: '3.0.x'},
      {os: 'darwin', version: '3.1.x'},
      {os: 'darwin', version: '3.2.x'},
      {os: 'darwin', version: '3.3.x'},
      {os: 'darwin', version: '3.4.x'},
      {os: 'darwin', version: '3.5.x'},
      {os: 'darwin', version: '3.6.x'}
    ];
  }
}
