// Action to build any Python version on the latest labels and install it into the local tool cache.
// Copyright (C) 2025 Matteo Dell'Acqua
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
import {InputNames, OutputNames, toolName} from './constants';
import {
  SetupPythonResult,
  getSetupPythonResult,
  isCpython,
  isGraalPy,
  isPyPy
} from './version';
import {emitWarnings} from './label';
import getBuilder from './builder';

export default async function main(): Promise<void> {
  // Emit relevant warnings
  await emitWarnings();

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
      if (error.stack) {
        core.info(error.stack);
      }
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
    core.setOutput(OutputNames.PYTHON_VERSION, inputs.version.version);
    let message = 'Error while resolving setup-python version.';
    if (error instanceof Error) {
      message = message.concat('\n').concat(error.message);
      if (error.stack) {
        core.info(error.stack);
      }
    }
    core.setFailed(message);
    return;
  }
  core.debug('setup-python version resolved.');

  // PyPy and GraalPy are delegated to actions/setup-python

  if (!(await isCpython(inputs.version))) {
    if (await isGraalPy(inputs.version)) {
      core.info('GraalPy support is delegated to actions/setup-python...');
    } else if (await isPyPy(inputs.version)) {
      core.info('PyPy support is delegated to actions/setup-python...');
    }
    core.setOutput(OutputNames.PYTHON_VERSION, inputs.version.version);
    return;
  }

  if (
    setupPythonResult.success &&
    inputs.buildBehavior !== BuildBehavior.Force
  ) {
    // actions/setup-python already supports the version: doing nothing

    core.info(
      `CPython version ${inputs.version.version} is supported by actions/setup-python with specific version ${setupPythonResult.version}.`
    );
    core.setOutput(OutputNames.PYTHON_VERSION, setupPythonResult.version);
    core.setOutput(OutputNames.FREETHREADED, setupPythonResult.freethreaded);
    return;
  } else {
    if (!setupPythonResult.success) {
      core.info(
        `CPython version ${inputs.version.version} is not supported by actions/setup-python.`
      );
    }

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
      case BuildBehavior.Force:
        core.info(
          `CPython version ${inputs.version.version} will be built from source regardless of actions/setup-python support.`
        );
        break;
    }

    // Create builder

    core.debug('Creating builder...');
    const builder = await getBuilder(inputs.version, inputs.architecture);
    core.debug('Builder created...');

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
        core.debug('Restoring cache...');
        buildPath = await builder.restoreCache();
      } catch (error) {
        let message = 'Error while restoring cache.';
        if (error instanceof Error) {
          message = message.concat('\n').concat(error.message);
          if (error.stack) {
            core.info(error.stack);
          }
        }
        core.setFailed(message);
        return;
      }
    }

    if (buildPath === null) {
      // Cache miss or not used

      try {
        core.debug('Beginning build process...');
        buildPath = await builder.build();
        core.debug('Build complete.');
      } catch (error) {
        let message = 'Error while building Python.';
        if (error instanceof Error) {
          message = message.concat('\n').concat(error.message);
          if (error.stack) {
            core.info(error.stack);
          }
        }
        core.setFailed(message);
        return;
      }

      // Save cache

      if (inputs.cache) {
        try {
          core.debug('Saving cache...');
          await builder.saveCache();
          core.debug('Cache saved.');
        } catch (error) {
          let message = 'Error while saving cache.';
          if (error instanceof Error) {
            message = message.concat('\n').concat(error.message);
            if (error.stack) {
              core.info(error.stack);
            }
          }
          core.setFailed(message);
          return;
        }
      }
    }

    // Install in tool cache

    core.info('Copying built folder into tool cache.');
    const installedPath = await tc.cacheDir(
      buildPath,
      toolName,
      builder.specificVersion,
      builder.freethreaded ? builder.arch + '-freethreaded' : builder.arch
    );
    core.info(
      `CPython ${builder.specificVersion} for arch ${builder.arch} successfully installed.`
    );

    // Perform post install operations

    try {
      core.debug('Performing post-install operations...');
      await builder.postInstall(installedPath);
      core.debug('Post-install operations done');
    } catch (error) {
      let message = 'Error during post-install operations.';
      if (error instanceof Error) {
        message = message.concat('\n').concat(error.message);
        if (error.stack) {
          core.info(error.stack);
        }
      }
      core.setFailed(message);
      return;
    }

    // Initialize pip

    try {
      core.debug('Initializing pip...');
      await builder.initPip(installedPath);
      core.debug('Pip initialized');
    } catch (error) {
      let message = 'Error during pip initialization.';
      if (error instanceof Error) {
        message = message.concat('\n').concat(error.message);
        if (error.stack) {
          core.info(error.stack);
        }
      }
      core.setFailed(message);
      return;
    }

    // Clean build folder

    await builder.clean();
    core.setOutput(OutputNames.PYTHON_VERSION, builder.specificVersion);
    return;
  }
}
