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
import {SetupPythonResult, getSetupPythonResult, isPyPy} from './version';
import {OutputNames} from './constants';

export default async function main(): Promise<void> {
  let inputs: ActionInputs;
  let setupPythonResult: SetupPythonResult;

  core.debug('Parsing inputs...');
  try {
    inputs = await parseInputs();
  } catch (error) {
    core.setOutput(OutputNames.PYTHON_VERSION, '');
    core.setOutput(OutputNames.ARCHITECTURE, '');
    let message = 'Error while parsing inputs.';
    if (error instanceof Error) {
      message = message.concat('\n').concat(error.message);
    }
    core.setFailed(message);
    return;
  }
  core.debug('Inputs successfully parsed.');

  core.debug(
    `Requested python version: ${inputs.version.type} ${inputs.version.version}`
  );
  core.debug(`Requested architecture: ${inputs.architecture}`);
  core.debug(`Requested build cache: ${inputs.cache}`);
  core.debug(
    `Requested behavior for deprecated builds: ${inputs.buildBehavior}`
  );

  core.setOutput(OutputNames.ARCHITECTURE, inputs.architecture);

  core.debug('Resolving setup-python version...');
  try {
    setupPythonResult = await getSetupPythonResult(inputs);
  } catch (error) {
    let version = '';
    if (isPyPy(inputs.version)) {
      version = 'pypy';
    }
    core.setOutput(
      OutputNames.PYTHON_VERSION,
      version.concat(inputs.version.version)
    );
    let message = 'Error while resolving setup-python version.';
    if (error instanceof Error) {
      message = message.concat('\n').concat(error.message);
    }
    core.setFailed(message);
    return;
  }
  core.debug('setup-python version resolved.');

  if (setupPythonResult.success) {
    if (isPyPy(inputs.version)) {
      core.info(
        `PyPy version ${inputs.version.version} is supported by actions/setup-python.`
      );
    } else {
      core.info(
        `CPython version ${inputs.version.version} is supported by actions/setup-python.`
      );
    }
    core.setOutput(OutputNames.PYTHON_VERSION, setupPythonResult.version);
    return;
  } else {
    if (isPyPy(inputs.version)) {
      core.info(
        `PyPy version ${inputs.version.version} is not supported by actions/setup-python.`
      );
      core.setFailed('This action does not support building PyPy from source');
      core.setOutput(OutputNames.PYTHON_VERSION, '');
      return;
    }
    core.info(
      `CPython version ${inputs.version.version} is not supported by actions/setup-python.`
    );
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
