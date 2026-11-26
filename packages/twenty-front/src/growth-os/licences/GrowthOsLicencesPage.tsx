import { useLingui } from '@lingui/react/macro';

import { GROWTH_OS_BRAND } from '~/growth-os/brand';
import { GrowthOsSystemPage } from '~/growth-os/states/GrowthOsSystemPage';
import '~/growth-os/licences/growth-os-licences.css';

const AGPL_TEXT_URL = 'https://www.gnu.org/licenses/agpl-3.0.html';

// Main third-party components shipped in the product, with the licence from
// each package's package.json (fonts: SIL OFL 1.1). LICENSE and NOTICE in the
// source repository stay the complete, authoritative record.
const THIRD_PARTY: Array<[string, string]> = [
  ['React', 'MIT'],
  ['Apollo Client', 'MIT'],
  ['GraphQL.js', 'MIT'],
  ['Jotai', 'MIT'],
  ['Lingui', 'MIT'],
  ['Linaria', 'MIT'],
  ['Lucide (icons)', 'ISC'],
  ['Tabler Icons', 'MIT'],
  ['date-fns', 'MIT'],
  ['Zod', 'MIT'],
  ['BlockNote', 'MPL-2.0'],
  ['NestJS', 'MIT'],
  ['TypeORM', 'MIT'],
  ['BullMQ', 'MIT'],
  ['Geist, Geist Mono (fonts)', 'OFL-1.1'],
];

// Growth OS CRM: the only place in the UI that names the upstream project
// (OS Lead decision, 26 Nov 2026). Allowlisted in scripts/check-white-label.ts.
export const GrowthOsLicencesPage = () => {
  const { t } = useLingui();
  const productName = GROWTH_OS_BRAND.productName;
  const upstreamName = GROWTH_OS_BRAND.upstreamName;
  const sourceCodeUrl = GROWTH_OS_BRAND.sourceCodeUrl;

  return (
    <GrowthOsSystemPage
      code={t`Open source`}
      title={t`Open-source licences`}
      testId="growth-os-licences-page"
      lead={
        <>
          <p>
            {t`${productName} is built on the open-source ${upstreamName} CRM and is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).`}
          </p>
          <p>
            {sourceCodeUrl
              ? t`You can get the complete source code of the version we run, including our changes.`
              : t`The complete source code of the version we run is available on request from support.`}
          </p>
        </>
      }
      actions={
        <>
          {sourceCodeUrl && (
            <a
              className="gos-btn gos-btn-primary"
              href={sourceCodeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t`Source code`}
            </a>
          )}
          <a
            className={`gos-btn ${sourceCodeUrl ? 'gos-btn-secondary' : 'gos-btn-primary'}`}
            href={AGPL_TEXT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t`Read the AGPL-3.0 licence`}
          </a>
        </>
      }
    >
      <section className="gos-lic" aria-labelledby="gos-lic-third-party">
        <h2 id="gos-lic-third-party">{t`Main third-party components`}</h2>
        <ul>
          {THIRD_PARTY.map(([name, licence]) => (
            <li key={name}>
              <span>{name}</span>
              <code>{licence}</code>
            </li>
          ))}
        </ul>
        <p>{t`The full list of components and their licence texts ships with the source code (LICENSE and NOTICE files).`}</p>
      </section>
    </GrowthOsSystemPage>
  );
};
