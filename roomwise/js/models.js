// Procedural 3D furniture. Every builder makes a piece at its catalog size (metres),
// origin at the centre of its footprint on the floor, front facing +z.
// Ceiling pieces hang down from their origin. The tier ("v") changes the design.
//
// In production, retailers' GLB/USDZ models replace these builders one category at a time:
// buildModel() is the only entry point the rest of the app uses.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TIER_KIT } from './catalog.js';
import { woodGrain, marble, rugTexture, artTexture } from './textures.js';
import { rng } from './util.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
const UP = V3(0, 1, 0);

function rbox(w, h, d, r = 0.02, seg = 3) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  if (r <= 0.002) return new THREE.BoxGeometry(w, h, d);
  return new RoundedBoxGeometry(w, h, d, seg, r);
}
const cyl = (rt, rb, h, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

function makeMaterial(kind, color, extra) {
  const c = new THREE.Color(color);
  const base = { color: c, transparent: true };
  switch (kind) {
    case 'fabric': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.93 });
    case 'velvet': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.78, sheen: 1, sheenRoughness: 0.35, sheenColor: c.clone().offsetHSL(0, -0.1, 0.25) });
    case 'boucle': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 1, sheen: 0.7, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') });
    case 'leather': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.5 });
    case 'wood': return new THREE.MeshStandardMaterial({ ...base, map: woodGrain(), roughness: 0.62 });
    case 'laminate': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.5 });
    case 'lacquer': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
    case 'marble': return new THREE.MeshPhysicalMaterial({ ...base, map: marble(), roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.2 });
    case 'stone': return new THREE.MeshStandardMaterial({ ...base, map: marble(), roughness: 0.78 });
    case 'ceramic': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 });
    case 'metal': return new THREE.MeshStandardMaterial({ ...base, metalness: 1, roughness: 0.3 });
    case 'paint': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.5, metalness: 0.05 });
    case 'glass': return new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color('#dfe9ea'), roughness: 0.05, opacity: 0.35, metalness: 0, userData: { baseOpacity: 0.35 } });
    case 'mirror': return new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color('#e4eaec'), metalness: 1, roughness: 0.04 });
    case 'screen': return new THREE.MeshPhysicalMaterial({ ...base, color: new THREE.Color('#0c0d0f'), roughness: 0.12, clearcoat: 1 });
    case 'paper': return new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 0.9, roughness: 1, side: THREE.DoubleSide });
    case 'shade': return new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0.55, roughness: 0.95, side: THREE.DoubleSide });
    case 'glow': return new THREE.MeshStandardMaterial({ ...base, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 1.4, roughness: 1, side: THREE.BackSide });
    case 'bulb': return new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color('#fff3dc'), emissive: new THREE.Color('#fff0d0'), emissiveIntensity: 3 });
    case 'alabaster': return new THREE.MeshPhysicalMaterial({ ...base, roughness: 0.35, clearcoat: 0.4, emissive: c.clone(), emissiveIntensity: 0.18 });
    case 'leaf': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.65, side: THREE.DoubleSide });
    case 'foliage': return new THREE.MeshStandardMaterial({ ...base, roughness: 0.85, flatShading: true });
    case 'rug': return new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color('#ffffff'), map: extra.map, roughness: 1 });
    case 'art': return new THREE.MeshStandardMaterial({ ...base, color: new THREE.Color('#ffffff'), map: extra.map, roughness: 0.85 });
    default: return new THREE.MeshStandardMaterial({ ...base, roughness: 0.6 });
  }
}

const REAL_METAL = /brass|bronze|nickel|polish|antiqu|burnish/i;

class Kit {
  constructor(product, finishIndex) {
    this.p = product;
    this.o = product.model;
    this.v = product.model.v;
    this.T = TIER_KIT[product.tier];
    this.finish = product.finishes[finishIndex] ?? product.finishes[0];
    this.g = new THREE.Group();
    this.mats = [];
    this.lights = [];
    this.memo = new Map();
  }
  m(kind, color = '#ffffff', extra) {
    const key = `${kind}:${color}`;
    if (!extra && this.memo.has(key)) return this.memo.get(key);
    const mat = makeMaterial(kind, color, extra);
    this.mats.push(mat);
    if (!extra) this.memo.set(key, mat);
    return mat;
  }
  main() {
    const kind = this.o.main;
    if (kind === 'metal' && !REAL_METAL.test(this.finish.name)) return this.m('paint', this.finish.color);
    return this.m(kind, this.finish.color);
  }
  wood(c = this.T.wood) { return this.m('wood', c); }
  metal() { return this.T.metalKind === 'brass' ? this.m('metal', this.T.metal) : this.m('paint', this.T.metal); }
  dark() { return this.m('paint', '#232323'); }
  stone() { return this.m('stone', this.T.stone); }
  textile(c = this.T.textile) { return this.m('fabric', c); }
  add(geo, mat, x = 0, y = 0, z = 0, { cast = true, parent = this.g } = {}) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // A glowing bulb with a soft point light; used by every lamp.
  bulb(x, y, z, intensity = 3, mesh = true) {
    if (mesh) this.add(new THREE.SphereGeometry(0.025, 12, 8), this.m('bulb'), x, y, z, { cast: false });
    const light = new THREE.PointLight('#ffd7a8', intensity, 4.5, 2);
    light.position.set(x, y, z);
    this.g.add(light);
    this.lights.push(light);
  }
}

function between(mesh, a, b) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return mesh;
}

function rod(k, a, b, r, mat) {
  return between(k.add(cyl(r, r, a.distanceTo(b), 10), mat), a, b);
}

function legs4(k, spanW, spanD, h, mat, style = 'block', y0 = 0) {
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const geo = style === 'taper' ? cyl(0.022, 0.012, h, 12) : style === 'round' ? cyl(0.016, 0.016, h, 12) : rbox(0.045, h, 0.045, 0.006);
      k.add(geo, mat, (sx * spanW) / 2, y0 + h / 2, (sz * spanD) / 2);
    }
  }
}

// ---- decor ------------------------------------------------------------------------
function vase(k, x, y, z, s = 0.22, color = '#d8d2c6') {
  const pts = [V2(0, 0), V2(0.28, 0), V2(0.42, 0.2), V2(0.4, 0.55), V2(0.2, 0.85), V2(0.16, 1), V2(0.13, 1)].map((p) => V2(p.x * s, p.y * s));
  k.add(new THREE.LatheGeometry(pts, 24), k.m('ceramic', color), x, y, z);
  for (let i = 0; i < 3; i++) {
    const a = V3(x, y + s * 0.9, z);
    const b = V3(x + (i - 1) * s * 0.35, y + s * (1.8 + i * 0.15), z + (i - 1) * 0.02);
    rod(k, a, b, 0.003, k.m('paint', '#6b6247'));
  }
}

