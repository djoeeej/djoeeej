// Finds current product pages by running store searches in a real browser.
// Used to replace product links that stores renumber or retire.
//
//   node discover.mjs queries.txt      one query per line: "<store> <search words>"
//                                       store = ikea | target | article | walmart
// Prints one "FOUND {json}" line per product card: store, query, url, text (name and price).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const SEARCH = {
  ikea: (q) => `https://www.ikea.com/us/en/search/?q=${encodeURIComponent(q)}`,
  target: (q) => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  article: (q) => `https://www.article.com/search?query=${encodeURIComponent(q)}`,
  walmart: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
};
const LINK = {
  ikea: /\/us\/en\/p\/[a-z0-9-]+-s?\d{8}\/?$/,
  target: /\/p\/[^?]+\/-\/A-\d+/,
  article: /\/product\/\d+\//,
  walmart: /\/ip\/[^?]+\/\d+/,
};

const lines = readFileSync(process.argv[2], 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const ctx = await browser.newContext({
  locale: 'en-US', timezoneId: 'America/New_York', viewport: { width: 1366, height: 900 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();
for (const line of lines) {
  const [store, ...words] = line.split(' ');
  const query = words.join(' ');
  if (!SEARCH[store]) continue;
  try {
    await page.goto(SEARCH[store](query), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(1200);
    const found = await page.evaluate((re) => {
      const rx = new RegExp(re);
      const out = [], seen = new Set();
      for (const a of document.querySelectorAll('a[href]')) {
        const href = a.href.split('?')[0].split('#')[0];
        if (!rx.test(new URL(href).pathname) || seen.has(href)) continue;
        seen.add(href);
        let el = a, text = '';
        for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
          text = (el.innerText || '').replace(/\s+/g, ' ').trim();
          if (text.length > 40 && /\$\s?\d/.test(text)) break;
        }
        out.push({ url: href, text: text.slice(0, 220) });
        if (out.length >= 8) break;
      }
      return out;
    }, LINK[store].source);
    if (!found.length) console.log(`FOUND ${JSON.stringify({ store, query, url: null, text: (await page.title()).slice(0, 80) })}`);
    for (const f of found) console.log(`FOUND ${JSON.stringify({ store, query, ...f })}`);
  } catch (e) {
    console.log(`FOUND ${JSON.stringify({ store, query, url: null, text: `error: ${e.message.split('\n')[0].slice(0, 100)}` })}`);
  }
}
await browser.close();
