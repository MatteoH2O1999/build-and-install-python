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
import * as index from '../index';
import {expect, test} from '@jest/globals';
import defaultIndex from '../index';

test('default export is getBuilder', () => {
  expect(index.getBuilder).toBe(defaultIndex);
  expect(index.default).toBe(defaultIndex);
});

test('index contains Builder type', () => {
  expect(index.Builder).toBeTruthy();
  expect(index.Builder.name).toBe('Builder');
  expect(Object.getOwnPropertyNames(index.Builder.prototype)).toContain(
    'clean'
  );
  expect(Object.getOwnPropertyNames(index.Builder.prototype)).toContain(
    'restoreCache'
  );
  expect(Object.getOwnPropertyNames(index.Builder.prototype)).toContain(
    'saveCache'
  );
});
