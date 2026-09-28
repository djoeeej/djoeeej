// Layout engine: places real-size catalog pieces into the measured room, then dresses them.
//
// Room coordinates (metres): the back wall (the one facing the camera in the photo) is z = 0,
// the left wall x = 0, the right wall x = W, the front wall z = D, the floor y = 0.
// Each room type is an ordered list of slots. A slot ranks its candidate products (purpose,
// style, size) and tries each one at each candidate position until one fits without
// colliding with furniture, blocking a door or standing in front of a window.
// Textiles are slots too: cushions and throws dress the sofa, bedding dresses the bed,
// curtains hang on every window, towels go on the towel ladder.
import { productsFor, getProduct, allProducts, TIER_RANK, SOFT_GOODS } from './catalog.js';
import { styleFinish, stylePicks } from './styles.js';

export const ROOM_TYPES = [
  { id: 'living', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'studio', label: 'Studio apartment' },
  { id: 'office', label: 'Home office' },
  { id: 'dining', label: 'Dining room' },
  { id: 'bathroom', label: 'Bathroom' },
];

const PI = Math.PI;
const GAP = 0.04;
const TIERS_DOWN = { basic: ['basic'], luxury: ['luxury', 'basic'], supreme: ['supreme', 'luxury', 'basic'] };
const SIZE_FIRST = new Set(['sofa', 'rug', 'bed', 'diningTable', 'desk', 'mediaUnit', 'bookcase', 'wardrobe', 'dresser', 'sideboard', 'coffeeTable', 'mirror']);
const near = (a, b) => Math.abs(a - b) < 0.02;
const dimsOf = (p) => ({ w: p.dims[0] / 100, d: p.dims[1] / 100, h: p.dims[2] / 100 });

// Axis-aligned footprint of a rotated piece.
export function footprint(pose, dm) {
  const c = Math.abs(Math.cos(pose.rot)), s = Math.abs(Math.sin(pose.rot));
  const fw = c * dm.w + s * dm.d, fd = s * dm.w + c * dm.d;
  return { x0: pose.x - fw / 2, x1: pose.x + fw / 2, z0: pose.z - fd / 2, z1: pose.z + fd / 2 };
}

const overlaps = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;

// ---- pose helpers -------------------------------------------------------------------
const back = (R, d, x = R.W / 2) => ({ x, z: d.d / 2 + 0.03, rot: 0 });
const front = (R, d, x = R.W / 2) => ({ x, z: R.D - d.d / 2 - 0.03, rot: PI });
const left = (R, d, z) => ({ x: d.d / 2 + 0.03, z, rot: PI / 2 });
const right = (R, d, z) => ({ x: R.W - d.d / 2 - 0.03, z, rot: -PI / 2 });

function corners(R, d, m = 0.06) {
  const hx = Math.max(d.w, d.d) / 2 + m;
  return [[hx, hx], [R.W - hx, hx], [hx, R.D - hx], [R.W - hx, R.D - hx]].map(([x, z]) => [{ x, z, rot: 0 }]);
}

function onWall(R, host, d, y) {
  const r = host.rot;
  if (near(r, 0)) return { x: host.x, y, z: d.d / 2 + 0.004, rot: 0, wall: 'back' };
  if (near(r, PI / 2)) return { x: d.d / 2 + 0.004, y, z: host.z, rot: PI / 2, wall: 'left' };
  if (near(r, -PI / 2)) return { x: R.W - d.d / 2 - 0.004, y, z: host.z, rot: -PI / 2, wall: 'right' };
  return { x: host.x, y, z: R.D - d.d / 2 - 0.004, rot: PI, wall: 'front' };
}

// Centre of a wall at height y, for art when there is no host piece.
const wallCentre = (R, d, wall, y, a) => ({
  back: { x: a ?? R.W / 2, y, z: d.d / 2 + 0.004, rot: 0, wall: 'back' },
  front: { x: a ?? R.W / 2, y, z: R.D - d.d / 2 - 0.004, rot: PI, wall: 'front' },
  left: { x: d.d / 2 + 0.004, y, z: a ?? R.D / 2, rot: PI / 2, wall: 'left' },
  right: { x: R.W - d.d / 2 - 0.004, y, z: a ?? R.D / 2, rot: -PI / 2, wall: 'right' },
}[wall]);

// Hang a light so its lowest point keeps `clearance` metres of headroom.
function ceiling(R, d, x, z, clearance) {
  const drop = Math.min(d.h, R.H - clearance);
  if (drop < d.h * 0.62) return [];
  return [[{ x, z, y: R.H, rot: 0, opts: { drop } }]];
}

