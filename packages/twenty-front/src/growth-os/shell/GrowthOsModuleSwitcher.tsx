import { useLingui } from '@lingui/react/macro';

import { createGosIcon } from '~/growth-os/icons/createGosIcon';

// DS v2 app shell: the module switcher (4 tiles) under the workspace switcher.
// CRM is the current module; the other modules open their own product.
const IconOutreach = createGosIcon('mail', 'GosModuleOutreach');
const IconConnect = createGosIcon('link-2', 'GosModuleConnect');
const IconBooking = createGosIcon('calendar-check', 'GosModuleBooking');
const IconCrm = createGosIcon('kanban-square', 'GosModuleCrm');

const SUITE_URL = 'https://scalepoint-ventures.com/growthos';

const MODULES = [
  { key: 'outreach', name: 'Outreach', href: `${SUITE_URL}/outreach`, Icon: IconOutreach },
  { key: 'connect', name: 'Connect', href: `${SUITE_URL}/connect`, Icon: IconConnect },
  { key: 'booking', name: 'BookDesk24', href: `${SUITE_URL}/bookdesk24`, Icon: IconBooking },
  { key: 'crm', name: 'CRM', href: null, Icon: IconCrm },
] as const;

export const GrowthOsModuleSwitcher = () => {
  const { t } = useLingui();

  return (
    <nav className="growth-os-modsw" aria-label={t`Growth OS modules`}>
      {MODULES.map(({ key, name, href, Icon }) =>
        href === null ? (
          <a key={key} href="#main" aria-current="true" aria-label={t`${name} (current module)`} title={name} onClick={(event) => event.preventDefault()}>
            <span className="growth-os-mt" data-m={key}>
              <Icon size={14} />
            </span>
          </a>
        ) : (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={t`Open ${name}`} title={name}>
            <span className="growth-os-mt" data-m={key}>
              <Icon size={14} />
            </span>
          </a>
        ),
      )}
    </nav>
  );
};
