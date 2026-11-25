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

// Hand-written AGPL replacements for specific Enterprise files, at the same
// repo-relative path. Used instead of the generated stub (see README there).
const OVERRIDES_DIR = path.join(ROOT, 'scripts/enterprise-overrides');
const OVERRIDE_TAG = '@growth-os-enterprise-override';
const overrideFor = (f: string): string | null => {
  const p = path.join(OVERRIDES_DIR, f);
  if (!fs.existsSync(p)) return null;
  const body = fs.readFileSync(p, 'utf8');
  return `/* ${OVERRIDE_TAG} ${STUB_TAG}: AGPL-3.0, written for Growth OS CRM.\n * Replaces a stripped Enterprise file; source: scripts/enterprise-overrides/${f}.\n * Do not edit here, edit the override and re-run scripts/strip-enterprise.ts. */\n\n${body}`;
};

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

const isSpecLike = (f: string) => /(\.spec\.|\.test\.|\.stories\.|-spec\.)/.test(f);

const isTestLike = (f: string) =>
  isSpecLike(f) ||
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
const isPureData = (node: ts.Expression, allowCall: (callee: string) => boolean = () => false): boolean => {
  const pure = (n: ts.Expression) => isPureData(n, allowCall);
  if (PURE_KINDS.has(node.kind)) return true;
  // Calls into AGPL/npm helpers with plain-data arguments, e.g.
  // appendCommonExceptionCode({...}), createAtomState<T>({ key, defaultValue }).
  if (ts.isCallExpression(node))
    return allowCall(node.expression.getText()) && node.arguments.every((a) => pure(a));
  if (ts.isTaggedTemplateExpression(node))
    return allowCall(node.tag.getText()) && ts.isNoSubstitutionTemplateLiteral(node.template);
  if (ts.isPrefixUnaryExpression(node)) return pure(node.operand);
  if (ts.isParenthesizedExpression(node)) return pure(node.expression);
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isTypeAssertionExpression(node))
    return pure(node.expression);
  if (ts.isPropertyAccessExpression(node)) return pure(node.expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((e) => pure(e as ts.Expression));
  if (ts.isSpreadElement(node)) return pure(node.expression);
  if (ts.isObjectLiteralExpression(node))
    return node.properties.every((p) => {
      if (ts.isShorthandPropertyAssignment(p)) return true;
      if (ts.isSpreadAssignment(p)) return pure(p.expression);
      if (ts.isPropertyAssignment(p))
        return (!ts.isComputedPropertyName(p.name) || pure(p.name.expression)) && pure(p.initializer);
      return false;
    });
  return false;
};

type StubFlavor = 'server' | 'front' | 'shared';

const NEST_LIFECYCLE_HOOKS = new Set([
  'onModuleInit',
  'onModuleDestroy',
  'onApplicationBootstrap',
  'onApplicationShutdown',
  'beforeApplicationShutdown',
]);

const flavorOf = (f: string): StubFlavor =>
  f.startsWith('packages/twenty-front/') ? 'front' : f.startsWith('packages/twenty-server/') ? 'server' : 'shared';

