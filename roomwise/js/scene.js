// The 3D stage. One WebGL canvas with four views:
//   room   dollhouse view you can orbit a full 360° (walls facing the camera hide themselves)
//   walk   stand inside the room at eye height and drag to look all the way around
//   photo  the design rendered from the phone's exact position over the original photo
//   studio a single piece on a turntable with its dimensions
// Rendering: physical materials, AgX tone mapping, ambient occlusion (GTAO), sunlight through
// the real windows by day and lamplight in the evening. "Real photo" path-traces the current
// view (three-gpu-pathtracer) for true soft shadows and bounced light.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { buildModel } from './models.js';
import { buildRoom } from './room.js';
import { windowView } from './textures.js';
import { matchPhotoCamera } from './measure.js';
import { Tweens, ease, clamp, readToken } from './util.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const TAPE = '#ffc933';
const EYE = 1.6;
const HDRI = (name) => `https://cdn.jsdelivr.net/npm/@pmndrs/assets@1.7.0/hdri/${name}.exr.js`;

const outlineMaterial = () => new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(TAPE) }, uOpacity: { value: 0.9 }, uThickness: { value: 0.012 } },
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

const WALL_NORMAL = { back: V3(0, 0, -1), front: V3(0, 0, 1), left: V3(-1, 0, 0), right: V3(1, 0, 0) };

