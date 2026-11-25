// Growth OS CRM: Twenty credit grants are disabled (billing is off).
import { Injectable } from '@nestjs/common';

import { type BillingCreditGrantEntity } from 'src/engine/core-modules/billing/entities/billing-credit-grant.entity';
import { type BillingCreditGrantType } from 'src/engine/core-modules/billing/enums/billing-credit-grant-type.enum';

@Injectable()
export class BillingCreditService {
  async grantCredits(_params: {
    workspaceId: string;
    amountMicro: number;
    type: BillingCreditGrantType;
    reason?: string | null;
    grantedByUserId?: string | null;
    idempotencyKey?: string | null;
    effectiveAt?: Date;
    expiresInDays?: number | null;
    sourceGrantId?: string | null;
  }): Promise<BillingCreditGrantEntity | null> {
    return null;
  }

  async revokeGrant(_params: {
    workspaceId: string;
    grantId: string;
    revokedByUserId?: string | null;
  }): Promise<BillingCreditGrantEntity> {
    throw new Error('Growth OS CRM: Twenty credit grants are not available.');
  }

  async refreshWorkspaceCreditState(_params: unknown): Promise<void> {}
}
