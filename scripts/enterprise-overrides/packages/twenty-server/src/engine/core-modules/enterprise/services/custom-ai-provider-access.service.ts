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
