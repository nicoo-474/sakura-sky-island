/* =========================================================================
   B. 空岛本体
   ========================================================================= */

const R_MAX = 15.4;                    // 平均半径
const ISLAND_Y = 0;                    // 地面基准

function islandRadius(a) {
  return R_MAX * (1
    + 0.058 * Math.sin(a * 3 + 1.1)
    + 0.034 * Math.sin(a * 5 - 0.6)
    + 0.020 * Math.sin(a * 9 + 2.3)
    + 0.012 * Math.sin(a * 15 + 0.4));
}

/* 地表高度场：缓丘 + 起伏 + 边缘坠落 */
function groundH(x, z) {
  const r = Math.hypot(x, z);
  const R = islandRadius(Math.atan2(z, x));
  const rn = clamp(r / R, 0, 1.4);
  let h = 0;
  h += (fbm(x * 0.062 + 3.1, z * 0.062 - 1.7, 4, 11) - 0.5) * 1.25;
  h += (fbm(x * 0.24, z * 0.24, 3, 31) - 0.5) * 0.24;
  h += 0.46 * Math.exp(-(r * r) / 96);                 // 中央缓丘
  h -= 0.20 * smoothstep(0.0, 0.35, rn) * 0;           // 预留
  const e = smoothstep(0.70, 1.0, rn);
  h -= 1.55 * Math.pow(e, 1.55);                       // 边缘下坠
  return h;
}

/* 通用网格化曲面（行=环，列=角），返回索引顺序为外向法线 */
function gridMesh(rows, cols, fn) {
  const pos = [], uv = [], idx = [], col = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = fn(j, i);
      pos.push(d.p[0], d.p[1], d.p[2]);
      uv.push(d.uv[0], d.uv[1]);
      if (d.c) col.push(d.c[0], d.c[1], d.c[2]);
    }
  }
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i, b = j * cols + i + 1, c = (j + 1) * cols + i, d = (j + 1) * cols + i + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (col.length) g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------------------------------------------------------------- *
 *  B1. 地表
 * ---------------------------------------------------------------- */
const RINGS = 76, SEGS = 176;

