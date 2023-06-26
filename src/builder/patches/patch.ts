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
import semver from 'semver';

export type OS = 'windows' | 'linux' | 'darwin';
export type RequirePatch = {
  version: string;
  os: OS;
};

export default abstract class Patch {
  protected abstract applyPatch(baseDir: string): Promise<void>;
  protected abstract requirePatch(): Promise<RequirePatch[]>;
  protected abstract description(): string;

  async apply(
    baseRepoDirectory: string,
    os: OS,
    version: string
  ): Promise<void> {
    const versionsRequiringPatch = await this.requirePatch();
    for (const versionRequiringPatch of versionsRequiringPatch) {
      if (
        semver.satisfies(version, versionRequiringPatch.version) &&
        os === versionRequiringPatch.os
      ) {
        core.info(`Applying patch to ${this.description()}...`);
        await this.applyPatch(baseRepoDirectory);
        core.info('Patch applied successfully');
        return;
      }
    }
    core.info(`Skipping patch to ${this.description()}...`);
  }
}
