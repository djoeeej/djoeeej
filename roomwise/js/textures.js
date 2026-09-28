// Procedural canvas textures: wood, marble, rugs and artwork. Cached by key.
import * as THREE from 'three';
import { rng } from './util.js';

const cache = new Map();

function canvasTex(key, w, h, draw, { repeat = null, srgb = true } = {}) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
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

// Greyscale grain, multiplied by each wood material's colour.
export function woodGrain() {
  return canvasTex('grain', 256, 1024, (g, w, h) => {
    const rand = rng('grain');
    g.fillStyle = '#e8e8e8';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = rand() * w;
      const a = 0.04 + rand() * 0.09;
      g.strokeStyle = `rgba(60,40,20,${a})`;
      g.lineWidth = 0.6 + rand() * 2.4;
      g.beginPath();
      let px = x;
      for (let y = 0; y <= h; y += 16) {
        px += (rand() - 0.5) * 3;
        y === 0 ? g.moveTo(px, y) : g.lineTo(px, y);
      }
      g.stroke();
    }
    speckle(g, w, h, rand, 0.05, 1500);
  });
}

// Oak plank floor for the designed room and the sample photo.
export function floorPlanks(tone = '#b98f62') {
  return canvasTex(`floor:${tone}`, 1024, 1024, (g, w, h) => {
    const rand = rng('planks' + tone);
    const rows = 8;
    const ph = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 400;
      while (x < w) {
        const len = 380 + rand() * 420;
        g.fillStyle = shade(tone, (rand() - 0.5) * 0.08);
        g.fillRect(x, r * ph, len, ph);
        for (let i = 0; i < 14; i++) {
          g.strokeStyle = `rgba(70,45,20,${0.05 + rand() * 0.1})`;
          g.lineWidth = 0.8 + rand() * 1.6;
          const y = r * ph + rand() * ph;
          g.beginPath();
          g.moveTo(x, y);
          g.bezierCurveTo(x + len * 0.3, y + (rand() - 0.5) * 8, x + len * 0.7, y + (rand() - 0.5) * 8, x + len, y + (rand() - 0.5) * 4);
          g.stroke();
        }
        g.fillStyle = 'rgba(40,25,10,0.45)';
        g.fillRect(x, r * ph, 2, ph);
        x += len;
      }
      g.fillStyle = 'rgba(40,25,10,0.4)';
      g.fillRect(0, r * ph, w, 2);
    }
    speckle(g, w, h, rand, 0.04, 6000);
  }, { repeat: true });
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
      for (let s = 0; s < 14; s++) {
        x += (rand() - 0.3) * 140;
        y += 40 + rand() * 90;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.filter = 'none';
    speckle(g, w, h, rand, 0.05, 3000);
  });
}

// Rugs: stripe (flatweave), trellis (tufted wool), medallion (hand-knotted), solid (bath mat).
export function rugTexture(pattern, color, w, d) {
  const cw = 512, ch = Math.max(128, Math.round((512 * d) / w));
  return canvasTex(`rug:${pattern}:${color}:${cw}x${ch}`, cw, ch, (g, W, H) => {
    const rand = rng(pattern + color);
    const base = new THREE.Color(color);
    const hsl = {}; base.getHSL(hsl);
    const light = shade(color, 0.28);
    const dark = shade(color, -0.12);
    const cream = '#ece4d3';
    if (pattern === 'solid') {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      speckle(g, W, H, rand, 0.12, 9000);
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
      return;
    }
    if (pattern === 'stripe') {
      g.fillStyle = cream; g.fillRect(0, 0, W, H);
      let y = 0;
      while (y < H) {
        const bh = 6 + rand() * 30;
        const pick = rand();
        g.fillStyle = pick < 0.45 ? color : pick < 0.6 ? dark : pick < 0.8 ? cream : light;
        g.fillRect(0, y, W, bh);
        y += bh;
      }
      for (let i = 0; i < 1800; i++) {
        g.fillStyle = `rgba(0,0,0,${rand() * 0.06})`;
        g.fillRect(rand() * W, rand() * H, 3, 1);
      }
      return;
    }
    if (pattern === 'trellis') {
      g.fillStyle = color; g.fillRect(0, 0, W, H);
      g.strokeStyle = light; g.lineWidth = 5;
      const step = 64;
      for (let x = -H; x < W + H; x += step) {
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke();
        g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke();
      }
      g.strokeStyle = cream; g.lineWidth = 14; g.strokeRect(16, 16, W - 32, H - 32);
      speckle(g, W, H, rand, 0.08, 8000);
      return;
    }
    // medallion
    const rust = hsl.h > 0.5 ? '#8a3a2e' : '#2f3f63';
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    const bands = [[0, '#2a2522'], [10, cream], [18, rust], [40, cream], [46, dark]];
    for (const [inset, c] of bands) { g.fillStyle = c; g.fillRect(inset, inset, W - inset * 2, H - inset * 2); }
    g.fillStyle = color; g.fillRect(52, 52, W - 104, H - 104);
    // border motifs
    g.fillStyle = cream;
    for (let x = 30; x < W - 20; x += 22) { g.beginPath(); g.arc(x, 29, 4, 0, Math.PI * 2); g.arc(x, H - 29, 4, 0, Math.PI * 2); g.fill(); }
    // central medallion
    const cx = W / 2, cy = H / 2;
    const layers = [[0.36, rust], [0.28, cream], [0.21, dark], [0.13, light], [0.06, rust]];
    for (const [r, c] of layers) {
      g.fillStyle = c;
      g.beginPath();
      const rx = W * r, ry = H * r * 1.1;
      for (let a = 0; a <= 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const k = a % 2 === 0 ? 1 : 0.8;
        g.lineTo(cx + Math.cos(ang) * rx * k, cy + Math.sin(ang) * ry * k);
      }
      g.fill();
    }
    // field ornaments
    for (let i = 0; i < 60; i++) {
      const x = 70 + rand() * (W - 140), y = 70 + rand() * (H - 140);
      if (Math.hypot((x - cx) / W, (y - cy) / H) < 0.4) continue;
      g.fillStyle = rand() < 0.5 ? light : rust;
      g.save(); g.translate(x, y); g.rotate(Math.PI / 4);
      g.fillRect(-4, -4, 8, 8); g.restore();
    }
    speckle(g, W, H, rand, 0.1, 9000);
  });
}

