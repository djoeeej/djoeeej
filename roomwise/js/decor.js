// Styling: the small things that make a room look lived-in, and the textile accessories
// (throw pillows, throws, bedding) that are sold as products and dressed onto furniture.
import * as THREE from 'three';
import { softBox, pillowGeo, drapeGeo, clothPathGeo, leafGeo, boxUV } from './geometry.js';
import { snapshotTexture } from './textures.js';
import { rng } from './util.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function lathe(k, profile, mat, x, y, z, seg = 32) {
  return k.add(new THREE.LatheGeometry(profile.map(([a, b]) => V2(a, b)), seg), mat, x, y, z);
}

// ---- small objects ------------------------------------------------------------------------
export function book(k, x, y, z, { w = 0.15, h = 0.22, t = 0.03, color = '#8c3b2f', rotY = 0 } = {}) {
  const g = new THREE.Group();
  k.add(softBox(t, h, w, { r: 0.003, seg: 2 }), k.m('paint', color), 0, h / 2, 0, { parent: g });
  k.add(new THREE.BoxGeometry(t * 0.86, h * 0.96, w * 0.96), k.m('paint', '#f1ece0'), 0, h / 2, -0.004, { parent: g });
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  k.g.add(g);
  return g;
}

export function bookFlat(k, x, y, z, { w = 0.17, h = 0.24, t = 0.03, color = '#8c3b2f', rotY = 0 } = {}) {
  const g = new THREE.Group();
  k.add(softBox(h, t, w, { r: 0.003, seg: 2 }), k.m('paint', color), 0, t / 2, 0, { parent: g });
  k.add(new THREE.BoxGeometry(h * 0.96, t * 0.86, w * 0.96), k.m('paint', '#f1ece0'), 0.004, t / 2, 0, { parent: g });
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  k.g.add(g);
  return g;
}

export function bookStack(k, x, y, z, n, colors, seed = 'st', rotY = 0) {
  const rand = rng(seed);
  let yy = y;
  for (let i = 0; i < n; i++) {
    const t = 0.022 + rand() * 0.025;
    bookFlat(k, x + (rand() - 0.5) * 0.02, yy, z, { w: 0.18 + rand() * 0.06, h: 0.24 + rand() * 0.06, t, color: colors[i % colors.length], rotY: rotY + (rand() - 0.5) * 0.3 });
    yy += t;
  }
  return yy;
}

export function bookRow(k, x0, x1, y, z, depth, maxH, colors, seed = 'row') {
  const rand = rng(seed);
  let x = x0;
  while (x < x1 - 0.03) {
    const t = 0.018 + rand() * 0.03, h = Math.min(maxH - 0.02, 0.17 + rand() * 0.1), w = Math.min(depth * 0.9, 0.14 + rand() * 0.08);
    const lean = x > x1 - 0.12 && rand() < 0.5;
    const b = book(k, x + t / 2, y, z - depth / 2 + w / 2 + 0.01, { w, h, t, color: colors[Math.floor(rand() * colors.length)] });
    if (lean) { b.rotation.z = -0.25; b.position.x += 0.03; x += 0.08; break; }
    x += t + 0.002;
  }
}