function books(k, x, y, z, n = 3, seed = 'b') {
  const rand = rng(seed);
  const cols = ['#b44b3a', '#35425a', '#d6c9ad', '#5a6b4c', '#1f1f1f', '#c49a3c'];
  let yy = y;
  for (let i = 0; i < n; i++) {
    const h = 0.025 + rand() * 0.02;
    const m = k.add(rbox(0.2 + rand() * 0.06, h, 0.14 + rand() * 0.05, 0.003), k.m('fabric', cols[(rand() * cols.length) | 0]), x, yy + h / 2, z);
    m.rotation.y = (rand() - 0.5) * 0.4;
    yy += h;
  }
  return yy;
}

function bowl(k, x, y, z, r = 0.12, color = '#2e2e2e') {
  k.add(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), k.m('ceramic', color), x, y + r, z).material.side = THREE.DoubleSide;
}

function tv(k, width, y0) {
  const th = width * 0.575;
  k.add(rbox(0.32, 0.014, 0.2, 0.004), k.dark(), 0, y0 + 0.007, 0);
  k.add(rbox(0.05, 0.08, 0.03, 0.005), k.dark(), 0, y0 + 0.05, -0.02);
  k.add(rbox(width, th, 0.03, 0.006), k.m('screen'), 0, y0 + 0.08 + th / 2, -0.02);
}

function monitor(k, x, y, z) {
  k.add(rbox(0.24, 0.012, 0.17, 0.004), k.dark(), x, y + 0.006, z);
  k.add(rbox(0.04, 0.24, 0.02, 0.006), k.dark(), x, y + 0.12, z - 0.03);
  k.add(rbox(0.62, 0.37, 0.025, 0.006), k.m('screen'), x, y + 0.13 + 0.185, z);
  k.add(rbox(0.42, 0.014, 0.13, 0.004), k.m('paint', '#d9d9d6'), x, y + 0.007, z + 0.26);
}

function laptop(k, x, y, z) {
  const alu = k.m('metal', '#b9bcbf');
  k.add(rbox(0.32, 0.014, 0.22, 0.006), alu, x, y + 0.007, z);
  const lid = k.add(rbox(0.32, 0.22, 0.008, 0.004), alu, x, y + 0.11, z - 0.12);
  lid.rotation.x = -0.28;
}

function vesselSink(k, x, y, z, r = 0.2) {
  const prof = [[0, 0], [0.55, 0.005], [0.9, 0.05], [1, 0.14], [0.95, 0.14], [0.86, 0.06], [0.5, 0.02], [0, 0.018]];
  const sink = k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a * r, b)), 40), k.m('ceramic', '#f7f7f4'), x, y, z);
  sink.material.side = THREE.DoubleSide;
}

function faucet(k, x, y, z, mat, tall = 0.24) {
  k.add(cyl(0.014, 0.018, tall, 12), mat, x, y + tall / 2, z);
  const spout = k.add(cyl(0.01, 0.01, 0.15, 10), mat, x, y + tall - 0.01, z + 0.07);
  spout.rotation.x = Math.PI / 2;
}

function bookRows(k, levels, span, depth, maxH, seed) {
  const rand = rng(seed);
  const palette = ['#8c3b2f', '#2f3e57', '#d8ccb2', '#5b6a4d', '#1f1f1f', '#c7a052', '#a8b3b8', '#6e4b3a', '#e9e4da'];
  const mats = [];
  for (const y of levels) {
    let x = -span / 2;
    const stop = span / 2 - span * (0.12 + rand() * 0.45);
    while (x < stop) {
      const bw = 0.018 + rand() * 0.032;
      const bh = Math.min(maxH - 0.03, 0.17 + rand() * 0.11);
      const bd = Math.min(depth * 0.85, 0.15 + rand() * 0.07);
      mats.push({ x: x + bw / 2, y: y + bh / 2, z: -depth / 2 + bd / 2 + 0.02, s: V3(bw, bh, bd), c: palette[(rand() * palette.length) | 0] });
      x += bw + 0.002;
    }
    if (rand() < 0.6) vase(k, span / 2 - 0.12, y, 0, 0.12 + rand() * 0.08, rand() < 0.5 ? '#e5ded2' : '#3a3b3c');
  }
  if (!mats.length) return;
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.8, transparent: true });
  k.mats.push(mat);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, mats.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  mats.forEach((b, i) => {
    m4.compose(V3(b.x, b.y, b.z), q, b.s);
    inst.setMatrixAt(i, m4);
    inst.setColorAt(i, new THREE.Color(b.c));
  });
  inst.castShadow = true; inst.receiveShadow = true;
  k.g.add(inst);
}

// Drawers and doors on a box: dressers, sideboards, media units, wardrobes, cabinets.
function casePiece(k, w, d, h, { rows = 1, cols = 1, handle = 'bar', legH = null, topMat = null, crown = false, glassTop = false } = {}) {
  const v = k.v, body = k.main();
  const lh = legH ?? (v === 'basic' ? 0.06 : v === 'luxury' ? 0.15 : 0.07);
  if (v === 'luxury') legs4(k, w - 0.08, d - 0.08, lh, k.wood(), 'taper');
  else k.add(rbox(w - 0.06, lh, d - 0.06, 0.004), v === 'supreme' ? k.metal() : body, 0, lh / 2, 0);
  const topT = topMat ? 0.03 : 0;
  const bh = h - lh - topT - (crown ? 0.04 : 0);
  k.add(rbox(w, bh, d, 0.006), body, 0, lh + bh / 2, 0);
  if (topMat) k.add(rbox(w + 0.012, topT, d + 0.012, 0.004), topMat, 0, h - topT / 2, 0);
  if (crown) k.add(rbox(w + 0.04, 0.04, d + 0.03, 0.006), body, 0, h - 0.02, 0);
  const inset = 0.012, gap = 0.006;
  const fw = (w - inset * 2) / cols, fh = (bh - inset * 2) / rows;
  const metal = v === 'basic' ? k.dark() : k.metal();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + inset + fw * (c + 0.5);
      const y = lh + inset + fh * (r + 0.5);
      const glass = glassTop && r === rows - 1;
      k.add(rbox(fw - gap, fh - gap, 0.016, 0.003), glass ? k.m('glass') : body, x, y, d / 2 + 0.006);
      if (handle === 'bar') k.add(rbox(Math.min(0.16, fw * 0.4), 0.014, 0.02, 0.005), metal, x, y + fh * 0.18, d / 2 + 0.022);
      else if (handle === 'knob') k.add(new THREE.SphereGeometry(0.014, 12, 8), metal, x, y + fh * 0.18, d / 2 + 0.024);
      else if (handle === 'vbar') {
        const side = cols === 1 ? 1 : c % 2 === 0 ? 1 : -1;
        k.add(rbox(0.014, Math.min(0.32, fh * 0.35), 0.02, 0.005), metal, x + side * (fw / 2 - 0.04), y, d / 2 + 0.022);
      }
    }
    if (v === 'supreme') {
      for (let c = 1; c < cols; c++) k.add(new THREE.BoxGeometry(0.005, bh - 0.02, 0.004), k.metal(), -w / 2 + inset + fw * c, lh + bh / 2, d / 2 + 0.016);
    }
  }
}

