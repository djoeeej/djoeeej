// Procedural textures: fabric weaves (as normal maps), wood, floors, marble, limewash walls,
// rugs and artwork. Everything is generated on canvas and cached, so there are no downloads.
// UVs are in metres (see geometry.js), so `repeat` = 1 / tile size in metres.
import * as THREE from 'three';
import { rng } from './util.js';

const cache = new Map();

function canvasTex(key, w, h, draw, { srgb = true, tile = null } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (tile) tex.repeat.set(1 / tile[0], 1 / tile[1]);
  cache.set(key, tex);
  return tex;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, f);
  return `#${c.getHexString()}`;
}

function speckle(g, w, h, rand, amount = 0.06, count = 4000) {
  for (let i = 0; i < count; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rand() * amount})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Tileable value noise with the given period in cells (memoised per seed and period).
const noiseCache = new Map();
function periodicNoise(seed, period) {
  const key = `${seed}:${period}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const fn = makePeriodic(seed, period);
  noiseCache.set(key, fn);
  return fn;
}
function makePeriodic(seed, period) {
  const rand = rng(seed);
  const grid = Array.from({ length: period * period }, () => rand());
  const at = (x, y) => grid[((y % period) + period) % period * period + ((x % period) + period) % period];
  const f = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * period, y = v * period;
    const xi = Math.floor(x), yi = Math.floor(y), xf = f(x - xi), yf = f(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a + (b - a) * xf) + ((c + (d - c) * xf) - (a + (b - a) * xf)) * yf;
  };
}

function fbm(seed, u, v, base = 4, oct = 4) {
  let s = 0, a = 0.5, tot = 0;
  for (let o = 0; o < oct; o++) {
    s += periodicNoise(seed + o, base << o)(u, v) * a;
    tot += a; a *= 0.5;
  }
  return s / tot;
}

// Height field (0..1) → tangent-space normal map, wrapping at the edges so it tiles.
function normalFromHeight(key, size, heightFn, strength = 2, tile = 0.1) {
  return canvasTex(key, size, size, (g) => {
    const H = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = heightFn(x / size, y / size, x, y);
    const img = g.createImageData(size, size);
    const at = (x, y) => H[((y + size) % size) * size + ((x + size) % size)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
        const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
        const l = Math.hypot(dx, dy, 1);
        const i = (y * size + x) * 4;
        img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
        img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
        img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }, { srgb: false, tile: [tile, tile] });
}

// Height drawn with canvas primitives (white = high) → normal map.
function normalFromDrawing(key, size, draw, strength, tile) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  draw(g, size);
  const d = g.getImageData(0, 0, size, size).data;
  return normalFromHeight(key, size, (u, v, x, y) => d[(y * size + x) * 4] / 255, strength, tile);
}

// Fabric and leather surface detail. Returns a normal map texture tiled in metres.
export function fabricNormal(kind) {
  switch (kind) {
    case 'linen': {
      const n = periodicNoise(3, 32);
      return normalFromHeight('n:linen', 256, (u, v, x, y) => {
        const p = 8;
        const warp = Math.abs(Math.sin((Math.PI * x) / p)), weft = Math.abs(Math.sin((Math.PI * y) / p));
        const over = (Math.floor(x / p) + Math.floor(y / p)) % 2;
        return (over ? warp : weft) * 0.8 + n(u, v) * 0.35;
      }, 1.6, 0.035);
    }
    case 'boucle': {
      const rand = rng('boucle');
      return normalFromDrawing('n:boucle', 256, (g, S) => {
        g.lineWidth = 1.6;
        for (let i = 0; i < 1400; i++) {
          const x = rand() * S, y = rand() * S, r = 2 + rand() * 3;
          g.strokeStyle = `rgba(255,255,255,${0.5 + rand() * 0.5})`;
          for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.stroke(); }
        }
      }, 2.4, 0.06);
    }
    case 'knit': {
      return normalFromHeight('n:knit', 256, (u, v, x, y) => {
        const cw = 32, ch = 24;
        const cx = (x % cw) / cw - 0.5, cy = (y % ch) / ch;
        const side = cx < 0 ? -1 : 1;
        const d = Math.abs(Math.abs(cx) - 0.25 - (cy - 0.5) * 0.3 * side);
        return Math.max(0, 1 - d * 5) * (0.8 + 0.2 * Math.sin(cy * Math.PI));
      }, 3, 0.09);
    }
    case 'leather': {
      const rand = rng('leather');
      const cells = Array.from({ length: 160 }, () => [rand(), rand()]);
      return normalFromHeight('n:leather', 128, (u, v) => {
        let d1 = 9, d2 = 9;
        for (const [cx, cy] of cells) {
          let dx = Math.abs(u - cx), dy = Math.abs(v - cy);
          dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy);
          const d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
        }
        return Math.min(1, (Math.sqrt(d2) - Math.sqrt(d1)) * 30);
      }, 1.4, 0.08);
    }
    case 'velvet':
      return normalFromHeight('n:velvet', 128, (u, v) => fbm(21, u, v, 8, 3), 0.8, 0.12);
    case 'wool':
      return normalFromHeight('n:wool', 256, (u, v) => fbm(31, u, v, 32, 3), 3, 0.08);
    case 'jute': {
      return normalFromHeight('n:jute', 256, (u, v, x, y) => {
        const p = 16;
        const row = Math.floor(y / p);
        const off = row % 2 ? p / 2 : 0;
        const bx = ((x + off) % p) / p, by = (y % p) / p;
        return Math.sin(bx * Math.PI) * Math.sin(by * Math.PI) ** 0.5;
      }, 3, 0.05);
    }
    case 'plaster':
      return normalFromHeight('n:plaster', 256, (u, v) => fbm(41, u, v, 4, 5), 0.9, 1.2);
    default:
      return null;
  }
}

// Greyscale wood grain (multiplied by each wood material's colour). Tile: 0.25 m × 1.2 m.
export function woodGrain() {
  return canvasTex('grain', 256, 1024, (g, w, h) => {
    const rand = rng('grain');
    g.fillStyle = '#e6e6e6';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i++) {
      const x = rand() * w, a = 0.035 + rand() * 0.1;
      g.strokeStyle = `rgba(60,40,20,${a})`;
      g.lineWidth = 0.6 + rand() * 2.6;
      g.beginPath();
      let px = x;
      for (let y = 0; y <= h; y += 16) { px += (rand() - 0.5) * 3; y === 0 ? g.moveTo(px, y) : g.lineTo(px, y); }
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const cy = rand() * h, cx = rand() * w;
      g.strokeStyle = 'rgba(70,45,20,0.12)';
      for (let r = 4; r < 40; r += 5) { g.beginPath(); g.ellipse(cx, cy, r * 0.4, r * 3, 0, 0, Math.PI * 2); g.stroke(); }
    }
    speckle(g, w, h, rand, 0.05, 1500);
  }, { tile: [0.25, 1.2] });
}

// Floors. Returns { map, normalMap } tiled in metres.
export function floorTexture(type = 'plank', tone = '#b98f62') {
  const key = `floor:${type}:${tone}`;
  const size = 1024;
  const tileM = type === 'plank' ? 2.4 : 1.2;
  const planks = [];
  const map = canvasTex(key, size, size, (g, w, h) => {
    const rand = rng(key);
    g.fillStyle = shade(tone, -0.1);
    g.fillRect(0, 0, w, h);
    const drawPlank = (x, y, len, wid, angle) => {
      g.save();
      g.translate(x, y);
      g.rotate(angle);
      g.fillStyle = shade(tone, (rand() - 0.5) * 0.09);
      g.fillRect(0, 0, len, wid);
      for (let i = 0; i < Math.max(6, wid / 4); i++) {
        g.strokeStyle = `rgba(70,45,20,${0.04 + rand() * 0.1})`;
        g.lineWidth = 0.7 + rand() * 1.6;
        const yy = rand() * wid;
        g.beginPath();
        g.moveTo(0, yy);
        g.bezierCurveTo(len * 0.3, yy + (rand() - 0.5) * 6, len * 0.7, yy + (rand() - 0.5) * 6, len, yy + (rand() - 0.5) * 3);
        g.stroke();
      }
      if (rand() < 0.2) { g.fillStyle = 'rgba(60,35,15,0.25)'; g.beginPath(); g.ellipse(len * rand(), wid * 0.5, 4, 2.5, 0, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = 'rgba(35,20,8,0.55)';
      g.lineWidth = 1.6;
      g.strokeRect(0, 0, len, wid);
      g.restore();
      planks.push([x, y, len, wid, angle]);
    };
    if (type === 'plank') {
      const rows = 12, ph = h / rows;
      for (let r = 0; r < rows; r++) {
        let x = -rand() * 500;
        while (x < w) { const len = 360 + rand() * 520; drawPlank(x, r * ph, len, ph, 0); x += len; }
      }
    } else if (type === 'herringbone') {
      const L = 170, Wd = 42;
      for (let y = -L; y < h + L; y += Wd * 2) {
        for (let x = -L; x < w + L; x += Wd * 2 * 1.0) {
          const bx = x + (Math.floor(y / (Wd * 2)) % 2) * 0;
          drawPlank(bx, y, L, Wd, Math.PI / 4);
          drawPlank(bx + Wd * 1.414, y, L, Wd, (3 * Math.PI) / 4);
        }
      }
    } else {
      const L = 200, Wd = 48, s = Math.PI / 5;
      for (let y = -L; y < h + L; y += Wd / Math.cos(s)) {
        for (let x = -L; x < w + L; x += 2 * L * Math.cos(s)) {
          drawPlank(x, y, L, Wd, s);
          drawPlank(x + 2 * L * Math.cos(s), y, L, Wd, Math.PI - s);
        }
      }
    }
    speckle(g, w, h, rand, 0.035, 9000);
  }, { tile: [tileM, tileM] });
  const src = map.image.getContext('2d').getImageData(0, 0, size, size).data;
  const normalMap = normalFromHeight(`${key}:n`, 512, (u, v, x, y) => {
    const i = ((y * 2) * size + x * 2) * 4;
    return (src[i] + src[i + 1] + src[i + 2]) / 765;
  }, 1.4, tileM);
  return { map, normalMap };
}

export function marble() {
  return canvasTex('marble', 1024, 1024, (g, w, h) => {
    const rand = rng('marble');
    g.fillStyle = '#f3f1ec';
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w * 0.3, h * 0.4, 50, w * 0.5, h * 0.5, w * 0.8);
    grad.addColorStop(0, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(210,205,198,0.35)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(110,105,100,${0.08 + rand() * 0.25})`;
      g.lineWidth = 0.5 + rand() * (i < 5 ? 3.5 : 1.4);
      g.filter = `blur(${rand() < 0.5 ? 0.6 : 1.6}px)`;
      g.beginPath();
      let x = rand() * w, y = rand() < 0.5 ? 0 : rand() * h;
      g.moveTo(x, y);
      for (let s = 0; s < 14; s++) { x += (rand() - 0.3) * 140; y += 40 + rand() * 90; g.lineTo(x, y); }
      g.stroke();
    }
    g.filter = 'none';
    speckle(g, w, h, rand, 0.05, 3000);
  }, { tile: [1.1, 1.1] });
}

