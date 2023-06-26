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

export default class ExternalsSvn extends Patch {
  protected override description(): string {
    return 'fix getting external dependencies from svn';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    const externalsPcBuild = path.join(baseDir, 'PCbuild', 'get_externals.bat');
    const externalsPcBuildContent = await utils.readFile(externalsPcBuild);
    await utils.writeFile(
      externalsPcBuild,
      externalsPcBuildContent
        .replace(/svn /g, 'git svn ')
        .replace(/export/g, 'clone')
        .replace(/svn co /g, 'svn clone ')
        .replace(/http/g, 'https')
    );
    const externalsMsi = path.join(
      baseDir,
      'Tools',
      'msi',
      'get_externals.bat'
    );
    const externalsMsiContent = await utils.readFile(externalsMsi);
    await utils.writeFile(
      externalsMsi,
      externalsMsiContent
        .replace(/svn /g, 'git svn ')
        .replace(/export/g, 'clone')
        .replace(/svn co /g, 'svn clone ')
        .replace(/http/g, 'https')
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [{os: 'windows', version: '3.5.x'}];
  }
}
