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
import * as tc from '@actions/tool-cache';
import {ActionInputs, BuildBehavior, parseInputs} from './inputs';
import {InputNames, OutputNames} from './constants';
import {SetupPythonResult, getSetupPythonResult, isPyPy} from './version';
import getBuilder from './builder';

export default async function main(): Promise<void> {
  let inputs: ActionInputs;
  let setupPythonResult: SetupPythonResult;

  // Input parsing

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

  // Checking if actions/setup-python fails

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
    // actions/setup-python already supports the version: doing nothing

    if (isPyPy(inputs.version)) {
      core.info(
        `PyPy version ${inputs.version.version} is supported by actions/setup-python with specific version ${setupPythonResult.version}.`
      );
    } else {
      core.info(
        `CPython version ${inputs.version.version} is supported by actions/setup-python with specific version ${setupPythonResult.version}.`
      );
    }
    core.setOutput(OutputNames.PYTHON_VERSION, setupPythonResult.version);
    return;
  } else {
    if (isPyPy(inputs.version)) {
      // This action does not support building PyPy

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

    // Apply inputs.buildBehavior

    switch (inputs.buildBehavior) {
      case BuildBehavior.Error:
        core.info(
          'Requested behavior for deprecated builds: error. Failing...'
        );
        core.setFailed(
          `CPython version ${inputs.version.version} is not supported by actions/setup-python.
          If you wish for this action to build CPython ${inputs.version.version} from source set input "${InputNames.ALLOW_BUILD}" to
          either "${BuildBehavior.Warn}", "${BuildBehavior.Info}" or "${BuildBehavior.Allow}".`
        );
        return;
      case BuildBehavior.Warn:
        core.warning(
          `CPython version ${inputs.version.version} is not supported by actions/setup-python.
          This probably means you are using a deprecated version. If this is not the case, you may suppress the warning setting input "${InputNames.ALLOW_BUILD}"
          to either "${BuildBehavior.Info}" or "${BuildBehavior.Allow}".`
        );
        break;
      case BuildBehavior.Info:
        core.info(
          `CPython version ${inputs.version.version} will be built from source.`
        );
        break;
      case BuildBehavior.Allow:
        core.debug(
          `CPython version ${inputs.version.version} will be built from source.`
        );
        break;
    }

    // Create builder

    const builder = await getBuilder(
      inputs.version,
      inputs.architecture,
      inputs.token
    );

    // If builder is null, the version cannot be built from source

    if (builder === null) {
      core.setFailed(
        `CPython version ${inputs.version.version} cannot be built from source.`
      );
      return;
    }

    let buildPath: string | null = null;

    // Try to restore cache

    if (inputs.cache) {
      try {
        buildPath = await builder.restoreCache();
      } catch (error) {
        const message = 'Error while restoring cache.';
        if (error instanceof Error) {
          message.concat('\n').concat(error.message);
        }
        core.setFailed(message);
        return;
      }
    }

    if (buildPath != null) {
      // Cache-hit
      core.info('Cache-hit. Copying already built version to tool cache');
      await tc.cacheDir(
        buildPath,
        'Python',
        builder.specificVersion,
        builder.arch
      );
      core.info(
        `CPython ${builder.specificVersion} for arch ${builder.arch} successfully installed.`
      );
      core.setOutput(OutputNames.PYTHON_VERSION, builder.specificVersion);
      await builder.clean();
      return;
    }

    // Cache miss or not used

    try {
      buildPath = await builder.build();
    } catch (error) {
      const message = 'Error while building Python.';
      if (error instanceof Error) {
        message.concat('\n').concat(error.message);
      }
      core.setFailed(message);
      return;
    }

    // Save cache

    if (inputs.cache) {
      try {
        await builder.saveCache();
      } catch (error) {
        const message = 'Error while saving cache.';
        if (error instanceof Error) {
          message.concat('\n').concat(error.message);
        }
        core.setFailed(message);
        return;
      }
    }

    // Install in tool cache and clean build folder

    core.info('Copying built folder into tool cache.');
    await tc.cacheDir(
      buildPath,
      'Python',
      builder.specificVersion,
      builder.arch
    );
    core.info(
      `CPython ${builder.specificVersion} for arch ${builder.arch} successfully installed.`
    );
    await builder.clean();
    core.setOutput(OutputNames.PYTHON_VERSION, builder.specificVersion);
    return;
  }
}
