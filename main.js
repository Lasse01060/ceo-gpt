/* ============================================================
   Smart Home — Sprich mit deinem Haus
   3D-Haus, geführte Kamera-Tour, Smart-Home-Effekte und Sprachsteuerung.
   Läuft im Browser (Safari auf dem iPad). Kein Server, keine App nötig.
   ============================================================ */

import * as THREE from 'three';

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
  document.getElementById('app').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10182b);
  scene.fog = new THREE.Fog(0x10182b, 22, 46);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(3.0, 5.2, 14.5);

  // Grundlicht, damit das Haus auch bei "Licht aus" sichtbar ist
  scene.add(new THREE.HemisphereLight(0xcdd8ff, 0x202838, 0.85));
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const sun = new THREE.DirectionalLight(0xfff2dd, 0.55);
  sun.position.set(8, 16, 12);
  scene.add(sun);
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
  });
}

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0);
  if (opts.ry) m.rotation.y = opts.ry;
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

/* ============================================================
   2) Das Haus bauen
   Vorne (+z) ist offen wie ein Puppenhaus, damit die Kamera hineinsieht.
   ============================================================ */
const world = {
  lamps: [],        // Deckenlampen + Stehlampe (gehen bei "Licht an" an)
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), mat(0x0e1322, { rough: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; house.add(ground);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), mat(0xc9b393, { rough: 0.95 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0); house.add(floor);

  // Außenwände: hinten (-z), links (-x), rechts (+x). Vorne offen.
  box(16.2, H, t, 0xe7e2d7, { x: 0, y: H / 2, z: -6 });                 // hinten
  world.featureWall = box(t, H, 12, 0xeae6df, { x: -8, y: H / 2, z: 0, emissive: 0xeae6df, emissiveIntensity: 0.0 }); // LINKS = Farbwand
  box(t, H, 12, 0xe7e2d7, { x: 8, y: H / 2, z: 0 });                    // rechts

  // Halbhohe Trennwände -> vier Räume, mittiger Flur, Kamera sieht drüber
  box(t, ph, 5, 0xf0ece2, { x: 0, y: ph / 2, z: 3.5 });   // x=0, vorne
  box(t, ph, 5, 0xf0ece2, { x: 0, y: ph / 2, z: -3.5 });  // x=0, hinten
  box(7, ph, t, 0xf0ece2, { x: -4.5, y: ph / 2, z: 0 });  // z=0, links
  box(7, ph, t, 0xf0ece2, { x: 4.5, y: ph / 2, z: 0 });   // z=0, rechts

  buildLivingRoom();
  buildKitchen();
  buildLaundry();
  buildHeating();
  buildLamps();
  buildDoor();

  // Raum-Schilder zur Orientierung
  textSprite('Wohnzimmer', { x: -4, y: 2.9, z: 4.6, scale: 0.9 });
  textSprite('Küche', { x: 4, y: 2.9, z: 4.6, scale: 0.9 });
  textSprite('Waschraum', { x: -4, y: 2.9, z: -1.2, scale: 0.9 });
  textSprite('Klima', { x: 4, y: 2.9, z: -1.2, scale: 0.9 });

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
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.2, 0.08), mat(0x6f4a2c, { rough: 0.6 }));
  panel.position.set(0.78, 0, 0);
  pivot.add(panel);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), mat(0xf0c75e, { metal: 0.8, rough: 0.3 }));
  handle.position.set(1.42, 0, 0.09);
  pivot.add(handle);
  g.add(pivot);
  house.add(g);
  world.door = { pivot };
}

/* ---------- Wohnzimmer (vorne links) ---------- */
function buildLivingRoom() {
  const couch = 0x3c465f;
  box(3.4, 0.02, 2.4, 0x8390b8, { x: -4.6, y: 0.012, z: 3.4, rough: 1 }); // Teppich
  box(2.4, 0.45, 1.0, couch, { x: -5.0, y: 0.25, z: 3.5, flat: true });    // Sofa Sitz
  box(2.4, 0.6, 0.22, couch, { x: -5.0, y: 0.55, z: 3.95, flat: true });   // Lehne
  box(0.22, 0.5, 1.0, couch, { x: -6.1, y: 0.4, z: 3.5, flat: true });     // Armlehne
  box(0.22, 0.5, 1.0, couch, { x: -3.9, y: 0.4, z: 3.5, flat: true });
  box(1.0, 0.3, 0.6, 0x8a6a48, { x: -3.0, y: 0.2, z: 2.8 });               // Couchtisch
  // Zimmerpflanze
  box(0.3, 0.3, 0.3, 0xb9743a, { x: -1.6, y: 0.15, z: 5.2 });
  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), mat(0x3f9a5b, { flat: true }));
  leaf.position.set(-1.6, 0.7, 5.2); house.add(leaf);
}

