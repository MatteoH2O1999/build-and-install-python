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

import {ActionInputs, BuildBehavior, PythonVersion} from '../inputs';
import {SetupPythonResult} from '../version';

export type TypeTest = {
  pythonVersion: PythonVersion;
  expectedPyPy: boolean;
  expectedGraalPy: boolean;
  expectedCPython: boolean;
};

const IsTypeTest: TypeTest[] = [
  {
    expectedCPython: false,
    expectedGraalPy: false,
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy3.9', false)
  },
  {
    expectedCPython: false,
    expectedGraalPy: false,
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy3', false)
  },
  {
    expectedCPython: true,
    expectedGraalPy: false,
    expectedPyPy: false,
    pythonVersion: new PythonVersion('3.9', false)
  },
  {
    expectedCPython: true,
    expectedGraalPy: false,
    expectedPyPy: false,
    pythonVersion: new PythonVersion('', false)
  },
  {
    expectedCPython: true,
    expectedGraalPy: false,
    expectedPyPy: false,
    pythonVersion: new PythonVersion('2', false)
  },
  {
    expectedCPython: false,
    expectedGraalPy: false,
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypy-3.5', false)
  },
  {
    expectedCPython: false,
    expectedGraalPy: false,
    expectedPyPy: true,
    pythonVersion: new PythonVersion('pypyx', false)
  },
  {
    expectedCPython: false,
    expectedGraalPy: true,
    expectedPyPy: false,
    pythonVersion: new PythonVersion('graalpy-22.3', false)
  },
  {
    expectedCPython: false,
    expectedGraalPy: true,
    expectedPyPy: false,
    pythonVersion: new PythonVersion('graalpy22.3', false)
  }
];

export {IsTypeTest};

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
        freethreaded: false,
        success: true,
        version: '2.7.18'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: '2.7.18'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '2.7.18'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('2.7', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('>=2.7.0 <3.0.0-0 || >=3.8.0 <3.12.0-0', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '2.7.18'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: '2.7.18'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '2.7.18'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('2.7.18', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '3.6.15'
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '3.6.8'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.6', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '3.6.7'
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '3.6.7'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.6.7', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypy3.9'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypy3.9'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypy3.9'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypy3.9', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'graalpy-22.3'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'graalpy-22.3'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'graalpy-22.3'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('graalpy-22.3', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'graalpy22.3'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'graalpy22.3'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'graalpy22.3'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('GraalPy22.3', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypy3'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypy3'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypy3'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypy3', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypyx'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypyx'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypyx'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypyx', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypy2'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypy2'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypy2'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypy2', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypy1'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypy1'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypy1'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypy1', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: 'pypy>=2.0.0 <3.0.0 || >=5.0.0 <6.0.0'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: 'pypy>=2.0.0 <3.0.0 || >=5.0.0 <6.0.0'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: 'pypy>=2.0.0 <3.0.0 || >=5.0.0 <6.0.0'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('pypy>=2.0.0 <3.0.0 || >=5.0.0 <6.0.0', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '3.11.1'
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: true,
        version: '3.12.0-alpha.3'
      },
      linux: {
        freethreaded: false,
        success: true,
        version: '3.12.0-alpha.3'
      },
      win32: {
        freethreaded: false,
        success: true,
        version: '3.12.0-alpha.3'
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.12', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.12.0', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion(
        '>=2.12.0 <2.13.0-0 || >=2.14.0 <2.15.0-0',
        false
      )
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: false,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.12', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: false,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: false,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: false,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.13', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: true,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: true,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: true,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.13t', false)
    }
  },
  {
    expectedResult: {
      darwin: {
        freethreaded: true,
        success: false,
        version: ''
      },
      linux: {
        freethreaded: true,
        success: false,
        version: ''
      },
      win32: {
        freethreaded: true,
        success: false,
        version: ''
      }
    },
    inputs: {
      allowPrereleases: true,
      architecture: process.platform === 'darwin' ? 'x64' : process.arch,
      buildBehavior: BuildBehavior.Info,
      cache: true,
      checkLatest: false,
      token: 'token',
      version: new PythonVersion('3.13', true)
    }
  }
];

export {SetupPythonTests};

const manifestUrl =
  'https://raw.githubusercontent.com/actions/python-versions/61e2b82f9772041e7d3de2b50123a5d85bbce915/versions-manifest.json';

export {manifestUrl};