// ---- builders -------------------------------------------------------------------------
const B = {};

B.sofa = (k, w, d, h) => {
  const v = k.v, fab = k.main();
  const seats = k.o.seats ?? (w > 1.9 ? 3 : 2);
  const legH = v === 'supreme' ? 0.07 : v === 'luxury' ? 0.14 : 0.12;
  const armW = v === 'supreme' ? (seats === 1 ? 0.18 : 0.24) : v === 'luxury' ? 0.16 : 0.13;
  const armH = v === 'supreme' ? 0.57 : 0.6;
  const seatTop = 0.45, baseTop = seatTop - 0.15;
  const r = v === 'supreme' ? 0.09 : v === 'luxury' ? 0.05 : 0.025;
  if (v === 'supreme') k.add(rbox(w - 0.14, legH, d - 0.14, 0.02), seats === 1 ? k.metal() : k.stone(), 0, legH / 2, 0);
  else legs4(k, w - 0.12, d - 0.12, legH, k.wood(), v === 'luxury' ? 'taper' : 'block');
  k.add(rbox(w, baseTop - legH, d, Math.min(r, 0.05)), fab, 0, legH + (baseTop - legH) / 2, 0);
  const backD = v === 'supreme' ? 0.24 : 0.18;
  k.add(rbox(w, h - legH, backD, r), fab, 0, legH + (h - legH) / 2, -d / 2 + backD / 2);
  for (const s of [-1, 1]) k.add(rbox(armW, armH - legH, d, r), fab, s * (w / 2 - armW / 2), legH + (armH - legH) / 2, 0);
  const innerW = w - armW * 2, cw = innerW / seats, cd = d - backD - 0.01;
  for (let i = 0; i < seats; i++) {
    const x = -innerW / 2 + cw * (i + 0.5);
    k.add(rbox(cw - 0.01, 0.16, cd, 0.06), fab, x, baseTop + 0.08, -d / 2 + backD + cd / 2);
    const bh = h - seatTop - 0.02;
    const back = k.add(rbox(cw - 0.02, bh, 0.18, 0.07), fab, x, seatTop + bh / 2 - 0.01, -d / 2 + backD + 0.06);
    back.rotation.x = -0.12;
  }
  if (v !== 'basic' && seats > 1) {
    const accent = k.m(v === 'supreme' ? 'velvet' : 'fabric', k.T.accent);
    for (const s of [-1, 1]) {
      const pil = k.add(rbox(0.42, 0.4, 0.13, 0.06), accent, s * (innerW / 2 - 0.26), seatTop + 0.2, -d / 2 + backD + 0.2);
      pil.rotation.set(-0.25, 0, s * 0.1);
    }
  }
};
B.armchair = B.sofa;

B.coffeeTable = (k, w, d, h) => {
  const v = k.v, top = k.main();
  if (v === 'basic') {
    k.add(rbox(w, 0.03, d, 0.004), top, 0, h - 0.015, 0);
    k.add(rbox(w - 0.1, 0.018, d - 0.1, 0.003), top, 0, 0.14, 0);
    legs4(k, w - 0.06, d - 0.06, h - 0.03, top, 'block');
    books(k, w * 0.2, h, 0, 2, k.p.id);
  } else if (v === 'luxury') {
    k.add(rbox(w, 0.05, d, 0.025), top, 0, h - 0.025, 0);
    for (const s of [-1, 1]) k.add(rbox(0.06, h - 0.05, d - 0.12, 0.02), top, s * (w / 2 - 0.14), (h - 0.05) / 2, 0);
    k.add(rbox(w - 0.34, 0.03, 0.05, 0.01), top, 0, 0.08, 0);
    books(k, -w * 0.18, h, 0.02, 3, k.p.id);
    bowl(k, w * 0.2, h, 0, 0.11, '#3a3b3c');
  } else {
    const r = w / 2;
    k.add(cyl(r, r, 0.04, 64), top, 0, h - 0.02, 0);
    k.add(cyl(r * 0.38, r * 0.42, h - 0.04, 48), k.stone(), 0, (h - 0.04) / 2, 0);
    const t = books(k, -r * 0.3, h, 0.05, 3, k.p.id);
    vase(k, -r * 0.3, t, 0.05, 0.12, '#1f1f1f');
    bowl(k, r * 0.35, h, -0.1, 0.13, '#caa55e');
  }
};

B.sideTable = (k, w, d, h) => {
  const v = k.v, r = w / 2, m = k.main();
  if (v === 'basic') {
    k.add(cyl(r, r, 0.02, 40), m, 0, h - 0.01, 0);
    k.add(cyl(0.014, 0.014, h - 0.03, 10), m, 0, (h - 0.03) / 2 + 0.01, 0);
    k.add(cyl(r * 0.7, r * 0.72, 0.015, 32), m, 0, 0.0075, 0);
  } else if (v === 'luxury') {
    k.add(cyl(r, r * 0.95, h, 40), m, 0, h / 2, 0);
    vase(k, 0, h, 0, 0.16, '#e5ded2');
  } else {
    k.add(cyl(r * 0.5, r, h / 2, 40), m, 0, h / 4, 0);
    k.add(cyl(r, r * 0.5, h / 2, 40), m, 0, (h * 3) / 4, 0);
    vase(k, 0.04, h, 0, 0.15, '#1f1f1f');
  }
};

B.rug = (k, w, d, h) => {
  const map = rugTexture(k.o.pattern, k.finish.color, w, d);
  const t = Math.max(h, 0.008);
  k.add(new THREE.BoxGeometry(w, t, d), k.m('rug', k.finish.color, { map }), 0, t / 2, 0, { cast: false });
};
B.bathMat = B.rug;

B.mediaUnit = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 1, cols: w > 1.7 ? 4 : 3, handle: k.v === 'supreme' ? 'none' : 'vbar' });
  tv(k, Math.min(1.23, w * 0.72), h);
  vase(k, w / 2 - 0.18, h, 0, 0.16, k.v === 'basic' ? '#e9e6df' : '#3a3b3c');
  if (k.v !== 'basic') books(k, -w / 2 + 0.2, h, 0, 3, k.p.id);
};

