// Opens every product link in a real browser and reports whether the page loads,
// with the page title, the price found on the page and any size text.
//
//   node check-links.mjs                 check every product in js/catalog.js
//   node check-links.mjs --file urls.txt check a plain list of URLs
//   node check-links.mjs --json out.json also write the full report as JSON
//
// Runs in GitHub Actions (.github/workflows/check-links.yml) or on any computer with
// Playwright installed: npm i playwright && npx playwright install chromium
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };

async function targets() {
  const file = opt('--file');
  if (file) {
    return readFileSync(file, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
      .map((url, i) => ({ id: `url-${i + 1}`, url }));
  }
  const { allLinks } = await import('../js/catalog.js');
  return allLinks();
}

const BLOCK_WORDS = /access denied|robot or human|just a moment|are you a robot|captcha|pardon our interruption|request blocked|bot detection|verify you are human/i;

async function inspect(page, t) {
  const r = { ...t, status: 0, finalUrl: '', title: '', price: null, size: '', result: 'BROKEN', note: '' };
  try {
    const resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    r.status = resp ? resp.status() : 0;
    await page.waitForTimeout(2500);
    r.finalUrl = page.url();
    r.title = (await page.title()).trim().slice(0, 140);
    const data = await page.evaluate(() => {
      const out = { price: null, name: null, text: '' };
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const walk = (o) => {
            if (!o || typeof o !== 'object') return;
            if (Array.isArray(o)) return o.forEach(walk);
            const type = [].concat(o['@type'] || []);
            if (type.includes('Product')) {
              out.name = out.name || o.name;
              const offers = [].concat(o.offers || []);
              for (const of of offers) {
                const p = of.price ?? of.lowPrice ?? of.highPrice;
                if (p != null && out.price == null) out.price = `${of.priceCurrency || ''} ${p}`.trim();
              }
            }
            Object.values(o).forEach(walk);
          };
          walk(JSON.parse(s.textContent));
        } catch { /* ignore bad JSON-LD */ }
      }
      const meta = document.querySelector('meta[property="product:price:amount"], meta[itemprop="price"]');
      if (!out.price && meta) out.price = meta.getAttribute('content');
      out.text = document.body ? document.body.innerText.slice(0, 200000) : '';
      // Size text is often in collapsed panels that innerText skips.
      const raw = document.body ? document.body.textContent.replace(/\s+/g, ' ') : '';
      const sm = raw.match(/(overall dimensions|product size|dimensions|measurements)[:\s]{0,4}.{0,200}/i);
      out.sizeText = sm ? sm[0] : '';
      out.h1 = document.querySelector('h1')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 140) ?? '';
      return out;
    });
    r.price = data.price;
    const m = data.text.match(/(overall|dimensions?|measurements?|width)[^\n]{0,12}\n?[^\n]{0,160}/i);
    r.size = (m ? m[0] : data.sizeText).replace(/\s+/g, ' ').slice(0, 160);
    r.h1 = data.h1;
    if (!data.price) {
      const pm = data.text.match(/\$\s?\d[\d,]*(\.\d\d)?/);
      if (pm) r.price = `page ${pm[0]}`;
    }
    const blocked = BLOCK_WORDS.test(r.title) || BLOCK_WORDS.test(data.text.slice(0, 3000)) || r.status === 403 || r.status === 429;
    if (blocked) { r.result = 'BLOCKED'; r.note = 'the store blocked the automated browser'; }
    else if (r.status >= 200 && r.status < 400) {
      r.result = 'OK';
      if (/not found|no longer available|page can.t be found|404/i.test(r.title)) { r.result = 'BROKEN'; r.note = 'page says not found'; }
      // A product page that redirects to a page without the product number was probably discontinued.
      const ids = new URL(t.url).pathname.match(/\d{5,}/g) ?? [];
      if (r.result === 'OK' && ids.length && !ids.some((n) => r.finalUrl.includes(n))) { r.result = 'MOVED'; r.note = `redirected to ${r.finalUrl}`; }
    } else r.note = `HTTP ${r.status}`;
  } catch (e) {
    r.note = e.message.split('\n')[0].slice(0, 120);
  }
  return r;
}

const list = await targets();
const browser = await chromium.launch({ headless: !args.includes('--headed') });
const ctx = await browser.newContext({
  locale: 'en-US', timezoneId: 'America/New_York', viewport: { width: 1366, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
});
const results = [];
// Some stores rate-limit: check their links one at a time, slowly, in their own queue.
const SLOW = /dwr\.com|walmart\.com/;
const queue = list.filter((t) => !SLOW.test(t.url));
const slow = list.filter((t) => SLOW.test(t.url));
const worker = (q, pause) => async () => {
  const page = await ctx.newPage();
  while (q.length) {
    const t = q.shift();
    if (pause) await page.waitForTimeout(pause);
    const r = await inspect(page, t);
    results.push(r);
    console.log(`${r.result.padEnd(7)} ${String(r.status).padEnd(4)} ${r.id} | ${r.h1 || r.title} | ${r.price ?? '-'} | ${r.size} | ${r.url}${r.note ? ` | ${r.note}` : ''}`);
    // One machine-readable line per link, so the report can be rebuilt from the job log.
    console.log(`JSON ${JSON.stringify({ id: r.id, url: r.url, result: r.result, status: r.status, price: r.price, title: r.h1 || r.title, finalUrl: r.finalUrl })}`);
  }
};
await Promise.all([...Array.from({ length: 4 }, () => worker(queue, 0)()), worker(slow, 9000)()]);
await browser.close();
const count = (k) => results.filter((r) => r.result === k).length;
console.log(`\nSUMMARY ok=${count('OK')} moved=${count('MOVED')} blocked=${count('BLOCKED')} broken=${count('BROKEN')} total=${results.length}`);
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify({ checked: new Date().toISOString(), results }, null, 2));
process.exitCode = count('BROKEN') + count('MOVED') ? 1 : 0;
