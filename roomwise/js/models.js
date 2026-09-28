// Procedural 3D furniture at real catalog sizes (metres). Origin at the centre of the footprint
// on the floor, front facing +z. Ceiling pieces hang down from their origin.
// Upholstery uses soft, stuffed shapes; fabrics, leather and wood carry real surface texture.
// Furniture is "dressed": pillows, throws and bedding (sold as accessories) plus styling props.
import * as THREE from 'three';
import { TIER_KIT } from './catalog.js';
import { woodGrain, marble, rugTexture, artTexture, fabricNormal } from './textures.js';
import { softBox, boxUV, leafGeo, makeNoise, clothPathGeo } from './geometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as D from './decor.js';
import { rng } from './util.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const V2 = (x, y) => new THREE.Vector2(x, y);
const UP = V3(0, 1, 0);
const WHITE = new THREE.Color('#ffffff');
const cyl = (rt, rb, h, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

function withNormal(kind, scale) {
  const t = fabricNormal(kind);
  return t ? { normalMap: t, normalScale: V2(scale, scale) } : {};
}

function makeMaterial(kind, color, extra = {}) {
  const c = new THREE.Color(color);
  const P = (o) => new THREE.MeshPhysicalMaterial(o);
  const S = (o) => new THREE.MeshStandardMaterial(o);
  switch (kind) {
    case 'fabric': return P({ color: c, roughness: 0.95, sheen: 0.45, sheenRoughness: 0.8, sheenColor: c.clone().lerp(WHITE, 0.35), ...withNormal('linen', 0.5) });
    case 'linen': return P({ color: c, roughness: 0.93, sheen: 0.35, sheenRoughness: 0.8, sheenColor: c.clone().lerp(WHITE, 0.4), ...withNormal('linen', 0.7) });
    case 'velvet': return P({ color: c, roughness: 0.72, sheen: 1, sheenRoughness: 0.3, sheenColor: c.clone().offsetHSL(0, -0.05, 0.22), ...withNormal('velvet', 0.3) });
    case 'boucle': return P({ color: c, roughness: 1, sheen: 0.8, sheenRoughness: 0.9, sheenColor: WHITE.clone(), ...withNormal('boucle', 1.1) });
    case 'knit': return P({ color: c, roughness: 1, sheen: 0.6, sheenRoughness: 0.8, sheenColor: c.clone().lerp(WHITE, 0.4), ...withNormal('knit', 1.5) });
    case 'terry': return P({ color: c, roughness: 1, sheen: 0.5, sheenRoughness: 0.9, sheenColor: WHITE.clone(), ...withNormal('wool', 1.3) });
    case 'jute': return S({ color: c, roughness: 1, ...withNormal('jute', 1.4) });
    case 'leather': return P({ color: c, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.55, ...withNormal('leather', 0.45) });
    case 'wood': return S({ color: c, map: woodGrain(), roughness: 0.55 });
    case 'laminate': return S({ color: c, roughness: 0.42, map: c.getHSL({}).s > 0.15 ? woodGrain() : null });
    case 'lacquer': return P({ color: c, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
    case 'marble': return P({ color: c, map: marble(), roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.15 });
    case 'stone': return S({ color: c, map: marble(), roughness: 0.8, ...withNormal('plaster', 0.5) });
    case 'ceramic': return P({ color: c, roughness: 0.25, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    case 'matteCeramic': return S({ color: c, roughness: 0.78, ...withNormal('plaster', 0.35) });
    case 'metal': return S({ color: c, metalness: 1, roughness: 0.28 });
    case 'blackMetal': return S({ color: c, metalness: 0.6, roughness: 0.45 });
    case 'paint': return S({ color: c, roughness: 0.5, metalness: 0.05 });
    case 'glass': return P({ color: WHITE.clone(), roughness: 0.03, transmission: 1, thickness: 0.004, ior: 1.5, metalness: 0 });
    case 'mirror': return S({ color: new THREE.Color('#e7edef'), metalness: 1, roughness: 0.02 });
    case 'screen': return P({ color: new THREE.Color('#0b0c0e'), roughness: 0.12, clearcoat: 1 });
    case 'shade': return P({ color: c, roughness: 0.95, side: THREE.DoubleSide, emissive: new THREE.Color('#ffcf8a'), emissiveIntensity: 0, userData: { glow: 0.55 }, ...withNormal('linen', 0.4) });
    case 'paper': return S({ color: c, roughness: 1, side: THREE.DoubleSide, emissive: new THREE.Color('#ffd49a'), emissiveIntensity: 0, userData: { glow: 0.9 } });
    case 'glow': return S({ color: c, roughness: 1, side: THREE.BackSide, emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: 0, userData: { glow: 1.3 } });
    case 'bulb': return S({ color: new THREE.Color('#fff3dc'), emissive: new THREE.Color('#fff0d0'), emissiveIntensity: 0.2, userData: { glow: 2.5, base: 0.2 } });
    case 'alabaster': return P({ color: c, roughness: 0.35, clearcoat: 0.4, emissive: c.clone(), emissiveIntensity: 0, userData: { glow: 0.35 } });
    case 'leaf': return S({ color: c, roughness: 0.55, side: THREE.DoubleSide });
    case 'foliage': return S({ color: c, roughness: 0.85, flatShading: true });
    case 'soil': return S({ color: c, roughness: 1 });
    case 'rug': return S({ color: WHITE.clone(), map: extra.map, roughness: 1, ...extra.normal });
    case 'art': return S({ color: WHITE.clone(), map: extra.map, roughness: 0.85 });
    default: return S({ color: c, roughness: 0.6 });
  }
}

const REAL_METAL = /brass|bronze|nickel|polish|antiqu|burnish|chrome|steel|alumin/i;

class Kit {
  constructor(product, finishIndex, opts) {
    this.p = product;
    this.o = product.model;
    this.v = product.model.v;
    this.T = TIER_KIT[product.tier];
    this.finish = product.finishes[finishIndex] ?? product.finishes[0];
    this.opts = opts;
    this.style = opts.style;
    this.g = new THREE.Group();
    this.mats = [];
    this.lights = [];
    this.memo = new Map();
    this.anchors = {};
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
    if (kind === 'metal') return REAL_METAL.test(this.finish.name) ? this.m('metal', this.finish.color) : this.m('blackMetal', this.finish.color);
    return this.m(kind, this.finish.color);
  }
  wood(c = this.T.wood) { return this.m('wood', c); }
  metal() { return this.T.metalKind === 'brass' ? this.m('metal', this.T.metal) : this.m('blackMetal', this.T.metal); }
  dark() { return this.m('blackMetal', '#232323'); }
  stone() { return this.m('stone', this.T.stone); }
  add(geo, mat, x = 0, y = 0, z = 0, { cast = true, parent = this.g } = {}) {
    if (!geo.userData.metreUV && geo.attributes.normal) boxUV(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  soft(w, h, d, mat, x, y, z, o = {}) {
    return this.add(softBox(w, h, d, { seed: this.p.id.length + x * 7 + z * 3, ...o }), mat, x, y, z);
  }
  rod(a, b, r, mat) {
    const m = this.add(cyl(r, r, a.distanceTo(b), 10), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
    return m;
  }
  bulb(x, y, z, intensity = 3, mesh = true) {
    if (mesh) this.add(new THREE.SphereGeometry(0.022, 12, 8), this.m('bulb'), x, y, z, { cast: false });
    const light = new THREE.PointLight(this.style?.lampWarmth ?? '#ffd7a8', 0, 5, 2);
    light.userData.on = intensity;
    light.position.set(x, y, z);
    this.g.add(light);
    this.lights.push(light);
  }
}

function legs4(k, spanW, spanD, h, mat, style = 'block', y0 = 0) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const geo = style === 'taper' ? cyl(0.022, 0.012, h, 14) : style === 'round' ? cyl(0.016, 0.016, h, 12) : style === 'splay' ? cyl(0.02, 0.013, h, 12) : softBox(0.045, h, 0.045, { r: 0.006, seg: 2 });
    const leg = k.add(geo, mat, (sx * spanW) / 2, y0 + h / 2, (sz * spanD) / 2);
    if (style === 'splay') leg.rotation.set(sz * 0.12, 0, -sx * 0.12);
  }
}

// ---- dressing helpers ------------------------------------------------------------------------
function pillowsOnSeat(k, { x0, x1, seatY, backZ, n }) {
  const dress = k.opts.dress?.pillows;
  if (!dress) return;
  const span = x1 - x0;
  const count = n ?? (span > 1.6 ? 4 : span > 1 ? 2 : 1);
  const spots = [];
  const placeEnd = (x, side, i, big) => spots.push({ x, y: seatY + (big ? 0.24 : 0.2), z: backZ + 0.12 + i * 0.04, size: big ? 0.5 : 0.42, rx: -0.3, ry: side * 0.25, rz: side * -0.06, fabric: i ? 'linen' : 'velvet' });
  if (count === 1) spots.push({ x: (x0 + x1) / 2, y: seatY + 0.22, z: backZ + 0.13, size: 0.44, rx: -0.3, ry: 0 });
  else {
    placeEnd(x0 + 0.26, 1, 0, true);
    placeEnd(x1 - 0.26, -1, 0, true);
    if (count >= 4) { placeEnd(x0 + 0.52, 1, 1, false); placeEnd(x1 - 0.52, -1, 1, false); }
  }
  const g = D.throwPillows(k, spots, dress.colors, { key: dress.key, seed: k.p.id });
  g.userData.fabric = dress.fabric;
}

function throwOnArm(k, { x, armTop, armW, seatY, depth }) {
  const dress = k.opts.dress?.throw;
  if (!dress) return;
  D.throwOverArm(k, { x, y: armTop, z: 0.05, armW, dropIn: armTop - seatY - 0.05, dropOut: armTop - 0.12, depth, color: dress.color, knit: dress.knit, key: dress.key, seed: k.p.id.length });
}

function props(k) { return k.style?.decor ?? { ceramic: '#d8d0c3', dark: '#2e2e2e', books: ['#8c3b2f', '#35425a', '#d6c9ad', '#5a6b4c'], vase: 'branch' }; }

// ---- builders --------------------------------------------------------------------------------
const B = {};

B.sofa = (k, w, d, h) => {
  const v = k.v, fab = k.main();
  const seats = k.o.seats ?? (w > 1.9 ? 3 : 2);
  const arm = k.o.arm ?? (v === 'supreme' ? 'wide' : v === 'luxury' ? 'slope' : 'track');
  const base = k.o.base ?? (v === 'supreme' ? 'plinth' : 'legs');
  const legH = base === 'plinth' ? 0.06 : k.o.legH ?? (v === 'luxury' ? 0.14 : 0.1);
  const armW = k.o.armW ?? (arm === 'wide' ? (seats === 1 ? 0.17 : 0.22) : arm === 'rolled' ? 0.17 : 0.13);
  const armH = k.o.armH ?? (arm === 'wide' ? 0.56 : 0.6);
  const seatTop = 0.45, baseTop = seatTop - 0.15;
  const r = arm === 'wide' ? 0.08 : arm === 'rolled' ? 0.09 : 0.035;
  if (base === 'plinth') k.soft(w - 0.14, legH, d - 0.14, seats === 1 ? k.metal() : k.stone(), 0, legH / 2, 0, { r: 0.01, seg: 2 });
  else legs4(k, w - 0.12, d - 0.12, legH, k.o.legs === 'metal' ? k.metal() : k.wood(), v === 'luxury' || k.o.legs === 'taper' ? 'taper' : 'block');
  k.soft(w, baseTop - legH, d, fab, 0, legH + (baseTop - legH) / 2, 0, { r: Math.min(r, 0.05), puff: { z: 0.01 } });
  const backD = arm === 'wide' ? 0.24 : 0.18;
  const tightBack = k.o.back === 'tight' || k.o.back === 'tufted';
  k.soft(w, h - legH, backD, fab, 0, legH + (h - legH) / 2, -d / 2 + backD / 2, { r, puff: { z: tightBack ? 0.03 : 0.01, y: 0.01 }, wrinkle: 0.002 });
  for (const s of [-1, 1]) k.soft(armW, armH - legH, d, fab, s * (w / 2 - armW / 2), legH + (armH - legH) / 2, 0, { r, puff: { y: arm === 'rolled' ? 0.025 : 0.008, x: 0.008 }, wrinkle: 0.0015 });
  const innerW = w - armW * 2, cd = d - backD - 0.01;
  const benchSeat = k.o.seat === 'bench';
  const nSeat = benchSeat ? 1 : seats;
  const cw = innerW / nSeat;
  for (let i = 0; i < nSeat; i++) {
    const x = -innerW / 2 + cw * (i + 0.5);
    k.soft(cw - 0.012, 0.16, cd, fab, x, baseTop + 0.08, -d / 2 + backD + cd / 2, { r: 0.05, puff: { y: 0.022, z: 0.012 }, wrinkle: 0.0035, seg: 10 });
  }
  if (!tightBack) {
    const bcw = innerW / seats;
    for (let i = 0; i < seats; i++) {
      const x = -innerW / 2 + bcw * (i + 0.5);
      const bh = h - seatTop - 0.02;
      const back = k.soft(bcw - 0.02, bh, 0.2, fab, x, seatTop + bh / 2 - 0.01, -d / 2 + backD + 0.07, { r: 0.07, puff: { z: 0.045, y: 0.012 }, wrinkle: 0.004, seg: 10 });
      back.rotation.x = -0.13;
    }
  } else if (k.o.back === 'tufted') {
    const btn = k.m(k.o.main, k.finish.color);
    for (let i = 0; i < Math.round(innerW / 0.22); i++) for (let j = 0; j < 2; j++) {
      k.add(new THREE.SphereGeometry(0.012, 10, 8), btn, -innerW / 2 + 0.11 + i * 0.22 + (j ? 0.11 : 0), seatTop + 0.12 + j * 0.13, -d / 2 + backD + 0.028);
    }
  }
  if (k.o.bolsters) for (const s of [-1, 1]) { const b = k.add(softBox(0.18, 0.18, 0.5, { r: 0.088, seg: 6 }), fab, s * (innerW / 2 - 0.1), seatTop + 0.1, 0.05); b.rotation.y = Math.PI / 2; }
  k.anchors = { seatY: seatTop + 0.02, backZ: -d / 2 + backD + 0.05, x0: -innerW / 2, x1: innerW / 2, armTop: armH, armW };
  pillowsOnSeat(k, { x0: -innerW / 2, x1: innerW / 2, seatY: seatTop + 0.02, backZ: -d / 2 + backD + 0.05, n: seats === 1 ? 1 : undefined });
  throwOnArm(k, { x: w / 2 - armW / 2, armTop: armH + 0.005, armW: armW + 0.02, seatY: seatTop + 0.03, depth: Math.min(0.6, d * 0.6) });
};
B.armchair = B.sofa;

// Barrel accent chair: curved wrap-around back, soft seat, short wooden legs.
B.accentChair = (k, w, d, h) => {
  const fab = k.main(), r = w / 2;
  legs4(k, w * 0.62, d * 0.62, 0.12, k.wood(), 'taper');
  const seatH = 0.42;
  const base = k.add(new THREE.CylinderGeometry(r * 0.94, r * 0.9, seatH - 0.12 - 0.12, 40), fab, 0, 0.12 + (seatH - 0.24) / 2, 0);
  base.scale.z = d / w;
  const prof = [[r - 0.09, 0], [r, 0], [r + 0.005, h - 0.12 - 0.05], [r - 0.03, h - 0.12], [r - 0.08, h - 0.13], [r - 0.09, h - 0.2], [r - 0.09, 0]];
  const back = k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a, b)), 48, Math.PI * 0.22, Math.PI * 1.56), fab, 0, 0.12, 0);
  back.scale.z = d / w;
  back.geometry.computeVertexNormals();
  const cush = k.soft(w * 0.78, 0.14, d * 0.72, fab, 0, seatH - 0.05, d * 0.06, { r: 0.06, puff: { y: 0.02 }, wrinkle: 0.003 });
  void cush;
  k.anchors = { seatY: seatH + 0.02, backZ: -d / 2 + 0.14, x0: -w * 0.3, x1: w * 0.3 };
  pillowsOnSeat(k, { x0: -w * 0.3, x1: w * 0.3, seatY: seatH + 0.02, backZ: -d / 2 + 0.12, n: 1 });
};

B.pouf = (k, w, d, h) => {
  const mat = k.main();
  const prof = [[0, 0], [w * 0.44, 0], [w * 0.5, h * 0.18], [w * 0.52, h * 0.5], [w * 0.5, h * 0.82], [w * 0.44, h], [0, h * 1.02]];
  const m = k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a, b)), 40), mat);
  m.scale.z = d / w;
};