export function vase(k, x, y, z, { size = 0.22, color = '#d8d2c6', fill = 'branch', flowerColor = '#ffffff', seed = 'v', matte = true } = {}) {
  const s = size;
  const prof = [[0, 0], [0.26, 0], [0.4, 0.18], [0.38, 0.55], [0.2, 0.85], [0.15, 1], [0.13, 1], [0.12, 0.9]].map(([a, b]) => [a * s, b * s]);
  const m = lathe(k, prof, k.m(matte ? 'matteCeramic' : 'ceramic', color), x, y, z);
  m.material.side = THREE.DoubleSide;
  const rand = rng(seed);
  const top = V3(x, y + s * 0.95, z);
  const stem = k.m('paint', '#6b6247');
  if (fill === 'branch') {
    for (let i = 0; i < 3; i++) {
      const a = top.clone(), b = V3(x + (rand() - 0.5) * s * 1.4, y + s * (2.2 + rand() * 0.8), z + (rand() - 0.5) * s * 0.8);
      k.rod(a, b, 0.004, stem);
      for (let j = 0; j < 7; j++) {
        const t = 0.35 + j * 0.09;
        const p = a.clone().lerp(b, t);
        const leaf = k.add(leafGeo(0.05, 0.022, { kind: 'oval', bend: 0.1 }), k.m('leaf', rand() < 0.5 ? '#7a8a5c' : '#5f7048'), p.x, p.y, p.z);
        leaf.rotation.set(rand() * 3, rand() * 6, rand() * 3);
      }
    }
  } else if (fill === 'pampas') {
    for (let i = 0; i < 6; i++) {
      const a = top.clone(), b = V3(x + (rand() - 0.5) * s * 1.8, y + s * (2.4 + rand()), z + (rand() - 0.5) * s);
      k.rod(a, b, 0.003, k.m('paint', '#b9a07a'));
      const plume = k.add(softBox(0.05, 0.22, 0.05, { r: 0.024, seg: 4, wrinkle: 0.006, seed: i }), k.m('fabric', '#e2d3b8'), b.x, b.y, b.z);
      plume.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize());
    }
  } else if (fill === 'flowers') {
    for (let i = 0; i < 7; i++) {
      const b = V3(x + (rand() - 0.5) * s * 0.9, y + s * (1.5 + rand() * 0.6), z + (rand() - 0.5) * s * 0.9);
      k.rod(top.clone(), b, 0.003, k.m('paint', '#5d7045'));
      const bloom = k.add(new THREE.IcosahedronGeometry(0.035 + rand() * 0.015, 2), k.m('fabric', flowerColor), b.x, b.y, b.z);
      bloom.scale.y = 0.8;
      const leaf = k.add(leafGeo(0.07, 0.03), k.m('leaf', '#5d7045'), b.x, b.y - 0.08, b.z);
      leaf.rotation.set(0, rand() * 6, -0.6);
    }
  }
  return m;
}

export function candle(k, x, y, z, { h = 0.1, r = 0.035, color = '#f2ede2', holder = null } = {}) {
  let base = y;
  if (holder) { k.add(new THREE.CylinderGeometry(r * 1.4, r * 1.6, 0.02, 20), holder, x, y + 0.01, z); base += 0.02; }
  k.add(new THREE.CylinderGeometry(r, r, h, 20), k.m('matteCeramic', color), x, base + h / 2, z);
  k.add(new THREE.CylinderGeometry(0.0015, 0.0015, 0.012, 6), k.m('paint', '#222'), x, base + h + 0.006, z);
}

export function tray(k, x, y, z, { w = 0.4, d = 0.26, color = '#3a3733', mat = null } = {}) {
  const m = mat ?? k.m('wood', color);
  k.add(softBox(w, 0.012, d, { r: 0.004, seg: 2 }), m, x, y + 0.006, z);
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(w, 0.03, 0.008), m, x, y + 0.02, z + s * (d / 2 - 0.004));
    k.add(new THREE.BoxGeometry(0.008, 0.03, d), m, x + s * (w / 2 - 0.004), y + 0.02, z);
  }
  return y + 0.012;
}

export function bowl(k, x, y, z, { r = 0.12, color = '#2e2e2e', fruit = false, seed = 'b' } = {}) {
  const prof = [[0, 0], [r * 0.45, 0], [r * 0.85, r * 0.3], [r, r * 0.62], [r * 0.95, r * 0.62], [r * 0.8, r * 0.32], [r * 0.4, r * 0.06], [0, r * 0.05]];
  const m = lathe(k, prof, k.m('ceramic', color), x, y, z);
  m.material.side = THREE.DoubleSide;
  if (fruit) {
    const rand = rng(seed);
    for (let i = 0; i < 5; i++) {
      const a = rand() * 6.28, d = rand() * r * 0.5;
      k.add(new THREE.SphereGeometry(0.035, 16, 12), k.m('ceramic', rand() < 0.5 ? '#e8a13a' : '#d9c24a'), x + Math.cos(a) * d, y + r * 0.35 + (i > 2 ? 0.05 : 0), z + Math.sin(a) * d);
    }
  }
  return m;
}

export function mug(k, x, y, z, color = '#e9e4da') {
  const m = lathe(k, [[0, 0], [0.04, 0], [0.042, 0.09], [0.038, 0.09], [0.036, 0.008], [0, 0.008]], k.m('ceramic', color), x, y, z, 24);
  m.material.side = THREE.DoubleSide;
  const h = k.add(new THREE.TorusGeometry(0.025, 0.006, 8, 16, Math.PI), k.m('ceramic', color), x + 0.042, y + 0.045, z);
  h.rotation.z = -Math.PI / 2;
}

export function glassOfWater(k, x, y, z) {
  const g = lathe(k, [[0, 0], [0.032, 0], [0.036, 0.11], [0.034, 0.11], [0.03, 0.004], [0, 0.004]], k.m('glass'), x, y, z, 24);
  g.material.side = THREE.DoubleSide;
}