B.floorLamp = (k, w, d, h) => {
  const v = k.v, shade = k.m('shade', k.T.textile);
  if (v === 'basic') {
    const m = k.main();
    k.add(cyl(0.13, 0.14, 0.025, 32), m, 0, 0.0125, 0);
    k.add(cyl(0.011, 0.011, h - 0.28, 12), m, 0, (h - 0.28) / 2, 0);
    k.add(cyl(0.15, 0.18, 0.3, 32, true), shade, 0, h - 0.15, 0, { cast: false });
    k.bulb(0, h - 0.2, 0, 3);
  } else if (v === 'luxury') {
    const top = h - 0.34, spread = w / 2 - 0.03;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      rod(k, V3(Math.cos(a) * spread, 0, Math.sin(a) * spread), V3(0, top, 0), 0.014, k.main());
    }
    k.add(cyl(0.012, 0.012, 0.2, 10), k.metal(), 0, top + 0.1, 0);
    k.add(cyl(0.24, 0.24, 0.32, 40, true), shade, 0, h - 0.16, 0, { cast: false });
    k.bulb(0, h - 0.2, 0, 3.5);
  } else {
    const reach = k.o.reach ?? 1;
    const arc = k.main();
    k.add(cyl(0.19, 0.2, 0.16, 40), k.m('marble', '#ffffff'), 0, 0.08, 0);
    const curve = new THREE.CubicBezierCurve3(V3(0, 0.16, 0), V3(0, h * 0.95, 0), V3(-reach * 0.35, h * 1.04, 0), V3(-reach, h - 0.2, 0));
    k.add(new THREE.TubeGeometry(curve, 64, 0.012, 8, false), arc);
    const cy = h - 0.4;
    k.add(new THREE.SphereGeometry(0.2, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), arc, -reach, cy, 0);
    k.add(new THREE.SphereGeometry(0.195, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), k.m('glow'), -reach, cy, 0, { cast: false });
    k.bulb(-reach, cy + 0.03, 0, 4);
  }
};

B.plant = (k, w, d, h) => {
  const leaf = k.o.leaf, rand = rng(k.p.id);
  const potH = leaf === 'olive' ? 0.42 : leaf === 'fig' ? 0.38 : 0.26;
  const rTop = w * (leaf === 'olive' ? 0.4 : 0.42), rBot = rTop * 0.78;
  if (leaf === 'olive') k.add(rbox(rTop * 2, potH, rTop * 2, 0.03), k.main(), 0, potH / 2, 0);
  else k.add(cyl(rTop, rBot, potH, 28), k.main(), 0, potH / 2, 0);
  k.add(cyl(rTop * 0.92, rTop * 0.92, 0.01, 24), k.m('paint', '#3b2a1e'), 0, potH - 0.015, 0);
  const g1 = k.m('leaf', '#46633a'), g2 = k.m('leaf', '#6c8a4a'), g3 = k.m('leaf', '#35502f');
  if (leaf === 'snake') {
    for (let i = 0; i < 12; i++) {
      const lh = (h - potH) * (0.55 + rand() * 0.45);
      const m = k.add(new THREE.SphereGeometry(1, 10, 12), rand() < 0.5 ? g1 : g3, (rand() - 0.5) * rTop, potH + lh / 2 - 0.02, (rand() - 0.5) * rTop);
      m.scale.set(0.03, lh / 2, 0.009);
      m.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
    }
  } else if (leaf === 'fig') {
    const stemH = h - potH - 0.05;
    k.add(cyl(0.012, 0.018, stemH, 8), k.m('paint', '#5a4632'), 0, potH + stemH / 2, 0);
    for (let i = 0; i < 30; i++) {
      const t = 0.28 + (i / 30) * 0.72;
      const a = i * 2.4 + rand();
      const rr = 0.07 + (1 - t) * 0.12 + rand() * 0.05;
      const m = k.add(new THREE.SphereGeometry(1, 12, 8), rand() < 0.5 ? g1 : g2, Math.cos(a) * rr, potH + stemH * t, Math.sin(a) * rr);
      m.scale.set(0.075, 0.012, 0.115);
      m.rotation.order = 'YXZ';
      m.rotation.set(-0.35 - rand() * 0.3, Math.PI / 2 - a, 0);
    }
  } else {
    const trunkH = h * 0.5;
    const brown = k.m('paint', '#6b5a48');
    rod(k, V3(0, potH - 0.05, 0), V3(0.05, potH + trunkH * 0.6, 0.02), 0.04, brown);
    rod(k, V3(0.05, potH + trunkH * 0.6, 0.02), V3(-0.02, potH + trunkH, 0), 0.03, brown);
    const f1 = k.m('foliage', '#7d8a5a'), f2 = k.m('foliage', '#98a26f');
    for (let i = 0; i < 18; i++) {
      const a = rand() * Math.PI * 2, rr = rand() * w * 0.32;
      const s = 0.13 + rand() * 0.13;
      const y = potH + trunkH + rand() * (h - potH - trunkH - s);
      k.add(new THREE.IcosahedronGeometry(s, 1), rand() < 0.5 ? f1 : f2, Math.cos(a) * rr, y, Math.sin(a) * rr);
    }
  }
};

B.bookcase = (k, w, d, h) => {
  const t = 0.025, mat = k.main();
  let levels = [], gapH;
  if (k.o.frame === 'etagere') {
    const brass = k.metal();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.012, 0.012, h, 10), brass, sx * (w / 2 - 0.015), h / 2, sz * (d / 2 - 0.015));
    const n = 5;
    gapH = (h - 0.12) / (n - 1);
    for (let i = 0; i < n; i++) {
      const y = 0.08 + i * gapH;
      k.add(rbox(w - 0.01, 0.03, d - 0.01, 0.005), mat, 0, y, 0);
      if (i < n - 1) levels.push(y + 0.015);
    }
  } else {
    for (const s of [-1, 1]) k.add(rbox(t, h, d, 0.003), mat, s * (w / 2 - t / 2), h / 2, 0);
    k.add(rbox(w, t, d, 0.003), mat, 0, h - t / 2, 0);
    k.add(rbox(w, 0.08, d, 0.003), mat, 0, 0.04, 0);
    k.add(new THREE.BoxGeometry(w - 2 * t, h - 0.1, 0.008), mat, 0, h / 2 + 0.02, -d / 2 + 0.004);
    const n = Math.max(3, Math.round((h - 0.1) / 0.37));
    gapH = (h - 0.08 - t) / n;
    levels.push(0.08);
    for (let i = 1; i < n; i++) {
      const y = 0.08 + i * gapH;
      k.add(new THREE.BoxGeometry(w - 2 * t, 0.02, d - 0.01), mat, 0, y, 0.004);
      levels.push(y + 0.01);
    }
  }
  bookRows(k, levels, w - 0.07, d, gapH, k.p.id);
};

