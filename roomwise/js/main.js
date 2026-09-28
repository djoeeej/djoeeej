// App controller: Snap, Measure, Budget, Design.
import { Stage } from './scene.js';
import { MeasureTool, solveRoom, defaultMarks } from './measure.js';
import { loadPhotoFile, photoFromCanvas, sampleWallColor } from './photo.js';
import { renderSampleRoom } from './sampleRoom.js';
import { planRoom, fitsInSlot, slotsFor, ROOM_TYPES } from './layout.js';
import { TIERS, TIER_RANK, CATEGORY_LABEL, PAINT, PAINT_COLORS, productsInCategory, shopUrl, storeName } from './catalog.js';
import { el, fmtLen, fmtArea, fmtCm, fmtMoney, store } from './util.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STEPS = ['snap', 'measure', 'budget', 'design'];
const LENSES = [{ x: '0.5×', f: 13 }, { x: '1×', f: 26 }, { x: '2×', f: 52 }, { x: '3×', f: 77 }];
const EXTERNAL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 5 11"/></svg>';

const state = {
  step: 'snap',
  roomType: store.get('roomType', 'living'),
  units: store.get('units', 'metric'),
  photo: null,
  ref: { kind: 'height', value: 2.5 },
  stand: 0.4,
  focal35: 26,
  room: null,
  tier: 'luxury',
  overrides: { basic: {}, luxury: {}, supreme: {} },
  finishes: {},
  paint: { color: null, name: null, target: 'all' },
  coverage: 0.55,
  plan: null,
  selected: null,
  view: 'room',
  tab: 'pieces',
  reached: 0,
  introShown: false,
  hintSeen: false,
  roomKey: '',
};

let stage = null;
let measure = null;
let sample = null;
const app = $('#app');

// ---- helpers -----------------------------------------------------------------------
const L = (m) => fmtLen(m, state.units);
const tierById = (id) => TIERS.find((t) => t.id === id);
const roomLabel = () => ROOM_TYPES.find((r) => r.id === state.roomType)?.label ?? 'Room';
const R = () => ({ W: state.room.W, D: state.room.D, H: state.room.H });
const planArgs = (tier = state.tier) => ({ roomType: state.roomType, R: R(), tier, overrides: state.overrides[tier], finishes: state.finishes });

let toastTimer = 0;
function toast(text, action) {
  const t = $('#toast');
  $('#toastText').textContent = text;
  const btn = $('#toastAction');
  btn.hidden = !action;
  if (action) { btn.textContent = action.label; btn.onclick = () => { t.hidden = true; action.run(); }; }
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, action ? 6000 : 3200);
}

function setChecked(container, attr, value) {
  container.querySelectorAll(`[${attr}]`).forEach((b) => {
    const on = b.getAttribute(attr) === String(value);
    if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', on);
    else b.setAttribute('aria-checked', on);
  });
}

// ---- room types & units -------------------------------------------------------------
function renderRoomTypes() {
  for (const id of ['#roomTypes', '#roomTypes2']) {
    const box = $(id);
    box.replaceChildren(...ROOM_TYPES.map((r) => el('button', {
      type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(r.id === state.roomType), 'data-room': r.id,
      onclick: () => setRoomType(r.id),
    }, r.label)));
  }
}

function setRoomType(id) {
  state.roomType = id;
  store.set('roomType', id);
  state.overrides = { basic: {}, luxury: {}, supreme: {} };
  renderRoomTypes();
  if (state.step === 'budget') renderBudget();
  if (state.step === 'design') { applyPlan({ reveal: true }); renderDesign(); }
}