/* ---------- Küche (vorne rechts) ---------- */
function buildKitchen() {
  box(0.9, 0.9, 5.0, 0xeef1f6, { x: 6.9, y: 0.45, z: 3.0 });        // Unterschrank
  box(0.9, 0.05, 5.0, 0x2b3142, { x: 6.9, y: 0.93, z: 3.0 });        // Arbeitsplatte
  box(0.9, 0.6, 4.0, 0xe7eaf0, { x: 7.0, y: 2.4, z: 3.0 });          // Oberschränke
  // Kühlschrank mit Smart-Display
  box(0.9, 2.0, 0.9, 0xdfe4ec, { x: 7.0, y: 1.0, z: 5.4 });
  box(0.04, 0.5, 0.3, 0x000000, { x: 6.54, y: 1.4, z: 5.4, emissive: 0x35c9c1, emissiveIntensity: 0.7 });

  // Induktionsfeld + Topf
  box(0.74, 0.06, 0.74, 0x14181f, { x: 6.4, y: 0.97, z: 2.6 });      // Glasfeld
  const glow = box(0.55, 0.03, 0.55, 0x3a1a00, { x: 6.4, y: 1.0, z: 2.6, emissive: 0xff5a1e, emissiveIntensity: 0 });
  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.26, 24), mat(0x9aa2ad, { metal: 0.5, rough: 0.4 }));
  potBody.position.set(6.4, 1.16, 2.6); house.add(potBody);
  const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 24), mat(0x6f7782, { metal: 0.5, rough: 0.4 }));
  potLid.position.set(6.4, 1.31, 2.6); house.add(potLid);

  const light = new THREE.PointLight(0xff6a2a, 0, 6, 2);
  light.position.set(6.4, 1.3, 2.6); house.add(light);

  world.stove = { glow, light, potBody, potLid, baseY: 1.16 };
}

/* ---------- Waschraum (hinten links) ---------- */
function buildLaundry() {
  // Waschmaschine, Front zeigt nach +z
  const wz = -4.6;
  box(1.0, 1.0, 0.9, 0xe9edf3, { x: -6.6, y: 0.5, z: wz });               // Korpus
  box(0.8, 0.18, 0.06, 0x222838, { x: -6.6, y: 0.85, z: wz + 0.46, emissive: 0x5b8cff, emissiveIntensity: 0.6 }); // Bedienpanel
  // Tür: Ring + Glas + Trommel
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 12, 28), mat(0x3a4154, { metal: 0.4 }));
  ring.position.set(-6.6, 0.45, wz + 0.46); house.add(ring);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.26, 28), mat(0x9fc8ff, { transparent: true, opacity: 0.35, rough: 0.1 }));
  glass.position.set(-6.6, 0.45, wz + 0.49); house.add(glass);
  // Trommel: dreht sich um z-Achse
  const drum = new THREE.Group();
  drum.position.set(-6.6, 0.45, wz + 0.44);
  const drumBack = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), mat(0x20242f));
  drumBack.position.z = -0.06; drum.add(drumBack);
  // Wäschestücke in der Trommel
  [0xff6b6b, 0xffd166, 0x6ad1ff, 0x7af2c9].forEach((c, i) => {
    const a = (i / 4) * Math.PI * 2;
    const cl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), mat(c, { flat: true }));
    cl.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0);
    drum.add(cl);
  });
  house.add(drum);

  const glow = new THREE.PointLight(0x5b8cff, 0, 5, 2);
  glow.position.set(-6.6, 0.6, wz + 0.6); house.add(glow);

  // Wäschekorb
  box(0.5, 0.35, 0.4, 0xb9956a, { x: -3.0, y: 0.18, z: -4.6 });

  world.washer = { drum, glow, frontZ: wz + 0.46 };

  buildRobot();
}

