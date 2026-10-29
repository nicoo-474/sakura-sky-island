/* =========================================================================
   E. 云 / 昼夜 / 交互 / 主循环
   ========================================================================= */

/* ---------------------------------------------------------------- *
 *  E1. 云
 * ---------------------------------------------------------------- */
function buildClouds() {
  const r = mulberry32(31337);
  const mats = [0.18, 0.26, 0.36, 0.48].map((o) => new T.SpriteMaterial({
    map: TEX.cloud, transparent: true, opacity: o, depthWrite: false, fog: true, color: 0xffffff,
  }));
  const grp = new T.Group();
  const items = [];
  for (let i = 0; i < 15; i++) {
    const a = r() * TAU;
    const rad = 62 + Math.pow(r(), 0.7) * 95;
    const y = -26 + r() * 46;
    const cl = new T.Group();
    cl.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const n = 3 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) {
      const sp = new T.Sprite(mats[Math.floor(r() * mats.length)]);
      const s = 12 + r() * 20;
      sp.scale.set(s, s * 0.58, 1);
      sp.position.set((r() - 0.5) * s * 1.15, (r() - 0.5) * s * 0.20, (r() - 0.5) * s * 0.7);
      cl.add(sp);
    }
    grp.add(cl);
    items.push({ cl, y, ph: r() * TAU, amp: 0.35 + r() * 0.9 });
  }
  // 若干中景云，增加层次
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU;
    const rad = 42 + r() * 30;
    const y = -14 + r() * 26;
    const cl = new T.Group();
    cl.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
    for (let j = 0; j < 2; j++) {
      const sp = new T.Sprite(mats[0]);
      const s = 6 + r() * 10;
      sp.scale.set(s, s * 0.52, 1);
      sp.position.set((r() - 0.5) * s, (r() - 0.5) * s * 0.2, (r() - 0.5) * s * 0.5);
      cl.add(sp);
    }
    grp.add(cl);
    items.push({ cl, y, ph: r() * TAU, amp: 0.2 + r() * 0.5 });
  }
  // 低空云海
  const seaTex = TEX.cloud.clone();
  seaTex.needsUpdate = true;
  seaTex.wrapS = seaTex.wrapT = T.RepeatWrapping;
  seaTex.repeat.set(24, 24);
  const seaMat = new T.MeshBasicMaterial({
    map: seaTex, transparent: true, opacity: 0.13, depthWrite: false, fog: true,
    color: 0xffffff, side: T.DoubleSide,
  });
  const sea = new T.Mesh(new T.PlaneGeometry(1500, 1500, 1, 1), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -42;
  grp.add(sea);
  const seaMat2 = seaMat.clone();
  seaMat2.opacity = 0.08;
  const sea2 = new T.Mesh(new T.PlaneGeometry(1100, 1100, 1, 1), seaMat2);
  sea2.rotation.x = -Math.PI / 2;
  sea2.position.y = -34;
  grp.add(sea2);
  return { grp, mats, items, seaMat, seaMat2, seaTex };
}
const clouds = buildClouds();
scene.add(clouds.grp);

/* ---------------------------------------------------------------- *
 *  E2. 空气尘埃 / 萤火
 * ---------------------------------------------------------------- */
const dust = makeMotes(340, 0xfff0e0, 0.10, 15, [0, 13]);
scene.add(dust);
const motes = makeMotes(220, 0xffe0b0, 0.08, 8, [0.2, 6]);
motes.material.opacity = 0.0;
scene.add(motes);

/* 灯笼点光 */
const lanternLights = [];
[L1, L2].forEach((L) => {
  const pl = new T.PointLight(0xffb469, 0, 9, 2);
  pl.position.copy(L.group.position).add(new T.Vector3(0, 1.42, 0));
  scene.add(pl);
  lanternLights.push(pl);
});

/* ---------------------------------------------------------------- *
 *  E3. 昼夜预设
 * ---------------------------------------------------------------- */