function buildIslandTop() {
  const pos = [], uv = [], idx = [];
  // 中心点
  pos.push(0, groundH(0, 0), 0); uv.push(0.5, 0.5);
  const ringStart = 1;
  for (let j = 0; j < RINGS; j++) {
    const rt = Math.pow((j + 1) / RINGS, 0.92);
    for (let i = 0; i <= SEGS; i++) {
      const a = (i / SEGS) * TAU;
      const R = islandRadius(a);
      const r = rt * R;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const y = groundH(x, z);
      pos.push(x, y, z);
      uv.push(x / (2 * R_MAX) + 0.5, z / (2 * R_MAX) + 0.5);
    }
  }
  const cols = SEGS + 1;
  // 中心扇形
  for (let i = 0; i < SEGS; i++) {
    idx.push(0, ringStart + i + 1, ringStart + i);
  }
  // 环带
  for (let j = 0; j < RINGS - 1; j++) {
    for (let i = 0; i < SEGS; i++) {
      const a = ringStart + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();

  const m = new T.MeshStandardMaterial({
    map: TEX.ground,
    bumpMap: TEX.ground,
    bumpScale: 0.030,
    roughness: 0.95,
    metalness: 0.0,
    color: 0xffffff,
  });
  const mesh = new T.Mesh(g, m);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}
scene.add(buildIslandTop());

/* ---------------------------------------------------------------- *
 *  B2. 岩体（下部）
 * ---------------------------------------------------------------- */
const RIM = [];          // 边缘采样点，供草丛使用
const ROCK_POINTS = [];  // 岩体表面采样（供锁链贴合）
const ROCK_RINGS = 19, ROCK_SEGS = 44;

function buildIslandRock() {
  const rimA = [], rimR = [], rimY = [];
  for (let i = 0; i <= ROCK_SEGS; i++) {
    const a = (i / ROCK_SEGS) * TAU;
    const R = islandRadius(a);
    rimA.push(a); rimR.push(R); rimY.push(groundH(Math.cos(a) * R, Math.sin(a) * R));
  }
  for (let i = 0; i < ROCK_SEGS; i += 4) {
    RIM.push({ a: rimA[i], x: Math.cos(rimA[i]) * rimR[i], z: Math.sin(rimA[i]) * rimR[i], y: rimY[i], r: rimR[i] });
  }

  const cTop = new T.Color('#d3adbb'), cDeep = new T.Color('#8f6b7a'), cSoil = new T.Color('#bb8497');
  const totalDepth = 19.5;

  const g = gridMesh(ROCK_RINGS, ROCK_SEGS + 1, (j, i) => {
    const t = j / (ROCK_RINGS - 1);
    const a = rimA[i];
    // 纵向轮廓：先略微外凸，再收拢成尖
    let shrink = 1 - Math.pow(t, 0.62);
    shrink = Math.pow(clamp(shrink, 0, 1), 0.72);
    // 岩层与棱脊
    const strata = 1 + 0.055 * Math.sin(t * 9.5 + a * 2.2) + 0.035 * Math.sin(a * 7 + t * 3);
    const ridge = 1 + 0.30 * (fbm(a * 2.4 + 5.0, t * 3.2, 3, 71) - 0.5) * (0.35 + t);
    const chunk = 1 + 0.22 * (fbm(Math.cos(a) * 2 + 9, Math.sin(a) * 2 + t * 2.4, 3, 91) - 0.5);
    const r = rimR[i] * shrink * strata * ridge * chunk * (1 - 0.30 * Math.pow(t, 4));
    const y = rimY[i] - Math.pow(t, 0.92) * totalDepth - 0.1 * fbm(a * 3, t * 6, 2, 5)
      - 0.32 * (fbm(a * 5.5 + 2, t * 2.2, 2, 41) - 0.5) * (1 - t) * 3.0;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    // 颜色：表土 → 岩心
    const k = Math.pow(t, 0.55);
    const c = cSoil.clone().lerp(cDeep, smoothstep(0.0, 0.35, t));
    c.lerp(cTop, 0.35 * (1 - k));
    const v = 0.82 + 0.40 * fbm(a * 4, t * 7, 3, 17);
    c.multiplyScalar(v);
    ROCK_POINTS.push({ a: a, y: y, r: Math.hypot(x, z) });
    return { p: [x, y, z], uv: [i / ROCK_SEGS * 3, t], c: [c.r, c.g, c.b] };
  });

  const m = new T.MeshStandardMaterial({
    vertexColors: true, roughness: 0.97, metalness: 0.0, flatShading: true, side: T.DoubleSide,
  });
  const mesh = new T.Mesh(g, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
scene.add(buildIslandRock());

/* ---------------------------------------------------------------- *
 *  B3. 石体工具：带噪声的圆角石块
 * ---------------------------------------------------------------- */
function roundedBoxGeo(w, h, d, r, seg) {
  r = Math.min(r, Math.min(w, h, d) / 2 - 1e-4);
  seg = seg || 4;
  const g = new T.BoxGeometry(w, h, d, seg, seg, seg);
  const pos = g.attributes.position, nrm = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  const p = new T.Vector3(), q = new T.Vector3(), n = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    q.set(clamp(p.x, -hx, hx), clamp(p.y, -hy, hy), clamp(p.z, -hz, hz));
    n.copy(p).sub(q);
    const l = n.length();
    if (l > 1e-7) {
      n.divideScalar(l);
      p.copy(q).addScaledVector(n, r);
      pos.setXYZ(i, p.x, p.y, p.z);
      nrm.setXYZ(i, n.x, n.y, n.z);
    }
  }
  pos.needsUpdate = true; nrm.needsUpdate = true;
  g.computeBoundingSphere();
  return g;
}

function displaceGeo(g, amp, freq, seed) {
  const pos = g.attributes.position;
  const v = new T.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = fbm(v.x * freq + seed, v.z * freq + v.y * freq * 0.7, 3, seed) - 0.5;
    const n2 = fbm(v.y * freq * 1.7 + seed * 2, v.x * freq - seed, 2, seed + 5) - 0.5;
    const k = 1 + (n + n2 * 0.6) * amp * 2;
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

const rockMat = new T.MeshStandardMaterial({
  color: new T.Color('#cfa8b6'), roughness: 0.96, metalness: 0, flatShading: true,
});
const rockMatDark = new T.MeshStandardMaterial({
  color: new T.Color('#a67e8e'), roughness: 0.96, metalness: 0, flatShading: true,
});

function stoneChunk(w, h, d, jit, seed) {
  const g = roundedBoxGeo(w, h, d, Math.min(w, h, d) * 0.34, 4);
  displaceGeo(g, jit * 2.1, 2.6, seed || 3);
  return g;
}

/* ---------------------------------------------------------------- *
 *  B4. 岛下悬石 / 环绕碎岩 / 垂根
 * ---------------------------------------------------------------- */
const floaters = [];

function buildHangingRocks() {
  const grp = new T.Group();
  const r = mulberry32(7788);
  for (let i = 0; i < 5; i++) {
    const a = r() * TAU;
    const rr = R_MAX * (0.14 + r() * 0.34);
    const y = -3 - r() * 11;
    const s = 1.0 + r() * 2.2;
    const g = stoneChunk(s * (0.7 + r() * 0.5), s * (1.1 + r() * 0.9), s * (0.7 + r() * 0.5), 0.16, 20 + i);
    const m = new T.Mesh(g, i % 3 === 0 ? rockMatDark : rockMat);
    m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    m.rotation.set(r() * 0.5, r() * TAU, r() * 0.4);
    m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
  }
  // 悬浮碎石
  for (let i = 0; i < 11; i++) {
    const a = r() * TAU;
    const rr = R_MAX * (1.05 + r() * 0.85);
    const y = -9 + r() * 18;
    const s = 0.22 + r() * 0.62;
    const g = stoneChunk(s * 1.4, s * 0.9, s * 1.1, 0.24, 40 + i);
    const m = new T.Mesh(g, rockMat);
    m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
    m.rotation.set(r() * TAU, r() * TAU, r() * TAU);
    m.castShadow = false; m.receiveShadow = true;
    grp.add(m);
    floaters.push({ m, y0: y, ph: r() * TAU, sp: 0.10 + r() * 0.18, rot: (r() - 0.5) * 0.1, amp: 0.25 + r() * 0.45 });
  }
  return grp;
}
scene.add(buildHangingRocks());

/* 垂根：从边缘垂下的细根 */
function buildRoots() {
  const grp = new T.Group();
  const r = mulberry32(3399);
  const m = new T.MeshStandardMaterial({ color: new T.Color('#6b4550'), roughness: 0.95, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const a = r() * TAU;
    const R = islandRadius(a) * (0.93 + r() * 0.08);
    const x0 = Math.cos(a) * R, z0 = Math.sin(a) * R, y0 = groundH(x0, z0) - 0.3;
    const len = 1.4 + r() * 3.4;
    const pts = [];
    const out = 0.35 + r() * 0.5;
    for (let k = 0; k <= 5; k++) {
      const t = k / 5;
      pts.push(new T.Vector3(
        x0 + Math.cos(a) * out * t * (1 - t * 0.3) + (r() - 0.5) * 0.06,
        y0 - len * Math.pow(t, 0.85),
        z0 + Math.sin(a) * out * t * (1 - t * 0.3) + (r() - 0.5) * 0.06
      ));
    }
    const g = loftTube(pts, 0.045 + r() * 0.03, 0.006, 5, null);
    const mesh = new T.Mesh(g, m);
    mesh.castShadow = false;
    grp.add(mesh);
  }
  return grp;
}
scene.add(buildRoots());

/* 地表零星岩块（露头） */
function buildOutcrops() {
  const grp = new T.Group();
  const spots = [
    [7.2, -2.4, 1.5], [9.6, 2.2, 1.0], [-3.2, 9.4, 1.2], [-10.4, -1.0, 1.7],
    [2.0, -11.0, 1.1], [-6.8, -8.6, 0.9], [11.2, -5.4, 0.85], [5.4, 10.6, 0.7],
  ];
  const r = mulberry32(515);
  spots.forEach((s, i) => {
    const [x, z, sc] = s;
    const g = stoneChunk(sc * 1.6, sc * 0.85, sc * 1.25, 0.12, 300 + i);
    const m = new T.Mesh(g, i % 2 ? rockMat : rockMatDark);
    const y = groundH(x, z);
    m.position.set(x, y + sc * 0.18, z);
    m.rotation.y = r() * TAU;
    m.rotation.z = (r() - 0.5) * 0.2;
    m.castShadow = true; m.receiveShadow = true;
    grp.add(m);
  });
  return grp;
}
