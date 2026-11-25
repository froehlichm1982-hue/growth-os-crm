import * as fs from 'fs';
import * as path from 'path';

import { config } from 'dotenv';
config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
  override: true,
});

export function generateFrontConfig(): void {
  // A page served by this server can always reach the API on the origin it
  // was loaded from, so the front resolves it from window.location (see
  // packages/twenty-front/src/config). Rewriting clears any value baked into
  // index.html at build time.
  // Growth OS CRM: deployment links (AGPL source offer, help center) are
  // passed to the browser at runtime; only set keys are written.
  const growthOsRuntimeEnv = Object.fromEntries(
    ['SOURCE_CODE_URL', 'HELP_URL']
      .map((key) => [key, process.env[key]?.trim()])
      .filter(([, value]) => typeof value === 'string' && value !== ''),
  );
  const runtimeEnvJson = JSON.stringify(growthOsRuntimeEnv).replace(
    /</g,
    '\\u003c',
  );
  const configString = `<!-- BEGIN: Twenty Config -->
    <script id="twenty-env-config">
      window._env_ = ${runtimeEnvJson};
    </script>
    <!-- END: Twenty Config -->`;

  const distPath = path.join(__dirname, '..', 'front');
  const indexPath = path.join(distPath, 'index.html');

  try {
    let indexContent = fs.readFileSync(indexPath, 'utf8');

    indexContent = indexContent.replace(
      /<!-- BEGIN: Twenty Config -->[\s\S]*?<!-- END: Twenty Config -->/,
      configString,
    );

    fs.writeFileSync(indexPath, indexContent, 'utf8');
  } catch {
    // oxlint-disable-next-line no-console
    console.log(
      'Frontend build not found or not writable, assuming it is served independently',
    );
  }
}
