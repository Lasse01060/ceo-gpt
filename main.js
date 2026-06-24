/* ============================================================
   Smart Home — Sprich mit deinem Haus
   3D-Haus, geführte Kamera-Tour, Smart-Home-Effekte und Sprachsteuerung.
   Läuft im Browser (Safari auf dem iPad). Kein Server, keine App nötig.
   ============================================================ */

import * as THREE from 'three';
import { RoundedBoxGeometry } from './vendor/RoundedBoxGeometry.js';

/* ---------- DOM-Bezüge ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  loading: $('loading'),
  notice: $('notice'),
  startOverlay: $('start-overlay'),
  btnStart: $('btn-start'),
  hudTop: $('hud-top'),
  stationLabel: $('station-label'),
  stationTitle: $('station-title'),
  micStatus: $('mic-status'),
  micText: $('mic-text'),
  heardToast: $('heard-toast'),
  promptCard: $('prompt-card'),
  promptHint: $('prompt-hint'),
  promptCommand: $('prompt-command'),
  promptSub: $('prompt-sub'),
  btnTrigger: $('btn-trigger'),
  btnNext: $('btn-next'),
  btnPhysics: $('btn-physics'),
  physicsPanel: $('physics-panel'),
  physicsTitle: $('physics-title'),
  physicsText: $('physics-text'),
  physicsFormula: $('physics-formula'),
  physicsClose: $('physics-close'),
};

/* ============================================================
   1) Renderer, Szene, Kamera, Licht
   ============================================================ */
let renderer, scene, camera;
const clock = new THREE.Clock();

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;          // weiche Schatten für mehr Tiefe
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1626);
  scene.fog = new THREE.Fog(0x0f1626, 26, 52);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(3.0, 5.2, 14.5);

  // Dämmrige Grundbeleuchtung (Abendstimmung) -> "Licht an" wirkt dadurch stark
  scene.add(new THREE.HemisphereLight(0x9fb4e0, 0x141a2a, 0.42));
  scene.add(new THREE.AmbientLight(0x2a3550, 0.10));

  // Weiches Schlüssellicht von schräg oben, wirft Schatten
  const sun = new THREE.DirectionalLight(0xeaf0ff, 0.45);
  sun.position.set(9, 17, 10);
  sun.target.position.set(0, 1, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);

  // Warmes Innenlicht, das bei "Licht an" hochgefahren wird
  world.interiorFill = new THREE.AmbientLight(0xffe2b0, 0);
  scene.add(world.interiorFill);
}

/* ---------- kleine Bau-Helfer ---------- */
const house = new THREE.Group();

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.92,
    metalness: opts.metal ?? 0.0,
    flatShading: !!opts.flat,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
}

// Box mit weich abgerundeten Kanten + Schattenwurf (sieht hochwertiger aus)
function box(w, h, d, color, opts = {}) {
  const minDim = Math.min(w, h, d);
  const r = Math.max(0.012, Math.min(opts.radius ?? 0.05, minDim * 0.45));
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, opts.smooth ?? 2, r), mat(color, opts));
  m.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  if (opts.ry) m.rotation.y = opts.ry;
  m.castShadow = opts.cast !== false;
  m.receiveShadow = opts.receive !== false;
  (opts.parent ?? house).add(m);
  return m;
}

