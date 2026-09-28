// App controller: Snap, Measure, Budget, Design.
import { Stage } from './scene.js';
import { MeasureTool, solveRoom, defaultMarks } from './measure.js';
import { loadPhotoFile, photoFromCanvas, sampleWallColor } from './photo.js';
import { renderSampleRoom, SAMPLE_OPENINGS } from './sampleRoom.js';
import { planRoom, fitsInSlot, slotsFor, ROOM_TYPES } from './layout.js';
import { TIERS, TIER_RANK, CATEGORY_LABEL, PAINT, PAINT_COLORS, productsInCategory, shopUrl, paintUrl, storeName } from './catalog.js';
import { STYLES, styleById } from './styles.js';
import { VERIFIED } from './verified.js';
import { el, fmtLen, fmtArea, fmtCm, fmtMoney, store } from './util.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STEPS = ['snap', 'measure', 'budget', 'design'];
const LENSES = [{ x: '0.5×', f: 13 }, { x: '1×', f: 26 }, { x: '2×', f: 52 }, { x: '3×', f: 77 }];
const EXTERNAL = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3h7v7M13 3 5 11"/></svg>';
const WALLS = [['back', 'Back wall'], ['left', 'Left wall'], ['right', 'Right wall'], ['front', 'Wall behind you']];
const HERO = ['sofa', 'bed', 'desk', 'sideboard', 'mediaUnit', 'diningTable'];

const state = {
  step: 'snap',
  roomType: store.get('roomType', 'living'),
  purpose: store.get('purpose', 'home'),
  units: store.get('units', 'metric'),
  styleId: store.get('style', 'japandi'),
  photo: null,
  ref: { kind: 'height', value: 2.5 },
  stand: 0.4,
  focal35: 26,
  room: null,
  openings: [],
  tier: 'basic',
  overrides: { basic: {}, luxury: {}, supreme: {} },
  extras: { basic: [], luxury: [], supreme: [] },
  owned: [],
  addonsOff: [],
  finishes: {},
  paint: { color: null, name: null, target: 'all' },
  coverage: 0.55,
  plan: null,
  selected: null,
  view: 'room',
  mood: 'day',
  tab: 'notes',
  reached: 0,
  introShown: false,
  hintSeen: false,
  roomKey: '',
  project: store.get('project', []),
  host: store.get('host', { rate: 95, occupancy: 60 }),
};

let stage = null;
let measure = null;
let sample = null;
const app = $('#app');

// ---- helpers -----------------------------------------------------------------------
const L = (m) => fmtLen(m, state.units);
const tierById = (id) => TIERS.find((t) => t.id === id);
const style = () => styleById(state.styleId);
const roomLabel = () => ROOM_TYPES.find((r) => r.id === state.roomType)?.label ?? 'Room';
const R = () => ({ W: state.room.W, D: state.room.D, H: state.room.H });
const planArgs = (tier = state.tier, styleId = state.styleId) => ({
  roomType: state.roomType, R: R(), tier, style: styleById(styleId), purpose: state.purpose, openings: state.openings,
  overrides: state.overrides[tier], finishes: state.finishes, extras: state.extras[tier], owned: state.owned, addonsOff: state.addonsOff,
});
const itemTotal = (it) => it.price + it.addonTotal;
const linkStatus = (url) => (url ? VERIFIED.links[url]?.r ?? null : null);
const checkedDate = () => new Date(`${VERIFIED.checked}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

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
  container?.querySelectorAll(`[${attr}]`).forEach((b) => {
    const on = b.getAttribute(attr) === String(value);
    if (b.getAttribute('role') === 'tab') b.setAttribute('aria-selected', on);
    else b.setAttribute('aria-checked', on);
  });
}

function listJoin(arr) {
  if (arr.length <= 1) return arr.join('');
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`;
}

// ---- room types, purpose & units ---------------------------------------------------------
function renderRoomTypes() {
  for (const id of ['#roomTypes', '#roomTypes2']) {
    $(id).replaceChildren(...ROOM_TYPES.map((r) => el('button', {
      type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(r.id === state.roomType), 'data-room': r.id,
      onclick: () => setRoomType(r.id),
    }, r.label)));
  }
}

function resetChoices() {
  state.overrides = { basic: {}, luxury: {}, supreme: {} };
  state.extras = { basic: [], luxury: [], supreme: [] };
  state.owned = [];
  state.addonsOff = [];
}

function setRoomType(id) {
  state.roomType = id;
  store.set('roomType', id);
  resetChoices();
  renderRoomTypes();
  if (state.step === 'budget') renderBudget();
  if (state.step === 'design') { applyPlan({ reveal: true }); renderDesign(); }
}