const PRESETS = {
  dawn: {
    skyTop: '#7f6cc4', skyMid: '#e9a8bf', skyHor: '#ffd2c4',
    sun: '#ffe2c4', sunI: 0.95, sunDir: [-0.58, 0.33, -0.60],
    hemiSky: '#c6b3e6', hemiGround: '#f3c0cc', hemiI: 0.58,
    fog: '#f3c9d6', fogD: 0.0022, beamI: 0.80, beamC: '#ffcf9e',
    cloud: '#ffe0e6', cloudB: '#a97f9e', moon: '#fff0d8',
    star: 0.55, cloudAmt: 0.80, cloudSpd: 0.078, glow: 0.9, rim: 0.26,
    exposure: 0.74, lantern: 0.9, flowerE: 0.18, petal: '#ffd2de',
  },
  day: {
    skyTop: '#1f93e2', skyMid: '#6cc2f2', skyHor: '#ffcfe0',
    sun: '#fff8ec', sunI: 1.46, sunDir: [-0.60, 0.64, 0.48],
    hemiSky: '#e6d8ff', hemiGround: '#ffccda', hemiI: 0.62,
    fog: '#ffe8f0', fogD: 0.0016, beamI: 0.48, beamC: '#ffd9a8',
    cloud: '#e9e0f2', cloudB: '#b894ac', moon: '#e6ecff',
    star: 0.30, cloudAmt: 0.66, cloudSpd: 0.070, glow: 0.35, rim: 0.16,
    exposure: 0.74, lantern: 0.0, flowerE: 0.0, petal: '#ffc2d6',
  },
  dusk: {
    skyTop: '#4c3d80', skyMid: '#d9829a', skyHor: '#ffbe92',
    sun: '#ffb066', sunI: 1.28, sunDir: [-0.82, 0.25, 0.30],
    hemiSky: '#9a83c0', hemiGround: '#eaa99c', hemiI: 0.52,
    fog: '#e8ab9e', fogD: 0.0022, beamI: 0.95, beamC: '#ffbf84',
    cloud: '#ffcfb8', cloudB: '#7d5474', moon: '#ffe0b8',
    star: 0.55, cloudAmt: 0.95, cloudSpd: 0.105, glow: 1.0, rim: 0.30,
    exposure: 0.74, lantern: 1.6, flowerE: 0.4, petal: '#ffb4a2',
  },
  night: {
    skyTop: '#0b0a1e', skyMid: '#1d1a3e', skyHor: '#3a3160',
    sun: '#c6d8ff', sunI: 0.62, sunDir: [0.34, 0.60, 0.46],
    hemiSky: '#2b3270', hemiGround: '#4a2a4e', hemiI: 0.34,
    fog: '#221d44', fogD: 0.0034, beamI: 0.85, beamC: '#cfd8ff',
    cloud: '#8e8cc8', cloudB: '#241f42', moon: '#dbe6ff',
    star: 1.0, cloudAmt: 0.62, cloudSpd: 0.045, glow: 0.8, rim: 0.45,
    exposure: 0.80, lantern: 3.2, flowerE: 0.9, petal: '#dcc9ff',
  },
};

const LIVE = {
  skyTop: new T.Color(), skyMid: new T.Color(), skyHor: new T.Color(), sun: new T.Color(),
  hemiSky: new T.Color(), hemiGround: new T.Color(), fog: new T.Color(), beam: new T.Color(),
  cloud: new T.Color(), cloudB: new T.Color(), moon: new T.Color(), petal: new T.Color(),
  sunDir: new T.Vector3(-0.46, 0.74, -0.49),
  sunI: 1.5, hemiI: 0.46, fogD: 0.0016, beamI: 0.13, exposure: 0.74, rim: 0.16,
  star: 0.3, lantern: 0, flowerE: 0, glow: 0.35, cloudAmt: 0.56, cloudSpd: 0.062,
};
const TGT = {
  skyTop: new T.Color(), skyMid: new T.Color(), skyHor: new T.Color(), sun: new T.Color(),
  hemiSky: new T.Color(), hemiGround: new T.Color(), fog: new T.Color(), beam: new T.Color(),
  cloud: new T.Color(), cloudB: new T.Color(), moon: new T.Color(), petal: new T.Color(),
  sunDir: new T.Vector3(),
  sunI: 0, hemiI: 0, fogD: 0, beamI: 0, exposure: 1, rim: 0,
  star: 0, lantern: 0, flowerE: 0, glow: 0, cloudAmt: 0, cloudSpd: 0,
};
let curPreset = 'day';