B.coffeeTable = (k, w, d, h) => {
  const v = k.v, top = k.main(), P = props(k);
  const shape = k.o.shape ?? (v === 'supreme' ? 'round' : 'rect');
  if (shape === 'round' && k.o.main === 'wood') {
    // Round wooden top on four splayed legs (Amoeba).
    const r = w / 2;
    k.add(cyl(r, r - 0.01, 0.035, 64), top, 0, h - 0.0175, 0);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; k.rod(V3(Math.cos(a) * r * 0.62, 0, Math.sin(a) * r * 0.62), V3(Math.cos(a) * r * 0.5, h - 0.035, Math.sin(a) * r * 0.5), 0.02, top); }
  } else if (shape === 'round') {
    const r = w / 2;
    k.add(cyl(r, r, 0.04, 64), top, 0, h - 0.02, 0);
    k.add(cyl(r * 0.38, r * 0.42, h - 0.04, 48), k.stone(), 0, (h - 0.04) / 2, 0);
  } else if (shape === 'oval') {
    // Surfboard oval in solid wood with a lower shelf (Lenia).
    const oval = (sw, sd, t, y) => { const m = k.add(cyl(0.5, 0.5, t, 72), top, 0, y, 0); m.scale.set(sw, 1, sd); return m; };
    oval(w, d, 0.04, h - 0.02);
    oval(w * 0.86, d * 0.8, 0.025, 0.12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.rod(V3(sx * w * 0.3, 0, sz * d * 0.28), V3(sx * w * 0.28, h - 0.04, sz * d * 0.26), 0.018, top);
  } else if (v === 'luxury' || k.o.base === 'panel') {
    k.soft(w, 0.05, d, top, 0, h - 0.025, 0, { r: 0.02, seg: 3 });
    for (const s of [-1, 1]) k.soft(0.06, h - 0.05, d - 0.12, top, s * (w / 2 - 0.14), (h - 0.05) / 2, 0, { r: 0.02, seg: 3 });
    k.soft(w - 0.34, 0.03, 0.05, top, 0, 0.08, 0, { r: 0.01, seg: 2 });
  } else {
    k.soft(w, 0.035, d, top, 0, h - 0.0175, 0, { r: 0.006, seg: 2 });
    if (k.o.shelf !== false) k.soft(w - 0.1, 0.018, d - 0.1, top, 0, 0.14, 0, { r: 0.003, seg: 2 });
    legs4(k, w - 0.06, d - 0.06, h - 0.035, top, 'block');
  }
  // styling: tray with a candle and a small vase, stacked books, a bowl
  const tx = -w * 0.18;
  const ty = D.tray(k, tx, h, 0, { w: 0.36, d: 0.24, color: P.dark });
  D.candle(k, tx - 0.08, ty, 0.02, { color: '#f1ece3' });
  D.vase(k, tx + 0.07, ty, -0.02, { size: 0.12, color: P.ceramic, fill: P.vase === 'flowers' ? 'flowers' : 'branch', flowerColor: P.flowers ?? '#ffffff', seed: k.p.id });
  const by = D.bookStack(k, w * 0.2, h, 0.02, 2, P.books, k.p.id, 0.2);
  D.bowl(k, w * 0.2, by, 0.02, { r: 0.07, color: P.dark });
};

B.sideTable = (k, w, d, h) => {
  const v = k.v, r = w / 2, m = k.main(), P = props(k);
  if (v === 'basic') {
    k.add(cyl(r, r, 0.02, 40), m, 0, h - 0.01, 0);
    k.add(cyl(0.014, 0.014, h - 0.03, 10), m, 0, (h - 0.03) / 2 + 0.01, 0);
    k.add(cyl(r * 0.7, r * 0.72, 0.015, 32), m, 0, 0.0075, 0);
  } else if (v === 'luxury') k.add(cyl(r, r * 0.95, h, 40), m, 0, h / 2, 0);
  else { k.add(cyl(r * 0.5, r, h / 2, 40), m, 0, h / 4, 0); k.add(cyl(r, r * 0.5, h / 2, 40), m, 0, (h * 3) / 4, 0); }
  D.bookStack(k, -0.03, h, 0.02, 2, P.books, `${k.p.id}s`);
  D.mug(k, 0.1, h, -0.06);
};