function setPurpose(p) {
  state.purpose = p;
  store.set('purpose', p);
  setChecked($('#purposeSeg'), 'data-purpose', p);
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
  resetChoices();
  state.finishes = {};
  state.paint = { color: null, name: null, target: 'all' };
  state.introShown = false;
  state.reached = 1;
  state.roomKey = '';
  state.openings = photo.isSample ? SAMPLE_OPENINGS.map((o) => ({ ...o })) : null;
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
  $('#lensChips').replaceChildren(...LENSES.map((l) => el('button', {
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
  // A new photo starts with the door you stood in, in the wall behind you.
  if (!state.openings) state.openings = [{ wall: 'front', a0: Math.max(0.1, r.camX - 0.45), a1: Math.min(r.W - 0.1, r.camX + 0.45), y0: 0, y1: Math.min(2.05, r.H - 0.1), kind: 'door' }];
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
  renderOpenings();
}

// ---- windows and doors ------------------------------------------------------------------
const wallLen = (wall) => (wall === 'back' || wall === 'front' ? state.room.W : state.room.D);

function clampOpening(o) {
  const len = wallLen(o.wall), w = Math.min(o.a1 - o.a0, len - 0.2);
  let c = (o.a0 + o.a1) / 2;
  c = Math.min(len - 0.1 - w / 2, Math.max(0.1 + w / 2, c));
  o.a0 = c - w / 2; o.a1 = c + w / 2;
  o.y1 = Math.min(o.y1, state.room.H - 0.12);
  return o;
}

function renderOpenings() {
  const box = $('#openings');
  if (!box || !state.room || !state.openings) return;
  box.replaceChildren(...state.openings.map((o, i) => {
    const len = wallLen(o.wall);
    const change = () => { clampOpening(o); state.roomKey = ''; renderOpenings(); };
    const wall = el('select', { 'aria-label': 'Which wall', onchange: (e) => { o.wall = e.target.value; change(); } },
      ...WALLS.map(([id, label]) => el('option', { value: id, selected: id === o.wall ? '' : null }, label)));
    const pos = el('input', {
      type: 'range', min: 0, max: 1, step: 0.01, value: ((o.a0 + o.a1) / 2 / len).toFixed(2), 'aria-label': 'Position along the wall',
      oninput: (e) => { const w = o.a1 - o.a0, c = +e.target.value * len; o.a0 = c - w / 2; o.a1 = c + w / 2; clampOpening(o); state.roomKey = ''; },
    });
    const width = el('input', {
      type: 'number', min: 0.4, max: 4, step: 0.05, value: (o.a1 - o.a0).toFixed(2), inputmode: 'decimal', 'aria-label': 'Width in metres',
      onchange: (e) => { const w = Math.max(0.4, +e.target.value || 1), c = (o.a0 + o.a1) / 2; o.a0 = c - w / 2; o.a1 = c + w / 2; change(); },
    });
    return el('div', { class: 'opening' },
      el('span', { class: 'opening-kind' }, o.kind === 'window' ? 'Window' : 'Door'),
      wall, pos,
      el('label', { class: 'opening-w' }, width, el('span', {}, 'm wide')),
      el('button', { type: 'button', class: 'tool tool--icon', 'aria-label': `Remove this ${o.kind}`, onclick: () => { state.openings.splice(i, 1); state.roomKey = ''; renderOpenings(); } }, '×'));
  }));
  if (!state.openings.length) box.append(el('p', { class: 'help' }, 'No windows or doors marked yet.'));
}

function addOpening(kind) {
  if (!state.room) return;
  const w = kind === 'window' ? Math.min(1.4, state.room.W * 0.35) : 0.85;
  const o = kind === 'window'
    ? { wall: 'back', a0: state.room.W / 2 - w / 2, a1: state.room.W / 2 + w / 2, y0: 0.9, y1: Math.min(2.2, state.room.H - 0.3), kind }
    : { wall: 'left', a0: state.room.D - 1.2, a1: state.room.D - 1.2 + w, y0: 0, y1: Math.min(2.05, state.room.H - 0.1), kind };
  state.openings.push(clampOpening(o));
  state.roomKey = '';
  renderOpenings();
}

// ---- 3D room preparation -----------------------------------------------------------
function roomDimLabels() {
  const r = state.room;
  return { w: `${L(r.W)} wide`, d: `${L(r.D)} deep`, h: `${L(r.H)} high` };
}

function prepareRoom() {
  const r = state.room;
  const key = [r.W, r.D, r.H, r.camX, r.camY, r.camDist, state.photo.url, JSON.stringify(state.openings)].map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join('|');
  if (key === state.roomKey) return;
  state.roomKey = key;
  stage.setPlan({ items: [] });
  stage.setDesign({ openings: state.openings, style: style(), paint: state.paint, curtains: null, feature: null });
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
  closeRender();
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
    stage.setDesign({ style: style(), curtains: null, feature: null });
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
function renderStyles() {
  $('#styles').replaceChildren(...STYLES.map((s) => el('button', {
    type: 'button', class: 'style-card', role: 'radio', 'aria-checked': String(s.id === state.styleId),
    onclick: () => setStyle(s.id),
  },
  el('span', { class: 'style-swatches', 'aria-hidden': 'true' }, s.palette.map((p) => el('i', { style: `--c:${p.hex}` }))),
  el('span', { class: 'style-name' }, s.name),
  el('span', { class: 'style-tag' }, s.tagline))));
}

function setStyle(id) {
  state.styleId = id;
  store.set('style', id);
  state.finishes = {};
  if (state.step === 'budget') { renderStyles(); renderBudget(); stage?.setDesign({ style: style() }); }
  if (state.step === 'design') { applyPlan({ reveal: false }); renderDesign(); }
}

function renderBudget() {
  const r = state.room;
  $('#roomSummary').textContent = `${roomLabel()}${state.purpose === 'airbnb' ? ' for guests' : ''}, ${L(r.W)} by ${L(r.D)}, ${fmtArea(r.area, state.units)}, with ${L(r.H)} ceilings.`;
  renderStyles();
  const cards = TIERS.map((t) => {
    const plan = planRoom(planArgs(t.id));
    const bought = plan.items.filter((i) => !i.existing);
    const stores = [...new Set(bought.map((i) => storeName(i.product.store)))];
    const hero = bought.find((i) => HERO.includes(i.cat)) ?? bought[0];
    return el('button', { type: 'button', class: `tier tier--${t.id}`, onclick: () => chooseTier(t.id) },
      el('span', { class: 'tier-name' }, t.name),
      el('span', { class: 'tier-sign', 'aria-hidden': 'true' }, t.sign),
      el('span', { class: 'tier-price' }, fmtMoney(plan.total)),
      el('span', { class: 'tier-meta' }, `${plan.count} pieces, textiles included. ${t.tagline}.`),
      el('span', { class: 'tier-blurb' }, hero ? `${hero.product.name} and more from ${listJoin(stores)}.` : t.blurb),
      el('span', { class: 'tier-foot' },
        el('span', { class: 'tier-swatches', 'aria-hidden': 'true' }, t.swatches.map((c) => el('i', { style: `--c:${c}` }))),
        el('span', { class: 'tier-go' }, `Design it ${t.name.toLowerCase()}`)));
  });
  $('#tiers').replaceChildren(...cards);
}

function chooseTier(id) {
  state.tier = id;
  goStep('design', { reveal: true });
}

// ---- design -------------------------------------------------------------------------------
// The wall behind the main piece gets the style's feature treatment, unless a window is in the way.
function featureWall(plan) {
  const hero = plan.items.find((i) => HERO.includes(i.cat) && (i.layer === 'floor' || i.layer === 'fixture'));
  const byRot = (rot) => (Math.abs(rot) < 0.1 ? 'back' : Math.abs(rot - Math.PI / 2) < 0.1 ? 'left' : Math.abs(rot + Math.PI / 2) < 0.1 ? 'right' : 'front');
  const clear = (wall, a0, a1) => !state.openings.some((o) => o.wall === wall && o.a1 > a0 - 0.1 && o.a0 < a1 + 0.1 && o.kind === 'window');
  if (hero) {
    const inst = hero.instances[0], wall = byRot(inst.rot), a = wall === 'back' || wall === 'front' ? inst.x : inst.z;
    const width = hero.product.dims[0] / 100;
    if (clear(wall, a - width / 2 - 0.3, a + width / 2 + 0.3)) return { wall, a, width };
  }
  const walls = ['back', 'left', 'right'].filter((w) => !state.openings.some((o) => o.wall === w)).sort((a, b) => wallLen(b) - wallLen(a));
  return walls.length ? { wall: walls[0], a: wallLen(walls[0]) / 2, width: Math.min(2, wallLen(walls[0]) * 0.5) } : null;
}

function applyPlan({ reveal = false } = {}) {
  state.plan = planRoom(planArgs());
  stage.setDesign({ openings: state.openings, style: style(), paint: state.paint, curtains: state.plan.curtains, feature: featureWall(state.plan) });
  stage.setPlan(state.plan, { reveal, style: style() });
  if (state.selected && !state.plan.items.some((i) => i.key === state.selected)) closeProduct();
}

function paintInfo(tier = state.tier) {
  if (!state.paint.color || !state.room) return null;
  const { W, D, H } = state.room;
  const openArea = state.openings.reduce((s, o) => s + (o.a1 - o.a0) * (o.y1 - o.y0), 0);
  const area = state.paint.target === 'all' ? Math.max(4, 2 * (W + D) * H - openArea) : W * H * 0.95;
  const litres = Math.max(1, Math.ceil((area * 2) / 10));
  const spec = PAINT[tier];
  const gallons = Math.ceil(litres / 3.785);
  return { area, litres, gallons, price: gallons * 3.785 * spec.perLitre, spec };
}

function renderDesign() {
  const plan = state.plan;
  if (!plan) return;
  $('#tierSwitch').replaceChildren(...TIERS.map((t) => {
    const total = planRoom(planArgs(t.id)).total + (paintInfo(t.id)?.price ?? 0);
    return el('button', {
      type: 'button', role: 'tab', 'aria-selected': String(t.id === state.tier), class: `tier--${t.id}`,
      onclick: () => { if (t.id !== state.tier) { state.tier = t.id; applyPlan({ reveal: true }); renderDesign(); } },
    }, el('span', { class: 't-name' }, t.name), el('span', { class: 't-total' }, fmtMoney(total)));
  }));
  $('#styleSwitch').replaceChildren(...STYLES.map((s) => el('button', {
    type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(s.id === state.styleId), onclick: () => setStyle(s.id),
  }, el('i', { class: 'chip-dot', style: `--c:${s.palette[1].hex}`, 'aria-hidden': 'true' }), s.name)));
  const paint = paintInfo();
  $('#total').textContent = fmtMoney(plan.total + (paint?.price ?? 0));
  const owned = plan.items.filter((i) => i.owned).length;
  $('#totalMeta').textContent = `${plan.count} pieces${paint ? ' and paint' : ''}${owned ? `, ${owned} you already have` : ''}`;
  $('#hostTab').hidden = state.purpose !== 'airbnb';
  if (state.tab === 'host' && state.purpose !== 'airbnb') state.tab = 'notes';
  setChecked($('.tabs'), 'data-tab', state.tab);
  $$('[data-tabpanel]').forEach((p) => { p.hidden = p.dataset.tabpanel !== state.tab; });

  renderNotes();
  renderPieces();
  renderPaint();
  renderShop();
  renderHost();
  renderProject();
}

function renderPieces() {
  const plan = state.plan;
  const bought = plan.items.filter((i) => !i.existing);
  $('#pieces').replaceChildren(...bought.map((it) => {
    const f = it.product.finishes[it.finish] ?? it.product.finishes[0];
    return el('li', { class: `piece${it.owned ? ' piece--owned' : ''}` },
      el('button', { type: 'button', class: 'piece-main', onclick: () => openProduct(it.key) },
        el('span', { class: 'piece-dot', style: `--c:${f.color}`, 'aria-hidden': 'true' }),
        el('span', {},
          el('span', { class: 'piece-name' }, it.product.name),
          el('span', { class: 'piece-sub' }, `${CATEGORY_LABEL[it.cat]}${it.qty > 1 ? ` × ${it.qty}` : ''}, ${storeName(it.product.store)}${it.owned ? ', you have it' : ''}`)),
        el('span', { class: 'piece-price' }, it.owned ? 'Owned' : fmtMoney(itemTotal(it)))),
      shopLink(shopUrl(it.product, it.finish), `Shop ${it.product.name} at ${storeName(it.product.store)}`));
  }));
  const kept = plan.items.filter((i) => i.existing);
  const extras = plan.suggestions;
  $('#extras').replaceChildren(...[
    kept.length ? el('p', { class: 'kept' }, `Keeping your ${listJoin(kept.map((k) => CATEGORY_LABEL[k.cat].toLowerCase()))}. The design works around them.`) : null,
    extras.length ? el('p', { class: 'label' }, 'Add if you like') : null,
    ...extras.map((s) => el('button', { type: 'button', class: 'chip chip--add', onclick: () => addExtra(s.key) },
      `+ ${s.product.name}`, el('span', { class: 'n' }, fmtMoney(s.product.price * (s.qty ?? 1))))),
  ].filter(Boolean));
  const removed = slotsFor(state.roomType).filter((s) => state.overrides[state.tier][s.key] === null);
  $('#removed').replaceChildren(...(removed.length ? [
    el('span', {}, 'Removed:'),
    ...removed.map((s) => el('button', { type: 'button', class: 'chip', onclick: () => restore(s.key) }, `Put back ${CATEGORY_LABEL[s.cat].toLowerCase()}`)),
  ] : []));
}

function addExtra(key) {
  state.extras[state.tier] = [...new Set([...state.extras[state.tier], key])];
  applyPlan();
  renderDesign();
  const it = state.plan.items.find((i) => i.key === key);
  if (it) toast(`Added ${it.product.name}`, { label: 'Undo', run: () => { state.extras[state.tier] = state.extras[state.tier].filter((k) => k !== key); applyPlan(); renderDesign(); } });
}

function shopLink(href, label) {
  if (!href) return el('span');
  const a = el('a', { class: 'shop-link', href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': label }, 'Shop');
  a.insertAdjacentHTML('beforeend', EXTERNAL);
  return a;
}

// ---- design notes: why this works, with this room's real numbers --------------------------------
function designNotes() {
  const plan = state.plan, s = style(), r = state.room;
  const by = (k) => plan.items.find((i) => i.key === k);
  const notes = [];
  const sofa = by('sofa'), table = by('coffeeTable'), rug = by('rug'), bed = by('bed');
  if (sofa && table) {
    const gap = Math.hypot(table.instances[0].x - sofa.instances[0].x, table.instances[0].z - sofa.instances[0].z) - (sofa.product.dims[1] + table.product.dims[1]) / 200;
    notes.push(`The coffee table sits ${L(Math.max(0.3, gap))} from the sofa: close enough to reach a drink, with room for your knees (designers aim for 40 to 45 cm).`);
  }
  if (rug && (sofa || bed)) {
    const host = sofa ?? bed;
    notes.push(`The ${rug.product.name} (${fmtCm(rug.product.dims[0], state.units)} × ${fmtCm(rug.product.dims[1], state.units)}) reaches under the front legs of the ${CATEGORY_LABEL[host.cat].toLowerCase()}, which ties the zone together and makes the floor look bigger.`);
  }
  const lights = plan.items.filter((i) => ['floorLamp', 'tableLamp', 'deskLamp', 'ceilingLight'].includes(i.cat));
  if (lights.length >= 2) notes.push(`${lights.reduce((n, i) => n + i.qty, 0)} light sources at different heights (${listJoin([...new Set(lights.map((i) => CATEGORY_LABEL[i.cat].toLowerCase()))])}). Layered light is what makes a room feel warm at night: switch to Evening to see it.`);
  if (plan.curtains) {
    const n = state.openings.filter((o) => o.kind === 'window').length;
    notes.push(`Curtains on ${n === 1 ? 'the window' : `all ${n} windows`} hang 30 cm above the frame and 25 cm past each side, so the windows look taller and wider and let in all the light.`);
  }
  const door = state.openings.find((o) => o.kind === 'door');
  if (door) notes.push('A 95 cm path is kept clear in front of the door, so the room opens up as you walk in.');
  const walk = r.W * r.D - plan.items.filter((i) => i.layer === 'floor').reduce((a, i) => a + (i.product.dims[0] * i.product.dims[1] * i.qty) / 10000, 0);
  notes.push(`Furniture covers ${Math.round(100 - (walk / (r.W * r.D)) * 100)}% of the floor. Designers keep it under 60% so a room never feels crowded.`);
  const soft = plan.items.filter((i) => ['pillows', 'throw', 'bedding', 'curtains', 'towels'].includes(i.cat));
  if (soft.length) notes.push(`Textiles do the finishing: ${listJoin(soft.map((i) => i.product.name))}. They cost ${fmtMoney(soft.reduce((a, i) => a + itemTotal(i), 0))} together and are the cheapest way to make a room feel lived in.`);
  return [...s.notes, ...notes];
}

function renderNotes() {
  const s = style();
  $('#notes').replaceChildren(
    el('div', { class: 'concept-head' },
      el('span', { class: 'style-swatches', 'aria-hidden': 'true' }, s.palette.map((p) => el('i', { style: `--c:${p.hex}`, title: p.name }))),
      el('h3', {}, s.name),
      el('p', {}, s.story)),
    el('p', { class: 'label' }, 'Why this design works'),
    el('ul', { class: 'notes' }, ...designNotes().map((n) => el('li', {}, n))),
    el('p', { class: 'palette' }, ...s.palette.map((p) => el('span', {}, el('i', { style: `--c:${p.hex}`, 'aria-hidden': 'true' }), p.name))));
}

function renderPaint() {
  const none = el('button', {
    type: 'button', class: 'swatch swatch--none', role: 'radio', 'aria-checked': String(!state.paint.color),
    onclick: () => setPaint(null, null),
  }, el('i', { 'aria-hidden': 'true' }), `${style().palette[0].name} (style)`);
  const sw = PAINT_COLORS.map((c) => el('button', {
    type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(state.paint.color === c.color),
    onclick: () => setPaint(c.color, c.name),
  }, el('i', { style: `--c:${c.color}`, 'aria-hidden': 'true' }), c.name));
  $('#swatches').replaceChildren(none, ...sw);
  setChecked($('#paintTarget'), 'data-target', state.paint.target);
  const info = paintInfo();
  const need = $('#paintNeed');
  if (!info) {
    need.textContent = `The walls show the ${style().name} colour. Pick another to see it in 3D and on your photo.`;
  } else {
    const amount = state.units === 'imperial' ? `${info.gallons} gallon${info.gallons > 1 ? 's' : ''}` : `${info.litres} litres (${info.gallons} gal)`;
    const area = state.units === 'imperial' ? `${Math.round(info.area * 10.764)} ft²` : `${info.area.toFixed(0)} m²`;
    need.textContent = `${state.paint.name}: about ${amount} for two coats over ${area} of wall, windows and doors left out. ${info.spec.name}, about ${fmtMoney(info.price)}.`;
  }
}

function setPaint(color, name) {
  state.paint = { ...state.paint, color, name };
  if (color) $('#customPaint').value = color;
  stage.setPaint(state.paint);
  renderDesign();
}

function statusTag(url) {
  const s = linkStatus(url);
  if (s === 'OK') return el('span', { class: 'chk chk--ok', title: `Page opened by our link checker on ${checkedDate()}` }, 'Checked');
  if (s === 'BLOCKED') return el('span', { class: 'chk', title: 'This store blocks automated checks. The link comes from its own product listing.' }, 'Store listing');
  return null;
}

function renderShop() {
  const groups = new Map();
  for (const it of state.plan.items.filter((i) => !i.existing)) {
    const g = groups.get(it.product.store) ?? [];
    g.push(it);
    groups.set(it.product.store, g);
  }
  const paint = paintInfo();
  const blocks = [...groups.entries()].map(([st, items]) => el('div', { class: 'shop-group' },
    el('div', { class: 'shop-head' }, el('h3', {}, storeName(st)), el('span', {}, fmtMoney(items.reduce((s, i) => s + itemTotal(i), 0)))),
    ...items.flatMap((it) => {
      const url = shopUrl(it.product, it.finish);
      const f = it.product.finishes[it.finish];
      return [
        el('div', { class: `shop-row${it.owned ? ' is-owned' : ''}` },
          el('span', {}, it.product.name, el('span', { class: 'n' }, `${it.product.finishes.length > 1 ? `, ${f.name}` : ''}${it.qty > 1 ? ` × ${it.qty}` : ''}`), statusTag(url)),
          el('span', { class: 'num' }, it.owned ? 'Owned' : fmtMoney(it.price)),
          shopLink(url, `Shop ${it.product.name} at ${storeName(st)}`)),
        ...it.addons.map((a) => el('div', { class: `shop-row shop-row--addon${a.on ? '' : ' is-off'}` },
          el('label', {}, el('input', { type: 'checkbox', checked: a.on ? '' : null, disabled: it.owned ? '' : null, onchange: () => toggleAddon(it.key, a.id) }),
            ` ${a.name}`, a.qty > 1 ? el('span', { class: 'n' }, ` × ${a.qty}`) : null, a.store !== st ? el('span', { class: 'n' }, `, ${storeName(a.store)}`) : null),
          el('span', { class: 'num' }, a.on ? fmtMoney(a.total) : '–'),
          shopLink(a.url, `Shop ${a.name}`))),
      ];
    })));
  if (paint) {
    blocks.push(el('div', { class: 'shop-group' },
      el('div', { class: 'shop-head' }, el('h3', {}, `Paint, ${storeName(paint.spec.store)}`), el('span', {}, fmtMoney(paint.price))),
      el('div', { class: 'shop-row' },
        el('span', {}, `${paint.spec.name}, ${state.paint.name}`, el('span', { class: 'n' }, ` × ${paint.gallons}`)),
        el('span', { class: 'num' }, fmtMoney(paint.price)),
        shopLink(paintUrl(state.tier), `Shop ${paint.spec.name}`))));
  }
  $('#shop').replaceChildren(...blocks);
  const all = Object.values(VERIFIED.links);
  $('#checkedNote').textContent = `Every link goes to the product page. Our checker opened them in a real browser on ${checkedDate()}: ${all.filter((x) => x.r === 'OK').length} pages loaded with the product and its price. ${listJoin(['Design Within Reach', 'Walmart'])} block automated browsers, so their links come from the stores' own listings. Prices change often: check them at the store.`;
}

function toggleAddon(key, id) {
  const k = `${key}|${id}`;
  state.addonsOff = state.addonsOff.includes(k) ? state.addonsOff.filter((x) => x !== k) : [...state.addonsOff, k];
  applyPlan();
  renderDesign();
  if (state.selected) renderProduct();
}

// ---- Airbnb: guest essentials and payback --------------------------------------------------
function renderHost() {
  if (state.purpose !== 'airbnb') { $('#host').replaceChildren(); return; }
  const plan = state.plan;
  const has = (cat) => plan.items.some((i) => i.cat === cat);
  const sleeper = plan.items.find((i) => i.cat === 'sofa' && i.product.tags.includes('sleeps'));
  const beds = plan.items.filter((i) => i.cat === 'bed').length;
  const sleeps = beds * 2 + (sleeper ? (sleeper.product.id.includes('tatum') ? 1 : 2) : 0);
  const checks = [
    ['Blackout or room-darkening curtains', plan.items.some((i) => i.cat === 'curtains' && i.product.tags.includes('airbnb')) || !['bedroom', 'studio'].includes(state.roomType)],
    ['Reading light on each side of the bed', !['bedroom', 'studio'].includes(state.roomType) || plan.items.some((i) => i.cat === 'tableLamp')],
    ['Luggage rack', !['bedroom', 'studio'].includes(state.roomType) || has('luggageRack')],
    ['Full-length mirror', !['bedroom'].includes(state.roomType) || has('floorMirror')],
    ['Second set of bedding and towels', false],
    ['Smoke and carbon monoxide alarms', false],
    ['First-aid kit and fire extinguisher', false],
    ['Wi-Fi name and password on a card', false],
  ];
  const total = plan.total;
  const nightly = state.host.rate * (state.host.occupancy / 100) * 30;
  const months = nightly > 0 ? total / nightly : Infinity;
  const input = (label, key, min, max, step, suffix) => el('label', { class: 'host-input' }, el('span', {}, label),
    el('input', { type: 'number', min, max, step, value: state.host[key], inputmode: 'decimal', oninput: (e) => { state.host[key] = +e.target.value || 0; store.set('host', state.host); renderHost(); } }), el('span', {}, suffix));
  $('#host').replaceChildren(
    sleeps ? el('p', { class: 'host-big' }, `Sleeps ${sleeps}`, el('span', {}, sleeper ? ` including the ${sleeper.product.name}` : '')) : null,
    el('p', { class: 'label' }, 'Guest essentials'),
    el('ul', { class: 'checklist' }, ...checks.map(([t, ok]) => el('li', { class: ok ? 'ok' : '' }, el('i', { 'aria-hidden': 'true' }, ok ? '✓' : '○'), t, ok ? '' : el('span', { class: 'n' }, ' Not furniture: add before your first guest.')))),
    el('p', { class: 'label' }, 'How fast it pays back'),
    el('div', { class: 'host-inputs' }, input('Nightly rate', 'rate', 10, 2000, 5, 'USD'), input('Occupancy', 'occupancy', 5, 100, 5, '%')),
    el('p', { class: 'host-result' }, Number.isFinite(months)
      ? `This ${tierById(state.tier).name.toLowerCase()} design costs ${fmtMoney(total)}. At ${fmtMoney(state.host.rate)} a night and ${state.host.occupancy}% occupancy it pays for itself in about ${months < 1 ? `${Math.max(1, Math.round(months * 30))} days` : `${months.toFixed(1)} months`} of bookings.`
      : 'Enter a nightly rate to see the payback time.'),
    el('p', { class: 'help' }, 'Listings with a styled, well-lit main photo get noticeably more clicks. Use Real photo in Evening mode for a cosy listing picture.'));
}

// ---- project: several rooms, one budget ----------------------------------------------------
function saveRoom() {
  const plan = state.plan;
  const n = state.project.filter((p) => p.roomType === state.roomType).length;
  const entry = {
    id: Date.now(), roomType: state.roomType, label: `${roomLabel()}${n ? ` ${n + 1}` : ''}`, tier: state.tier, style: state.styleId,
    total: plan.total + (paintInfo()?.price ?? 0),
    items: plan.items.filter((i) => !i.existing && !i.owned).map((i) => ({ name: i.product.name, store: i.product.store, qty: i.qty, price: itemTotal(i), url: shopUrl(i.product, i.finish) })),
  };
  state.project = [...state.project, entry];
  store.set('project', state.project);
  renderProject();
  toast(`${entry.label} added to your project`);
}

function renderProject() {
  const p = state.project;
  if (!p.length) { $('#project').replaceChildren(); return; }
  const total = p.reduce((s, r) => s + r.total, 0);
  const byStore = new Map();
  p.forEach((r) => r.items.forEach((i) => byStore.set(i.store, (byStore.get(i.store) ?? 0) + i.price)));
  $('#project').replaceChildren(el('details', { class: 'project-box' },
    el('summary', {}, el('span', {}, `My project: ${p.length} room${p.length > 1 ? 's' : ''}`), el('strong', {}, fmtMoney(total))),
    el('ul', { class: 'project-rooms' }, ...p.map((r) => el('li', {},
      el('span', {}, r.label, el('span', { class: 'n' }, ` ${tierById(r.tier).name}, ${styleById(r.style).name}`)),
      el('span', { class: 'num' }, fmtMoney(r.total)),
      el('button', { type: 'button', class: 'tool tool--icon', 'aria-label': `Remove ${r.label}`, onclick: () => { state.project = state.project.filter((x) => x.id !== r.id); store.set('project', state.project); renderProject(); } }, '×')))),
    el('p', { class: 'help' }, `By store: ${[...byStore.entries()].map(([s, v]) => `${storeName(s)} ${fmtMoney(v)}`).join(', ')}.`)));
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
  setChecked($('#moodSeg'), 'data-mood', state.mood);
  const vps = $('#viewpoints');
  vps.hidden = view !== 'walk';
  if (view === 'walk') {
    vps.replaceChildren(...stage.viewpoints().map((v) => el('button', { type: 'button', class: 'tool', onclick: () => stage.goToViewpoint(v.id) }, v.label)));
  }
  $('#tourBtn').hidden = view === 'photo';
  $('#resetBtn').hidden = view === 'photo';
  $('#photoBtn').hidden = state.step !== 'design';
  $('#moodSeg').hidden = state.step !== 'design';
  $('#tourBtn').setAttribute('aria-pressed', String(!!stage.touring));
  $('#tourLabel').textContent = stage.touring ? 'Stop turning' : view === 'walk' ? 'Look around 360°' : 'Turn 360°';
}

function setView(view) {
  state.view = view;
  closeRender();
  stage.clearSelection();
  stage.setView(view);
  if (state.selected) stage.select(state.selected, { fly: true });
  renderViewTools();
  if (view === 'walk') $('#tapHint').hidden = true;
}

function setMood(mood) {
  state.mood = mood;
  closeRender();
  stage.setMood(mood);
  renderViewTools();
}

// ---- real photo ----------------------------------------------------------------------------
let rendering = false;
async function realPhoto() {
  if (rendering || !stage) return;
  rendering = true;
  const box = $('#render'), img = $('#renderImg'), bar = $('#renderProgress i'), text = $('#renderText');
  box.hidden = false;
  box.classList.remove('is-done');
  img.removeAttribute('src');
  bar.style.width = '0%';
  text.textContent = 'Tracing light as it bounces around the room…';
  try {
    const url = await stage.realPhoto({ onProgress: (p) => { bar.style.width = `${Math.round(p * 100)}%`; } });
    if (url) {
      img.src = url;
      box.classList.add('is-done');
      text.textContent = 'Press and hold (or right-click) the picture to save it.';
    } else if (!box.hidden) closeRender();
  } catch (err) {
    console.error(err);
    text.textContent = 'This device could not render a real photo. Try a laptop or a newer phone.';
  }
  rendering = false;
}

function closeRender() {
  stage?.cancelRealPhoto();
  $('#render').hidden = true;
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
  closeRender();
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
  $('#pCat').replaceChildren(el('i', { 'aria-hidden': 'true' }), p.existing ? CATEGORY_LABEL[it.cat] : `${CATEGORY_LABEL[it.cat]}, ${t.name} range`);
  $('#pName').textContent = p.name;
  const url = shopUrl(p, it.finish);
  if (p.existing) {
    $('#pPrice').textContent = 'Already in the room';
    $('#pStore').textContent = '';
  } else {
    $('#pPrice').textContent = it.qty > 1 ? `${fmtMoney(it.unitPrice * it.qty)} for ${it.qty}` : fmtMoney(it.unitPrice);
    $('#pStore').textContent = `at ${storeName(p.store)}${p.unit && p.unit !== 'each' ? `, ${p.unit}` : ''}`;
  }
  $('#pWhy').textContent = p.why + (p.rating ? ` Rated ${p.rating[0]} out of 5${p.rating[1] ? ` by ${p.rating[1].toLocaleString('en-US')} buyers` : ''}.` : '');
  const st = linkStatus(url);
  $('#pCheck').textContent = st === 'OK'
    ? `Link checked on ${checkedDate()}: the page opened and showed this product${VERIFIED.links[url]?.p ? ` at ${fmtMoney(VERIFIED.links[url].p)}` : ''}.`
    : st === 'BLOCKED' ? `${storeName(p.store)} blocks automated checks. This link comes from its own product listing.` : '';
  const shop = $('#pShop');
  shop.hidden = !url || p.existing;
  if (url) {
    shop.href = url;
    shop.replaceChildren(`Shop at ${storeName(p.store)}`);
    shop.insertAdjacentHTML('beforeend', EXTERNAL.replace('<svg', '<svg style="width:16px;height:16px"'));
  }
  $('#pStudio').hidden = it.layer === 'dress' || it.layer === 'windows';
  const [w, d, h] = p.dims;
  $('#pSize').textContent = ['pillows', 'throw', 'bedding', 'curtains', 'towels'].includes(it.cat) ? (p.material.match(/\d+x\d+"/)?.[0] ?? 'See the store for sizes')
    : it.cat === 'rug' || it.cat === 'bathMat' ? `${fmtCm(w, state.units)} × ${fmtCm(d, state.units)}`
      : `${fmtCm(w, state.units)} wide, ${fmtCm(d, state.units)} deep, ${fmtCm(h, state.units)} high`;
  $('#pMat').textContent = p.material;
  $('#pWhere').textContent = describePlacement(it);
  $('#pFinishes').replaceChildren(...p.finishes.map((f, i) => el('button', {
    type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(i === it.finish),
    onclick: () => setFinish(it, i),
  }, el('i', { style: `--c:${f.color}`, 'aria-hidden': 'true' }), f.name, f.price ? el('span', { class: 'n' }, ` ${fmtMoney(f.price)}`) : null)));
  $('#pAddonsField').hidden = !it.addons.length;
  $('#pAddons').replaceChildren(...it.addons.map((a) => el('li', {},
    el('label', {}, el('input', { type: 'checkbox', checked: a.on ? '' : null, disabled: it.owned ? '' : null, onchange: () => toggleAddon(it.key, a.id) }),
      el('span', {}, el('strong', {}, a.name), a.qty > 1 ? ` × ${a.qty}` : '', el('small', {}, a.why))),
    el('span', { class: 'num' }, fmtMoney(a.price * a.qty)),
    shopLink(a.url, `Shop ${a.name}`))));
  const own = $('#pOwned');
  own.closest('label').hidden = p.existing;
  own.checked = it.owned;
  $('#pRemove').hidden = p.existing;
  renderAlternatives(it);
}

function describePlacement(it) {
  if (it.layer === 'dress') {
    const host = state.plan.items.find((i) => i.key === it.host);
    return `Styled on the ${host ? host.product.name : CATEGORY_LABEL[it.host]?.toLowerCase()}${it.qty > 1 ? `, ${it.qty} ${it.product.unit ?? ''}`.replace(/ $/, '') : ''}.`;
  }
  if (it.layer === 'windows') {
    const n = state.openings.filter((o) => o.kind === 'window').length;
    return `On ${n === 1 ? 'your window' : `all ${n} windows`}: ${it.qty} ${it.product.unit ?? 'pair'}${it.qty > 1 ? 's' : ''}, hung 30 cm above the frame.`;
  }
  const inst = it.instances[0];
  if (it.layer === 'fixture') return 'Kept where it is.';
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
  const alts = productsInCategory(slot.cat).sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.price - b.price);
  const args = planArgs();
  $('#pAlts').replaceChildren(...alts.map((p) => {
    const current = p.id === it.product.id;
    const fits = current || fitsInSlot(args, it.key, p.id);
    const unit = p.unit === 'set of 2' ? 2 : 1;
    const qty = it.layer === 'dress' || it.layer === 'windows' ? Math.max(1, Math.ceil((it.qty * (it.product.unit === 'set of 2' ? 2 : 1) * (it.layer === 'windows' ? 1 / it.product.perWindow : 1) * (it.layer === 'windows' ? p.perWindow : 1)) / unit)) : it.qty;
    const cost = p.price * qty;
    const diff = cost - it.unitPrice * it.qty;
    const t = tierById(p.tier);
    return el('li', {},
      el('button', {
        type: 'button', class: 'alt', style: `--tier: var(--${p.tier})`, disabled: !fits || current ? '' : null, 'aria-current': current ? 'true' : null,
        onclick: () => swap(it, p),
      },
      el('span', { class: 'alt-name' }, p.name),
      el('span', { class: 'alt-sub' }, el('span', { class: 'tag-tier' }, t.name), `, ${storeName(p.store)}${fits ? '' : '. Too big for this spot'}`),
      el('span', { class: 'alt-price' }, fmtMoney(cost), el('small', {}, current ? 'In your design' : `${diff > 0 ? '+' : '−'}${fmtMoney(Math.abs(diff))}`))));
  }));
}

function setFinish(it, i) {
  state.finishes[`${it.key}|${it.product.id}`] = i;
  applyPlan();
  stage.select(it.key, { fly: false });
  renderProduct();
}

function setOwned(on) {
  const it = currentItem();
  if (!it) return;
  state.owned = on ? [...new Set([...state.owned, it.key])] : state.owned.filter((k) => k !== it.key);
  applyPlan();
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
  closeRender();
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
  $$('[data-purpose]').forEach((b) => b.addEventListener('click', () => setPurpose(b.dataset.purpose)));
  $$('[data-ref]').forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.ref;
    if (kind === state.ref.kind || !state.room) return;
    state.ref = { kind, value: kind === 'width' ? state.room.W : state.room.H };
    renderRefInput();
    refreshMeasure();
  }));
  $('#standInput').addEventListener('input', (e) => { state.stand = parseFloat(e.target.value); refreshMeasure(); });
  $('#addWindow').addEventListener('click', () => addOpening('window'));
  $('#addDoor').addEventListener('click', () => addOpening('door'));

  $$('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $$('[data-mood]').forEach((b) => b.addEventListener('click', () => setMood(b.dataset.mood)));
  $('#photoBtn').addEventListener('click', realPhoto);
  $('#renderClose').addEventListener('click', closeRender);
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
  $('#anotherIdea').addEventListener('click', () => {
    const i = STYLES.findIndex((s) => s.id === state.styleId);
    setStyle(STYLES[(i + 1) % STYLES.length].id);
    toast(`New concept: ${style().name}`);
  });
  $('#resetDesign').addEventListener('click', () => {
    state.overrides[state.tier] = {};
    state.extras[state.tier] = [];
    state.owned = [];
    state.addonsOff = [];
    state.finishes = {};
    applyPlan({ reveal: true });
    renderDesign();
    toast('Design reset');
  });
  $('#saveRoom').addEventListener('click', saveRoom);
  $('#productBack').addEventListener('click', () => closeProduct());
  $('#pStudio').addEventListener('click', openStudio);
  $('#pRemove').addEventListener('click', removePiece);
  $('#pOwned').addEventListener('change', (e) => setOwned(e.target.checked));
  $('#studioClose').addEventListener('click', closeStudio);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#render').hidden) closeRender();
    else if (stage?.mode === 'studio') closeStudio();
    else if (state.selected) closeProduct();
  });
}

async function init() {
  renderRoomTypes();
  setUnits(state.units);
  setChecked($('#purposeSeg'), 'data-purpose', state.purpose);
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
    globalThis.roomwise = { stage, state };
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
