/*
 * Growth OS CRM - Enterprise strip
 *
 * Removes every file marked with the Twenty commercial-license header
 * (the "@license Enterprise" block comment) from the source tree, so the
 * shipped code is AGPL-3.0 only.
 *
 *   - Enterprise files that no remaining AGPL file needs are DELETED.
 *   - Enterprise files that AGPL code still imports are replaced by a thin,
 *     mechanically generated STUB: exported names and type signatures are kept
 *     so TypeScript compiles, every implementation body is removed.
 *     Server stubs throw (fail closed); front stubs return an inert value.
 *   - AGPL test/story files that import Enterprise files are DELETED
 *     (they test functionality that no longer exists).
 *
 * Usage:
 *   npx tsx scripts/strip-enterprise.ts          # strip + write report
 *   npx tsx scripts/strip-enterprise.ts --check  # fail if any marker is left
 *   npx tsx scripts/strip-enterprise.ts --dry-run
 *
 * Re-run after every upstream merge (see ENTERPRISE-STRIP.md).
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import ts from 'typescript';

const ROOT = path.resolve(__dirname, '..');
const MARKER = ['@license', 'Enterprise'].join(' ');
const STUB_TAG = '@growth-os-enterprise-stub';
const MANIFEST = path.join(ROOT, 'enterprise-strip-manifest.json');
const REPORT = path.join(ROOT, 'ENTERPRISE-STRIP.md');

// Files allowed to mention the marker (license text, docs, this script).
const MARKER_ALLOWLIST = new Set([
  'LICENSE',
  'ENTERPRISE-STRIP.md',
  'enterprise-strip-manifest.json',
  'scripts/strip-enterprise.ts',
]);

const SCANNED_ROOTS = ['packages'];
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.cache', '.next', 'coverage', '.nx']);
const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has('--check');
const DRY_RUN = args.has('--dry-run');

const FRONT_STUB_HELPER = 'packages/twenty-front/src/growth-os/enterpriseStubValue.ts';

const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join('/');

const listFiles = (): string[] => {
  let files: string[];
  try {
    files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', ...SCANNED_ROOTS], {
      cwd: ROOT,
      maxBuffer: 1024 * 1024 * 512,
    })
      .toString()
      .split('\n')
      .filter(Boolean);
  } catch {
    files = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const p = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(p);
        else files.push(p);
      }
    };
    SCANNED_ROOTS.forEach(walk);
  }
  return files.filter(
    (f) => !f.split('/').some((seg) => IGNORED_DIRS.has(seg)) && fs.existsSync(path.join(ROOT, f)),
  );
};

const hasMarker = (content: string) => content.includes(MARKER);

const isTestLike = (f: string) =>
  /(\.spec\.|\.test\.|\.stories\.|\.e2e-spec\.)/.test(f) ||
  /\/(__tests__|__stories__|__mocks__|test|tests|testing)\//.test(f) ||
  f.startsWith('packages/twenty-e2e-testing/');

// ---------------------------------------------------------------- import graph

const packageOf = (f: string) => f.split('/').slice(0, 2).join('/');

const resolveSpecifier = (from: string, spec: string, known: Set<string>): string | null => {
  const pkg = packageOf(from);
  let base: string | null = null;
  if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else if (pkg === 'packages/twenty-server' && (spec.startsWith('src/') || spec.startsWith('test/')))
    base = `${pkg}/${spec}`;
  else if (pkg === 'packages/twenty-front' && spec.startsWith('@/')) base = `${pkg}/src/modules/${spec.slice(2)}`;
  else if (pkg === 'packages/twenty-front' && spec.startsWith('~/')) base = `${pkg}/src/${spec.slice(2)}`;
  else return null;
  const candidates = [base, ...['.ts', '.tsx', '.d.ts', '.js', '.jsx', '/index.ts', '/index.tsx'].map((e) => base + e)];
  return candidates.find((c) => known.has(c)) ?? null;
};

const specifiersOf = (content: string): string[] => {
  const out: string[] = [];
  const re =
    /(?:from\s+|import\s+|import\(\s*|require\(\s*|jest\.mock\(\s*|jest\.requireActual\(\s*|vi\.mock\(\s*)['"]([^'"\n]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out.push(m[1]);
  return out;
};

// ---------------------------------------------------------------- stub generation

const PURE_KINDS = new Set([
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TrueKeyword,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.Identifier,
]);

// Plain data (literals, enum references, object/array literals of those) is
// kept so `keyof typeof X` style types still resolve. Anything that computes
// is replaced.
const isPureData = (node: ts.Expression): boolean => {
  if (PURE_KINDS.has(node.kind)) return true;
  if (ts.isPrefixUnaryExpression(node)) return isPureData(node.operand);
  if (ts.isParenthesizedExpression(node)) return isPureData(node.expression);
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node))
    return isPureData(node.expression);
  if (ts.isPropertyAccessExpression(node)) return isPureData(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((e) => isPureData(e as ts.Expression));
  if (ts.isSpreadElement(node)) return isPureData(node.expression);
  if (ts.isObjectLiteralExpression(node))
    return node.properties.every((p) => {
      if (ts.isShorthandPropertyAssignment(p)) return true;
      if (ts.isSpreadAssignment(p)) return isPureData(p.expression);
      if (ts.isPropertyAssignment(p))
        return (!ts.isComputedPropertyName(p.name) || isPureData(p.name.expression)) && isPureData(p.initializer);
      return false;
    });
  return false;
};

type StubFlavor = 'server' | 'front' | 'shared';

const flavorOf = (f: string): StubFlavor =>
  f.startsWith('packages/twenty-front/') ? 'front' : f.startsWith('packages/twenty-server/') ? 'server' : 'shared';

const generateStub = (file: string, source: string): string => {
  const flavor = flavorOf(file);
  const isTsx = file.endsWith('.tsx');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const text = (n: ts.Node) => n.getText(sf);
  const out: string[] = [];
  let needsFrontHelper = false;

  const anyType = 'any';
  const stubBody = (name: string, isComponent: boolean, isCtor = false, superCall = ''): string => {
    if (isCtor) return `{${superCall ? ` ${superCall}` : ''} }`;
    if (flavor === 'front') {
      if (isComponent) return '{\n  return null;\n}';
      needsFrontHelper = true;
      return '{\n  return enterpriseStubValue();\n}';
    }
    return `{\n  throw new Error('Growth OS CRM: "${name}" is an Enterprise feature and was removed.');\n}`;
  };

  const mods = (node: ts.Node, drop: ts.SyntaxKind[] = []) =>
    (ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : [])
      .filter((m) => !drop.includes(m.kind))
      .map(text)
      .join(' ');
  const decos = (node: ts.Node) =>
    (ts.canHaveDecorators(node) ? ts.getDecorators(node) ?? [] : []).map(text).join('\n');
  const join = (...parts: string[]) => parts.filter((p) => p && p.length > 0).join(' ');

  const params = (ps: ts.NodeArray<ts.ParameterDeclaration>): string => {
    const arr = ps.map((p, idx) => {
      const laterRequired = ps.slice(idx + 1).some((q) => !q.questionToken && !q.initializer && !q.dotDotDotToken);
      const isThis = ts.isIdentifier(p.name) && p.name.text === 'this';
      const name = ts.isIdentifier(p.name) ? p.name.text : `_p${idx}`;
      const optional = p.questionToken || (p.initializer && !laterRequired) ? '?' : '';
      const type = p.type ? text(p.type) : anyType;
      const d = decos(p);
      const m = mods(p);
      return join(d, m, `${p.dotDotDotToken ? '...' : ''}${name}${isThis ? '' : optional}: ${type}`);
    });
    return arr.join(', ');
  };
  const typeParams = (tp?: ts.NodeArray<ts.TypeParameterDeclaration>) => (tp && tp.length ? `<${tp.map(text).join(', ')}>` : '');
  const retType = (n: ts.SignatureDeclaration, isAsync: boolean) =>
    n.type ? `: ${text(n.type)}` : isAsync ? ': Promise<any>' : `: ${anyType}`;
  const isAsyncNode = (n: ts.Node) => (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);

  const classMember = (m: ts.ClassElement, className: string, hasHeritage: boolean): string | null => {
    if (ts.isSemicolonClassElement(m) || ts.isClassStaticBlockDeclaration(m)) return null;
    if (ts.isIndexSignatureDeclaration(m)) return text(m);
    if (ts.isPropertyDeclaration(m)) {
      const isStatic = (ts.getModifiers(m) ?? []).some((x) => x.kind === ts.SyntaxKind.StaticKeyword);
      const isAbstract = (ts.getModifiers(m) ?? []).some((x) => x.kind === ts.SyntaxKind.AbstractKeyword || x.kind === ts.SyntaxKind.DeclareKeyword);
      const type = m.type ? text(m.type) : anyType;
      const mark = m.questionToken ? '?' : isStatic || isAbstract ? '' : '!';
      return join(decos(m), mods(m), `${text(m.name)}${mark}: ${type};`);
    }
    if (ts.isConstructorDeclaration(m)) {
      if (!m.body) return join(mods(m), `constructor(${params(m.parameters)});`);
      const superCall = hasHeritage ? 'super(...(arguments as any));' : '';
      return join(mods(m), `constructor(${params(m.parameters)}) ${stubBody(className, false, true, superCall)}`);
    }
    if (ts.isMethodDeclaration(m) || ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)) {
      const isAsync = isAsyncNode(m);
      const prefix = ts.isGetAccessorDeclaration(m) ? 'get ' : ts.isSetAccessorDeclaration(m) ? 'set ' : '';
      const star = ts.isMethodDeclaration(m) && m.asteriskToken ? '*' : '';
      const q = ts.isMethodDeclaration(m) && m.questionToken ? '?' : '';
      const rt = ts.isSetAccessorDeclaration(m) ? '' : star ? (m.type ? `: ${text(m.type)}` : ': any') : retType(m, isAsync);
      const sig = `${prefix}${star}${text(m.name)}${q}${typeParams(m.typeParameters)}(${params(m.parameters)})${rt}`;
      if (!m.body) return join(decos(m), mods(m), `${sig};`);
      const body = ts.isSetAccessorDeclaration(m) ? '{}' : stubBody(`${className}.${text(m.name)}`, false);
      return join(decos(m), mods(m, [ts.SyntaxKind.AsyncKeyword]), `${sig} ${body}`);
    }
    return text(m);
  };

  const classDecl = (c: ts.ClassDeclaration | ts.ClassExpression): string => {
    const name = c.name ? c.name.text : 'AnonymousClass';
    const heritage = (c.heritageClauses ?? []).map(text).join(' ');
    const hasExtends = (c.heritageClauses ?? []).some((h) => h.token === ts.SyntaxKind.ExtendsKeyword);
    const members = c.members.map((m) => classMember(m, name, hasExtends)).filter((x): x is string => !!x);
    return join(decos(c), mods(c), `class ${c.name ? c.name.text : ''}${typeParams(c.typeParameters)} ${heritage} {\n${members.map((x) => `  ${x}`).join('\n')}\n}`);
  };

  const isComponentName = (name: string) => isTsx && /^[A-Z]/.test(name);

  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || ts.isImportEqualsDeclaration(st)) {
      out.push(text(st));
    } else if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) {
      out.push(text(st));
    } else if (
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      ts.isEnumDeclaration(st) ||
      ts.isModuleDeclaration(st)
    ) {
      out.push(text(st));
    } else if (ts.isFunctionDeclaration(st)) {
      const name = st.name?.text ?? 'default';
      const isAsync = isAsyncNode(st);
      const sig = `function${st.asteriskToken ? '*' : ''} ${st.name ? st.name.text : ''}${typeParams(st.typeParameters)}(${params(st.parameters)})${st.asteriskToken ? (st.type ? `: ${text(st.type)}` : ': any') : retType(st, isAsync)}`;
      const m = mods(st, [ts.SyntaxKind.AsyncKeyword]);
      out.push(st.body ? join(m, `${sig} ${stubBody(name, isComponentName(name))}`) : join(m, `${sig};`));
    } else if (ts.isClassDeclaration(st)) {
      out.push(classDecl(st));
    } else if (ts.isVariableStatement(st)) {
      const keyword = st.declarationList.flags & ts.NodeFlags.Const ? 'const' : 'let';
      const m = mods(st);
      for (const d of st.declarationList.declarations) {
        const name = ts.isIdentifier(d.name) ? d.name.text : null;
        if (!name) {
          // destructuring at module level: declare each binding as any
          const names: string[] = [];
          const collect = (b: ts.BindingName) => {
            if (ts.isIdentifier(b)) names.push(b.text);
            else b.elements.forEach((e) => !ts.isOmittedExpression(e) && collect(e.name));
          };
          collect(d.name);
          names.forEach((n) => out.push(join(m, `${keyword} ${n}: any = undefined as any;`)));
          continue;
        }
        const init = d.initializer;
        const unwrapped = init && (ts.isParenthesizedExpression(init) ? init.expression : init);
        if (unwrapped && (ts.isArrowFunction(unwrapped) || ts.isFunctionExpression(unwrapped))) {
          const fn = unwrapped;
          const isAsync = isAsyncNode(fn);
          if (d.type) {
            out.push(join(m, `${keyword} ${name}: ${text(d.type)} = ((..._args: any[]): any => ${stubBody(name, isComponentName(name))}) as any;`));
          } else {
            out.push(
              join(
                m,
                `${keyword} ${name} = ${typeParams(fn.typeParameters)}(${params(fn.parameters)})${retType(fn, isAsync)} => ${stubBody(name, isComponentName(name))};`,
              ),
            );
          }
        } else if (unwrapped && ts.isClassExpression(unwrapped)) {
          out.push(join(m, `${keyword} ${name} = ${classDecl(unwrapped)};`));
        } else if (init && isPureData(init)) {
          out.push(join(m, `${keyword} ${name}${d.type ? `: ${text(d.type)}` : ''} = ${text(init)};`));
        } else {
          out.push(join(m, `${keyword} ${name}: ${d.type ? text(d.type) : 'any'} = undefined as any;`));
        }
      }
    } else if (
      ts.isExpressionStatement(st) &&
      ts.isCallExpression(st.expression) &&
      /^(registerEnumType|registerClassType)$/.test(st.expression.expression.getText(sf))
    ) {
      // GraphQL enum registration is declarative and needed by the kept DTOs.
      out.push(text(st));
    }
    // every other top-level statement (side effects, logic) is dropped
  }

  // Prune imports that are no longer referenced.
  const importLines = out.filter((l) => l.startsWith('import'));
  const bodyText = out.filter((l) => !l.startsWith('import')).join('\n');
  const used = (id: string) => new RegExp(`(^|[^A-Za-z0-9_$.])${id.replace(/\$/g, '\\$')}([^A-Za-z0-9_$]|$)`).test(bodyText);
  const prunedImports: string[] = [];
  for (const line of importLines) {
    const isf = ts.createSourceFile('x.ts', line, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const decl = isf.statements[0];
    if (!decl || !ts.isImportDeclaration(decl)) {
      prunedImports.push(line);
      continue;
    }
    const clause = decl.importClause;
    if (!clause) continue; // side-effect import: drop
    const spec = decl.moduleSpecifier.getText(isf);
    const typeOnly = clause.isTypeOnly ? 'type ' : '';
    const parts: string[] = [];
    if (clause.name && used(clause.name.text)) parts.push(clause.name.text);
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        if (used(clause.namedBindings.name.text)) parts.push(`* as ${clause.namedBindings.name.text}`);
      } else {
        const keep = clause.namedBindings.elements.filter((e) => used(e.name.text)).map((e) => e.getText(isf));
        if (keep.length) parts.push(`{ ${keep.join(', ')} }`);
      }
    }
    if (parts.length) prunedImports.push(`import ${typeOnly}${parts.join(', ')} from ${spec};`);
  }
  if (needsFrontHelper) prunedImports.push(`import { enterpriseStubValue } from '~/growth-os/enterpriseStubValue';`);

  const header = `/* ${STUB_TAG}: AGPL-3.0 stub generated by scripts/strip-enterprise.ts.\n * The Enterprise-licensed implementation was removed. Only names and type\n * signatures remain so the AGPL code compiles. Do not edit by hand. */\n`;
  const result = `${header}\n${prunedImports.join('\n')}\n\n${out.filter((l) => !l.startsWith('import')).join('\n\n')}\n`;
  return result.replace(/\n{3,}/g, '\n\n');
};

const FRONT_HELPER_SOURCE = `// Growth OS CRM (AGPL-3.0): inert value returned by stubs of removed
// Enterprise front-end modules. Any property access or call yields the same
// inert value; iteration yields nothing; it is never thenable.
const handler: ProxyHandler<() => void> = {
  get: (_target, key) => {
    if (key === Symbol.iterator) return function* () {};
    if (key === Symbol.toPrimitive) return () => '';
    if (key === 'then') return undefined;
    if (key === 'length') return 0;
    return inert;
  },
  apply: () => inert,
};