function local(t, lx, lz, lrot) {
  const c = Math.cos(t.rot), s = Math.sin(t.rot);
  return { x: t.x + lx * c + lz * s, z: t.z - lx * s + lz * c, rot: lrot + t.rot };
}

// In front of a piece that stands against a wall (its local +z), `gap` metres from its front edge.
const inFront = (t, gap, d) => local(t, 0, t.d / 2 + gap + d.d / 2, 0);

function chairsAround(t, d) {
  if (!t) return [];
  const tuck = 0.12;
  if (t.shape === 'round') {
    const r = t.w / 2 + d.d / 2 - tuck;
    const at = (a) => local(t, Math.sin(a) * r, Math.cos(a) * r, a + PI);
    return [[0, PI / 2, PI, -PI / 2].map(at), [PI / 4, -PI / 4, PI * 0.75, -PI * 0.75].map(at), [0, PI].map(at)];
  }
  const bz = -t.d / 2 - d.d / 2 + tuck, fz = t.d / 2 + d.d / 2 - tuck;
  const xs = t.seats >= 6 ? [-t.w / 4, t.w / 4] : [-t.w / 4.2, t.w / 4.2];
  const sides = xs.flatMap((x) => [local(t, x, bz, 0), local(t, x, fz, PI)]);
  const ex = t.w / 2 + d.d / 2 - 0.1;
  const ends = [local(t, -ex, 0, PI / 2), local(t, ex, 0, -PI / 2)];
  const opts = [];
  if (t.seats >= 6) opts.push([...sides, ...ends]);
  opts.push(sides, [local(t, 0, bz, 0), local(t, 0, fz, PI)], [local(t, 0, fz, PI), ...ends]);
  return opts;
}

// Art over a host piece, or on the biggest free wall.
function artOver(R, d, host, lift = 0.22) {
  const o = [];
  if (host) o.push([onWall(R, host, d, host.h + lift)]);
  for (const w of ['back', 'left', 'right']) o.push([wallCentre(R, d, w, 1.45 - d.h / 2)]);
  return o;
}

// ---- room recipes ---------------------------------------------------------------------
// extra: tiers where the slot is left out by default and offered as an add-on instead.
// minTier: tiers below this skip the slot. purpose: only for this purpose (home | airbnb).
// layer: floor (default) | under (rugs) | top (on another piece) | wall | ceiling | dress | windows | fixture.
const DRESS_SOFA = [
  { key: 'pillows', cat: 'pillows', layer: 'dress', host: 'sofa', count: (h) => (h.seats >= 3 && h.w > 1.6 ? 4 : 2) },
  { key: 'throw', cat: 'throw', layer: 'dress', host: 'sofa', count: () => 1 },
];
const DRESS_BED = [
  { key: 'bedding', cat: 'bedding', layer: 'dress', host: 'bed', count: () => 1 },
  { key: 'pillows', cat: 'pillows', layer: 'dress', host: 'bed', count: () => 2 },
  { key: 'throw', cat: 'throw', layer: 'dress', host: 'bed', count: () => 1 },
];
const CURTAINS = { key: 'curtains', cat: 'curtains', layer: 'windows' };

