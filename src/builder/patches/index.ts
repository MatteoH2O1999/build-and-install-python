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

import ArmDarwin from './arm-darwin';
import BootstrapperWix from './bootstrapper-wix';
import ExternalsSvn from './externals-svn';
import H2PYHeaders from './h2py-headers';
import Patch from './patch';
import PlatformTriplet from './platform_triplet';
import TCLTKExternalVersion from './tcltk-external-version';
import TCLTKProps_VC9 from './tcltkprops-vc9';

const patches: Patch[] = [
  new ArmDarwin(),
  new BootstrapperWix(),
  new ExternalsSvn(),
  new H2PYHeaders(),
  new PlatformTriplet(),
  new TCLTKExternalVersion(),
  new TCLTKProps_VC9()
];

export type {OS} from './patch';
export {patches};
