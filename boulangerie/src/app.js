// ─────────────────────────────────────────────────────────────
// Page logic: language, menu cards with 3D tilt, the 3D photo
// ring on the home page, and the product page.
// ─────────────────────────────────────────────────────────────
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const byId = (id) => document.getElementById(id);
const PRODUCT = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Photo URLs and credits, filled in by loadPhotos(): id → { small, large, credit }
const PHOTO = {};
const photoSrc = (id, size) => PHOTO[id]?.[size >= 1000 ? 'large' : 'small'] ?? null;

// ───────── Language
let lang = (() => {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'fr') return q;
    const s = localStorage.getItem('do-lang');
    if (s === 'en' || s === 'fr') return s;
  } catch (e) { /* storage unavailable */ }
  return 'fr';
})();
const t = (k) => UI[lang][k];
const locale = () => (lang === 'fr' ? 'fr-FR' : 'en-GB');
const photoAlt = (id) => PRODUCT[id].name;

// Keep numbers and their units together on one line.
function nb(s) {
  return String(s)
    .replace(/(\d) (?=(?:g|ml|kg|cm|mm|min|h|°C|%)(?!\p{L}))/gu, '$1 ')
    .replace(/(\bh) (\d)/g, '$1 $2')
    .replace(/(\d) × (\d)/g, '$1 × $2');
}

function localize(p) {
  if (lang === 'en') return { ...p, sub: p.en };
  const f = PRODUCTS_FR[p.id] || {};
  const components = p.components.map((c, i) => {
    const fc = f.components?.[i];
    return {
      ...c,
      title: fc?.title ?? c.title,
      note: fc ? fc.note : c.note,
      items: c.items.map((it, j) => {
        const fi = fc?.items?.[j];
        if (fi == null) return it;
        return typeof fi === 'string' ? { ...it, n: fi, note: undefined } : { ...it, n: fi.n, note: fi.note };
      }),
    };
  });
  return {
    ...p,
    sub: f.en ?? null,
    short: f.short ?? p.short,
    definition: f.definition ?? p.definition,
    origin: f.origin ?? p.origin,
    taste: f.taste ?? p.taste,
    yield: { ...p.yield, ...f.yield },
    times: f.times ?? p.times,
    level: LEVELS_FR[p.level] ?? p.level,
    allergens: p.allergens.map((a) => ALLERGENS_FR[a] ?? a),
    components,
    steps: f.steps ?? p.steps,
    tip: f.tip ?? p.tip,
  };
}

const categoryGloss = (c) => (lang === 'fr' ? CATEGORIES_FR[c.id] : c.gloss);

// ───────── Static text and sections
function applyLang() {
  document.documentElement.lang = t('htmlLang');
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tLabel)); });
  const btn = byId('lang');
  btn.textContent = t('langSwitch');
  btn.setAttribute('aria-label', t('langSwitchLabel'));
  btn.setAttribute('lang', lang === 'fr' ? 'en' : 'fr');
  document.title = lang === 'fr'
    ? `${CONFIG.name}, Creil — pains, viennoiseries et pâtisseries`
    : `${CONFIG.name}, Creil — bread, viennoiseries and pastries`;
  paintShelves();
  renderVisit();
  renderCredits();
  updateHeroCaption();
  if (D.open) { renderPaper(D.id, true); setStagePhoto(D.id); updateStageLabels(); }
}

function photoMarkup(id, cls) {
  return `<span class="${cls} is-empty"><span class="empty-name">${esc(PRODUCT[id].name)}</span><span class="glare"></span></span>`;
}

function renderShelves() {
  const root = byId('shelves');
  root.innerHTML = '';
  for (const cat of CATEGORIES) {
    const items = PRODUCTS.filter((p) => p.category === cat.id);
    const sec = document.createElement('section');
    sec.className = 'shelf';
    sec.setAttribute('aria-labelledby', `shelf-${cat.id}`);
    sec.innerHTML = `
      <div class="shelf-head"><h3 id="shelf-${cat.id}">${esc(cat.name)}</h3><p data-gloss="${cat.id}"></p></div>
      <div class="shelf-row"></div>`;
    const row = sec.querySelector('.shelf-row');
    for (const p of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'item';
      b.dataset.id = p.id;
      b.innerHTML = `${photoMarkup(p.id, 'item-photo')}
        <span class="tag"><span class="tag-name">${esc(p.name)}</span><span class="tag-short"></span></span>`;
      row.appendChild(b);
    }
    root.appendChild(sec);
  }
  root.querySelectorAll('.item').forEach((item) => {
    const id = item.dataset.id;
    const photo = item.querySelector('.item-photo');
    item.addEventListener('click', () => openDetail(id, { fromEl: photo, returnFocus: item }));
    if (!REDUCED) bindTilt(item, photo, 9);
  });
}

