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

import * as core from '@actions/core';
import {getOSInfo} from 'setup-python/src/utils';
import {testedLabels} from './constants';

export async function emitWarnings(): Promise<void> {
  const osInfo = await getOSInfo();
  if (osInfo === undefined) {
    core.debug(
      'Impossible to gather information about current platform. Emitting no warnings...'
    );
    return;
  }
  const platform = osInfo.osName.toLowerCase();
  const version =
    platform === 'macos' ? osInfo.osVersion.split('.')[0] : osInfo.osVersion;
  const label = `${platform}-${version}`;
  core.debug(`Detected label: "${label}"`);
  if (!testedLabels.includes(label)) {
    core.warning(
      `This action has been tested with labels ${testedLabels.join(
        ', '
      )}. Detected label: ${label}. Action is not guaranteed to work`
    );
  }
}
