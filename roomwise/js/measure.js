// Measuring a room from one photo.
//
// The photo is modelled as a one-point perspective view of a box-shaped room. The user marks
// the back wall (a rectangle) and the eye-level vanishing point. With the lens focal length
// (from EXIF, or a typical phone lens) and one known length (ceiling height or wall width),
// similar triangles give the wall size, the camera's distance from the wall and its height.
//
//   metres per pixel on the back wall   s = known length / its length in pixels
//   wall width, height                  W = w_px * s,  H = h_px * s
//   camera distance from the back wall  dist = f_px * s
//   room depth                          D = dist + distance from camera to the wall behind you
//   camera height                       (floor line y - vanishing point y) * s

export function focalPx(focal35, width, height) {
  return (focal35 / 43.2666) * Math.hypot(width, height);
}

export function solveRoom({ rect, vp, width, height, focal35, ref, stand }) {
  const fpx = focalPx(focal35, width, height);
  const wpx = rect.r - rect.l, hpx = rect.b - rect.t;
  const s = ref.kind === 'width' ? ref.value / wpx : ref.value / hpx;
  const W = wpx * s, H = hpx * s;
  const camDist = fpx * s;
  const D = camDist + stand;
  return { W, H, D, area: W * D, camDist, camX: (vp.x - rect.l) * s, camY: (rect.b - vp.y) * s, fpx, s };
}

export function defaultMarks(width, height) {
  return {
    rect: { l: width * 0.2, r: width * 0.8, t: height * 0.2, b: height * 0.72 },
    vp: { x: width * 0.5, y: height * 0.48 },
  };
}

const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
}

const HANDLE_NAMES = { tl: 'Top-left corner of the back wall', tr: 'Top-right corner of the back wall', br: 'Bottom-right corner of the back wall', bl: 'Bottom-left corner of the back wall', vp: 'Eye level: where the room edges meet' };

export class MeasureTool {
  constructor({ stage, img, svg, loupe, onChange }) {
    this.stage = stage; this.img = img; this.svg = svg; this.loupe = loupe; this.onChange = onChange;
    this.photo = null;
    this.rect = null; this.vp = null;
    this.labels = { w: '', h: '', d: '' };
    this.k = 1;
    this.build();
    new ResizeObserver(() => this.layout()).observe(stage);
  }

  build() {
    const svg = this.svg;
    const defs = s('defs', {}, svg);
    const clip = s('clipPath', { id: 'imgClip' }, defs);
    this.clipRect = s('rect', { x: 0, y: 0 }, clip);
    const planes = s('g', { 'clip-path': 'url(#imgClip)', class: 'm-planes' }, svg);
    this.floor = s('polygon', { class: 'm-floor' }, planes);
    this.ceil = s('polygon', { class: 'm-ceil' }, planes);
    this.lwall = s('polygon', { class: 'm-side' }, planes);
    this.rwall = s('polygon', { class: 'm-side' }, planes);
    const rays = s('g', { 'clip-path': 'url(#imgClip)', class: 'm-rays' }, svg);
    this.rays = [0, 1, 2, 3].map(() => s('line', {}, rays));
    this.horizon = s('line', { class: 'm-horizon' }, rays);
    this.back = s('rect', { class: 'm-back' }, svg);
    this.dimW = this.makeDim(svg);
    this.dimH = this.makeDim(svg);
    this.dimD = this.makeDim(svg);
    this.handles = {};
    for (const id of ['tl', 'tr', 'br', 'bl', 'vp']) {
      const g = s('g', { class: `m-handle m-${id === 'vp' ? 'vp' : 'corner'}`, 'data-handle': id, tabindex: 0, role: 'slider', 'aria-label': HANDLE_NAMES[id] }, svg);
      s('circle', { class: 'm-hit' }, g);
      s('circle', { class: 'm-dot' }, g);
      if (id === 'vp') { s('line', { class: 'm-cross' }, g); s('line', { class: 'm-cross' }, g); s('text', { class: 'm-vp-label' }, g).textContent = 'Eye level'; }
      this.handles[id] = g;
      g.addEventListener('keydown', (e) => this.onKey(e, id));
    }
    svg.addEventListener('pointerdown', (e) => this.onDown(e));
    svg.addEventListener('pointermove', (e) => this.onMove(e));
    svg.addEventListener('pointerup', (e) => this.onUp(e));
    svg.addEventListener('pointercancel', (e) => this.onUp(e));
  }

  makeDim(svg) {
    const g = s('g', { class: 'm-dim' }, svg);
    return { g, line: s('line', {}, g), t0: s('line', {}, g), t1: s('line', {}, g), tag: s('rect', { class: 'm-tag' }, g), text: s('text', { class: 'm-tag-text' }, g) };
  }