// Where on the room walls an opening's centre is, in room coordinates.
function openingCentre(o, R) {
  const a = (o.a0 + o.a1) / 2, y = (o.y0 + o.y1) / 2;
  return { back: V3(a, y, 0), front: V3(a, y, R.D), left: V3(0, y, a), right: V3(R.W, y, a) }[o.wall];
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
    this.mood = 'day';
    this.design = { openings: [], style: null, paint: null, curtains: null, feature: null };

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(r);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const scene = (this.scene = new THREE.Scene());
    scene.environment = this.env;
    scene.environmentIntensity = 0.45;
    this.shell = new THREE.Group();
    this.furniture = new THREE.Group();
    this.fx = new THREE.Group();
    this.photoFx = new THREE.Group();
    this.views = new THREE.Group();
    scene.add(this.shell, this.furniture, this.fx, this.photoFx, this.views);
    this.hemi = new THREE.HemisphereLight('#f6f4ef', '#9c8a74', 0.9);
    scene.add(this.hemi);
    RectAreaLightUniformsLib.init();
    this.windowLights = new THREE.Group();
    scene.add(this.windowLights);
    this.sun = new THREE.DirectionalLight('#fff1dc', 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    scene.add(this.sun, this.sun.target);
    this.roomDims = new DimSet(this.fx, labels);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.03, 80);
    this.camera.position.set(6, 5, 8);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('start', () => { this.stopTour(); this.cancelRealPhoto(); });

    this.photoCamera = new THREE.PerspectiveCamera(50, 1, 0.05, 80);

    // Ambient occlusion: contact shadows where furniture meets the floor and walls.
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(scene, this.camera));
    this.gtao = new GTAOPass(scene, this.camera, 1, 1);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.9;
    this.gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1, samples: this.mobile ? 8 : 16 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: this.mobile ? 8 : 16 });
    this.composer.addPass(this.gtao);
    this.composer.addPass(new OutputPass());

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
    this.shellSig = null;
    this.buildShell();
    this.buildPhotoFx();
    this.dirty = true;
  }

  // Design choices that change the room itself: openings, style (floor, walls, treatment), paint, curtains.
  setDesign(design) {
    this.design = { ...this.design, ...design };
    this.buildShell();
  }

  buildShell() {
    if (!this.R) return;
    const d = this.design;
    const sig = JSON.stringify([this.R, d.openings, d.style?.id, d.feature, d.curtains && { ...d.curtains, product: d.curtains.product?.id }, d.paint?.color && d.paint]);
    if (sig === this.shellSig) return;
    this.shellSig = sig;
    if (this.room) {
      this.room.root.removeFromParent();
      disposeGroup(this.room.root, this.room.mats);
    }
    const room = (this.room = buildRoom(this.R, { openings: d.openings, style: d.style, feature: d.feature, curtains: d.curtains, paint: d.paint }));
    this.shell.add(room.root);
    this.walls = Object.fromEntries(Object.entries(room.walls).map(([id, w]) => [id, w.group]));
    this.wallMats = room.wallMats;
    this.ceilingMesh = room.ceiling;
    this.floorMesh = room.floor;
    this.baseWall = d.style?.walls?.color ?? '#ebe8e1';

    // Curtains are a product: register them so they can be tapped like furniture.
    this.items.get('curtains') && this.items.delete('curtains');
    if (room.curtains && this.curtainItem) {
      const mats = [];
      room.curtains.traverse((o) => { if (o.material && !mats.includes(o.material)) mats.push(o.material); });
      this.items.set(this.curtainItem.key, { item: this.curtainItem, group: room.curtains, mats, lights: [], outlines: [], fadeValue: 1, ghost: false, shell: true });
    }

    // The view outside each window, and the sun coming in through the first one.
    this.views.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.views.clear();
    const { W, D, H } = this.R;
    const windows = (d.openings ?? []).filter((o) => o.kind === 'window');
    const viewTex = windowView();
    for (const o of windows) {
      const n = WALL_NORMAL[o.wall], c = openingCentre(o, this.R);
      const w = o.a1 - o.a0 + 2.5, h = o.y1 - o.y0 + 1.8;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: viewTex, toneMapped: false, color: '#ffffff' }));
      m.position.copy(c).addScaledVector(n, 1.4);
      m.lookAt(c);
      this.views.add(m);
    }
    // Soft daylight from each window opening (and the path tracer's main light source).
    this.windowLights.clear();
    for (const o of windows) {
      const n = WALL_NORMAL[o.wall], c = openingCentre(o, this.R);
      const l = new THREE.RectAreaLight('#eef3ff', 0, o.a1 - o.a0, o.y1 - o.y0);
      l.position.copy(c).addScaledVector(n, -0.02);
      l.lookAt(c.clone().addScaledVector(n, -1));
      this.windowLights.add(l);
    }
    const win = windows[0];
    if (win) {
      const n = WALL_NORMAL[win.wall], c = openingCentre(win, this.R);
      const side = V3(-n.z, 0, n.x);
      this.sun.position.copy(c).addScaledVector(n, 5).addScaledVector(side, 2.2).add(V3(0, 3.6, 0));
      this.sun.target.position.copy(c).addScaledVector(n, -2.2).setY(0);
    } else {
      this.sun.position.set(W * 0.15 - 2.5, H + 4.5, D + 3.2);
      this.sun.target.position.set(W / 2, 0, D / 2);
    }
    const ext = Math.hypot(W, D) / 2 + 2;
    Object.assign(this.sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 0.5, far: 40 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.applyMood(false);
    this.setPaint(this.paint ?? { color: null, target: 'all' }, false);
    this.shadowMode = null;
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

  // ---- mood: day (sun through the window) or evening (lamps on) ------------------------------
  setMood(mood) {
    this.mood = mood;
    this.cancelRealPhoto();
    this.applyMood(true);
  }

  applyMood(animate = true) {
    const evening = this.mood === 'evening';
    const to = {
      sun: evening ? 0 : 2.6, hemi: evening ? 0.1 : 0.7, env: evening ? 0.1 : 0.4, lamp: evening ? 1 : 0, win: evening ? 0.15 : 2.5,
      exposure: evening ? 1.35 : 1.15, view: evening ? 0.16 : 1,
    };
    const from = { sun: this.sun.intensity, hemi: this.hemi.intensity, env: this.scene.environmentIntensity, lamp: this.lampLevel ?? 0, exposure: this.renderer.toneMappingExposure, view: this.viewLevel ?? 1, win: this.winLevel ?? 0 };
    const set = (t) => {
      const v = (k) => from[k] + (to[k] - from[k]) * t;
      this.sun.intensity = v('sun');
      this.hemi.intensity = v('hemi');
      this.scene.environmentIntensity = v('env');
      this.renderer.toneMappingExposure = v('exposure');
      this.lampLevel = v('lamp');
      this.winLevel = v('win');
      this.windowLights.children.forEach((l) => { l.intensity = this.winLevel; l.color.set(evening ? '#6d7fa8' : '#eef3ff'); });
      this.viewLevel = v('view');
      this.views.children.forEach((m) => m.material.color.setScalar(this.viewLevel).lerp(new THREE.Color('#1c2740'), (1 - this.viewLevel) * 0.8));
      for (const e of this.items.values()) this.lightEntry(e);
      this.dirty = true;
    };
    this.tweens.add({ duration: animate ? 900 : 0, easing: ease.inOutCubic, update: set });
  }

  lightEntry(e) {
    const k = this.lampLevel ?? 0;
    e.lights.forEach((l) => { l.intensity = (l.userData.on ?? 3) * k; });
    e.mats.forEach((m) => {
      if (m.userData?.glow == null) return;
      m.emissiveIntensity = (m.userData.base ?? 0) + m.userData.glow * k;
    });
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
    this.cancelRealPhoto();
    if (!this.wallMats) return;
    for (const [id, mat] of Object.entries(this.wallMats)) {
      const on = paint.color && (paint.target === 'all' || id === 'back');
      const to = new THREE.Color(on ? paint.color : this.baseWall);
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
  // plan.items come from layout.planRoom; textiles (cushions, throws, bedding, towels) are built
  // into their host piece and registered as tappable parts of it.
  setPlan(plan, { reveal = false, style = null } = {}) {
    this.cancelRealPhoto();
    this.style = style;
    const dressFor = (key) => plan.dress?.[key] ?? null;
    const placesFor = (it) => (it.cat === 'diningTable' ? this.placeSettings(it, plan.items.find((x) => x.cat === 'diningChair')) : null);
    const sigOf = (it) => JSON.stringify([it.product.id, it.finish, style?.id, dressFor(it.key), placesFor(it), it.instances.map((i) => i.opts?.drop ?? 0)]);
    const next = new Map(plan.items.map((it) => [it.key, it]));
    for (const [key, e] of [...this.items]) {
      if (e.shell) continue;
      const it = next.get(key);
      const same = it && !e.parts && e.sig === sigOf(it) && it.instances.length === e.item.instances.length;
      if (!same || e.parts) this.removeItem(key, !!e.parts);
    }
    let i = 0;
    for (const it of plan.items) {
      if (it.layer === 'dress' || it.layer === 'windows') continue;
      const e = this.items.get(it.key);
      if (e) this.moveItem(e, it);
      else this.addItem(it, reveal ? 250 + i * 90 : i * 20, { dress: dressFor(it.key), places: placesFor(it), sig: sigOf(it) });
      i++;
    }
    // Textile parts: find their meshes inside the host piece.
    for (const it of plan.items.filter((x) => x.layer === 'dress')) {
      const host = this.items.get(it.host);
      if (!host) continue;
      const parts = [];
      host.group.traverse((o) => { if (o !== host.group && o.userData.key === it.key) parts.push(o); });
      if (parts.length) this.items.set(it.key, { item: it, parts, host: it.host, mats: [], lights: [], outlines: [], fadeValue: 1, ghost: false });
    }
    this.curtainItem = plan.items.find((x) => x.layer === 'windows') ?? null;
    if (this.curtainItem && this.room?.curtains) {
      const mats = [];
      this.room.curtains.traverse((o) => { if (o.material && !mats.includes(o.material)) mats.push(o.material); });
      this.items.set(this.curtainItem.key, { item: this.curtainItem, group: this.room.curtains, mats, lights: [], outlines: [], fadeValue: 1, ghost: false, shell: true });
    } else for (const [k, e] of [...this.items]) if (e.shell) this.items.delete(k);
    if (this.selected && !this.items.has(this.selected)) this.clearSelection();
    else if (this.selected) this.select(this.selected, { fly: false });
    this.dirty = true;
  }

  // Plates and glasses on the table in front of each chair (table-local coordinates).
  placeSettings(table, chairs) {
    if (!chairs) return [];
    const t = table.instances[0], [tw, td] = table.product.dims.map((v) => v / 100);
    const round = table.product.model.shape === 'round';
    const c = Math.cos(-t.rot), s = Math.sin(-t.rot);
    return chairs.instances.map((ch) => {
      const dx = ch.x - t.x, dz = ch.z - t.z;
      const lx = dx * c + dz * s, lz = -dx * s + dz * c;
      let x, z;
      if (round) { const r = tw / 2 - 0.2, l = Math.hypot(lx, lz) || 1; x = (lx / l) * r; z = (lz / l) * r; }
      else { x = clamp(lx, -tw / 2 + 0.2, tw / 2 - 0.2); z = clamp(lz, -td / 2 + 0.2, td / 2 - 0.2); }
      return { x: +x.toFixed(3), z: +z.toFixed(3), rot: +Math.atan2(lx - x, lz - z).toFixed(3) };
    });
  }

  // Which walls a floor piece stands against, and whether it is tall enough to block the view.
  tagInstance(m, inst, it) {
    const [w, d] = it.product.dims.map((v) => v / 100);
    const c = Math.abs(Math.cos(inst.rot)), s = Math.abs(Math.sin(inst.rot));
    const fw = c * w + s * d, fd = s * w + c * d, m2 = 0.25, { W, D } = this.R;
    const adj = [];
    if (it.layer === 'floor' || it.layer === 'fixture') {
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
      const t = v < 0.999;
      if (m.transparent !== t && !m.userData.alwaysTransparent) { m.transparent = t; m.needsUpdate = true; }
      m.opacity = v * (m.userData.baseOpacity ?? 1);
      m.depthWrite = v > 0.98;
    });
    e.lights.forEach((l) => { l.visible = e.fadeValue > 0.5; });
    this.dirty = true;
  }

  addItem(it, delay = 0, { dress = null, places = null, sig = '' } = {}) {
    const group = new THREE.Group();
    group.userData.key = it.key;
    const mats = [], lights = [];
    for (const inst of it.instances) {
      const m = buildModel(it.product, it.finish, { ...inst.opts, dress, places, style: this.style });
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
    const entry = { item: it, group, mats, lights, outlines: [], fadeValue: 1, ghost: false, sig };
    this.items.set(it.key, entry);
    this.lightEntry(entry);
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

  removeItem(key, quiet = false) {
    const e = this.items.get(key);
    if (!e) return;
    this.items.delete(key);
    this.removeOutlines(e);
    if (quiet || e.parts) return;
    const s0 = e.group.children[0]?.scale.x ?? 1;
    this.tweens.add({
      duration: 220, easing: ease.outCubic,
      update: (t) => { e.group.children.forEach((c) => c.scale.setScalar(Math.max(0.001, s0 * (1 - t)))); this.dirty = true; },
      done: () => { e.group.removeFromParent(); disposeGroup(e.group, e.mats); this.dirty = true; },
    });
  }

  // ---- selection ---------------------------------------------------------------------
  targetsOf(e) { return e.parts ?? [e.group]; }

  select(key, { fly = true } = {}) {
    const entry = this.items.get(key);
    if (!entry) return;
    if (this.selected && this.selected !== key) this.removeOutlines(this.items.get(this.selected));
    this.selected = key;
    for (const [k, e] of this.items) if (!e.parts) this.fade(e, k === key || k === entry.host ? 1 : 0.16);
    if (!entry.outlines.length) {
      for (const root of this.targetsOf(entry)) {
        root.traverse((o) => {
          if (!o.isMesh || o.isInstancedMesh || o.userData.isOutline) return;
          const ol = new THREE.Mesh(o.geometry, this.outlineMat);
          ol.userData.isOutline = true;
          ol.raycast = () => {};
          o.add(ol);
          entry.outlines.push(ol);
        });
      }
    }
    const layer = entry.item.layer;
    this.ring.visible = !entry.parts && (layer === 'floor' || layer === 'top' || layer === 'under');
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
    for (const e of this.items.values()) if (!e.parts) this.fade(e, 1);
    this.dirty = true;
  }

  removeOutlines(e) {
    if (!e) return;
    e.outlines.forEach((o) => o.removeFromParent());
    e.outlines = [];
  }

  fade(e, target) {
    const from = e.fadeValue;
    if (Math.abs(from - target) < 1e-3) return;
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
    const targets = [...this.furniture.children, ...(this.room?.curtains ? [this.room.curtains] : [])];
    const hit = this.raycaster.intersectObjects(targets, true).find((h) => visible(h.object));
    let key = null;
    for (let o = hit?.object; o; o = o.parent) if (o.userData.key && this.items.has(o.userData.key)) { key = o.userData.key; break; }
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
    const door = (this.design.openings ?? []).find((o) => o.kind === 'door');
    if (door) {
      const c = openingCentre(door, this.R), n = WALL_NORMAL[door.wall];
      pts[0].pos = c.clone().addScaledVector(n, -0.45).setY(EYE);
      pts[0].look = V3(W / 2, 1.1, D / 2).addScaledVector(n, -1.2);
    }
    if (this.photoInfo) pts.push({ id: 'photo', label: 'Where you stood', pos: V3(this.photoInfo.camX, this.photoInfo.camY, this.photoInfo.camDist), look: V3(this.photoInfo.camX, this.photoInfo.camY, 0) });
    return pts;
  }

  flyTo(pos, target, { duration = 900, fov = null, then } = {}) {
    this.cancelFly?.();
    this.cancelRealPhoto();
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
    this.cancelRealPhoto();
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
    this.cancelRealPhoto();
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
    const box = new THREE.Box3();
    this.targetsOf(e).forEach((t) => box.expandByObject(t));
    const c = box.getCenter(V3()), s = box.getSize(V3());
    if (this.mode === 'walk') {
      const dir = c.clone().sub(this.camera.position).normalize();
      this.flyTo(this.camera.position.clone(), this.camera.position.clone().addScaledVector(dir, 0.05), { duration: 800 });
      return;
    }
    const hostItem = e.parts ? this.items.get(e.host)?.item : e.item;
    const rot = hostItem?.instances[0]?.rot ?? 0;
    const facing = e.item.layer === 'windows' ? V3(0, 0, 1) : V3(Math.sin(rot), 0, Math.cos(rot));
    if (e.item.layer === 'windows') {
      const w = (this.design.openings ?? []).find((o) => o.kind === 'window');
      if (w) facing.copy(WALL_NORMAL[w.wall]).negate();
    }
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
    if (!e || e.parts || e.shell) return;
    this.cancelRealPhoto();
    const st = this.studio;
    this.closeStudio(false);
    const it = e.item;
    const model = buildModel(it.product, it.finish, { ...it.instances[0].opts, style: this.style });
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

  // ---- "Real photo": progressive path tracing of the current view ---------------------------
  async loadSky() {
    const name = this.mood === 'evening' ? 'night' : 'park';
    this.skies ??= {};
    if (!this.skies[name]) {
      const [{ EXRLoader }, mod] = await Promise.all([import('three/addons/loaders/EXRLoader.js'), import(HDRI(name))]);
      // Decode the embedded EXR directly (no fetch of a data: URL, which strict pages block).
      const bin = Uint8Array.from(atob(mod.default.split(',')[1]), (c) => c.charCodeAt(0));
      const d = new EXRLoader().parse(bin.buffer);
      const tex = new THREE.DataTexture(d.data, d.width, d.height, d.format, d.type);
      tex.colorSpace = d.colorSpace ?? THREE.LinearSRGBColorSpace;
      tex.minFilter = tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      tex.mapping = THREE.EquirectangularReflectionMapping;
      this.skies[name] = tex;
    }
    return this.skies[name];
  }

  // Renders until `samples` are reached, calling onProgress(0..1). Resolves with a PNG data URL,
  // or null if cancelled (camera moved, view changed).
  async realPhoto({ samples = this.mobile ? 64 : 200, onProgress } = {}) {
    if (!['room', 'walk', 'photo'].includes(this.mode) || !this.R) return null;
    this.cancelRealPhoto();
    const token = (this.ptToken = {});
    this.clearSelection();
    this.tweens.step(performance.now() + 1000);
    const [{ WebGLPathTracer, DenoiseMaterial }, sky] = await Promise.all([import('three-gpu-pathtracer'), this.loadSky()]);
    if (token !== this.ptToken) return null;
    this.ptBusy = true;
    const cam = this.mode === 'photo' ? this.photoCamera : this.camera;
    this.updateVisibility();
    const saved = { env: this.scene.environment, envI: this.scene.environmentIntensity, bg: this.scene.background, bgI: this.scene.backgroundIntensity, exp: this.renderer.toneMappingExposure, sun: this.sun.intensity };
    // A path tracer only lights the room through its windows, like a camera does, so give it
    // a brighter sky and exposure, as a photographer would for an interior.
    const evening = this.mood === 'evening';
    this.renderer.toneMappingExposure = saved.exp * (evening ? 1.6 : 1.9);
    this.sun.intensity = saved.sun * 2.2;
    const hideFx = [this.fx, this.photoFx, this.views].map((g) => [g, g.visible]);
    hideFx.forEach(([g]) => { g.visible = false; });
    this.scene.environment = sky;
    this.scene.environmentIntensity = evening ? 0.3 : 1.8;
    // Soft daylight from each window, like the diffuse light a photographer relies on indoors.
    const winSaved = this.windowLights.children.map((l) => l.intensity);
    this.windowLights.children.forEach((l) => { l.intensity = evening ? 0.4 : 5; });
    if (this.mode === 'walk') { this.scene.background = sky; this.scene.backgroundIntensity = this.scene.environmentIntensity; }
    const restore = () => {
      this.windowLights.children.forEach((l, i) => { l.intensity = winSaved[i]; });
      hideFx.forEach(([g, v]) => { g.visible = v; });
      this.scene.environment = saved.env;
      this.scene.environmentIntensity = saved.envI;
      this.scene.background = saved.bg;
      this.scene.backgroundIntensity = saved.bgI ?? 1;
      this.renderer.toneMappingExposure = saved.exp;
      this.sun.intensity = saved.sun;
      this.ptBusy = false;
      this.dirty = true;
    };
    try {
      const pt = (this.pathTracer ??= new WebGLPathTracer(this.renderer));
      pt.bounces = this.mobile ? 4 : 6;
      pt.filterGlossyFactor = 0.5;
      pt.tiles.set(this.mobile ? 2 : 1, this.mobile ? 2 : 1);
      pt.renderScale = this.mobile ? 0.6 : 1;
      pt.minSamples = 1;
      pt.fadeDuration = 0;
      pt.renderDelay = 0;
      await new Promise((r) => requestAnimationFrame(r));
      pt.setScene(this.scene, cam);
      while (token === this.ptToken && pt.samples < samples) {
        pt.renderSample();
        onProgress?.(Math.min(1, pt.samples / samples));
        await new Promise((r) => requestAnimationFrame(r));
      }
      if (token !== this.ptToken) { restore(); return null; }
      // Final frame through the path tracer's edge-aware denoiser.
      this.denoiser ??= new FullScreenQuad(new DenoiseMaterial({ sigma: 4, kSigma: 1, threshold: this.mobile ? 0.14 : 0.08 }));
      const plain = pt.renderToCanvasCallback;
      pt.renderToCanvasCallback = (target, renderer) => {
        this.denoiser.material.map = target.texture;
        const ac = renderer.autoClear;
        renderer.autoClear = false;
        this.denoiser.render(renderer);
        renderer.autoClear = ac;
      };
      pt.renderSample();
      pt.renderToCanvasCallback = plain;
      const url = this.renderer.domElement.toDataURL('image/png');
      restore();
      this.ptToken = null;
      return url;
    } catch (err) {
      restore();
      this.ptToken = null;
      throw err;
    }
  }

  cancelRealPhoto() {
    if (!this.ptToken) return;
    this.ptToken = null;
    this.dirty = true;
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
    const pr = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(Math.round(w), Math.round(h));
    this.size = { w, h, x, y };
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.studio.camera.aspect = w / h;
    this.studio.camera.updateProjectionMatrix();
    if (this.photoInfo) matchPhotoCamera(this.photoCamera, this.photoInfo);
    this.updatePaintRes();
    this.cancelRealPhoto();
    this.dirty = true;
  }

  updateVisibility() {
    const mode = this.mode;
    const cam = this.camera.position;
    const R = this.R;
    if (!R || !this.walls) return;
    // Walls and ceiling only cast shadows when you are inside the room, so daylight comes
    // through the window in walk mode and floods the open dollhouse in room mode.
    const shadows = mode === 'walk';
    if (this.shadowMode !== shadows) {
      this.shadowMode = shadows;
      for (const g of Object.values(this.walls)) g.traverse((o) => { if (o.isMesh) o.castShadow = shadows; });
      this.ceilingMesh.castShadow = shadows;
    }
    const hidden = new Set();
    for (const [id, g] of Object.entries(this.walls)) {
      const show = mode === 'walk' || (mode === 'room' && !g.userData.outside(cam));
      g.visible = show && mode !== 'photo';
      if (!g.visible) hidden.add(id);
    }
    this.floorMesh.visible = mode !== 'photo';
    this.ceilingMesh.visible = mode === 'walk';
    this.views.visible = mode === 'walk';
    if (this.room?.curtains) this.room.curtains.children.forEach((c) => { c.visible = mode === 'photo' ? c.userData.wall !== 'front' : !hidden.has(c.userData.wall); });
    this.fx.visible = mode !== 'photo' || !!this.selected;
    const limit = this.photoInfo ? this.photoInfo.camDist - 0.55 : Infinity;
    for (const [key, e] of this.items) {
      if (e.parts || e.shell) continue;
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
    if (this.mode === 'off' || this.ptBusy) return;
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
    if (this.mode === 'studio') {
      this.renderer.render(this.studio.scene, this.studio.camera);
      this.studio.dims.update(this.studio.camera, this.size);
      return;
    }
    this.updateVisibility();
    if (this.mode === 'photo') this.renderer.render(this.scene, this.photoCamera);
    else {
      this.composer.passes[0].camera = this.camera;
      this.gtao.camera = this.camera;
      this.composer.render();
    }
    this.roomDims.items.forEach((it) => { it.el.hidden = this.mode !== 'room'; });
    if (this.mode === 'room') this.roomDims.update(this.camera, this.size);
  }
}
