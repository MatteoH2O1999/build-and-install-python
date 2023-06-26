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

export default class TCLTKExternalVersion extends Patch {
  protected override description(): string {
    return 'update tcl/tk version for Python < 3.7';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    const externalsPcBuild = path.join(baseDir, 'PCbuild', 'get_externals.bat');
    const fileContent = await utils.readFile(externalsPcBuild);
    await utils.writeFile(
      externalsPcBuild,
      fileContent
        .replace(/ tk-[0-9.]+/, ' tk-8.6.10.0')
        .replace(/ tcl-core-[0-9.]+/, ' tcl-core-8.6.10.0')
    );
    const tkProps = path.join(baseDir, 'PCbuild', 'tcltk.props');
    const tkPropsContent = await utils.readFile(tkProps);
    await utils.writeFile(
      tkProps,
      tkPropsContent.replace(
        /<TclPatchLevel>[0-9]+<\/TclPatchLevel>/,
        '<TclPatchLevel>10</TclPatchLevel>'
      )
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [
      {os: 'windows', version: '3.6.x'},
      {os: 'windows', version: '3.5.x'}
    ];
  }
}