export function frame(k, x, y, z, { w = 0.13, h = 0.18, color = '#1f1f1f', seed = 'f', rotY = 0 } = {}) {
  const g = new THREE.Group();
  k.add(softBox(w, h, 0.015, { r: 0.004, seg: 2 }), k.m('paint', color), 0, h / 2, 0, { parent: g });
  const photo = new THREE.MeshStandardMaterial({ map: snapshotTexture(seed), roughness: 0.5 });
  k.mats.push(photo);
  const pg = new THREE.PlaneGeometry(w * 0.72, h * 0.72);
  pg.userData.metreUV = true;
  k.add(pg, photo, 0, h / 2, 0.0085, { parent: g });
  g.position.set(x, y, z);
  g.rotation.set(-0.12, rotY, 0);
  k.g.add(g);
}

export function laptop(k, x, y, z, rotY = 0) {
  const g = new THREE.Group();
  const alu = k.m('metal', '#b9bcbf');
  k.add(softBox(0.32, 0.014, 0.22, { r: 0.006, seg: 2 }), alu, 0, 0.007, 0, { parent: g });
  const lid = k.add(softBox(0.32, 0.22, 0.008, { r: 0.004, seg: 2 }), alu, 0, 0.11, -0.12, { parent: g });
  lid.rotation.x = -0.3;
  const screen = k.add(new THREE.PlaneGeometry(0.29, 0.18), k.m('screen'), 0, 0.11, -0.114, { parent: g });
  screen.rotation.x = -0.3;
  g.position.set(x, y, z); g.rotation.y = rotY;
  k.g.add(g);
}

export function notebook(k, x, y, z, color = '#2e4058') {
  const n = k.add(softBox(0.15, 0.012, 0.21, { r: 0.003, seg: 2 }), k.m('paint', color), x, y + 0.006, z);
  n.rotation.y = 0.2;
  const pen = k.add(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), k.m('paint', '#1f1f1f'), x + 0.1, y + 0.004, z);
  pen.rotation.set(Math.PI / 2, 0, 0.4);
}

export function plantSmall(k, x, y, z, { potColor = '#e5ded2', kind = 'succulent', seed = 'ps' } = {}) {
  const rand = rng(seed);
  lathe(k, [[0, 0], [0.05, 0], [0.065, 0.1], [0.062, 0.1], [0, 0.092]], k.m('matteCeramic', potColor), x, y, z, 20);
  if (kind === 'trailing') {
    for (let i = 0; i < 6; i++) {
      const a = rand() * 6.28, len = 0.15 + rand() * 0.25;
      const pts = [[0, 0.1], [Math.cos(a) * 0.06, 0.11], [Math.cos(a) * 0.1, 0.05], [Math.cos(a) * 0.11, 0.1 - len]];
      for (let j = 0; j < 6; j++) {
        const t = j / 5;
        const leaf = k.add(leafGeo(0.035, 0.028, { kind: 'oval', bend: 0.1 }), k.m('leaf', rand() < 0.5 ? '#4f7a3a' : '#6c9a4a'), x + Math.cos(a) * (0.06 + t * 0.06), y + 0.1 - t * len, z + Math.sin(a) * (0.06 + t * 0.06));
        leaf.rotation.set(rand() * 2, a, rand());
      }
      void pts;
    }
  } else {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.28 + rand(), leaf = k.add(leafGeo(0.06 + rand() * 0.03, 0.025, { kind: 'oval', bend: -0.2 }), k.m('leaf', '#7f9a78'), x, y + 0.1, z);
      leaf.rotation.set(0, a, 0.9 + rand() * 0.4);
    }
  }
}

export function basket(k, x, y, z, { r = 0.2, h = 0.3, color = '#b99a70', blanket = null } = {}) {
  const m = k.add(new THREE.CylinderGeometry(r, r * 0.88, h, 32, 1, true), k.m('jute', color), x, y + h / 2, z);
  m.material.side = THREE.DoubleSide;
  k.add(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.01, 32), k.m('jute', color), x, y + 0.005, z);
  k.add(new THREE.TorusGeometry(r, 0.012, 8, 40), k.m('jute', color), x, y + h, z).rotation.x = Math.PI / 2;
  if (blanket) {
    const roll = k.add(softBox(r * 1.5, 0.16, 0.16, { r: 0.075, seg: 6, wrinkle: 0.006, seed: 3 }), k.m('knit', blanket), x, y + h + 0.02, z);
    roll.rotation.set(0.5, 0.4, 0.6);
  }
}