// Artwork: print (graphic), abstract (colour fields and strokes), oil (layered colour-field painting).
export function artTexture(style, color, seed, w, h) {
  const cw = 512, ch = Math.round((512 * h) / w);
  return canvasTex(`art:${style}:${color}:${seed}:${ch}`, cw, ch, (g, W, H) => {
    const rand = rng(`${style}${color}${seed}`);
    if (style === 'print') {
      g.fillStyle = '#f2ede4'; g.fillRect(0, 0, W, H);
      const hue = new THREE.Color(color);
      const alt = `#${hue.clone().offsetHSL(0.45, -0.1, 0.05).getHexString()}`;
      if (rand() < 0.5 || seed.includes('Sun')) {
        for (let i = 0; i < 3; i++) {
          g.strokeStyle = i === 1 ? alt : color; g.lineWidth = 34;
          g.beginPath(); g.arc(W / 2, H * 0.72, 70 + i * 48, Math.PI, 0); g.stroke();
        }
        g.fillStyle = color; g.beginPath(); g.arc(W * 0.72, H * 0.24, 42, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = color; g.fillRect(W * 0.12, H * 0.14, W * 0.46, H * 0.44);
        g.fillStyle = alt; g.fillRect(W * 0.42, H * 0.46, W * 0.44, H * 0.38);
        g.strokeStyle = '#2a2a2a'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(W * 0.1, H * 0.9); g.lineTo(W * 0.9, H * 0.1); g.stroke();
      }
      speckle(g, W, H, rand, 0.04, 2000);
      return;
    }
    if (style === 'abstract') {
      g.fillStyle = '#ebe5d9'; g.fillRect(0, 0, W, H);
      const base = new THREE.Color(color);
      for (let i = 0; i < 60; i++) {
        const c = base.clone().offsetHSL((rand() - 0.5) * 0.12, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.35);
        g.fillStyle = `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${0.15 + rand() * 0.35})`;
        g.beginPath();
        g.ellipse(rand() * W, rand() * H, 30 + rand() * 160, 10 + rand() * 60, rand() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = 'rgba(30,30,30,0.7)'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(rand() * W, rand() * H);
        g.bezierCurveTo(rand() * W, rand() * H, rand() * W, rand() * H, rand() * W, rand() * H);
        g.stroke();
      }
      g.fillStyle = 'rgba(214,176,98,0.85)';
      g.fillRect(W * (0.2 + rand() * 0.5), H * (0.2 + rand() * 0.5), 60, 6);
      speckle(g, W, H, rand, 0.05, 3000);
      return;
    }
    // oil
    const base = new THREE.Color(color);
    g.fillStyle = `#${base.clone().offsetHSL(0, 0, -0.08).getHexString()}`; g.fillRect(0, 0, W, H);
    const fields = [
      [0.08, 0.07, 0.84, 0.46, base.clone().offsetHSL(0.02, 0.05, 0.12)],
      [0.08, 0.58, 0.84, 0.34, base.clone().offsetHSL(-0.04, -0.1, -0.1)],
    ];
    for (const [x, y, fw, fh, c] of fields) {
      for (let k = 0; k < 40; k++) {
        const cc = c.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08);
        g.fillStyle = `rgba(${(cc.r * 255) | 0},${(cc.g * 255) | 0},${(cc.b * 255) | 0},0.12)`;
        g.filter = 'blur(6px)';
        g.fillRect(W * x + (rand() - 0.5) * 12, H * y + (rand() - 0.5) * 12, W * fw, H * fh);
      }
    }
    g.filter = 'none';
    g.fillStyle = 'rgba(214,176,98,0.8)';
    g.fillRect(W * 0.08, H * 0.535, W * 0.84, 3);
    speckle(g, W, H, rand, 0.08, 7000);
  });
}

// Bright window view for the sample photo.
export function windowView() {
  return canvasTex('window', 512, 512, (g, W, H) => {
    const rand = rng('window');
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#cfe3f2'); sky.addColorStop(0.6, '#eef4f4'); sky.addColorStop(1, '#dfe8dc');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.filter = 'blur(10px)';
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(${90 + rand() * 40},${120 + rand() * 40},${80 + rand() * 30},0.55)`;
      g.beginPath(); g.arc(rand() * W, H * 0.55 + rand() * H * 0.5, 30 + rand() * 70, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none';
  });
}
