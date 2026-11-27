import { RESERVED_SUBDOMAINS } from 'twenty-shared/constants';
import { isValidTwentySubdomain } from 'twenty-shared/utils';

// Growth OS CRM: extra names that must never become a workspace, set per deployment, e.g. the
// workspaces of another stack that is routed by host name (`GROWTH_OS_RESERVED_SUBDOMAINS=spv,portal,oldorff`).
const extraReservedSubdomains = () =>
  (process.env.GROWTH_OS_RESERVED_SUBDOMAINS ?? '')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name) => name !== '');

export const isSubdomainValid = (subdomain: string) => {
  return (
    isValidTwentySubdomain(subdomain) &&
    !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase()) &&
    !extraReservedSubdomains().includes(subdomain.toLowerCase())
  );
};
