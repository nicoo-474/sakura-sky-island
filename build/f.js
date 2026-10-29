/* =========================================================================
   F. 副岛 · 魔法锁链
   ========================================================================= */

/* ---------------------------------------------------------------- *
 *  F1. 小岛
 * ---------------------------------------------------------------- */
function buildMiniIsland(cx, cy, cz, R, seed, opts) {
  opts = opts || {};
  const r = mulberry32(seed);
  const grp = new T.Group();
  grp.position.set(cx, cy, cz);

  const near = (x, z) => {
    const a = Math.atan2(z, x);
    return R * (1 + 0.10 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 5.5 - seed * 2));
  };
  const hgt = (x, z) => {
    const d = Math.hypot(x, z) / near(x, z);
    let h = (fbm(x * 0.28 + seed, z * 0.28 - seed, 3, 7) - 0.5) * 0.55 * R;
    h += 0.16 * R * Math.exp(-(x * x + z * z) / (R * R * 0.6));
    h -= Math.pow(smoothstep(0.42, 1.0, d), 1.7) * 1.05 * R;
    return h;
  };

  /* 顶面 */
  const rows = 13, cols = 40;
  const pos = [], uv = [], idx = [];
  pos.push(0, hgt(0, 0), 0); uv.push(0.5, 0.5);
  for (let j = 0; j < rows; j++) {
    const rt = Math.pow((j + 1) / rows, 0.9);
    for (let i = 0; i <= cols; i++) {
      const a = (i / cols) * TAU;
      const R2 = near(Math.cos(a), Math.sin(a));
      const rad = rt * R2;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      pos.push(x, hgt(x, z), z);
      uv.push(x / (2 * R) + 0.5, z / (2 * R) + 0.5);
    }
  }
  const c = cols + 1;
  for (let i = 0; i < cols; i++) idx.push(0, 1 + i + 1, 1 + i);
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols; i++) {
      const a = 1 + j * c + i, b = a + 1, d = a + c, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const tg = new T.BufferGeometry();
  tg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  tg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  tg.setIndex(idx);
  tg.computeVertexNormals();

  const gt = TEX.ground.clone();
  gt.needsUpdate = true;
  gt.offset.set(r(), r());
  gt.repeat.set(0.42, 0.42);
  const groundMat = new T.MeshStandardMaterial({
    map: gt, bumpMap: gt, bumpScale: 0.02, roughness: 0.95, metalness: 0,
    color: new T.Color('#ffe9f1'),
  });
  const top = new T.Mesh(tg, groundMat);
  top.receiveShadow = true;
  grp.add(top);

  /* 岩体 */
  const rrows = 9, rcols = 34;
  const rp = [], ri = [], rc = [];
  const cTop = new T.Color('#d6b0be'), cDeep = new T.Color('#8d6675');
  for (let j = 0; j < rrows; j++) {
    const t = j / (rrows - 1);
    for (let i = 0; i <= rcols; i++) {
      const a = (i / rcols) * TAU;
      const R2 = near(Math.cos(a), Math.sin(a));
      const shrink = Math.pow(clamp(1 - Math.pow(t, 0.48), 0, 1), 0.62) * (1 + 0.16 * Math.sin(t * 6.0 + seed));
      const bump = 1 + 0.34 * (fbm(Math.cos(a) * 2.2 + seed, t * 3.1, 3, 91) - 0.5);
      const rad = R2 * shrink * bump;
      const y = -Math.pow(t, 0.85) * R * (1.45 + 0.35 * Math.sin(seed)) - 0.05 * R;
      rp.push(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const col = cTop.clone().lerp(cDeep, Math.pow(t, 0.6));
      rc.push(col.r, col.g, col.b);
    }
  }
  // 索引（rcols+1 列）
  const rc2 = rcols + 1;
  for (let j = 0; j < rrows - 1; j++) {
    for (let i = 0; i < rcols; i++) {
      const a = j * rc2 + i, b = a + 1, d = a + rc2, e = d + 1;
      ri.push(a, b, d, b, e, d);
    }
  }
  const rg = new T.BufferGeometry();
  rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3));
  rg.setAttribute('color', new T.Float32BufferAttribute(rc, 3));
  rg.setIndex(ri);
  rg.computeVertexNormals();
  const rock = new T.Mesh(rg, new T.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, flatShading: true, side: T.DoubleSide,
  }));
  rock.castShadow = true; rock.receiveShadow = true;
  grp.add(rock);

  scene.add(grp);

  /* 草 */
  if (opts.grass !== false) {
    const tufts = [];
    for (let i = 0; i < 250; i++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * R * 0.86;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      tufts.push({ x, z, h: 0.08 + Math.pow(r(), 1.5) * 0.22, yaw: r() * TAU, ph: r() * TAU });
    }
    const geo = makeTuftGeo(6, 4, 3131);
    const mesh = new T.InstancedMesh(geo, grassMat, tufts.length);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pv = new T.Vector3();
    const rotArr = new Float32Array(tufts.length), phArr = new Float32Array(tufts.length);
    const col = new T.Color();
    tufts.forEach((tt, i) => {
      pv.set(tt.x, hgt(tt.x, tt.z) - 0.02, tt.z);
      e.set(0, tt.yaw, 0, 'YXZ');
      q.setFromEuler(e);
      const w = 0.6 + tt.h * 0.55;
      sc.set(w, tt.h, w);
      m4.compose(pv, q, sc);
      mesh.setMatrixAt(i, m4);
      rotArr[i] = tt.yaw; phArr[i] = tt.ph;
      const tone = 0.8 + r() * 0.35;
      col.setRGB(tone, tone, tone);
      mesh.setColorAt(i, col);
    });
    geo.setAttribute('aRot', new T.InstancedBufferAttribute(rotArr, 1));
    geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phArr, 1));
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = false;
    grp.add(mesh);
  }

  /* 小樱树 */
  if (opts.tree) {
    buildSakura({
      x: cx + rnd(-0.3, 0.3) * R, z: cz + rnd(-0.3, 0.3) * R, baseY: cy + hgt(0, 0) - 0.05,
      scale: opts.tree, seed: seed + 77, depth: 4, leafR: 1.35,
      leanX: rnd(-0.15, 0.15), leanZ: rnd(-0.15, 0.15), upBias: 0.2,
    });
  }
  /* 小石灯笼 */
  if (opts.lantern) {
    const L = buildLantern(cx + R * 0.35, cz - R * 0.2, 0.55, r() * TAU);
    L.group.position.set(cx + R * 0.35, cy + hgt(R * 0.35, -R * 0.2) - 0.02, cz - R * 0.2);
  }

  return { grp, R, cx, cy, cz, hgt };
}

