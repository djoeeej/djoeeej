// The room shell: floor, walls with real window and door openings, ceiling, skirting,
// crown moulding, the style's wall treatment, curtains, switches and sockets.
// Room coordinates: back wall z = 0, left wall x = 0, right x = W, front z = D, floor y = 0.
// Openings: { wall: 'back'|'front'|'left'|'right', a0, a1, y0, y1, kind: 'window'|'door' },
// where a is x for back/front walls and z for side walls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { floorTexture, limewash, fabricNormal } from './textures.js';
import { curtainGeo, softBox, boxUV } from './geometry.js';
import { makeMaterial } from './models.js';

const T = 0.12;
const WALL_DEFAULT = '#ebe8e1';

function wallSpec(id, R) {
  const { W, D, H } = R;
  const len = id === 'back' || id === 'front' ? W : D;
  // map wall-local (a along the wall, y up, t into the wall from the room face) to room coords
  const map = {
    back: (a, y, t) => [a, y, -t],
    front: (a, y, t) => [a, y, D + t],
    left: (a, y, t) => [-t, y, a],
    right: (a, y, t) => [W + t, y, a],
  }[id];
  const rotY = { back: 0, front: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[id];
  const outside = {
    back: (c) => c.z < -0.02, front: (c) => c.z > D + 0.02, left: (c) => c.x < -0.02, right: (c) => c.x > W + 0.02,
  }[id];
  return { id, len, H, map, rotY, outside };
}

// Box in wall-local coordinates: a0..a1 along, y0..y1 up, t0..t1 depth (negative = into the room).
function wallBox(spec, a0, a1, y0, y1, t0, t1) {
  const g = new THREE.BoxGeometry(Math.max(0.001, a1 - a0), Math.max(0.001, y1 - y0), Math.max(0.001, t1 - t0));
  const [x, y, z] = spec.map((a0 + a1) / 2, (y0 + y1) / 2, (t0 + t1) / 2);
  g.rotateY(spec.rotY);
  g.translate(x, y, z);
  return boxUV(g);
}

function merged(geos) {
  if (!geos.length) return null;
  const g = mergeGeometries(geos.map((x) => { x.deleteAttribute?.('uv1'); return x; }), false);
  geos.forEach((x) => x.dispose());
  g.userData.metreUV = true;
  return g;
}

function mesh(geo, mat, parent, { cast = true } = {}) {
  if (!geo) return null;
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Free spans of a wall between openings, for panelling and sockets.
function freeSpans(len, ops, margin = 0.12) {
  const spans = [];
  let a = margin;
  for (const o of [...ops].sort((p, q) => p.a0 - q.a0)) {
    if (o.a0 - 0.08 - a > 0.25) spans.push([a, o.a0 - 0.08]);
    a = Math.max(a, o.a1 + 0.08);
  }
  if (len - margin - a > 0.25) spans.push([a, len - margin]);
  return spans;
}

export function buildRoom(R, { openings = [], style = null, feature = null, curtains = null, paint = null } = {}) {
  const root = new THREE.Group();
  const { W, D, H } = R;
  const mats = [];
  const mat = (kind, color, extra) => { const m = makeMaterial(kind, color, extra); mats.push(m); return m; };

  // floor
  const fl = style?.floor ?? { type: 'plank', tone: '#c29a6b' };
  const ft = floorTexture(fl.type, fl.tone);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: ft.map, normalMap: ft.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.35 });
  mats.push(floorMat);
  const floorGeo = boxUV(new THREE.BoxGeometry(W + 2 * T, 0.1, D + 2 * T).translate(W / 2, -0.05, D / 2));
  const floor = mesh(floorGeo, floorMat, root, { cast: false });

  // walls
  const wallColor = paint?.color ?? style?.walls?.color ?? WALL_DEFAULT;
  const limeTex = style?.walls?.finish === 'limewash' ? limewash() : null;
  const plaster = fabricNormal('plaster');
  const wallMats = {};
  const trimColor = style?.id === 'moody' ? wallColor : '#f4f2ee';
  const trim = mat('paint', trimColor);
  trim.roughness = 0.4;
  const walls = {};
  for (const id of ['back', 'front', 'left', 'right']) {
    const spec = wallSpec(id, R);
    const g = new THREE.Group();
    g.userData.outside = spec.outside;
    const ops = openings.filter((o) => o.wall === id);
    const on = paint?.color && (paint.target === 'all' || id === 'back');
    const wm = new THREE.MeshStandardMaterial({ color: new THREE.Color(on ? paint.color : wallColor), roughness: 0.93, map: limeTex, normalMap: plaster, normalScale: new THREE.Vector2(0.25, 0.25) });
    mats.push(wm);
    wallMats[id] = wm;
    // solid parts around openings
    const pieces = [];
    let a = -T;
    const sorted = [...ops].sort((p, q) => p.a0 - q.a0);
    for (const o of sorted) {
      pieces.push(wallBox(spec, a, o.a0, 0, H, 0, T));
      pieces.push(wallBox(spec, o.a0, o.a1, 0, o.y0, 0, T));
      pieces.push(wallBox(spec, o.a0, o.a1, o.y1, H, 0, T));
      a = o.a1;
    }
    pieces.push(wallBox(spec, a, spec.len + T, 0, H, 0, T));
    mesh(merged(pieces.filter((p) => p.attributes.position.count)), wm, g);

    // skirting boards on the free spans
    const skirt = [];
    let s = 0;
    for (const o of sorted.filter((q) => q.kind === 'door')) { skirt.push(wallBox(spec, s, o.a0 - 0.07, 0, 0.1, -0.016, 0)); s = o.a1 + 0.07; }
    skirt.push(wallBox(spec, s, spec.len, 0, 0.1, -0.016, 0));
    mesh(merged(skirt), trim, g);

    // crown moulding
    if (style?.walls?.crown) mesh(merged([wallBox(spec, 0, spec.len, H - 0.06, H, -0.03, 0), wallBox(spec, 0, spec.len, H - 0.1, H - 0.06, -0.015, 0)]), trim, g);

    // openings: windows and doors
    for (const o of sorted) {
      const cas = [];
      const cw = 0.07;
      cas.push(wallBox(spec, o.a0 - cw, o.a0, o.y0 - (o.kind === 'door' ? 0 : 0.02), o.y1 + cw, -0.02, 0));
      cas.push(wallBox(spec, o.a1, o.a1 + cw, o.y0 - (o.kind === 'door' ? 0 : 0.02), o.y1 + cw, -0.02, 0));
      cas.push(wallBox(spec, o.a0 - cw, o.a1 + cw, o.y1, o.y1 + cw, -0.02, 0));
      // reveals inside the wall thickness
      cas.push(wallBox(spec, o.a0, o.a1, o.y1 - 0.005, o.y1, 0, T));
      cas.push(wallBox(spec, o.a0, o.a0 + 0.005, o.y0, o.y1, 0, T));
      cas.push(wallBox(spec, o.a1 - 0.005, o.a1, o.y0, o.y1, 0, T));
      if (o.kind === 'window') {
        cas.push(wallBox(spec, o.a0 - 0.05, o.a1 + 0.05, o.y0 - 0.035, o.y0, -0.05, T * 0.6));
        const frames = [];
        const mid = (o.a0 + o.a1) / 2, fy = o.y0 + (o.y1 - o.y0) * 0.64;
        frames.push(wallBox(spec, o.a0, o.a1, o.y0, o.y0 + 0.06, T * 0.35, T * 0.55));
        frames.push(wallBox(spec, o.a0, o.a1, o.y1 - 0.06, o.y1, T * 0.35, T * 0.55));
        frames.push(wallBox(spec, o.a0, o.a0 + 0.06, o.y0, o.y1, T * 0.35, T * 0.55));
        frames.push(wallBox(spec, o.a1 - 0.06, o.a1, o.y0, o.y1, T * 0.35, T * 0.55));
        if (o.a1 - o.a0 > 0.8) frames.push(wallBox(spec, mid - 0.025, mid + 0.025, o.y0, o.y1, T * 0.35, T * 0.55));
        frames.push(wallBox(spec, o.a0, o.a1, fy - 0.025, fy + 0.025, T * 0.35, T * 0.55));
        mesh(merged(frames), trim, g);
        const glass = mat('glass', '#ffffff');
        mesh(wallBox(spec, o.a0 + 0.03, o.a1 - 0.03, o.y0 + 0.03, o.y1 - 0.03, T * 0.44, T * 0.46), glass, g, { cast: false });
      } else {
        const leaf = mat('paint', style?.id === 'moody' ? '#23302a' : '#f2f0ea');
        leaf.roughness = 0.35;
        const door = [wallBox(spec, o.a0 + 0.005, o.a1 - 0.005, o.y0, o.y1 - 0.005, T * 0.3, T * 0.3 + 0.04)];
        for (const [p0, p1] of [[0.12, 0.45], [0.55, 0.9]]) {
          const h0 = o.y0 + (o.y1 - o.y0) * p0, h1 = o.y0 + (o.y1 - o.y0) * p1;
          door.push(wallBox(spec, o.a0 + 0.12, o.a1 - 0.12, h0, h1, T * 0.3 - 0.008, T * 0.3));
        }
        mesh(merged(door), leaf, g);
        const hx = o.a1 - 0.09;
        const handle = mat('metal', style?.metal ?? '#c8c8c4');
        mesh(merged([wallBox(spec, hx - 0.07, hx + 0.02, o.y0 + 1.0, o.y0 + 1.02, T * 0.3 - 0.06, T * 0.3 - 0.04), wallBox(spec, hx - 0.01, hx + 0.01, o.y0 + 0.98, o.y0 + 1.04, T * 0.3 - 0.04, T * 0.3)]), handle, g);
      }
      mesh(merged(cas), trim, g);
    }

    // sockets and a light switch
    const plate = mat('paint', '#f7f6f3');
    const bits = [];
    const spans = freeSpans(spec.len, ops, 0.3);
    spans.forEach(([s0, s1], i) => { if (i % 2 === 0 && s1 - s0 > 0.6) { const x = s0 + 0.25; bits.push(wallBox(spec, x, x + 0.085, 0.28, 0.365, -0.01, 0)); } });
    for (const o of sorted.filter((q) => q.kind === 'door')) bits.push(wallBox(spec, o.a1 + 0.12, o.a1 + 0.205, 1.05, 1.135, -0.01, 0));
    if (bits.length) mesh(merged(bits), plate, g, { cast: false });

    walls[id] = { group: g, spec, material: wm, openings: ops };
    root.add(g);
  }

  // wall treatment
  const treat = style?.walls?.feature;
  const tColor = style?.walls?.featureColor ?? wallColor;
  if (treat && treat !== 'none') addTreatment(treat, { walls, R, feature, color: tColor, trim, mat, wallMats, style });

  // ceiling
  const ceilingMat = mat('paint', '#f6f4f0');
  ceilingMat.roughness = 1;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(W / 2, H, D / 2);
  ceiling.receiveShadow = true;
  root.add(ceiling);

  // curtains on every window
  let curtainGroup = null;
  if (curtains) {
    curtainGroup = new THREE.Group();
    curtainGroup.userData.key = curtains.key;
    for (const o of openings.filter((q) => q.kind === 'window')) addCurtains(walls[o.wall], o, R, curtains, curtainGroup, mat);
    root.add(curtainGroup);
  }

  return { root, floor, walls, wallMats, ceiling, curtains: curtainGroup, mats, trim };
}