export function towelFolded(k, x, y, z, { w = 0.3, d = 0.22, n = 2, color = '#f1ede5', rotY = 0 } = {}) {
  let yy = y;
  for (let i = 0; i < n; i++) {
    const t = k.add(softBox(w, 0.05, d, { r: 0.022, seg: 5, puff: { y: 0.008 }, wrinkle: 0.002, seed: i }), k.m('terry', color), x, yy + 0.025, z);
    t.rotation.y = rotY + (i % 2 ? 0.05 : -0.03);
    yy += 0.05;
  }
  return yy;
}

export function towelHanging(k, x, y, z, { w = 0.45, len = 0.5, color = '#f1ede5', seed = 1, rotY = 0 } = {}) {
  const g = clothPathGeo([[-0.03, -len * 0.55], [-0.02, -0.02], [0, 0.012], [0.02, -0.02], [0.03, -len * 0.45]], w, { folds: 3, amp: 0.012, seed });
  const m = k.add(g, k.m('terry', color), x, y, z);
  m.material.side = THREE.DoubleSide;
  m.rotation.y = rotY;
  return m;
}

export function soapDispenser(k, x, y, z, color = '#2e2e2e') {
  lathe(k, [[0, 0], [0.035, 0], [0.037, 0.13], [0.02, 0.15], [0, 0.15]], k.m('ceramic', color), x, y, z, 20);
  k.add(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), k.m('metal', '#caa55e'), x, y + 0.17, z);
  k.add(new THREE.BoxGeometry(0.04, 0.008, 0.012), k.m('metal', '#caa55e'), x + 0.015, y + 0.19, z);
}

export function placeSetting(k, x, y, z, rotY, { plate = '#f4f1ea', mat = '#c9b89a', glass = true } = {}) {
  const g = new THREE.Group();
  const place = k.add(softBox(0.4, 0.004, 0.3, { r: 0.002, seg: 2 }), k.m('linen', mat), 0, 0.002, 0, { parent: g });
  void place;
  const p = new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.13, 0.012], [0.135, 0.02], [0.13, 0.02], [0.12, 0.014], [0, 0.008]].map(([a, b]) => V2(a, b)), 40);
  k.add(p, k.m('ceramic', plate), 0, 0.004, 0, { parent: g }).material.side = THREE.DoubleSide;
  const nap = k.add(softBox(0.1, 0.008, 0.2, { r: 0.003, seg: 3, wrinkle: 0.001 }), k.m('linen', '#ffffff'), -0.18, 0.006, 0, { parent: g });
  void nap;
  for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.012, 0.004, 0.19), k.m('metal', '#c8c8c4'), s * 0.155 + (s < 0 ? -0.045 : 0), 0.008, 0, { parent: g });
  if (glass) {
    const gl = new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.032, 0.002], [0.004, 0.012], [0.004, 0.08], [0.035, 0.1], [0.04, 0.17], [0.037, 0.17], [0.032, 0.1], [0, 0.095]].map(([a, b]) => V2(a, b)), 24);
    k.add(gl, k.m('glass'), 0.13, 0.004, -0.14, { parent: g }).material.side = THREE.DoubleSide;
  }
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  k.g.add(g);
}

// ---- textile accessories (sold as products, dressed onto furniture) --------------------------------
// Each returns a group tagged with the accessory's key so it can be tapped and inspected.

export function throwPillows(k, spots, colors, { key, seed = 'tp', size = 0.46 } = {}) {
  const g = new THREE.Group();
  g.userData.key = key;
  const rand = rng(seed);
  spots.forEach((s, i) => {
    const w = s.size ?? size;
    const kinds = ['velvet', 'linen', 'boucle', 'knit'];
    const mat = k.m(s.fabric ?? kinds[i % 2], colors[i % colors.length]);
    const pl = k.add(pillowGeo(w, s.h ?? w, 0.15, { seed: seed + i, chop: s.chop ?? 0.4 }), mat, s.x, s.y, s.z, { parent: g });
    pl.rotation.set(s.rx ?? -0.25, s.ry ?? (rand() - 0.5) * 0.3, s.rz ?? (rand() - 0.5) * 0.25);
  });
  k.g.add(g);
  return g;
}