/* ---------------------------------------------------------------- *
 *  F2. 锁链工具
 * ---------------------------------------------------------------- */
function chainMatrices(curve, spacing, scl) {
  const len = curve.getLength();
  const n = Math.max(3, Math.round(len / spacing));
  const out = [];
  const up = new T.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    let side = new T.Vector3().crossVectors(tan, up);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    const nrm = new T.Vector3().crossVectors(side, tan).normalize();
    const flip = i % 2 ? 1 : -1;
    const yAx = (flip > 0 ? nrm : side).clone().multiplyScalar(scl);
    const zAx = (flip > 0 ? side : nrm).clone().multiplyScalar(scl);
    const m = new T.Matrix4();
    m.makeBasis(tan.clone().multiplyScalar(scl), yAx, zAx);
    m.setPosition(p);
    out.push(m);
  }
  return out;
}

/* 岩体在给定高度 / 方位上的真实半径：查 b.js 生成的表面采样 */
function rockRadiusAt(a, y) {
  let best = 0;
  for (let i = 0; i < ROCK_POINTS.length; i++) {
    const p = ROCK_POINTS[i];
    if (p.r <= best) continue;
    let da = Math.abs(p.a - a);
    if (da > Math.PI) da = TAU - da;
    if (da > 0.14) continue;
    if (Math.abs(p.y - y) > 0.85) continue;
    best = p.r;
  }
  if (best > 0) return best;
  // 兜底估算
  const t = Math.pow(Math.max(0, (0.8 - y)) / 19.5, 1 / 0.92);
  const shrink = Math.pow(clamp(1 - Math.pow(clamp(t, 0, 1), 0.62), 0, 1), 0.72);
  return islandRadius(a) * shrink;
}