const SLOTS = {
  living: [
    { key: 'sofa', cat: 'sofa', place: (R, d) => [[back(R, d)], [left(R, d, R.D * 0.45)], [right(R, d, R.D * 0.45)], [back(R, d, d.w / 2 + 0.3)], [back(R, d, R.W - d.w / 2 - 0.3)]] },
    { key: 'coffeeTable', cat: 'coffeeTable', place: (R, d, c) => (c.sofa ? [[inFront(c.sofa, 0.42, d)], [inFront(c.sofa, 0.36, d)]] : [[{ x: R.W / 2, z: R.D / 2, rot: 0 }]]) },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => (c.sofa ? [[{ ...local(c.sofa, 0, -c.sofa.d / 2 + c.sofa.d * 0.55 + d.d / 2, 0) }]] : [[{ x: R.W / 2, z: R.D / 2, rot: 0 }]]) },
    {
      key: 'sideTable', cat: 'sideTable', place: (R, d, c) => (c.sofa
        ? [[local(c.sofa, c.sofa.w / 2 + 0.05 + d.w / 2, -c.sofa.d / 2 + 0.1 + d.d / 2, 0)], [local(c.sofa, -c.sofa.w / 2 - 0.05 - d.w / 2, -c.sofa.d / 2 + 0.1 + d.d / 2, 0)]]
        : []),
    },
    {
      key: 'floorLamp', cat: 'floorLamp', place: (R, d, c) => (c.sofa
        ? [[local(c.sofa, -c.sofa.w / 2 - 0.08 - d.w / 2, -c.sofa.d / 2 + 0.1 + d.d / 2, 0)], [local(c.sofa, c.sofa.w / 2 + 0.08 + d.w / 2, -c.sofa.d / 2 + 0.1 + d.d / 2, PI)]]
        : corners(R, d)),
    },
    {
      key: 'mediaUnit', cat: 'mediaUnit', place: (R, d, c) => {
        const along = (wall, a) => ({ front: front(R, d, a), right: right(R, d, a), left: left(R, d, a) })[wall];
        const spots = (wall, centre, len) => [centre, len / 2, 0.3 + d.w / 2, len - 0.3 - d.w / 2].map((a) => [along(wall, a)]);
        if (!c.sofa) return spots('front', R.W / 2, R.W);
        const r = c.sofa.rot;
        if (near(r, 0)) return spots('front', c.sofa.x, R.W);
        if (near(r, PI / 2)) return spots('right', c.sofa.z, R.D);
        return spots('left', c.sofa.z, R.D);
      },
    },
    {
      key: 'armchair', cat: 'armchair', extra: ['basic'], place: (R, d, c) => {
        const t = c.coffeeTable;
        if (!t || !c.sofa) return corners(R, d, 0.25);
        const side = (s) => local(t, s * (t.w / 2 + 0.3 + d.d / 2), 0.1, -s * (PI / 2 - 0.4));
        return [[side(1)], [side(-1)]];
      },
    },
    { key: 'bookcase', cat: 'bookcase', extra: ['basic'], place: (R, d) => [0.6, 0.4, 0.8, 0.25].flatMap((f) => [[left(R, d, R.D * f)], [right(R, d, R.D * f)]]) },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    {
      key: 'armchair2', cat: 'armchair', minTier: 'luxury', place: (R, d, c) => {
        const t = c.coffeeTable;
        if (!t || !c.sofa) return [];
        const side = (s) => local(t, s * (t.w / 2 + 0.3 + d.d / 2), 0.1, -s * (PI / 2 - 0.4));
        return [[side(-1)], [side(1)]];
      },
    },
    { key: 'plant2', cat: 'plant', minTier: 'supreme', place: (R, d) => corners(R, d) },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => artOver(R, d, c.sofa) },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.coffeeTable ? c.coffeeTable.x : R.W / 2, c.coffeeTable ? c.coffeeTable.z : R.D / 2, 1.9) },
    ...DRESS_SOFA,
    CURTAINS,
  ],

  bedroom: [
    { key: 'bed', cat: 'bed', place: (R, d) => [[back(R, d)], [left(R, d, R.D * 0.5)], [right(R, d, R.D * 0.5)], [back(R, d, d.w / 2 + 0.6)], [back(R, d, R.W - d.w / 2 - 0.6)]] },
    {
      key: 'nightstand', cat: 'nightstand', place: (R, d, c) => {
        if (!c.bed) return [];
        const at = (s) => local(c.bed, s * (c.bed.w / 2 + 0.05 + d.w / 2), -c.bed.d / 2 + d.d / 2, 0);
        return [[at(-1), at(1)], [at(1)], [at(-1)]];
      },
    },
    { key: 'tableLamp', cat: 'tableLamp', layer: 'top', place: (R, d, c) => (c.nightstand ? [c.nightstand.inst.map((n) => ({ ...local(n, 0, -0.03, 0), y: n.h }))] : []) },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => (c.bed ? [[local(c.bed, 0, -c.bed.d / 2 + c.bed.d * 0.35 + d.d / 2, 0)], [local(c.bed, 0, 0, 0)]] : [[{ x: R.W / 2, z: R.D / 2, rot: 0 }]]) },
    { key: 'bench', cat: 'bench', minTier: 'luxury', place: (R, d, c) => (c.bed ? [[inFront(c.bed, 0.08, d)]] : []) },
    { key: 'dresser', cat: 'dresser', place: (R, d) => [[left(R, d, R.D * 0.6)], [front(R, d)], [right(R, d, R.D * 0.5)], [left(R, d, R.D * 0.8)], [right(R, d, R.D * 0.75)]] },
    { key: 'wardrobe', cat: 'wardrobe', extra: ['basic', 'luxury', 'supreme'], place: (R, d) => [[right(R, d, R.D - d.w / 2 - 0.3)], [right(R, d, R.D * 0.55)], [left(R, d, R.D - d.w / 2 - 0.3)], [front(R, d, R.W - d.w / 2 - 0.3)]] },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => artOver(R, d, c.bed, 0.25) },
    { key: 'armchair', cat: 'armchair', minTier: 'supreme', place: (R, d) => [[{ x: 0.2 + d.w / 2, z: R.D - 0.25 - d.d / 2, rot: PI * 0.75 }], [{ x: R.W - 0.2 - d.w / 2, z: R.D - 0.25 - d.d / 2, rot: -PI * 0.75 }]] },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'floorMirror', cat: 'floorMirror', purpose: 'airbnb', place: (R, d) => [0.3, 0.7, 0.5].flatMap((f) => [[left(R, d, R.D * f)], [right(R, d, R.D * f)], [front(R, d, R.W * f)]]) },
    { key: 'luggageRack', cat: 'luggageRack', purpose: 'airbnb', place: (R, d, c) => [...(c.bed ? [[inFront(c.bed, 0.1, d)]] : []), ...[0.35, 0.65].flatMap((f) => [[left(R, d, R.D * f)], [right(R, d, R.D * f)], [front(R, d, R.W * f)]])] },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, R.W / 2, c.bed ? Math.min(R.D - 0.5, c.bed.z1 + 0.2) : R.D / 2, 1.95) },
    ...DRESS_BED,
    CURTAINS,
  ],

  studio: [
    { key: 'bed', cat: 'bed', place: (R, d) => [[back(R, d, d.w / 2 + 0.05)], [back(R, d, R.W - d.w / 2 - 0.05)], [left(R, d, d.w / 2 + 0.05)], [right(R, d, d.w / 2 + 0.05)], [left(R, d, R.D / 2)], [right(R, d, R.D / 2)], [left(R, d, R.D - d.w / 2 - 0.05)], [right(R, d, R.D - d.w / 2 - 0.05)]] },
    {
      key: 'nightstand', cat: 'nightstand', place: (R, d, c) => {
        if (!c.bed) return [];
        const at = (s) => local(c.bed, s * (c.bed.w / 2 + 0.05 + d.w / 2), -c.bed.d / 2 + d.d / 2, 0);
        return [[at(1)], [at(-1)]];
      },
    },
    { key: 'tableLamp', cat: 'tableLamp', layer: 'top', place: (R, d, c) => (c.nightstand ? [c.nightstand.inst.map((n) => ({ ...local(n, 0, -0.03, 0), y: n.h }))] : []) },
    {
      key: 'sofa', cat: 'sofa', place: (R, d, c) => {
        const o = [[right(R, d, R.D * 0.62)], [left(R, d, R.D * 0.62)], [front(R, d, R.W * 0.62)]];
        return c.bed && c.bed.x > R.W / 2 ? [o[1], o[0], o[2]] : o;
      },
    },
    { key: 'coffeeTable', cat: 'coffeeTable', place: (R, d, c) => (c.sofa ? [[inFront(c.sofa, 0.4, d)], [inFront(c.sofa, 0.34, d)]] : []) },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => (c.sofa ? [[local(c.sofa, 0, -c.sofa.d / 2 + c.sofa.d * 0.55 + d.d / 2, 0)], [local(c.sofa, 0, -c.sofa.d / 2 + c.sofa.d * 0.4 + d.d / 2, PI / 2)]] : []) },
    { key: 'diningTable', cat: 'diningTable', clear: 0.5, small: true, place: (R, d, c) => [[{ x: c.bed && c.bed.x > R.W / 2 ? R.W - 0.9 : 0.9, z: R.D - 0.95, rot: 0 }], [{ x: R.W * 0.5, z: R.D - 0.9, rot: 0 }], [{ x: R.W * 0.3, z: R.D * 0.55, rot: PI / 2 }]] },
    { key: 'diningChair', cat: 'diningChair', allow: ['diningTable'], movable: true, place: (R, d, c) => chairsAround(c.diningTable, d).map((o) => o.slice(0, 2)) },
    { key: 'wardrobe', cat: 'wardrobe', extra: ['basic', 'luxury', 'supreme'], place: (R, d) => [[front(R, d, d.w / 2 + 0.1)], [front(R, d, R.W - d.w / 2 - 0.1)], [left(R, d, R.D - d.w / 2 - 0.1)], [right(R, d, R.D - d.w / 2 - 0.1)]] },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => artOver(R, d, c.bed, 0.25) },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'luggageRack', cat: 'luggageRack', purpose: 'airbnb', place: (R, d, c) => [...(c.bed ? [[inFront(c.bed, 0.1, d)]] : []), ...[0.35, 0.65].flatMap((f) => [[left(R, d, R.D * f)], [right(R, d, R.D * f)]])] },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.coffeeTable?.x ?? R.W / 2, c.coffeeTable?.z ?? R.D / 2, 1.95) },
    { key: 'bedding', cat: 'bedding', layer: 'dress', host: 'bed', count: () => 1 },
    { key: 'pillows', cat: 'pillows', layer: 'dress', host: 'sofa', count: (h) => (h.seats >= 3 && h.w > 1.6 ? 4 : 2) },
    { key: 'throw', cat: 'throw', layer: 'dress', host: 'bed', count: () => 1 },
    CURTAINS,
  ],

  office: [
    {
      key: 'desk', cat: 'desk', place: (R, d, c) => {
        const walls = [[back(R, d)], [left(R, d, R.D * 0.4)], [right(R, d, R.D * 0.4)], [back(R, d, d.w / 2 + 0.3)]];
        return c.tier === 'supreme' && R.D > 3.4 ? [[{ x: R.W / 2, z: 1.05 + d.d / 2, rot: PI }], ...walls] : walls;
      },
    },
    { key: 'officeChair', cat: 'officeChair', allow: ['desk'], movable: true, place: (R, d, c) => (c.desk ? [[local(c.desk, 0, c.desk.d / 2 + d.d / 2 - 0.15, PI)]] : []) },
    { key: 'deskLamp', cat: 'deskLamp', layer: 'top', place: (R, d, c) => (c.desk ? [[{ ...local(c.desk, c.desk.w / 2 - 0.16, 0, 0), y: c.desk.h }]] : []) },
    { key: 'rug', cat: 'rug', layer: 'under', extra: ['basic'], place: (R, d, c) => (c.desk ? [[local(c.desk, 0, c.desk.d / 2 + 0.3 - d.d / 2, 0)], [{ x: R.W / 2, z: R.D / 2, rot: 0 }]] : []) },
    { key: 'bookcase', cat: 'bookcase', extra: ['basic'], place: (R, d) => [0.55, 0.35, 0.75].flatMap((f) => [[left(R, d, R.D * f)], [right(R, d, R.D * f)]]) },
    { key: 'sideboard', cat: 'sideboard', minTier: 'luxury', place: (R, d) => [[right(R, d, R.D * 0.55)], [right(R, d, R.D * 0.4)], [front(R, d)], [left(R, d, R.D * 0.6)]] },
    { key: 'armchair', cat: 'armchair', minTier: 'luxury', place: (R, d) => [[{ x: R.W - 0.2 - d.w / 2, z: R.D - 0.25 - d.d / 2, rot: -PI * 0.75 }], [{ x: 0.2 + d.w / 2, z: R.D - 0.25 - d.d / 2, rot: PI * 0.75 }]] },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', extra: ['basic'], place: (R, d, c) => artOver(R, d, c.desk, 0.62) },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', extra: ['basic'], place: (R, d, c) => ceiling(R, d, c.desk ? c.desk.x : R.W / 2, c.desk ? c.desk.z + 0.3 : R.D / 2, 1.9) },
    CURTAINS,
  ],

  dining: [
    { key: 'diningTable', cat: 'diningTable', clear: 0.65, place: (R) => [[{ x: R.W / 2, z: R.D * 0.5, rot: 0 }], [{ x: R.W / 2, z: R.D * 0.5, rot: PI / 2 }]] },
    { key: 'diningChair', cat: 'diningChair', allow: ['diningTable'], movable: true, place: (R, d, c) => chairsAround(c.diningTable, d) },
    { key: 'rug', cat: 'rug', layer: 'under', extra: ['basic'], place: (R, d, c) => (c.diningTable ? [[{ x: c.diningTable.x, z: c.diningTable.z, rot: c.diningTable.rot }], [{ x: c.diningTable.x, z: c.diningTable.z, rot: c.diningTable.rot + PI / 2 }]] : []) },
    { key: 'sideboard', cat: 'sideboard', minTier: 'luxury', place: (R, d) => [[back(R, d)], [left(R, d, R.D * 0.5)], [right(R, d, R.D * 0.5)], [front(R, d)]] },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.diningTable ? c.diningTable.x : R.W / 2, c.diningTable ? c.diningTable.z : R.D / 2, 1.5) },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => artOver(R, d, c.sideboard, 0.3) },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'plant2', cat: 'plant', minTier: 'supreme', place: (R, d) => corners(R, d) },
    CURTAINS,
  ],

  bathroom: [
    {
      key: 'bathtub', cat: 'bathtub', layer: 'fixture', place: (R, d) => [
        [{ x: R.W - 0.02 - d.w / 2, z: 0.02 + d.d / 2, rot: 0 }],
        [{ x: R.W - 0.02 - d.d / 2, z: 0.02 + d.w / 2, rot: -PI / 2 }],
        [{ x: 0.02 + d.w / 2, z: 0.02 + d.d / 2, rot: 0 }],
        [{ x: 0.02 + d.d / 2, z: R.D - 0.02 - d.w / 2, rot: PI / 2 }],
      ],
    },
    { key: 'vanity', cat: 'vanity', layer: 'fixture', place: (R, d) => [[back(R, d, 0.08 + d.w / 2)], [back(R, d)], [back(R, d, R.W - 0.08 - d.w / 2)], [left(R, d, R.D * 0.5)], [right(R, d, R.D * 0.6)]] },
    { key: 'mirror', cat: 'mirror', layer: 'wall', place: (R, d, c) => (c.vanity ? [[onWall(R, c.vanity, d, c.vanity.h + 0.2)]] : []) },
    { key: 'toilet', cat: 'toilet', layer: 'fixture', place: (R, d) => [[left(R, d, R.D * 0.62)], [left(R, d, R.D * 0.8)], [right(R, d, R.D * 0.7)], [back(R, d, 0.3 + d.w / 2)], [left(R, d, R.D * 0.4)]] },
    { key: 'tallCabinet', cat: 'tallCabinet', extra: ['basic'], place: (R, d) => [[right(R, d, R.D - 0.15 - d.w / 2)], [left(R, d, R.D - 0.15 - d.w / 2)], [front(R, d, R.W - 0.1 - d.w / 2)]] },
    { key: 'towelRack', cat: 'towelRack', place: (R, d) => [[right(R, d, R.D * 0.55)], [front(R, d, 0.15 + d.w / 2)], [left(R, d, R.D * 0.3)], [front(R, d, R.W - 0.15 - d.w / 2)]] },
    {
      key: 'bathMat', cat: 'bathMat', layer: 'under', place: (R, d, c) => {
        const o = [];
        const t = c.bathtub;
        if (t && near(t.rot, 0)) o.push([{ x: t.x, z: t.z1 + 0.05 + d.d / 2, rot: 0 }]);
        if (t && near(t.rot, -PI / 2)) o.push([{ x: t.x0 - 0.05 - d.d / 2, z: t.z, rot: -PI / 2 }]);
        if (t && near(t.rot, PI / 2)) o.push([{ x: t.x1 + 0.05 + d.d / 2, z: t.z, rot: PI / 2 }]);
        if (c.vanity) o.push([inFront(c.vanity, 0.05, d)]);
        return o;
      },
    },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'towels', cat: 'towels', layer: 'dress', host: 'towelRack', count: () => 1 },
  ],
};

