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

import {ActionInputs, BuildBehavior, PythonVersion} from '../inputs';
import {defaultPyPy2, defaultPyPy3} from '../constants';
import {SetupPythonResult} from '../version';

export type IsPyPyTest = {
  pythonVersion: PythonVersion;
  expectedPyPy: boolean;
};

const PyPyTest: IsPyPyTest[] = [
  {
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy3.9')
  },
  {
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy3')
  },
  {
    expectedPyPy: false,
    pythonVersion: new PythonVersion('3.9')
  },
  {
    expectedPyPy: false,
    pythonVersion: new PythonVersion('')
  },
  {
    expectedPyPy: false,
    pythonVersion: new PythonVersion('2')
  },
  {
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy-3.5')
  },
  {
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypyx')
  }
];

export {PyPyTest};

export type SetupPythonResultTest = {
  inputs: ActionInputs;
  expectedResult: {
    linux: SetupPythonResult;
    win32: SetupPythonResult;
    darwin: SetupPythonResult;
  };
};

const SetupPythonTests: SetupPythonResultTest[] = [
  {
    expectedResult: {
      darwin: {
        success: true,
        version: '2.7.18'
      },
      linux: {
        success: true,
        version: '2.7.18'
      },
      win32: {
        success: true,
        version: '2.7.18'
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('2.7')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: '2.7.18'
      },
      linux: {
        success: true,
        version: '2.7.18'
      },
      win32: {
        success: true,
        version: '2.7.18'
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('2.7.18')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: '3.6.15'
      },
      linux: {
        success: false,
        version: ''
      },
      win32: {
        success: true,
        version: '3.6.8'
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('3.6')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: '3.6.7'
      },
      linux: {
        success: false,
        version: ''
      },
      win32: {
        success: true,
        version: '3.6.7'
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('3.6.7')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: 'pypy3.9'
      },
      linux: {
        success: true,
        version: 'pypy3.9'
      },
      win32: {
        success: true,
        version: 'pypy3.9'
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('pypy3.9')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: defaultPyPy3
      },
      linux: {
        success: true,
        version: defaultPyPy3
      },
      win32: {
        success: true,
        version: defaultPyPy3
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('pypy3')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: defaultPyPy3
      },
      linux: {
        success: true,
        version: defaultPyPy3
      },
      win32: {
        success: true,
        version: defaultPyPy3
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('pypyx')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: true,
        version: defaultPyPy2
      },
      linux: {
        success: true,
        version: defaultPyPy2
      },
      win32: {
        success: true,
        version: defaultPyPy2
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('pypy2')
    }
  },
  {
    expectedResult: {
      darwin: {
        success: false,
        version: ''
      },
      linux: {
        success: false,
        version: ''
      },
      win32: {
        success: false,
        version: ''
      }
    },
    inputs: {
      architecture: process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      token: 'token',
      version: new PythonVersion('pypy1')
    }
  }
];

export {SetupPythonTests};

const manifestUrl =
  'https://raw.githubusercontent.com/actions/python-versions/61e2b82f9772041e7d3de2b50123a5d85bbce915/versions-manifest.json';

export {manifestUrl};