B.rug = (k, w, d, h) => {
  const pattern = k.opts.rugPattern ?? k.o.pattern;
  const map = rugTexture(pattern, k.finish.color, w, d);
  const nrm = fabricNormal(pattern === 'jute' ? 'jute' : 'wool').clone();
  nrm.repeat.set(w / 0.08, d / 0.08);
  nrm.needsUpdate = true;
  const t = Math.max(h, 0.01);
  const geo = new THREE.BoxGeometry(w, t, d, 1, 1, 1);
  geo.userData.metreUV = true;
  k.add(geo, k.m('rug', k.finish.color, { map, normal: { normalMap: nrm, normalScale: V2(0.8, 0.8) } }), 0, t / 2, 0, { cast: false });
  if (pattern === 'medallion' || pattern === 'beni') {
    const fr = k.m('fabric', '#e8dfcc');
    for (const s of [-1, 1]) for (let i = 0; i < Math.round(d / 0.03); i++) {
      k.add(new THREE.BoxGeometry(0.06, 0.004, 0.008), fr, s * (w / 2 + 0.03), 0.002, -d / 2 + 0.015 + i * 0.03, { cast: false });
    }
  }
};
B.bathMat = (k, w, d, h) => {
  k.soft(w, Math.max(0.012, h), d, k.m('terry', k.finish.color), 0, 0.006, 0, { r: 0.006, seg: 4, wrinkle: 0.002 });
};

// Drawers and doors on a box: dressers, sideboards, media units, wardrobes, cabinets.
function casePiece(k, w, d, h, { rows = 1, cols = 1, handle = 'bar', legH = null, topMat = null, crown = false, glassTop = false } = {}) {
  const v = k.v, body = k.main();
  const lh = legH ?? (v === 'basic' ? 0.06 : v === 'luxury' ? 0.15 : 0.07);
  if (v === 'luxury') legs4(k, w - 0.08, d - 0.08, lh, k.wood(), 'taper');
  else k.soft(w - 0.06, lh, d - 0.06, v === 'supreme' ? k.metal() : body, 0, lh / 2, 0, { r: 0.004, seg: 2 });
  const topT = topMat ? 0.03 : 0;
  const bh = h - lh - topT - (crown ? 0.04 : 0);
  k.soft(w, bh, d, body, 0, lh + bh / 2, 0, { r: 0.006, seg: 2 });
  if (topMat) k.soft(w + 0.012, topT, d + 0.012, topMat, 0, h - topT / 2, 0, { r: 0.004, seg: 2 });
  if (crown) k.soft(w + 0.04, 0.04, d + 0.03, body, 0, h - 0.02, 0, { r: 0.006, seg: 2 });
  const inset = 0.012, gap = 0.006;
  const fw = (w - inset * 2) / cols, fh = (bh - inset * 2) / rows;
  const metal = v === 'basic' ? k.dark() : k.metal();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + inset + fw * (c + 0.5);
      const y = lh + inset + fh * (r + 0.5);
      const glass = glassTop && r === rows - 1;
      k.soft(fw - gap, fh - gap, 0.016, glass ? k.m('glass') : body, x, y, d / 2 + 0.006, { r: 0.003, seg: 2 });
      if (handle === 'bar') k.soft(Math.min(0.16, fw * 0.4), 0.014, 0.02, metal, x, y + fh * 0.18, d / 2 + 0.022, { r: 0.005, seg: 2 });
      else if (handle === 'knob') k.add(new THREE.SphereGeometry(0.014, 12, 8), metal, x, y + fh * 0.18, d / 2 + 0.024);
      else if (handle === 'vbar') {
        const side = cols === 1 ? 1 : c % 2 === 0 ? 1 : -1;
        k.soft(0.014, Math.min(0.32, fh * 0.35), 0.02, metal, x + side * (fw / 2 - 0.04), y, d / 2 + 0.022, { r: 0.005, seg: 2 });
      }
    }
    if (v === 'supreme') for (let c = 1; c < cols; c++) k.add(new THREE.BoxGeometry(0.005, bh - 0.02, 0.004), k.metal(), -w / 2 + inset + fw * c, lh + bh / 2, d / 2 + 0.016);
  }
}

function topStyling(k, w, h, { lamp = false, mirror = false } = {}) {
  const P = props(k);
  D.vase(k, -w / 2 + 0.2, h, 0, { size: 0.22, color: P.ceramic, fill: P.vase, flowerColor: P.flowers ?? '#fff', seed: `${k.p.id}v` });
  const y = D.bookStack(k, w / 2 - 0.25, h, 0.02, 3, P.books, `${k.p.id}b`);
  D.bowl(k, w / 2 - 0.25, y, 0.02, { r: 0.06, color: P.dark });
  if (w > 1.1) D.frame(k, 0.05, h, -0.05, { seed: k.p.id, color: P.dark });
  void lamp; void mirror;
}

B.mediaUnit = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 1, cols: w > 1.7 ? 4 : 3, handle: k.v === 'supreme' ? 'none' : 'vbar' });
  const tw = Math.min(1.23, w * 0.72), th = tw * 0.575;
  k.soft(0.32, 0.014, 0.2, k.dark(), 0, h + 0.007, 0, { r: 0.004, seg: 2 });
  k.soft(0.05, 0.08, 0.03, k.dark(), 0, h + 0.05, -0.02, { r: 0.005, seg: 2 });
  k.soft(tw, th, 0.03, k.dark(), 0, h + 0.08 + th / 2, -0.02, { r: 0.005, seg: 2 });
  k.add(new THREE.PlaneGeometry(tw - 0.012, th - 0.012), k.m('screen'), 0, h + 0.08 + th / 2, -0.0045, { cast: false });
  const P = props(k);
  D.vase(k, w / 2 - 0.16, h, 0, { size: 0.16, color: P.ceramic, fill: 'branch', seed: `${k.p.id}m` });
  D.bookStack(k, -w / 2 + 0.2, h, 0, 2, P.books, `${k.p.id}m`);
};

B.floorLamp = (k, w, d, h) => {
  const v = k.v, shade = k.m('shade', k.style?.textiles?.sheet ?? '#efe9df');
  const kind = k.o.lamp ?? (v === 'supreme' ? 'arc' : v === 'luxury' ? 'tripod' : 'stem');
  if (kind === 'stem') {
    const m = k.main();
    k.add(cyl(0.13, 0.14, 0.025, 32), m, 0, 0.0125, 0);
    k.add(cyl(0.011, 0.011, h - 0.28, 12), m, 0, (h - 0.28) / 2, 0);
    k.add(cyl(0.15, 0.18, 0.3, 40, true), shade, 0, h - 0.15, 0, { cast: false });
    k.bulb(0, h - 0.2, 0, 3);
  } else if (kind === 'tripod') {
    const top = h - 0.34, spread = w / 2 - 0.03;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      k.rod(V3(Math.cos(a) * spread, 0, Math.sin(a) * spread), V3(0, top, 0), 0.014, k.main());
    }
    k.add(cyl(0.012, 0.012, 0.2, 10), k.metal(), 0, top + 0.1, 0);
    k.add(cyl(0.24, 0.24, 0.32, 48, true), shade, 0, h - 0.16, 0, { cast: false });
    k.bulb(0, h - 0.2, 0, 3.5);
  } else {
    const reach = k.o.reach ?? 1, arc = k.main();
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
  const potH = leaf === 'olive' ? 0.42 : leaf === 'fig' || leaf === 'monstera' ? 0.36 : 0.26;
  const rTop = w * (leaf === 'olive' ? 0.4 : 0.36), rBot = rTop * 0.8;
  if (leaf === 'olive') k.soft(rTop * 2, potH, rTop * 2, k.main(), 0, potH / 2, 0, { r: 0.03, seg: 3 });
  else {
    const prof = [[0, 0], [rBot, 0], [rTop, potH], [rTop - 0.012, potH], [rBot - 0.012, 0.012], [0, 0.012]];
    k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a, b)), 40), k.main(), 0, 0, 0).material.side = THREE.DoubleSide;
  }
  k.add(cyl(rTop * 0.92, rTop * 0.92, 0.01, 32), k.m('soil', '#3b2a1e'), 0, potH - 0.025, 0);
  const g1 = k.m('leaf', '#46633a'), g2 = k.m('leaf', '#5f8046'), g3 = k.m('leaf', '#35502f');
  const stemMat = k.m('paint', '#5a4632');
  if (leaf === 'snake') {
    for (let i = 0; i < 13; i++) {
      const lh = (h - potH) * (0.55 + rand() * 0.45);
      const m = k.add(leafGeo(lh, 0.07, { kind: 'oval', bend: 0.05 }), rand() < 0.5 ? g1 : g3, (rand() - 0.5) * rTop, potH - 0.02, (rand() - 0.5) * rTop);
      m.rotation.set(0, rand() * Math.PI * 2, Math.PI / 2 - (rand() - 0.5) * 0.25);
    }
  } else if (leaf === 'fig' || leaf === 'monstera') {
    const stemH = h - potH - 0.05;
    const mono = leaf === 'monstera';
    if (!mono) k.add(cyl(0.012, 0.018, stemH, 8), stemMat, 0, potH + stemH / 2, 0);
    const n = mono ? 11 : 32;
    for (let i = 0; i < n; i++) {
      const t = mono ? 0.3 + rand() * 0.7 : 0.3 + (i / n) * 0.7;
      const a = i * 2.4 + rand();
      const y = potH + stemH * t;
      const rr = mono ? 0.08 + rand() * 0.18 : 0.05 + (1 - t) * 0.1 + rand() * 0.04;
      if (mono) k.rod(V3(0, potH, 0), V3(Math.cos(a) * rr, y, Math.sin(a) * rr), 0.006, k.m('leaf', '#4f6b3a'));
      const L = mono ? 0.32 + rand() * 0.12 : 0.22 + rand() * 0.06;
      const m = k.add(leafGeo(L, mono ? L * 0.85 : L * 0.62, { kind: mono ? 'monstera' : 'fig', seed: i, bend: 0.25 }), rand() < 0.5 ? g1 : g2, Math.cos(a) * rr, y, Math.sin(a) * rr);
      m.rotation.order = 'YXZ';
      m.rotation.set(-0.3 - rand() * 0.4, -a, 0.2);
    }
  } else {
    const trunkH = h * 0.5, brown = k.m('paint', '#6b5a48');
    k.rod(V3(0, potH - 0.05, 0), V3(0.05, potH + trunkH * 0.6, 0.02), 0.035, brown);
    k.rod(V3(0.05, potH + trunkH * 0.6, 0.02), V3(-0.02, potH + trunkH, 0), 0.028, brown);
    const f1 = k.m('leaf', '#7d8a5a'), f2 = k.m('leaf', '#98a26f');
    for (let i = 0; i < 180; i++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * w * 0.38;
      const y = potH + trunkH + rand() * (h - potH - trunkH - 0.08);
      const m = k.add(leafGeo(0.07, 0.016, { kind: 'oval', bend: 0.1 }), rand() < 0.5 ? f1 : f2, Math.cos(a) * rr, y, Math.sin(a) * rr, { cast: i % 3 === 0 });
      m.rotation.set(rand() * 3, rand() * 6, rand() * 3);
    }
  }
};

