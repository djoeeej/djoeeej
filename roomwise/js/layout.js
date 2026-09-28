// Layout engine: places real-size catalog pieces into the measured room.
//
// Room coordinates (metres): the back wall (the one facing the camera in the photo) is z = 0,
// the left wall x = 0, the right wall x = W, the front wall z = D, the floor y = 0.
// Each room type is an ordered list of slots. A slot tries each candidate product
// (largest first) at each candidate position until one fits without collisions.
import { productsFor, getProduct, TIER_RANK } from './catalog.js';

export const ROOM_TYPES = [
  { id: 'living', label: 'Living room' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'office', label: 'Home office' },
  { id: 'dining', label: 'Dining room' },
  { id: 'bathroom', label: 'Bathroom' },
];

const PI = Math.PI;
const GAP = 0.04;
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

function chairsAround(t, d) {
  if (!t) return [];
  const tuck = 0.12;
  if (t.shape === 'round') {
    const r = t.w / 2 + d.d / 2 - tuck;
    const at = (a) => local(t, Math.sin(a) * r, Math.cos(a) * r, a + PI);
    return [[0, PI / 2, PI, -PI / 2].map(at), [0, PI].map(at)];
  }
  const bz = -t.d / 2 - d.d / 2 + tuck, fz = t.d / 2 + d.d / 2 - tuck;
  const xs = t.seats >= 6 ? [-t.w / 4, t.w / 4] : [-t.w / 4.2, t.w / 4.2];
  const sides = xs.flatMap((x) => [local(t, x, bz, 0), local(t, x, fz, PI)]);
  const ex = t.w / 2 + d.d / 2 - 0.1;
  const ends = [local(t, -ex, 0, PI / 2), local(t, ex, 0, -PI / 2)];
  const opts = [];
  if (t.seats >= 6) opts.push([...sides, ...ends]);
  opts.push(sides, [local(t, 0, bz, 0), local(t, 0, fz, PI)]);
  return opts;
}