// Wall-local frame for things hung on a wall: x runs along the wall, y up, z into the room.
function wallFrame(id, R) {
  const { W, D } = R;
  return {
    back: { rot: 0, pos: [0, 0, 0], a: (a) => a },
    front: { rot: Math.PI, pos: [W, 0, D], a: (a) => W - a },
    left: { rot: Math.PI / 2, pos: [0, 0, D], a: (a) => D - a },
    right: { rot: -Math.PI / 2, pos: [W, 0, 0], a: (a) => a },
  }[id];
}

function addCurtains(wall, o, R, c, group, mat) {
  const spec = wall.spec, fr = wallFrame(spec.id, R);
  const rodY = Math.min(R.H - 0.08, o.y1 + 0.3);
  const ext = 0.25;
  const a0 = Math.max(0.05, o.a0 - ext), a1 = Math.min(spec.len - 0.05, o.a1 + ext);
  const la0 = Math.min(fr.a(a0), fr.a(a1)), la1 = Math.max(fr.a(a0), fr.a(a1));
  const lo0 = Math.min(fr.a(o.a0), fr.a(o.a1)), lo1 = Math.max(fr.a(o.a0), fr.a(o.a1));
  const g = new THREE.Group();
  g.userData.wall = spec.id;
  const metal = mat('blackMetal', c.rodColor ?? '#2b2b2b');
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, la1 - la0 + 0.1, 12), metal);
  rod.rotation.z = Math.PI / 2;
  rod.position.set((la0 + la1) / 2, rodY, 0.1);
  g.add(rod);
  for (const a of [la0 - 0.05, la1 + 0.05]) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), metal);
    f.position.set(a, rodY, 0.1);
    g.add(f);
  }
  const fab = mat(c.fabric === 'velvet' ? 'velvet' : 'linen', c.color);
  fab.side = THREE.DoubleSide;
  const panelW = Math.max(0.45, (lo1 - lo0) * 0.32 + ext);
  const hang = rodY - 0.02;
  for (const side of [-1, 1]) {
    const m = new THREE.Mesh(curtainGeo(panelW, hang, { pleats: Math.round(panelW * 9), depth: c.fabric === 'velvet' ? 0.05 : 0.04, seed: side + 3 }), fab);
    m.castShadow = true;
    m.receiveShadow = true;
    m.position.set(side < 0 ? la0 + panelW / 2 : la1 - panelW / 2, 0.01, 0.1);
    g.add(m);
  }
  if (c.sheer) {
    const sheer = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.9, transmission: 0.75, thickness: 0.002, side: THREE.DoubleSide, sheen: 0.4, sheenColor: new THREE.Color('#ffffff') });
    const m = new THREE.Mesh(curtainGeo(lo1 - lo0 + 0.2, hang, { pleats: Math.round((lo1 - lo0) * 7), depth: 0.025, seed: 9 }), sheer);
    m.position.set((lo0 + lo1) / 2, 0.01, 0.07);
    m.receiveShadow = true;
    g.add(m);
  }
  g.rotation.y = fr.rot;
  g.position.set(...fr.pos);
  group.add(g);
}