B.bookcase = (k, w, d, h) => {
  const t = 0.025, mat = k.main(), P = props(k);
  const levels = [];
  let gapH;
  if (k.o.frame === 'etagere') {
    const brass = k.metal();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.012, 0.012, h, 10), brass, sx * (w / 2 - 0.015), h / 2, sz * (d / 2 - 0.015));
    const n = 5;
    gapH = (h - 0.12) / (n - 1);
    for (let i = 0; i < n; i++) { const y = 0.08 + i * gapH; k.soft(w - 0.01, 0.03, d - 0.01, mat, 0, y, 0, { r: 0.005, seg: 2 }); if (i < n - 1) levels.push(y + 0.015); }
  } else {
    for (const s of [-1, 1]) k.soft(t, h, d, mat, s * (w / 2 - t / 2), h / 2, 0, { r: 0.003, seg: 2 });
    k.soft(w, t, d, mat, 0, h - t / 2, 0, { r: 0.003, seg: 2 });
    k.soft(w, 0.08, d, mat, 0, 0.04, 0, { r: 0.003, seg: 2 });
    k.add(new THREE.BoxGeometry(w - 2 * t, h - 0.1, 0.008), mat, 0, h / 2 + 0.02, -d / 2 + 0.004);
    const n = Math.max(3, Math.round((h - 0.1) / 0.37));
    gapH = (h - 0.08 - t) / n;
    levels.push(0.08);
    for (let i = 1; i < n; i++) { const y = 0.08 + i * gapH; k.add(new THREE.BoxGeometry(w - 2 * t, 0.02, d - 0.01), mat, 0, y, 0.004); levels.push(y + 0.01); }
  }
  const rand = rng(k.p.id);
  levels.forEach((y, i) => {
    const kind = i === 0 ? 'basket' : rand();
    if (kind === 'basket' && d > 0.26) { D.basket(k, -w / 4, y, 0, { r: Math.min(0.13, d / 2 - 0.02), h: Math.min(0.22, gapH - 0.06), color: '#b99a70' }); D.basket(k, w / 4, y, 0, { r: Math.min(0.13, d / 2 - 0.02), h: Math.min(0.22, gapH - 0.06), color: '#b99a70' }); return; }
    if (kind < 0.55) { D.bookRow(k, -w / 2 + 0.05, w / 2 - 0.2, y, 0, d, gapH, P.books, `${k.p.id}${i}`); D.vase(k, w / 2 - 0.12, y, 0, { size: 0.14, color: P.ceramic, fill: 'none', seed: `${i}` }); }
    else if (kind < 0.8) { D.bookStack(k, -w / 4, y, 0, 3, P.books, `${k.p.id}${i}`); D.plantSmall(k, w / 4, y, 0, { kind: 'trailing', potColor: P.ceramic, seed: `${i}` }); }
    else { D.frame(k, -w / 5, y, 0, { seed: `${k.p.id}${i}`, color: P.dark }); D.bowl(k, w / 5, y, 0, { r: 0.08, color: P.ceramic }); }
  });
};

B.wallArt = (k, w, d, h) => {
  const v = k.v;
  const frame = v === 'basic' ? k.m('paint', '#262626') : v === 'luxury' ? k.m('wood', '#b58a5a') : k.m('metal', '#c4a060');
  const fw = v === 'basic' ? 0.02 : v === 'luxury' ? 0.025 : 0.07;
  k.soft(w, fw, d, frame, 0, h - fw / 2, 0, { r: fw * 0.4, seg: 2 });
  k.soft(w, fw, d, frame, 0, fw / 2, 0, { r: fw * 0.4, seg: 2 });
  for (const s of [-1, 1]) k.soft(fw, h, d, frame, s * (w / 2 - fw / 2), h / 2, 0, { r: fw * 0.4, seg: 2 });
  k.add(new THREE.BoxGeometry(w - 2 * fw, h - 2 * fw, d * 0.6), k.m('paint', '#f1ede5'), 0, h / 2, -d * 0.2);
  const pad = v === 'supreme' ? 0 : 0.045;
  const aw = w - 2 * fw - 2 * pad, ah = h - 2 * fw - 2 * pad;
  const artStyle = k.opts.artStyle ?? k.o.art;
  const map = artTexture(artStyle, k.finish.color, k.finish.name, aw, ah);
  const plane = new THREE.PlaneGeometry(aw, ah);
  plane.userData.metreUV = true;
  k.add(plane, k.m('art', k.finish.color, { map }), 0, h / 2, d * 0.1 + 0.001, { cast: false });
};