// ---- room recipes ---------------------------------------------------------------------
const SLOTS = {
  living: [
    { key: 'sofa', cat: 'sofa', place: (R, d) => [[back(R, d)]] },
    { key: 'coffeeTable', cat: 'coffeeTable', place: (R, d, c) => [[{ x: c.sofa ? c.sofa.x : R.W / 2, z: (c.sofa ? c.sofa.z1 : 0.9) + 0.4 + d.d / 2, rot: 0 }]] },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => [[{ x: c.sofa ? c.sofa.x : R.W / 2, z: (c.sofa ? c.sofa.z0 + c.sofa.d * 0.55 : 0.6) + d.d / 2, rot: 0 }]] },
    {
      key: 'armchair', cat: 'armchair', place: (R, d, c) => {
        const t = c.coffeeTable, z = t ? t.z : R.D * 0.55;
        return [
          [{ x: (t ? t.x1 : R.W * 0.7) + 0.35 + d.d / 2, z, rot: -PI / 2 + 0.35 }],
          [{ x: (t ? t.x0 : R.W * 0.3) - 0.35 - d.d / 2, z, rot: PI / 2 - 0.35 }],
        ];
      },
    },
    {
      key: 'floorLamp', cat: 'floorLamp', place: (R, d, c) => c.sofa
        ? [[{ x: c.sofa.x1 + 0.08 + d.w / 2, z: 0.12 + d.d / 2, rot: 0 }], [{ x: c.sofa.x0 - 0.08 - d.w / 2, z: 0.12 + d.d / 2, rot: PI }]]
        : corners(R, d),
    },
    {
      key: 'sideTable', cat: 'sideTable', place: (R, d, c) => c.sofa
        ? [[{ x: c.sofa.x0 - 0.06 - d.w / 2, z: c.sofa.z0 + 0.12 + d.d / 2, rot: 0 }], [{ x: c.sofa.x1 + 0.06 + d.w / 2, z: c.sofa.z0 + 0.12 + d.d / 2, rot: 0 }]]
        : [],
    },
    { key: 'mediaUnit', cat: 'mediaUnit', place: (R, d) => [[front(R, d)]] },
    { key: 'bookcase', cat: 'bookcase', place: (R, d) => [0.6, 0.4, 0.8].map((f) => [left(R, d, R.D * f)]) },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    {
      key: 'armchair2', cat: 'armchair', minTier: 'luxury', place: (R, d, c) => {
        const t = c.coffeeTable, z = t ? t.z : R.D * 0.55;
        return [[{ x: (t ? t.x0 : R.W * 0.3) - 0.35 - d.d / 2, z, rot: PI / 2 - 0.35 }]];
      },
    },
    { key: 'plant2', cat: 'plant', minTier: 'supreme', place: (R, d) => corners(R, d) },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => [[{ x: c.sofa ? c.sofa.x : R.W / 2, y: (c.sofa ? c.sofa.h : 0.8) + 0.22, z: d.d / 2 + 0.004, rot: 0, wall: 'back' }]] },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.coffeeTable ? c.coffeeTable.x : R.W / 2, c.coffeeTable ? c.coffeeTable.z : R.D / 2, 1.85) },
  ],

  bedroom: [
    { key: 'bed', cat: 'bed', place: (R, d) => [[back(R, d)]] },
    {
      key: 'nightstand', cat: 'nightstand', place: (R, d, c) => {
        if (!c.bed) return [];
        const z = 0.03 + d.d / 2;
        const L = { x: c.bed.x0 - 0.05 - d.w / 2, z, rot: 0 }, Rt = { x: c.bed.x1 + 0.05 + d.w / 2, z, rot: 0 };
        return [[L, Rt], [Rt], [L]];
      },
    },
    { key: 'tableLamp', cat: 'tableLamp', layer: 'top', place: (R, d, c) => (c.nightstand ? [c.nightstand.inst.map((n) => ({ x: n.x, z: n.z - 0.03, y: n.h, rot: 0 }))] : []) },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => [[{ x: c.bed ? c.bed.x : R.W / 2, z: c.bed ? c.bed.z0 + c.bed.d * 0.3 + d.d / 2 : R.D / 2, rot: 0 }]] },
    { key: 'bench', cat: 'bench', minTier: 'luxury', place: (R, d, c) => (c.bed ? [[{ x: c.bed.x, z: c.bed.z1 + 0.08 + d.d / 2, rot: 0 }]] : []) },
    { key: 'wardrobe', cat: 'wardrobe', place: (R, d) => [[right(R, d, R.D - d.w / 2 - 0.3)], [right(R, d, R.D * 0.55)], [left(R, d, R.D - d.w / 2 - 0.3)], [front(R, d, R.W - d.w / 2 - 0.3)]] },
    { key: 'dresser', cat: 'dresser', place: (R, d) => [[left(R, d, R.D * 0.6)], [front(R, d)], [right(R, d, R.D * 0.5)], [left(R, d, R.D * 0.8)]] },
    { key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => (c.bed ? [[{ x: c.bed.x, y: c.bed.h + 0.2, z: d.d / 2 + 0.004, rot: 0, wall: 'back' }]] : []) },
    { key: 'armchair', cat: 'armchair', minTier: 'supreme', place: (R, d) => [[{ x: 0.2 + d.w / 2, z: R.D - 0.25 - d.d / 2, rot: PI * 0.75 }], [{ x: R.W - 0.2 - d.w / 2, z: R.D - 0.25 - d.d / 2, rot: -PI * 0.75 }]] },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, R.W / 2, c.bed ? Math.min(R.D - 0.5, c.bed.z1 + 0.2) : R.D / 2, 1.95) },
  ],

  office: [
    {
      key: 'desk', cat: 'desk', place: (R, d, c) => {
        const wall = [back(R, d)];
        return c.tier === 'supreme' && R.D > 3.4 ? [[{ x: R.W / 2, z: 1.05 + d.d / 2, rot: PI }], wall] : [wall];
      },
    },
    {
      key: 'officeChair', cat: 'officeChair', allow: ['desk'], place: (R, d, c) => {
        const k = c.desk;
        if (!k) return [];
        return near(k.rot, 0) ? [[{ x: k.x, z: k.z1 + d.d / 2 - 0.15, rot: PI }]] : [[{ x: k.x, z: k.z0 - d.d / 2 + 0.15, rot: 0 }]];
      },
    },
    {
      key: 'deskLamp', cat: 'tableLamp', layer: 'top', place: (R, d, c) => {
        const k = c.desk;
        if (!k) return [];
        const s = near(k.rot, 0) ? 1 : -1;
        return [[{ x: k.x + s * (k.w / 2 - 0.16), z: k.z - s * (k.d / 2 - 0.16), y: k.h, rot: k.rot }]];
      },
    },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => (c.desk ? [[{ x: c.desk.x, z: near(c.desk.rot, 0) ? c.desk.z0 + 0.3 + d.d / 2 : c.desk.z, rot: 0 }]] : []) },
    { key: 'bookcase', cat: 'bookcase', place: (R, d) => [0.55, 0.35, 0.75].map((f) => [left(R, d, R.D * f)]) },
    { key: 'sideboard', cat: 'sideboard', place: (R, d) => [[right(R, d, R.D * 0.55)], [right(R, d, R.D * 0.4)], [front(R, d)]] },
    { key: 'armchair', cat: 'armchair', minTier: 'luxury', place: (R, d) => [[{ x: R.W - 0.2 - d.w / 2, z: R.D - 0.25 - d.d / 2, rot: -PI * 0.75 }], [{ x: 0.2 + d.w / 2, z: R.D - 0.25 - d.d / 2, rot: PI * 0.75 }]] },
    {
      key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => {
        const k = c.desk;
        if (!k) return [[{ x: R.W / 2, y: 1.3, z: d.d / 2 + 0.004, rot: 0, wall: 'back' }]];
        return [[{ x: k.x, y: near(k.rot, 0) ? k.h + 0.62 : 1.15, z: d.d / 2 + 0.004, rot: 0, wall: 'back' }]];
      },
    },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.desk ? c.desk.x : R.W / 2, c.desk ? c.desk.z + 0.3 : R.D / 2, 1.9) },
  ],

  dining: [
    { key: 'diningTable', cat: 'diningTable', clear: 0.65, place: (R, d) => [[{ x: R.W / 2, z: R.D * 0.5, rot: 0 }], [{ x: R.W / 2, z: R.D * 0.5, rot: PI / 2 }]] },
    { key: 'diningChair', cat: 'diningChair', allow: ['diningTable'], place: (R, d, c) => chairsAround(c.diningTable, d) },
    { key: 'rug', cat: 'rug', layer: 'under', place: (R, d, c) => (c.diningTable ? [[{ x: c.diningTable.x, z: c.diningTable.z, rot: c.diningTable.rot }]] : []) },
    { key: 'sideboard', cat: 'sideboard', place: (R, d) => [[back(R, d)], [left(R, d, R.D * 0.5)], [right(R, d, R.D * 0.5)], [front(R, d)]] },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d, c) => ceiling(R, d, c.diningTable ? c.diningTable.x : R.W / 2, c.diningTable ? c.diningTable.z : R.D / 2, 1.5) },
    {
      key: 'wallArt', cat: 'wallArt', layer: 'wall', place: (R, d, c) => (c.sideboard
        ? [[onWall(R, c.sideboard, d, c.sideboard.h + 0.3)]]
        : [[{ x: R.W / 2, y: 1.2, z: d.d / 2 + 0.004, rot: 0, wall: 'back' }]]),
    },
    { key: 'plant', cat: 'plant', place: (R, d) => corners(R, d) },
    { key: 'plant2', cat: 'plant', minTier: 'supreme', place: (R, d) => corners(R, d) },
  ],

  bathroom: [
    {
      key: 'bathtub', cat: 'bathtub', place: (R, d, c) => {
        const g = c.tier === 'basic' ? 0.02 : 0.15;
        return [
          [{ x: R.W - g - d.w / 2, z: g + d.d / 2, rot: 0 }],
          [{ x: R.W - g - d.d / 2, z: g + d.w / 2, rot: -PI / 2 }],
          [{ x: g + d.w / 2, z: g + d.d / 2, rot: 0 }],
          [{ x: g + d.d / 2, z: R.D - g - d.w / 2, rot: PI / 2 }],
        ];
      },
    },
    { key: 'vanity', cat: 'vanity', place: (R, d) => [[back(R, d, 0.08 + d.w / 2)], [back(R, d)], [back(R, d, R.W - 0.08 - d.w / 2)], [left(R, d, R.D * 0.5)], [right(R, d, R.D * 0.6)]] },
    { key: 'mirror', cat: 'mirror', layer: 'wall', place: (R, d, c) => (c.vanity ? [[onWall(R, c.vanity, d, c.vanity.h + 0.2)]] : []) },
    { key: 'toilet', cat: 'toilet', place: (R, d) => [[left(R, d, R.D * 0.62)], [left(R, d, R.D * 0.8)], [right(R, d, R.D * 0.7)], [back(R, d, 0.3 + d.w / 2)], [left(R, d, R.D * 0.4)]] },
    { key: 'tallCabinet', cat: 'tallCabinet', place: (R, d) => [[right(R, d, R.D - 0.15 - d.w / 2)], [left(R, d, R.D - 0.15 - d.w / 2)], [front(R, d, R.W - 0.1 - d.w / 2)]] },
    { key: 'towelRack', cat: 'towelRack', place: (R, d) => [[right(R, d, R.D * 0.55)], [front(R, d, 0.15 + d.w / 2)], [left(R, d, R.D * 0.3)]] },
    {
      key: 'bathMat', cat: 'bathMat', layer: 'under', place: (R, d, c) => {
        const o = [];
        const t = c.bathtub;
        if (t && near(t.rot, 0)) o.push([{ x: t.x, z: t.z1 + 0.05 + d.d / 2, rot: 0 }]);
        if (t && near(t.rot, -PI / 2)) o.push([{ x: t.x0 - 0.05 - d.d / 2, z: t.z, rot: -PI / 2 }]);
        if (c.vanity && near(c.vanity.rot, 0)) o.push([{ x: c.vanity.x, z: c.vanity.z1 + 0.05 + d.d / 2, rot: 0 }]);
        return o;
      },
    },
    { key: 'plant', cat: 'plant', minTier: 'luxury', place: (R, d) => corners(R, d) },
    { key: 'ceilingLight', cat: 'ceilingLight', layer: 'ceiling', place: (R, d) => ceiling(R, d, R.W / 2, R.D / 2, 2.0) },
  ],
};