B.wallArt = (k, w, d, h) => {
  const v = k.v;
  const frame = v === 'basic' ? k.m('paint', '#262626') : v === 'luxury' ? k.m('wood', '#b58a5a') : k.m('metal', '#c4a060');
  const fw = v === 'basic' ? 0.02 : v === 'luxury' ? 0.025 : 0.07;
  k.add(rbox(w, fw, d, fw * 0.4), frame, 0, h - fw / 2, 0);
  k.add(rbox(w, fw, d, fw * 0.4), frame, 0, fw / 2, 0);
  for (const s of [-1, 1]) k.add(rbox(fw, h, d, fw * 0.4), frame, s * (w / 2 - fw / 2), h / 2, 0);
  k.add(new THREE.BoxGeometry(w - 2 * fw, h - 2 * fw, d * 0.6), k.m('paint', '#f1ede5'), 0, h / 2, -d * 0.2);
  const pad = v === 'supreme' ? 0 : 0.045;
  const aw = w - 2 * fw - 2 * pad, ah = h - 2 * fw - 2 * pad;
  const map = artTexture(k.o.art, k.finish.color, k.finish.name, aw, ah);
  k.add(new THREE.PlaneGeometry(aw, ah), k.m('art', k.finish.color, { map }), 0, h / 2, d * 0.1 + 0.001, { cast: false });
};

B.ceilingLight = (k, w, d, h, opts = {}) => {
  const v = k.v, drop = opts.drop ?? h, r = w / 2;
  const cordMat = k.m('paint', v === 'basic' ? '#eeeeee' : '#2a2a2a');
  if (v === 'basic') {
    const cord = Math.max(0.05, drop - 2 * r);
    k.add(cyl(0.004, 0.004, cord, 6), cordMat, 0, -cord / 2, 0);
    k.add(new THREE.SphereGeometry(r, 32, 20), k.main(), 0, -cord - r, 0, { cast: false });
    k.bulb(0, -cord - r, 0, 5, false);
  } else if (v === 'luxury') {
    const shadeH = r * 0.9, cord = Math.max(0.05, drop - shadeH);
    k.add(cyl(0.06, 0.06, 0.02, 24), k.main(), 0, -0.01, 0);
    k.add(cyl(0.004, 0.004, cord, 6), cordMat, 0, -cord / 2, 0);
    const dome = k.add(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.main(), 0, -drop, 0);
    dome.scale.y = 0.9;
    const inner = k.add(new THREE.SphereGeometry(r * 0.98, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.m('glow'), 0, -drop + 0.001, 0, { cast: false });
    inner.scale.y = 0.88;
    k.bulb(0, -drop + 0.06, 0, 5);
  } else {
    const brass = k.main();
    const cy = -drop + 0.22;
    k.add(cyl(0.08, 0.08, 0.025, 24), brass, 0, -0.0125, 0);
    k.add(cyl(0.01, 0.01, -cy - 0.1, 8), brass, 0, (cy + 0.1) / 2, 0);
    k.add(cyl(0.03, 0.055, 0.42, 16), brass, 0, cy + 0.02, 0);
    const tiers = [[r * 0.88, 8, 0], [r * 0.5, 4, 0.28]];
    for (const [rr, n, dy] of tiers) {
      const ring = k.add(new THREE.TorusGeometry(rr, 0.012, 8, 64), brass, 0, cy + dy, 0);
      ring.rotation.x = Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + dy;
        const px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
        rod(k, V3(0, cy + dy + 0.05, 0), V3(px, cy + dy, pz), 0.007, brass);
        k.add(cyl(0.032, 0.02, 0.03, 12), brass, px, cy + dy + 0.02, pz);
        k.add(cyl(0.012, 0.012, 0.09, 10), k.m('paint', '#f6f1e6'), px, cy + dy + 0.08, pz);
        const flame = k.add(new THREE.SphereGeometry(0.016, 10, 8), k.m('bulb'), px, cy + dy + 0.14, pz, { cast: false });
        flame.scale.y = 1.7;
      }
    }
    k.bulb(0, cy + 0.12, 0, 7, false);
  }
};

B.bed = (k, w, d, h) => {
  const v = k.v, frame = k.main();
  const headT = v === 'supreme' ? 0.14 : v === 'luxury' ? 0.1 : 0.04;
  const bw = v === 'supreme' ? w - 0.18 : v === 'luxury' ? w - 0.04 : w;
  const legH = v === 'basic' ? 0.1 : 0.06;
  const baseH = 0.26;
  if (v === 'basic') legs4(k, bw - 0.06, d - 0.08, legH, frame, 'block');
  else k.add(rbox(bw - 0.12, legH, d - 0.2, 0.01), k.dark(), 0, legH / 2, 0.05);
  const base = legH + baseH;
  k.add(rbox(bw, baseH, d - headT, v === 'basic' ? 0.01 : 0.04), frame, 0, legH + baseH / 2, headT / 2);
  const mattH = 0.22, mattD = d - headT - 0.08;
  k.add(rbox(bw - 0.06, mattH, mattD, 0.05), k.m('fabric', '#f4f2ee'), 0, base + mattH / 2 - 0.04, headT / 2);
  const top = base + mattH - 0.04;
  const duvD = mattD * 0.74, duvet = k.textile();
  const footZ = d / 2 - 0.04;
  k.add(rbox(bw - 0.02, 0.07, duvD, 0.035), duvet, 0, top, footZ - duvD / 2);
  k.add(rbox(bw - 0.02, 0.05, 0.24, 0.025), duvet, 0, top + 0.04, footZ - duvD + 0.12);
  const pw = (bw - 0.12) / 2, headZ = -d / 2 + headT;
  const white = k.m('fabric', '#f7f5f1');
  for (const s of [-1, 1]) {
    const pil = k.add(rbox(pw - 0.04, 0.14, 0.38, 0.06), white, (s * pw) / 2, top + 0.06, headZ + 0.24);
    pil.rotation.x = -0.25;
    if (v !== 'basic') {
      const acc = k.add(rbox(Math.min(0.5, pw - 0.12), 0.32, 0.12, 0.05), k.m(v === 'supreme' ? 'velvet' : 'fabric', k.T.accent), (s * pw) / 2, top + 0.2, headZ + 0.46);
      acc.rotation.x = -0.3;
    }
  }
  if (v !== 'basic') k.add(rbox(bw + 0.02, 0.025, 0.5, 0.012), k.m('fabric', k.T.accent), 0, top + 0.05, footZ - 0.3);
  if (v === 'basic') k.add(rbox(w, h - legH, headT, 0.01), frame, 0, legH + (h - legH) / 2, -d / 2 + headT / 2);
  else if (v === 'luxury') k.add(rbox(w, h - 0.12, headT, 0.045), frame, 0, 0.12 + (h - 0.12) / 2, -d / 2 + headT / 2);
  else {
    const n = Math.round(w / 0.16), cw = w / n;
    for (let i = 0; i < n; i++) k.add(rbox(cw - 0.006, h - 0.1, headT, 0.06), frame, -w / 2 + cw * (i + 0.5), 0.1 + (h - 0.1) / 2, -d / 2 + headT / 2);
  }
};

