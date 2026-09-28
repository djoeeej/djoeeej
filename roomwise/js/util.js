// Small shared helpers: math, easing, seeded randomness, a tween runner and formatting.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

export const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// Deterministic PRNG so generated art, rugs and bookshelves look the same every time.
export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Tween runner driven by the stage's render loop. Returns true while anything is running.
export class Tweens {
  constructor() { this.list = new Set(); }
  add({ duration = 600, delay = 0, easing = ease.inOutCubic, update, done }) {
    const tw = { start: performance.now() + delay, duration: reducedMotion() ? 0 : duration, easing, update, done, dead: false };
    this.list.add(tw);
    return () => { tw.dead = true; this.list.delete(tw); };
  }
  step(now) {
    for (const tw of this.list) {
      if (tw.dead) { this.list.delete(tw); continue; }
      if (now < tw.start) continue;
      const t = tw.duration <= 0 ? 1 : clamp((now - tw.start) / tw.duration, 0, 1);
      tw.update?.(tw.easing(t));
      if (t >= 1) { this.list.delete(tw); tw.done?.(); }
    }
    return this.list.size > 0;
  }
}

// ---- formatting -------------------------------------------------------------

export function fmtLen(m, units) {
  if (units === 'imperial') {
    const totalIn = m / 0.0254;
    let ft = Math.floor(totalIn / 12);
    let inch = Math.round(totalIn - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return `${ft}′ ${inch}″`;
  }
  return `${m.toFixed(2)} m`;
}

export function fmtArea(m2, units) {
  return units === 'imperial' ? `${Math.round(m2 * 10.7639)} ft²` : `${m2.toFixed(1)} m²`;
}

export function fmtCm(cm, units) {
  return units === 'imperial' ? `${Math.round(cm / 2.54)}″` : `${Math.round(cm)} cm`;
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const fmtMoney = (usd) => money.format(Math.round(usd));

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c.nodeType ? c : document.createTextNode(c));
  return node;
}

export function readToken(name, fallback = '#888888') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(`roomwise:${key}`); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(`roomwise:${key}`, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};