B.ceilingLight = (k, w, d, h, opts = {}) => {
  const v = k.v, drop = opts.drop ?? h, r = w / 2;
  const kind = k.o.light ?? (v === 'supreme' ? 'chandelier' : v === 'luxury' ? 'dome' : 'lantern');
  const cordMat = k.m('paint', kind === 'lantern' ? '#eeeeee' : '#2a2a2a');
  if (kind === 'woven' || kind === 'saucer') {
    // Woven bamboo/rattan shade (MISTERHULT, Suru) or a Nelson Saucer bubble lamp.
    const saucer = kind === 'saucer', sy = saucer ? 0.55 : 0.8, ry = r * sy;
    const cord = Math.max(0.05, drop - 2 * ry);
    k.add(cyl(0.004, 0.004, cord, 6), cordMat, 0, -cord / 2, 0);
    const cy = -cord - ry;
    const shell = k.add(new THREE.SphereGeometry(r, 48, 24), saucer ? k.m('paper', '#f6f2ea') : k.main(), 0, cy, 0, { cast: !saucer });
    shell.scale.y = sy; shell.material.side = THREE.DoubleSide;
    if (saucer) for (let i = 1; i < 16; i++) k.add(new THREE.TorusGeometry(r * Math.sin((i / 16) * Math.PI) + 0.001, 0.0012, 4, 48), k.m('paint', '#e9e1d2'), 0, cy + ry * Math.cos((i / 16) * Math.PI), 0).rotation.x = Math.PI / 2;
    else {
      k.add(new THREE.SphereGeometry(r * 0.97, 32, 16), k.m('glow'), 0, cy, 0, { cast: false }).scale.y = sy * 0.97;
      for (let i = 0; i < 18; i++) k.add(new THREE.TorusGeometry(r * 1.002, 0.004, 4, 48, Math.PI), k.m('wood', '#b08d5e'), 0, cy, 0).rotation.set(0, (i / 18) * Math.PI, 0);
    }
    k.bulb(0, cy, 0, 5, false);
    return;
  }
  if (kind === 'lantern') {
    const cord = Math.max(0.05, drop - 2 * r);
    k.add(cyl(0.004, 0.004, cord, 6), cordMat, 0, -cord / 2, 0);
    const lantern = k.add(new THREE.SphereGeometry(r, 48, 24), k.main(), 0, -cord - r, 0, { cast: false });
    for (let i = 1; i < 12; i++) k.add(new THREE.TorusGeometry(r * Math.sin((i / 12) * Math.PI) + 0.001, 0.0015, 4, 48), k.m('paint', '#e9e1d2'), 0, -cord - r + r * Math.cos((i / 12) * Math.PI), 0).rotation.x = Math.PI / 2;
    void lantern;
    k.bulb(0, -cord - r, 0, 5, false);
  } else if (kind === 'dome') {
    const shadeH = r * 0.9, cord = Math.max(0.05, drop - shadeH);
    k.add(cyl(0.06, 0.06, 0.02, 24), k.main(), 0, -0.01, 0);
    k.add(cyl(0.004, 0.004, cord, 6), cordMat, 0, -cord / 2, 0);
    const dome = k.add(new THREE.SphereGeometry(r, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.main(), 0, -drop, 0);
    dome.scale.y = 0.9;
    dome.material.side = THREE.DoubleSide;
    const inner = k.add(new THREE.SphereGeometry(r * 0.98, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.m('glow'), 0, -drop + 0.001, 0, { cast: false });
    inner.scale.y = 0.88;
    k.bulb(0, -drop + 0.06, 0, 5);
  } else {
    const brass = k.main(), cy = -drop + 0.22;
    k.add(cyl(0.08, 0.08, 0.025, 24), brass, 0, -0.0125, 0);
    k.add(cyl(0.01, 0.01, -cy - 0.1, 8), brass, 0, (cy + 0.1) / 2, 0);
    k.add(cyl(0.03, 0.055, 0.42, 16), brass, 0, cy + 0.02, 0);
    for (const [rr, n, dy] of [[r * 0.88, 8, 0], [r * 0.5, 4, 0.28]]) {
      k.add(new THREE.TorusGeometry(rr, 0.012, 8, 64), brass, 0, cy + dy, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + dy, px = Math.cos(a) * rr, pz = Math.sin(a) * rr;
        k.rod(V3(0, cy + dy + 0.05, 0), V3(px, cy + dy, pz), 0.007, brass);
        k.add(cyl(0.032, 0.02, 0.03, 12), brass, px, cy + dy + 0.02, pz);
        k.add(cyl(0.012, 0.012, 0.09, 10), k.m('paint', '#f6f1e6'), px, cy + dy + 0.08, pz);
        k.add(new THREE.SphereGeometry(0.016, 10, 8), k.m('bulb'), px, cy + dy + 0.14, pz, { cast: false }).scale.y = 1.7;
      }
    }
    k.bulb(0, cy + 0.12, 0, 7, false);
  }
};

B.bed = (k, w, d, h) => {
  const v = k.v, frame = k.main(), P = props(k);
  const head = k.o.head ?? (v === 'supreme' ? 'channel' : v === 'luxury' ? 'panel' : 'wood');
  const headT = head === 'channel' ? 0.14 : head === 'panel' ? 0.1 : 0.04;
  const bw = head === 'channel' ? w - 0.18 : head === 'panel' ? w - 0.04 : w;
  const legH = v === 'basic' ? 0.1 : 0.06, baseH = 0.26;
  if (v === 'basic') legs4(k, bw - 0.06, d - 0.08, legH, frame, 'block');
  else k.soft(bw - 0.12, legH, d - 0.2, k.dark(), 0, legH / 2, 0.05, { r: 0.01, seg: 2 });
  const base = legH + baseH;
  k.soft(bw, baseH, d - headT, frame, 0, legH + baseH / 2, headT / 2, { r: v === 'basic' ? 0.01 : 0.035, puff: v === 'basic' ? null : { x: 0.006, z: 0.006 } });
  const mattH = 0.24, mattD = d - headT - 0.08;
  k.soft(bw - 0.06, mattH, mattD, k.m('fabric', '#f5f3ef'), 0, base + mattH / 2 - 0.04, headT / 2, { r: 0.06, puff: { y: 0.015 }, wrinkle: 0.002 });
  const top = base + mattH - 0.04;
  if (head === 'wood') k.soft(w, h - legH, headT, frame, 0, legH + (h - legH) / 2, -d / 2 + headT / 2, { r: 0.01, seg: 2 });
  else if (head === 'panel') k.soft(w, h - 0.12, headT, frame, 0, 0.12 + (h - 0.12) / 2, -d / 2 + headT / 2, { r: 0.045, puff: { z: 0.02 }, wrinkle: 0.002 });
  else {
    const n = Math.round(w / 0.16), cw = w / n;
    for (let i = 0; i < n; i++) k.soft(cw - 0.006, h - 0.1, headT, frame, -w / 2 + cw * (i + 0.5), 0.1 + (h - 0.1) / 2, -d / 2 + headT / 2, { r: 0.06, puff: { z: 0.02 }, seg: 6 });
  }
  const bed = { x0: -bw / 2 + 0.03, x1: bw / 2 - 0.03, top, headZ: -d / 2 + headT, footZ: d / 2 - 0.04 };
  k.anchors = bed;
  const S = k.style?.textiles ?? { bedding: '#f3f0ea', sheet: '#ffffff', pillows: ['#d6ccb9'], throw: '#b8aa92' };
  const bedding = k.opts.dress?.bedding;
  D.bedding(k, { bed, duvet: bedding?.color ?? S.bedding, sheet: S.sheet, shams: S.pillows[0], key: bedding?.key ?? null, seed: k.p.id.length, fabric: 'linen' });
  const pl = k.opts.dress?.pillows;
  if (pl) {
    const mid = (bed.x0 + bed.x1) / 2;
    const spots = [{ x: mid - 0.2, y: top + 0.28, z: bed.headZ + 0.5, size: 0.45, rx: -0.35, ry: 0.15 }, { x: mid + 0.2, y: top + 0.28, z: bed.headZ + 0.5, size: 0.45, rx: -0.35, ry: -0.15 }];
    if (bw > 1.5) spots.push({ x: mid, y: top + 0.2, z: bed.headZ + 0.62, size: 0.34, h: 0.26, rx: -0.4, ry: 0, chop: 0 });
    D.throwPillows(k, spots, pl.colors, { key: pl.key, seed: `${k.p.id}p` });
  }
  const th = k.opts.dress?.throw;
  if (th) D.bedThrow(k, { bed, color: th.color, knit: th.knit, key: th.key, seed: k.p.id.length + 3 });
  void P;
};

B.nightstand = (k, w, d, h) => {
  const v = k.v, P = props(k);
  if (v === 'supreme') casePiece(k, w, d, h, { rows: 2, cols: 1, handle: 'bar', topMat: k.m('marble', '#ffffff') });
  else casePiece(k, w, d, h, { rows: v === 'luxury' ? 1 : 2, cols: 1, handle: v === 'basic' ? 'knob' : 'bar' });
  D.bookStack(k, w * 0.15, h, 0.04, 2, P.books, `${k.p.id}n`);
  D.glassOfWater(k, -w * 0.28, h, 0.1);
};

B.tableLamp = (k, w, d, h) => {
  const v = k.v, r = w / 2, shade = k.m('shade', k.style?.textiles?.sheet ?? '#efe9df');
  const kind = k.o.lamp ?? (v === 'basic' ? 'urn' : v === 'luxury' ? 'stick' : 'ball');
  if (kind === 'task') {
    // Articulated work lamp (TERTIAL, Tolomeo): base, two arms, cone head aimed at the desk.
    const m = k.main();
    k.add(cyl(0.075, 0.08, 0.02, 32), m, 0, 0.01, -d / 2 + 0.08);
    const a = V3(0, 0.02, -d / 2 + 0.08), b = V3(0, h * 0.62, -d / 2 + 0.02), c = V3(0, h * 0.8, d / 2 - 0.16);
    k.rod(a, b, 0.007, m); k.rod(b, c, 0.006, m);
    k.add(new THREE.SphereGeometry(0.012, 10, 8), m, b.x, b.y, b.z);
    const head = k.add(new THREE.CylinderGeometry(0.03, 0.075, 0.15, 32, 1, true), m, c.x, c.y - 0.04, c.z + 0.06);
    head.rotation.x = 0.55; head.material.side = THREE.DoubleSide;
    k.add(new THREE.CircleGeometry(0.07, 24), k.m('glow'), c.x, c.y - 0.1, c.z + 0.1, { cast: false }).rotation.x = Math.PI / 2 + 0.55;
    k.bulb(c.x, c.y - 0.08, c.z + 0.08, 1.4, false);
    return;
  }
  if (kind === 'dome') {
    k.add(cyl(0.08, 0.085, 0.025, 32), k.main(), 0, 0.0125, 0);
    k.add(cyl(0.008, 0.008, h * 0.55, 10), k.main(), 0, h * 0.28, 0);
    const dome = k.add(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), k.main(), 0, h * 0.55, 0);
    dome.scale.y = (h * 0.45) / r; dome.material.side = THREE.DoubleSide;
    k.add(new THREE.CircleGeometry(r * 0.96, 32), k.m('glow'), 0, h * 0.551, 0, { cast: false }).rotation.x = Math.PI / 2;
    k.bulb(0, h * 0.6, 0, 1.4, false);
    return;
  }
  if (kind === 'globe') {
    k.add(cyl(0.07, 0.08, 0.02, 32), k.main(), 0, 0.01, 0);
    k.add(cyl(0.01, 0.01, h * 0.4, 10), k.main(), 0, h * 0.2, 0);
    k.add(new THREE.SphereGeometry(r * 0.9, 40, 24), k.m('alabaster', '#f4efe6'), 0, h - r * 0.9, 0, { cast: false });
    k.bulb(0, h - r * 0.9, 0, 1.4, false);
    return;
  }
  if (kind === 'urn') {
    const base = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.085, h * 0.2], [0.06, h * 0.42], [0.012, h * 0.47], [0, h * 0.47]].map(([a, b]) => V2(a, b)), 32);
    k.add(base, k.main(), 0, 0, 0);
    k.add(cyl(r * 0.78, r, h * 0.45, 40, true), shade, 0, h - h * 0.225, 0, { cast: false });
  } else if (kind === 'stick') {
    k.add(cyl(0.07, 0.075, 0.02, 24), k.main(), 0, 0.01, 0);
    k.add(cyl(0.008, 0.008, h * 0.62, 10), k.main(), 0, h * 0.31, 0);
    k.add(cyl(r * 0.8, r, h * 0.38, 48, true), shade, 0, h - h * 0.19, 0, { cast: false });
  } else {
    k.add(cyl(0.05, 0.06, 0.02, 20), k.m('metal', '#caa55e'), 0, 0.01, 0);
    k.add(new THREE.SphereGeometry(0.11, 40, 24), k.main(), 0, 0.13, 0);
    k.add(cyl(0.01, 0.01, h * 0.4, 10), k.m('metal', '#caa55e'), 0, 0.24 + h * 0.2, 0);
    k.add(cyl(r * 0.7, r, h * 0.38, 48, true), shade, 0, h - h * 0.19, 0, { cast: false });
  }
  k.bulb(0, h - h * 0.24, 0, 1.4);
};

B.dresser = (k, w, d, h) => { casePiece(k, w, d, h, { rows: 3, cols: 2, handle: k.v === 'basic' ? 'knob' : 'bar' }); topStyling(k, w, h); };
B.sideboard = (k, w, d, h) => {
  const v = k.v;
  casePiece(k, w, d, h, { rows: 1, cols: w > 1.7 ? 4 : 3, handle: v === 'basic' ? 'knob' : 'vbar', topMat: k.o.top === 'stone' ? k.stone() : null });
  topStyling(k, w, h);
};
B.wardrobe = (k, w, d, h) => casePiece(k, w, d, h, { rows: 1, cols: w > 1.3 ? 3 : 2, handle: 'vbar', crown: k.v !== 'basic', legH: k.v === 'luxury' ? 0.12 : 0.06 });
B.tallCabinet = (k, w, d, h) => {
  casePiece(k, w, d, h, { rows: 2, cols: 1, handle: 'vbar', glassTop: k.v === 'luxury', topMat: k.v === 'supreme' ? k.m('marble', '#ffffff') : null });
  const T = k.style?.textiles;
  D.towelFolded(k, 0, h, 0, { w: Math.min(0.3, w - 0.06), d: Math.min(0.2, d - 0.06), n: 3, color: T?.sheet ?? '#f1ede5' });
};

B.bench = (k, w, d, h) => {
  const v = k.v, main = k.main();
  if (v === 'basic') { legs4(k, w - 0.08, d - 0.08, h - 0.12, k.wood(), 'block'); k.soft(w, 0.12, d, main, 0, h - 0.06, 0, { r: 0.04, puff: { y: 0.012 }, wrinkle: 0.002 }); }
  else if (v === 'luxury') { legs4(k, w - 0.08, d - 0.08, h - 0.14, k.metal(), 'round'); k.soft(w, 0.14, d, main, 0, h - 0.07, 0, { r: 0.05, puff: { y: 0.015 }, wrinkle: 0.002 }); }
  else {
    for (const s of [-1, 1]) k.soft(0.05, h - 0.12, d, k.wood(), s * (w / 2 - 0.14), (h - 0.12) / 2, 0, { r: 0.01, seg: 2 });
    k.soft(w - 0.3, 0.04, 0.05, k.wood(), 0, 0.12, 0, { r: 0.01, seg: 2 });
    k.soft(w, 0.12, d, main, 0, h - 0.06, 0, { r: 0.05, puff: { y: 0.012 }, wrinkle: 0.002 });
  }
  const th = k.opts.dress?.throw;
  if (th) k.soft(0.45, 0.06, d - 0.04, k.m(th.knit ? 'knit' : 'linen', th.color), w / 2 - 0.3, h + 0.03, 0, { r: 0.028, puff: { y: 0.01 }, wrinkle: 0.004 });
};