export const slotsFor = (roomType) => SLOTS[roomType];

// ---- ranking ------------------------------------------------------------------------------
function rank(list, slot, ctx) {
  const picks = stylePicks(ctx.style);
  // Basic: the cheapest piece that fits wins, and a style favourite only wins if it costs about the same.
  const cheap = ctx.tier === 'basic' && slot.cat !== 'sofa';
  const floorPrice = Math.min(...list.map((p) => p.price));
  const score = (p) => {
    let s = 0;
    const sleeps = p.tags.includes('sleeps');
    if (ctx.purpose === 'airbnb' && (p.tags.includes('airbnb') || sleeps)) s += 5;
    if (ctx.purpose !== 'airbnb' && sleeps) s -= 5;
    if (ctx.purpose !== 'airbnb' && slot.cat === 'curtains' && p.tags.includes('bedroom') && ctx.roomType !== 'bedroom') s -= 2;
    if (picks.has(p.id) && (!cheap || p.price <= floorPrice * 1.6 + 10)) s += 3;
    if (p.tags.includes('upgrade')) s -= 50;
    return s;
  };
  // Other tiers: the biggest piece that fits.
  const area = (p) => (cheap ? -p.price : SIZE_FIRST.has(slot.cat) ? p.dims[0] * p.dims[1] * (slot.small ? -1 : 1) : 0);
  return list
    .map((p, i) => ({ p, i, s: score(p), a: area(p) }))
    .sort((x, y) => y.s - x.s || y.a - x.a || x.i - y.i)
    .map((x) => x.p);
}

