// Renders the built-in sample room as a "photo": an empty living room with a window,
// shot from a doorway at chest height. Its true size is known, so it doubles as a
// check on the measuring maths.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { floorTexture, windowView } from './textures.js';
import { focalPx, matchPhotoCamera } from './measure.js';
import { rng } from './util.js';

export const SAMPLE = { W: 4.2, D: 4.3, H: 2.6, camX: 2.0, camY: 1.3, stand: 0.45, width: 1600, height: 1200, focal35: 26, vp: { x: 800, y: 470 } };
// The window in the photo, and the door the photo was taken from.
export const SAMPLE_OPENINGS = [
  { wall: 'back', a0: 1.35, a1: 2.85, y0: 0.85, y1: 2.3, kind: 'window' },
  { wall: 'front', a0: 1.55, a1: 2.45, y0: 0, y1: 2.05, kind: 'door' },
];

export function renderSampleRoom() {
  const S = SAMPLE;
  const camDist = S.D - S.stand;
  const fpx = focalPx(S.focal35, S.width, S.height);
  const canvas = document.createElement('canvas');
  canvas.width = S.width; canvas.height = S.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(S.width, S.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  scene.background = new THREE.Color('#ffffff');

  const wall = new THREE.MeshStandardMaterial({ color: '#e9e4db', roughness: 0.95 });
  const trim = new THREE.MeshStandardMaterial({ color: '#f5f3ef', roughness: 0.55 });
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m;
  };
  const plane = (w, h, mat, pos, rotY = 0, rotX = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.copy(pos); m.rotation.set(rotX, rotY, 0, 'YXZ'); m.receiveShadow = true; scene.add(m); return m;
  };

  const floorTex = floorTexture('plank', '#b48a5c').map.clone();
  floorTex.repeat.set(S.W / 2.4, S.D / 2.4);
  floorTex.needsUpdate = true;
  plane(S.W, S.D, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.5 }), new THREE.Vector3(S.W / 2, 0, S.D / 2), 0, -Math.PI / 2);
  plane(S.W, S.D, new THREE.MeshStandardMaterial({ color: '#f3f1ec', roughness: 1 }), new THREE.Vector3(S.W / 2, S.H, S.D / 2), 0, Math.PI / 2);
  plane(S.D, S.H, wall, new THREE.Vector3(0, S.H / 2, S.D / 2), Math.PI / 2);
  plane(S.D, S.H, wall, new THREE.Vector3(S.W, S.H / 2, S.D / 2), -Math.PI / 2);

  // Back wall with a window opening.
  const win = { x0: 1.35, x1: 2.85, y0: 0.85, y1: 2.3 };
  const T = 0.14, zc = -T / 2;
  box(win.x0, S.H, T, wall, win.x0 / 2, S.H / 2, zc);
  box(S.W - win.x1, S.H, T, wall, (S.W + win.x1) / 2, S.H / 2, zc);
  box(win.x1 - win.x0, win.y0, T, wall, (win.x0 + win.x1) / 2, win.y0 / 2, zc);
  box(win.x1 - win.x0, S.H - win.y1, T, wall, (win.x0 + win.x1) / 2, (S.H + win.y1) / 2, zc);
  const cx = (win.x0 + win.x1) / 2, ww = win.x1 - win.x0, wh = win.y1 - win.y0;
  box(ww + 0.12, 0.04, 0.2, trim, cx, win.y0 - 0.01, 0.02);
  box(ww + 0.12, 0.07, 0.05, trim, cx, win.y1 + 0.02, 0.01);
  for (const x of [win.x0 - 0.03, win.x1 + 0.03]) box(0.06, wh + 0.06, 0.05, trim, x, (win.y0 + win.y1) / 2, 0.01);
  box(0.05, wh, 0.06, trim, cx, (win.y0 + win.y1) / 2, -0.06);
  box(ww, 0.05, 0.06, trim, cx, win.y0 + wh * 0.62, -0.06);
  const view = new THREE.Mesh(new THREE.PlaneGeometry(ww + 0.4, wh + 0.4), new THREE.MeshBasicMaterial({ map: windowView() }));
  view.position.set(cx, (win.y0 + win.y1) / 2, -0.5);
  scene.add(view);

  // Skirting boards and a socket.
  box(S.W, 0.09, 0.016, trim, S.W / 2, 0.045, 0.008);
  box(0.016, 0.09, S.D, trim, 0.008, 0.045, S.D / 2);
  box(0.016, 0.09, S.D, trim, S.W - 0.008, 0.045, S.D / 2);
  box(0.085, 0.12, 0.01, trim, 3.55, 0.32, 0.005);

  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e0', emissiveIntensity: 0.8 }));
  lamp.position.set(S.W / 2, S.H - 0.025, S.D / 2);
  scene.add(lamp);

  scene.add(new THREE.HemisphereLight('#f3f6f9', '#b69d7f', 1.1));
  const sun = new THREE.DirectionalLight('#fff1dc', 3.2);
  sun.position.set(cx + 1.6, 4.6, -3.4);
  sun.target.position.set(cx, 0, 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 14 });
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight('#ffffff', 6, 8, 2);
  fill.position.set(S.camX, 2.2, camDist + 0.2);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 50);
  matchPhotoCamera(camera, { fpx, vp: S.vp, width: S.width, height: S.height, camX: S.camX, camY: S.camY, camDist });
  renderer.render(scene, camera);

  // Make it read like a phone photo: soft vignette, warmth and sensor grain.
  const out = document.createElement('canvas');
  out.width = S.width; out.height = S.height;
  const g = out.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0);
  const vg = g.createRadialGradient(S.width / 2, S.height / 2, S.height * 0.35, S.width / 2, S.height / 2, S.width * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,12,0,0.28)');
  g.fillStyle = vg; g.fillRect(0, 0, S.width, S.height);
  const img = g.getImageData(0, 0, S.width, S.height);
  const rand = rng('grain');
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 9;
    img.data[i] += n + 2; img.data[i + 1] += n; img.data[i + 2] += n - 2;
  }
  g.putImageData(img, 0, 0);

  renderer.dispose();
  renderer.forceContextLoss();
  pmrem.dispose();

  const px = (X) => S.vp.x + (fpx * (X - S.camX)) / camDist;
  const py = (Y) => S.vp.y - (fpx * (Y - S.camY)) / camDist;
  return {
    canvas: out,
    marks: { rect: { l: px(0), r: px(S.W), t: py(S.H), b: py(0) }, vp: { ...S.vp } },
    focal35: S.focal35,
    stand: S.stand,
    ceiling: S.H,
  };
}