function setUnits(u) {
  state.units = u;
  store.set('units', u);
  $$('[data-units]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.units === u)));
  renderRefInput();
  refreshMeasure();
  if (state.step === 'budget') { renderBudget(); stage?.showRoomDims(roomDimLabels()); }
  if (state.step === 'design') renderDesign();
  if (state.selected) renderProduct();
}

// ---- photos -------------------------------------------------------------------------
async function ensureSample() {
  if (sample) return sample;
  const s = renderSampleRoom();
  const photo = await photoFromCanvas(s.canvas, { focal35: s.focal35, focalSource: 'sample', isSample: true });
  sample = { photo, marks: s.marks, stand: s.stand, ceiling: s.ceiling };
  return sample;
}

function setPhoto(photo, marks, { stand = 0.4, ceiling = null } = {}) {
  state.photo = photo;
  state.focal35 = photo.focal35;
  state.stand = stand;
  state.ref = { kind: 'height', value: ceiling ?? (state.units === 'imperial' ? 2.4384 : 2.5) };
  state.overrides = { basic: {}, luxury: {}, supreme: {} };
  state.finishes = {};
  state.paint = { color: null, name: null, target: 'all' };
  state.introShown = false;
  state.reached = 1;
  state.roomKey = '';
  measure.setPhoto(photo, marks);
  $('#standInput').value = String(stand);
  renderRefInput();
  renderLens();
  refreshMeasure();
}

async function onFile(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const err = $('#snapError');
  err.hidden = true;
  try {
    const photo = await loadPhotoFile(file);
    setPhoto(photo, defaultMarks(photo.width, photo.height));
    goStep('measure');
  } catch (ex) {
    err.textContent = ex.message || 'That photo could not be opened. Try a JPEG or PNG.';
    err.hidden = false;
  }
}

// ---- measuring ------------------------------------------------------------------------
function renderRefInput() {
  const box = $('#refInput');
  const v = state.ref.value;
  if (state.units === 'imperial') {
    const totalIn = v / 0.0254;
    let ft = Math.floor(totalIn / 12), inch = Math.round(totalIn - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    const ftIn = el('input', { id: 'refFt', type: 'number', min: 3, max: 60, step: 1, inputmode: 'numeric', value: ft, 'aria-label': 'Feet' });
    const inIn = el('input', { id: 'refIn', type: 'number', min: 0, max: 11, step: 1, inputmode: 'numeric', value: inch, 'aria-label': 'Inches' });
    const update = () => {
      const f = parseFloat(ftIn.value) || 0, i = parseFloat(inIn.value) || 0;
      const m = (f * 12 + i) * 0.0254;
      if (m >= 1) { state.ref.value = m; refreshMeasure(); }
    };
    ftIn.addEventListener('input', update);
    inIn.addEventListener('input', update);
    box.replaceChildren(ftIn, el('span', {}, 'ft'), inIn, el('span', {}, 'in'));
  } else {
    const input = el('input', { id: 'refM', type: 'number', min: 1, max: 40, step: 0.01, inputmode: 'decimal', value: v.toFixed(2), 'aria-label': 'Metres' });
    input.addEventListener('input', () => {
      const m = parseFloat(input.value);
      if (m >= 1 && m <= 40) { state.ref.value = m; refreshMeasure(); }
    });
    box.replaceChildren(input, el('span', {}, 'm'));
  }
  setChecked(document.querySelector('[aria-labelledby="refLabel"]'), 'data-ref', state.ref.kind);
  $('#refHelp').textContent = state.ref.kind === 'height'
    ? (state.photo?.isSample ? 'The sample room has 2.60 m ceilings.' : 'Most homes have ceilings between 2.4 m (8 ft) and 2.7 m (9 ft). For the best result, measure one wall with a tape.')
    : 'Measure the back wall from corner to corner along the floor.';
}

function renderLens() {
  const box = $('#lensChips');
  box.replaceChildren(...LENSES.map((l) => el('button', {
    type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(Math.abs(l.f - state.focal35) < 3),
    onclick: () => { state.focal35 = l.f; renderLens(); refreshMeasure(); },
  }, `${l.x} lens`)));
  const src = state.photo?.focalSource;
  $('#lensHelp').textContent = src === 'exif'
    ? `Read from your photo: ${state.photo.focal35} mm equivalent.`
    : src === 'sample' ? 'The sample was taken with a standard 1× lens.'
      : 'Your photo does not say which lens was used, so a standard 1× phone lens is assumed.';
}

function refreshMeasure() {
  if (!state.photo || !measure.rect) return;
  const p = state.photo;
  state.room = solveRoom({ rect: measure.rect, vp: measure.vp, width: p.width, height: p.height, focal35: state.focal35, ref: state.ref, stand: state.stand });
  const r = state.room;
  $('#outW').textContent = L(r.W);
  $('#outD').textContent = L(r.D);
  $('#outH').textContent = L(r.H);
  $('#outA').textContent = fmtArea(r.area, state.units);
  measure.setLabels({ w: `${L(r.W)} wide`, h: `${L(r.H)} high`, d: `${L(r.D)} deep` });
  $('#standOut').textContent = L(state.stand);
  $('#camHeight').textContent = `You held the phone about ${L(r.camY)} above the floor, ${L(r.camDist)} from the back wall.`;
  const notes = [];
  if (r.camY < 0.5 || r.camY > 2.1) notes.push('The eye-level cross looks off: it should sit roughly at the height you held the phone. Drag it to where the floor and ceiling edges would meet.');
  if (r.W < 1.2 || r.D < 1.2) notes.push('This room comes out very small. Check that the corners sit on the back wall and that the known length is right.');
  if (r.W > 15 || r.D > 15) notes.push('This room comes out very large. Check the lens setting and the known length.');
  const note = $('#measureNote');
  note.textContent = notes.join(' ');
  note.hidden = !notes.length;
}

// ---- 3D room preparation -----------------------------------------------------------
function roomDimLabels() {
  const r = state.room;
  return { w: `${L(r.W)} wide`, d: `${L(r.D)} deep`, h: `${L(r.H)} high` };
}

function prepareRoom() {
  const r = state.room;
  const key = [r.W, r.D, r.H, r.camX, r.camY, r.camDist, state.photo.url].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join('|');
  if (key === state.roomKey) return;
  state.roomKey = key;
  stage.setPlan({ items: [] });
  stage.setRoom(R());
  stage.setPhoto(state.photo, { fpx: r.fpx, vp: { ...measure.vp }, width: state.photo.width, height: state.photo.height, camX: r.camX, camY: r.camY, camDist: r.camDist });
  stage.setWallRef(sampleWallColor(state.photo.canvas, measure.rect));
  stage.setPaint(state.paint, false);
  stage.setPaintCoverage(state.coverage);
  state.introShown = false;
}

// ---- steps ---------------------------------------------------------------------------
function goStep(step, opts = {}) {
  const idx = STEPS.indexOf(step);
  if (idx > 0 && !state.photo) return;
  if (idx > state.reached + 1) return;
  state.reached = Math.max(state.reached, idx);
  state.step = step;
  app.dataset.step = step;
  closeProduct(false);
  $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== step; });
  $$('[data-go]').forEach((b) => {
    if (!b.closest('.steps')) return;
    const i = STEPS.indexOf(b.dataset.go);
    b.toggleAttribute('data-done', i < state.reached && i !== idx);
    b.disabled = i > state.reached + (state.photo ? 1 : 0) || (i > 0 && !state.photo);
    if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  const caption = $('#stageCaption');
  $('#viewBar').hidden = step !== 'design';
  $('#viewTools').hidden = !(step === 'design' || step === 'budget');
  $('#tapHint').hidden = true;
  $('#sheet').scrollTop = 0;

  if (step === 'snap' || step === 'measure') {
    stage?.setView('off');
    caption.hidden = false;
    caption.textContent = step === 'snap' ? (state.photo?.isSample ? 'Sample room' : 'Your photo') : 'Drag the yellow corners onto the back wall';
    requestAnimationFrame(() => measure.layout());
    if (step === 'measure') refreshMeasure();
    return;
  }
  if (!stage) return;
  prepareRoom();
  if (step === 'budget') {
    caption.hidden = false;
    caption.textContent = `Your ${roomLabel().toLowerCase()}, measured`;
    stage.clearSelection();
    stage.setPlan({ items: [] });
    stage.showRoomDims(roomDimLabels());
    stage.setView('room');
    renderBudget();
    renderViewTools();
    return;
  }
  // design
  caption.hidden = true;
  stage.showRoomDims(null);
  const intro = !state.introShown;
  state.introShown = true;
  applyPlan({ reveal: opts.reveal || intro });
  stage.setView(state.view, { intro: intro && state.view === 'room' });
  renderDesign();
  renderViewTools();
  if (!state.hintSeen) $('#tapHint').hidden = state.view === 'walk';
}

// ---- budget ---------------------------------------------------------------------------
function renderBudget() {
  const r = state.room;
  $('#roomSummary').textContent = `${roomLabel()}, ${L(r.W)} by ${L(r.D)}, ${fmtArea(r.area, state.units)}, with ${L(r.H)} ceilings.`;
  const cards = TIERS.map((t) => {
    const plan = planRoom(planArgs(t.id));
    const stores = [...new Set(plan.items.map((i) => storeName(i.product.store)))];
    return el('button', { type: 'button', class: `tier tier--${t.id}`, onclick: () => chooseTier(t.id) },
      el('span', { class: 'tier-name' }, t.name),
      el('span', { class: 'tier-sign', 'aria-hidden': 'true' }, t.sign),
      el('span', { class: 'tier-price' }, fmtMoney(plan.total)),
      el('span', { class: 'tier-meta' }, `${plan.count} pieces for this room. ${t.tagline}.`),
      el('span', { class: 'tier-blurb' }, stores.length ? `From ${listJoin(stores)}.` : t.blurb),
      el('span', { class: 'tier-foot' },
        el('span', { class: 'tier-swatches', 'aria-hidden': 'true' }, t.swatches.map((c) => el('i', { style: `--c:${c}` }))),
        el('span', { class: 'tier-go' }, `Design it ${t.name.toLowerCase()}`)));
  });
  $('#tiers').replaceChildren(...cards);
}

function listJoin(arr) {
  if (arr.length <= 1) return arr.join('');
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

function chooseTier(id) {
  state.tier = id;
  goStep('design', { reveal: true });
}

// ---- design -------------------------------------------------------------------------------
function applyPlan({ reveal = false } = {}) {
  state.plan = planRoom(planArgs());
  stage.setPlan(state.plan, { reveal });
  if (state.selected && !state.plan.items.some((i) => i.key === state.selected)) closeProduct();
}

function paintInfo(tier = state.tier) {
  if (!state.paint.color || !state.room) return null;
  const { W, D, H } = state.room;
  const area = state.paint.target === 'all' ? 2 * (W + D) * H * 0.85 : W * H * 0.9;
  const litres = Math.max(1, Math.ceil((area * 2) / 10));
  const spec = PAINT[tier];
  return { area, litres, gallons: Math.ceil(litres / 3.785), price: litres * spec.perLitre, spec };
}

function renderDesign() {
  const plan = state.plan;
  if (!plan) return;
  // budget switch
  $('#tierSwitch').replaceChildren(...TIERS.map((t) => {
    const total = planRoom(planArgs(t.id)).total + (paintInfo(t.id)?.price ?? 0);
    return el('button', {
      type: 'button', role: 'tab', 'aria-selected': String(t.id === state.tier), class: `tier--${t.id}`,
      onclick: () => { if (t.id !== state.tier) { state.tier = t.id; applyPlan({ reveal: true }); renderDesign(); } },
    }, el('span', { class: 't-name' }, t.name), el('span', { class: 't-total' }, fmtMoney(total)));
  }));
  const paint = paintInfo();
  $('#total').textContent = fmtMoney(plan.total + (paint?.price ?? 0));
  $('#totalMeta').textContent = `${plan.count} pieces${paint ? ' and paint' : ''}`;
  setChecked($('.tabs'), 'data-tab', state.tab);
  $$('[data-tabpanel]').forEach((p) => { p.hidden = p.dataset.tabpanel !== state.tab; });

  // pieces
  $('#pieces').replaceChildren(...plan.items.map((it) => {
    const f = it.product.finishes[it.finish] ?? it.product.finishes[0];
    return el('li', { class: 'piece' },
      el('button', { type: 'button', class: 'piece-main', onclick: () => openProduct(it.key) },
        el('span', { class: 'piece-dot', style: `--c:${f.color}`, 'aria-hidden': 'true' }),
        el('span', {},
          el('span', { class: 'piece-name' }, it.product.name),
          el('span', { class: 'piece-sub' }, `${CATEGORY_LABEL[it.cat]}${it.qty > 1 ? ` × ${it.qty}` : ''}, ${storeName(it.product.store)}`)),
        el('span', { class: 'piece-price' }, fmtMoney(it.price))),
      shopLink(it.product, `Shop ${it.product.name} at ${storeName(it.product.store)}`));
  }));
  const removed = slotsFor(state.roomType).filter((s) => state.overrides[state.tier][s.key] === null);
  $('#removed').replaceChildren(...(removed.length ? [
    el('span', {}, 'Removed:'),
    ...removed.map((s) => el('button', { type: 'button', class: 'chip', onclick: () => restore(s.key) }, `Put back ${CATEGORY_LABEL[s.cat].toLowerCase()}`)),
  ] : []));

  renderPaint();
  renderShop();
}

function shopLink(product, label) {
  const a = el('a', { class: 'shop-link', href: shopUrl(product), target: '_blank', rel: 'noopener noreferrer', 'aria-label': label }, 'Shop');
  a.insertAdjacentHTML('beforeend', EXTERNAL);
  return a;
}

function renderPaint() {
  const none = el('button', {
    type: 'button', class: 'swatch swatch--none', role: 'radio', 'aria-checked': String(!state.paint.color),
    onclick: () => setPaint(null, null),
  }, el('i', { 'aria-hidden': 'true' }), 'Keep walls');
  const sw = PAINT_COLORS.map((c) => el('button', {
    type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(state.paint.color === c.color),
    onclick: () => setPaint(c.color, c.name),
  }, el('i', { style: `--c:${c.color}`, 'aria-hidden': 'true' }), c.name));
  $('#swatches').replaceChildren(none, ...sw);
  setChecked($('#paintTarget'), 'data-target', state.paint.target);
  const info = paintInfo();
  const need = $('#paintNeed');
  if (!info) {
    need.textContent = 'Pick a colour to see it on the walls, in 3D and on your photo.';
  } else {
    const amount = state.units === 'imperial' ? `${info.gallons} gallon${info.gallons > 1 ? 's' : ''}` : `${info.litres} litres`;
    const area = state.units === 'imperial' ? `${Math.round(info.area * 10.764)} ft²` : `${info.area.toFixed(0)} m²`;
    need.textContent = `${state.paint.name}: about ${amount} for two coats over ${area} of wall. ${info.spec.name}, about ${fmtMoney(info.price)}.`;
  }
}

function setPaint(color, name) {
  state.paint = { ...state.paint, color, name };
  if (color) $('#customPaint').value = color;
  stage.setPaint(state.paint);
  renderDesign();
}

function renderShop() {
  const groups = new Map();
  for (const it of state.plan.items) {
    const g = groups.get(it.product.store) ?? [];
    g.push(it);
    groups.set(it.product.store, g);
  }
  const paint = paintInfo();
  const blocks = [...groups.entries()].map(([st, items]) => el('div', { class: 'shop-group' },
    el('div', { class: 'shop-head' }, el('h3', {}, storeName(st)), el('span', {}, fmtMoney(items.reduce((s, i) => s + i.price, 0)))),
    ...items.map((it) => el('div', { class: 'shop-row' },
      el('span', {}, it.product.name, it.qty > 1 ? el('span', { class: 'n' }, ` × ${it.qty}`) : null),
      el('span', { class: 'num' }, fmtMoney(it.price)),
      shopLink(it.product, `Shop ${it.product.name} at ${storeName(st)}`)))));
  if (paint) {
    const p = { store: paint.spec.store, query: paint.spec.query };
    blocks.push(el('div', { class: 'shop-group' },
      el('div', { class: 'shop-head' }, el('h3', {}, `Paint from ${storeName(p.store)}`), el('span', {}, fmtMoney(paint.price))),
      el('div', { class: 'shop-row' },
        el('span', {}, `${paint.spec.name}, ${state.paint.name}`, el('span', { class: 'n' }, state.units === 'imperial' ? ` × ${paint.gallons} gal` : ` × ${paint.litres} L`)),
        el('span', { class: 'num' }, fmtMoney(paint.price)),
        shopLink(p, `Shop ${paint.spec.name} at ${storeName(p.store)}`))));
  }
  $('#shop').replaceChildren(...blocks);
}

function restore(key) {
  delete state.overrides[state.tier][key];
  applyPlan();
  renderDesign();
}

// ---- view controls ---------------------------------------------------------------------
function renderViewTools() {
  const view = state.step === 'budget' ? 'room' : state.view;
  app.dataset.view = view;
  setChecked($('#viewBar'), 'data-view', view);
  const vps = $('#viewpoints');
  vps.hidden = view !== 'walk';
  if (view === 'walk') {
    vps.replaceChildren(...stage.viewpoints().map((v) => el('button', { type: 'button', class: 'tool', onclick: () => stage.goToViewpoint(v.id) }, v.label)));
  }
  $('#tourBtn').hidden = view === 'photo';
  $('#resetBtn').hidden = view === 'photo';
  $('#tourBtn').setAttribute('aria-pressed', String(!!stage.touring));
  $('#tourLabel').textContent = stage.touring ? 'Stop turning' : view === 'walk' ? 'Look around 360°' : 'Turn 360°';
}

function setView(view) {
  state.view = view;
  stage.clearSelection();
  stage.setView(view);
  if (state.selected) stage.select(state.selected, { fly: true });
  renderViewTools();
  if (view === 'walk') $('#tapHint').hidden = true;
}

// ---- piece details ----------------------------------------------------------------------
function currentItem() {
  return state.plan?.items.find((i) => i.key === state.selected);
}

function openProduct(key) {
  if (!key || !stage) return;
  state.selected = key;
  state.hintSeen = true;
  $('#tapHint').hidden = true;
  stage.select(key);
  $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== 'product'; });
  renderProduct();
  $('#sheet').scrollTop = 0;
}

function closeProduct(showDesign = true) {
  if (!state.selected) return;
  state.selected = null;
  stage?.clearSelection();
  if (stage?.mode === 'studio') closeStudio();
  if (showDesign && state.step === 'design') {
    $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== 'design'; });
    renderDesign();
  }
}