B.nightstand = (k, w, d, h) => {
  const v = k.v;
  if (v === 'supreme') casePiece(k, w, d, h, { rows: 2, cols: 1, handle: 'bar', topMat: k.m('marble', '#ffffff') });
  else casePiece(k, w, d, h, { rows: v === 'luxury' ? 1 : 2, cols: 1, handle: v === 'basic' ? 'knob' : 'bar' });
  if (v !== 'basic') books(k, w * 0.1, h, 0.02, 2, k.p.id);
};

B.tableLamp = (k, w, d, h) => {
  const v = k.v, r = w / 2, shade = k.m('shade', k.T.textile);
  if (v === 'basic') {
    k.add(cyl(0.06, 0.075, h * 0.45, 24), k.main(), 0, h * 0.225, 0);
    k.add(cyl(r * 0.78, r, h * 0.45, 32, true), shade, 0, h - h * 0.225, 0, { cast: false });
  } else if (v === 'luxury') {
    k.add(cyl(0.07, 0.075, 0.02, 24), k.main(), 0, 0.01, 0);
    k.add(cyl(0.008, 0.008, h * 0.62, 10), k.main(), 0, h * 0.31, 0);
    k.add(cyl(r, r, h * 0.38, 32, true), shade, 0, h - h * 0.19, 0, { cast: false });
  } else {
    k.add(cyl(0.05, 0.06, 0.02, 20), k.m('metal', '#caa55e'), 0, 0.01, 0);
    k.add(new THREE.SphereGeometry(0.11, 32, 20), k.main(), 0, 0.13, 0);
    k.add(cyl(0.01, 0.01, h * 0.4, 10), k.m('metal', '#caa55e'), 0, 0.24 + h * 0.2, 0);
    k.add(cyl(r * 0.7, r, h * 0.38, 32, true), shade, 0, h - h * 0.19, 0, { cast: false });
  }
  k.bulb(0, h - h * 0.24, 0, 1.2);
};

B.dresser = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 3, cols: 2, handle: k.v === 'basic' ? 'knob' : 'bar' });
  vase(k, w / 2 - 0.18, h, 0, 0.2, k.v === 'supreme' ? '#1f1f1f' : '#e5ded2');
  books(k, -w / 2 + 0.22, h, 0, 3, k.p.id);
};

B.wardrobe = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 1, cols: w > 1.3 ? 3 : 2, handle: 'vbar', crown: k.v !== 'basic', legH: k.v === 'luxury' ? 0.12 : 0.06 });
};

B.bench = (k, w, d, h) => {
  const v = k.v, main = k.main();
  if (v === 'basic') {
    legs4(k, w - 0.08, d - 0.08, h - 0.12, k.wood(), 'block');
    k.add(rbox(w, 0.12, d, 0.04), main, 0, h - 0.06, 0);
  } else if (v === 'luxury') {
    legs4(k, w - 0.08, d - 0.08, h - 0.14, k.metal(), 'round');
    k.add(rbox(w, 0.14, d, 0.06), main, 0, h - 0.07, 0);
  } else {
    for (const s of [-1, 1]) k.add(rbox(0.05, h - 0.12, d, 0.01), k.wood(), s * (w / 2 - 0.14), (h - 0.12) / 2, 0);
    k.add(rbox(w - 0.3, 0.04, 0.05, 0.01), k.wood(), 0, 0.12, 0);
    k.add(rbox(w, 0.12, d, 0.05), main, 0, h - 0.06, 0);
  }
};

B.desk = (k, w, d, h) => {
  const v = k.v, top = k.main();
  if (v === 'basic') {
    k.add(rbox(w, 0.025, d, 0.004), top, 0, h - 0.0125, 0);
    legs4(k, w - 0.08, d - 0.08, h - 0.025, k.dark(), 'round');
    monitor(k, 0, h, -d / 2 + 0.16);
  } else if (v === 'luxury') {
    k.add(rbox(w, 0.035, d, 0.01), top, 0, h - 0.0175, 0);
    legs4(k, w - 0.08, d - 0.08, h - 0.035, top, 'taper');
    k.add(rbox(w * 0.4, 0.08, 0.02, 0.004), top, 0, h - 0.075, d / 2 - 0.04);
    k.add(rbox(0.1, 0.012, 0.018, 0.004), k.metal(), 0, h - 0.075, d / 2 - 0.025);
    monitor(k, 0, h, -d / 2 + 0.18);
    books(k, -w / 2 + 0.2, h, -d / 2 + 0.15, 3, k.p.id);
  } else {
    k.add(rbox(w, 0.045, d, 0.012), top, 0, h - 0.0225, 0);
    k.add(rbox(w * 0.66, 0.004, d * 0.55, 0.002), k.m('leather', '#3b2a20'), 0, h + 0.002, 0.04);
    const pw = 0.42, ph = h - 0.045;
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - pw / 2 - 0.02);
      k.add(rbox(pw, ph, d - 0.04, 0.008), top, x, ph / 2, 0);
      for (let i = 0; i < 3; i++) {
        const y = ph - 0.03 - (ph / 3) * (i + 0.5) + 0.02;
        k.add(rbox(pw - 0.03, ph / 3 - 0.02, 0.015, 0.003), top, x, y, d / 2 - 0.012);
        k.add(rbox(0.12, 0.012, 0.018, 0.004), k.metal(), x, y + 0.05, d / 2 + 0.004);
      }
    }
    k.add(rbox(w - pw * 2 - 0.04, h * 0.5, 0.025, 0.006), top, 0, h - 0.045 - h * 0.25, -d / 2 + 0.03);
    laptop(k, 0, h, 0.06);
    vase(k, -w / 2 + 0.2, h, -d / 2 + 0.2, 0.16, '#1f1f1f');
  }
};

B.officeChair = (k, w, d, h) => {
  const v = k.v, fab = k.main();
  const frame = v === 'basic' ? k.dark() : k.m('metal', '#b9bcbf');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = k.add(rbox(0.3, 0.035, 0.05, 0.012), frame, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
    arm.rotation.y = -a;
    k.add(new THREE.SphereGeometry(0.026, 12, 8), k.dark(), Math.cos(a) * 0.29, 0.026, Math.sin(a) * 0.29);
  }
  const seatY = 0.47;
  k.add(cyl(0.025, 0.03, seatY - 0.09, 16), frame, 0, 0.07 + (seatY - 0.09) / 2, 0);
  k.add(rbox(w * 0.8, 0.08, d * 0.78, 0.035), fab, 0, seatY, 0.02);
  const backH = h - seatY - 0.1;
  const back = k.add(rbox(w * 0.74, backH, 0.07, 0.035), fab, 0, seatY + 0.08 + backH / 2, -d / 2 + 0.1);
  back.rotation.x = -0.1;
  k.add(rbox(0.06, 0.26, 0.03, 0.01), frame, 0, seatY + 0.06, -d / 2 + 0.06);
  for (const s of [-1, 1]) {
    k.add(rbox(0.03, 0.2, 0.03, 0.008), frame, s * w * 0.42, seatY + 0.12, 0);
    k.add(rbox(0.06, 0.025, 0.24, 0.01), k.dark(), s * w * 0.42, seatY + 0.23, 0.02);
  }
};

