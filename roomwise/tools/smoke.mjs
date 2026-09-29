// End-to-end smoke test of the app against the real CDN, in real browser engines.
// Walks the whole flow (sample room, budget, design, views, lighting, a product, the shop)
// and reports every console error, page error and failed request, with screenshots.
//
//   node smoke.mjs http://127.0.0.1:8000/index.html
//
// Runs in GitHub Actions (.github/workflows/app-smoke.yml) on Chromium (desktop and Android)
// and WebKit (the engine of Safari on iPhone).
import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8000/index.html';
mkdirSync('shots', { recursive: true });

const RUNS = [
  { name: 'chrome-desktop', engine: chromium, context: { viewport: { width: 1366, height: 860 } } },
  { name: 'chrome-android', engine: chromium, context: devices['Pixel 7'] },
  { name: 'safari-iphone', engine: webkit, context: devices['iPhone 14'] },
];

let failures = 0;
for (const run of RUNS) {
  const problems = [];
  const t0 = Date.now();
  let browser;
  try {
    browser = await run.engine.launch({ args: run.engine === chromium ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
    const ctx = await browser.newContext(run.context);
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text().slice(0, 300)}`); });
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message.slice(0, 300)} ${String(e.stack ?? '').split('\n').slice(0, 3).join(' | ').slice(0, 300)}`));
    page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ''}`));
    const tap = (sel) => page.locator(sel).first().click({ timeout: 20000 });
    const step = async (label, fn, wait = 1500) => {
      const s = Date.now();
      try { await fn(); await page.waitForTimeout(wait); console.log(`STEP ${run.name} ${label} ok ${Date.now() - s}ms`); } catch (e) { problems.push(`step ${label}: ${e.message.split('\n')[0].slice(0, 200)}`); console.log(`STEP ${run.name} ${label} FAILED`); }
      await page.screenshot({ path: `shots/${run.name}-${label}.png` }).catch(() => {});
    };
    await step('load', () => page.goto(BASE, { waitUntil: 'load', timeout: 60000 }), 4000);
    const gl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); return g ? `${g.getParameter(g.VERSION)} | ${g.getParameter(g.SHADING_LANGUAGE_VERSION)}` : 'no webgl2'; });
    console.log(`INFO ${run.name} ${gl}`);
    await step('sample', () => tap('#useSample'));
    await step('budget', () => tap('[data-panel=measure] [data-go=budget]'), 4000);
    await step('design', () => tap('.tier--basic'), 8000);
    const total = await page.locator('#total').textContent().catch(() => '?');
    console.log(`INFO ${run.name} total ${total}`);
    await step('walk', () => tap('#viewBar [data-view=walk]'), 3000);
    await step('evening', () => tap('[data-mood=evening]'), 2500);
    await step('day', () => tap('[data-mood=day]'), 1500);
    await step('room', () => tap('#viewBar [data-view=room]'), 2500);
    await step('pieces', () => tap('[data-tab=pieces]'), 500);
    await step('product', () => tap('#pieces .piece-main'), 2500);
    await step('back', () => tap('#productBack'), 800);
    await step('shop', () => tap('[data-tab=shop]'), 800);
    await step('photo-view', () => tap('#viewBar [data-view=photo]'), 2500);
    await step('luxury', () => tap('#tierSwitch button:nth-child(2)'), 6000);
    const err = await page.locator('#stageError').isVisible().catch(() => false);
    if (err) problems.push(`stage error shown: ${await page.locator('#stageError').textContent()}`);
    await browser.close();
  } catch (e) {
    problems.push(`crash: ${e.message.split('\n')[0]}`);
    await browser?.close().catch(() => {});
  }
  const real = problems.filter((p) => !/fonts\.g/.test(p));
  console.log(`RESULT ${run.name} ${real.length ? 'PROBLEMS' : 'OK'} in ${Math.round((Date.now() - t0) / 1000)}s`);
  real.forEach((p) => console.log(`  ${p}`));
  if (real.length) failures++;
}
process.exitCode = failures ? 1 : 0;
