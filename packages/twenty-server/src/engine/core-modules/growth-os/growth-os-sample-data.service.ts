import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';

import { GrowthOsEntitlementService } from 'src/engine/core-modules/growth-os/growth-os-entitlement.service';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import {
  AIRBNB_ID,
  prefillCompanies,
} from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-companies.util';
import { prefillOpportunities } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-opportunities.util';
import { prefillPeople } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-people.util';

// Growth OS CRM: new workspaces start empty. Members can load the fictional
// EU demo set (lead company "Nordlicht Analytics") once, on demand.
export const isGrowthOsSampleDataPrefilledOnSignup = (): boolean =>
  process.env.GROWTH_OS_PREFILL_SAMPLE_DATA === 'true';

@Injectable()
export class GrowthOsSampleDataService {
  private readonly logger = new Logger(GrowthOsSampleDataService.name);

  constructor(
    @InjectDataSource()
    private readonly coreDataSource: DataSource,
    private readonly growthOsEntitlementService: GrowthOsEntitlementService,
  ) {}

  async hasSampleData(workspaceId: string): Promise<boolean> {
    const schemaName = getWorkspaceSchemaName(workspaceId);
    const rows = await this.coreDataSource.query(
      `SELECT 1 FROM "${schemaName}"."company" WHERE "id" = $1 LIMIT 1`,
      [AIRBNB_ID],
    );

    return rows.length > 0;
  }

  async loadSampleData(workspaceId: string): Promise<boolean> {
    await this.growthOsEntitlementService.assertWritable(workspaceId);

    if (await this.hasSampleData(workspaceId)) {
      return false;
    }

    const schemaName = getWorkspaceSchemaName(workspaceId);
    const queryRunner = this.coreDataSource.createQueryRunner();

    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();
      await prefillCompanies(queryRunner.manager, schemaName);
      await prefillPeople(queryRunner.manager, schemaName);
      await prefillOpportunities(queryRunner.manager, schemaName);
      await queryRunner.commitTransaction();
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    } finally {
      await queryRunner.release();
    }

    this.logger.log(`Sample data loaded for workspace ${workspaceId}`);

    return true;
  }
}
