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

import * as utils from '../../utils';
import Patch, {RequirePatch} from './patch';
import path from 'path';

export default class PlatformTriplet extends Patch {
  protected override description(): string {
    return 'fix platform triplet in configure file';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    const configureFile = await utils.readFile(path.join(baseDir, 'configure'));
    await utils.writeFile(
      path.join(baseDir, 'configure'),
      configureFile
        .replace('\nMULTIARCH=$($CC --print-multiarch 2>/dev/null)', '\n')
        .replace(
          'if test x$PLATFORM_TRIPLET != x && test x$MULTIARCH != x; then',
          [
            'if test x$PLATFORM_TRIPLET != xdarwin; then',
            '  MULTIARCH=$($CC --print-multiarch 2>/dev/null)',
            'fi',
            'if test x$PLATFORM_TRIPLET != x && test x$MULTIARCH != x; then'
          ].join('\n')
        )
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [
      {os: 'darwin', version: '3.5.x'},
      {os: 'darwin', version: '3.6.x'},
      {os: 'darwin', version: '3.7.x'}
    ];
  }
}