// Mottled limewash / plaster, tinted by the wall paint colour.
export function limewash() {
  return canvasTex('limewash', 512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(55, x / w, y / h, 3, 5);
      const brush = fbm(66, x / w * 2, y / h * 0.6, 4, 3);
      // Subtle: real limewash reads as soft movement, not stains.
      const v = 238 + (n - 0.5) * 26 + (brush - 0.5) * 12;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, { tile: [2.4, 2.4] });
}

// Rugs: stripe, trellis, medallion, beni (Moroccan diamonds), jute, solid.
export function rugTexture(pattern, color, w, d) {
  const cw = 512, ch = Math.max(128, Math.round((512 * d) / w));
  return canvasTex(`rug:${pattern}:${color}:${cw}x${ch}`, cw, ch, (g, W, H) => {
    const rand = rng(pattern + color);
    const light = shade(color, 0.28), dark = shade(color, -0.12), cream = '#ece4d3';
    const pile = () => { for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},${rand() < 0.5 ? 0 : 255},${rand() * 0.05})`; g.fillRect(rand() * W, rand() * H, 1.5, 1.5); } };
    if (pattern === 'solid') { g.fillStyle = color; g.fillRect(0, 0, W, H); speckle(g, W, H, rand, 0.12, 9000); return; }
    if (pattern === 'jute') {
      g.fillStyle = '#c4a57a'; g.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) { g.fillStyle = `rgba(90,60,30,${0.12 + rand() * 0.12})`; g.fillRect(x, y, 10, 5); }
      g.strokeStyle = shade(color, -0.2); g.lineWidth = 10; g.strokeRect(10, 10, W - 20, H - 20);
      speckle(g, W, H, rand, 0.1, 6000); return;
    }
    if (pattern === 'fleck') {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 26000; i++) { g.fillStyle = rand() < 0.5 ? shade(color, -0.25 - rand() * 0.2) : shade(color, 0.2 + rand() * 0.2); g.fillRect(rand() * W, rand() * H, 1 + rand() * 2.5, 1 + rand() * 1.5); }
      pile(); return;
    }
    if (pattern === 'beni') {
      g.fillStyle = '#efe9dc'; g.fillRect(0, 0, W, H);
      g.strokeStyle = shade(color, -0.1); g.lineWidth = 3.5;
      const s = 70;
      for (let y = -s; y < H + s; y += s) for (let x = -s; x < W + s; x += s) {
        g.beginPath(); g.moveTo(x, y + s / 2); g.lineTo(x + s / 2, y); g.lineTo(x + s, y + s / 2); g.lineTo(x + s / 2, y + s); g.closePath(); g.stroke();
      }
      pile(); speckle(g, W, H, rand, 0.12, 12000); return;
    }
    if (pattern === 'stripe') {
      g.fillStyle = cream; g.fillRect(0, 0, W, H);
      let y = 0;
      while (y < H) { const bh = 6 + rand() * 30, pick = rand(); g.fillStyle = pick < 0.45 ? color : pick < 0.6 ? dark : pick < 0.8 ? cream : light; g.fillRect(0, y, W, bh); y += bh; }
      speckle(g, W, H, rand, 0.08, 6000); return;
    }
    if (pattern === 'trellis') {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      g.strokeStyle = light; g.lineWidth = 5;
      for (let x = -H; x < W + H; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
      g.strokeStyle = cream; g.lineWidth = 14; g.strokeRect(16, 16, W - 32, H - 32);
      pile(); speckle(g, W, H, rand, 0.08, 8000); return;
    }
    // medallion (vintage Persian, slightly faded)
    const c0 = new THREE.Color(color); const hsl = {}; c0.getHSL(hsl);
    const rust = hsl.h > 0.5 ? '#8a3a2e' : '#2f3f63';
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    for (const [inset, c] of [[0, '#2a2522'], [10, cream], [18, rust], [40, cream], [46, dark]]) { g.fillStyle = c; g.fillRect(inset, inset, W - inset * 2, H - inset * 2); }
    g.fillStyle = color; g.fillRect(52, 52, W - 104, H - 104);
    g.fillStyle = cream;
    for (let x = 30; x < W - 20; x += 22) { g.beginPath(); g.arc(x, 29, 4, 0, Math.PI * 2); g.arc(x, H - 29, 4, 0, Math.PI * 2); g.fill(); }
    const cx = W / 2, cy = H / 2;
    for (const [r, c] of [[0.36, rust], [0.28, cream], [0.21, dark], [0.13, light], [0.06, rust]]) {
      g.fillStyle = c; g.beginPath();
      for (let a = 0; a <= 16; a++) { const ang = (a / 16) * Math.PI * 2, k = a % 2 === 0 ? 1 : 0.8; g.lineTo(cx + Math.cos(ang) * W * r * k, cy + Math.sin(ang) * H * r * 1.1 * k); }
      g.fill();
    }
    for (let i = 0; i < 70; i++) {
      const x = 70 + rand() * (W - 140), y = 70 + rand() * (H - 140);
      if (Math.hypot((x - cx) / W, (y - cy) / H) < 0.4) continue;
      g.fillStyle = rand() < 0.5 ? light : rust; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-4, -4, 8, 8); g.restore();
    }
    g.fillStyle = 'rgba(255,245,230,0.12)';
    for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(rand() * W, rand() * H, 40 + rand() * 80, 20 + rand() * 40, rand() * 3, 0, Math.PI * 2); g.fill(); }
    pile(); speckle(g, W, H, rand, 0.1, 9000);
  });
}

// Artwork styles: print, abstract, oil, line, landscape, botanical, photo.
export function artTexture(style, color, seed, w, h) {
  const cw = 512, ch = Math.round((512 * h) / w);
  return canvasTex(`art:${style}:${color}:${seed}:${ch}`, cw, ch, (g, W, H) => {
    const rand = rng(`${style}${color}${seed}`);
    const base = new THREE.Color(color);
    const rgba = (c, a) => `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a})`;
    const paper = (c = '#f2ede4') => { g.fillStyle = c; g.fillRect(0, 0, W, H); };
    if (style === 'print') {
      paper();
      const alt = `#${base.clone().offsetHSL(0.45, -0.1, 0.05).getHexString()}`;
      for (let i = 0; i < 3; i++) { g.strokeStyle = i === 1 ? alt : color; g.lineWidth = 34; g.beginPath(); g.arc(W / 2, H * 0.72, 70 + i * 48, Math.PI, 0); g.stroke(); }
      g.fillStyle = color; g.beginPath(); g.arc(W * 0.72, H * 0.24, 42, 0, Math.PI * 2); g.fill();
    } else if (style === 'line') {
      paper('#f4f0e8');
      g.strokeStyle = '#2a2724'; g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath();
      let x = W * 0.3, y = H * 0.25; g.moveTo(x, y);
      for (let i = 0; i < 9; i++) { const nx = W * (0.2 + rand() * 0.6), ny = H * (0.2 + rand() * 0.6); g.bezierCurveTo(x + (rand() - 0.5) * 200, y + 90, nx - 80, ny - 60, nx, ny); x = nx; y = ny; }
      g.stroke();
      g.fillStyle = rgba(base, 0.85); g.beginPath(); g.arc(W * 0.66, H * 0.3, W * 0.1, 0, Math.PI * 2); g.fill();
    } else if (style === 'landscape') {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, `#${base.clone().offsetHSL(0, -0.2, 0.3).getHexString()}`); sky.addColorStop(1, '#efe6d6');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 4; k++) {
        const c = base.clone().offsetHSL(0, -0.05, -0.08 * k + 0.1);
        g.fillStyle = rgba(c, 0.9); g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) g.lineTo(x, H * (0.45 + k * 0.12) + Math.sin(x / (60 + k * 20) + k) * 18 + rand() * 4);
        g.lineTo(W, H); g.fill();
      }
      g.filter = 'blur(1px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
    } else if (style === 'botanical') {
      paper('#f1ece2');
      g.strokeStyle = rgba(base, 0.9); g.fillStyle = rgba(base, 0.75); g.lineWidth = 3;
      g.beginPath(); g.moveTo(W / 2, H * 0.92); g.quadraticCurveTo(W * 0.45, H * 0.5, W / 2, H * 0.12); g.stroke();
      for (let i = 0; i < 9; i++) {
        const t = 0.2 + i * 0.08, side = i % 2 ? 1 : -1, y = H * (0.9 - t * 0.9);
        g.save(); g.translate(W / 2 - (1 - t) * 10, y); g.rotate(side * (0.9 - t * 0.4));
        g.beginPath(); g.ellipse(side * 55, 0, 60, 20, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    } else if (style === 'photo') {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#d9dcdc'); sky.addColorStop(0.55, '#b9bfc2'); sky.addColorStop(0.56, '#7d8588'); sky.addColorStop(1, '#c8c1b4');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 12; i++) g.fillRect(0, H * 0.56 + i * 10 + rand() * 6, W, 2);
      speckle(g, W, H, rand, 0.12, 12000);
    } else if (style === 'abstract') {
      paper('#ebe5d9');
      for (let i = 0; i < 60; i++) {
        const c = base.clone().offsetHSL((rand() - 0.5) * 0.12, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.35);
        g.fillStyle = rgba(c, 0.15 + rand() * 0.35); g.beginPath();
        g.ellipse(rand() * W, rand() * H, 30 + rand() * 160, 10 + rand() * 60, rand() * Math.PI, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = 'rgba(30,30,30,0.7)'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(rand() * W, rand() * H); g.bezierCurveTo(rand() * W, rand() * H, rand() * W, rand() * H, rand() * W, rand() * H); g.stroke(); }
    } else {
      g.fillStyle = `#${base.clone().offsetHSL(0, 0, -0.08).getHexString()}`; g.fillRect(0, 0, W, H);
      for (const [x, y, fw, fh, c] of [[0.08, 0.07, 0.84, 0.46, base.clone().offsetHSL(0.02, 0.05, 0.12)], [0.08, 0.58, 0.84, 0.34, base.clone().offsetHSL(-0.04, -0.1, -0.1)]]) {
        for (let k = 0; k < 40; k++) {
          const cc = c.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08);
          g.fillStyle = rgba(cc, 0.12); g.filter = 'blur(6px)';
          g.fillRect(W * x + (rand() - 0.5) * 12, H * y + (rand() - 0.5) * 12, W * fw, H * fh);
        }
      }
      g.filter = 'none';
      g.fillStyle = 'rgba(214,176,98,0.8)'; g.fillRect(W * 0.08, H * 0.535, W * 0.84, 3);
    }
    speckle(g, W, H, rand, 0.06, 5000);
  });
}

