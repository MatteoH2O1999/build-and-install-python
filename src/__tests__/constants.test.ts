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

import * as constants from '../constants';
import {describe, expect, test} from '@jest/globals';
import {toolsetTests, winSdkReTests} from './constants.fixtures';

describe('Windows SDK Regex', () => {
  test.each(winSdkReTests)(
    `returns index $expectedResult when rearching string "$searchString"`,
    ({searchString, expectedResult}) => {
      expect(searchString.search(constants.winSdkRe)).toEqual(expectedResult);
    }
  );
});

describe('Visual Studio toolset version Regex', () => {
  test.each(toolsetTests)(
    `returns index $expectedResult when rearching string "$searchString"`,
    ({searchString, expectedResult}) => {
      expect(searchString.search(constants.toolsetRe)).toEqual(expectedResult);
    }
  );
});

describe('Windows SDK replacement function', () => {
  test('returns the correct XML line with its argument as text', () => {
    const stuff = 'stuff';
    const expected =
      '<DefaultWindowsSDKVersion>stuff</DefaultWindowsSDKVersion>';

    const actual = constants.winSdkVersion(stuff);

    expect(actual).toEqual(expected);
  });
});

describe('Visual Studio toolset version replacement function', () => {
  test('returns the correct XML line with its argument as text', () => {
    const stuff = 'stuff';
    const expected = '<PlatformToolset>stuff</PlatformToolset>';

    const actual = constants.toolsetVersion(stuff);

    expect(actual).toEqual(expected);
  });
});