/* ---------- Text als Schild (Sprite) ---------- */
function textSprite(text, opts = {}) {
  const pad = 24;
  const fs = opts.fontSize ?? 64;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fs + pad * 2;
  cv.width = w; cv.height = h;
  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = opts.bg ?? 'rgba(14,20,38,0.78)';
    roundRect(ctx, 0, 0, w, h, 24); ctx.fill();
    ctx.font = `700 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.fillStyle = opts.color ?? '#dbe6ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, w / 2, h / 2 + 2);
  };
  draw(text);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const scale = (opts.scale ?? 1) / 64;
  sp.scale.set(w * scale, h * scale, 1);
  sp.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  (opts.parent ?? house).add(sp);
  sp.userData.redraw = (t) => { draw(t); tex.needsUpdate = true; };
  return sp;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- weicher Leucht-Halo (Sprite, für Lampen/Glut) ---------- */
let GLOW_TEX = null;
function glowSprite(color, size, opts = {}) {
  if (!GLOW_TEX) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const rad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rad.addColorStop(0, 'rgba(255,255,255,1)');
    rad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    rad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rad; g.fillRect(0, 0, 128, 128);
    GLOW_TEX = new THREE.CanvasTexture(cv);
    GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: GLOW_TEX, color, transparent: true, opacity: opts.opacity ?? 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sp.scale.set(size, size, 1);
  sp.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  (opts.parent ?? house).add(sp);
  return sp;
}

/* ============================================================
   2) Das Haus bauen
   Vorne (+z) ist offen wie ein Puppenhaus, damit die Kamera hineinsieht.
   ============================================================ */
const world = {
  lamps: [],        // Deckenlampen + Stehlampe (gehen bei "Licht an" an)
  interiorFill: null,
  door: null,
  featureWall: null,
  stove: null,
  washer: null,
  robot: null,
  radiator: null,
  tempSprite: null,
};

function buildHouse() {
  const H = 3.5;        // Wandhöhe
  const t = 0.18;       // Wanddicke
  const ph = 1.3;       // halbe Trennwand-Höhe

  // Umliegender Boden + Hausboden
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0x0c1120, { rough: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; house.add(ground);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat(0xc8a87a, { rough: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); floor.receiveShadow = true; house.add(floor);

  // Außenwände: hinten (-z), links (-x), rechts (+x). Vorne offen.
  box(16.2, H, t, 0xe7e2d7, { x: 0, y: H / 2, z: -6 });                 // hinten
  world.featureWall = box(t, H, 12, 0xeae6df, { x: -8, y: H / 2, z: 0, emissive: 0xeae6df, emissiveIntensity: 0.0 }); // LINKS = Farbwand
  box(t, H, 12, 0xe7e2d7, { x: 8, y: H / 2, z: 0 });                    // rechts

  // Halbhohe Trennwände -> vier Räume, mittiger Flur, Kamera sieht drüber
  box(t, ph, 5, 0xf0ece2, { x: 0, y: ph / 2, z: 3.5 });   // x=0, vorne
  box(t, ph, 5, 0xf0ece2, { x: 0, y: ph / 2, z: -3.5 });  // x=0, hinten
  box(7, ph, t, 0xf0ece2, { x: -4.5, y: ph / 2, z: 0 });  // z=0, links
  box(7, ph, t, 0xf0ece2, { x: 4.5, y: ph / 2, z: 0 });   // z=0, rechts

  // Sockelleisten (Boden-Abschluss an den Außenwänden)
  box(15.6, 0.12, 0.05, 0xd8d2c4, { x: 0, y: 0.07, z: -5.86, cast: false });
  box(0.05, 0.12, 11.6, 0xd8d2c4, { x: -7.86, y: 0.07, z: 0, cast: false });
  box(0.05, 0.12, 11.6, 0xd8d2c4, { x: 7.86, y: 0.07, z: 0, cast: false });
  // Fenster in der Rückwand (weiches Abendlicht)
  buildWindow(-2.4); buildWindow(1.2);

  buildLivingRoom();
  buildKitchen();
  buildLaundry();
  buildHeating();
  buildLamps();
  buildDoor();

  // Raum-Schilder zur Orientierung (klein & dezent)
  const lbl = { scale: 0.4, color: '#c2cee8', bg: 'rgba(12,18,32,0.5)' };
  textSprite('Wohnzimmer', { x: -4, y: 3.25, z: 4.6, ...lbl });
  textSprite('Küche', { x: 4, y: 3.25, z: 4.6, ...lbl });
  textSprite('Waschraum', { x: -4, y: 3.25, z: -1.2, ...lbl });
  textSprite('Klima', { x: 4, y: 3.25, z: -1.2, ...lbl });

  scene.add(house);
}

/* ---------- Eingangstür (vorne, öffnet sich beim Start) ---------- */
function buildDoor() {
  const g = new THREE.Group();
  const zf = 6;                                    // Türebene = offene Vorderseite
  // Rahmen: zwei Pfosten + Sturz
  box(0.22, 2.55, 0.28, 0xb89066, { x: -1.0, y: 1.27, z: zf, parent: g });
  box(0.22, 2.55, 0.28, 0xb89066, { x: 1.0, y: 1.27, z: zf, parent: g });
  box(2.4, 0.25, 0.28, 0xb89066, { x: 0, y: 2.5, z: zf, parent: g });
  // Schild über der Tür + Fußmatte
  textSprite('Smart Home', { x: 0, y: 3.0, z: zf, scale: 0.85, color: '#dbe6ff', parent: g });
  box(1.5, 0.04, 0.8, 0x2b3142, { x: 0, y: 0.02, z: zf + 0.7, parent: g });
  // Türblatt mit Scharnier links (Pivot sitzt auf der Scharnierkante)
  const pivot = new THREE.Group();
  pivot.position.set(-0.85, 1.2, zf);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(1.55, 2.2, 0.09, 2, 0.03), mat(0x7a5232, { rough: 0.55 }));
  panel.position.set(0.78, 0, 0); panel.castShadow = true; pivot.add(panel);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), mat(0xbfe0ff, { transparent: true, opacity: 0.45, emissive: 0x6a9fd6, emissiveIntensity: 0.35 }));
  win.position.set(0.78, 0.55, 0.06); pivot.add(win);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), mat(0xf0c75e, { metal: 0.8, rough: 0.3 }));
  handle.position.set(1.42, 0, 0.09); handle.castShadow = true;
  pivot.add(handle);
  g.add(pivot);
  house.add(g);
  world.door = { pivot };
}

/* ---------- Fenster in der Rückwand ---------- */
function buildWindow(x) {
  box(1.7, 1.35, 0.08, 0x2a3550, { x, y: 1.95, z: -5.9, radius: 0.04, cast: false });  // Rahmen
  box(1.45, 1.12, 0.04, 0xacd2ff, { x, y: 1.95, z: -5.86, emissive: 0x5b86c4, emissiveIntensity: 0.7, cast: false, radius: 0.02 }); // Scheibe
  box(0.05, 1.12, 0.05, 0x2a3550, { x, y: 1.95, z: -5.84, cast: false });              // Sprosse senkrecht
  box(1.45, 0.05, 0.05, 0x2a3550, { x, y: 1.95, z: -5.84, cast: false });              // Sprosse waagerecht
}

/* ---------- Wohnzimmer (vorne links) ---------- */
function buildLivingRoom() {
  const couch = 0x4a5a78, cushion = 0x5e7099;
  // Teppich (zwei Lagen für einen Rand)
  box(3.7, 0.03, 2.7, 0x8b97bd, { x: -4.6, y: 0.015, z: 3.4, radius: 0.02 });
  box(3.2, 0.05, 2.2, 0xb9c2dd, { x: -4.6, y: 0.035, z: 3.4, radius: 0.02 });
  // Sofa: Sitz, Lehne, zwei Armlehnen, zwei Sitzkissen, Zierkissen, Füße
  box(2.6, 0.4, 1.1, couch, { x: -5.0, y: 0.34, z: 3.5, radius: 0.13 });
  box(2.6, 0.7, 0.26, couch, { x: -5.0, y: 0.62, z: 4.0, radius: 0.13 });
  box(0.3, 0.55, 1.1, couch, { x: -6.25, y: 0.46, z: 3.5, radius: 0.12 });
  box(0.3, 0.55, 1.1, couch, { x: -3.75, y: 0.46, z: 3.5, radius: 0.12 });
  box(0.95, 0.2, 0.9, cushion, { x: -5.55, y: 0.52, z: 3.45, radius: 0.09 });
  box(0.95, 0.2, 0.9, cushion, { x: -4.5, y: 0.52, z: 3.45, radius: 0.09 });
  box(0.46, 0.46, 0.16, 0xe0a25e, { x: -5.0, y: 0.66, z: 3.25, radius: 0.12, ry: 0.3 });
  [[-6.15, 3.05], [-3.85, 3.05], [-6.15, 3.95], [-3.85, 3.95]].forEach(([x, z]) =>
    box(0.1, 0.16, 0.1, 0x232834, { x, y: 0.08, z, radius: 0.02 }));
  // Couchtisch mit Beinen + Deko
  box(1.2, 0.1, 0.7, 0x9c7547, { x: -3.0, y: 0.44, z: 2.7, radius: 0.04 });
  [[-3.5, 2.45], [-2.5, 2.45], [-3.5, 2.95], [-2.5, 2.95]].forEach(([x, z]) =>
    box(0.08, 0.4, 0.08, 0x6f5230, { x, y: 0.22, z, radius: 0.02 }));
  box(0.5, 0.04, 0.3, 0xcfd6e0, { x: -3.0, y: 0.51, z: 2.7, radius: 0.02 });
  // Zimmerpflanze: Topf + gestapelte Blätter
  box(0.36, 0.42, 0.36, 0xcf7d44, { x: -1.5, y: 0.21, z: 5.2, radius: 0.1 });
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 - i * 0.07, 0), mat([0x3f9a5b, 0x47a866, 0x55bd78][i], { flat: true }));
    leaf.position.set(-1.5, 0.64 + i * 0.2, 5.2); leaf.castShadow = true; house.add(leaf);
  }
}

/* ---------- Küche (vorne rechts) ---------- */
function buildKitchen() {
  // Unterschrank + Arbeitsplatte + Schubladenfronten mit Griffen
  box(0.95, 0.85, 5.0, 0xeef1f6, { x: 6.95, y: 0.43, z: 3.0, radius: 0.04 });
  box(1.0, 0.08, 5.0, 0x2b3142, { x: 6.95, y: 0.9, z: 3.0, radius: 0.03 });
  for (let i = 0; i < 3; i++) {
    const z = 1.4 + i * 1.5;
    box(0.04, 0.7, 1.35, 0xe2e6ee, { x: 6.46, y: 0.46, z, cast: false });
    box(0.05, 0.05, 0.45, 0x9aa2b0, { x: 6.41, y: 0.62, z, metal: 0.7, rough: 0.3 });
  }
  // Spritzschutz + Oberschränke mit Griffen
  box(0.05, 0.75, 5.0, 0xdce6ee, { x: 7.47, y: 1.4, z: 3.0, cast: false });
  box(0.95, 0.65, 4.0, 0xe7eaf0, { x: 7.0, y: 2.35, z: 3.0, radius: 0.04 });
  box(0.05, 0.05, 1.2, 0x9aa2b0, { x: 6.5, y: 2.04, z: 2.3, metal: 0.7, rough: 0.3 });
  box(0.05, 0.05, 1.2, 0x9aa2b0, { x: 6.5, y: 2.04, z: 3.7, metal: 0.7, rough: 0.3 });
  // Kühlschrank: Türfuge + Griff + Smart-Display
  box(0.95, 2.0, 0.95, 0xdfe4ec, { x: 7.0, y: 1.0, z: 5.4, radius: 0.05 });
  box(0.04, 0.04, 0.95, 0xcdd3dd, { x: 6.52, y: 1.2, z: 5.4, cast: false });
  box(0.04, 1.3, 0.05, 0x9aa2b0, { x: 6.5, y: 1.0, z: 5.02, metal: 0.7, rough: 0.3 });
  box(0.03, 0.45, 0.28, 0x0b0e14, { x: 6.53, y: 1.55, z: 5.6, emissive: 0x35c9c1, emissiveIntensity: 0.7, cast: false });
  // Spüle + Wasserhahn
  box(0.5, 0.05, 0.5, 0x8a93a3, { x: 6.95, y: 0.92, z: 4.55, metal: 0.6, rough: 0.3, cast: false });
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.32, 12), mat(0x9aa2b0, { metal: 0.8, rough: 0.25 }));
  tap.position.set(7.12, 1.08, 4.55); tap.castShadow = true; house.add(tap);
  // Induktionsfeld (Glas) + zwei Kochzonen-Ringe + Topf
  box(0.78, 0.06, 0.78, 0x14181f, { x: 6.4, y: 0.96, z: 2.6, radius: 0.03 });
  const glow = box(0.5, 0.025, 0.5, 0x3a1a00, { x: 6.4, y: 0.99, z: 2.6, emissive: 0xff5a1e, emissiveIntensity: 0, radius: 0.02, cast: false });
  [[-0.15, 2.43], [0.15, 2.78]].forEach(([dx, zz]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 24), mat(0x2e3640));
    ring.rotation.x = -Math.PI / 2; ring.position.set(6.4 + dx, 0.995, zz); house.add(ring);
  });
  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.26, 28), mat(0x9aa2ad, { metal: 0.6, rough: 0.35 }));
  potBody.position.set(6.4, 1.16, 2.6); potBody.castShadow = true; house.add(potBody);
  const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.04, 28), mat(0x6f7782, { metal: 0.6, rough: 0.35 }));
  potLid.position.set(6.4, 1.31, 2.6); potLid.castShadow = true; house.add(potLid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), mat(0x2b3142));
  knob.position.set(6.4, 1.35, 2.6); house.add(knob);

  const light = new THREE.PointLight(0xff6a2a, 0, 6, 2);
  light.position.set(6.4, 1.3, 2.6); house.add(light);
  const halo = glowSprite(0xff7a2a, 1.3, { x: 6.4, y: 1.12, z: 2.6 });

  world.stove = { glow, light, halo, potBody, potLid, baseY: 1.16 };
}

/* ---------- Waschraum (hinten links) ---------- */
function buildLaundry() {
  const wz = -4.6;
  // Korpus (abgerundet) + Waschmittelschublade + Bedienpanel + Drehknopf
  box(1.05, 1.05, 0.95, 0xeef2f8, { x: -6.6, y: 0.53, z: wz, radius: 0.08 });
  box(0.5, 0.12, 0.05, 0xcfd6e0, { x: -6.6, y: 0.93, z: wz + 0.49, cast: false });
  box(0.85, 0.16, 0.04, 0x222838, { x: -6.6, y: 0.73, z: wz + 0.49, emissive: 0x5b8cff, emissiveIntensity: 0.7, cast: false });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), mat(0xc7cdd8, { metal: 0.6, rough: 0.3 }));
  knob.rotation.x = Math.PI / 2; knob.position.set(-6.22, 0.73, wz + 0.5); house.add(knob);
  // Bullaugentür: Chromring + Glas + drehbare Trommel mit Wäsche
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 14, 30), mat(0xc7cdd8, { metal: 0.8, rough: 0.25 }));
  ring.position.set(-6.6, 0.42, wz + 0.49); house.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.28, 30), mat(0x9fc8ff, { transparent: true, opacity: 0.3, rough: 0.05 }));
  glass.position.set(-6.6, 0.42, wz + 0.52); house.add(glass);
  const drum = new THREE.Group();
  drum.position.set(-6.6, 0.42, wz + 0.46);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.34, 26, 1, true), mat(0xb9c2d2, { metal: 0.5, rough: 0.4, side: THREE.DoubleSide }));
  tube.rotation.x = Math.PI / 2; tube.position.z = -0.18; drum.add(tube);
  [0xff6b6b, 0xffd166, 0x6ad1ff, 0x7af2c9, 0xc78bff].forEach((c, i) => {
    const a = (i / 5) * Math.PI * 2;
    const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), mat(c, { flat: true }));
    cl.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, -0.05); cl.castShadow = true; drum.add(cl);
  });
  house.add(drum);
  const glow = new THREE.PointLight(0x6aa0ff, 0, 5, 2);
  glow.position.set(-6.6, 0.55, wz + 0.7); house.add(glow);
  // Regal mit Körben + Wäschekorb
  box(1.15, 0.06, 0.5, 0xb7956a, { x: -6.7, y: 1.7, z: -5.6, radius: 0.02 });
  box(0.46, 0.3, 0.36, 0xe0a25e, { x: -6.95, y: 1.9, z: -5.6, radius: 0.06 });
  box(0.46, 0.3, 0.36, 0x6aa0d0, { x: -6.42, y: 1.9, z: -5.6, radius: 0.06 });
  box(0.54, 0.4, 0.44, 0xcaa06f, { x: -3.0, y: 0.2, z: -4.6, radius: 0.06 });
  box(0.42, 0.22, 0.32, 0xff9aa2, { x: -3.0, y: 0.45, z: -4.6, radius: 0.1 });

  world.washer = { drum, glow, frontZ: wz + 0.49 };
  buildRobot();
}

/* ---------- Wäsche-Roboter ---------- */
function buildRobot() {
  const g = new THREE.Group();
  // Fahrgestell + zwei Räder
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.14, 24), mat(0x2b3142, { metal: 0.3, rough: 0.5 }));
  base.position.y = 0.1; base.castShadow = true; g.add(base);
  [-0.3, 0.3].forEach((dx) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), mat(0x12151c, { rough: 0.6 }));
    wheel.rotation.z = Math.PI / 2; wheel.position.set(dx, 0.1, 0); g.add(wheel);
  });
  // Körper (abgerundet) + Gesichts-Display + leuchtende Augen
  box(0.56, 0.56, 0.46, 0xf2f5fb, { x: 0, y: 0.46, z: 0, radius: 0.16, parent: g });
  box(0.42, 0.3, 0.04, 0x0b0e16, { x: 0, y: 0.52, z: 0.23, radius: 0.06, parent: g, cast: false });
  [-0.09, 0.09].forEach((dx) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 14), mat(0x0d1018, { emissive: 0x7af2c9, emissiveIntensity: 1.0 }));
    eye.position.set(dx, 0.55, 0.255); g.add(eye);
  });
  // Antenne mit leuchtender Spitze
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), mat(0x9aa2b0, { metal: 0.6 }));
  ant.position.set(0, 0.82, 0); g.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), mat(0xff6b6b, { emissive: 0xff6b6b, emissiveIntensity: 0.9 }));
  tip.position.set(0, 0.92, 0); g.add(tip);
  // Arme (drehen sich beim Waschen)
  const armL = box(0.09, 0.36, 0.09, 0xd3dae6, { x: -0.34, y: 0.46, z: 0, radius: 0.04, parent: g });
  const armR = box(0.09, 0.36, 0.09, 0xd3dae6, { x: 0.34, y: 0.46, z: 0, radius: 0.04, parent: g });

  const dock = new THREE.Vector3(-2.3, 0, -2.2);
  g.position.copy(dock); house.add(g);
  world.robot = { group: g, armL, armR, dock, workPos: new THREE.Vector3(-5.3, 0, world.washer.frontZ - 0.2), state: 'idle', t: 0 };
}

/* ---------- Heizung / Klima (hinten rechts) ---------- */
function buildHeating() {
  const rad = new THREE.Group();
  const bodyMat = mat(0xf4f6fa, { emissive: 0xff3b1e, emissiveIntensity: 0, rough: 0.5, metal: 0.1 });
  // Rippen als Rohre + obere/untere Sammelrohre + Ventilknauf
  for (let i = -4; i <= 4; i++) {
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.86, 12), bodyMat);
    fin.position.x = i * 0.18; fin.castShadow = true; rad.add(fin);
  }
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.72, 12), bodyMat);
  top.rotation.z = Math.PI / 2; top.position.y = 0.42; rad.add(top);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.72, 12), bodyMat);
  bot.rotation.z = Math.PI / 2; bot.position.y = -0.42; rad.add(bot);
  const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), mat(0xc7cdd8, { metal: 0.7, rough: 0.3 }));
  valve.rotation.z = Math.PI / 2; valve.position.set(-0.9, -0.3, 0); rad.add(valve);
  rad.position.set(4.6, 0.62, -5.74); house.add(rad);

  const light = new THREE.PointLight(0xff5a2a, 0, 6, 2);
  light.position.set(4.6, 0.7, -5.4); house.add(light);
  const halo = glowSprite(0xff5a2a, 2.0, { x: 4.6, y: 0.7, z: -5.5 });

  // Thermostat-Panel + Temperatur-Schild
  box(0.55, 0.75, 0.07, 0x10141d, { x: 6.2, y: 1.5, z: -5.86, radius: 0.06 });
  box(0.42, 0.55, 0.03, 0x0a1f2e, { x: 6.2, y: 1.55, z: -5.82, emissive: 0x0a2738, emissiveIntensity: 0.5, cast: false });
  world.tempSprite = textSprite('19°C', { x: 6.2, y: 1.55, z: -5.79, scale: 0.55, color: '#d7fff1', bg: 'rgba(8,17,30,0.0)' });

  world.radiator = { mat: bodyMat, light, halo };
}

/* ---------- Lampen (Decke + Stehlampe) ---------- */
function buildLamps() {
  const spots = [[-4, 3], [4, 3], [-4, -3], [4, -3]];
  spots.forEach(([x, z]) => {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), mat(0x2a2f3a));
    cord.position.set(x, 3.25, z); house.add(cord);
    const shadeCone = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.32, 0.3, 24, 1, true), mat(0xf3f5fa, { emissive: 0xffd9a0, emissiveIntensity: 0, side: THREE.DoubleSide, rough: 0.6 }));
    shadeCone.position.set(x, 2.9, z); house.add(shadeCone);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 14), mat(0x3a2e18, { emissive: 0xffcaa0, emissiveIntensity: 0 }));
    bulb.position.set(x, 2.82, z); house.add(bulb);
    const light = new THREE.PointLight(0xffe2b0, 0, 12, 2);
    light.position.set(x, 2.75, z); house.add(light);
    const halo = glowSprite(0xffdca8, 1.5, { x, y: 2.85, z });
    world.lamps.push({ light, shade: bulb, halo, max: 1.5 });
  });
  // Stehlampe im Wohnzimmer
  box(0.06, 1.4, 0.06, 0x55617a, { x: -7.0, y: 0.7, z: 1.6, radius: 0.03 });
  box(0.36, 0.05, 0.36, 0x55617a, { x: -7.0, y: 0.03, z: 1.6 });
  const shadeCone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.32, 20, 1, true), mat(0xfff3da, { emissive: 0xffd9a0, emissiveIntensity: 0, side: THREE.DoubleSide }));
  shadeCone.position.set(-7.0, 1.55, 1.6); house.add(shadeCone);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), mat(0x3a2e18, { emissive: 0xffcaa0, emissiveIntensity: 0 }));
  bulb.position.set(-7.0, 1.5, 1.6); house.add(bulb);
  const lamp = new THREE.PointLight(0xffe2b0, 0, 9, 2);
  lamp.position.set(-7.0, 1.5, 1.6); house.add(lamp);
  const halo = glowSprite(0xffdca8, 1.2, { x: -7.0, y: 1.55, z: 1.6 });
  world.lamps.push({ light: lamp, shade: bulb, halo, max: 1.2 });
}

/* ============================================================
   3) Zustand + Animationen
   ============================================================ */
const state = {
  door: 0, doorTarget: 0,
  lights: 0, lightsTarget: 0,
  stove: 0, stoveTarget: 0,
  heat: 0, heatTarget: 0,
  temp: 19, tempTarget: 19,
};
const wallCur = new THREE.Color(0xeae6df);
const wallTarget = new THREE.Color(0xeae6df);

// Dampf-/Konvektions-Partikel (Pool)
const puffs = [];
function initPuffs() {
  const geo = new THREE.SphereGeometry(0.06, 8, 8);
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    m.visible = false; m.castShadow = false; m.receiveShadow = false; house.add(m);
    puffs.push({ mesh: m, life: 0, max: 1, vy: 0 });
  }
}
let puffTimer = 0;
let convTimer = 0;
function spawnPuff(x, y, z, color) {
  const p = puffs.find((q) => q.life <= 0);
  if (!p) return;
  p.mesh.position.set(x + (Math.sin(x * 99 + y) * 0.05), y, z + (Math.cos(z * 71 + y) * 0.05));
  p.mesh.material.color.set(color);
  p.mesh.scale.setScalar(0.5 + (y % 1) * 0.3);
  p.life = p.max = 1.6;
  p.vy = 0.5;
  p.mesh.visible = true;
}
function updatePuffs(dt) {
  for (const p of puffs) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.mesh.position.y += p.vy * dt;
    p.mesh.scale.multiplyScalar(1 + dt * 0.6);
    p.mesh.material.opacity = Math.max(0, (p.life / p.max) * 0.6);
    if (p.life <= 0) p.mesh.visible = false;
  }
}

function damp(cur, target, lambda, dt) {
  return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
}

function updateWorld(dt, time) {
  // Eingangstür
  state.door = damp(state.door, state.doorTarget, 3, dt);
  if (world.door) world.door.pivot.rotation.y = -1.85 * state.door; // schwingt nach außen auf

  // Licht
  state.lights = damp(state.lights, state.lightsTarget, 4, dt);
  for (const l of world.lamps) {
    l.light.intensity = state.lights * l.max;
    l.shade.material.emissiveIntensity = state.lights * 1.8;
    if (l.halo) l.halo.material.opacity = state.lights * 0.6;
  }
  if (world.interiorFill) world.interiorFill.intensity = state.lights * 0.5;

  // Farbwand
  wallCur.lerp(wallTarget, 1 - Math.exp(-5 * dt));
  world.featureWall.material.color.copy(wallCur);
  world.featureWall.material.emissive.copy(wallCur);
  world.featureWall.material.emissiveIntensity = 0.16;

  // Induktionsfeld
  state.stove = damp(state.stove, state.stoveTarget, 3, dt);
  const flicker = 0.85 + Math.sin(time * 9) * 0.15;
  world.stove.glow.material.emissiveIntensity = state.stove * 1.4 * flicker;
  world.stove.light.intensity = state.stove * 1.2;
  if (world.stove.halo) world.stove.halo.material.opacity = state.stove * 0.75 * flicker;
  world.stove.potBody.position.y = world.stove.baseY + Math.sin(time * 7) * 0.012 * state.stove;
  if (state.stove > 0.5) {
    puffTimer -= dt;
    if (puffTimer <= 0) { spawnPuff(6.4, 1.35, 2.6, 0xffffff); puffTimer = 0.22; }
  }

  // Heizung
  state.heat = damp(state.heat, state.heatTarget, 2.5, dt);
  world.radiator.mat.emissiveIntensity = state.heat * 0.9;
  world.radiator.light.intensity = state.heat * 1.1;
  if (world.radiator.halo) world.radiator.halo.material.opacity = state.heat * 0.7;
  state.temp = damp(state.temp, state.tempTarget, 1.2, dt);
  if (world.tempSprite) {
    const txt = `${state.temp.toFixed(1)}°C`;
    if (txt !== world.tempSprite.userData.last) {
      world.tempSprite.userData.redraw(txt);
      world.tempSprite.userData.last = txt;
    }
  }
  if (state.heat > 0.4) {
    // Konvektion: warme Luft steigt über dem Heizkörper auf
    convTimer -= dt;
    if (convTimer <= 0) { spawnPuff(4.6 + Math.sin(time * 3) * 0.5, 1.1, -5.5, 0xffb784); convTimer = 0.3; }
  }

  updateRobot(dt);
  updatePuffs(dt);
}

/* ---------- Roboter-Ablauf (Zustandsautomat) ---------- */
function startWash() {
  const r = world.robot;
  if (r.state === 'idle') { r.state = 'driving'; r.t = 0; }
}
function updateRobot(dt) {
  const r = world.robot;
  const w = world.washer;
  const ease = (x) => x * x * (3 - 2 * x);
  if (r.state === 'driving') {
    r.t = Math.min(1, r.t + dt / 2.2);
    r.group.position.lerpVectors(r.dock, r.workPos, ease(r.t));
    if (r.t >= 1) { r.state = 'washing'; r.t = 0; }
  } else if (r.state === 'washing') {
    r.t += dt;
    w.drum.rotation.z -= dt * 7;                 // Trommel dreht
    w.glow.intensity = 0.9 + Math.sin(r.t * 8) * 0.3;
    r.armL.rotation.x = Math.sin(r.t * 6) * 0.5; // Roboter "arbeitet"
    r.armR.rotation.x = -Math.sin(r.t * 6) * 0.5;
    if (r.t >= 5.5) { r.state = 'returning'; r.t = 0; r.armL.rotation.x = 0; r.armR.rotation.x = 0; }
  } else if (r.state === 'returning') {
    r.t = Math.min(1, r.t + dt / 2.2);
    r.group.position.lerpVectors(r.workPos, r.dock, ease(r.t));
    w.glow.intensity = Math.max(0, w.glow.intensity - dt * 2);
    w.drum.rotation.z -= dt * 2 * (1 - r.t);
    if (r.t >= 1) { r.state = 'idle'; }
  } else {
    w.glow.intensity = Math.max(0, w.glow.intensity - dt);
  }
}

/* ============================================================
   4) Kamera-Tour
   ============================================================ */
const cam = {
  posFrom: new THREE.Vector3(), posTo: new THREE.Vector3(),
  lookFrom: new THREE.Vector3(), lookTo: new THREE.Vector3(),
  look: new THREE.Vector3(0, 1.2, -0.5),
  t: 1, dur: 1.8,
};
function moveCamera(pos, look, dur = 1.8) {
  cam.posFrom.copy(camera.position);
  cam.lookFrom.copy(cam.look);
  cam.posTo.set(pos[0], pos[1], pos[2]);
  cam.lookTo.set(look[0], look[1], look[2]);
  cam.t = 0; cam.dur = dur;
}
function updateCamera(dt) {
  if (freeRoam) { updateFreeRoam(dt); return; }
  if (cam.t < 1) {
    cam.t = Math.min(1, cam.t + dt / cam.dur);
    const e = cam.t < 0.5 ? 4 * cam.t ** 3 : 1 - Math.pow(-2 * cam.t + 2, 3) / 2; // easeInOutCubic
    camera.position.lerpVectors(cam.posFrom, cam.posTo, e);
    cam.look.lerpVectors(cam.lookFrom, cam.lookTo, e);
  }
  camera.lookAt(cam.look);
}

/* ---------- Frei bewegen (Finale) ---------- */
let freeRoam = false;
const orbit = { theta: 0.5, phi: 0.62, radius: 16, target: new THREE.Vector3(0, 1.2, 0), dragging: false, lx: 0, ly: 0, pinch: 0 };
function updateFreeRoam(dt) {
  if (!orbit.dragging) orbit.theta += dt * 0.08; // sanftes Auto-Drehen
  orbit.phi = Math.max(0.18, Math.min(1.35, orbit.phi));
  const r = orbit.radius, p = orbit.phi, th = orbit.theta;
  camera.position.set(
    orbit.target.x + r * Math.sin(p) * Math.sin(th),
    orbit.target.y + r * Math.cos(p),
    orbit.target.z + r * Math.sin(p) * Math.cos(th)
  );
  camera.lookAt(orbit.target);
}
let freeRoamInit = false;
function enableFreeRoam() {
  freeRoam = true;
  if (freeRoamInit) return; // Listener nur einmal anhängen
  freeRoamInit = true;
  const c = renderer.domElement;
  c.addEventListener('pointerdown', (e) => { orbit.dragging = true; orbit.lx = e.clientX; orbit.ly = e.clientY; });
  c.addEventListener('pointermove', (e) => {
    if (!orbit.dragging) return;
    orbit.theta -= (e.clientX - orbit.lx) * 0.006;
    orbit.phi -= (e.clientY - orbit.ly) * 0.006;
    orbit.lx = e.clientX; orbit.ly = e.clientY;
  });
  window.addEventListener('pointerup', () => { orbit.dragging = false; });
  // Pinch-Zoom
  c.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      if (orbit.pinch) orbit.radius = Math.max(7, Math.min(26, orbit.radius - (d - orbit.pinch) * 0.03));
      orbit.pinch = d;
    }
  }, { passive: true });
  c.addEventListener('touchend', () => { orbit.pinch = 0; });
}

/* ============================================================
   5) Stationen (das Tutorial)
   ============================================================ */
const COLORS = {
  blau: 0x3b6fe0, rot: 0xe0473b, grün: 0x3fb96b, gruen: 0x3fb96b, grun: 0x3fb96b,
  gelb: 0xf2c84b, orange: 0xf08a3b, lila: 0x9b5be0, violett: 0x9b5be0, lavendel: 0x9b5be0,
  türkis: 0x35c9c1, tuerkis: 0x35c9c1, cyan: 0x35c9c1, pink: 0xe05b9b, rosa: 0xe05b9b, magenta: 0xe05b9b,
  weiß: 0xeae6df, weiss: 0xeae6df, grau: 0x9aa3b2,
};
const colorCycle = [0x3b6fe0, 0xe0473b, 0x3fb96b, 0xf2c84b, 0x9b5be0, 0x35c9c1, 0xe05b9b];
let cycleIdx = 0;

const stations = [
  {
    title: 'Eingang',
    hint: 'Sage laut:',
    command: '„Tür auf"',
    keywords: ['tür', 'tur', 'auf', 'öffne', 'öffnen', 'offne', 'hallo', 'eintreten', 'start', 'los'],
    camPos: [1.6, 1.8, 12.2], camLook: [0, 1.45, 6.2], camDur: 2.6,
    action: () => { state.doorTarget = 1; },
    physics: {
      title: 'Automatische Tür: Sensor & Motor',
      text: 'Smarte Türen öffnen von selbst. Ein Sensor sendet Infrarot- oder Ultraschall-Wellen aus und misst, wie lange ihr Echo zurückbraucht — daraus berechnet er deinen Abstand und merkt, dass du näher kommst. Dann öffnet ein Elektromotor die Tür. Genau wie gleich deine Stimme: erst misst ein Sensor etwas Physikalisches, dann folgt die Aktion.',
      formula: 'Abstand = (v · t) / 2\n(v = Wellengeschwindigkeit, t = Echo-Laufzeit)',
    },
  },
  {
    title: 'Smartes Licht',
    hint: 'Sage laut:',
    command: '„Licht an"',
    keywords: ['licht', 'lampe', 'hell'],
    camPos: [1.5, 3.8, 10.6], camLook: [0, 1.05, -1.0], camDur: 2.4,
    action: () => { state.lightsTarget = 1; },
    physics: {
      title: 'Licht: Strom wird Licht',
      text: 'In smarten Lampen stecken LEDs. Fließt Strom hindurch, fallen Elektronen auf ein niedrigeres Energieniveau und geben die Differenz als Lichtteilchen (Photon) ab. Aus elektrischer Energie wird direkt Lichtenergie — fast ohne Wärmeverlust. Darum sind LEDs so sparsam.',
      formula: 'E_Photon = h · f\n(h = Planck-Konstante, f = Frequenz des Lichts)',
    },
  },
  {
    title: 'Wände mit Farbe',
    hint: 'Sage eine Farbe, z. B.:',
    command: '„Wand blau"',
    keywords: ['wand', 'wände', 'farbe', 'blau', 'rot', 'grün', 'gelb', 'lila', 'türkis', 'pink', 'orange', 'weiß', 'grau'],
    repeatable: true,
    camPos: [-1.6, 2.2, 5.6], camLook: [-7.9, 1.7, 2.2],
    action: (transcript) => {
      let picked = null;
      if (transcript) {
        for (const word in COLORS) if (transcript.includes(word)) { picked = COLORS[word]; break; }
      }
      if (picked === null) { picked = colorCycle[cycleIdx % colorCycle.length]; cycleIdx++; }
      wallTarget.set(picked);
    },
    physics: {
      title: 'Farbe: Licht als Welle',
      text: 'Licht ist eine elektromagnetische Welle. Welche Farbe wir sehen, hängt von der Wellenlänge ab: langwellig = rot (~700 nm), kurzwellig = blau (~450 nm). Die Wand-LEDs mischen Rot, Grün und Blau (RGB). Durch additive Farbmischung entsteht jede Farbe — alle drei zusammen ergeben Weiß.',
      formula: 'c = λ · f\nRot ≈ 700 nm   ·   Blau ≈ 450 nm',
    },
  },
  {
    title: 'Smarte Küche',
    hint: 'Sage laut:',
    command: '„Herd an"',
    keywords: ['herd', 'koch', 'kochen', 'küche', 'induktion'],
    camPos: [3.0, 1.95, 7.4], camLook: [6.5, 1.05, 2.6],
    action: () => { state.stoveTarget = 1; },
    physics: {
      title: 'Induktionsfeld: Magnetfeld kocht',
      text: 'Ein Induktionsherd erzeugt ein schnell wechselndes Magnetfeld. Es durchdringt den Topfboden und erzeugt darin Wirbelströme. Der elektrische Widerstand des Topfes wandelt diese Ströme in Wärme um — der Topf heizt sich selbst, das Kochfeld bleibt vergleichsweise kühl.',
      formula: 'U_ind = −N · dΦ/dt\n(Faradaysches Induktionsgesetz)',
    },
  },
  {
    title: 'Wäsche-Roboter',
    hint: 'Sage laut:',
    command: '„Wäsche waschen"',
    keywords: ['wäsche', 'waschen', 'roboter', 'maschine'],
    camPos: [-1.0, 2.15, -0.4], camLook: [-6.0, 0.7, -4.6],
    action: () => { startWash(); },
    physics: {
      title: 'Roboter & Motor: Strom wird Bewegung',
      text: 'Roboter und Waschtrommel laufen mit Elektromotoren. Ein stromdurchflossener Leiter im Magnetfeld erfährt eine Kraft (Lorentzkraft) — das dreht den Motor. So wird elektrische Energie in Bewegungsenergie: Räder drehen, die Trommel rotiert, die Wäsche wird sauber.',
      formula: 'F = B · I · L\n(Kraft auf einen Leiter im Magnetfeld)',
    },
  },
  {
    title: 'Heizung & Klima',
    hint: 'Sage laut:',
    command: '„Wärmer"',
    keywords: ['wärmer', 'wärme', 'warm', 'heizung', 'heizen', 'heiß'],
    camPos: [1.3, 2.1, 0.2], camLook: [4.9, 1.0, -5.7],
    action: () => { state.heatTarget = 1; state.tempTarget = 23; },
    physics: {
      title: 'Heizung: Wärme wandert',
      text: 'Die smarte Heizung regelt die Temperatur selbst. Wärme breitet sich auf drei Wegen aus: Wärmeleitung (im Heizkörper), Konvektion (warme Luft steigt auf und zirkuliert) und Strahlung (Infrarot). Sensoren messen und schalten nur, wenn nötig — das spart Energie.',
      formula: 'Q = m · c · ΔT\n(Wärmemenge zum Aufheizen)',
    },
  },
  {
    title: 'Geschafft! 🎉',
    final: true,
    hint: 'Dein Haus läuft.',
    command: 'Alles hört auf deine Stimme.',
    camPos: [3.0, 5.2, 14.5], camLook: [0, 1.1, -1.5],
    physics: {
      title: 'Und die Stimme selbst?',
      text: 'Dein Befehl ist eine Schallwelle — schwankender Luftdruck. Das Mikrofon wandelt diese Druckschwankungen in eine elektrische Spannung um und digitalisiert sie (tausende Messwerte pro Sekunde). Software erkennt darin Muster und macht aus Schall einen Befehl. Physik steckt in jedem Schritt dieses Hauses.',
      formula: 'Schall → Spannung → Zahlenfolge → Befehl',
    },
  },
];

let current = -1;
let matchedThisStation = false;

function enterStation(i) {
  current = i;
  matchedThisStation = false;
  const s = stations[i];
  moveCamera(s.camPos, s.camLook, s.camDur ?? (i === 0 ? 2.6 : 1.9));

  el.stationLabel.textContent = `Station ${i + 1} / ${stations.length}`;
  el.stationTitle.textContent = s.title;
  el.promptHint.textContent = s.hint;
  el.promptCommand.textContent = s.command;

  // Physik-Inhalt vorbereiten
  setPhysics(s.physics);
  el.physicsPanel.classList.add('hidden');

  el.btnNext.classList.add('hidden');

  if (s.final) {
    el.promptSub.textContent = '';
    el.btnTrigger.textContent = '🔄 Tour neu starten';
    el.btnTrigger.onclick = restartTour;
    el.btnNext.textContent = '🕹️ Frei bewegen';
    el.btnNext.classList.remove('hidden');
    el.btnNext.onclick = () => { enableFreeRoam(); el.btnNext.classList.add('hidden'); flashHeard('Frei bewegen — wische zum Umsehen', true); };
    setListening(false);
  } else {
    el.promptSub.textContent = '… oder tippe den Knopf, falls das Mikro mal nicht will.';
    el.btnTrigger.textContent = 'Per Tipp auslösen';
    el.btnTrigger.onclick = () => triggerStation(null);
    el.btnNext.textContent = 'Weiter ›';
    el.btnNext.onclick = () => enterStation(Math.min(stations.length - 1, current + 1));
    setListening(voiceOn);
  }
}

function triggerStation(transcript) {
  const s = stations[current];
  if (s.final || !s.action) return;
  s.action(transcript);
  if (!s.repeatable) {
    matchedThisStation = true;
    el.btnTrigger.textContent = '↻ Nochmal';
  }
  el.btnNext.classList.remove('hidden');
  flashHeard('Geschafft! ✓', true);
}

function restartTour() {
  // Zustand zurücksetzen
  state.lightsTarget = 0; state.stoveTarget = 0; state.heatTarget = 0; state.tempTarget = 19;
  state.doorTarget = 0;
  wallTarget.set(0xeae6df);
  freeRoam = false;
  enterStation(0);
}

/* ---------- Physik-Panel ---------- */
function setPhysics(p) {
  el.physicsTitle.textContent = p.title;
  el.physicsText.textContent = p.text;
  el.physicsFormula.textContent = p.formula || '';
}
el.btnPhysics.onclick = () => el.physicsPanel.classList.toggle('hidden');
el.physicsClose.onclick = () => el.physicsPanel.classList.add('hidden');

/* ============================================================
   6) Spracherkennung (Web Speech API)
   ============================================================ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recog = null;
let voiceOn = false;       // Erkennung grundsätzlich verfügbar/erlaubt
let listening = false;     // gerade aktiv am Zuhören
let wantListen = false;    // sollen wir zuhören?
let restartTimer = null;

function setupVoice() {
  if (!SR) {
    voiceOn = false;
    setMic('denied', 'Sprache n/a');
    showNotice('Dein Browser kennt keine Sprach­erkennung. Kein Problem: Tippe einfach die Knöpfe — die Tour funktioniert genauso. (Für Stimme: Safari auf dem iPad.)');
    return;
  }
  recog = new SR();
  recog.lang = 'de-DE';
  recog.continuous = true;
  recog.interimResults = true;
  recog.maxAlternatives = 3;

  recog.onstart = () => { listening = true; if (wantListen) setMic('listening', 'Ich höre …'); };
  recog.onend = () => {
    listening = false;
    if (wantListen) { // iOS stoppt von selbst -> neu starten
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => { try { recog.start(); } catch (e) {} }, 350);
    } else {
      setMic('idle', 'Mikro aus');
    }
  };
  recog.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wantListen = false; voiceOn = false;
      setMic('denied', 'Mikro gesperrt');
      showNotice('Mikrofon nicht erlaubt. Erlaube es in den Safari-Einstellungen — oder tippe einfach die Knöpfe, die Tour läuft trotzdem.');
    }
    // 'no-speech' / 'aborted' / 'network': stillschweigend; onend startet neu
  };
  recog.onresult = (ev) => {
    let transcript = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      transcript += ev.results[i][0].transcript;
    }
    transcript = transcript.toLowerCase().trim();
    if (!transcript) return;
    flashHeard('„' + transcript + '"', false);
    handleTranscript(transcript);
  };

  voiceOn = true;
}

function handleTranscript(transcript) {
  if (current < 0) return;
  const s = stations[current];
  if (s.final || !s.keywords) return;
  if (matchedThisStation && !s.repeatable) return;
  const hit = s.keywords.some((k) => transcript.includes(k));
  if (hit) triggerStation(transcript);
}

function setListening(on) {
  wantListen = on && voiceOn;
  if (!recog) { setMic(voiceOn ? 'idle' : 'denied', voiceOn ? 'Mikro aus' : 'Sprache n/a'); return; }
  if (wantListen) {
    setMic('listening', 'Ich höre …');
    if (!listening) { try { recog.start(); } catch (e) {} }
  } else {
    setMic('idle', 'Mikro aus');
  }
}

function setMic(cls, text) {
  el.micStatus.classList.remove('listening', 'denied');
  if (cls === 'listening') el.micStatus.classList.add('listening');
  if (cls === 'denied') el.micStatus.classList.add('denied');
  el.micText.textContent = text;
}

let heardTimer = null;
function flashHeard(text, good) {
  el.heardToast.textContent = text;
  el.heardToast.classList.remove('hidden', 'good');
  if (good) el.heardToast.classList.add('good');
  clearTimeout(heardTimer);
  heardTimer = setTimeout(() => el.heardToast.classList.add('hidden'), good ? 1400 : 2200);
}

function showNotice(text) {
  el.notice.textContent = text;
  el.notice.classList.remove('hidden');
  setTimeout(() => el.notice.classList.add('hidden'), 8000);
}

// Tippen auf das Mikro-Chip schaltet das Zuhören an/aus
el.micStatus.onclick = () => {
  if (!voiceOn) return;
  setListening(!wantListen);
};

/* ============================================================
   7) Start, Render-Schleife, Resize
   ============================================================ */
function startTour() {
  el.startOverlay.classList.add('hidden');
  el.hudTop.classList.remove('hidden');
  el.promptCard.classList.remove('hidden');
  setupVoice();
  // Wichtig: Erkennung startet hier im Nutzer-Tap (iOS verlangt das).
  // enterStation -> setListening kümmert sich um recog.start().
  enterStation(0);
}
el.btnStart.onclick = startTour;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const time = clock.elapsedTime;
  updateWorld(dt, time);
  updateCamera(dt);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

/* ---------- Los ---------- */
function boot() {
  try {
    initThree();
    buildHouse();
    initPuffs();
    // Kamera-Startblick
    camera.lookAt(cam.look);
    animate();
    el.loading.classList.add('hidden');
  } catch (err) {
    el.loading.innerHTML = '<div style="max-width:320px;text-align:center;line-height:1.5">Hoppla — die 3D-Anzeige konnte nicht starten.<br>Bitte mit einem aktuellen Safari oder Chrome öffnen.</div>';
    console.error(err);
  }
}
boot();