/* ---------- Wäsche-Roboter ---------- */
function buildRobot() {
  const g = new THREE.Group();
  // Basis + Räder
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.12, 20), mat(0x2b3142, { flat: true }));
  base.position.y = 0.08; g.add(base);
  // Körper
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.42), mat(0xeef1f6, { flat: true }));
  body.position.y = 0.42; g.add(body);
  // "Bauch"-Anzeige
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), mat(0x000000, { emissive: 0x7af2c9, emissiveIntensity: 0.8 }));
  belly.position.set(0, 0.42, 0.22); g.add(belly);
  // Kopf
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.34), mat(0x5b8cff, { flat: true }));
  head.position.y = 0.78; g.add(head);
  // Augen
  [-0.1, 0.1].forEach((dx) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), mat(0x0d1018, { emissive: 0xffffff, emissiveIntensity: 0.5 }));
    eye.position.set(dx, 0.8, 0.18); g.add(eye);
  });
  // Arme
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.08), mat(0xcdd4e0, { flat: true }));
  armL.position.set(-0.31, 0.42, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.31; g.add(armR);

  const dock = new THREE.Vector3(-2.3, 0, -2.2);
  g.position.copy(dock);
  house.add(g);

  world.robot = {
    group: g, armL, armR,
    dock,
    workPos: new THREE.Vector3(-5.3, 0, world.washer.frontZ - 0.2),
    state: 'idle', t: 0,
  };
}

/* ---------- Heizung / Klima (hinten rechts) ---------- */
function buildHeating() {
  const rad = new THREE.Group();
  const bodyMat = mat(0xf2f4f8, { emissive: 0xff3b1e, emissiveIntensity: 0 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.12), bodyMat);
  rad.add(body);
  // Rippen
  for (let i = -3; i <= 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.16), bodyMat);
    fin.position.x = i * 0.22; rad.add(fin);
  }
  rad.position.set(4.6, 0.6, -5.78); house.add(rad);

  const light = new THREE.PointLight(0xff5a2a, 0, 6, 2);
  light.position.set(4.6, 0.9, -5.4); house.add(light);

  // Thermostat-Panel + Temperatur-Schild
  box(0.5, 0.7, 0.06, 0x10141d, { x: 6.2, y: 1.5, z: -5.86, emissive: 0x5b8cff, emissiveIntensity: 0.4 });
  world.tempSprite = textSprite('19°C', { x: 6.2, y: 1.5, z: -5.78, scale: 0.7, color: '#d7fff1', bg: 'rgba(8,17,30,0.0)' });

  world.radiator = { mat: bodyMat, light };
}

/* ---------- Lampen (Decke + Stehlampe) ---------- */
function buildLamps() {
  const spots = [[-4, 3], [4, 3], [-4, -3], [4, -3]];
  spots.forEach(([x, z]) => {
    const shade = box(0.5, 0.12, 0.5, 0xffffff, { x, y: 3.25, z, emissive: 0xffd9a0, emissiveIntensity: 0 });
    const light = new THREE.PointLight(0xffe2b0, 0, 11, 2);
    light.position.set(x, 3.1, z); house.add(light);
    world.lamps.push({ light, shade, max: 0.9 });
  });
  // Stehlampe im Wohnzimmer
  box(0.05, 1.4, 0.05, 0x55617a, { x: -7.0, y: 0.7, z: 1.6 });
  const shade = box(0.3, 0.3, 0.3, 0xfff3da, { x: -7.0, y: 1.55, z: 1.6, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const lamp = new THREE.PointLight(0xffe2b0, 0, 9, 2);
  lamp.position.set(-7.0, 1.55, 1.6); house.add(lamp);
  world.lamps.push({ light: lamp, shade, max: 0.8 });
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
    m.visible = false; house.add(m);
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
    l.shade.material.emissiveIntensity = state.lights * 1.1;
  }

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
  world.stove.potBody.position.y = world.stove.baseY + Math.sin(time * 7) * 0.012 * state.stove;
  if (state.stove > 0.5) {
    puffTimer -= dt;
    if (puffTimer <= 0) { spawnPuff(6.4, 1.35, 2.6, 0xffffff); puffTimer = 0.22; }
  }

  // Heizung
  state.heat = damp(state.heat, state.heatTarget, 2.5, dt);
  world.radiator.mat.emissiveIntensity = state.heat * 0.9;
  world.radiator.light.intensity = state.heat * 1.1;
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
