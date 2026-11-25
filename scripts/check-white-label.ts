#!/usr/bin/env tsx
/*
 * Growth OS CRM white-label gate (see WHITE-LABEL.md).
 *
 * Fails when the upstream product name can reach a customer:
 *   1. built front (packages/twenty-front/build): every case-insensitive
 *      "twenty" that is not part of a code identifier / package name and not
 *      on the allowlist below,
 *   2. translation catalogs (front, emails, server) after the runtime rebrand
 *      in twenty-shared/src/i18n/growth-os-white-label.ts,
 *   3. every transactional email template rendered to HTML and plain text.
 *
 * Usage: npx tsx scripts/check-white-label.ts [--skip-build] [--skip-emails]
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const failures: string[] = [];
const allowedHits = new Map<string, number>();

// Contexts where the upstream name is allowed, with the reason.
const ALLOWLIST: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /Built on Twenty/i, reason: 'AGPL credit (upstream attribution)' },
  { pattern: /upstreamName\s*:\s*["'`]Twenty["'`]/, reason: 'AGPL credit constant' },
  { pattern: /github\.com\/twentyhq\/twenty/i, reason: 'AGPL credit link to upstream source' },
  { pattern: /BEGIN: Twenty Config|END: Twenty Config/, reason: 'HTML comment markers the server uses to inject runtime config (not rendered)' },
  { pattern: /["'`]twenty["'`]\s*:\s*\{/, reason: 'internal object key (not rendered)' },
  { pattern: /@license|SPDX|AGPL/i, reason: 'licence notice' },
  { pattern: /twenty:front-component/, reason: 'internal storage/message key (not rendered)' },
  { pattern: /\\\.com|\\b[Tt]wenty|\(www\\\.\)/, reason: 'white-label rebrand rules (regex source in twenty-shared)' },
  { pattern: /hub\.docker\.com\/r\/twentycrm/, reason: 'server-admin-only Admin Panel (instance operators, not customers)' },
  { pattern: /(yarn|npx) twenty\b/, reason: 'upstream developer CLI command name (twenty-sdk binary, developer tooling)' },
];

// Matches that are part of identifiers, package names, hosts or CSS vars:
// twenty-ui, twentyORM, TwentyConfig, isTwenty, x-twenty-*, twenty-icons.com.
const IDENTIFIER_CHAR = /[A-Za-z0-9_$\-]/;

const isStandaloneWord = (text: string, index: number, length: number) => {
  const before = text[index - 1] ?? ' ';
  const after = text[index + length] ?? ' ';
  return !IDENTIFIER_CHAR.test(before) && !IDENTIFIER_CHAR.test(after);
};

const scanText = (label: string, text: string, { standaloneOnly = true } = {}) => {
  const re = /twenty/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (standaloneOnly && !isStandaloneWord(text, match.index, match[0].length)) {
      // "twenty.com" is a standalone hit even though "." follows.
      if (!/^twenty\.com/i.test(text.slice(match.index, match.index + 10))) continue;
    }
    const context = text.slice(Math.max(0, match.index - 60), match.index + 60);
    const allowed = ALLOWLIST.find(({ pattern }) => pattern.test(context));
    if (allowed) {
      allowedHits.set(allowed.reason, (allowedHits.get(allowed.reason) ?? 0) + 1);
      continue;
    }
    failures.push(`${label}: …${context.replace(/\s+/g, ' ')}…`);
  }
};

// Lingui catalogs are rebranded at runtime; check them through the same code.
const isLinguiCatalogChunk = (text: string) =>
  /JSON\.parse\(["'`]\{\\?["']/.test(text.slice(0, 400));

const walk = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      })
    : [];

const checkFrontBuild = () => {
  const buildDir = path.join(ROOT, 'packages/twenty-front/build');
  const files = walk(buildDir).filter((f) => /\.(html|js|mjs|css|json|svg|txt|webmanifest)$/.test(f));
  if (!files.length) {
    failures.push('front build not found: run `npx nx build twenty-front` first (or pass --skip-build)');
    return;
  }
  let catalogs = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (isLinguiCatalogChunk(text)) {
      catalogs++;
      continue;
    }
    scanText(path.relative(ROOT, file), text);
  }
  console.log(`front build: scanned ${files.length - catalogs} files (${catalogs} catalog chunks checked via source catalogs)`);
};

const checkCatalogs = async () => {
  const { rebrandMessages } = await import(
    pathToFileURL(path.join(ROOT, 'packages/twenty-shared/src/i18n/growth-os-white-label.ts')).href
  );
  const dirs = [
    'packages/twenty-front/src/locales/generated',
    'packages/twenty-emails/src/locales/generated',
    'packages/twenty-server/src/engine/core-modules/i18n/locales/generated',
  ];
  let count = 0;
  for (const dir of dirs) {
    for (const file of walk(path.join(ROOT, dir)).filter((f) => f.endsWith('.ts'))) {
      const { messages } = await import(pathToFileURL(file).href);
      if (!messages) continue;
      const rebranded = rebrandMessages(messages);
      scanText(`${path.relative(ROOT, file)} (after rebrand)`, JSON.stringify(Object.values(rebranded)));
      count++;
    }
  }
  console.log(`catalogs: checked ${count} locale catalogs after rebrand`);
};

const checkEmails = async () => {
  const dist = path.join(ROOT, 'packages/twenty-emails/dist/index.mjs');
  if (!fs.existsSync(dist)) {
    failures.push('twenty-emails dist not found: build twenty-emails first (or pass --skip-emails)');
    return;
  }
  const emails = await import(pathToFileURL(dist).href);
  const reactModule = await import('react');
  const createElement = (reactModule as any).default?.createElement ?? (reactModule as any).createElement;
  let rendered = 0;
  for (const [name, component] of Object.entries(emails)) {
    if (!/^[A-Z].*(Email|Validation)$/.test(name) || name === 'EmailRenderError' || name.startsWith('Kit') || typeof component !== 'function') continue;
    const previewProps = (component as { PreviewProps?: Record<string, unknown> }).PreviewProps ?? {};
    // Same call shape as the server: render(Template(props)).
    const element = (component as (props: object) => unknown)({ locale: 'en', ...previewProps });
    void createElement;
    const html: string = await emails.render(element);
    const text: string = await emails.render(element, { plainText: true });
    scanText(`email ${name} (html)`, html);
    scanText(`email ${name} (text)`, text);
    rendered++;
  }
  console.log(`emails: rendered and checked ${rendered} templates`);
};

const main = async () => {
  if (!args.has('--skip-build')) checkFrontBuild();
  await checkCatalogs();
  if (!args.has('--skip-emails')) await checkEmails();

  for (const [reason, count] of allowedHits) console.log(`  allowed (${count}x): ${reason}`);

  if (failures.length) {
    console.error(`\ncheck-white-label: ${failures.length} customer-visible "Twenty" reference(s):`);
    failures.slice(0, 200).forEach((f) => console.error(`  ${f}`));
    process.exit(1);
  }
  console.log('check-white-label: OK, no customer-visible upstream branding.');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