function renderProduct() {
  const it = currentItem();
  if (!it) return;
  const p = it.product, t = tierById(p.tier);
  const panel = $('[data-panel="product"]');
  panel.style.setProperty('--tier', `var(--${p.tier})`);
  $('#pCat').replaceChildren(el('i', { 'aria-hidden': 'true' }), `${CATEGORY_LABEL[it.cat]}, ${t.name} range`);
  $('#pName').textContent = p.name;
  $('#pPrice').textContent = it.qty > 1 ? `${fmtMoney(it.price)} for ${it.qty}` : fmtMoney(p.price);
  const shop = $('#pShop');
  shop.href = shopUrl(p);
  shop.innerHTML = '';
  shop.append(`Shop at ${storeName(p.store)}`);
  shop.insertAdjacentHTML('beforeend', EXTERNAL.replace('<svg', '<svg style="width:16px;height:16px"'));
  const [w, d, h] = p.dims;
  $('#pSize').textContent = it.cat === 'rug' || it.cat === 'bathMat'
    ? `${fmtCm(w, state.units)} × ${fmtCm(d, state.units)}`
    : `${fmtCm(w, state.units)} wide, ${fmtCm(d, state.units)} deep, ${fmtCm(h, state.units)} high`;
  $('#pMat').textContent = p.material;
  $('#pWhere').textContent = describePlacement(it);
  $('#pFinishes').replaceChildren(...p.finishes.map((f, i) => el('button', {
    type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(i === it.finish),
    onclick: () => setFinish(it, i),
  }, el('i', { style: `--c:${f.color}`, 'aria-hidden': 'true' }), f.name)));
  renderAlternatives(it);
}

