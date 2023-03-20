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

type reTest = {
  searchString: string;
  expectedResult: number;
};

const winSdkReTests: reTest[] = [
  {
    expectedResult: -1,
    searchString: '<DefaultWindowsSDKVersion>stuff</DefaultWindowsSDKVersion>'
  },
  {
    expectedResult: -1,
    searchString:
      '<WindowsTargetPlatformVersion><invalid</WindowsTargetPlatformVersion>'
  },
  {
    expectedResult: 1,
    searchString:
      ' <DefaultWindowsSDKVersion>10.0.10586.0</DefaultWindowsSDKVersion>'
  },
  {
    expectedResult: -1,
    searchString:
      '   <DefaultWindowsSDKVersion>$(stuff)</DefaultWindowsSDKVersion>'
  }
];

const toolsetTests: reTest[] = [
  {
    expectedResult: 0,
    searchString: '<PlatformToolset>stuff</PlatformToolset>'
  },
  {
    expectedResult: -1,
    searchString: '<PlatformToolset>>invalid</PlatformToolset>'
  },
  {
    expectedResult: 1,
    searchString: ' <PlatformToolset>v140</PlatformToolset>'
  },
  {
    expectedResult: 3,
    searchString: `   <PlatformToolset Condition="'$(PlatformToolset)' == ''">$(BasePlatformToolset)</PlatformToolset>`
  }
];

export {winSdkReTests, toolsetTests};
