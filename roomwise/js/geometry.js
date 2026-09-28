// Soft shapes for realistic furniture and textiles: puffy cushions, pillows with pinched
// corners, cloth that drapes over edges with folds, and pleated curtains.
// All UVs are in metres so fabric and wood textures keep the same scale on every piece.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, clamp } from './util.js';

// Seeds may be numbers or strings (a product id); noise needs a number.
const seedNum = (s) => (typeof s === 'number' && Number.isFinite(s) ? s : [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 99991, 7));

// Smooth 3D value noise, seeded.
export function makeNoise(seed = 1) {
  seed = seedNum(seed);
  const rand = rng(seed);
  const perm = new Uint8Array(512), vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rand() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const f = (t) => t * t * (3 - 2 * t);
  const h = (x, y, z) => vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  return (x, y, z = 0) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = f(x - xi), yf = f(y - yi), zf = f(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
  };
}

// Planar UVs in metres, projected along each vertex's dominant normal axis.
export function boxUV(geo, offset = 0) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  if (!nor) geo.computeVertexNormals();
  const n = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) { uv[i * 2] = z + offset; uv[i * 2 + 1] = y; }
    else if (ay >= az) { uv[i * 2] = x + offset; uv[i * 2 + 1] = z; }
    else { uv[i * 2] = x + offset; uv[i * 2 + 1] = y; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.userData.metreUV = true;
  return geo;
}

// A rounded box whose faces can bulge like a stuffed cushion, with optional small wrinkles.
// puff is in metres per axis: { x, y, z } (how far each face centre bulges out).
export function softBox(w, h, d, { r = 0.03, puff = null, seg = 8, wrinkle = 0, seed = 1 } = {}) {
  seed = seedNum(seed);
  const base = new THREE.BoxGeometry(1, 1, 1, seg, Math.max(2, Math.round(seg * Math.min(1.5, Math.max(0.4, h / Math.max(w, d)) * 2))), seg);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const g = mergeVertices(base);
  base.dispose();
  const pos = g.attributes.position;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const rr = Math.max(0.001, Math.min(r, hx, hy, hz) * 0.999);
  const noise = wrinkle ? makeNoise(seed) : null;
  const p = new THREE.Vector3(), inner = new THREE.Vector3(), off = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const qx = pos.getX(i) * 2, qy = pos.getY(i) * 2, qz = pos.getZ(i) * 2;
    p.set(qx * hx, qy * hy, qz * hz);
    inner.set(clamp(p.x, -(hx - rr), hx - rr), clamp(p.y, -(hy - rr), hy - rr), clamp(p.z, -(hz - rr), hz - rr));
    off.copy(p).sub(inner);
    if (off.lengthSq() > 1e-12) p.copy(inner).add(off.normalize().multiplyScalar(rr));
    if (puff) {
      const k = 6;
      if (puff.x) p.x += Math.sign(qx) * Math.abs(qx) ** k * (1 - qy * qy) * (1 - qz * qz) * puff.x;
      if (puff.y) p.y += Math.sign(qy) * Math.abs(qy) ** k * (1 - qx * qx) * (1 - qz * qz) * puff.y;
      if (puff.z) p.z += Math.sign(qz) * Math.abs(qz) ** k * (1 - qx * qx) * (1 - qy * qy) * puff.z;
    }
    if (noise) {
      const s = 7;
      const nv = noise(p.x * s + 11, p.y * s, p.z * s) + 0.5 * noise(p.x * s * 2.3, p.y * s * 2.3 + 5, p.z * s * 2.3);
      const len = Math.hypot(qx, qy, qz) || 1;
      p.x += (qx / len) * nv * wrinkle;
      p.y += (qy / len) * nv * wrinkle;
      p.z += (qz / len) * nv * wrinkle;
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return boxUV(g);
}

// Throw pillow: full in the middle, pinched at the corners, with an optional "chop" dent on top.
export function pillowGeo(w, h, t, { seg = 20, chop = 0.35, seed = 1 } = {}) {
  seed = seedNum(seed);
  const noise = makeNoise(seed);
  const N = seg, verts = [], uvs = [], idx = [];
  for (const side of [1, -1]) {
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const u = (i / N) * 2 - 1, v = (j / N) * 2 - 1;
        const eu = 1 - u * u, ev = 1 - v * v;
        let x = (u * w) / 2 * (1 - 0.08 * ev);
        let y = (v * h) / 2 * (1 - 0.08 * eu);
        let z = side * (t / 2) * Math.pow(Math.max(0, eu), 0.5) * Math.pow(Math.max(0, ev), 0.5);
        if (chop) {
          const dent = Math.exp(-(u * u) / 0.03) * Math.max(0, v) ** 3;
          y -= dent * chop * 0.12 * h;
          z *= 1 - dent * chop * 0.7;
        }
        const n = noise(u * 3 + seed, v * 3) * 0.006 * eu * ev;
        z += side * n;
        verts.push(x, y, z);
        uvs.push(x + 0.5, y + 0.5);
      }
    }
  }
  const row = N + 1, half = row * row;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, b, d, a, d, c);
      idx.push(half + a, half + d, half + b, half + a, half + c, half + d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.metreUV = true;
  return g;
}

