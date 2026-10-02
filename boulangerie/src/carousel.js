// ─────────────────────────────────────────────────────────────
// Home page: a 3D ring of real photos on a glossy counter.
// Drag to turn it, tap a photo to open the product.
// ─────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shown until (or instead of) a photo: warm gradient with the product name.
function placeholderTexture(name) {
  return canvasTexture(640, 800, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.5, h * 0.62, 20, w * 0.5, h * 0.55, h * 0.75);
    g.addColorStop(0, '#d9963f'); g.addColorStop(0.55, '#7a3a12'); g.addColorStop(1, '#24170f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f2ede3';
    ctx.font = '52px Gloock, Georgia, serif';
    ctx.textAlign = 'center';
    const words = name.split(' ');
    const lines = [];
    let line = '';
    for (const wd of words) { const tl = line ? `${line} ${wd}` : wd; if (ctx.measureText(tl).width > w * 0.8) { lines.push(line); line = wd; } else line = tl; }
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, w / 2, h - 90 - (lines.length - 1 - i) * 60));
  });
}

// Crop a photo texture to the card's aspect ratio, like CSS object-fit: cover.
function coverCrop(tex, cardAspect, [fx, fy] = [0.5, 0.5]) {
  const img = tex.image;
  const a = img.width / img.height;
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  if (a > cardAspect) { tex.repeat.x = cardAspect / a; tex.offset.x = (1 - tex.repeat.x) * fx; }
  else { tex.repeat.y = a / cardAspect; tex.offset.y = (1 - tex.repeat.y) * (1 - fy); }
  tex.needsUpdate = true;
}