function addTreatment(kind, { walls, R, feature, color, trim, mat }) {
  const paintMat = mat('paint', color);
  paintMat.roughness = 0.6;
  const fw = feature ? Math.max(1.2, feature.width + 0.6) : 1.6;
  const fwall = walls[feature?.wall ?? 'back'];
  const fa = feature?.a ?? fwall.spec.len / 2;
  const fa0 = Math.max(0.05, fa - fw / 2), fa1 = Math.min(fwall.spec.len - 0.05, fa + fw / 2);
  if (kind === 'slats') {
    const spec = fwall.spec, geos = [];
    const backer = mat('fabric', '#3a3733');
    const top = R.H - 0.03;
    geos.push(wallBox(spec, fa0, fa1, 0.1, top, -0.006, 0));
    mesh(merged(geos.splice(0)), backer, fwall.group);
    for (let a = fa0 + 0.01; a < fa1 - 0.02; a += 0.048) geos.push(wallBox(spec, a, a + 0.028, 0.1, top, -0.026, -0.006));
    const wood = mat('wood', color);
    mesh(merged(geos), wood, fwall.group);
  } else if (kind === 'arch') {
    const spec = fwall.spec;
    const w = Math.min(fa1 - fa0, 2.4), h = Math.min(R.H - 0.2, 2.25);
    const s = new THREE.Shape(), r = w / 2;
    s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
    const g = boxUV(new THREE.ShapeGeometry(s, 48));
    const m = new THREE.Mesh(g, paintMat);
    const [x, , z] = spec.map(fa, 0, -0.003);
    m.position.set(x, 0.1, z);
    m.rotation.y = spec.rotY;
    m.receiveShadow = true;
    fwall.group.add(m);
  } else if (kind === 'moulding' || kind === 'wainscot' || kind === 'beadboard') {
    for (const wall of Object.values(walls)) {
      const spec = wall.spec, geos = [];
      const spans = freeSpans(spec.len, wall.openings, 0.15);
      const railY = kind === 'moulding' ? 0.9 : 1.1;
      for (const [s0, s1] of spans) {
        geos.push(wallBox(spec, s0, s1, railY, railY + 0.04, -0.022, 0));
        if (kind === 'beadboard') {
          // Tongue-and-groove boards: 10 cm boards with a shadow gap between them.
          geos.push(wallBox(spec, s0, s1, 0.1, railY, -0.004, 0));
          for (let a = s0; a < s1 - 0.02; a += 0.1) geos.push(wallBox(spec, a + 0.003, Math.min(s1, a + 0.097), 0.1, railY, -0.012, -0.004));
          continue;
        }
        const count = Math.max(1, Math.round((s1 - s0) / 0.95));
        const pw = (s1 - s0) / count;
        const bands = kind === 'moulding' ? [[0.22, railY - 0.14], [railY + 0.2, R.H - 0.3]] : [[0.22, railY - 0.12]];
        for (let i = 0; i < count; i++) {
          const p0 = s0 + i * pw + 0.07, p1 = s0 + (i + 1) * pw - 0.07;
          for (const [y0, y1] of bands) {
            if (y1 - y0 < 0.25 || p1 - p0 < 0.2) continue;
            const t = 0.025;
            geos.push(wallBox(spec, p0, p1, y0, y0 + t, -0.014, 0), wallBox(spec, p0, p1, y1 - t, y1, -0.014, 0));
            geos.push(wallBox(spec, p0, p0 + t, y0, y1, -0.014, 0), wallBox(spec, p1 - t, p1, y0, y1, -0.014, 0));
          }
        }
      }
      const m = kind === 'moulding' ? trim : paintMat;
      mesh(merged(geos), m, wall.group);
    }
    if (kind === 'wainscot') {
      for (const wall of Object.values(walls)) {
        const spans = freeSpans(wall.spec.len, wall.openings, 0.0);
        const geos = spans.map(([s0, s1]) => wallBox(wall.spec, s0, s1, 0.1, 1.1, -0.006, 0));
        mesh(merged(geos), paintMat, wall.group);
      }
    }
  }
  void softBox;
}