B.diningTable = (k, w, d, h) => {
  const v = k.v, top = k.main();
  if (k.o.shape === 'round') {
    const r = w / 2, pr = 0.19;
    k.add(cyl(r, r, 0.045, 64), top, 0, h - 0.0225, 0);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      k.add(cyl(0.032, 0.032, h - 0.1, 10), k.stone(), Math.cos(a) * pr, (h - 0.1) / 2 + 0.05, Math.sin(a) * pr);
    }
    k.add(cyl(pr + 0.04, pr + 0.04, 0.05, 40), k.stone(), 0, h - 0.07, 0);
    k.add(cyl(0.34, 0.36, 0.05, 48), k.stone(), 0, 0.025, 0);
    vase(k, 0, h, 0, 0.22, '#1f1f1f');
    return;
  }
  if (v === 'basic') {
    k.add(rbox(w, 0.03, d, 0.005), top, 0, h - 0.015, 0);
    legs4(k, w - 0.1, d - 0.1, h - 0.03, top, 'block');
  } else if (v === 'luxury') {
    k.add(rbox(w, 0.05, d, 0.012), top, 0, h - 0.025, 0);
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - 0.3);
      k.add(rbox(0.08, h - 0.1, d * 0.62, 0.015), top, x, (h - 0.1) / 2 + 0.05, 0);
      k.add(rbox(0.1, 0.05, d * 0.8, 0.015), top, x, 0.025, 0);
    }
    k.add(rbox(w - 0.6, 0.06, 0.05, 0.01), top, 0, 0.36, 0);
  } else {
    k.add(rbox(w, 0.05, d, 0.01), top, 0, h - 0.025, 0);
    for (const s of [-1, 1]) k.add(cyl(0.2, 0.27, h - 0.05, 40), k.stone(), s * w * 0.27, (h - 0.05) / 2, 0);
  }
  vase(k, -0.15, h, 0, 0.2, v === 'basic' ? '#e9e6df' : '#1f1f1f');
  bowl(k, 0.2, h, 0.02, 0.13, v === 'supreme' ? '#caa55e' : '#8a8f86');
};

B.diningChair = (k, w, d, h) => {
  const v = k.v, main = k.main(), seatH = 0.46;
  if (v === 'basic') {
    legs4(k, w - 0.06, d - 0.06, seatH - 0.03, main, 'round');
    k.add(rbox(w, 0.03, d, 0.008), main, 0, seatH - 0.015, 0);
    for (const s of [-1, 1]) k.add(cyl(0.015, 0.015, h - seatH, 10), main, s * (w / 2 - 0.03), seatH + (h - seatH) / 2, -d / 2 + 0.03);
    k.add(rbox(w, 0.1, 0.022, 0.008), main, 0, h - 0.05, -d / 2 + 0.03);
    k.add(rbox(w - 0.04, 0.04, 0.018, 0.006), main, 0, seatH + 0.14, -d / 2 + 0.03);
  } else if (v === 'luxury') {
    legs4(k, w - 0.06, d - 0.06, seatH - 0.08, k.wood(), 'taper');
    k.add(rbox(w, 0.08, d, 0.03), main, 0, seatH - 0.04, 0);
    const back = k.add(rbox(w - 0.02, h - seatH, 0.06, 0.03), main, 0, seatH + (h - seatH) / 2 - 0.02, -d / 2 + 0.035);
    back.rotation.x = -0.06;
  } else {
    legs4(k, w - 0.06, d - 0.06, seatH - 0.09, k.metal(), 'round');
    k.add(rbox(w, 0.09, d, 0.04), main, 0, seatH - 0.045, 0);
    const back = k.add(rbox(w - 0.02, h - seatH + 0.02, 0.08, 0.04), main, 0, seatH + (h - seatH) / 2 - 0.01, -d / 2 + 0.045);
    back.rotation.x = -0.07;
  }
};

B.sideboard = (k, w, d, h) => {
  const v = k.v;
  casePiece(k, w, d, h, { rows: 1, cols: w > 1.7 ? 4 : 3, handle: v === 'basic' ? 'knob' : 'vbar', topMat: k.o.top === 'stone' ? k.stone() : null });
  vase(k, -w / 2 + 0.22, h, 0, 0.26, v === 'basic' ? '#e9e6df' : '#1f1f1f');
  bowl(k, w * 0.05, h, 0, 0.14, v === 'supreme' ? '#caa55e' : '#8a8f86');
  books(k, w / 2 - 0.25, h, 0, 4, k.p.id);
};

B.tallCabinet = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 2, cols: 1, handle: 'vbar', glassTop: k.v === 'luxury', topMat: k.v === 'supreme' ? k.m('marble', '#ffffff') : null });
};

B.vanity = (k, w, d, h) => {
  const v = k.v;
  if (v === 'supreme') {
    const brass = k.m('metal', '#caa55e');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.016, 0.016, h - 0.05, 12), brass, sx * (w / 2 - 0.05), (h - 0.05) / 2, sz * (d / 2 - 0.05));
    k.add(rbox(w - 0.06, 0.03, d - 0.06, 0.005), k.main(), 0, 0.22, 0);
    k.add(rbox(w, 0.05, d, 0.008), k.main(), 0, h - 0.025, 0);
    for (let i = 0; i < 3; i++) {
      const towel = k.add(cyl(0.05, 0.05, 0.3, 20), k.m('fabric', '#f1ede5'), -0.25 + i * 0.13, 0.285, 0);
      towel.rotation.x = Math.PI / 2;
    }
    for (const s of [-1, 1]) {
      vesselSink(k, (s * w) / 4, h, 0.04, 0.2);
      faucet(k, (s * w) / 4, h, -d / 2 + 0.07, brass, 0.26);
    }
    return;
  }
  const top = v === 'luxury' ? k.m('marble', '#ffffff') : k.m('ceramic', '#f7f7f4');
  casePiece(k, w, d, h, { rows: 2, cols: v === 'luxury' ? 2 : 1, handle: 'bar', topMat: top, legH: v === 'luxury' ? 0.14 : 0.1 });
  if (v === 'luxury') {
    vesselSink(k, 0, h, 0.03, 0.2);
    faucet(k, 0, h, -d / 2 + 0.06, k.metal(), 0.26);
  } else {
    const basin = k.add(cyl(1, 1, 0.006, 40), k.m('ceramic', '#e4e4e1'), 0, h + 0.001, 0.02, { cast: false });
    basin.scale.set(w * 0.3, 1, d * 0.3);
    faucet(k, 0, h, -d / 2 + 0.06, k.m('metal', '#d2d4d6'), 0.16);
  }
};