function makeCarousel(host, items, { onFront, onOpen, reduced }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  canvas.className = 'carousel-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const N = items.length, STEP = TAU / N;
  const R = Math.max(3.1, (N * 1.75) / TAU);
  const W = 1.5, H = 1.875, ASPECT = W / H;
  const ring = new THREE.Group();
  scene.add(ring);

  const mask = canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; roundedRectPath(ctx, 1, 1, w - 2, h - 2, 22); ctx.fill();
  }, false);
  const fadeMask = canvasTexture(256, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#fff'); g.addColorStop(0.45, '#000'); g.addColorStop(1, '#000');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
    roundedRectPath(ctx, 1, 1, w - 2, h - 2, 22); ctx.save(); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
  }, false);

  // Card geometry bent onto the ring
  const geo = new THREE.PlaneGeometry(W, H, 24, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), a = x / R;
    p.setXYZ(i, Math.sin(a) * R, y + H / 2 + 0.04, Math.cos(a) * R);
  }
  geo.computeVertexNormals();

  const loader = new THREE.TextureLoader();
  const cards = items.map((item, i) => {
    const holder = new THREE.Group();
    holder.rotation.y = i * STEP;
    const mat = new THREE.MeshBasicMaterial({ map: placeholderTexture(item.name), alphaMap: mask, transparent: true, alphaTest: 0.02 });
    const refl = new THREE.MeshBasicMaterial({ map: mat.map, alphaMap: fadeMask, transparent: true, opacity: 0.3, depthWrite: false });
    const card = new THREE.Mesh(geo, mat);
    const mirror = new THREE.Mesh(geo, refl);
    mirror.scale.y = -1;
    holder.add(card, mirror);
    ring.add(holder);
    card.userData.index = i;
    return { card, mat, refl };
  });

  function setPhoto(i, src, focus) {
    const { mat, refl } = cards[i];
    loader.load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      coverCrop(tex, ASPECT, focus);
      mat.map.dispose();
      mat.map = tex; refl.map = tex;
      mat.needsUpdate = true; refl.needsUpdate = true;
    });
  }
  items.forEach((item, i) => { if (item.src) setPhoto(i, item.src, item.focus); });

  // Warm pool of light on the counter under the front photo
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 3).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(233,164,64,0.55)'); g.addColorStop(1, 'rgba(233,164,64,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.set(0, 0.001, R);
  scene.add(glow);

  // Flour drifting in the light
  const FN = 220, fpos = new Float32Array(FN * 3), fspeed = new Float32Array(FN), fphase = new Float32Array(FN);
  const r = rng(6);
  for (let i = 0; i < FN; i++) {
    fpos[i * 3] = (r() * 2 - 1) * 3.4; fpos[i * 3 + 1] = r() * 2.6; fpos[i * 3 + 2] = R - 1.4 + r() * 2.8;
    fspeed[i] = 0.03 + r() * 0.07; fphase[i] = r() * TAU;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const flour = new THREE.Points(fgeo, new THREE.PointsMaterial({
    map: canvasTexture(64, 64, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,248,236,1)'); g.addColorStop(0.4, 'rgba(255,248,236,0.5)'); g.addColorStop(1, 'rgba(255,248,236,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
    }),
    size: 0.035, transparent: true, opacity: 0.55, depthWrite: false,
  }));
  flour.frustumCulled = false;
  scene.add(flour);

  // State
  let angle = 0, target = 0, velocity = 0, dragging = false, moved = 0, lastX = 0, lastT = 0;
  let front = -1, visible = true, hovering = false, autoTimer = 0, last = performance.now();
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster();
  const frontIndex = () => (((Math.round(-target / STEP) % N) + N) % N);

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Narrow screens: come closer so the front photo fills the frame.
    const dist = camera.aspect < 0.9 ? 4.1 / Math.max(camera.aspect, 0.6) : 4.6;
    camera.position.set(0, 0.95, R + dist);
    camera.lookAt(0, 0.82, R - 0.4);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  function goTo(i) {
    const cur = frontIndex();
    let d = ((i - cur) % N + N) % N;
    if (d > N / 2) d -= N;
    target -= d * STEP;
  }

  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(cards.map((c) => c.card))[0];
    return hit ? hit.object.userData.index : -1;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); velocity = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) {
      if (e.pointerType === 'mouse') canvas.style.cursor = pick(e) >= 0 ? 'pointer' : 'grab';
      return;
    }
    const now = performance.now(), dx = e.clientX - lastX;
    moved += Math.abs(dx);
    const da = (dx / canvas.clientWidth) * 2.2;
    angle += da; target = angle;
    velocity = da / Math.max(1, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (moved < 6) {
      const i = pick(e);
      if (i >= 0) { if (i === frontIndex()) onOpen(i); else goTo(i); }
      return;
    }
    target = Math.round((angle + velocity * 10) / STEP) * STEP;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  host.addEventListener('pointerenter', () => { hovering = true; });
  host.addEventListener('pointerleave', () => { hovering = false; });
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    if (!reduced && !dragging && !hovering) {
      autoTimer += dt;
      if (autoTimer > 4.2) { autoTimer = 0; target -= STEP; }
    } else if (dragging || hovering) autoTimer = 0;
    if (!dragging) {
      const k = reduced ? 1 : Math.min(1, dt * 4.5);
      angle += (target - angle) * k;
    }
    ring.rotation.y = angle;
    for (let i = 0; i < N; i++) {
      const facing = Math.cos(i * STEP + angle);
      const lit = 0.18 + 0.82 * Math.pow(Math.max(0, facing), 2.2);
      cards[i].mat.color.setScalar(lit);
      cards[i].refl.opacity = 0.32 * lit;
    }
    if (!reduced) {
      for (let i = 0; i < FN; i++) {
        fpos[i * 3 + 1] += fspeed[i] * dt;
        fpos[i * 3] += Math.sin(now * 0.0004 + fphase[i]) * 0.0012;
        if (fpos[i * 3 + 1] > 2.6) fpos[i * 3 + 1] = 0;
      }
      fgeo.attributes.position.needsUpdate = true;
    }
    const f = frontIndex();
    if (f !== front) { front = f; onFront(f); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  return {
    goTo,
    setPhoto,
    next: () => { target -= STEP; autoTimer = 0; },
    prev: () => { target += STEP; autoTimer = 0; },
    setNames(names) {
      // Re-draw placeholders (for cards whose photo hasn't loaded) in the new language.
      cards.forEach((c, i) => {
        if (c.mat.map && c.mat.map.isCanvasTexture) {
          c.mat.map.dispose();
          c.mat.map = c.refl.map = placeholderTexture(names[i]);
          c.mat.needsUpdate = c.refl.needsUpdate = true;
        }
      });
    },
  };
}