function describePlacement(it) {
  const inst = it.instances[0];
  if (it.layer === 'ceiling') return `Hangs from the ceiling, ${L(state.room.H - (inst.opts?.drop ?? 0))} above the floor.`;
  if (it.layer === 'wall') return `On the ${it.wall} wall, ${L(inst.y)} from the floor.`;
  if (it.layer === 'top') return 'Sits on the piece below it.';
  const { W, D } = state.room;
  const [w] = it.product.dims;
  const along = Math.abs(Math.sin(inst.rot)) > 0.7 ? D : W;
  if (it.layer === 'under') return `Centred under the main pieces, leaving ${L(Math.max(0, (W - w / 100) / 2))} of floor on each side.`;
  return `Fits with ${L(Math.max(0, along - w / 100))} to spare along a ${L(along)} wall.`;
}

function renderAlternatives(it) {
  const slot = slotsFor(state.roomType).find((s) => s.key === it.key);
  const alts = productsInCategory(slot.cat).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.price - a.price);
  const args = planArgs();
  $('#pAlts').replaceChildren(...alts.map((p) => {
    const current = p.id === it.product.id;
    const fits = current || fitsInSlot(args, it.key, p.id);
    const diff = p.price * it.qty - it.price;
    const t = tierById(p.tier);
    return el('li', {},
      el('button', {
        type: 'button', class: 'alt', style: `--tier: var(--${p.tier})`, disabled: !fits || current, 'aria-current': current ? 'true' : null,
        onclick: () => swap(it, p),
      },
      el('span', { class: 'alt-name' }, p.name),
      el('span', { class: 'alt-sub' }, el('span', { class: 'tag-tier' }, t.name), `, ${storeName(p.store)}${fits ? '' : '. Too big for this spot'}`),
      el('span', { class: 'alt-price' }, fmtMoney(p.price * it.qty), el('small', {}, current ? 'In your design' : `${diff > 0 ? '+' : '−'}${fmtMoney(Math.abs(diff))}`))));
  }));
}