// A throw draped over a sofa arm, a chair or the foot of a bed.
export function throwOverArm(k, { x, y, z, armW, dropIn, dropOut, depth = 0.55, color = '#b8aa92', knit = false, key, seed = 3 }) {
  const g = new THREE.Group();
  g.userData.key = key;
  const path = [[-armW / 2 - 0.02, -dropIn], [-armW / 2 - 0.01, -0.03], [-armW / 4, 0.012], [armW / 4, 0.012], [armW / 2 + 0.01, -0.03], [armW / 2 + 0.03, -dropOut]];
  const geo = clothPathGeo(path, depth, { folds: 3, amp: 0.02, seed });
  const m = k.add(geo, k.m(knit ? 'knit' : 'linen', color), x, y, z, { parent: g });
  m.rotation.y = Math.PI / 2;
  m.material.side = THREE.DoubleSide;
  k.g.add(g);
  return g;
}

export function bedThrow(k, { bed, color, knit, key, seed = 5 }) {
  const g = new THREE.Group();
  g.userData.key = key;
  const geo = drapeGeo({
    box: { x0: bed.x0, x1: bed.x1, z0: bed.footZ - 0.6, z1: bed.footZ, y: bed.top + 0.075 },
    cloth: { cx: (bed.x0 + bed.x1) / 2, cz: bed.footZ - 0.25, w: bed.x1 - bed.x0 + 0.3, l: 0.55 },
    lip: 0.05, drops: { left: 0.28, right: 0.28, front: 0.2 }, folds: 4, amp: 0.018, seed,
  });
  const m = k.add(geo, k.m(knit ? 'knit' : 'linen', color), 0, 0.004, 0, { parent: g });
  m.material.side = THREE.DoubleSide;
  k.g.add(g);
  return g;
}

// Duvet with a turned-down sheet, sleeping pillows and euro shams.
export function bedding(k, { bed, duvet, sheet, shams, key, seed = 7, fabric = 'linen' }) {
  const g = new THREE.Group();
  g.userData.key = key;
  const mid = (bed.x0 + bed.x1) / 2, bw = bed.x1 - bed.x0;
  const startZ = bed.headZ + 0.42;
  const duvetGeo = drapeGeo({
    box: { x0: bed.x0, x1: bed.x1, z0: startZ, z1: bed.footZ, y: bed.top + 0.06 },
    cloth: { cx: mid, cz: (startZ + bed.footZ) / 2 + 0.12, w: bw + 0.52, l: bed.footZ - startZ + 0.24 },
    lip: 0.07, drops: { left: bed.top - 0.14, right: bed.top - 0.14, front: bed.top - 0.18, back: 0.05 },
    folds: 5, amp: 0.022, wrinkle: 0.006, seed,
  });
  const dm = k.add(duvetGeo, k.m(fabric, duvet), 0, 0, 0, { parent: g });
  dm.material.side = THREE.DoubleSide;
  // puffy body of the duvet on top of the mattress
  k.add(softBox(bw + 0.02, 0.06, bed.footZ - startZ - 0.02, { r: 0.028, seg: 10, puff: { y: 0.02 }, wrinkle: 0.005, seed }), k.m(fabric, duvet), mid, bed.top + 0.03, (startZ + bed.footZ) / 2, { parent: g });
  // turned-down top sheet
  k.add(softBox(bw + 0.06, 0.035, 0.22, { r: 0.016, seg: 6, puff: { y: 0.006 }, wrinkle: 0.003, seed: seed + 1 }), k.m('linen', sheet), mid, bed.top + 0.075, startZ + 0.09, { parent: g });
  // sleeping pillows and euro shams against the headboard
  const n = bw > 1.7 ? 3 : 2;
  const pw = Math.min(0.72, (bw - 0.1) / n);
  for (let i = 0; i < n; i++) {
    const x = mid - ((n - 1) / 2 - i) * pw;
    const sham = k.add(pillowGeo(Math.min(0.62, pw - 0.04), 0.62, 0.18, { seed: seed + 10 + i, chop: 0 }), k.m(fabric, shams), x, bed.top + 0.36, bed.headZ + 0.1, { parent: g });
    sham.rotation.x = -0.18;
  }
  for (let i = 0; i < 2; i++) {
    const x = mid + (i ? 1 : -1) * Math.min(0.4, bw / 4);
    const pl = k.add(softBox(Math.min(0.68, bw / 2 - 0.06), 0.14, 0.44, { r: 0.06, seg: 8, puff: { y: 0.04, x: 0.01 }, wrinkle: 0.006, seed: seed + 20 + i }), k.m(fabric, sheet), x, bed.top + 0.12, bed.headZ + 0.33, { parent: g });
    pl.rotation.x = -0.55;
  }
  k.g.add(g);
  return g;
}

export { boxUV };
