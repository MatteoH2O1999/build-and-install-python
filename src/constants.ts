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

export enum InputNames {
  PYTHON_VERSION = 'python-version',
  PYTHON_VERSION_FILE = 'python-version-file',
  ARCHITECTURE = 'architecture',
  CACHE_BUILD = 'cache-build',
  ALLOW_BUILD = 'allow-build',
  TOKEN = 'token'
}

export enum OutputNames {
  PYTHON_VERSION = 'python-version'
}