B.desk = (k, w, d, h) => {
  const v = k.v, top = k.main(), P = props(k);
  if (v === 'supreme') {
    k.soft(w, 0.045, d, top, 0, h - 0.0225, 0, { r: 0.012, seg: 3 });
    k.add(softBox(w * 0.66, 0.004, d * 0.55, { r: 0.002, seg: 2 }), k.m('leather', '#3b2a20'), 0, h + 0.002, 0.04);
    const pw = 0.42, ph = h - 0.045;
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - pw / 2 - 0.02);
      k.soft(pw, ph, d - 0.04, top, x, ph / 2, 0, { r: 0.008, seg: 2 });
      for (let i = 0; i < 3; i++) {
        const y = ph - 0.03 - (ph / 3) * (i + 0.5) + 0.02;
        k.soft(pw - 0.03, ph / 3 - 0.02, 0.015, top, x, y, d / 2 - 0.012, { r: 0.003, seg: 2 });
        k.soft(0.12, 0.012, 0.018, k.metal(), x, y + 0.05, d / 2 + 0.004, { r: 0.004, seg: 2 });
      }
    }
    k.soft(w - pw * 2 - 0.04, h * 0.5, 0.025, top, 0, h - 0.045 - h * 0.25, -d / 2 + 0.03, { r: 0.006, seg: 2 });
    D.laptop(k, 0, h, 0.06);
  } else {
    k.soft(w, 0.03, d, top, 0, h - 0.015, 0, { r: 0.006, seg: 2 });
    legs4(k, w - 0.08, d - 0.08, h - 0.03, v === 'luxury' ? top : k.dark(), v === 'luxury' ? 'taper' : 'round');
    if (v === 'luxury') k.soft(w * 0.4, 0.08, 0.02, top, 0, h - 0.07, d / 2 - 0.04, { r: 0.004, seg: 2 });
    const mx = 0, mz = -d / 2 + 0.17;
    k.soft(0.24, 0.012, 0.17, k.dark(), mx, h + 0.006, mz, { r: 0.004, seg: 2 });
    k.soft(0.04, 0.24, 0.02, k.dark(), mx, h + 0.12, mz - 0.03, { r: 0.006, seg: 2 });
    k.soft(0.62, 0.37, 0.025, k.dark(), mx, h + 0.13 + 0.185, mz, { r: 0.006, seg: 2 });
    k.add(new THREE.PlaneGeometry(0.6, 0.35), k.m('screen'), mx, h + 0.315, mz + 0.0135, { cast: false });
    k.soft(0.42, 0.014, 0.13, k.m('paint', '#d9d9d6'), mx, h + 0.007, mz + 0.26, { r: 0.004, seg: 2 });
  }
  D.notebook(k, -w / 2 + 0.22, h, 0.08, P.dark);
  D.mug(k, -w / 2 + 0.1, h, -0.1, P.ceramic);
  D.plantSmall(k, w / 2 - 0.35, h, -d / 2 + 0.12, { potColor: P.ceramic, seed: k.p.id });
};

B.officeChair = (k, w, d, h) => {
  const v = k.v, fab = k.main();
  const frame = v === 'basic' ? k.dark() : k.m('metal', '#b9bcbf');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = k.soft(0.3, 0.035, 0.05, frame, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, { r: 0.012, seg: 2 });
    arm.rotation.y = -a;
    k.add(new THREE.SphereGeometry(0.026, 12, 8), k.dark(), Math.cos(a) * 0.29, 0.026, Math.sin(a) * 0.29);
  }
  const seatY = 0.47;
  k.add(cyl(0.025, 0.03, seatY - 0.09, 16), frame, 0, 0.07 + (seatY - 0.09) / 2, 0);
  k.soft(w * 0.8, 0.08, d * 0.78, fab, 0, seatY, 0.02, { r: 0.035, puff: { y: 0.015 }, wrinkle: 0.002 });
  const backH = h - seatY - 0.1;
  const back = k.soft(w * 0.74, backH, 0.07, fab, 0, seatY + 0.08 + backH / 2, -d / 2 + 0.1, { r: 0.035, puff: { z: 0.012 } });
  back.rotation.x = -0.1;
  k.soft(0.06, 0.26, 0.03, frame, 0, seatY + 0.06, -d / 2 + 0.06, { r: 0.01, seg: 2 });
  for (const s of [-1, 1]) {
    k.soft(0.03, 0.2, 0.03, frame, s * w * 0.42, seatY + 0.12, 0, { r: 0.008, seg: 2 });
    k.soft(0.06, 0.025, 0.24, k.dark(), s * w * 0.42, seatY + 0.23, 0.02, { r: 0.01, seg: 2 });
  }
};

B.diningTable = (k, w, d, h) => {
  const v = k.v, top = k.main(), P = props(k);
  if (k.o.shape === 'round') {
    const r = w / 2, pr = 0.19;
    k.add(cyl(r, r, 0.045, 72), top, 0, h - 0.0225, 0);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; k.add(cyl(0.032, 0.032, h - 0.1, 10), k.stone(), Math.cos(a) * pr, (h - 0.1) / 2 + 0.05, Math.sin(a) * pr); }
    k.add(cyl(pr + 0.04, pr + 0.04, 0.05, 40), k.stone(), 0, h - 0.07, 0);
    k.add(cyl(0.34, 0.36, 0.05, 48), k.stone(), 0, 0.025, 0);
  } else if (v === 'basic') {
    k.soft(w, 0.03, d, top, 0, h - 0.015, 0, { r: 0.005, seg: 2 });
    legs4(k, w - 0.1, d - 0.1, h - 0.03, top, 'block');
  } else if (v === 'luxury') {
    k.soft(w, 0.05, d, top, 0, h - 0.025, 0, { r: 0.012, seg: 3 });
    for (const s of [-1, 1]) { const x = s * (w / 2 - 0.3); k.soft(0.08, h - 0.1, d * 0.62, top, x, (h - 0.1) / 2 + 0.05, 0, { r: 0.015, seg: 2 }); k.soft(0.1, 0.05, d * 0.8, top, x, 0.025, 0, { r: 0.015, seg: 2 }); }
    k.soft(w - 0.6, 0.06, 0.05, top, 0, 0.36, 0, { r: 0.01, seg: 2 });
  } else {
    k.soft(w, 0.05, d, top, 0, h - 0.025, 0, { r: 0.01, seg: 3 });
    for (const s of [-1, 1]) k.add(cyl(0.2, 0.27, h - 0.05, 48), k.stone(), s * w * 0.27, (h - 0.05) / 2, 0);
  }
  D.vase(k, 0, h, 0, { size: 0.22, color: P.ceramic, fill: P.vase === 'pampas' ? 'pampas' : P.vase === 'flowers' ? 'flowers' : 'branch', flowerColor: P.flowers ?? '#fff', seed: k.p.id });
  D.candle(k, -0.2, h, 0.05, { h: 0.18, r: 0.02, holder: k.m('metal', '#c4a060') });
  D.candle(k, 0.2, h, -0.05, { h: 0.22, r: 0.02, holder: k.m('metal', '#c4a060') });
  const seats = k.opts.places ?? [];
  seats.forEach((p) => D.placeSetting(k, p.x, h, p.z, p.rot, { mat: k.style?.palette?.[1]?.hex ?? '#c9b89a' }));
};

B.diningChair = (k, w, d, h) => {
  const v = k.v, main = k.main(), seatH = 0.46;
  if (v === 'basic') {
    legs4(k, w - 0.06, d - 0.06, seatH - 0.03, main, 'round');
    k.soft(w, 0.03, d, main, 0, seatH - 0.015, 0, { r: 0.008, seg: 2 });
    for (const s of [-1, 1]) k.add(cyl(0.015, 0.015, h - seatH, 10), main, s * (w / 2 - 0.03), seatH + (h - seatH) / 2, -d / 2 + 0.03);
    k.soft(w, 0.1, 0.022, main, 0, h - 0.05, -d / 2 + 0.03, { r: 0.008, seg: 2 });
    k.soft(w - 0.04, 0.04, 0.018, main, 0, seatH + 0.14, -d / 2 + 0.03, { r: 0.006, seg: 2 });
  } else {
    legs4(k, w - 0.06, d - 0.06, seatH - 0.08, v === 'supreme' ? k.metal() : k.wood(), v === 'supreme' ? 'round' : 'taper');
    k.soft(w, 0.08, d, main, 0, seatH - 0.04, 0, { r: 0.03, puff: { y: 0.012 }, wrinkle: 0.0015 });
    const back = k.soft(w - 0.02, h - seatH + (v === 'supreme' ? 0.02 : 0), v === 'supreme' ? 0.08 : 0.06, main, 0, seatH + (h - seatH) / 2 - 0.02, -d / 2 + 0.035, { r: 0.03, puff: { z: 0.01 } });
    back.rotation.x = -0.06;
  }
};

B.vanity = (k, w, d, h) => {
  const v = k.v, P = props(k), T = k.style?.textiles;
  if (v === 'supreme') {
    const brass = k.m('metal', '#caa55e');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.016, 0.016, h - 0.05, 12), brass, sx * (w / 2 - 0.05), (h - 0.05) / 2, sz * (d / 2 - 0.05));
    k.soft(w - 0.06, 0.03, d - 0.06, k.main(), 0, 0.22, 0, { r: 0.005, seg: 2 });
    k.soft(w, 0.05, d, k.main(), 0, h - 0.025, 0, { r: 0.008, seg: 2 });
    D.towelFolded(k, -0.18, 0.235, 0, { w: 0.3, d: 0.22, n: 2, color: T?.sheet ?? '#f1ede5' });
    for (const s of [-1, 1]) { vesselSink(k, (s * w) / 4, h, 0.04); faucet(k, (s * w) / 4, h, -d / 2 + 0.07, brass, 0.26); }
  } else {
    const top = v === 'luxury' ? k.m('marble', '#ffffff') : k.m('ceramic', '#f7f7f4');
    casePiece(k, w, d, h, { rows: 2, cols: v === 'luxury' ? 2 : 1, handle: 'bar', topMat: top, legH: v === 'luxury' ? 0.14 : 0.1 });
    if (v === 'luxury') { vesselSink(k, 0, h, 0.03); faucet(k, 0, h, -d / 2 + 0.06, k.metal(), 0.26); }
    else {
      const basin = new THREE.LatheGeometry([[0, -0.1], [w * 0.28, -0.07], [w * 0.3, 0], [w * 0.31, 0.001]].map(([a, b]) => V2(a, b)), 40);
      const bm = k.add(basin, k.m('ceramic', '#f3f3f0'), 0, h + 0.001, 0.02, { cast: false });
      bm.scale.z = d / w; bm.material.side = THREE.DoubleSide;
      faucet(k, 0, h, -d / 2 + 0.06, k.m('metal', '#d2d4d6'), 0.16);
    }
  }
  D.soapDispenser(k, w / 2 - 0.1, h, -d / 2 + 0.1, P.dark);
  D.plantSmall(k, -w / 2 + 0.1, h, -d / 2 + 0.1, { potColor: P.ceramic, seed: 'vb' });
};

function vesselSink(k, x, y, z, r = 0.2) {
  const prof = [[0, 0], [0.55, 0.005], [0.9, 0.05], [1, 0.14], [0.95, 0.14], [0.86, 0.06], [0.5, 0.02], [0, 0.018]];
  k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a * r, b)), 48), k.m('ceramic', '#f7f7f4'), x, y, z).material.side = THREE.DoubleSide;
}
function faucet(k, x, y, z, mat, tall = 0.24) {
  k.add(cyl(0.014, 0.018, tall, 14), mat, x, y + tall / 2, z);
  k.add(cyl(0.01, 0.01, 0.15, 12), mat, x, y + tall - 0.01, z + 0.07).rotation.x = Math.PI / 2;
}

