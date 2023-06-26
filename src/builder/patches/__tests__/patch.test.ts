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

import Patch, {RequirePatch} from '../patch';
import {describe, expect, jest, test} from '@jest/globals';

jest.mock('@actions/core');
jest.mock('@actions/cache');
jest.mock('@actions/tool-cache');
jest.mock('@actions/io');
jest.mock('@actions/exec');

class TestPatch extends Patch {
  readonly calls: string[] = [];
  protected override description(): string {
    return 'test description';
  }

  protected override async applyPatch(baseDir: string): Promise<void> {
    this.calls.push(baseDir);
  }

  protected override async requirePatch(): Promise<RequirePatch[]> {
    return [{os: 'linux', version: '3.5.x'}];
  }
}

describe('Patch class', () => {
  test('calls applyPatch if version included requirePatch array', async () => {
    const instance = new TestPatch();

    await instance.apply('basedir', 'linux', '3.5.6');

    expect(instance.calls.length).toEqual(1);
    expect(instance.calls).toContain('basedir');
  });

  test('does not call applyPatch if version is not included requirePatch array', async () => {
    const instance = new TestPatch();

    await instance.apply('basedir', 'linux', '3.4.6');

    expect(instance.calls.length).toEqual(0);
  });
});
