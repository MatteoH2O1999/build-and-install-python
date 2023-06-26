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

export default class BootstrapperWix extends Patch {
  protected override description(): string {
    return 'fix wix library directories for MSVC > 140';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    const fixedWixLine =
      '<AdditionalLibraryDirectories Condition="$(PlatformToolset.StartsWith(`v14`))">$(WixInstallPath)sdk\\vs2017\\lib\\x86</AdditionalLibraryDirectories>';
    const bootstrapper = path.join(
      baseDir,
      'Tools',
      'msi',
      'bundle',
      'bootstrap',
      'pythonba.vcxproj'
    );
    const bootstrapperContent = await utils.readFile(bootstrapper);
    await utils.writeFile(
      bootstrapper,
      bootstrapperContent.replace(
        '</AdditionalDependencies>',
        `</AdditionalDependencies>${fixedWixLine}`
      )
    );
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [
      {os: 'windows', version: '3.5.x'},
      {os: 'windows', version: '3.6.x'},
      {os: 'windows', version: '3.7.x'},
      {os: 'windows', version: '3.8.x'},
      {os: 'windows', version: '3.9.x'},
      {os: 'windows', version: '3.10.x'},
      {os: 'windows', version: '3.11.x'},
      {os: 'windows', version: '3.12.x'}
    ];
  }
}