const inert: any = new Proxy(() => undefined, handler);

export const enterpriseStubValue = (): any => inert;
`;

// ---------------------------------------------------------------- main

const main = () => {
  const files = listFiles();
  const sourceFiles = files.filter((f) => SOURCE_EXT.test(f));
  const known = new Set(sourceFiles);
  const content = new Map<string, string>();
  const read = (f: string) => {
    if (!content.has(f)) content.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8'));
    return content.get(f)!;
  };

  const markerFiles = files.filter((f) => !MARKER_ALLOWLIST.has(f) && /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts|graphql|json|md)$/.test(f) && hasMarker(read(f)));
  if (CHECK_ONLY) {
    if (markerFiles.length) {
      console.error(`strip-enterprise --check: ${markerFiles.length} file(s) still carry the Enterprise marker:`);
      markerFiles.forEach((f) => console.error(`  ${f}`));
      process.exit(1);
    }
    const stubs = sourceFiles.filter((f) => read(f).includes(STUB_TAG)).length;
    console.log(`strip-enterprise --check: OK, no Enterprise files left (${stubs} generated stubs present).`);
    return;
  }

  const enterprise = new Set(markerFiles.filter((f) => SOURCE_EXT.test(f)));
  const nonSourceEnterprise = markerFiles.filter((f) => !SOURCE_EXT.test(f));

  // AGPL test/story files importing Enterprise code are removed with it.
  const importsOf = new Map<string, string[]>();
  const importsFor = (f: string, src?: string) => {
    if (!src && importsOf.has(f)) return importsOf.get(f)!;
    const r = specifiersOf(src ?? read(f))
      .map((s) => resolveSpecifier(f, s, known))
      .filter((x): x is string => !!x);
    if (!src) importsOf.set(f, r);
    return r;
  };
  const deletedAgplTests = sourceFiles.filter(
    (f) => !enterprise.has(f) && isTestLike(f) && importsFor(f).some((t) => enterprise.has(t)),
  );
  const deletedSet = new Set(deletedAgplTests);

  // Generate stubs for every non-test Enterprise file, then keep only the
  // ones reachable from remaining AGPL code.
  const stubs = new Map<string, string>();
  for (const f of enterprise) {
    if (isTestLike(f)) continue;
    try {
      stubs.set(f, generateStub(f, read(f)));
    } catch (e) {
      console.error(`stub generation failed for ${f}: ${(e as Error).message}`);
      process.exit(1);
    }
  }
  const needed = new Set<string>();
  const queue: string[] = [];
  const visit = (target: string) => {
    if (enterprise.has(target) && !needed.has(target) && stubs.has(target)) {
      needed.add(target);
      queue.push(target);
    }
  };
  for (const f of sourceFiles) {
    if (enterprise.has(f) || deletedSet.has(f)) continue;
    importsFor(f).forEach(visit);
  }
  while (queue.length) {
    const f = queue.pop()!;
    importsFor(f, stubs.get(f)).forEach(visit);
  }
  const deletedEnterprise = [...enterprise].filter((f) => !needed.has(f));
  const stubbed = [...needed].sort();

  console.log(`Enterprise files found:      ${enterprise.size}`);
  console.log(`  stubbed (needed by AGPL):  ${stubbed.length}`);
  console.log(`  deleted:                   ${deletedEnterprise.length}`);
  console.log(`AGPL tests/stories deleted:  ${deletedAgplTests.length}`);
  if (nonSourceEnterprise.length) console.log(`Non-source marker files:     ${nonSourceEnterprise.length} (deleted)`);

  if (DRY_RUN) return;

  for (const f of [...deletedEnterprise, ...deletedAgplTests, ...nonSourceEnterprise]) fs.rmSync(path.join(ROOT, f));
  for (const f of stubbed) fs.writeFileSync(path.join(ROOT, f), stubs.get(f)!);
  if (stubbed.some((f) => flavorOf(f) === 'front')) {
    fs.mkdirSync(path.dirname(path.join(ROOT, FRONT_STUB_HELPER)), { recursive: true });
    fs.writeFileSync(path.join(ROOT, FRONT_STUB_HELPER), FRONT_HELPER_SOURCE);
  }

  // Cumulative manifest (union across runs / upstream merges).
  const prev = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { runs: [] };
  const union = (a: string[] = [], b: string[]) => [...new Set([...a, ...b])].sort();
  let upstreamRef = 'unknown';
  try {
    upstreamRef = execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'twenty/v*'], { cwd: ROOT }).toString().trim();
  } catch {}
  const manifest = {
    note: 'Generated by scripts/strip-enterprise.ts. Lists every path stripped from upstream Twenty.',
    stubbed: union(prev.stubbed, stubbed).filter((f: string) => fs.existsSync(path.join(ROOT, f))),
    deletedEnterprise: union(prev.deletedEnterprise, [...deletedEnterprise, ...nonSourceEnterprise]),
    deletedAgplTests: union(prev.deletedAgplTests, deletedAgplTests),
    runs: [
      ...prev.runs,
      {
        date: new Date().toISOString(),
        upstreamRef,
        found: enterprise.size + nonSourceEnterprise.length,
        stubbed: stubbed.length,
        deletedEnterprise: deletedEnterprise.length + nonSourceEnterprise.length,
        deletedAgplTests: deletedAgplTests.length,
      },
    ],
  };
  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  writeReport(manifest);
  console.log('Wrote enterprise-strip-manifest.json and ENTERPRISE-STRIP.md');
};

const writeReport = (m: any) => {
  const group = (list: string[]) => {
    const g = new Map<string, number>();
    for (const f of list) {
      const key = f.split('/').slice(0, 6).join('/');
      g.set(key, (g.get(key) ?? 0) + 1);
    }
    return [...g.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | ${v} |`).join('\n');
  };
  const last = m.runs[m.runs.length - 1];
  const md = `# Enterprise strip

Growth OS CRM ships **AGPL-3.0 code only**. Upstream Twenty marks
commercially licensed files with a \`/* ${MARKER} */\` header. Those files are
not licensed to us (we have no Twenty license key and will not get one), so
\`scripts/strip-enterprise.ts\` removes them on every upstream merge.

## What the script does

1. Finds every file under \`packages/\` that carries the marker.
2. **Deletes** Enterprise files that no remaining AGPL file imports
   (directly or through other stubs).
3. **Stubs** Enterprise files that AGPL code still imports. A stub is generated
   mechanically from the TypeScript AST and keeps only exported names, type
   declarations, enums, decorators and method signatures. Every function and
   method body is replaced:
   - server: \`throw new Error('... is an Enterprise feature and was removed')\`
     (fail closed),
   - front: components render \`null\`, other functions return an inert value
     (\`packages/twenty-front/src/growth-os/enterpriseStubValue.ts\`).
   Stubs carry the \`${STUB_TAG}\` tag and must not be edited by hand.
4. **Deletes** AGPL test and story files that import Enterprise code.
5. Updates \`enterprise-strip-manifest.json\` (full path list) and this file.

\`npx tsx scripts/strip-enterprise.ts --check\` fails if any marked file is left;
CI runs it on every push.

## Last run

- Upstream ref: \`${last.upstreamRef}\`
- Marked files found: **${last.found}**
- Stubbed: **${last.stubbed}**
- Deleted Enterprise files: **${last.deletedEnterprise}**
- Deleted AGPL tests/stories that imported Enterprise code: **${last.deletedAgplTests}**

## Known consequences (follow-up work)

Stubs make the code compile; they do not restore behaviour. Areas where AGPL
code still calls into a stub at runtime must be rewired to AGPL code paths
(or our own AGPL reimplementation) before production. See the stub list below
and the follow-up section in the README / build briefs. Highest impact:

- \`engine/permissions/**\`: since upstream PR #30007 (2026-11-09) the record
  permission read layer is Enterprise. Server stubs throw, so ORM paths that
  call it fail closed until an AGPL permission layer is in place.
- \`engine/core-modules/billing/**\`, \`usage/**\`, \`usage-limit/**\`: billing is
  disabled (\`IS_BILLING_ENABLED=false\`); Growth OS billing lives in the separate
  growth-os-billing service.
- \`engine/core-modules/sso/**\`, custom domains, row-level permissions, record
  sharing, validation rules: features removed.

## Stubbed files by area

| Path | Files |
| --- | --- |
${group(m.stubbed)}

## Deleted Enterprise files by area

| Path | Files |
| --- | --- |
${group(m.deletedEnterprise)}

Full lists: \`enterprise-strip-manifest.json\`.

## After an upstream merge

1. \`git fetch upstream --tags && git merge twenty/vX.Y.Z\`.
2. For conflicts on stubbed or deleted Enterprise files, take upstream's version
   (\`git checkout --theirs <file>\`); the script re-strips it.
3. \`npx tsx scripts/strip-enterprise.ts\`, then typecheck server and front.
4. Commit with the upstream tag in the message.
`;
  fs.writeFileSync(REPORT, md);
};

main();