// A small photo print for standing frames on shelves and nightstands.
export function snapshotTexture(seed) {
  return canvasTex(`snap:${seed}`, 128, 160, (g, W, H) => {
    const rand = rng(seed);
    const top = `hsl(${(rand() * 360) | 0},25%,${60 + rand() * 20}%)`, bot = `hsl(${(rand() * 360) | 0},20%,${35 + rand() * 20}%)`;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(30,25,20,0.55)'; g.beginPath(); g.ellipse(W / 2, H * 0.75, 26, 40, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(W / 2, H * 0.42, 15, 0, Math.PI * 2); g.fill();
  });
}

// Outdoor view used by windows when there is no HDR sky (real-time fallback).
export function windowView() {
  return canvasTex('window', 512, 512, (g, W, H) => {
    const rand = rng('window');
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#cfe3f2'); sky.addColorStop(0.6, '#eef4f4'); sky.addColorStop(1, '#dfe8dc');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.filter = 'blur(10px)';
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${90 + rand() * 40},${120 + rand() * 40},${80 + rand() * 30},0.55)`; g.beginPath(); g.arc(rand() * W, H * 0.55 + rand() * H * 0.5, 30 + rand() * 70, 0, Math.PI * 2); g.fill(); }
    g.filter = 'none';
  });
}