function setFinish(it, i) {
  state.finishes[`${it.key}|${it.product.id}`] = i;
  applyPlan();
  stage.select(it.key, { fly: false });
  renderProduct();
}

function swap(it, p) {
  const prev = state.overrides[state.tier][it.key];
  state.overrides[state.tier][it.key] = p.id;
  applyPlan();
  stage.select(it.key, { fly: false });
  renderProduct();
  toast(`Swapped in ${p.name}`, {
    label: 'Undo',
    run: () => {
      if (prev === undefined) delete state.overrides[state.tier][it.key]; else state.overrides[state.tier][it.key] = prev;
      applyPlan();
      if (state.selected) { stage.select(state.selected, { fly: false }); renderProduct(); } else renderDesign();
    },
  });
}

function removePiece() {
  const it = currentItem();
  if (!it) return;
  const prev = state.overrides[state.tier][it.key];
  state.overrides[state.tier][it.key] = null;
  closeProduct();
  applyPlan();
  renderDesign();
  toast(`Removed ${it.product.name}`, {
    label: 'Undo',
    run: () => {
      if (prev === undefined) delete state.overrides[state.tier][it.key]; else state.overrides[state.tier][it.key] = prev;
      applyPlan();
      renderDesign();
    },
  });
}

function openStudio() {
  const it = currentItem();
  if (!it) return;
  const [w, d, h] = it.product.dims;
  stage.openStudio(it.key, { w: fmtCm(w, state.units), d: fmtCm(d, state.units), h: fmtCm(h, state.units) });
  $('#studioName').textContent = it.product.name;
  $('#studioBar').hidden = false;
  $('#viewBar').hidden = true;
  $('#viewTools').hidden = true;
}

