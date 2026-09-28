// The 3D stage. One WebGL canvas with four views:
//   room   dollhouse view you can orbit a full 360° (walls facing the camera hide themselves)
//   walk   stand inside the room at eye height and drag to look all the way around
//   photo  the design rendered from the phone's exact position over the original photo
//   studio a single piece on a turntable with its dimensions
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildModel } from './models.js';
import { floorPlanks } from './textures.js';
import { matchPhotoCamera } from './measure.js';
import { Tweens, ease, clamp, readToken } from './util.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAPE = '#ffc933';
const WALL_DEFAULT = '#ebe8e1';
const EYE = 1.6;

const outlineMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(TAPE) }, uOpacity: { value: 0.9 }, uThickness: { value: 0.014 } },
  vertexShader: `
    uniform float uThickness;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vec3 wn = normalize(mat3(modelMatrix) * normal);
      wp.xyz += wn * uThickness;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform vec3 uColor; uniform float uOpacity;
    void main() { gl_FragColor = vec4(uColor, uOpacity); }`,
  side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false,
});

// Paint on the photo: recolours wall pixels that match the sampled wall colour and keeps
// the photo's own light and shadow by scaling the new colour with the pixel's brightness.
const paintMaterial = (tex) => new THREE.ShaderMaterial({
  uniforms: {
    tPhoto: { value: tex }, uRes: { value: new THREE.Vector2(1, 1) },
    uPaint: { value: new THREE.Color('#ffffff') }, uRef: { value: new THREE.Vector3(0.8, 0.8, 0.8) },
    uTol: { value: 0.55 }, uStrength: { value: 0 },
  },
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tPhoto; uniform vec2 uRes; uniform vec3 uPaint; uniform vec3 uRef;
    uniform float uTol; uniform float uStrength;
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes;
      vec3 photo = texture2D(tPhoto, uv).rgb;
      const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
      float L = dot(photo, LUMA);
      float Lr = max(dot(uRef, LUMA), 1e-3);
      float d = length(photo / max(L, 1e-3) - uRef / Lr) * 0.8 + abs(log2((L + 0.02) / (Lr + 0.02))) * 0.3;
      float m = (1.0 - smoothstep(uTol * 0.55, uTol, d)) * uStrength;
      vec3 painted = uPaint * clamp(L / Lr, 0.0, 1.5);
      gl_FragColor = vec4(mix(photo, painted, m), 1.0);
      #include <colorspace_fragment>
    }`,
  depthWrite: false, toneMapped: false,
});

// Tape-measure dimension lines with HTML labels.
class DimSet {
  constructor(parent, layer) { this.parent = parent; this.layer = layer; this.items = []; }
  add(a, b, text, tickDir = V3(0, 1, 0)) {
    const mat = new THREE.MeshBasicMaterial({ color: TAPE, toneMapped: false });
    const g = new THREE.Group();
    const seg = (p, q, r) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, p.distanceTo(q), 8), mat);
      m.position.copy(p).add(q).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), q.clone().sub(p).normalize());
      g.add(m);
    };
    seg(a, b, 0.007);
    const t = tickDir.clone().normalize().multiplyScalar(0.06);
    seg(a.clone().sub(t), a.clone().add(t), 0.006);
    seg(b.clone().sub(t), b.clone().add(t), 0.006);
    this.parent.add(g);
    const el = document.createElement('div');
    el.className = 'dim-tag';
    el.textContent = text;
    this.layer.append(el);
    this.items.push({ g, el, mid: a.clone().add(b).multiplyScalar(0.5), mat });
  }
  update(camera, off) {
    const v = V3();
    for (const it of this.items) {
      v.copy(it.mid).project(camera);
      const hide = v.z > 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1 || !it.g.parent?.visible;
      it.el.hidden = hide;
      if (hide) continue;
      it.el.style.transform = `translate(${off.x + ((v.x + 1) / 2) * off.w}px, ${off.y + ((1 - v.y) / 2) * off.h}px) translate(-50%, -50%)`;
    }
  }
  clear() {
    for (const it of this.items) {
      it.g.traverse((o) => o.geometry?.dispose());
      it.mat.dispose();
      it.g.removeFromParent();
      it.el.remove();
    }
    this.items = [];
  }
}

function disposeGroup(group, mats = []) {
  group.traverse((o) => { if (o.geometry && !o.userData.isOutline) o.geometry.dispose(); });
  mats.forEach((m) => m.dispose());
}

export class Stage {
  constructor({ container, canvas, labels, onPick, onViewChange }) {
    this.container = container;
    this.canvas = canvas;
    this.labelLayer = labels;
    this.onPick = onPick;
    this.onViewChange = onViewChange;
    this.tweens = new Tweens();
    this.mode = 'off';
    this.items = new Map();
    this.selected = null;
    this.dirty = true;
    this.size = { w: 1, h: 1, x: 0, y: 0 };
    this.mobile = matchMedia('(max-width: 700px)').matches;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const scene = (this.scene = new THREE.Scene());
    scene.environment = this.env;
    scene.environmentIntensity = 0.5;
    this.shell = new THREE.Group();
    this.furniture = new THREE.Group();
    this.fx = new THREE.Group();
    this.photoFx = new THREE.Group();
    scene.add(this.shell, this.furniture, this.fx, this.photoFx);
    scene.add(new THREE.HemisphereLight('#f6f4ef', '#9c8a74', 0.95));
    this.sun = new THREE.DirectionalLight('#fff3e2', 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);
    this.roomDims = new DimSet(this.fx, labels);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.03, 80);
    this.camera.position.set(6, 5, 8);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', () => this.stopTour());

    this.photoCamera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);

    const st = (this.studio = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(32, 1, 0.02, 60) });
    st.scene.environment = this.env;
    st.scene.environmentIntensity = 0.7;
    st.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8378', 1.0));
    const key = new THREE.DirectionalLight('#fff6ea', 2.4);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 12 });
    key.shadow.bias = -0.0005;
    key.shadow.radius = 4;
    st.scene.add(key);
    st.disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 96), new THREE.MeshStandardMaterial({ color: '#d9ddd6', roughness: 0.8 }));
    st.disc.receiveShadow = true;
    st.disc.position.y = -0.015;
    st.scene.add(st.disc);
    st.controls = new OrbitControls(st.camera, canvas);
    st.controls.enabled = false;
    st.controls.enableDamping = true;
    st.controls.enablePan = false;
    st.controls.autoRotate = true;
    st.controls.autoRotateSpeed = 2.4;
    st.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    st.dims = new DimSet(st.scene, labels);

    this.outlineMat = outlineMaterial();
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), new THREE.MeshBasicMaterial({ color: TAPE, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.fx.add(this.ring);

    this.raycaster = new THREE.Raycaster();
    canvas.addEventListener('pointerdown', (e) => { this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.down) return;
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
      if (moved < 8 && performance.now() - this.down.t < 600) this.pick(e);
      this.down = null;
    });

    new ResizeObserver(() => this.resize()).observe(container);
    const retheme = () => { this.applyTheme(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.applyTheme();
    this.resize();
    r.setAnimationLoop(() => this.tick());
  }

  applyTheme() {
    this.bg = new THREE.Color(readToken('--stage', '#dde2db'));
    this.studio.scene.background = new THREE.Color(readToken('--studio', '#e9ece6'));
    this.studio.disc.material.color.set(readToken('--studio-disc', '#d9ddd6'));
    if (this.mode !== 'photo') this.scene.background = this.bg;
    this.dirty = true;
  }

  // ---- room shell -----------------------------------------------------------------
  setRoom(R) {
    this.R = { ...R };
    disposeGroup(this.shell);
    this.shell.clear();
    const { W, D, H } = R, T = 0.1;
    const tex = floorPlanks('#c29a6b').clone();
    tex.needsUpdate = true;
    tex.repeat.set((W + 2 * T) / 1.8, (D + 2 * T) / 1.8);
    const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * T, 0.1, D + 2 * T), floorMat);
    floor.position.set(W / 2, -0.05, D / 2);
    floor.receiveShadow = true;
    this.shell.add(floor);

    this.wallMats = {};
    this.walls = {};
    const trim = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.55 });
    const specs = {
      back: { size: [W + 2 * T, H, T], pos: [W / 2, H / 2, -T / 2], board: [W, 0.09, 0.015], bpos: [W / 2, 0.045, 0.008], outside: (c) => c.z < -0.02 },
      front: { size: [W + 2 * T, H, T], pos: [W / 2, H / 2, D + T / 2], board: [W, 0.09, 0.015], bpos: [W / 2, 0.045, D - 0.008], outside: (c) => c.z > D + 0.02 },
      left: { size: [T, H, D], pos: [-T / 2, H / 2, D / 2], board: [0.015, 0.09, D], bpos: [0.008, 0.045, D / 2], outside: (c) => c.x < -0.02 },
      right: { size: [T, H, D], pos: [W + T / 2, H / 2, D / 2], board: [0.015, 0.09, D], bpos: [W - 0.008, 0.045, D / 2], outside: (c) => c.x > W + 0.02 },
    };
    for (const [id, s] of Object.entries(specs)) {
      const mat = new THREE.MeshStandardMaterial({ color: WALL_DEFAULT, roughness: 0.95 });
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(...s.size), mat);
      wall.position.set(...s.pos);
      wall.receiveShadow = true;
      const board = new THREE.Mesh(new THREE.BoxGeometry(...s.board), trim);
      board.position.set(...s.bpos);
      board.receiveShadow = true;
      g.add(wall, board);
      g.userData.outside = s.outside;
      this.shell.add(g);
      this.walls[id] = g;
      this.wallMats[id] = mat;
    }
    this.ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#f5f3ef', roughness: 1 }));
    this.ceilingMesh.rotation.x = Math.PI / 2;
    this.ceilingMesh.position.set(W / 2, H, D / 2);
    this.shell.add(this.ceilingMesh);

    this.sun.position.set(W * 0.15 - 2.5, H + 4.5, D + 3.2);
    this.sun.target.position.set(W / 2, 0, D / 2);
    const ext = Math.hypot(W, D) / 2 + 1.5;
    Object.assign(this.sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 30 });
    this.sun.shadow.camera.updateProjectionMatrix();

    this.buildPhotoFx();
    this.setPaint(this.paint ?? { color: null, target: 'all' }, false);
    this.dirty = true;
  }

  showRoomDims(labels) {
    this.roomDims.clear();
    if (!labels || !this.R) return;
    const { W, D, H } = this.R;
    this.roomDims.add(V3(0, 0.02, D + 0.3), V3(W, 0.02, D + 0.3), labels.w, V3(0, 0, 1));
    this.roomDims.add(V3(W + 0.3, 0.02, 0), V3(W + 0.3, 0.02, D), labels.d, V3(1, 0, 0));
    this.roomDims.add(V3(W + 0.3, 0, 0), V3(W + 0.3, H, 0), labels.h, V3(1, 0, 0));
    this.dirty = true;
  }

  // ---- photo overlay ---------------------------------------------------------------
  setPhoto(photo, cam) {
    this.photoInfo = cam;
    this.photoTex?.dispose();
    this.photoTex = new THREE.CanvasTexture(photo.canvas);
    this.photoTex.colorSpace = THREE.SRGBColorSpace;
    matchPhotoCamera(this.photoCamera, cam);
    if (this.R) this.buildPhotoFx();
    if (this.mode === 'photo') { this.scene.background = this.photoTex; this.resize(); }
  }

  buildPhotoFx() {
    this.photoFx.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.photoFx.clear();
    this.paintPlanes = {};
    if (!this.photoTex || !this.R) return;
    const { W, D, H } = this.R;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.ShadowMaterial({ opacity: 0.3 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(W / 2, 0.001, D / 2);
    shadow.receiveShadow = true;
    this.photoFx.add(shadow);
    const mk = (id, w, h, pos, rotY) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paintMaterial(this.photoTex));
      m.position.copy(pos);
      m.rotation.y = rotY;
      m.renderOrder = -1;
      this.photoFx.add(m);
      this.paintPlanes[id] = m;
    };
    mk('back', W, H, V3(W / 2, H / 2, 0.002), 0);
    mk('left', D, H, V3(0.002, H / 2, D / 2), Math.PI / 2);
    mk('right', D, H, V3(W - 0.002, H / 2, D / 2), -Math.PI / 2);
    this.photoFx.visible = this.mode === 'photo';
    if (this.wallRef) this.setWallRef(this.wallRef);
    this.setPaint(this.paint ?? { color: null, target: 'all' }, false);
    this.updatePaintRes();
  }

  setWallRef(rgb) {
    this.wallRef = rgb;
    const c = new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    for (const p of Object.values(this.paintPlanes ?? {})) p.material.uniforms.uRef.value.set(c.r, c.g, c.b);
    this.dirty = true;
  }

  setPaintCoverage(v) {
    for (const p of Object.values(this.paintPlanes ?? {})) p.material.uniforms.uTol.value = v;
    this.dirty = true;
  }

  updatePaintRes() {
    const v = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    for (const p of Object.values(this.paintPlanes ?? {})) p.material.uniforms.uRes.value.copy(v);
  }

  setPaint(paint, animate = true) {
    this.paint = paint;
    if (!this.wallMats) return;
    for (const [id, mat] of Object.entries(this.wallMats)) {
      const on = paint.color && (paint.target === 'all' || id === 'back');
      const to = new THREE.Color(on ? paint.color : WALL_DEFAULT);
      const from = mat.color.clone();
      this.tweens.add({ duration: animate ? 500 : 0, update: (t) => { mat.color.copy(from).lerp(to, t); this.dirty = true; } });
    }
    for (const [id, plane] of Object.entries(this.paintPlanes ?? {})) {
      const on = paint.color && (paint.target === 'all' || id === 'back');
      if (paint.color) plane.material.uniforms.uPaint.value.set(paint.color);
      plane.material.uniforms.uStrength.value = on ? 0.92 : 0;
    }
    this.dirty = true;
  }

  // ---- furniture ------------------------------------------------------------------
  setPlan(plan, { reveal = false } = {}) {
    const next = new Map(plan.items.map((it) => [it.key, it]));
    for (const [key, e] of [...this.items]) {
      const it = next.get(key);
      const same = it && it.product.id === e.item.product.id && it.finish === e.item.finish
        && it.instances.length === e.item.instances.length
        && it.instances.every((ins, i) => (ins.opts?.drop ?? 0) === (e.item.instances[i].opts?.drop ?? 0));
      if (!same) this.removeItem(key);
    }
    let i = 0;
    for (const it of plan.items) {
      const e = this.items.get(it.key);
      if (e) this.moveItem(e, it);
      else this.addItem(it, reveal ? 250 + i * 90 : i * 20);
      i++;
    }
    if (this.selected && !this.items.has(this.selected)) this.clearSelection();
    else if (this.selected) this.select(this.selected, { fly: false });
    this.dirty = true;
  }

  // Which walls a floor piece stands against, and whether it is tall enough to block the view.
  tagInstance(m, inst, it) {
    const [w, d] = it.product.dims.map((v) => v / 100);
    const c = Math.abs(Math.cos(inst.rot)), s = Math.abs(Math.sin(inst.rot));
    const fw = c * w + s * d, fd = s * w + c * d, m2 = 0.25, { W, D } = this.R;
    const adj = [];
    if (it.layer === 'floor') {
      if (inst.x - fw / 2 < m2) adj.push('left');
      if (inst.x + fw / 2 > W - m2) adj.push('right');
      if (inst.z - fd / 2 < m2) adj.push('back');
      if (inst.z + fd / 2 > D - m2) adj.push('front');
    }
    m.userData.inst = inst;
    m.userData.adj = adj;
  }

  applyOpacity(e) {
    const v = e.fadeValue * (e.ghost ? 0.2 : 1);
    e.mats.forEach((m) => {
      m.opacity = v * (m.userData.baseOpacity ?? 1);
      m.depthWrite = v > 0.98;
    });
    e.lights.forEach((l) => { l.visible = e.fadeValue > 0.5; });
    this.dirty = true;
  }

  addItem(it, delay = 0) {
    const group = new THREE.Group();
    group.userData.key = it.key;
    const mats = [], lights = [];
    for (const inst of it.instances) {
      const m = buildModel(it.product, it.finish, inst.opts);
      m.position.set(inst.x, inst.y, inst.z);
      m.rotation.y = inst.rot;
      m.userData.tall = new THREE.Box3().setFromObject(m).getSize(V3()).y > 1.05;
      this.tagInstance(m, inst, it);
      mats.push(...m.userData.mats);
      lights.push(...m.userData.lights);
      m.scale.setScalar(0.001);
      group.add(m);
    }
    this.furniture.add(group);
    const entry = { item: it, group, mats, lights, outlines: [], fadeValue: 1, ghost: false };
    this.items.set(it.key, entry);
    this.tweens.add({
      delay, duration: 560, easing: ease.outBack,
      update: (t) => { const s = Math.max(0.001, t); group.children.forEach((c) => c.scale.setScalar(s)); this.dirty = true; },
    });
    return entry;
  }

  moveItem(e, it) {
    e.item = it;
    e.group.children.forEach((c, i) => {
      const inst = it.instances[i];
      this.tagInstance(c, inst, it);
      const p0 = c.position.clone(), r0 = c.rotation.y;
      const p1 = V3(inst.x, inst.y, inst.z);
      if (p0.distanceTo(p1) < 1e-4 && Math.abs(r0 - inst.rot) < 1e-4) return;
      this.tweens.add({ duration: 480, update: (t) => { c.position.lerpVectors(p0, p1, t); c.rotation.y = r0 + (inst.rot - r0) * t; this.dirty = true; } });
    });
  }

  removeItem(key) {
    const e = this.items.get(key);
    if (!e) return;
    this.items.delete(key);
    this.removeOutlines(e);
    const s0 = e.group.children[0]?.scale.x ?? 1;
    this.tweens.add({
      duration: 220, easing: ease.outCubic,
      update: (t) => { e.group.children.forEach((c) => c.scale.setScalar(Math.max(0.001, s0 * (1 - t)))); this.dirty = true; },
      done: () => { e.group.removeFromParent(); disposeGroup(e.group, e.mats); this.dirty = true; },
    });
  }

  // ---- selection ---------------------------------------------------------------------
  select(key, { fly = true } = {}) {
    const entry = this.items.get(key);
    if (!entry) return;
    if (this.selected && this.selected !== key) this.removeOutlines(this.items.get(this.selected));
    this.selected = key;
    for (const [k, e] of this.items) this.fade(e, k === key ? 1 : 0.16);
    if (!entry.outlines.length) {
      entry.group.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.userData.isOutline) return;
        const ol = new THREE.Mesh(o.geometry, this.outlineMat);
        ol.userData.isOutline = true;
        ol.raycast = () => {};
        o.add(ol);
        entry.outlines.push(ol);
      });
    }
    const layer = entry.item.layer;
    this.ring.visible = layer === 'floor' || layer === 'top' || layer === 'under';
    if (this.ring.visible) {
      const box = new THREE.Box3().setFromObject(entry.group);
      const c = box.getCenter(V3()), s = box.getSize(V3());
      const rr = Math.max(s.x, s.z) / 2 + 0.12;
      this.ring.position.set(c.x, 0.012, c.z);
      this.ring.scale.set(rr, rr, 1);
    }
    if (fly) this.focus(key);
    this.dirty = true;
  }

  clearSelection() {
    if (this.selected) this.removeOutlines(this.items.get(this.selected));
    this.selected = null;
    this.ring.visible = false;
    for (const e of this.items.values()) this.fade(e, 1);
    this.dirty = true;
  }

  removeOutlines(e) {
    if (!e) return;
    e.outlines.forEach((o) => o.removeFromParent());
    e.outlines = [];
  }

  fade(e, target) {
    const from = e.fadeValue;
    this.tweens.add({
      duration: 320,
      update: (t) => { e.fadeValue = from + (target - from) * t; this.applyOpacity(e); },
    });
  }

  pick(e) {
    if (!['room', 'walk', 'photo'].includes(this.mode)) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.mode === 'photo' ? this.photoCamera : this.camera);
    const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const hit = this.raycaster.intersectObjects(this.furniture.children, true).find((h) => visible(h.object));
    let key = null;
    for (let o = hit?.object; o; o = o.parent) if (o.userData.key) { key = o.userData.key; break; }
    this.onPick?.(key);
  }

  // ---- cameras and views -----------------------------------------------------------------
  homePose() {
    const { W, D, H } = this.R;
    const target = V3(W / 2, H * 0.25, D / 2);
    const aspect = this.size.w / this.size.h;
    const vf = (42 * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const rad = 0.5 * Math.hypot(W, D, H);
    const dist = (rad / Math.sin(Math.min(vf, hf) / 2)) * 0.92;
    const az = 0.62, pol = 0.95;
    return { pos: target.clone().add(V3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)).multiplyScalar(dist)), target, fov: 42 };
  }

  viewpoints() {
    const { W, D } = this.R;
    const pts = [
      { id: 'door', label: 'Doorway', pos: V3(0.45, EYE, D - 0.45), look: V3(W * 0.75, 1.1, D * 0.2) },
      { id: 'centre', label: 'Centre', pos: V3(W / 2, EYE, D / 2 + 0.2), look: V3(W / 2, 1.2, 0) },
      { id: 'corner', label: 'Far corner', pos: V3(W - 0.45, EYE, 0.45), look: V3(W * 0.2, 1.1, D * 0.85) },
    ];
    if (this.photoInfo) pts.push({ id: 'photo', label: 'Where you stood', pos: V3(this.photoInfo.camX, this.photoInfo.camY, this.photoInfo.camDist), look: V3(this.photoInfo.camX, this.photoInfo.camY, 0) });
    return pts;
  }

  flyTo(pos, target, { duration = 900, fov = null, then } = {}) {
    this.cancelFly?.();
    this.flying = true;
    this.controls.enabled = false;
    const p0 = this.camera.position.clone(), t0 = this.controls.target.clone(), f0 = this.camera.fov;
    this.cancelFly = this.tweens.add({
      duration, easing: ease.inOutCubic,
      update: (k) => {
        this.camera.position.lerpVectors(p0, pos, k);
        this.controls.target.lerpVectors(t0, target, k);
        if (fov) { this.camera.fov = f0 + (fov - f0) * k; this.camera.updateProjectionMatrix(); }
        this.camera.lookAt(this.controls.target);
        this.dirty = true;
      },
      done: () => { this.flying = false; this.cancelFly = null; this.configureControls(); then?.(); },
    });
  }

  configureControls() {
    const c = this.controls;
    c.enabled = this.mode === 'room' || this.mode === 'walk';
    if (this.mode === 'walk') {
      Object.assign(c, { enableZoom: false, enablePan: false, rotateSpeed: -0.32, minDistance: 0, maxDistance: 0.2, minPolarAngle: 0.3, maxPolarAngle: Math.PI - 0.3 });
    } else {
      Object.assign(c, { enableZoom: true, enablePan: true, rotateSpeed: 0.8, minDistance: 0.9, maxDistance: 24, minPolarAngle: 0.05, maxPolarAngle: Math.PI / 2 - 0.03 });
    }
  }

  setView(mode, { intro = false, viewpoint = 'door' } = {}) {
    const prev = this.mode;
    this.mode = mode;
    this.canvas.hidden = mode === 'off';
    this.stopTour();
    if (mode === 'off') { this.roomDims.items.forEach((it) => { it.el.hidden = true; }); return; }
    this.photoFx.visible = mode === 'photo';
    this.scene.background = mode === 'photo' ? this.photoTex : this.bg;
    this.resize();
    if (mode === 'room') {
      const home = this.homePose();
      if (intro && this.photoInfo) {
        const pi = this.photoInfo;
        this.camera.position.set(pi.camX, pi.camY, pi.camDist);
        this.controls.target.set(pi.camX, pi.camY, 0);
        this.camera.fov = this.photoCamera.fov * 0.9;
        this.camera.updateProjectionMatrix();
        this.flyTo(home.pos, home.target, { duration: 1900, fov: home.fov });
      } else if (prev === 'walk' || prev === 'off' || prev === 'photo' || intro) {
        if (prev === 'off' || prev === 'photo') { this.camera.position.copy(home.pos).sub(home.target).multiplyScalar(1.2).add(home.target); this.controls.target.copy(home.target); }
        this.flyTo(home.pos, home.target, { duration: prev === 'walk' ? 1100 : 700, fov: home.fov });
      } else this.configureControls();
    } else if (mode === 'walk') {
      this.goToViewpoint(viewpoint);
    } else {
      this.controls.enabled = false;
    }
    this.onViewChange?.(mode);
    this.dirty = true;
  }

  goToViewpoint(id) {
    const vp = this.viewpoints().find((v) => v.id === id) ?? this.viewpoints()[0];
    const dir = vp.look.clone().sub(vp.pos).normalize();
    this.flyTo(vp.pos, vp.pos.clone().addScaledVector(dir, 0.05), { duration: 1300, fov: 68 });
  }

  resetView() {
    if (this.mode === 'room') { const h = this.homePose(); this.flyTo(h.pos, h.target, { fov: h.fov }); }
    else if (this.mode === 'walk') this.goToViewpoint('door');
  }

  // Slow automatic 360° turn: orbit around the room, or look around from where you stand.
  toggleTour(on = !this.touring) {
    if (this.mode !== 'room' && this.mode !== 'walk') return false;
    this.touring = on;
    this.controls.autoRotate = on;
    this.controls.autoRotateSpeed = this.mode === 'walk' ? -1.6 : 2.2;
    this.dirty = true;
    return on;
  }

  stopTour() {
    if (!this.touring) return;
    this.touring = false;
    this.controls.autoRotate = false;
    this.onViewChange?.(this.mode);
  }

  focus(key) {
    const e = this.items.get(key);
    if (!e || this.mode === 'photo' || this.mode === 'off') return;
    const box = new THREE.Box3().setFromObject(e.group);
    const c = box.getCenter(V3()), s = box.getSize(V3());
    if (this.mode === 'walk') {
      const dir = c.clone().sub(this.camera.position).normalize();
      this.flyTo(this.camera.position.clone(), this.camera.position.clone().addScaledVector(dir, 0.05), { duration: 800 });
      return;
    }
    const rot = e.item.instances[0].rot;
    const facing = V3(Math.sin(rot), 0, Math.cos(rot));
    const layer = e.item.layer;
    const elev = layer === 'under' ? 0.95 : layer === 'ceiling' ? -0.25 : 0.42;
    const dir = facing.clone().multiplyScalar(Math.cos(elev)).add(V3(0, Math.sin(elev), 0)).applyAxisAngle(V3(0, 1, 0), 0.42).normalize();
    const radius = Math.max(0.35, s.length() / 2);
    const vf = (40 * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (this.size.w / this.size.h));
    const dist = clamp((radius / Math.sin(Math.min(vf, hf) / 2)) * 1.1, 1.1, 9);
    this.flyTo(c.clone().addScaledVector(dir, dist), c, { duration: 950, fov: 40 });
  }

  // ---- studio: one piece on a turntable ------------------------------------------------------
  openStudio(key, labels) {
    const e = this.items.get(key);
    if (!e) return;
    const st = this.studio;
    this.closeStudio(false);
    const it = e.item;
    const model = buildModel(it.product, it.finish, it.instances[0].opts);
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(V3()), s = box.getSize(V3());
    model.position.set(-c.x, -box.min.y, -c.z);
    const pivot = new THREE.Group();
    pivot.add(model);
    st.scene.add(pivot);
    st.model = pivot;
    st.mats = model.userData.mats;
    const r = Math.max(0.5, Math.hypot(s.x, s.z) / 2 + 0.25);
    st.disc.scale.set(r, 1, r);
    const hw = s.x / 2, hd = s.z / 2, off = 0.12;
    st.dims.add(V3(-hw, 0.01, hd + off), V3(hw, 0.01, hd + off), labels.w, V3(0, 0, 1));
    st.dims.add(V3(hw + off, 0.01, -hd), V3(hw + off, 0.01, hd), labels.d, V3(1, 0, 0));
    st.dims.add(V3(hw + off, 0, -hd), V3(hw + off, s.y, -hd), labels.h, V3(1, 0, 0));
    const rad = s.length() / 2 + 0.15;
    const vf = (32 * Math.PI) / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * (this.size.w / this.size.h));
    const dist = (rad / Math.sin(Math.min(vf, hf) / 2)) * 1.05;
    st.controls.target.set(0, s.y * 0.45, 0);
    st.camera.position.set(dist * 0.62, s.y * 0.45 + dist * 0.42, dist * 0.66);
    st.controls.minDistance = dist * 0.4;
    st.controls.maxDistance = dist * 2.5;
    st.controls.autoRotate = true;
    this.prevMode = this.mode === 'studio' ? this.prevMode : this.mode;
    this.mode = 'studio';
    this.controls.enabled = false;
    st.controls.enabled = true;
    this.canvas.hidden = false;
    this.resize();
    pivot.rotation.y = -Math.PI * 0.7;
    pivot.scale.setScalar(0.8);
    this.tweens.add({ duration: 1000, easing: ease.outCubic, update: (t) => { pivot.rotation.y = -Math.PI * 0.7 * (1 - t); pivot.scale.setScalar(0.8 + 0.2 * t); } });
    this.dirty = true;
  }

  closeStudio(restore = true) {
    const st = this.studio;
    st.dims.clear();
    if (st.model) {
      st.model.removeFromParent();
      disposeGroup(st.model, st.mats);
      st.model = null;
    }
    st.controls.enabled = false;
    if (restore && this.mode === 'studio') {
      this.mode = this.prevMode ?? 'room';
      this.scene.background = this.mode === 'photo' ? this.photoTex : this.bg;
      this.resize();
      this.configureControls();
      if (this.mode === 'photo') this.controls.enabled = false;
      this.dirty = true;
    }
  }

  // ---- frame loop ----------------------------------------------------------------------------
  resize() {
    const box = this.container.getBoundingClientRect();
    let w = Math.max(1, box.width), h = Math.max(1, box.height), x = 0, y = 0;
    if (this.mode === 'photo' && this.photoInfo) {
      const { width, height } = this.photoInfo;
      const k = Math.min(w / width, h / height);
      const dw = width * k, dh = height * k;
      x = (w - dw) / 2; y = (h - dh) / 2; w = dw; h = dh;
    }
    Object.assign(this.canvas.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    this.renderer.setSize(Math.round(w), Math.round(h), false);
    this.size = { w, h, x, y };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.studio.camera.aspect = w / h;
    this.studio.camera.updateProjectionMatrix();
    if (this.photoInfo) matchPhotoCamera(this.photoCamera, this.photoInfo);
    this.updatePaintRes();
    this.dirty = true;
  }

  updateVisibility() {
    const mode = this.mode;
    const cam = this.camera.position;
    const R = this.R;
    if (!R || !this.walls) return;
    const hidden = new Set();
    for (const [id, g] of Object.entries(this.walls)) {
      const show = mode === 'walk' || (mode === 'room' && !g.userData.outside(cam));
      g.visible = show && mode !== 'photo';
      if (!g.visible) hidden.add(id);
    }
    this.shell.children[0].visible = mode !== 'photo';
    this.ceilingMesh.visible = mode === 'walk';
    this.fx.visible = mode !== 'photo' || !!this.selected;
    const limit = this.photoInfo ? this.photoInfo.camDist - 0.55 : Infinity;
    for (const [key, e] of this.items) {
      const ghost = mode === 'room' && key !== this.selected
        && e.group.children.some((c) => c.userData.tall && c.userData.adj?.some((w) => hidden.has(w)));
      if (ghost !== e.ghost) { e.ghost = ghost; this.applyOpacity(e); }
      const wallHidden = e.item.wall && hidden.has(e.item.wall);
      e.group.visible = !(wallHidden && mode !== 'photo');
      e.group.children.forEach((c) => {
        const inst = c.userData.inst;
        c.visible = mode !== 'photo' || (inst && inst.z < limit && e.item.wall !== 'front');
      });
    }
  }

  tick() {
    const now = performance.now();
    const animating = this.tweens.step(now);
    if (this.mode === 'off') return;
    let changed = false;
    if (this.mode === 'studio') changed = this.studio.controls.update();
    else if ((this.mode === 'room' || this.mode === 'walk') && !this.flying && this.controls.enabled) {
      changed = this.controls.update();
      if (this.mode === 'room' && this.R) {
        const t = this.controls.target;
        t.x = clamp(t.x, -1, this.R.W + 1); t.z = clamp(t.z, -1, this.R.D + 1); t.y = clamp(t.y, 0, this.R.H);
      }
    }
    if (this.selected && this.mode !== 'studio') {
      const p = 0.5 + 0.5 * Math.sin(now * 0.005);
      this.outlineMat.uniforms.uOpacity.value = 0.55 + 0.4 * p;
      this.ring.material.opacity = 0.45 + 0.4 * p;
      changed = true;
    }
    if (!(this.dirty || animating || changed)) return;
    this.dirty = false;
    let scene = this.scene, cam = this.camera;
    if (this.mode === 'studio') { scene = this.studio.scene; cam = this.studio.camera; }
    else {
      if (this.mode === 'photo') cam = this.photoCamera;
      this.updateVisibility();
    }
    this.renderer.render(scene, cam);
    const off = this.size;
    if (this.mode === 'studio') this.studio.dims.update(cam, off);
    this.roomDims.items.forEach((it) => { it.el.hidden = this.mode !== 'room'; });
    if (this.mode === 'room') this.roomDims.update(cam, off);
  }
}
