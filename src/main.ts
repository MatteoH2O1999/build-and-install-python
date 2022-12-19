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
import {ActionInputs, parseInputs} from './inputs';
import {OutputNames} from './constants';

export default async function main(): Promise<void> {
  let inputs: ActionInputs;
  try {
    inputs = await parseInputs();
  } catch (error) {
    core.setOutput(OutputNames.PYTHON_VERSION, '');
    let message = 'Error while parsing inputs.';
    if (error instanceof Error) {
      message = message.concat('\n').concat(error.message);
    }
    core.setFailed(message);
    return;
  }

  core.info(
    `Requested python version: ${inputs.version.type} ${inputs.version.version}`
  );
  core.info(`Requested architecture: ${inputs.architecture}`);
  core.info(`Requested build cache: ${inputs.cache}`);
  core.info(
    `Requested behavior for deprecated builds: ${inputs.buildBehavior}`
  );

  //Temp output
  core.setOutput(OutputNames.PYTHON_VERSION, inputs.version.version);
}
