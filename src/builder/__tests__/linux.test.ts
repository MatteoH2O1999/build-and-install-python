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

import * as tc from '@actions/tool-cache';
import {archs, getTags, mockToolkit} from './builders.fixtures';
import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import LinuxBuilder from '../linux';

jest.mock('@actions/core');
jest.mock('@actions/cache');
jest.mock('@actions/tool-cache');
jest.mock('@actions/io');
jest.mock('@actions/exec');
jest.mock('path');
jest.mock('os');
jest.mock('../../utils');

const mockedTc = jest.mocked(tc);

let interactions: string[];

describe.each(getTags())(
  'LinuxBuilder for version $version',
  ({version, zipBall}) => {
    beforeEach(async () => {
      interactions = [];
      await mockToolkit(interactions, zipBall, '/');
    });

    test.each(archs)('can be instantiated for arch %s', arch => {
      const builder = new LinuxBuilder({version, zipBall}, arch);

      expect(builder).toBeInstanceOf(LinuxBuilder);
      expect(builder.specificVersion).toEqual(version);
      expect(builder.arch).toEqual(arch);
    });

    test('downloads the sources from the zipball url', async () => {
      const builder = new LinuxBuilder({version, zipBall}, 'x64');

      try {
        await builder.build();
      } catch (error) {
        null;
      }

      expect(mockedTc.downloadTool).toBeCalledWith(zipBall);
    });

    test.each(archs)(
      'has a stable interaction with @actions/toolkit during build for arch %s',
      async arch => {
        const builder = new LinuxBuilder({version, zipBall}, arch);

        try {
          await builder.build();
        } catch (error) {
          let message = error as string;
          if (error instanceof Error) {
            message = error.message;
          }
          interactions.push(`Throw "${message}"`);
        }

        expect(interactions).toMatchSnapshot();
      }
    );

    test.each(archs)(
      'has a stable interaction with @actions/toolkit during postInstall for arch %s',
      async arch => {
        const builder = new LinuxBuilder({version, zipBall}, arch);

        try {
          await builder.postInstall('installPath');
        } catch (error) {
          let message = error as string;
          if (error instanceof Error) {
            message = error.message;
          }
          interactions.push(`Throw "${message}"`);
        }

        expect(interactions).toMatchSnapshot();
      }
    );

    test.each(archs)(
      'identifies the correct additional paths to cache for arch %s',
      async arch => {
        const builder = new LinuxBuilder({version, zipBall}, arch);

        const paths = await builder['additionalCachePaths']();

        expect(paths).toMatchSnapshot();
      }
    );
  }
);