function candidates(slot, ctx) {
  const ov = ctx.overrides[slot.key];
  if (ov) return [getProduct(ov)].filter(Boolean);
  if (slot.layer === 'fixture') return allProducts().filter((p) => p.existing && p.cat === slot.cat);
  const out = [];
  for (const t of TIERS_DOWN[ctx.tier]) out.push(...rank(productsFor(slot.cat, t).filter((p) => !p.existing), slot, ctx));
  return out;
}

// Would the slot be included for this tier and purpose?
function slotState(slot, ctx) {
  if (slot.purpose && slot.purpose !== ctx.purpose) return 'off';
  if (slot.minTier && TIER_RANK[ctx.tier] < TIER_RANK[slot.minTier]) return 'off';
  if (slot.extra?.includes(ctx.tier) && !ctx.extras.includes(slot.key)) return 'extra';
  return 'on';
}

// ---- openings -------------------------------------------------------------------------------
// Floor boxes that must stay clear: a door's swing, and (for tall pieces) the space in front of windows.
function openingBoxes(R, openings) {
  return openings.map((o) => {
    const depth = o.kind === 'door' ? 0.95 : 0.4;
    const pad = o.kind === 'door' ? 0.05 : 0;
    let box;
    if (o.wall === 'back') box = { x0: o.a0 - pad, x1: o.a1 + pad, z0: 0, z1: depth };
    else if (o.wall === 'front') box = { x0: o.a0 - pad, x1: o.a1 + pad, z0: R.D - depth, z1: R.D };
    else if (o.wall === 'left') box = { x0: 0, x1: depth, z0: o.a0 - pad, z1: o.a1 + pad };
    else box = { x0: R.W - depth, x1: R.W, z0: o.a0 - pad, z1: o.a1 + pad };
    return { box, kind: o.kind, sill: o.y0 };
  });
}