  setPhoto(photo, marks) {
    this.photo = photo;
    this.img.src = photo.url;
    this.rect = { ...marks.rect };
    this.vp = { ...marks.vp };
    this.clipRect.setAttribute('width', photo.width);
    this.clipRect.setAttribute('height', photo.height);
    this.layout();
  }

  setLabels(labels) {
    this.labels = labels;
    this.render();
  }

  // Fit the photo inside the stage and map the SVG to photo pixels.
  layout() {
    if (!this.photo) return;
    const box = this.stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const pad = box.width < 600 ? 18 : 28;
    const { width: W, height: H } = this.photo;
    const k = Math.min((box.width - pad * 2) / W, (box.height - pad * 2) / H);
    const dw = W * k, dh = H * k;
    const ox = (box.width - dw) / 2, oy = (box.height - dh) / 2;
    Object.assign(this.img.style, { left: `${ox}px`, top: `${oy}px`, width: `${dw}px`, height: `${dh}px` });
    this.svg.setAttribute('viewBox', `${-ox / k} ${-oy / k} ${box.width / k} ${box.height / k}`);
    this.k = k;
    this.display = { ox, oy, dw, dh, k };
    this.render();
  }

  render() {
    if (!this.photo || !this.rect) return;
    const { l, r, t, b } = this.rect, vp = this.vp, u = 1 / this.k;
    const far = (x, y) => [vp.x + (x - vp.x) * 40, vp.y + (y - vp.y) * 40];
    const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
    const TL = [l, t], TR = [r, t], BR = [r, b], BL = [l, b];
    this.floor.setAttribute('points', pts([BL, far(...BL), far(...BR), BR]));
    this.ceil.setAttribute('points', pts([TL, far(...TL), far(...TR), TR]));
    this.lwall.setAttribute('points', pts([TL, far(...TL), far(...BL), BL]));
    this.rwall.setAttribute('points', pts([TR, far(...TR), far(...BR), BR]));
    [TL, TR, BR, BL].forEach((c, i) => {
      const [fx, fy] = far(...c);
      Object.entries({ x1: c[0], y1: c[1], x2: fx, y2: fy }).forEach(([a, v]) => this.rays[i].setAttribute(a, v));
    });
    Object.entries({ x1: -this.photo.width, x2: this.photo.width * 2, y1: vp.y, y2: vp.y }).forEach(([a, v]) => this.horizon.setAttribute(a, v));
    Object.entries({ x: l, y: t, width: r - l, height: b - t }).forEach(([a, v]) => this.back.setAttribute(a, v));

    const inset = 16 * u;
    this.placeDim(this.dimW, [l, b - inset], [r, b - inset], this.labels.w, u);
    this.placeDim(this.dimH, [l + inset, t], [l + inset, b], this.labels.h, u);
    // Depth runs along the floor edge from the back-left corner toward the camera.
    const dx = BL[0] - vp.x, dy = BL[1] - vp.y;
    const len = Math.hypot(dx, dy) || 1;
    const tBottom = dy > 0 ? (this.photo.height - BL[1]) / dy : 0.6;
    const tLeft = dx < 0 ? (0 - BL[0]) / dx : 0.6;
    const reach = Math.max(0.15, Math.min(tBottom, tLeft, 3));
    const end = [BL[0] + dx * reach, BL[1] + dy * reach];
    const off = 10 * u, nx = -dy / len * off, ny = dx / len * off;
    this.placeDim(this.dimD, [BL[0] + nx, BL[1] + ny], [end[0] + nx, end[1] + ny], this.labels.d, u, 0.5, true);

    const corner = { tl: TL, tr: TR, br: BR, bl: BL, vp: [vp.x, vp.y] };
    for (const [id, g] of Object.entries(this.handles)) {
      const [x, y] = corner[id];
      g.setAttribute('transform', `translate(${x} ${y})`);
      g.querySelector('.m-hit').setAttribute('r', 24 * u);
      g.querySelector('.m-dot').setAttribute('r', (id === 'vp' ? 8 : 9) * u);
      if (id === 'vp') {
        const [a, c] = g.querySelectorAll('.m-cross');
        [['x1', -14 * u], ['x2', 14 * u], ['y1', 0], ['y2', 0]].forEach(([k, v]) => a.setAttribute(k, v));
        [['y1', -14 * u], ['y2', 14 * u], ['x1', 0], ['x2', 0]].forEach(([k, v]) => c.setAttribute(k, v));
        const lab = g.querySelector('.m-vp-label');
        lab.setAttribute('x', 18 * u); lab.setAttribute('y', -10 * u); lab.setAttribute('font-size', 12 * u);
      }
    }
  }