// Tilt an element towards the pointer, with a moving highlight.
function bindTilt(zone, el, max) {
  let pressed = false;
  const move = (e) => {
    if (e.pointerType === 'touch' && !pressed) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty('--ry', `${(x - 0.5) * 2 * max}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 2 * max * 0.8}deg`);
    el.style.setProperty('--gx', `${x * 100}%`);
    el.style.setProperty('--gy', `${y * 100}%`);
    el.style.setProperty('--mx', (x - 0.5) * 2);
    el.style.setProperty('--my', (y - 0.5) * 2);
    el.classList.add('is-tilting');
  };
  const reset = () => {
    pressed = false;
    el.classList.remove('is-tilting');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--mx', 0);
    el.style.setProperty('--my', 0);
  };
  zone.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') { pressed = true; move(e); } });
  zone.addEventListener('pointermove', move);
  zone.addEventListener('pointerleave', reset);
  zone.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') reset(); });
  zone.addEventListener('pointercancel', reset);
}

function paintShelves() {
  for (const cat of CATEGORIES) {
    const el = document.querySelector(`[data-gloss="${cat.id}"]`);
    if (el) el.textContent = categoryGloss(cat);
  }
  document.querySelectorAll('.item').forEach((item) => {
    const p = localize(PRODUCT[item.dataset.id]);
    item.querySelector('.tag-short').textContent = nb(p.short);
    const img = item.querySelector('img');
    if (img) img.alt = photoAlt(p.id);
  });
}

function renderVisit() {
  byId('heroWhere').textContent = `${CONFIG.street}, ${CONFIG.city}`;
  byId('address').innerHTML = `${esc(CONFIG.street)}<br>${esc(CONFIG.city)}`;
  const todo = `<span class="todo">${esc(t('toConfirm'))}</span>`;
  const tel = CONFIG.phone.replace(/[^\d+]/g, '');
  const actions = [];
  if (CONFIG.mapUrl) actions.push(`<a class="btn btn-primary" href="${esc(CONFIG.mapUrl)}" target="_blank" rel="noopener">${esc(t('directions'))}</a>`);
  if (CONFIG.phone) actions.push(`<a class="btn btn-ghost" href="tel:${esc(tel)}">${esc(t('call'))}</a>`);
  byId('visitActions').innerHTML = actions.join('');
  const today = (new Date().getDay() + 6) % 7;
  byId('hours').innerHTML = `<caption>${esc(t('hours'))}</caption><tbody>${t('days').map((d, i) => {
    const v = CONFIG.hours[i];
    const val = v === 'closed' ? esc(t('closed')) : v ? esc(nb(v)) : todo;
    return `<tr${i === today ? ' class="today" aria-current="date"' : ''}><th scope="row">${esc(d)}</th><td>${val}</td></tr>`;
  }).join('')}</tbody>`;
  byId('phoneLine').innerHTML = `<span>${esc(t('phone'))}</span><span>${CONFIG.phone ? `<a href="tel:${esc(tel)}">${esc(CONFIG.phone)}</a>` : todo}</span>`;
  byId('footerText').textContent = `© ${new Date().getFullYear()} ${CONFIG.name}, Creil. ${t('footer')}`;
  byId('footerLinks').innerHTML = CONFIG.instagram ? `<a href="${esc(CONFIG.instagram)}" target="_blank" rel="noopener">Instagram</a>` : '';
}

const creditText = (c) => `${c.author}${c.site ? `, ${c.site}` : ''}${c.license ? ` (${c.license})` : ''}`;

