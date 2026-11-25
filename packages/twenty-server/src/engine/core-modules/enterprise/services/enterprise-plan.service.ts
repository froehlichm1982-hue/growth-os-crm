/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/enterprise/services/enterprise-plan.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM never uses a Twenty license / organization key. This service
// always reports "no Enterprise plan", so every Enterprise-gated feature stays
// off. Key management and Twenty's licensing API are not available.
import { Injectable } from '@nestjs/common';

const notAvailable = (): never => {
  throw new Error('Growth OS CRM: Twenty licensing is not available.');
};

@Injectable()
export class EnterprisePlanService {
  hasValidSignedEnterpriseKey(): boolean {
    return false;
  }

  hasValidEnterpriseValidityToken(): boolean {
    return false;
  }

  isValid(): boolean {
    return false;
  }

  isValidEnterpriseKeyFormat(_key: string): boolean {
    return false;
  }

  getLastRefreshRejectionCode(): string | null {
    return null;
  }

  async refreshValidityToken(): Promise<boolean> {
    return false;
  }

  async reportSeats(_seatCount: number): Promise<boolean> {
    return false;
  }

  async releaseServerBinding(): Promise<boolean> {
    return false;
  }

  async getPortalUrl(_returnUrl?: string): Promise<string | null> {
    return null;
  }

  async getCheckoutUrl(
    _billingInterval: 'monthly' | 'yearly',
    _seatCount: number,
  ): Promise<string | null> {
    return null;
  }

  async getOrCreateServerId(): Promise<string | null> {
    return null;
  }

  async getBillableSeatCount(): Promise<number> {
    return 0;
  }

  async getLicenseInfo(): Promise<never> {
    return notAvailable();
  }

  async setEnterpriseKey(_enterpriseKey: string): Promise<void> {
    notAvailable();
  }

  async getSubscriptionStatus(): Promise<never> {
    return notAvailable();
  }
}
