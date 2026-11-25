import { type EntityManager } from 'typeorm';
import { FieldActorSource } from 'twenty-shared/types';

// Growth OS CRM: fictional European demo companies (.example domains, no
// third-party logo lookups). Upstream constant names kept for merge-friendliness.
export const AIRBNB_ID = 'c776ee49-f608-4a77-8cc8-6fe96ae1e43f';
export const ANTHROPIC_ID = 'f45ee421-8a3e-4aa5-a1cf-7207cc6754e1';
export const STRIPE_ID = '1f70157c-4ea5-4d81-bc49-e1401abfbb94';
export const FIGMA_ID = '9d5bcf43-7d38-4e88-82cb-d6d4ce638bf0';
export const NOTION_ID = '06290608-8bf0-4806-99ae-a715a6a93fad';

export const PREFILL_COMPANY_ROWS = [
  {
    id: AIRBNB_ID,
    name: 'Nordlicht Analytics',
    domainNamePrimaryLinkUrl: 'nordlicht-analytics.example',
    addressAddressStreet1: 'Am Sandtorkai 12',
    addressAddressStreet2: null,
    addressAddressCity: 'Hamburg',
    addressAddressState: null,
    addressAddressPostcode: '20457',
    addressAddressCountry: 'Germany',
    position: 1,
    createdBySource: FieldActorSource.SYSTEM,
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    updatedBySource: FieldActorSource.SYSTEM,
    updatedByWorkspaceMemberId: null,
    updatedByName: 'System',
  },
  {
    id: ANTHROPIC_ID,
    name: 'Kestrel Logistics',
    domainNamePrimaryLinkUrl: 'kestrel-logistics.example',
    addressAddressStreet1: 'Mannerheimintie 14',
    addressAddressStreet2: null,
    addressAddressCity: 'Helsinki',
    addressAddressState: null,
    addressAddressPostcode: '00100',
    addressAddressCountry: 'Finland',
    position: 2,
    createdBySource: FieldActorSource.SYSTEM,
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    updatedBySource: FieldActorSource.SYSTEM,
    updatedByWorkspaceMemberId: null,
    updatedByName: 'System',
  },
  {
    id: STRIPE_ID,
    name: 'Brightwater Labs',
    domainNamePrimaryLinkUrl: 'brightwater-labs.example',
    addressAddressStreet1: 'Keizersgracht 210',
    addressAddressStreet2: null,
    addressAddressCity: 'Amsterdam',
    addressAddressState: null,
    addressAddressPostcode: '1016 DZ',
    addressAddressCountry: 'Netherlands',
    position: 3,
    createdBySource: FieldActorSource.SYSTEM,
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    updatedBySource: FieldActorSource.SYSTEM,
    updatedByWorkspaceMemberId: null,
    updatedByName: 'System',
  },
  {
    id: FIGMA_ID,
    name: 'Alpenglow Energy',
    domainNamePrimaryLinkUrl: 'alpenglow-energy.example',
    addressAddressStreet1: 'Leopoldstraße 31',
    addressAddressStreet2: null,
    addressAddressCity: 'Munich',
    addressAddressState: null,
    addressAddressPostcode: '80802',
    addressAddressCountry: 'Germany',
    position: 4,
    createdBySource: FieldActorSource.SYSTEM,
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    updatedBySource: FieldActorSource.SYSTEM,
    updatedByWorkspaceMemberId: null,
    updatedByName: 'System',
  },
  {
    id: NOTION_ID,
    name: 'Fjordline Software',
    domainNamePrimaryLinkUrl: 'fjordline-software.example',
    addressAddressStreet1: 'Drottninggatan 45',
    addressAddressStreet2: null,
    addressAddressCity: 'Stockholm',
    addressAddressState: null,
    addressAddressPostcode: '111 21',
    addressAddressCountry: 'Sweden',
    position: 5,
    createdBySource: FieldActorSource.SYSTEM,
    createdByWorkspaceMemberId: null,
    createdByName: 'System',
    updatedBySource: FieldActorSource.SYSTEM,
    updatedByWorkspaceMemberId: null,
    updatedByName: 'System',
  },
];

export const prefillCompanies = async (
  entityManager: EntityManager,
  schemaName: string,
) => {
  await entityManager
    .createQueryBuilder()
    .insert()
    .into(`${schemaName}.company`, [
      'id',
      'name',
      'domainNamePrimaryLinkUrl',
      'addressAddressStreet1',
      'addressAddressStreet2',
      'addressAddressCity',
      'addressAddressState',
      'addressAddressPostcode',
      'addressAddressCountry',
      'position',
      'createdBySource',
      'createdByWorkspaceMemberId',
      'createdByName',
      'updatedBySource',
      'updatedByWorkspaceMemberId',
      'updatedByName',
    ])
    .orIgnore()
    .values(PREFILL_COMPANY_ROWS)
    .returning('*')
    .execute();
};