function wallSpan(pose, dm, R) {
  const onX = pose.wall === 'back' || pose.wall === 'front';
  const along = onX ? pose.x : pose.z;
  return { wall: pose.wall, a0: along - dm.w / 2, a1: along + dm.w / 2, y0: pose.y, y1: pose.y + dm.h, len: onX ? R.W : R.D };
}

// ---- engine -----------------------------------------------------------------------------
export function planRoom({ roomType, R, tier, style = null, purpose = 'home', openings = [], overrides = {}, finishes = {}, extras = [], owned = [], addonsOff = [] }) {
  const slots = SLOTS[roomType] ?? [];
  const ctx = { tier, R, style, purpose, roomType, overrides, extras };
  const floor = [], under = [];
  const walls = openings.map((o) => ({ wall: o.wall, a0: o.a0 - 0.08, a1: o.a1 + 0.08, y0: o.y0 - 0.05, y1: o.y1 + 0.1 }));
  const blocked = openingBoxes(R, openings);
  const windows = openings.filter((o) => o.kind === 'window');
  const items = [], suggestions = [], dress = {};

  const finishFor = (key, product) => finishes[`${key}|${product.id}`] ?? (style ? styleFinish(product, style) : 0);

  for (const slot of slots) {
    const ov = overrides[slot.key];
    if (ov === null) continue;
    const state = ov ? 'on' : slotState(slot, ctx);
    if (state === 'off') continue;
    const layer = slot.layer ?? 'floor';
    const list = candidates(slot, ctx);
    if (!list.length) continue;

    // Textiles: dress a host piece, or hang at every window.
    if (layer === 'dress' || layer === 'windows') {
      const host = layer === 'dress' ? ctx[slot.host] : null;
      if (layer === 'dress' && !host) continue;
      if (layer === 'windows' && !windows.length) continue;
      const product = list[0];
      if (state === 'extra') { suggestions.push({ key: slot.key, cat: slot.cat, product }); continue; }
      const perUnit = product.unit === 'set of 2' ? 2 : 1;
      const need = layer === 'windows' ? windows.length * product.perWindow : slot.count(host);
      const qty = Math.max(1, Math.ceil(need / perUnit));
      const finish = finishFor(slot.key, product);
      // Four cushions look designed in two colours: a calm pair in front of a pair in the accent colour.
      let altFinish = null;
      if (slot.cat === 'pillows' && qty >= 2 && product.finishes.length > 1) {
        altFinish = style ? styleFinish(product, style, 'main') : (finish + 1) % product.finishes.length;
        if (altFinish === finish) altFinish = (finish + 1) % product.finishes.length;
      }
      const item = makeItem(slot, layer, product, finish, [], qty, { owned, addonsOff, windows: windows.length, altFinish });
      item.host = slot.host ?? null;
      items.push(item);
      if (host) {
        const c1 = product.finishes[finish].color;
        const alt = altFinish != null ? product.finishes[altFinish].color : c1;
        const d = (dress[slot.host] ??= {});
        if (slot.cat === 'pillows') d.pillows = { key: slot.key, colors: need >= 4 ? [alt, alt, c1, c1] : [c1, c1], fabric: product.model.main };
        if (slot.cat === 'throw') d.throw = { key: slot.key, color: c1, knit: product.model.main === 'knit' };
        if (slot.cat === 'bedding') d.bedding = { key: slot.key, color: c1 };
        if (slot.cat === 'towels') d.towels = { key: slot.key, color: c1 };
      }
      if (layer === 'windows') ctx.curtains = { key: slot.key, color: product.finishes[finish].color, fabric: product.model.main === 'velvet' ? 'velvet' : 'linen', sheer: product.id === 'ikea-ginstmott' || product.id === 'target-linen-panel', product };
      continue;
    }

    let chosen = null;
    for (const product of list) {
      const dm = dimsOf(product);
      if ((layer === 'floor' || layer === 'fixture') && dm.h > R.H - 0.05) continue;
      ctx.self = product;
      const options = slot.place(R, dm, ctx) || [];
      for (const poses of options) {
        if (!poses.length) continue;
        const boxes = poses.map((p) => footprint(p, dm));
        let ok = true;
        if (layer === 'floor' || layer === 'fixture') {
          const cl = slot.clear ?? 0;
          ok = boxes.every((b) => b.x0 - cl >= 0.01 && b.x1 + cl <= R.W - 0.01 && b.z0 - cl >= 0.01 && b.z1 + cl <= R.D - 0.01)
            && boxes.every((b) => floor.every((f) => (slot.allow ?? []).includes(f.key) || !overlaps(b, f.box, GAP)))
            && boxes.every((b) => blocked.every((o) => (o.kind === 'window' && (dm.h < o.sill - 0.02 || slot.movable)) || !overlaps(b, o.box)));
        } else if (layer === 'under') {
          ok = boxes.every((b) => b.x0 >= 0.08 && b.x1 <= R.W - 0.08 && b.z0 >= 0.08 && b.z1 <= R.D - 0.08)
            && boxes.every((b) => under.every((u) => !overlaps(b, u)));
        } else if (layer === 'wall') {
          ok = poses.every((p) => {
            const s = wallSpan(p, dm, R);
            return s.a0 >= 0.05 && s.a1 <= s.len - 0.05 && s.y0 >= 0.05 && s.y1 <= R.H - 0.08
              && walls.every((o) => o.wall !== s.wall || s.a1 < o.a0 || s.a0 > o.a1 || s.y1 < o.y0 || s.y0 > o.y1);
          });
        }
        if (!ok) continue;
        chosen = { product, dm, poses, boxes };
        break;
      }
      if (chosen) break;
    }
    if (!chosen) continue;

    const { product, dm, poses, boxes } = chosen;
    if (state === 'extra') { suggestions.push({ key: slot.key, cat: slot.cat, product, qty: poses.length }); continue; }
    const instances = poses.map((p) => ({ x: p.x, z: p.z, rot: p.rot, opts: p.opts, y: p.y ?? (layer === 'ceiling' ? R.H : 0) }));
    if (layer === 'floor' || layer === 'fixture') boxes.forEach((box) => floor.push({ key: slot.key, box }));
    if (layer === 'under') under.push(...boxes);
    if (layer === 'wall') poses.forEach((p) => walls.push(wallSpan(p, dm, R)));
    const first = poses[0];
    ctx[slot.key] = {
      ...first, ...dm, ...boxes[0],
      seats: product.model.seats ?? 4, shape: product.model.shape,
      inst: instances.map((i) => ({ ...i, h: dm.h, w: dm.w, d: dm.d })),
    };
    const item = makeItem(slot, layer, product, finishFor(slot.key, product), instances, instances.length, { owned, addonsOff, windows: windows.length });
    item.wall = first.wall ?? null;
    items.push(item);
  }

  const total = items.reduce((s, it) => s + it.price + it.addonTotal, 0);
  return {
    items, total, suggestions, dress, curtains: ctx.curtains ?? null,
    count: items.filter((it) => !it.product.existing).reduce((s, it) => s + it.qty, 0),
  };
}

