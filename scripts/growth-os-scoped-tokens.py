#!/usr/bin/env python3
"""Derive the CRM's :root token sheet from the DS CRM-scoped build (never edit the output by hand).

gos.scoped.css puts every rule under `.gos`, tokens included. The Twenty app declares its theme bridge
(`--t-*: var(--gos-*)`, gosOverrides.ts) on <html>, so the *custom properties* must exist on <html> while every
other DS rule stays under `.gos` (mounted on DS screens and portals only, so upstream screens are untouched).
This script copies only the rules that consist of custom properties (+ color-scheme) for the root selectors:
  .gos, .gos[data-theme=X], [data-theme=X] .gos      ->  :root, :root[data-theme=X]
  .gos [data-m=M], .gos[data-m=M]                    ->  [data-m=M]
(including their @media wrappers: prefers-color-scheme for data-theme=system, reduced motion), plus the @font-face
blocks under their original names ("Geist", "Geist Mono", "Geist Fallback"), which the app theme and the bridge use.
usage: growth-os-scoped-tokens.py <gos.scoped.css> <out.css>
"""
import re, sys

src = open(sys.argv[1]).read()
# split top-level rules
rules, depth, start = [], 0, 0
for i, ch in enumerate(src):
    if ch == '{': depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            rules.append(re.sub(r'^(\s*/\*.*?\*/)+', '', src[start:i + 1], flags=re.S).strip()); start = i + 1

def only_vars(body):
    decls = [d.strip() for d in body.split(';') if d.strip()]
    return bool(decls) and all(d.startswith('--') or d.startswith('color-scheme') for d in decls)

def map_selector(sel):
    sel = sel.strip()
    m = re.fullmatch(r'\.gos', sel)
    if m: return ':root'
    m = re.fullmatch(r'\.gos\[(data-theme(?:="[a-z]+")?)\]', sel) or re.fullmatch(r'\[(data-theme(?:="[a-z]+")?)\] \.gos', sel)
    if m: return ':root[' + m.group(1) + ']'
    m = re.fullmatch(r'\.gos \[data-m="([a-z]+)"\]', sel)
    if m: return '[data-m="' + m.group(1) + '"]'
    m = re.fullmatch(r'\.gos\[data-m="([a-z]+)"\]', sel)
    if m: return '[data-m="' + m.group(1) + '"]'
    return None

def convert(rule):
    head, body = rule.split('{', 1); body = body[:-1]
    if not only_vars(body): return None
    sels = [map_selector(s) for s in head.split(',')]
    if any(s is None for s in sels): return None
    out = []
    for s in sels:
        if s not in out: out.append(s)
    body = body.replace('"GOS Geist', '"Geist')  # families keep their pre-v2.9 names on :root (the @font-face blocks below)
    return ', '.join(out) + '{' + body + '}'

out, n = [], 0
for r in rules:
    head = r.split('{', 1)[0].strip()
    if head.startswith('@media'):
        inner = r[r.index('{') + 1:-1]
        parts, d, st = [], 0, 0
        for i, ch in enumerate(inner):
            if ch == '{': d += 1
            elif ch == '}':
                d -= 1
                if d == 0: parts.append(inner[st:i + 1].strip()); st = i + 1
        conv = [c for c in (convert(p) for p in parts) if c]
        if conv: out.append(head + '{' + ''.join(conv) + '}'); n += len(conv)
    elif head.startswith('@font-face'):
        # The app theme names the families "Geist" / "Geist Mono" (crm-theme); the scoped build renames them "GOS Geist*".
        out.append(r.replace('"GOS ', '"')); n += 1
    elif not head.startswith('@'):
        c = convert(r)
        if c: out.append(c); n += 1
hdr = '/* Growth OS CRM: DS v2.9 token custom properties on :root. GENERATED from gos.scoped.css by scripts/growth-os-scoped-tokens.py (run by scripts/growth-os-sync-design-system.sh). Never edit by hand. Custom properties only: every other DS rule stays under .gos. */\n'
open(sys.argv[2], 'w').write(hdr + '\n'.join(out) + '\n')
print(f'{n} token rules -> {sys.argv[2]}')