  placeDim(dim, a, b, label, u, at = 0.5, besideLine = false) {
    const set = (el, o) => Object.entries(o).forEach(([k, v]) => el.setAttribute(k, v));
    set(dim.line, { x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 6 * u, ny = (dx / len) * 6 * u;
    set(dim.t0, { x1: a[0] - nx, y1: a[1] - ny, x2: a[0] + nx, y2: a[1] + ny });
    set(dim.t1, { x1: b[0] - nx, y1: b[1] - ny, x2: b[0] + nx, y2: b[1] + ny });
    const fs = 13 * u;
    const w = (label.length * 0.6 + 1.3) * fs, h = fs * 1.75;
    // Labels on slanted lines sit beside the line, over the floor, so they stay inside the photo.
    const cx = a[0] + dx * at + (besideLine ? w / 2 + 8 * u : 0), cy = a[1] + dy * at;
    set(dim.tag, { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 3 * u });
    set(dim.text, { x: cx, y: cy + fs * 0.36, 'font-size': fs });
    dim.text.textContent = label;
    dim.g.style.display = label ? '' : 'none';
  }

  toImage(e) {
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
  }

  pointOf(id) {
    const { l, r, t, b } = this.rect;
    return { tl: { x: l, y: t }, tr: { x: r, y: t }, br: { x: r, y: b }, bl: { x: l, y: b }, vp: this.vp }[id];
  }

  moveHandle(id, x, y) {
    const W = this.photo.width, H = this.photo.height, min = Math.min(W, H) * 0.06;
    x = Math.min(W * 1.3, Math.max(-W * 0.3, x));
    y = Math.min(H * 1.3, Math.max(-H * 0.3, y));
    const R = this.rect;
    if (id === 'vp') { this.vp = { x: Math.min(W, Math.max(0, x)), y: Math.min(H, Math.max(0, y)) }; return; }
    if (id[1] === 'l') R.l = Math.min(x, R.r - min); else R.r = Math.max(x, R.l + min);
    if (id[0] === 't') R.t = Math.min(y, R.b - min); else R.b = Math.max(y, R.t + min);
  }

  onDown(e) {
    const g = e.target.closest?.('[data-handle]');
    if (!g) return;
    e.preventDefault();
    const id = g.dataset.handle, p = this.toImage(e), h = this.pointOf(id);
    this.drag = { id, dx: h.x - p.x, dy: h.y - p.y };
    this.svg.setPointerCapture(e.pointerId);
    g.classList.add('is-dragging');
    this.onMove(e);
  }

  onMove(e) {
    if (!this.drag) return;
    const p = this.toImage(e);
    this.moveHandle(this.drag.id, p.x + this.drag.dx, p.y + this.drag.dy);
    this.render();
    this.showLoupe(e, this.pointOf(this.drag.id));
    this.onChange?.(false);
  }

  onUp() {
    if (!this.drag) return;
    this.handles[this.drag.id].classList.remove('is-dragging');
    this.drag = null;
    this.loupe.hidden = true;
    this.onChange?.(true);
  }

  onKey(e, id) {
    const step = e.shiftKey ? 12 : 3;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const p = this.pointOf(id);
    this.moveHandle(id, p.x + d[0], p.y + d[1]);
    this.render();
    this.onChange?.(true);
  }

  // Magnifier above the finger so the corner stays visible while dragging.
  showLoupe(e, pt) {
    const size = 116, zoom = 3, k = this.k;
    const box = this.stage.getBoundingClientRect();
    let left = e.clientX - box.left - size / 2;
    let top = e.clientY - box.top - size - 44;
    if (top < 6) top = e.clientY - box.top + 44;
    left = Math.max(6, Math.min(box.width - size - 6, left));
    const L = this.loupe;
    L.hidden = false;
    L.style.left = `${left}px`;
    L.style.top = `${top}px`;
    L.style.backgroundImage = `url("${this.photo.url}")`;
    L.style.backgroundSize = `${this.photo.width * k * zoom}px ${this.photo.height * k * zoom}px`;
    L.style.backgroundPosition = `${size / 2 - pt.x * k * zoom}px ${size / 2 - pt.y * k * zoom}px`;
  }
}

// Point a three.js PerspectiveCamera exactly where the phone was, so 3D furniture lines up
// with the photo. The vanishing point becomes the principal point via a view offset.
export function matchPhotoCamera(camera, { fpx, vp, width, height, camX, camY, camDist }) {
  const fullW = 2 * Math.max(vp.x, width - vp.x);
  const fullH = 2 * Math.max(vp.y, height - vp.y);
  camera.fov = (2 * Math.atan(fullH / 2 / fpx) * 180) / Math.PI;
  camera.aspect = fullW / fullH;
  camera.setViewOffset(fullW, fullH, fullW / 2 - vp.x, fullH / 2 - vp.y, width, height);
  camera.position.set(camX, camY, camDist);
  camera.up.set(0, 1, 0);
  camera.lookAt(camX, camY, 0);
  camera.updateProjectionMatrix();
}