function applyPreset(name, instant) {
  const p = PRESETS[name];
  curPreset = name;
  TGT.skyTop.set(p.skyTop); TGT.skyMid.set(p.skyMid); TGT.skyHor.set(p.skyHor);
  TGT.sun.set(p.sun); TGT.hemiSky.set(p.hemiSky); TGT.hemiGround.set(p.hemiGround);
  TGT.fog.set(p.fog); TGT.beam.set(p.beamC); TGT.cloud.set(p.cloud); TGT.cloudB.set(p.cloudB);
  TGT.moon.set(p.moon); TGT.petal.set(p.petal);
  TGT.sunDir.set(p.sunDir[0], p.sunDir[1], p.sunDir[2]).normalize();
  TGT.sunI = p.sunI; TGT.hemiI = p.hemiI; TGT.fogD = p.fogD; TGT.beamI = p.beamI;
  TGT.exposure = p.exposure; TGT.star = p.star; TGT.lantern = p.lantern; TGT.flowerE = p.flowerE;
  TGT.glow = p.glow; TGT.cloudAmt = p.cloudAmt; TGT.cloudSpd = p.cloudSpd; TGT.rim = p.rim;
  if (instant) {
    Object.keys(LIVE).forEach((k) => {
      if (LIVE[k] && LIVE[k].isColor) LIVE[k].copy(TGT[k]);
      else if (LIVE[k] && LIVE[k].isVector3) LIVE[k].copy(TGT[k]);
      else LIVE[k] = TGT[k];
    });
    pushEnvironment();
  }
}

function pushEnvironment() {
  skyUniforms.uTop.value.copy(LIVE.skyTop);
  skyUniforms.uMid.value.copy(LIVE.skyMid);
  skyUniforms.uHor.value.copy(LIVE.skyHor);
  skyUniforms.uMoon.value.copy(LIVE.moon);
  skyUniforms.uStar.value = LIVE.star;
  skyUniforms.uGlow.value = LIVE.glow;
  skyUniforms.uCloud.value = LIVE.cloudAmt;
  skyUniforms.uCloudSpeed.value = LIVE.cloudSpd;
  skyUniforms.uCloudA.value.copy(LIVE.cloud);
  skyUniforms.uCloudB.value.copy(LIVE.cloudB);

  moonUniforms.uColor.value.copy(LIVE.moon);
  moonHalo.material.color.copy(LIVE.moon);
  moonHalo.material.opacity = 0.22 + LIVE.glow * 0.30;

  sun.color.copy(LIVE.sun);
  sun.intensity = LIVE.sunI;
  sun.position.copy(LIVE.sunDir).multiplyScalar(72);
  sun.target.position.set(0, 0, 0);

  hemi.color.copy(LIVE.hemiSky);
  hemi.groundColor.copy(LIVE.hemiGround);
  hemi.intensity = LIVE.hemiI;

  scene.fog.color.copy(LIVE.fog);
  scene.fog.density = LIVE.fogD;

  beamUniforms.uColor.value.copy(LIVE.beam);
  beamUniforms.uInt.value = LIVE.beamI;
  beamPool.position.set(0, groundH(0, 0) + 0.08, 0);
  moonRim.intensity = LIVE.rim;
  beamPool.material.color.copy(LIVE.beam);
  beamPool.material.opacity = LIVE.beamI * 0.85;
  dust.material.color.copy(LIVE.beam);

  clouds.mats.forEach((m) => m.color.copy(LIVE.cloud));
  clouds.seaMat.color.copy(LIVE.cloud).lerp(LIVE.skyMid, 0.55);
  clouds.seaMat2.color.copy(LIVE.cloud).lerp(LIVE.skyMid, 0.65);

  petals.mat.color.copy(LIVE.petal);
  flowerBuild.mat.emissive.copy(LIVE.petal);
  flowerBuild.mat.emissiveIntensity = LIVE.flowerE * 0.5;

  M.lanternGlow.emissiveIntensity = LIVE.lantern * 0.9;
  lanternLights.forEach((l) => { l.intensity = LIVE.lantern * 1.6; });

  motes.material.opacity = clamp((LIVE.star - 0.3) * 1.5, 0, 0.85);
  motes.material.color.set(0xffe6a8);

  renderer.toneMappingExposure = LIVE.exposure;
}