/* 螺旋束链：绕岩体多圈 */
function helixCoil(y0, y1, turns, phase, extraR) {
  const N = 190;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const ang = phase + s * turns * TAU;
    const y = y0 + (y1 - y0) * s + Math.sin(s * 5.0 + phase * 2) * 0.10;
    const r = rockRadiusAt(ang, y) + (extraR || 0.22);
    pts.push(new T.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
  }
  return new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/* ------------- 魔法能量材质 ------------- */
const CHAIN_MATS = {
  uTime: { value: 0 },
  uPow: { value: 1.0 },
  uColA: { value: new T.Color('#ff8fd0') },
  uColB: { value: new T.Color('#b98cff') },
  uColC: { value: new T.Color('#ffffff') },
};

const chainCoreMat = new T.ShaderMaterial({
  uniforms: CHAIN_MATS,
  transparent: true,
  blending: T.AdditiveBlending,
  depthWrite: false,
  side: T.DoubleSide,
  vertexShader: `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position,1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float uTime,uPow; uniform vec3 uColA,uColB,uColC;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      float t = vUv.y;
      // 三个不同速度的流动脉冲
      float p1 = pow(fract(t * 2.2 - uTime * 0.22), 7.0);
      float p2 = pow(fract(t * 1.1 - uTime * 0.12 + 0.37), 9.0);
      float p3 = pow(fract(t * 5.0 - uTime * 0.38 + 0.71), 12.0);
      float ripple = 0.5 + 0.5 * sin(t * 210.0 - uTime * 7.0);
      // 符文带
      float rune = smoothstep(0.55, 0.95, fract(t * 52.0 - uTime * 0.5));
      float fres = pow(abs(dot(normalize(vN), normalize(vV))), 0.6);
      float a = (0.14 + p1 * 1.5 + p2 * 1.2 + p3 * 1.6 + ripple * 0.14 + rune * 0.55) * uPow * (0.55 + 0.65 * fres);
      vec3 c = mix(uColA, uColB, clamp(p1 + p2, 0.0, 1.0));
      c = mix(c, uColC, clamp(p3 + rune * 0.7, 0.0, 1.0));
      gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
    }`,
});

const chainGlowMat = new T.ShaderMaterial({
  uniforms: CHAIN_MATS,
  transparent: true,
  blending: T.AdditiveBlending,
  depthWrite: false,
  side: T.DoubleSide,
  vertexShader: `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position,1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: `
    uniform float uTime,uPow; uniform vec3 uColA,uColB,uColC;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      float t = vUv.y;
      float p1 = pow(fract(t * 2.2 - uTime * 0.22), 3.0);
      float pulse = 0.22 + p1 * 0.9;
      float fres = 1.0 - abs(dot(normalize(vN), normalize(vV)));
      float a = pulse * (0.30 + fres * 0.85) * uPow;
      vec3 c = mix(uColA, uColB, p1 * 0.7);
      gl_FragColor = vec4(c, clamp(a, 0.0, 1.0));
    }`,
});

const chainLinkGeo = (() => {
  const g = new T.TorusGeometry(0.21, 0.078, 6, 12);
  g.scale(1.0, 1.55, 1.0);
  return g;
})();
const chainMat = new T.MeshStandardMaterial({
  color: new T.Color('#5d4854'), roughness: 0.32, metalness: 0.78,
  emissive: new T.Color('#ff5fae'), emissiveIntensity: 0.26,
});

/* ---------------------------------------------------------------- *
 *  F3. 副岛（270° 均匀分布，每座都有樱树）
 * ---------------------------------------------------------------- */
const D2R = Math.PI / 180;
const SUB_DEFS = [
  { a: 171 * D2R, dist: 46.0, y: 7.5, R: 3.2, seed: 11, tree: 0.62, lantern: true },
  { a: 261 * D2R, dist: 44.0, y: -2.0, R: 2.9, seed: 23, tree: 0.58, lantern: false },
  { a: 81 * D2R, dist: 40.0, y: 4.0, R: 2.8, seed: 37, tree: 0.56, lantern: false },
  { a: 351 * D2R, dist: 48.0, y: -6.0, R: 2.6, seed: 51, tree: 0.54, lantern: false },
];

const _leafBase = leafVerts.pos.length / 3;
const subIslands = [];
SUB_DEFS.forEach((d) => {
  const cx = Math.cos(d.a) * d.dist;
  const cz = Math.sin(d.a) * d.dist;
  const si = buildMiniIsland(cx, d.y, cz, d.R, d.seed, { tree: d.tree, lantern: d.lantern });
  si.def = d;
  subIslands.push(si);
});

/* 主叶冠网格已在 C 段生成，副岛树的叶片需要单独建一份 */
(function buildSubFoliage(vStart) {
  if (leafVerts.pos.length <= vStart * 3) return;
  const pos = leafVerts.pos.slice(vStart * 3);
  const nrm = leafVerts.nrm.slice(vStart * 3);
  const uv = leafVerts.uv.slice(vStart * 2);
  const sw = leafVerts.sway.slice(vStart);
  const ph = leafVerts.phase.slice(vStart);
  const col = leafVerts.col.slice(vStart * 3);
  const idx = [];
  for (let i = 0; i < leafVerts.idx.length; i++) {
    const v = leafVerts.idx[i];
    if (v >= vStart) idx.push(v - vStart);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('aSway', new T.Float32BufferAttribute(sw, 1));
  g.setAttribute('aPhase', new T.Float32BufferAttribute(ph, 1));
  g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const norm = g.attributes.normal;
  for (let i = 0; i < norm.count; i++) {
    const v = new T.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).normalize();
    norm.setXYZ(i, v.x, v.y, v.z);
  }
  const mesh = new T.Mesh(g, foliage.mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  scene.add(mesh);
})(_leafBase);

/* ---------------------------------------------------------------- *
 *  F4. 束链：岩体螺旋缠绕 + 副岛悬链
 * ---------------------------------------------------------------- */
const CHAIN_GROUP = new T.Group();
scene.add(CHAIN_GROUP);

const chainCurves = [];
function addChain(curve, spacing, scl, tubeR, glowR) {
  chainCurves.push({ curve, tubeR: tubeR === undefined ? 0.06 : tubeR, glowR: glowR === undefined ? 0.22 : glowR });
  return chainMatrices(curve, spacing, scl);
}

let allMatrices = [];

/* 两道螺旋，把岛体下部缠满 */
const coilA = helixCoil(-1.5, -8.6, 2.8, 0.4, 0.24);
const coilB = helixCoil(-6.6, -13.4, 1.8, 2.1, 0.20);
allMatrices = allMatrices.concat(addChain(coilA, 0.50, 1.42, 0.055, 0.16));
allMatrices = allMatrices.concat(addChain(coilB, 0.56, 1.34, 0.050, 0.14));

/* 副岛悬链 + 封印 */
const SEALS = [];
subIslands.forEach((si) => {
  const d = si.def;
  const a = d.a;
  const rimR = islandRadius(a) * 0.965;
  const ay = groundH(Math.cos(a) * rimR, Math.sin(a) * rimR) - 0.12;
  const anchor = new T.Vector3(Math.cos(a) * rimR, ay, Math.sin(a) * rimR);
  const subAnchor = new T.Vector3(
    si.cx - Math.cos(a) * si.R * 0.78,
    si.cy - 0.25,
    si.cz - Math.sin(a) * si.R * 0.78
  );
  const dir = subAnchor.clone().sub(anchor);
  const dLen = dir.length();
  const pts = [anchor.clone()];
  const segs = 4;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const p = anchor.clone().lerp(subAnchor, t);
    p.y -= Math.sin(t * Math.PI) * Math.min(3.2, dLen * 0.10);
    pts.push(p);
  }
  pts.push(subAnchor);
  const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  allMatrices = allMatrices.concat(addChain(curve, Math.max(0.42, curve.getLength() / 150), 1.46, 0.056, 0.16));

  // 草地上的封印法阵
  const sealGrp = new T.Group();
  sealGrp.position.copy(anchor).add(new T.Vector3(0, 0.06, 0));
  sealGrp.rotation.set(-Math.PI / 2, 0, rnd(0, TAU));
  const ringMat = new T.MeshBasicMaterial({
    color: 0xff9ed6, transparent: true, opacity: 0.8,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide,
  });
  const ring1 = new T.Mesh(new T.TorusGeometry(0.72, 0.032, 6, 44), ringMat);
  sealGrp.add(ring1);
  const ring2 = new T.Mesh(new T.TorusGeometry(0.44, 0.020, 6, 30), ringMat.clone());
  ring2.material.opacity = 0.55;
  sealGrp.add(ring2);
  for (let i = 0; i < 8; i++) {
    const a2 = (i / 8) * TAU;
    const tick = new T.Mesh(new T.PlaneGeometry(0.12, 0.30), ringMat.clone());
    tick.material.opacity = 0.9;
    tick.position.set(Math.cos(a2) * 0.72, Math.sin(a2) * 0.72, 0);
    tick.rotation.z = a2 + Math.PI / 2;
    sealGrp.add(tick);
  }
  const glow = new T.Sprite(new T.SpriteMaterial({
    map: TEX.glow, color: 0xffb6e0, transparent: true, opacity: 0.55,
    blending: T.AdditiveBlending, depthWrite: false,
  }));
  glow.scale.set(5.0, 5.0, 1);
  sealGrp.add(glow);
  CHAIN_GROUP.add(sealGrp);
  SEALS.push({ grp: sealGrp, ring1, ring2, glow });
});

/* 实例化链节 */
const chainMesh = new T.InstancedMesh(chainLinkGeo, chainMat, allMatrices.length);
chainMesh.instanceMatrix.setUsage(T.StaticDrawUsage);
allMatrices.forEach((m, i) => chainMesh.setMatrixAt(i, m));
chainMesh.instanceMatrix.needsUpdate = true;
chainMesh.castShadow = true;
chainMesh.receiveShadow = true;
chainMesh.frustumCulled = false;
CHAIN_GROUP.add(chainMesh);

/* 能量芯 + 外发光套 */
chainCurves.forEach((ccf) => {
  const pts = [];
  const N = 60;
  for (let i = 0; i <= N; i++) pts.push(ccf.curve.getPointAt(i / N));
  const core = new T.Mesh(loftTube(pts, ccf.tubeR, ccf.tubeR, 6), chainCoreMat);
  core.frustumCulled = false;
  CHAIN_GROUP.add(core);
  const glow = new T.Mesh(loftTube(pts, ccf.glowR, ccf.glowR, 6), chainGlowMat);
  glow.frustumCulled = false;
  CHAIN_GROUP.add(glow);
});

/* ---------------------------------------------------------------- *
 *  F5. 沿链流动的火花
 * ---------------------------------------------------------------- */
const SPARK_LUT = [];
chainCurves.forEach((ccf) => {
  const N = 200;
  const pts = [];
  for (let i = 0; i <= N; i++) pts.push(ccf.curve.getPointAt(i / N));
  SPARK_LUT.push(pts);
});

const SPARK_N = 460;
const sparkPos = new Float32Array(SPARK_N * 3);
const sparkCol = new Float32Array(SPARK_N * 3);
const sparkState = [];
for (let i = 0; i < SPARK_N; i++) {
  sparkState.push({
    c: Math.floor(RNG() * SPARK_LUT.length),
    u: RNG(),
    sp: 0.045 + RNG() * 0.16,
    off: new T.Vector3((RNG() - 0.5) * 0.18, (RNG() - 0.5) * 0.18, (RNG() - 0.5) * 0.18),
    ph: RNG() * TAU,
  });
}
const sparkGeo = new T.BufferGeometry();
sparkGeo.setAttribute('position', new T.BufferAttribute(sparkPos, 3));
sparkGeo.setAttribute('color', new T.BufferAttribute(sparkCol, 3));
const sparkMat = new T.PointsMaterial({
  size: 0.42, map: TEX.glow, vertexColors: true, transparent: true, opacity: 0.95,
  blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
});
const sparkPoints = new T.Points(sparkGeo, sparkMat);
sparkPoints.frustumCulled = false;
CHAIN_GROUP.add(sparkPoints);

const _sv = new T.Vector3();
function updateChainVFX(t, dt) {
  CHAIN_MATS.uTime.value = t;
  CHAIN_MATS.uPow.value = 1.05 + Math.sin(t * 1.6) * 0.18;
  chainMat.emissiveIntensity = 0.22 + Math.abs(Math.sin(t * 1.3)) * 0.24;
  for (let i = 0; i < SPARK_N; i++) {
    const s = sparkState[i];
    s.u += s.sp * dt;
    if (s.u > 1) { s.u -= 1; s.c = Math.floor(Math.random() * SPARK_LUT.length); }
    const lut = SPARK_LUT[s.c];
    const f = s.u * (lut.length - 1);
    const i0 = Math.floor(f), i1 = Math.min(lut.length - 1, i0 + 1);
    const k = f - i0;
    _sv.copy(lut[i0]).lerp(lut[i1], k);
    sparkPos[i * 3] = _sv.x + s.off.x + Math.sin(t * 3 + s.ph) * 0.05;
    sparkPos[i * 3 + 1] = _sv.y + s.off.y + Math.cos(t * 2.4 + s.ph) * 0.05;
    sparkPos[i * 3 + 2] = _sv.z + s.off.z + Math.sin(t * 2.8 + s.ph * 1.7) * 0.05;
    const b = 0.55 + 0.45 * Math.sin(t * 6 + s.ph * 3);
    sparkCol[i * 3] = 1.0 * b;
    sparkCol[i * 3 + 1] = 0.68 * b;
    sparkCol[i * 3 + 2] = 0.92 * b;
  }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkGeo.attributes.color.needsUpdate = true;
}