function archShape(w, h, t = 0) {
  const s = new THREE.Shape(), r = w / 2 - t;
  s.moveTo(-r, t); s.lineTo(r, t); s.lineTo(r, h - w / 2); s.absarc(0, h - w / 2, r, 0, Math.PI, false); s.lineTo(-r, t);
  return s;
}

B.mirror = (k, w, d, h) => {
  const shape = k.o.shape, frame = k.main(), glass = k.m('mirror');
  if (shape === 'round') {
    const r = w / 2;
    k.add(cyl(r, r, d, 72), frame, 0, r, 0).rotation.x = Math.PI / 2;
    k.add(new THREE.CircleGeometry(r - 0.02, 72), glass, 0, r, d / 2 + 0.001, { cast: false });
  } else if (shape === 'arch') {
    k.add(new THREE.ExtrudeGeometry(archShape(w, h), { depth: d, bevelEnabled: false, curveSegments: 36 }), frame, 0, 0, -d / 2);
    k.add(new THREE.ShapeGeometry(archShape(w, h, 0.022), 36), glass, 0, 0, d / 2 + 0.001, { cast: false });
  } else {
    k.soft(w, h, d, frame, 0, h / 2, 0, { r: 0.01, seg: 2 });
    k.add(new THREE.PlaneGeometry(w - 0.1, h - 0.1), glass, 0, h / 2, d / 2 + 0.002, { cast: false });
  }
};

// Full-length mirror leaning on the wall (an Airbnb essential).
B.floorMirror = (k, w, d, h) => {
  const g = new THREE.Group();
  k.add(softBox(w, h, 0.03, { r: 0.01, seg: 2 }), k.main(), 0, h / 2, 0, { parent: g });
  k.add(new THREE.PlaneGeometry(w - 0.06, h - 0.06), k.m('mirror'), 0, h / 2, 0.016, { parent: g, cast: false });
  g.position.set(0, 0, d / 2 - 0.04);
  g.rotation.x = -0.08;
  k.g.add(g);
};

B.bathtub = (k, w, d, h) => {
  const shell = k.main();
  if (k.o.shape === 'oval') {
    const prof = [[0, 0], [0.78, 0], [0.92, 0.3 * h], [0.985, 0.8 * h], [1, h - 0.012], [0.99, h], [0.94, h], [0.93, h - 0.02], [0.87, 0.55 * h], [0.72, 0.09], [0, 0.08]];
    const tub = k.add(new THREE.LatheGeometry(prof.map(([a, b]) => V2(a, b)), 64), shell);
    tub.scale.set(w / 2, 1, d / 2);
    tub.material.side = THREE.DoubleSide;
    if (k.v === 'supreme') {
      const brass = k.m('metal', '#caa55e'), x = w / 2 - 0.06, z = d / 2 - 0.05;
      k.add(cyl(0.02, 0.02, h + 0.3, 12), brass, x, (h + 0.3) / 2, z);
      k.rod(V3(x, h + 0.3, z), V3(x - 0.2, h + 0.3, z - 0.05), 0.014, brass);
    }
  } else {
    const t = 0.07;
    k.soft(w, 0.08, d, shell, 0, 0.04, 0, { r: 0.02, seg: 2 });
    for (const s of [-1, 1]) { k.soft(w, h, t, shell, 0, h / 2, s * (d / 2 - t / 2), { r: 0.03, seg: 3 }); k.soft(t, h, d, shell, s * (w / 2 - t / 2), h / 2, 0, { r: 0.03, seg: 3 }); }
    faucet(k, -w / 2 + 0.04, h, 0, k.m('metal', '#d2d4d6'), 0.12);
  }
  // bath tray with a book and a candle
  const tr = k.m('wood', '#b58a5a');
  k.soft(0.7, 0.02, 0.2, tr, 0, h + 0.01, 0, { r: 0.006, seg: 2 });
  D.candle(k, 0.2, h + 0.02, 0, { h: 0.07, r: 0.03 });
  D.bookFlat(k, -0.12, h + 0.02, 0, { w: 0.14, h: 0.2, t: 0.02, color: '#7ea3be', rotY: 0.2 });
};

B.toilet = (k, w, d, h) => {
  const c = k.main();
  if (k.o.wallHung) {
    k.soft(w, 0.28, d - 0.04, c, 0, h - 0.14, 0.02, { r: 0.12, seg: 6 });
    k.soft(w + 0.004, 0.022, d - 0.08, c, 0, h + 0.01, 0.04, { r: 0.01, seg: 6 });
    k.soft(0.24, 0.16, 0.012, k.m('metal', '#caa55e'), 0, h + 0.55, -d / 2 + 0.006, { r: 0.01, seg: 2 });
    return;
  }
  const tankH = k.v === 'luxury' ? 0.3 : 0.38, tankD = 0.18;
  k.add(cyl(0.12, 0.14, 0.3, 40), c, 0, 0.15, 0.04).scale.z = 1.35;
  k.add(cyl(0.19, 0.14, 0.14, 40), c, 0, 0.33, 0.1).scale.z = 1.3;
  const seat = k.add(new THREE.TorusGeometry(0.15, 0.025, 14, 48), c, 0, 0.41, 0.11);
  seat.scale.set(1, 1.3, 1); seat.rotation.x = Math.PI / 2;
  k.soft(w * 0.95, tankH, tankD, c, 0, 0.4 + tankH / 2, -d / 2 + tankD / 2, { r: 0.03, seg: 3 });
  k.add(cyl(0.02, 0.02, 0.01, 16), k.m('metal', '#d2d4d6'), 0, 0.4 + tankH + 0.005, -d / 2 + tankD / 2);
};

B.towelRack = (k, w, d, h) => {
  const m = k.main(), T = k.style?.textiles;
  const bot = d / 2 - 0.03, topZ = -d / 2 + 0.02;
  for (const s of [-1, 1]) k.rod(V3(s * (w / 2 - 0.02), 0, bot), V3(s * (w / 2 - 0.02), h, topZ), 0.015, m);
  const at = (t) => V3(0, h * t, bot + (topZ - bot) * t);
  for (let i = 1; i <= 5; i++) { const p = at(i / 5.6); k.add(cyl(0.011, 0.011, w - 0.04, 10), m, p.x, p.y, p.z).rotation.z = Math.PI / 2; }
  const t1 = at(3 / 5.6), t2 = at(5 / 5.6);
  D.towelHanging(k, 0, t1.y + 0.012, t1.z, { w: w * 0.72, len: 0.5, color: T?.sheet ?? '#f1ede5', seed: 2 });
  D.towelHanging(k, 0, t2.y + 0.012, t2.z, { w: w * 0.6, len: 0.36, color: T?.pillows?.[0] ?? '#c9b89a', seed: 5 });
};

// Folding luggage rack for guests.
B.luggageRack = (k, w, d, h) => {
  const wood = k.main();
  for (const s of [-1, 1]) {
    k.rod(V3(-w / 2 + 0.03, 0, s * (d / 2 - 0.02)), V3(w / 2 - 0.03, h, -s * (d / 2 - 0.02)), 0.014, wood);
    k.rod(V3(w / 2 - 0.03, 0, s * (d / 2 - 0.02)), V3(-w / 2 + 0.03, h, -s * (d / 2 - 0.02)), 0.014, wood);
  }
  for (const s of [-1, 1]) k.add(cyl(0.014, 0.014, d, 10), wood, s * (w / 2 - 0.03), h, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) k.add(new THREE.BoxGeometry(w - 0.06, 0.004, 0.05), k.m('linen', '#3a3733'), 0, h - 0.01, -d / 3 + (i * d) / 3);
  D.towelFolded(k, 0.05, h, 0, { w: 0.34, d: 0.24, n: 2, color: k.style?.textiles?.sheet ?? '#f1ede5' });
};

// POÄNG: bentwood cantilever frame and one long curved cushion.
B.poang = (k, w, d, h) => {
  const wood = k.m('wood', '#d9c09a'), fab = k.main();
  const z0 = -d / 2, z1 = d / 2;
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.03);
    const path = new THREE.CatmullRomCurve3([V3(x, 0.02, z1 - 0.04), V3(x, 0.02, z0 + 0.25), V3(x, 0.08, z0 + 0.12), V3(x, 0.3, z0 + 0.2), V3(x, 0.55, z1 - 0.3), V3(x, 0.56, z1 - 0.1), V3(x, 0.47, z1 - 0.03), V3(x, 0.4, z1 - 0.12)]);
    k.add(new THREE.TubeGeometry(path, 80, 0.02, 8, false), wood).scale.x = 1;
  }
  const seatPath = [[z1 - 0.1, 0.42], [z1 - 0.3, 0.36], [z0 + 0.33, 0.34], [z0 + 0.2, 0.46], [z0 + 0.12, 0.72], [z0 + 0.1, h - 0.02]];
  for (const off of [0.035, -0.005]) {
    const g = clothPathGeo(seatPath.map(([z, y]) => [z + off * 0.3, y + off]), w - 0.12, { folds: 0, amp: 0, segL: 50, segW: 12 });
    k.add(g, off > 0 ? fab : wood);
  }
  k.soft(w - 0.14, 0.07, 0.42, fab, 0, 0.4, 0.05, { r: 0.03, puff: { y: 0.015 }, wrinkle: 0.003 }).rotation.x = -0.12;
  const back = k.soft(w - 0.14, 0.5, 0.07, fab, 0, 0.66, z0 + 0.16, { r: 0.03, puff: { z: 0.015 }, wrinkle: 0.003 });
  back.rotation.x = -0.32;
  k.anchors = { seatY: 0.45, backZ: z0 + 0.25, x0: -w * 0.3, x1: w * 0.3 };
  pillowsOnSeat(k, { x0: -w * 0.3, x1: w * 0.3, seatY: 0.44, backZ: z0 + 0.22, n: 1 });
};

// GLADOM: tray on a steel ring with three legs.
B.trayTable = (k, w, d, h) => {
  const m = k.main(), r = w / 2, P = props(k);
  const tray = new THREE.LatheGeometry([[0, 0], [r - 0.01, 0], [r, 0.005], [r + 0.004, 0.05], [r - 0.002, 0.05], [r - 0.006, 0.006], [0, 0.006]].map(([a, b]) => V2(a, b)), 48);
  k.add(tray, m, 0, h - 0.05, 0).material.side = THREE.DoubleSide;
  k.add(new THREE.TorusGeometry(r * 0.9, 0.007, 6, 48), m, 0, h - 0.055, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.rod(V3(Math.cos(a) * r * 0.9, h - 0.055, Math.sin(a) * r * 0.9), V3(Math.cos(a) * r * 0.75, 0, Math.sin(a) * r * 0.75), 0.008, m); }
  D.mug(k, 0.06, h - 0.045, 0.02, P.ceramic);
  D.bookStack(k, -0.07, h - 0.045, -0.02, 1, P.books, `${k.p.id}g`);
};

