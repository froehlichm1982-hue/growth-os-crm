#!/usr/bin/env node
// Growth OS CRM: auth art panel check (no clipped, ellipsised or overlapped text in ANY auth state).
//   node scripts/growth-os-check-auth-art.mjs [baseUrl=http://localhost:3000]
// Opens the sign-in and sign-up screens (default + e-mail step) at 1440x900 and 1280x720, light + dark, EN + DE,
// and fails (exit 1) when the art panel has text-overflow:ellipsis, scroll-clipped text, text cut by an overflow
// ancestor, text past its card edge, or text under a tag or another card. Needs playwright-core
// (PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs) and Chrome (CHROME=/usr/bin/google-chrome).
// The same check runs inside the screenshot tool for every auth shot (error list `ART`).
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core');

// Art-panel text check (auth screens, desktop where the panel shows): ellipsis, scroll clip, text cut by an
// overflow ancestor (incl. the art column itself), text outside the art column, text past its card edge,
// text under a tag or under another card. [] = clean, null = panel not shown.
const artCheck = () => {
  const art = document.querySelector('.gos-auth-art'); if (!art || getComputedStyle(art).display === 'none') return null;
  const out = []; const ar = art.getBoundingClientRect();
  const clippers = (el) => { const r = []; for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') r.push(n); } return r; };
  const tags = [...art.querySelectorAll('.tag')]; const cards = [...art.querySelectorAll('.gos-auth-card')];
  const z = (c) => Number(getComputedStyle(c).zIndex) || 0;
  const w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const tn = w.currentNode; if (!tn.textContent.trim()) continue; const el = tn.parentElement; const cs = getComputedStyle(el);
    const rg = document.createRange(); rg.selectNodeContents(tn); const rects = [...rg.getClientRects()].filter((r) => r.width > 0 && r.height > 0); if (!rects.length) continue;
    const t = tn.textContent.trim().slice(0, 32);
    if (cs.textOverflow === 'ellipsis') out.push({ k: 'ellipsis', t });
    if (cs.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) out.push({ k: 'scroll-clip', t });
    const card = el.closest('.gos-auth-card'); const ownTag = el.closest('.tag');
    for (const r of rects) {
      for (const a of clippers(el)) { const b = a.getBoundingClientRect(); if (r.left < b.left - 0.5 || r.right > b.right + 0.5 || r.top < b.top - 0.5 || r.bottom > b.bottom + 0.5) { out.push({ k: 'clipped-by', t, by: String(a.className).slice(0, 28) }); break; } }
      if (r.right > ar.right + 0.5 || r.bottom > ar.bottom + 0.5 || r.left < ar.left - 0.5 || r.top < ar.top - 0.5) out.push({ k: 'outside-art', t });
      if (card && !ownTag) { const cb = card.getBoundingClientRect(); if (r.right > cb.right - 4 || r.left < cb.left + 4) out.push({ k: 'past-card-edge', t }); }
      if (!ownTag) for (const tg of tags) { const b = tg.getBoundingClientRect(); if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) out.push({ k: 'under-tag', t }); }
      for (const c of cards) { if (c === card || z(c) <= (card ? z(card) : 0)) continue; const b = c.getBoundingClientRect(); if (r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top) out.push({ k: 'under-card', t }); }
    }
  }
  return [...new Map(out.map((o) => [o.k + o.t, o])).values()];
};

const screens = [['signin', '/welcome'], ['signup', '/welcome?mode=signup']];
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let bad = 0, shown = 0;
for (const locale of ['en-US', 'de-DE']) for (const scheme of ['light', 'dark']) for (const [w, h] of [[1440, 900], [1280, 720], [1024, 768], [1920, 1080]]) for (const [name, path] of screens) {
  const ctx = await browser.newContext({ locale, viewport: { width: w, height: h }, colorScheme: scheme });
  const p = await ctx.newPage(); await p.goto(BASE + path); await p.waitForTimeout(3500);
  for (const step of ['default', 'email']) {
    if (step === 'email') { const b = p.getByRole('button', { name: /E-Mail|Email/i }); if (await b.count()) { await b.first().click(); await p.waitForTimeout(700); } else continue; }
    const r = await p.evaluate(artCheck);
    const tag = `${name}/${step} ${w}x${h} ${scheme} ${locale}`;
    if (r === null) { console.log('SKIP (panel hidden)', tag); continue; }
    shown++; if (r.length) { bad++; console.log('FAIL', tag, JSON.stringify(r)); } else console.log('ok  ', tag);
  }
  await ctx.close();
}
await browser.close();
if (!shown) { console.log('no art panel was shown'); process.exit(1); }
process.exit(bad ? 1 : 0);
