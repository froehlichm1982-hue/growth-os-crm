// Growth OS CRM: Twenty's usage metering (credits / billing usage) is not
// available. Usage events are accepted and dropped, so callers keep working.
import { Injectable } from '@nestjs/common';

import { type RecordUsageInput } from 'src/engine/core-modules/usage/types/record-usage-input.type';

@Injectable()
export class UsageRecorderService {
  async flushAndStop(): Promise<void> {}

  async record(_workspaceId: string, _inputs: RecordUsageInput[]): Promise<void> {}

  accumulate(_workspaceId: string, _input: RecordUsageInput): void {}
}