const generateStub = (file: string, source: string, isEnterpriseSpecifier: (spec: string) => boolean): string => {
  const flavor = flavorOf(file);
  const isTsx = file.endsWith('.tsx');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const text = (n: ts.Node) => n.getText(sf);
  const out: string[] = [];
  let needsFrontHelper = false;

  // identifier -> module specifier, for imported names
  const importedFrom = new Map<string, string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const spec = (st.moduleSpecifier as ts.StringLiteral).text;
    const c = st.importClause;
    if (c.name) importedFrom.set(c.name.text, spec);
    if (c.namedBindings) {
      if (ts.isNamespaceImport(c.namedBindings)) importedFrom.set(c.namedBindings.name.text, spec);
      else c.namedBindings.elements.forEach((e) => importedFrom.set(e.name.text, spec));
    }
  }
  const GLOBAL_PURE_CALLS = new Set(['Object.freeze', 'Symbol', 'Symbol.for']);
  const allowCall = (callee: string) => {
    if (GLOBAL_PURE_CALLS.has(callee)) return true;
    const root = callee.split('.')[0].split('<')[0];
    const spec = importedFrom.get(root);
    return !!spec && !isEnterpriseSpecifier(spec);
  };

  const anyType = 'any';
  const stubBody = (name: string, isComponent: boolean, isCtor = false, superCall = ''): string => {
    if (isCtor) return `{${superCall ? ` ${superCall}` : ''} }`;
    if (flavor === 'front') {
      if (isComponent) return '{\n  return null;\n}';
      needsFrontHelper = true;
      return '{\n  return enterpriseStubValue();\n}';
    }
    // PascalCase server functions are decorator factories (@IsBillingPlansConfig()).
    // They run at class-definition time, so they must not throw: return a no-op.
    if (/^[A-Z][A-Za-z0-9]*$/.test(name)) return '{\n  return ((..._args: any[]) => undefined) as any;\n}';
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
      const superCall = hasHeritage ? '\n    // @ts-ignore stub forwards its arguments unchanged\n    super(...(arguments as any));\n  ' : '';
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
      const methodName = text(m.name);
      const paramNames = m.parameters.map((p, i) => (ts.isIdentifier(p.name) ? p.name.text : `_p${i}`));
      let body: string;
      if (ts.isSetAccessorDeclaration(m)) body = '{}';
      else if (flavor === 'server' && NEST_LIFECYCLE_HOOKS.has(methodName))
        // Lifecycle hooks of removed features do nothing, so the app still boots.
        body = '{\n  return undefined as any;\n}';
      else if (flavor === 'server' && methodName === 'use' && paramNames.length === 3)
        // Express/Nest middleware of a removed feature: pass the request on.
        body = `{\n  return (${paramNames[2]} as any)();\n}`;
      else if (flavor === 'server' && methodName === 'intercept' && paramNames.length === 2)
        // Interceptor of a removed feature: continue the handler chain.
        body = `{\n  return (${paramNames[1]} as any).handle();\n}`;
      else body = stubBody(`${className}.${methodName}`, false);
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
        } else if (init && isPureData(init, allowCall)) {
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
  if (!markerFiles.length) {
    console.log('strip-enterprise: nothing to strip (tree is already AGPL-only).');
    return;
  }

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
  // Spec/story files that import Enterprise code are removed with it.
  const deletedSet = new Set(
    sourceFiles.filter((f) => !enterprise.has(f) && isSpecLike(f) && importsFor(f).some((t) => enterprise.has(t))),
  );

  // Generate stubs for every non-test Enterprise file.
  const stubs = new Map<string, string>();
  for (const f of enterprise) {
    if (isTestLike(f)) continue;
    try {
      const override = overrideFor(f);
      if (override) {
        stubs.set(f, override);
        continue;
      }
      stubs.set(
        f,
        generateStub(f, read(f), (spec) => {
          const t = resolveSpecifier(f, spec, known);
          return !!t && enterprise.has(t);
        }),
      );
    } catch (e) {
      console.error(`stub generation failed for ${f}: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  // Keep only the stubs reachable from remaining AGPL code; then drop test
  // helpers that import something deleted, until stable.
  let needed = new Set<string>();
  for (;;) {
    needed = new Set<string>();
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
    const isDeleted = (t: string) => deletedSet.has(t) || (enterprise.has(t) && !needed.has(t));
    const more = sourceFiles.filter(
      (f) => !enterprise.has(f) && !deletedSet.has(f) && isTestLike(f) && importsFor(f).some(isDeleted),
    );
    if (!more.length) break;
    more.forEach((f) => deletedSet.add(f));
  }
  const deletedAgplTests = [...deletedSet].sort();
  const deletedEnterprise = [...enterprise].filter((f) => !needed.has(f));
  const stubbed = [...needed].sort();
  const overridden = stubbed.filter((f) => !!overrideFor(f));

  console.log(`Enterprise files found:      ${enterprise.size}`);
  console.log(`  stubbed (needed by AGPL):  ${stubbed.length}`);
  console.log(`    of which AGPL overrides: ${overridden.length}`);
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

  // Best-effort formatting of generated stubs with the repo formatter.
  try {
    for (let i = 0; i < stubbed.length; i += 200)
      execFileSync('npx', ['oxfmt', ...stubbed.slice(i, i + 200)], { cwd: ROOT, stdio: 'ignore' });
  } catch {
    console.warn('oxfmt not available or failed; stubs left unformatted.');
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
    overridden: union(prev.overridden, overridden).filter((f: string) => fs.existsSync(path.join(ROOT, f))),
    deletedEnterprise: union(prev.deletedEnterprise, [...deletedEnterprise, ...nonSourceEnterprise]),
    deletedAgplTests: union(prev.deletedAgplTests, deletedAgplTests),
    runs: [
      ...prev.runs,
      {
        date: new Date().toISOString(),
        upstreamRef,
        found: enterprise.size + nonSourceEnterprise.length,
        stubbed: stubbed.length,
        overridden: overridden.length,
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
- Stubbed: **${last.stubbed}** (of which hand-written AGPL overrides: **${last.overridden ?? 0}**, listed below)
- Deleted Enterprise files: **${last.deletedEnterprise}**
- Deleted AGPL tests/stories that imported Enterprise code: **${last.deletedAgplTests}**

## Known consequences (follow-up work)

Stubs make the code compile; they do not restore behaviour. Areas where AGPL
code still calls into a stub at runtime must be rewired to AGPL code paths
(or our own AGPL reimplementation) before production. See the stub list below
and the follow-up section in the README / build briefs. Highest impact:

- Base is \`twenty/v2.40.2\` on purpose. From v2.41 upstream puts record
  sharing / object readability gating, and from v2.55-v2.58 (#29787, #29824,
  #30007) the core record-permission checks, into Enterprise files on the ORM
  hot path. **Upgrading past v2.40.x requires our own AGPL permission layer.**
  \`scripts/check-permission-hot-path.ts\` enforces this, and the upstream-sync
  workflow only reports newer releases.
- Row-level permissions (RLS) are an Enterprise feature and are off: the three
  RLS utilities the ORM calls are AGPL overrides that apply no row filter.
- \`engine/core-modules/billing/**\`, \`usage/**\`, \`usage-limit/**\`: billing is
  disabled (\`IS_BILLING_ENABLED=false\`); Growth OS billing lives in the separate
  growth-os-billing service.
- \`engine/core-modules/sso/**\`, custom domains, row-level permissions, record
  sharing, validation rules: features removed.

## AGPL overrides

Hand-written replacements in \`scripts/enterprise-overrides/\` for Enterprise files
on the hot path, giving the "feature removed" behaviour instead of a throwing
stub:

${(m.overridden ?? []).map((f: string) => `- \`${f}\``).join('\n') || '- none'}

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