function updateEnvironment(dt) {
  const k = 1 - Math.exp(-dt * 2.0);
  Object.keys(LIVE).forEach((key) => {
    const lv = LIVE[key];
    if (lv && lv.isColor) lv.lerp(TGT[key], k);
    else if (lv && lv.isVector3) lv.lerp(TGT[key], k);
    else LIVE[key] += (TGT[key] - LIVE[key]) * k;
  });
  LIVE.sunDir.normalize();
  pushEnvironment();
}

/* ---------------------------------------------------------------- *
 *  E4. 相机控制
 * ---------------------------------------------------------------- */
const ctrl = {
  theta: 0.94, phi: 1.45, radius: 43,
  tTheta: 0.94, tPhi: 1.45, tRadius: 43,
  target: new T.Vector3(0, 2.2, 0),
  auto: true, dragging: false, idle: 0,
};
const dom = renderer.domElement;
let lastX = 0, lastY = 0, pointers = new Map(), pinchDist = 0;

function onDown(e) {
  dom.setPointerCapture && dom.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  ctrl.dragging = true; ctrl.idle = 0;
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
}
function onMove(e) {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (pinchDist > 0) {
      ctrl.tRadius = clamp(ctrl.tRadius * (pinchDist / d), 17, 82);
    }
    pinchDist = d;
    return;
  }
  ctrl.tTheta -= dx * 0.0055;
  ctrl.tPhi = clamp(ctrl.tPhi - dy * 0.0042, 0.20, 1.62);
  ctrl.idle = 0;
}
function onUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) ctrl.dragging = false;
  pinchDist = 0;
}
dom.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
dom.addEventListener('wheel', (e) => {
  e.preventDefault();
  ctrl.tRadius = clamp(ctrl.tRadius * (1 + Math.sign(e.deltaY) * 0.09), 17, 82);
  ctrl.idle = 0;
}, { passive: false });
window.addEventListener('keydown', (e) => {
  const map = { 1: 'dawn', 2: 'day', 3: 'dusk', 4: 'night' };
  if (map[e.key]) { applyPreset(map[e.key]); setSegActive(map[e.key]); }
  if (e.key === ' ') { ctrl.auto = !ctrl.auto; document.getElementById('btnOrbit').classList.toggle('on', ctrl.auto); }
});

/* ---------------------------------------------------------------- *
 *  E5. UI
 * ---------------------------------------------------------------- */
const segBtns = [...document.querySelectorAll('#segTime button')];
function setSegActive(t) { segBtns.forEach((b) => b.classList.toggle('on', b.dataset.t === t)); }
segBtns.forEach((b) => b.addEventListener('click', () => {
  applyPreset(b.dataset.t);
  setSegActive(b.dataset.t);
}));

const windEl = document.getElementById('wind');
const windLab = document.getElementById('windVal');
function windLabel(v) {
  if (v <= 2) return '無風';
  if (v <= 22) return '微風';
  if (v <= 52) return '和風';
  if (v <= 78) return '疾風';
  return '狂風';
}
function updateWindUI() {
  const v = +windEl.value;
  windEl.style.setProperty('--p', v + '%');
  windLab.textContent = windLabel(v);
  windState.target = v / 100;
}
windEl.addEventListener('input', updateWindUI);
updateWindUI();