function archShape(w, h, t = 0) {
  const s = new THREE.Shape();
  const r = w / 2 - t;
  s.moveTo(-r, t);
  s.lineTo(r, t);
  s.lineTo(r, h - w / 2);
  s.absarc(0, h - w / 2, r, 0, Math.PI, false);
  s.lineTo(-r, t);
  return s;
}

B.mirror = (k, w, d, h) => {
  const shape = k.o.shape, frame = k.main(), glass = k.m('mirror');
  if (shape === 'round') {
    const r = w / 2;
    const f = k.add(cyl(r, r, d, 64), frame, 0, r, 0);
    f.rotation.x = Math.PI / 2;
    k.add(new THREE.CircleGeometry(r - 0.02, 64), glass, 0, r, d / 2 + 0.001, { cast: false });
  } else if (shape === 'arch') {
    const f = k.add(new THREE.ExtrudeGeometry(archShape(w, h), { depth: d, bevelEnabled: false, curveSegments: 32 }), frame, 0, 0, -d / 2);
    f.castShadow = true;
    k.add(new THREE.ShapeGeometry(archShape(w, h, 0.022), 32), glass, 0, 0, d / 2 + 0.001, { cast: false });
  } else {
    k.add(rbox(w, h, d, 0.01), frame, 0, h / 2, 0);
    k.add(rbox(w - 0.1, h - 0.1, 0.006, 0.002), k.m('metal', '#8f7440'), 0, h / 2, d / 2);
    k.add(new THREE.PlaneGeometry(w - 0.13, h - 0.13), glass, 0, h / 2, d / 2 + 0.004, { cast: false });
  }
};

B.bathtub = (k, w, d, h) => {
  const shell = k.main();
  if (k.o.shape === 'oval') {
    const H = h;
    const prof = [[0, 0], [0.78, 0], [0.92, 0.3 * H], [0.985, 0.8 * H], [1, H - 0.012], [0.99, H], [0.94, H], [0.93, H - 0.02], [0.87, 0.55 * H], [0.72, 0.09], [0, 0.08]];
    const tub = k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a, b)), 56), shell);
    tub.scale.set(w / 2, 1, d / 2);
    tub.material.side = THREE.DoubleSide;
    if (k.v === 'supreme') {
      const brass = k.m('metal', '#caa55e');
      const x = w / 2 - 0.06, z = d / 2 - 0.05;
      k.add(cyl(0.02, 0.02, h + 0.3, 12), brass, x, (h + 0.3) / 2, z);
      rod(k, V3(x, h + 0.3, z), V3(x - 0.2, h + 0.3, z - 0.05), 0.014, brass);
      k.add(cyl(0.05, 0.05, 0.02, 16), brass, x, 0.01, z);
    }
    return;
  }
  const t = 0.07;
  k.add(rbox(w, 0.08, d, 0.02), shell, 0, 0.04, 0);
  for (const s of [-1, 1]) {
    k.add(rbox(w, h, t, 0.03), shell, 0, h / 2, s * (d / 2 - t / 2));
    k.add(rbox(t, h, d, 0.03), shell, s * (w / 2 - t / 2), h / 2, 0);
  }
  faucet(k, -w / 2 + 0.04, h, 0, k.m('metal', '#d2d4d6'), 0.12);
};

B.toilet = (k, w, d, h) => {
  const c = k.main();
  if (k.o.wallHung) {
    k.add(rbox(w, 0.28, d - 0.04, 0.12), c, 0, h - 0.14, 0.02);
    k.add(rbox(w + 0.004, 0.022, d - 0.08, 0.1), c, 0, h + 0.01, 0.04);
    k.add(rbox(0.24, 0.16, 0.012, 0.01), k.m('metal', '#caa55e'), 0, h + 0.55, -d / 2 + 0.006);
    return;
  }
  const tankH = k.v === 'luxury' ? 0.3 : 0.38, tankD = 0.18;
  const base = k.add(cyl(0.12, 0.14, 0.3, 32), c, 0, 0.15, 0.04);
  base.scale.z = 1.35;
  const bowlM = k.add(cyl(0.19, 0.14, 0.14, 32), c, 0, 0.33, 0.1);
  bowlM.scale.z = 1.3;
  const seat = k.add(new THREE.TorusGeometry(0.15, 0.025, 12, 40), c, 0, 0.41, 0.11);
  seat.scale.set(1, 1.3, 1);
  seat.rotation.x = Math.PI / 2;
  k.add(rbox(w * 0.95, tankH, tankD, 0.03), c, 0, 0.4 + tankH / 2, -d / 2 + tankD / 2);
  k.add(cyl(0.02, 0.02, 0.01, 16), k.m('metal', '#d2d4d6'), 0, 0.4 + tankH + 0.005, -d / 2 + tankD / 2);
};

B.towelRack = (k, w, d, h) => {
  const m = k.main();
  const bot = d / 2 - 0.03, topZ = -d / 2 + 0.02;
  for (const s of [-1, 1]) rod(k, V3(s * (w / 2 - 0.02), 0, bot), V3(s * (w / 2 - 0.02), h, topZ), 0.015, m);
  const n = 5;
  const at = (t) => V3(0, h * t, bot + (topZ - bot) * t);
  for (let i = 1; i <= n; i++) {
    const p = at(i / (n + 0.6));
    const rung = k.add(cyl(0.011, 0.011, w - 0.04, 10), m, p.x, p.y, p.z);
    rung.rotation.z = Math.PI / 2;
  }
  const t1 = at(3 / (n + 0.6)), t2 = at(5 / (n + 0.6));
  k.add(rbox(w * 0.72, 0.36, 0.025, 0.01), k.m('fabric', '#f1ede5'), 0, t1.y - 0.17, t1.z + 0.02);
  k.add(rbox(w * 0.6, 0.3, 0.025, 0.01), k.m('fabric', k.T.accent), 0, t2.y - 0.14, t2.z + 0.02);
};

export function buildModel(product, finishIndex = 0, opts = {}) {
  const k = new Kit(product, finishIndex);
  const [w, d, h] = product.dims.map((v) => v / 100);
  B[product.model.kind](k, w, d, h, opts);
  k.g.userData.mats = k.mats;
  k.g.userData.lights = k.lights;
  return k.g;
}