function closeStudio() {
  stage.closeStudio();
  $('#studioBar').hidden = true;
  $('#viewBar').hidden = state.step !== 'design';
  $('#viewTools').hidden = !(state.step === 'design' || state.step === 'budget');
  renderViewTools();
}

// ---- wiring ------------------------------------------------------------------------------
function bind() {
  $('#fileCamera').addEventListener('change', onFile);
  $('#fileUpload').addEventListener('change', onFile);
  $('#useSample').addEventListener('click', async () => {
    const s = await ensureSample();
    if (state.photo !== s.photo) setPhoto(s.photo, s.marks, { stand: s.stand, ceiling: s.ceiling });
    goStep('measure');
  });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => goStep(b.dataset.go)));
  $$('[data-units]').forEach((b) => b.addEventListener('click', () => setUnits(b.dataset.units)));
  $$('[data-ref]').forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.ref;
    if (kind === state.ref.kind || !state.room) return;
    state.ref = { kind, value: kind === 'width' ? state.room.W : state.room.H };
    renderRefInput();
    refreshMeasure();
  }));
  $('#standInput').addEventListener('input', (e) => { state.stand = parseFloat(e.target.value); refreshMeasure(); });

  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#tourBtn').addEventListener('click', () => { stage.toggleTour(); renderViewTools(); });
  $('#resetBtn').addEventListener('click', () => stage.resetView());
  $$('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => { state.tab = b.dataset.tab; renderDesign(); }));
  $$('#paintTarget [data-target]').forEach((b) => b.addEventListener('click', () => {
    state.paint = { ...state.paint, target: b.dataset.target };
    stage.setPaint(state.paint);
    renderDesign();
  }));
  $('#customPaint').addEventListener('input', (e) => setPaint(e.target.value, 'Your colour'));
  $('#coverage').addEventListener('input', (e) => { state.coverage = parseFloat(e.target.value); stage.setPaintCoverage(state.coverage); });
  $('#resetDesign').addEventListener('click', () => {
    state.overrides[state.tier] = {};
    state.finishes = {};
    applyPlan({ reveal: true });
    renderDesign();
    toast('Design reset');
  });
  $('#productBack').addEventListener('click', () => closeProduct());
  $('#pStudio').addEventListener('click', openStudio);
  $('#pRemove').addEventListener('click', removePiece);
  $('#studioClose').addEventListener('click', closeStudio);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (stage?.mode === 'studio') closeStudio();
    else if (state.selected) closeProduct();
  });
}

async function init() {
  renderRoomTypes();
  setUnits(state.units);
  measure = new MeasureTool({ stage: $('#stage'), img: $('#photo'), svg: $('#measureSvg'), loupe: $('#loupe'), onChange: () => refreshMeasure() });
  bind();
  try {
    stage = new Stage({
      container: $('#stage'), canvas: $('#gl'), labels: $('#labels'),
      onPick: (key) => {
        if (state.step !== 'design') return;
        if (key) openProduct(key); else if (state.selected) closeProduct();
      },
      onViewChange: () => renderViewTools(),
    });
    const s = await ensureSample();
    setPhoto(s.photo, s.marks, { stand: s.stand, ceiling: s.ceiling });
  } catch (err) {
    console.error(err);
    const box = $('#stageError');
    box.hidden = false;
    box.replaceChildren(el('strong', {}, '3D is not available in this browser'), el('span', {}, 'Roomwise needs WebGL. Try a recent Chrome, Safari or Firefox.'));
  }
  goStep('snap');
}

init();