/* ---- 背景音乐（真实音频文件） ---- */
const musicBtn = document.getElementById('btnMusic');
const musicVol = document.getElementById('musicVol');
const musicPick = document.getElementById('btnPick');
const musicFile = document.getElementById('musicFile');

function updateMusicUI() {
  const on = BGM.playing;
  musicBtn.classList.toggle('on', on);
  musicBtn.textContent = on ? '音楽 ❚❚' : '音楽 ▶';
  musicBtn.title = BGM.loaded ? ('正在播放：' + BGM.name) : '把 bgm.mp3 放到本文件同目录，或点「選曲」载入';
  musicVol.style.setProperty('--p', musicVol.value + '%');
  BGM.setVolume(+musicVol.value / 100);
}
musicVol.addEventListener('input', updateMusicUI);
musicBtn.addEventListener('click', () => {
  if (!BGM.loaded) { musicFile.click(); return; }
  BGM.toggle().then(updateMusicUI);
});
musicPick.addEventListener('click', () => musicFile.click());
musicFile.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) { BGM.loadFile(f); setTimeout(updateMusicUI, 400); }
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && /^audio\//.test(f.type)) { BGM.loadFile(f); setTimeout(updateMusicUI, 400); }
});
updateMusicUI();
setInterval(updateMusicUI, 1000);
setTimeout(() => { if (!BGM.loaded) BGM.reprobe(); }, 1800);
setTimeout(updateMusicUI, 2600);

function kickMusic(e) {
  if (e.target && e.target.closest && e.target.closest('#hud')) return;
  window.removeEventListener('pointerdown', kickMusic);
  if (BGM.loaded && !BGM.playing) BGM.play().then(updateMusicUI);
}
window.addEventListener('pointerdown', kickMusic);

const btnOrbit = document.getElementById('btnOrbit');
btnOrbit.addEventListener('click', () => {
  ctrl.auto = !ctrl.auto;
  btnOrbit.classList.toggle('on', ctrl.auto);
});
petals.mesh.count = 420;
let petalBoost = false;
const btnPetal = document.getElementById('btnPetal');
btnPetal.addEventListener('click', () => {
  petalBoost = !petalBoost;
  btnPetal.classList.toggle('on', petalBoost);
  petals.mesh.count = petalBoost ? petals.items.length : 420;
});

/* ---------------------------------------------------------------- *
 *  E6. 自适应
 * ---------------------------------------------------------------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener('resize', resize);

/* ---------------------------------------------------------------- *
 *  E7. 主循环
 * ---------------------------------------------------------------- */
const clock = new T.Clock();
const tmpM = new T.Matrix4();
const tmpQ = new T.Quaternion();
const tmpE = new T.Euler();
const tmpV = new T.Vector3();
const tmpS = new T.Vector3();

function updatePetals(dt, t) {
  const list = petals.items;
  const wd = sharedUniforms.uWindDir.value;
  const wind = windState.cur;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const swirl = Math.sin(t * 1.9 + p.ph) * (0.45 + wind * 1.4);
    p.x += (p.vx + wd.x * (0.6 + wind * 2.6) + swirl * 0.5) * dt;
    p.z += (p.vz + wd.y * (0.6 + wind * 2.6) + Math.cos(t * 1.5 + p.ph) * 0.4) * dt;
    p.y -= p.vy * (0.55 + wind * 0.7) * dt;
    p.rx += p.sx * dt * (0.6 + wind);
    p.ry += p.sy * dt * (0.6 + wind);
    p.rz += p.sz * dt * (0.6 + wind);
    if (p.y < p.floor || (p.x * p.x + p.z * p.z) > 400) {
      spawnPetal(p, false);
    }
    tmpV.set(p.x, p.y, p.z);
    tmpE.set(p.rx, p.ry, p.rz, 'XYZ');
    tmpQ.setFromEuler(tmpE);
    tmpS.setScalar(p.sc);
    tmpM.compose(tmpV, tmpQ, tmpS);
    petals.mesh.setMatrixAt(i, tmpM);
  }
  petals.mesh.instanceMatrix.needsUpdate = true;
}

