/* @growth-os-enterprise-override @growth-os-enterprise-stub: AGPL-3.0, written for Growth OS CRM.
 * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/packages/twenty-server/src/engine/core-modules/usage/services/usage-recorder.service.ts.
 * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */

// Growth OS CRM: Twenty's usage metering (credits / billing usage) is not
// available. Usage events are accepted and dropped, so callers keep working.
import { Injectable } from '@nestjs/common';

import { type RecordUsageInput } from 'src/engine/core-modules/usage/types/record-usage-input.type';

@Injectable()
export class UsageRecorderService {
  async flushAndStop(): Promise<void> {}

  async record(
    _workspaceId: string,
    _inputs: RecordUsageInput[],
  ): Promise<void> {}

  accumulate(_workspaceId: string, _input: RecordUsageInput): void {}
}
