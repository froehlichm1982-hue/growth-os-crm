import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('no phone-home by default', () => {
  const source = readFileSync(join(__dirname, '../../twenty-config/config-variables.ts'), 'utf8');

  it('TELEMETRY_ENABLED defaults to false', () => {
    expect(source).toMatch(/TELEMETRY_ENABLED = false;/);
    expect(source).not.toMatch(/TELEMETRY_ENABLED = true;/);
  });

  it('analytics and error reporting default to off', () => {
    expect(source).toMatch(/ANALYTICS_ENABLED = false;/);
    expect(source).toMatch(/SENTRY_DSN: string;/); // no default DSN
  });
});