export const slotsFor = (roomType) => SLOTS[roomType];

// ---- engine -----------------------------------------------------------------------------
function wallSpan(pose, dm, R) {
  const onX = pose.wall === 'back' || pose.wall === 'front';
  const along = onX ? pose.x : pose.z;
  return { wall: pose.wall, a0: along - dm.w / 2, a1: along + dm.w / 2, y0: pose.y, y1: pose.y + dm.h, len: onX ? R.W : R.D };
}

export function planRoom({ roomType, R, tier, overrides = {}, finishes = {} }) {
  const slots = SLOTS[roomType] ?? [];
  const ctx = { tier, R };
  const floor = [], under = [], walls = [];
  const items = [];

  for (const slot of slots) {
    const ov = overrides[slot.key];
    if (ov === null) continue;
    if (!ov && slot.minTier && TIER_RANK[tier] < TIER_RANK[slot.minTier]) continue;
    const layer = slot.layer ?? 'floor';
    const candidates = ov ? [getProduct(ov)].filter(Boolean) : productsFor(slot.cat, tier);

    let chosen = null;
    for (const product of candidates) {
      const dm = dimsOf(product);
      if (layer === 'floor' && dm.h > R.H - 0.05) continue;
      ctx.self = product;
      const options = slot.place(R, dm, ctx) || [];
      for (const poses of options) {
        if (!poses.length) continue;
        const boxes = poses.map((p) => footprint(p, dm));
        let ok = true;
        if (layer === 'floor') {
          const cl = slot.clear ?? 0;
          ok = boxes.every((b) => b.x0 - cl >= 0.01 && b.x1 + cl <= R.W - 0.01 && b.z0 - cl >= 0.01 && b.z1 + cl <= R.D - 0.01)
            && boxes.every((b) => floor.every((f) => (slot.allow ?? []).includes(f.key) || !overlaps(b, f.box, GAP)));
        } else if (layer === 'under') {
          ok = boxes.every((b) => b.x0 >= 0.1 && b.x1 <= R.W - 0.1 && b.z0 >= 0.1 && b.z1 <= R.D - 0.1)
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
    const instances = poses.map((p) => ({
      x: p.x, z: p.z, rot: p.rot, opts: p.opts,
      y: p.y ?? (layer === 'ceiling' ? R.H : 0),
    }));
    if (layer === 'floor') boxes.forEach((box) => floor.push({ key: slot.key, box }));
    if (layer === 'under') under.push(...boxes);
    if (layer === 'wall') poses.forEach((p) => walls.push(wallSpan(p, dm, R)));
    const first = poses[0];
    ctx[slot.key] = {
      ...first, ...dm, ...boxes[0],
      seats: product.model.seats ?? 4, shape: product.model.shape,
      inst: instances.map((i) => ({ ...i, h: dm.h })),
    };
    items.push({
      key: slot.key, cat: slot.cat, layer, product, finish: finishes[`${slot.key}|${product.id}`] ?? 0,
      instances, wall: first.wall ?? null, qty: instances.length, price: product.price * instances.length,
    });
  }
  const total = items.reduce((s, it) => s + it.price, 0);
  return { items, total, count: items.reduce((s, it) => s + it.qty, 0) };
}

// Would this product fit in this slot, given everything else in the room?
export function fitsInSlot(args, key, productId) {
  const plan = planRoom({ ...args, overrides: { ...args.overrides, [key]: productId } });
  return plan.items.some((it) => it.key === key && it.product.id === productId);
}