function renderCredits() {
  const list = PRODUCTS.filter((p) => PHOTO[p.id]?.credit);
  const box = byId('credits');
  if (!list.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<summary>${esc(t('credits'))}</summary><p>${esc(t('creditsNote'))}</p><ul>${list.map((p) => {
    const c = PHOTO[p.id].credit;
    return `<li>${esc(p.name)} : <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(creditText(c))}</a></li>`;
  }).join('')}</ul>`;
}

function injectStructuredData() {
  const [, postal = '', locality = CONFIG.city] = CONFIG.city.match(/^(\d{5})\s+(.*)$/) || [];
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: CONFIG.name,
    address: { '@type': 'PostalAddress', streetAddress: CONFIG.street, postalCode: postal, addressLocality: locality, addressCountry: 'FR' },
    servesCuisine: 'French',
    url: location.href.split('#')[0],
  };
  if (CONFIG.phone) data.telephone = CONFIG.phone;
  if (CONFIG.mapUrl) data.hasMap = CONFIG.mapUrl;
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

// ───────── Photos: the owner's own, downloaded copies, a direct link, or Wikimedia Commons live
const stripHtml = (html) => {
  const text = new DOMParser().parseFromString(html || '', 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
};

// Commons' fallback wording becomes a plain name; with no author, credit the uploader.
const cleanAuthor = (text, uploader) => (text || '').match(/^No machine-readable author provided\.\s*(.+?) assumed/)?.[1] || text || uploader || 'Wikimedia Commons';

async function loadPhotos() {
  const wanted = [];
  for (const [id, entry] of Object.entries(PHOTOS)) {
    // Your own photo, then the copy downloaded by the GitHub workflow, then Commons live.
    if (entry.local) PHOTO[id] = { small: entry.local, large: entry.local, credit: entry.credit ?? null };
    else if (PHOTO_LOCAL[id]) PHOTO[id] = { ...PHOTO_LOCAL[id], credit: { site: 'Wikimedia Commons', ...PHOTO_LOCAL[id].credit } };
    else if (entry.url) PHOTO[id] = { small: entry.url, large: entry.url, credit: { author: entry.author, site: entry.site, license: entry.license, url: entry.page || entry.url } };
    else if (entry.commons) wanted.push(...entry.commons.map((f) => `File:${f}`));
  }
  if (!wanted.length) return;
  const query = (width) => fetch('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*',
    prop: 'imageinfo', iiprop: 'url|extmetadata|user', iiextmetadatafilter: 'Artist|LicenseShortName',
    iiurlwidth: String(width), titles: [...new Set(wanted)].join('|'),
  })).then((r) => r.json());
  let small, large;
  try {
    [small, large] = await Promise.all([query(960), query(1280)]);
  } catch (e) {
    return; // offline or blocked: the named placeholders stay
  }
  const index = (res) => {
    const pages = new Map((res.query?.pages || []).map((pg) => [pg.title, pg]));
    for (const n of res.query?.normalized || []) if (pages.has(n.to)) pages.set(n.from, pages.get(n.to));
    return pages;
  };
  const S = index(small), L = index(large);
  for (const [id, entry] of Object.entries(PHOTOS)) {
    if (!entry.commons || PHOTO[id]) continue;
    for (const f of entry.commons) {
      const ps = S.get(`File:${f}`), pl = L.get(`File:${f}`);
      const is = ps?.imageinfo?.[0], il = pl?.imageinfo?.[0];
      if (!is || ps.missing) continue;
      const meta = is.extmetadata || {};
      PHOTO[id] = {
        small: is.thumburl || is.url,
        large: il?.thumburl || il?.url || is.thumburl || is.url,
        credit: { author: cleanAuthor(stripHtml(meta.Artist?.value), is.user), site: 'Wikimedia Commons', license: meta.LicenseShortName?.value || '', url: is.descriptionurl },
      };
      break;
    }
  }
}

// Put the loaded photos into the menu, the 3D ring and the open product page.
function applyPhotos() {
  document.querySelectorAll('.item').forEach((item) => {
    const id = item.dataset.id, src = photoSrc(id, 800);
    const box = item.querySelector('.item-photo');
    if (!src || box.querySelector('img')) return;
    const img = new Image();
    img.alt = photoAlt(id);
    img.decoding = 'async';
    img.loading = 'lazy';
    img.width = 800; img.height = 1000;
    img.addEventListener('load', () => box.classList.remove('is-empty'));
    img.addEventListener('error', () => img.remove());
    img.src = src;
    box.prepend(img);
  });
  if (carousel) PRODUCTS.forEach((p, i) => { const src = photoSrc(p.id, 800); if (src) carousel.setPhoto(i, src); });
  updateHeroCaption();
  renderCredits();
  if (D.open) setStagePhoto(D.id);
}

// ───────── Home page 3D photo ring
let carousel = null, heroFront = 0;
function updateHeroCaption() {
  const p = PRODUCTS[heroFront];
  byId('heroName').textContent = p.name;
  const fb = byId('heroFallback');
  if (fb) { fb.src = photoSrc(p.id, 800) || ''; fb.alt = photoAlt(p.id); }
}
function heroOpenRect() {
  // The front photo sits in the middle of the ring's frame.
  const r = byId('heroView').getBoundingClientRect();
  const h = r.height * 0.6, w = h * 0.8;
  return { left: r.left + (r.width - w) / 2, top: r.top + r.height * 0.14, width: w, height: h };
}
function initHero() {
  const host = byId('heroView');
  carousel = makeCarousel(host, PRODUCTS.map((p) => ({ name: p.name, src: photoSrc(p.id, 800) })), {
    reduced: REDUCED,
    onFront: (i) => { heroFront = i; updateHeroCaption(); },
    onOpen: (i) => openDetail(PRODUCTS[i].id, { fromRect: heroOpenRect(), returnFocus: byId('heroOpen') }),
  });
  if (!carousel) {
    // No WebGL: a plain photo that changes with the arrows.
    host.innerHTML = '<img id="heroFallback" class="hero-fallback" alt="">';
    updateHeroCaption();
  }
  const go = (d) => {
    if (carousel) { if (d > 0) carousel.next(); else carousel.prev(); }
    else { heroFront = (heroFront + d + PRODUCTS.length) % PRODUCTS.length; updateHeroCaption(); }
  };
  byId('heroPrev').addEventListener('click', () => go(-1));
  byId('heroNext').addEventListener('click', () => go(1));
  byId('heroOpen').addEventListener('click', () => openDetail(PRODUCTS[heroFront].id, { fromRect: heroOpenRect(), returnFocus: byId('heroOpen') }));
}

// ───────── Product page
const D = { open: false, id: null, count: 0, checked: new Set(), pushed: false };
const dlg = byId('detail'), paper = byId('paper'), stage = byId('detailStage'), photoCard = byId('photoCard');

function setStagePhoto(id) {
  const src = photoSrc(id, 1400);
  const img = byId('photoImg');
  photoCard.classList.toggle('is-empty', !src);
  photoCard.querySelector('.empty-name').textContent = PRODUCT[id].name;
  if (src) {
    if (img.getAttribute('src') !== src) img.src = src;
    img.alt = photoAlt(id);
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
  const c = PHOTO[id]?.credit;
  byId('photoCredit').innerHTML = c ? `${esc(t('photoBy'))} : <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(creditText(c))}</a>` : '';
}
byId('photoImg').addEventListener('error', () => { photoCard.classList.add('is-empty'); byId('photoImg').hidden = true; });

// Quantities
const fmtNum = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v);
function fmtQty(q, u, f) {
  if (q == null) return '';
  let v = q * f;
  if (u === 'g' || u === 'ml') {
    v = v >= 100 ? Math.round(v / 5) * 5 : v >= 10 ? Math.round(v) : Math.round(v * 2) / 2;
    return `${fmtNum(v)} ${u}`;
  }
  const r = Math.max(0.5, Math.round(v * 2) / 2);
  const whole = Math.floor(r), half = r - whole >= 0.5;
  return `${whole || ''}${half ? '½' : ''}`;
}
const scaleNote = (note, f) => (f === 1 || !note ? note : note.replace(/(\d+(?:[.,]\d+)?)\s?g\b/g, (m, n) => fmtQty(parseFloat(n.replace(',', '.')), 'g', f)));
const yieldStep = (n) => (n >= 4 ? n / 2 : 1);

function renderIngredients(p) {
  const base = PRODUCT[p.id].yield.n;
  const f = D.count / base;
  const unit = D.count === 1 ? p.yield.unit1 : p.yield.unit;
  const step = yieldStep(base);
  const html = [];
  html.push(`<div class="ing-head"><h3>${esc(t('ingredients'))}</h3>
    <div class="scaler" role="group" aria-label="${esc(t('makes'))}">
      <button type="button" data-scale="-1" aria-label="${esc(t('less'))}" ${D.count - step < step ? 'disabled' : ''}>−</button>
      <output aria-live="polite">${esc(t('makes'))} ${fmtNum(D.count)} ${esc(unit)}</output>
      <button type="button" data-scale="1" aria-label="${esc(t('more'))}" ${D.count + step > base * 4 ? 'disabled' : ''}>+</button>
    </div></div>`);
  if (f === 1 && p.yield.size) {
    html.push(`<p class="component-note">${esc(nb(p.yield.size.charAt(0).toUpperCase() + p.yield.size.slice(1)))}.</p>`);
  } else if (f !== 1) {
    const orig = `${fmtNum(base)} ${base === 1 ? p.yield.unit1 : p.yield.unit}${p.yield.size ? `, ${p.yield.size}` : ''}`;
    html.push(`<p class="scale-note">${lang === 'fr'
      ? `Quantités multipliées par ${fmtNum(f)}. Les tailles et le nombre de pièces indiqués dans la méthode correspondent à la recette d’origine : ${esc(nb(orig))}.`
      : `Quantities multiplied by ${fmtNum(f)}. Sizes and piece counts in the method are for the original recipe: ${esc(nb(orig))}.`}</p>`);
  }
  p.components.forEach((c, ci) => {
    html.push(`<div class="component"><h4>${esc(c.title)}</h4><ul>`);
    c.items.forEach((it, ii) => {
      const key = `${ci}-${ii}`;
      const note = scaleNote(it.note, f);
      html.push(`<li><label><input type="checkbox" data-key="${key}" ${D.checked.has(key) ? 'checked' : ''}>
        <span class="qty">${esc(fmtQty(it.q, it.u, f))}</span>
        <span class="ing-name">${esc(nb(it.n))}${note ? `<span class="ing-note">${esc(nb(note))}</span>` : ''}</span></label></li>`);
    });
    html.push('</ul>');
    if (c.note) html.push(`<p class="component-note">${esc(nb(c.note))}</p>`);
    html.push('</div>');
  });
  return html.join('');
}

function renderPaper(id, keepState = false) {
  const p = localize(PRODUCT[id]);
  const cat = CATEGORIES.find((c) => c.id === p.category);
  if (!keepState) { D.count = PRODUCT[id].yield.n; D.checked = new Set(); }
  paper.innerHTML = `<div class="paper-inner">
    <header class="paper-head">
      <p class="paper-cat">${esc(cat.name)}</p>
      <h2 id="detailTitle">${esc(p.name)}</h2>
      <p class="paper-ipa" aria-hidden="true">${esc(p.ipa)}</p>
      ${p.sub ? `<p class="paper-sub">${esc(p.sub)}</p>` : ''}
    </header>
    <section class="paper-block"><h3>${esc(t('whatIs'))}</h3><p class="paper-lede">${esc(nb(p.definition))}</p></section>
    <section class="paper-block"><h3>${esc(t('origin'))}</h3><p>${esc(nb(p.origin))}</p></section>
    <section class="paper-block"><h3>${esc(t('taste'))}</h3><p>${esc(nb(p.taste))}</p></section>
    <dl class="facts">
      <div><dt>${esc(t('prep'))}</dt><dd>${esc(nb(p.times.prep))}</dd></div>
      <div><dt>${esc(t('rest'))}</dt><dd>${esc(nb(p.times.rest))}</dd></div>
      <div><dt>${esc(t('bake'))}</dt><dd>${esc(nb(p.times.bake))}</dd></div>
      <div><dt>${esc(t('level'))}</dt><dd>${esc(p.level)}</dd></div>
    </dl>
    <p class="allergens"><span>${esc(t('allergens'))}</span>${p.allergens.map((a) => `<span class="chip">${esc(a)}</span>`).join('')}</p>
    <section class="ingredients" id="ingredients">${renderIngredients(p)}</section>
    <section class="method"><h3>${esc(t('method'))}</h3><ol>${p.steps.map((s) => `<li><span>${esc(nb(s))}</span></li>`).join('')}</ol></section>
    <aside class="tip"><h3>${esc(t('tip'))}</h3><p>${esc(nb(p.tip))}</p></aside>
    <p class="recipe-note">${esc(t('recipeNote'))}</p>
    <div class="paper-actions"><button class="btn btn-ink" type="button" id="btnPrint">${esc(t('print'))}</button></div>
  </div>`;
  byId('btnPrint').addEventListener('click', () => window.print());
}

paper.addEventListener('click', (e) => {
  const b = e.target.closest('[data-scale]');
  if (!b || !D.id) return;
  const base = PRODUCT[D.id].yield.n, step = yieldStep(base);
  D.count = Math.min(base * 4, Math.max(step, D.count + step * Number(b.dataset.scale)));
  byId('ingredients').innerHTML = renderIngredients(localize(PRODUCT[D.id]));
  byId('ingredients').querySelector(`[data-scale="${b.dataset.scale}"]`)?.focus();
});
paper.addEventListener('change', (e) => {
  const k = e.target.dataset?.key;
  if (!k) return;
  if (e.target.checked) D.checked.add(k); else D.checked.delete(k);
});

function setInert(on) {
  for (const el of [byId('top'), byId('nav'), byId('footer'), document.querySelector('.skip')]) el.inert = on;
}

const idFromHash = () => { const m = location.hash.match(/^#\/([\w-]+)$/); return m && PRODUCT[m[1]] ? m[1] : null; };

// The photo flies from where it was tapped into the product page, turning in 3D.
function flyIn(from) {
  if (REDUCED || !from) return;
  const last = photoCard.getBoundingClientRect();
  if (!last.width) return;
  const dx = from.left + from.width / 2 - (last.left + last.width / 2);
  const dy = from.top + from.height / 2 - (last.top + last.height / 2);
  const sx = from.width / last.width, sy = from.height / last.height;
  photoCard.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
    { transform: `translate(${dx * 0.35}px, ${dy * 0.35}px) scale(${(sx + 1) / 2}, ${(sy + 1) / 2}) rotateY(-16deg) rotateX(7deg)`, offset: 0.55 },
    { transform: 'none' },
  ], { duration: 850, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

async function flipPhoto(id) {
  if (!REDUCED) await photoCard.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 200, easing: 'ease-in' }).finished.catch(() => {});
  setStagePhoto(id);
  if (!REDUCED) photoCard.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
}

function openDetail(id, { fromEl = null, fromRect = null, returnFocus = null, push = true, replace = false, flip = false } = {}) {
  if (!PRODUCT[id]) return;
  const firstOpen = !D.open;
  D.id = id;
  renderPaper(id);
  paper.scrollTop = 0;
  dlg.scrollTop = 0;
  if (push) { history.pushState({ detail: id }, '', `#/${id}`); D.pushed = true; }
  else if (replace) history.replaceState(history.state?.detail ? history.state : null, '', `#/${id}`);
  if (firstOpen) {
    setStagePhoto(id);
    D.returnFocus = returnFocus || document.activeElement;
    D.open = true;
    dlg.hidden = false;
    setInert(true);
    document.documentElement.style.overflow = 'hidden';
    if (!REDUCED) {
      dlg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
      paper.animate([{ transform: 'translateY(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 160, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    }
    flyIn(fromRect || fromEl?.getBoundingClientRect());
    paper.focus({ preventScroll: true });
  } else if (flip) {
    flipPhoto(id);
  } else {
    setStagePhoto(id);
  }
  updateStageLabels();
}

function updateStageLabels() {
  byId('btnPrev').setAttribute('aria-label', t('prev'));
  byId('btnNext').setAttribute('aria-label', t('next'));
  byId('btnClose').setAttribute('aria-label', t('close'));
}

async function closeDetail({ fromPop = false } = {}) {
  if (!D.open) return;
  D.open = false;
  if (!REDUCED) await dlg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' }).finished.catch(() => {});
  dlg.hidden = true;
  setInert(false);
  document.documentElement.style.overflow = '';
  if (!fromPop) {
    if (D.pushed) history.back();
    else history.replaceState(null, '', location.pathname + location.search);
  }
  D.pushed = false;
  D.returnFocus?.focus?.({ preventScroll: true });
}

function step(dir) {
  const i = PRODUCTS.findIndex((p) => p.id === D.id);
  const next = PRODUCTS[(i + dir + PRODUCTS.length) % PRODUCTS.length].id;
  openDetail(next, { push: false, replace: true, flip: true });
}

byId('btnClose').addEventListener('click', () => closeDetail());
byId('btnPrev').addEventListener('click', () => step(-1));
byId('btnNext').addEventListener('click', () => step(1));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && D.open) closeDetail(); });
addEventListener('popstate', () => {
  const id = idFromHash();
  if (id) { D.pushed = false; openDetail(id, { push: false }); } else closeDetail({ fromPop: true });
});
if (!REDUCED) bindTilt(stage, photoCard, 10);

byId('lang').addEventListener('click', () => {
  lang = lang === 'fr' ? 'en' : 'fr';
  try { localStorage.setItem('do-lang', lang); } catch (e) { /* ignore */ }
  applyLang();
});

// ───────── Start
renderShelves();
applyLang();
injectStructuredData();
initHero();
loadPhotos().then(applyPhotos);

const nav = byId('nav');
const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const startId = idFromHash();
if (startId) openDetail(startId, { push: false });