function makeItem(slot, layer, product, finish, instances, qty, { owned, addonsOff, windows, altFinish = null }) {
  const isOwned = owned.includes(slot.key) || product.existing;
  const fp = (i) => product.finishes[i]?.price ?? product.price;
  const unit = altFinish != null ? (fp(finish) + fp(altFinish)) / 2 : fp(finish);
  const addons = product.addons.map((a) => {
    const n = a.perWindow ? windows : a.id.includes('bulb') ? Math.ceil(Math.max(1, instances.length) / 2) : qty;
    const on = !isOwned && !addonsOff.includes(`${slot.key}|${a.id}`);
    return { ...a, qty: n, on, total: on ? a.price * n : 0 };
  });
  return {
    key: slot.key, cat: slot.cat, layer, product, finish, altFinish, instances, qty,
    unitPrice: unit, owned: isOwned && !product.existing, existing: product.existing,
    price: isOwned ? 0 : unit * qty,
    addons, addonTotal: addons.reduce((s, a) => s + a.total, 0),
  };
}

// Would this product fit in this slot, given everything else in the room?
export function fitsInSlot(args, key, productId) {
  const plan = planRoom({ ...args, overrides: { ...args.overrides, [key]: productId } });
  return plan.items.some((it) => it.key === key && it.product.id === productId);
}

export const isSoft = (cat) => SOFT_GOODS.includes(cat);
