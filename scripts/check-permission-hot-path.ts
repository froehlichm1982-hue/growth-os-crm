/*
 * Growth OS CRM - permission hot-path guard
 *
 * Fails if AGPL code on the ORM / API hot path imports runtime values from
 * Enterprise-licensed (or stubbed) permission code that we have not replaced
 * with our own AGPL override in scripts/enterprise-overrides/.
 *
 * Why: from twenty/v2.45 on, upstream moves record-level permission checks
 * (record sharing, then core record permissions: #29787, #29824, #30007) into
 * Enterprise files. Crossing that line needs our own AGPL permission layer.
 * Works before the strip (marker) and after it (stub tag).
 *
 *   npx tsx scripts/check-permission-hot-path.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SERVER = 'packages/twenty-server';
const HOT_DIRS = ['src/engine/twenty-orm', 'src/engine/api'];
const MARKER = ['@license', 'Enterprise'].join(' ');
const STUB_TAG = '@growth-os-enterprise-stub';
const OVERRIDES = path.join(ROOT, 'scripts/enterprise-overrides');
const PERMISSION_PATH = /(permission|principal|rls|record-share|row-access|access-group|private-record)/;

const walk = (dir: string, out: string[] = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.ts$/.test(e.name) && !/(\.spec\.|\.test\.)/.test(e.name) && !p.includes('__tests__')) out.push(p);
  }
  return out;
};

const isRestricted = (rel: string) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return false;
  if (fs.existsSync(path.join(OVERRIDES, rel))) return false; // our AGPL override
  const head = fs.readFileSync(abs, 'utf8').slice(0, 400);
  return head.includes(MARKER) || head.includes(STUB_TAG);
};

const importRe = /import\s+(type\s+)?([\s\S]*?)\s+from\s+'(src\/[^']+)'/g;
const problems: string[] = [];
for (const dir of HOT_DIRS) {
  for (const file of walk(path.join(ROOT, SERVER, dir))) {
    const src = fs.readFileSync(file, 'utf8');
    if (src.slice(0, 400).includes(MARKER) || src.slice(0, 400).includes(STUB_TAG)) continue;
    let m: RegExpExecArray | null;
    while ((m = importRe.exec(src))) {
      if (m[1]) continue;
      const names = m[2].replace(/[{}]/g, ' ').split(',').map((s) => s.trim()).filter((s) => s && !s.startsWith('type '));
      if (!names.length) continue;
      const target = `${SERVER}/${m[3]}.ts`;
      if (PERMISSION_PATH.test(m[3]) && isRestricted(target))
        problems.push(`${path.relative(ROOT, file)} -> ${m[3]} (${names.join(', ')})`);
    }
  }
}

if (problems.length) {
  console.error(`Permission hot path depends on Enterprise code (${problems.length} import(s)):`);
  problems.forEach((p) => console.error(`  ${p}`));
  console.error('Upgrading past this point needs our own AGPL permission layer. See ENTERPRISE-STRIP.md.');
  process.exit(1);
}
console.log('Permission hot path is AGPL (or covered by Growth OS overrides).');