// Cloth laid over a box top that drapes down its sides (duvets, throws, tablecloths).
// The cloth keeps its length: past an edge it rolls over a rounded lip and hangs straight,
// until it reaches that side's maximum drop, where it rests.
// box: the supporting top in local coords { x0, x1, z0, z1, y } ; cloth: { cx, cz, w, l }.
export function drapeGeo({ box, cloth, lip = 0.04, drops = {}, folds = 5, amp = 0.02, wrinkle = 0.004, seed = 1, seg = 48 }) {
  seed = seedNum(seed);
  const noise = makeNoise(seed);
  const nx = seg, nz = Math.max(8, Math.round((seg * cloth.l) / cloth.w));
  const verts = [], uvs = [], idx = [];
  const maxDrop = { left: drops.left ?? 1, right: drops.right ?? 1, front: drops.front ?? 1, back: drops.back ?? 1 };
  const arcLen = (Math.PI / 2) * lip;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const fx = cloth.cx - cloth.w / 2 + (cloth.w * i) / nx;
      const fz = cloth.cz - cloth.l / 2 + (cloth.l * j) / nz;
      const dx = fx < box.x0 ? fx - box.x0 : fx > box.x1 ? fx - box.x1 : 0;
      const dz = fz < box.z0 ? fz - box.z0 : fz > box.z1 ? fz - box.z1 : 0;
      const d = Math.hypot(dx, dz);
      let x = fx, z = fz, y = box.y;
      let hang = 0;
      if (d > 1e-6) {
        const ux = dx / d, uz = dz / d;
        const side = Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : (dz < 0 ? 'back' : 'front');
        const limit = maxDrop[side];
        let horiz, drop;
        if (d <= arcLen) { const a = d / lip; horiz = lip * Math.sin(a); drop = lip * (1 - Math.cos(a)); }
        else { horiz = lip; drop = lip + (d - arcLen); }
        if (drop > limit) { horiz += drop - limit; drop = limit; }
        hang = drop;
        x = (dx ? (dx < 0 ? box.x0 : box.x1) : fx) + ux * horiz;
        z = (dz ? (dz < 0 ? box.z0 : box.z1) : fz) + uz * horiz;
        y = box.y - drop;
        // vertical folds on the hanging part, deeper towards the hem
        const along = Math.abs(dx) > Math.abs(dz) ? fz : fx;
        const k = clamp(hang / 0.25, 0, 1);
        const fold = Math.sin(along * folds * 2 * Math.PI + noise(along * 3, seed) * 2) * amp * k;
        x += ux * fold;
        z += uz * fold;
      }
      y += noise(fx * 6, fz * 6, seed) * wrinkle + (hang === 0 ? noise(fx * 2.2, fz * 2.2, 7) * wrinkle * 1.5 : 0);
      verts.push(x, y, z);
      uvs.push(fx, fz);
    }
  }
  const row = nx + 1;
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.metreUV = true;
  return g;
}

