// Growth OS CRM: Twenty billing usage periods are not used.
import { Injectable } from '@nestjs/common';

import { type PeriodUnit } from 'src/engine/core-modules/usage-limit/types/period-unit.type';
import { type UsagePeriod } from 'src/engine/core-modules/usage-limit/types/usage-period.type';

@Injectable()
export class UsagePeriodService {
  async hasAllowancePeriod(_workspaceId: string): Promise<boolean> {
    return false;
  }

  async findCurrentPeriod(_args: unknown): Promise<UsagePeriod | null> {
    return null;
  }

  async findCurrentPeriodsByUnit(
    _args: unknown,
  ): Promise<Partial<Record<PeriodUnit, UsagePeriod>>> {
    return {};
  }
}