// Moulded shell chair (TEODORES).
B.shellChair = (k, w, d, h) => {
  const m = k.main(), seatH = 0.46;
  legs4(k, w - 0.1, d - 0.12, seatH - 0.02, k.m('paint', k.finish.color), 'splay');
  k.soft(w, 0.03, d - 0.04, m, 0, seatH, 0.02, { r: 0.012, seg: 3, puff: { y: -0.006 } });
  const back = k.soft(w - 0.02, h - seatH - 0.02, 0.025, m, 0, seatH + (h - seatH) / 2, -d / 2 + 0.05, { r: 0.012, seg: 3, puff: { z: -0.012 } });
  back.rotation.x = -0.14;
};

// Open shelf unit for bathrooms (HEMNES, String): shelves with towels, baskets and bottles.
B.shelfUnit = (k, w, d, h) => {
  const m = k.main(), T = k.style?.textiles, P = props(k);
  const string = k.o.main === 'paint' && k.v === 'supreme';
  if (string) for (const s of [-1, 1]) {
    k.soft(0.012, h, d, m, s * (w / 2 - 0.006), h / 2, 0, { r: 0.004, seg: 2 });
  } else for (const s of [-1, 1]) k.soft(0.022, h, d, m, s * (w / 2 - 0.011), h / 2, 0, { r: 0.004, seg: 2 });
  const n = 5, gap = (h - 0.1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const y = 0.06 + i * gap;
    k.soft(w - (string ? 0.02 : 0.044), 0.02, d, string ? k.wood('#d8bd95') : m, 0, y, 0, { r: 0.004, seg: 2 });
    if (i === 0) D.basket(k, 0, y + 0.01, 0, { r: Math.min(0.14, d / 2 - 0.02), h: 0.2, color: '#b99a70' });
    else if (i === 1 || i === 2) D.towelFolded(k, 0, y + 0.01, 0, { w: Math.min(0.32, w - 0.08), d: Math.min(0.22, d - 0.04), n: 3, color: i === 1 ? (T?.sheet ?? '#f1ede5') : (T?.pillows?.[0] ?? '#d3c8b4') });
    else if (i === 3) { D.soapDispenser(k, -w / 4, y + 0.01, 0, P.dark); D.candle(k, w / 5, y + 0.01, 0, { color: '#f1ece3' }); }
    else if (i === 4) D.plantSmall(k, 0, y + 0.01, 0, { kind: 'trailing', potColor: P.ceramic, seed: `${k.p.id}t` });
  }
};

// Noguchi table: free-form glass top on two interlocking curved wood pieces.
B.noguchi = (k, w, d, h) => {
  const wood = k.main();
  const top = new THREE.Shape();
  top.moveTo(-w / 2, -d * 0.1);
  top.bezierCurveTo(-w / 2, -d / 2, w * 0.15, -d / 2, w / 2, -d * 0.35);
  top.bezierCurveTo(w * 0.62, d * 0.1, w * 0.1, d / 2, -w * 0.25, d * 0.45);
  top.bezierCurveTo(-w * 0.5, d * 0.4, -w * 0.52, d * 0.15, -w / 2, -d * 0.1);
  const g = new THREE.ExtrudeGeometry(top, { depth: 0.019, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, curveSegments: 40 });
  g.rotateX(-Math.PI / 2);
  k.add(g, k.m('glass'), 0, h - 0.023, 0, { cast: false });
  const leg = (w0, rot, x, z) => {
    const s = new THREE.Shape();
    s.moveTo(-w0 / 2, 0); s.quadraticCurveTo(-w0 * 0.1, h * 0.2, -w0 * 0.25, h - 0.03); s.lineTo(w0 * 0.3, h - 0.03); s.quadraticCurveTo(w0 * 0.05, h * 0.5, w0 / 2, 0); s.lineTo(-w0 / 2, 0);
    const lg = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, curveSegments: 20 });
    lg.translate(0, 0, -0.022);
    const m = k.add(lg, wood, x, 0, z);
    m.rotation.y = rot;
  };
  leg(w * 0.55, 0.5, -w * 0.08, 0.02);
  leg(w * 0.45, -1.1, w * 0.1, -0.03);
  const P = props(k);
  D.bookStack(k, -w * 0.2, h, -0.05, 2, P.books, `${k.p.id}n`, 0.3);
  D.bowl(k, w * 0.18, h, 0.02, { r: 0.09, color: P.ceramic });
};

// Saarinen tulip side table.
B.tulipTable = (k, w, d, h) => {
  const top = k.main(), base = k.m('paint', '#f2f1ee'), P = props(k);
  const t = k.add(cyl(0.5, 0.5, 0.02, 64), top, 0, h - 0.01, 0);
  t.scale.set(w, 1, d);
  const prof = [[0, 0], [0.2, 0], [0.21, 0.012], [0.12, 0.04], [0.035, 0.14], [0.03, h - 0.1], [0.08, h - 0.03], [0.09, h - 0.02], [0, h - 0.02]];
  const b = k.add(new THREE.LatheGeometry(prof.map(([a, y]) => V2(a, y)), 48), base, 0, 0, 0);
  b.scale.z = Math.min(1, d / w + 0.25);
  D.vase(k, 0.05, h, 0, { size: 0.14, color: P.ceramic, fill: P.vase === 'flowers' ? 'flowers' : 'branch', flowerColor: P.flowers ?? '#fff', seed: `${k.p.id}t` });
};

// Nelson Platform Bench: slatted top on finger-jointed legs.
B.platformBench = (k, w, d, h) => {
  const wood = k.main(), slats = Math.round(d / 0.03);
  for (let i = 0; i < slats; i++) k.soft(w, 0.045, (d / slats) * 0.62, wood, 0, h - 0.0225, -d / 2 + (d / slats) * (i + 0.5), { r: 0.004, seg: 2 });
  for (const s of [-1, 1]) {
    const x = s * (w / 2 - 0.18);
    k.soft(0.05, h - 0.045, d - 0.02, wood, x, (h - 0.045) / 2, 0, { r: 0.006, seg: 2 });
  }
  const P = props(k);
  D.bookStack(k, -w * 0.3, h, 0, 3, P.books, `${k.p.id}p`, 0.4);
  D.basket(k, w * 0.28, h, 0, { r: 0.14, h: 0.16, color: '#b99a70' });
};

// Wishbone chair: steam-bent top rail, Y-shaped splat, woven paper-cord seat.
B.wishbone = (k, w, d, h) => {
  const wood = k.main(), cord = k.m('jute', '#d8c7a0'), seatH = 0.45;
  for (const sx of [-1, 1]) {
    k.rod(V3(sx * (w / 2 - 0.04), 0, d / 2 - 0.05), V3(sx * (w / 2 - 0.05), seatH, d / 2 - 0.06), 0.017, wood);
    k.rod(V3(sx * (w / 2 - 0.06), 0, -d / 2 + 0.06), V3(sx * (w / 2 - 0.07), h - 0.07, -d / 2 + 0.12), 0.017, wood);
  }
  const railCurve = new THREE.CatmullRomCurve3([V3(-w / 2 + 0.07, h - 0.08, -d / 2 + 0.12), V3(-w * 0.35, h - 0.02, -d / 2 + 0.03), V3(0, h, -d / 2 + 0.01), V3(w * 0.35, h - 0.02, -d / 2 + 0.03), V3(w / 2 - 0.07, h - 0.08, -d / 2 + 0.12), V3(w / 2 - 0.02, h - 0.2, -d / 2 + 0.2)]);
  k.add(new THREE.TubeGeometry(railCurve, 48, 0.016, 8, false), wood);
  k.rod(V3(0, seatH + 0.02, -d / 2 + 0.07), V3(0, h * 0.8, -d / 2 + 0.06), 0.012, wood);
  k.rod(V3(0, h * 0.8, -d / 2 + 0.06), V3(-0.07, h - 0.01, -d / 2 + 0.02), 0.01, wood);
  k.rod(V3(0, h * 0.8, -d / 2 + 0.06), V3(0.07, h - 0.01, -d / 2 + 0.02), 0.01, wood);
  const seat = k.soft(w - 0.08, 0.03, d - 0.1, cord, 0, seatH, 0.01, { r: 0.01, seg: 3, puff: { y: -0.008 }, wrinkle: 0.0015 });
  void seat;
  for (const sz of [-1, 1]) k.add(cyl(0.012, 0.012, w - 0.1, 8), wood, 0, seatH - 0.02, sz * (d / 2 - 0.07)).rotation.z = Math.PI / 2;
};

// Merge every mesh that shares a material into one, per tappable group, so a fully styled room
// stays at a few hundred draw calls on phones.
function optimize(root) {
  const groups = [root];
  root.traverse((o) => { if (o !== root && o.userData.key) groups.push(o); });
  for (const grp of groups) {
    const byMat = new Map();
    grp.updateWorldMatrix(true, true);
    const inv = grp.matrixWorld.clone().invert();
    grp.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh) return;
      for (let p = o.parent; p && p !== grp; p = p.parent) if (p.userData.key) return;
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    });
    for (const [mat, meshes] of byMat) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => {
        const g = m.geometry.clone();
        g.applyMatrix4(inv.clone().multiply(m.matrixWorld));
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
        if (!g.attributes.uv) boxUV(g);
        g.clearGroups();
        return g;
      });
      const anyNonIndexed = geos.some((g) => !g.index);
      const merged = mergeGeometries(anyNonIndexed ? geos.map((g) => (g.index ? g.toNonIndexed() : g)) : geos, false);
      if (!merged) continue;
      merged.userData.metreUV = true;
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = meshes.some((m) => m.castShadow);
      mesh.receiveShadow = true;
      for (const m of meshes) { m.removeFromParent(); m.geometry.dispose(); }
      grp.add(mesh);
    }
  }
  const empty = [];
  root.traverse((o) => { if (o.isGroup && o !== root && !o.userData.key && !o.children.length) empty.push(o); });
  empty.forEach((o) => o.removeFromParent());
}

export function buildModel(product, finishIndex = 0, opts = {}) {
  const k = new Kit(product, finishIndex, opts);
  const [w, d, h] = product.dims.map((v) => v / 100);
  (B[product.model.kind] ?? B.pouf)(k, w, d, h, opts);
  optimize(k.g);
  k.g.userData.mats = k.mats;
  k.g.userData.lights = k.lights;
  k.g.userData.anchors = k.anchors;
  return k.g;
}

export { makeMaterial, makeNoise };
