import { ForbiddenException } from '@nestjs/common';

// HttpException on purpose: REST answers 403 JSON and the GraphQL layer turns
// it into a FORBIDDEN error carrying this message, which the app shows as-is.
export class GrowthOsPlanLimitException extends ForbiddenException {
  constructor(
    message: string,
    readonly limit: string,
  ) {
    super({ statusCode: 403, error: 'GROWTH_OS_PLAN_LIMIT', limit, message });
  }
}

export const GROWTH_OS_UPGRADE_HINT =
  'Upgrade in Settings → Plan & Billing.';