// Cloth that follows a path in the Y-Z plane (a towel over a rail, a throw over a sofa arm),
// extruded across X with soft folds on the hanging parts.
export function clothPathGeo(path, width, { folds = 4, amp = 0.012, seed = 1, segW = 24, segL = 40 } = {}) {
  seed = seedNum(seed);
  const noise = makeNoise(seed);
  const curve = new THREE.CatmullRomCurve3(path.map(([z, y]) => new THREE.Vector3(0, y, z)), false, 'centripetal');
  const pts = curve.getSpacedPoints(segL);
  const verts = [], uvs = [], idx = [];
  let len = 0;
  for (let j = 0; j <= segL; j++) {
    if (j) len += pts[j].distanceTo(pts[j - 1]);
    const t = curve.getTangentAt(j / segL);
    const nz = -t.y, ny = t.z;
    const hang = clamp(Math.abs(t.y), 0, 1);
    for (let i = 0; i <= segW; i++) {
      const x = -width / 2 + (width * i) / segW;
      const f = Math.sin((x / width) * folds * 2 * Math.PI + noise(x * 4, j * 0.1, seed) * 1.5) * amp * (0.25 + hang);
      verts.push(x + noise(j * 0.2, x, seed) * 0.004, pts[j].y + ny * f, pts[j].z + nz * f);
      uvs.push(x, len);
    }
  }
  const row = segW + 1;
  for (let j = 0; j < segL; j++) for (let i = 0; i < segW; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.metreUV = true;
  return g;
}

// A curtain panel hanging from y = h down to 0, gathered into soft pleats.
export function curtainGeo(width, h, { pleats = 8, depth = 0.05, seed = 1, segW = 64, segH = 24, flare = 0.03 } = {}) {
  seed = seedNum(seed);
  const noise = makeNoise(seed);
  const verts = [], uvs = [], idx = [];
  for (let j = 0; j <= segH; j++) {
    const v = j / segH;
    const y = v * h;
    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const phase = u * pleats * 2 * Math.PI + noise(u * 4, v * 2, seed) * (1 - v) * 1.2;
      const d = depth * (0.75 + 0.25 * (1 - v)) * (1 + noise(u * 6, seed, v) * 0.25);
      const x = (u - 0.5) * width * (1 + flare * (1 - v));
      const z = Math.sin(phase) * d;
      verts.push(x, y, z);
      uvs.push(u * width * 1.8, y);
    }
  }
  const row = segW + 1;
  for (let j = 0; j < segH; j++) for (let i = 0; i < segW; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.metreUV = true;
  return g;
}

// Leaf outline for realistic plants (monstera has holes and splits, others are simple).
export function leafGeo(len, wid, { kind = 'oval', seed = 1, bend = 0.25 } = {}) {
  seed = seedNum(seed);
  const s = new THREE.Shape();
  const N = 24;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const halfW = wid / 2 * Math.sin(Math.PI * Math.pow(t, kind === 'fig' ? 0.75 : 0.9)) * (kind === 'fig' ? 1 + 0.25 * t : 1);
    pts.push([t * len, halfW]);
  }
  s.moveTo(0, 0);
  for (const [x, y] of pts) s.lineTo(x, y);
  for (let i = pts.length - 1; i >= 0; i--) s.lineTo(pts[i][0], -pts[i][1]);
  if (kind === 'monstera') {
    const rand = rng(seed);
    for (let k = 0; k < 4; k++) {
      const hole = new THREE.Path();
      const cx = len * (0.3 + k * 0.15), cy = (rand() < 0.5 ? 1 : -1) * wid * 0.22;
      hole.absellipse(cx, cy, len * 0.04, wid * 0.05, 0, Math.PI * 2, false, 0);
      s.holes.push(hole);
    }
  }
  const g = new THREE.ShapeGeometry(s, 6);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, -bend * (x / len) ** 2 * len + Math.abs(y) * 0.25);
  }
  g.computeVertexNormals();
  return boxUV(g);
}