let started = false;
function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.048);
  const t = clock.elapsedTime;

  sharedUniforms.uTime.value = t;
  skyUniforms.uTime.value = t;
  skyUniforms.uSkyWind.value = 0.62 + Math.sin(t * 0.05) * 0.25;
  updateChainVFX(t, dt);
  SEALS.forEach((sl, i) => {
    sl.ring1.rotation.z = t * 0.35 + i;
    sl.ring2.rotation.z = -t * 0.55 + i * 2;
    sl.glow.material.opacity = 0.30 + 0.18 * Math.sin(t * 1.7 + i);
  });

  // 风
  windState.cur += (windState.target - windState.cur) * Math.min(1, dt * 2.2);
  sharedUniforms.uWind.value = windState.cur;
  const wa = 0.62 + Math.sin(t * 0.06) * 0.22;
  sharedUniforms.uWindDir.value.set(Math.cos(wa), Math.sin(wa));
  beamUniforms.uTime.value = t;
  updateBeamOrientation();

  updateEnvironment(Math.min(rawDt, 0.25));
  updatePetals(dt, t);

  // 碎石漂浮
  for (let i = 0; i < floaters.length; i++) {
    const f = floaters[i];
    f.m.position.y = f.y0 + Math.sin(t * f.sp + f.ph) * f.amp;
    f.m.rotation.y += f.rot * dt;
    f.m.rotation.x += f.rot * 0.6 * dt;
  }

  // 云漂移
  clouds.grp.rotation.y += dt * (0.010 + windState.cur * 0.075);
  for (let i = 0; i < clouds.items.length; i++) {
    const c = clouds.items[i];
    c.cl.position.y = c.y + Math.sin(t * 0.12 + c.ph) * c.amp;
  }
  dust.rotation.y += dt * 0.012;
  motes.rotation.y -= dt * 0.02;

  // 灯焰微跳
  const flick = 0.86 + Math.sin(t * 9.3) * 0.06 + Math.sin(t * 21.7) * 0.04;
  lanternLights.forEach((l) => { l.intensity = LIVE.lantern * 1.6 * flick; });
  M.lanternGlow.emissiveIntensity = LIVE.lantern * 0.9 * flick;

  // 相机
  if (ctrl.auto && !ctrl.dragging) {
    ctrl.idle += dt;
    if (ctrl.idle > 1.6) ctrl.tTheta += dt * 0.045;
  }
  ctrl.theta += (ctrl.tTheta - ctrl.theta) * Math.min(1, dt * 6.5);
  ctrl.phi += (ctrl.tPhi - ctrl.phi) * Math.min(1, dt * 6.5);
  ctrl.radius += (ctrl.tRadius - ctrl.radius) * Math.min(1, dt * 5.0);
  const sp = Math.sin(ctrl.phi), cp = Math.cos(ctrl.phi);
  camera.position.set(
    ctrl.target.x + ctrl.radius * sp * Math.sin(ctrl.theta),
    ctrl.target.y + ctrl.radius * cp,
    ctrl.target.z + ctrl.radius * sp * Math.cos(ctrl.theta)
  );
  camera.lookAt(ctrl.target);

  renderer.render(scene, camera);

  if (!started) {
    started = true;
    const boot = document.getElementById('boot');
    boot.classList.add('gone');
    setTimeout(() => { boot.style.display = 'none'; }, 1400);
  }
}

/* ---------------------------------------------------------------- *
 *  E8. 启动
 * ---------------------------------------------------------------- */
applyPreset('day', true);
resize();
window.__DBG = { renderer: renderer, scene: scene, camera: camera, ctrl: ctrl, LIVE: LIVE, T: T, applyPreset: applyPreset, BGM: BGM, buildMs: Math.round(performance.now()) };
window.BGM = BGM;
camera.position.set(24, 18, 22);
animate();

})();
