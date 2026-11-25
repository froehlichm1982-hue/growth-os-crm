import { Outlet } from 'react-router-dom';

import { GrowthOsAuthShell } from '~/growth-os/GrowthOsAuthShell';

// Growth OS: reset, verify and payment-return pages use the kit auth shell
// (form left, navy panel right) like sign-in.
export const AuthFlowLayout = () => (
  <GrowthOsAuthShell>
    <Outlet />
  </GrowthOsAuthShell>
);
