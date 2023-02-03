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
import * as semver from 'semver';
import Builder from './builder';
import LinuxBuilder from './linux';
import MacOSBuilder from './darwin';
import {PythonVersion} from '../inputs';
import WindowsBuilder from './windows';
import cpythonTags from './tags.json';

export default async function getBuilder(
  version: PythonVersion,
  arch: string
): Promise<Builder | null> {
  const specificVersion = await getSpecificVersion(version.version);
  if (specificVersion === null) {
    core.info(
      `Could not resolve version range ${version.version} to any available CPython tag.`
    );
    return null;
  }
  core.info(
    `Version range ${version.version} resolved to ${specificVersion.version}. Source code uri: ${specificVersion.zipBall}`
  );
  switch (process.platform) {
    case 'win32':
      return new WindowsBuilder(specificVersion, arch);
    case 'linux':
      return new LinuxBuilder(specificVersion, arch);
    case 'darwin':
      return new MacOSBuilder(specificVersion, arch);
  }
  return null;
}

async function getSpecificVersion(
  versionRange: string
): Promise<PythonTag | null> {
  const tags: PythonTag[] = cpythonTags;

  let specificVersion: PythonTag | null = null;
  for (const tag of tags) {
    const semverString = semver.valid(tag.version)?.replace('v', '');
    core.debug(`Checking tag ${tag.version}`);
    if (semverString && semver.satisfies(semverString, versionRange)) {
      if (specificVersion === null) {
        specificVersion = {version: semverString, zipBall: tag.zipBall};
      } else if (semver.gte(semverString, specificVersion.version)) {
        specificVersion = {version: semverString, zipBall: tag.zipBall};
      }
    }
  }

  return specificVersion;
}

export type PythonTag = {
  version: string;
  zipBall: string;
};