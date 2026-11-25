/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/enterprise/services/custom-ai-provider-access.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: custom AI provider access is gated on a Twenty Enterprise
// plan upstream, so it always reports no access here.
import { Injectable } from '@nestjs/common';

export type CustomAiProviderAccess = {
  hasAccess: boolean;
  seatCount: number;
  seatThreshold: number;
};

@Injectable()
export class CustomAiProviderAccessService {
  async computeAccess(): Promise<CustomAiProviderAccess> {
    return { hasAccess: false, seatCount: 0, seatThreshold: 0 };
  }

  getCachedHasAccess(): boolean {
    return false;
  }
}
