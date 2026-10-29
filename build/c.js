/* =========================================================================
   C. 植被：草 / 花 / 樱树 / 落花
   ========================================================================= */

/* ---------- 是否避让 ---------- */
function excluded(x, z, pad) {
  pad = pad || 0;
  for (let i = 0; i < EXCLUDE.length; i++) {
    const e = EXCLUDE[i];
    const dx = x - e.x, dz = z - e.z;
    if (dx * dx + dz * dz < (e.r + pad) * (e.r + pad)) return true;
  }
  return false;
}
function nearPath(x, z, pad) {
  let best = 1e9;
  for (let i = 0; i < PATH_SAMPLES.length; i++) {
    const p = PATH_SAMPLES[i];
    const dx = x - p.x, dz = z - p.z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return best < pad * pad;
}

/* ========================================================================
   C1. 草：一簇多叶的草丛（实例化 + 顶点风场）
   ======================================================================== */
function makeTuftGeo(nb, segs, seed) {
  const pos = [], idx = [], cols = [];
  const r = mulberry32(seed || 7);
  const W0 = 0.030;
  for (let b = 0; b < nb; b++) {
    const oa = r() * TAU, orr = Math.pow(r(), 0.6) * 0.085;
    const ox = Math.cos(oa) * orr, oz = Math.sin(oa) * orr;
    const yaw = r() * TAU;
    const lean = 0.12 + r() * 0.45;
    const hh = 0.72 + r() * 0.55;
    const dx = Math.cos(yaw), dz = Math.sin(yaw);
    const px = -dz, pz = dx;
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const w = W0 * Math.pow(1 - t, 0.45) + 0.0026;
      const bend = Math.pow(t, 1.9) * 0.34 * lean;
      const cx = ox + dx * bend, cz = oz + dz * bend, cy = t * hh;
      pos.push(cx - px * w, cy, cz - pz * w, cx + px * w, cy, cz + pz * w);
      const c = 0.60 + 0.52 * Math.pow(t, 0.5);
      cols.push(c, c, c, c, c, c);
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2, bq = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, bq, c2, bq, d, c2);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.attributes.normal;
  const v = new T.Vector3();
  for (let i = 0; i < nrm.count; i++) {
    v.set(nrm.getX(i) * 0.42, 1.0, nrm.getZ(i) * 0.42).normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

const grassMat = new T.MeshStandardMaterial({
  color: new T.Color(PAL.grass), vertexColors: true, side: T.DoubleSide,
  roughness: 0.88, metalness: 0.0,
});
windifyGrass(grassMat);

const GRASS = [];
function addTuft(x, z, h, yaw, tilt) {
  if (GRASS.length > 15000) return;
  GRASS.push({ x, z, h, yaw: yaw === undefined ? rnd(0, TAU) : yaw, phase: rnd(0, TAU), tilt: tilt || 0 });
}

function buildGrass() {
  RNG = mulberry32(90901);

  /* 1) 边缘草丛带：茂密、朝外披挂 */
  for (let i = 0; i < 7200; i++) {
    const a = rnd(0, TAU);
    const R = islandRadius(a);
    const rn = 0.902 + Math.pow(rnd(0, 1), 0.5) * 0.108;
    const r = rn * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (excluded(x, z, 0.1)) continue;
    const h = (0.54 + Math.pow(rnd(0, 1), 1.2) * 0.70);
    const out = smoothstep(0.93, 1.0, rn);
    addTuft(x, z, h, a + Math.PI * 0.5 + rnd(-0.5, 0.5), out * rnd(0.6, 1.15));
  }

  /* 2) 岛内草坪：成组草簇，留出厚涂地面 */
  let tries = 0, groups = 0;
  while (groups < 620 && tries < 40000) {
    tries++;
    const a = rnd(0, TAU);
    const R = islandRadius(a) * 0.875;
    const r = Math.sqrt(rnd(0, 1)) * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const density = fbm(x * 0.20 + 11, z * 0.20 - 4, 3, 55);
    if (rnd(0, 1) > 0.30 + density * 0.95) continue;
    if (excluded(x, z, 0.12)) continue;
    if (nearPath(x, z, 0.85)) continue;
    groups++;
    const n = 2 + Math.floor(rnd(0, 0.99) * 4);
    const gs = 0.34 + rnd(0, 0.30);
    for (let k = 0; k < n; k++) {
      const aa = rnd(0, TAU), rr = Math.sqrt(rnd(0, 1)) * gs;
      const bx = x + Math.cos(aa) * rr, bz = z + Math.sin(aa) * rr;
      if (excluded(bx, bz, 0.06)) continue;
      addTuft(bx, bz, 0.26 + Math.pow(rnd(0, 1), 1.4) * 0.42);
    }
  }

  /* 3) 树根与石边丛草 */
  TREE_SPOTS.forEach((t) => {
    for (let i = 0; i < 260; i++) {
      const a = rnd(0, TAU), r = Math.sqrt(rnd(0, 1)) * 1.5 * t.s;
      const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r;
      if (excluded(x, z, 0.05)) continue;
      addTuft(x, z, 0.26 + rnd(0, 0.34));
    }
  });

  const geo = makeTuftGeo(6, 4, 3131);
  const rotArr = new Float32Array(GRASS.length);
  const phArr = new Float32Array(GRASS.length);
  const mesh = new T.InstancedMesh(geo, grassMat, GRASS.length);
  mesh.instanceMatrix.setUsage(T.StaticDrawUsage);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pv = new T.Vector3();
  const col = new T.Color();
  for (let i = 0; i < GRASS.length; i++) {
    const b = GRASS[i];
    const y = groundH(b.x, b.z) - 0.04 - b.tilt * 0.05;
    pv.set(b.x, y, b.z);
    e.set(-b.tilt * 0.55, b.yaw, 0, 'YXZ');
    q.setFromEuler(e);
    const w = 0.62 + b.h * 0.55;
    sc.set(w, b.h, w);
    m4.compose(pv, q, sc);
    mesh.setMatrixAt(i, m4);
    rotArr[i] = b.yaw;
    phArr[i] = b.phase;
    const tone = 0.72 + Math.pow(hash2(i * 7, i * 13, 3), 1.6) * 0.58;
    col.setRGB(tone, tone, tone);
    mesh.setColorAt(i, col);
  }
  geo.setAttribute('aRot', new T.InstancedBufferAttribute(rotArr, 1));
  geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phArr, 1));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/* ========================================================================
   C2. 小花（单色）
   ======================================================================== */
function makeFlowerGeo() {
  const pos = [], idx = [];
  const push = (v) => { pos.push(v[0], v[1], v[2]); return pos.length / 3 - 1; };
  // 茎
  const stemTop = 0.17;
  const b0 = push([-0.008, 0, 0]), b1 = push([0.008, 0, 0]), b2 = push([0.004, stemTop, 0]), b3 = push([-0.004, stemTop, 0]);
  idx.push(b0, b1, b2, b0, b2, b3);
  // 五瓣
  const headY = stemTop;
  const petalR = 0.046;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    const ca = Math.cos(a), sa = Math.sin(a);
    const na = a + Math.PI / 2;
    const w = 0.030;
    const c = push([0, headY, 0]);
    const p1 = push([ca * petalR + Math.cos(na) * w, headY + 0.030, sa * petalR + Math.sin(na) * w]);
    const p2 = push([ca * petalR * 1.12, headY + 0.014, sa * petalR * 1.12]);
    const p3 = push([ca * petalR - Math.cos(na) * w, headY + 0.030, sa * petalR - Math.sin(na) * w]);
    idx.push(c, p1, p2, c, p2, p3);
  }
  // 花心
  const cc = push([0, headY + 0.022, 0]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const b = (i + 1) / 5 * TAU;
    const q1 = push([Math.cos(a) * 0.022, headY + 0.026, Math.sin(a) * 0.022]);
    const q2 = push([Math.cos(b) * 0.022, headY + 0.026, Math.sin(b) * 0.022]);
    idx.push(cc, q1, q2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildFlowers() {
  RNG = mulberry32(4242);
  const pts = [];
  let tries = 0;
  while (pts.length < 1100 && tries < 40000) {
    tries++;
    const a = rnd(0, TAU);
    const R = islandRadius(a) * 0.86;
    const r = Math.sqrt(rnd(0, 1)) * R;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    // 成片分布
    const patch = fbm(x * 0.42 - 3, z * 0.42 + 8, 3, 77);
    if (rnd(0, 1) > Math.pow(patch, 2.2) * 2.1) continue;
    if (excluded(x, z, 0.15)) continue;
    if (nearPath(x, z, 1.25)) continue;
    pts.push({ x, z, s: 0.75 + rnd(0, 0.85) });
  }
  const geo = makeFlowerGeo();
  const mat = new T.MeshStandardMaterial({
    color: new T.Color('#ffe9f1'), roughness: 0.72, metalness: 0.0, side: T.DoubleSide,
    emissive: new T.Color('#ffdcea'), emissiveIntensity: 0.0,
  });
  windifyGrass(mat);
  const mesh = new T.InstancedMesh(geo, mat, pts.length);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3(), pv = new T.Vector3();
  const rotArr = new Float32Array(pts.length), phArr = new Float32Array(pts.length);
  pts.forEach((p, i) => {
    pv.set(p.x, groundH(p.x, p.z) - 0.01, p.z);
    const yaw = rnd(0, TAU);
    e.set(rnd(-0.09, 0.09), yaw, rnd(-0.09, 0.09), 'YXZ');
    q.setFromEuler(e);
    sc.setScalar(p.s);
    m4.compose(pv, q, sc);
    mesh.setMatrixAt(i, m4);
    rotArr[i] = yaw;
    phArr[i] = rnd(0, TAU);
  });
  geo.setAttribute('aRot', new T.InstancedBufferAttribute(rotArr, 1));
  geo.setAttribute('aPhase', new T.InstancedBufferAttribute(phArr, 1));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/* ========================================================================
   C3. 樱花树
   ======================================================================== */
const TREE_SPOTS = [];
const CANOPY_PTS = [];
const leafVerts = { pos: [], nrm: [], uv: [], idx: [], sway: [], phase: [], col: [] };

function addLeafCard(cx, cy, cz, nx, ny, nz, size, swayV, phase, tone) {
  tone = tone === undefined ? 1 : tone;
  const fwd = new T.Vector3(nx, ny, nz).normalize();
  const upHint = Math.abs(fwd.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
  const right = new T.Vector3().crossVectors(upHint, fwd).normalize();
  const up2 = new T.Vector3().crossVectors(fwd, right).normalize();
  const base = leafVerts.pos.length / 3;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (let k = 0; k < 4; k++) {
    const sx = corners[k][0] * size * 0.5, sy = corners[k][1] * size * 0.5;
    const px = cx + right.x * sx + up2.x * sy;
    const py = cy + right.y * sx + up2.y * sy;
    const pz = cz + right.z * sx + up2.z * sy;
    leafVerts.pos.push(px, py, pz);
    // 球形法线：从团簇中心向外
    const dx = px - cx, dy = py - cy, dz = pz - cz;
    const len = Math.hypot(dx, dy, dz) || 1;
    leafVerts.nrm.push(dx / len * 0.30 + fwd.x * 0.50, dy / len * 0.30 + fwd.y * 0.50 + 0.62, dz / len * 0.30 + fwd.z * 0.50);
    leafVerts.uv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1);
    leafVerts.sway.push(swayV);
    leafVerts.phase.push(phase);
    leafVerts.col.push(tone, tone * 0.94, tone * 0.97);
  }
  leafVerts.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

/* 叶团：带椭球分布 + 破轮廓的散叶 */
function addCluster(center, radius, dirBias, swayV, r) {
  const n = 13 + Math.floor(r() * 7);
  const cph = r() * TAU;
  const bias = dirBias.clone().normalize();
  for (let i = 0; i < n; i++) {
    // 椭球：沿枝方向压扁
    const th = r() * TAU, ph = Math.acos(2 * r() - 1);
    let vx = Math.sin(ph) * Math.cos(th), vy = Math.cos(ph), vz = Math.sin(ph) * Math.sin(th);
    const along = vx * bias.x + vy * bias.y + vz * bias.z;
    vx -= bias.x * along * 0.45; vy -= bias.y * along * 0.45; vz -= bias.z * along * 0.45;
    const rr = radius * (0.35 + 0.65 * Math.cbrt(r()));
    const px = center.x + vx * rr * 1.12;
    const py = center.y + vy * rr * 0.82;
    const pz = center.z + vz * rr * 1.12;
    let nx = vx + (r() - 0.5) * 0.7, ny = vy + (r() - 0.5) * 0.7 + 0.15, nz = vz + (r() - 0.5) * 0.7;
    const size = radius * (0.72 + r() * 0.55);
    const tone = 0.72 + Math.pow(r(), 0.8) * 0.55;
    addLeafCard(px, py, pz, nx, ny, nz, size, swayV, cph + r() * 0.25, tone);
  }
  // 破形：1~2 片偏大的散叶伸出去
  for (let i = 0; i < 2; i++) {
    const th = r() * TAU, ph = Math.acos(2 * r() - 1);
    const vx = Math.sin(ph) * Math.cos(th), vy = Math.cos(ph), vz = Math.sin(ph) * Math.sin(th);
    const rr = radius * (1.16 + r() * 0.26);
    addLeafCard(
      center.x + vx * rr, center.y + vy * rr * 0.8, center.z + vz * rr,
      vx + (r() - 0.5) * 0.5, vy + 0.35, vz + (r() - 0.5) * 0.5,
      radius * (0.62 + r() * 0.28), swayV * 1.15, cph + r() * 0.25, 0.68 + Math.pow(r(), 1.2) * 0.42
    );
  }
  if (r() < 0.5) CANOPY_PTS.push(center.clone());
}

function buildSakura(cfg) {
  RNG = mulberry32(cfg.seed);
  const r = RNG;
  const branches = [];
  const s = cfg.scale || 1;
  const baseY = cfg.baseY !== undefined ? cfg.baseY : groundH(cfg.x, cfg.z);

  function branchPoints(start, dir, len, bow) {
    const pts = [];
    const n = 5;
    const side = new T.Vector3().crossVectors(dir, new T.Vector3(0, 1, 0));
    if (side.lengthSq() < 1e-5) side.set(1, 0, 0);
    side.normalize();
    const bowV = side.multiplyScalar(bow).add(new T.Vector3(0, bow * 0.45, 0));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = start.clone().addScaledVector(dir, len * t).addScaledVector(bowV, Math.sin(t * Math.PI) * 0.55);
      pts.push(p);
    }
    return pts;
  }

  function grow(start, dir, len, rad, depth, swayV) {
    const pts = branchPoints(start, dir, len, (r() - 0.5) * len * 0.30);
    branches.push({ pts, r0: rad, r1: rad * (depth >= 2 ? 0.55 : 0.68) });
    const end = pts[pts.length - 1];
    const endDir = pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize();

    if (depth >= cfg.depth) {
      addCluster(end, cfg.leafR * s * (0.85 + r() * 0.35), endDir, swayV, r);
      return;
    }

    // 末级枝干沿途挂叶
    if (depth >= 2) {
      const cnt = depth >= 3 ? 2 : 1;
      for (let i = 0; i < cnt; i++) {
        const t = 0.55 + i * 0.32;
        const p = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
        addCluster(p, cfg.leafR * s * (0.62 + r() * 0.28), endDir, swayV * 0.95, r);
      }
    }

    const kids = depth === 0 ? 3 : (r() < 0.72 ? 2 : 3);
    for (let i = 0; i < kids; i++) {
      const ang = (depth === 0 ? 0.34 : 0.42) + r() * 0.42;
      const roll = (i / kids) * TAU + r() * 0.7;
      let nd = deflect(endDir, ang, roll);
      // 向上/向外的生长偏好
      nd.y += cfg.upBias !== undefined ? cfg.upBias : 0.16;
      if (cfg.weep && depth >= 2) nd.y -= 0.30;
      nd.normalize();
      const spawn = depth === 0 ? pts[Math.round(pts.length * (0.55 + r() * 0.25))] : end;
      grow(spawn, nd, len * (0.66 + r() * 0.18), rad * 0.62, depth + 1, swayV + 0.16);
    }
  }

  function deflect(dir, angle, roll) {
    const up = new T.Vector3(0, 1, 0);
    let side = new T.Vector3().crossVectors(dir, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const fwd = new T.Vector3().crossVectors(side, dir).normalize();
    const axis = side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(fwd, Math.sin(roll)).normalize();
    return dir.clone().applyAxisAngle(axis, angle).normalize();
  }

  // 主干（世界坐标建模，便于叶团与枝干共用同一空间）
  const startDir = new T.Vector3(cfg.leanX || 0, 1, cfg.leanZ || 0).normalize();
  const trunkLen = 2.55 * s;
  grow(new T.Vector3(cfg.x, baseY - 0.05, cfg.z), startDir, trunkLen, 0.30 * s, 0, 0);

  /* 组装枝干网格 */
  const woodGeo = mergeBranches(branches, baseY, r() * TAU);
  const woodMat = new T.MeshStandardMaterial({
    color: new T.Color('#7a5361'), roughness: 0.92, metalness: 0.0, flatShading: true,
  });
  windifyFoliage(woodMat, 0.42);
  const wood = new T.Mesh(woodGeo, woodMat);
  wood.castShadow = true; wood.receiveShadow = true;

  const grp = new T.Group();
  grp.add(wood);
  grp.position.set(0, 0, 0);
  scene.add(grp);

  // 叶团（全局合并）
  TREE_SPOTS.push({ x: cfg.x, z: cfg.z, s: s });
  addExclude(cfg.x, cfg.z, 0.85 * s);
  return grp;
}

/* 把若干锥形管合并成一个几何体 */
function mergeBranches(list, baseY, phase) {
  const pos = [], idx = [], uv = [];
  const R = 8;
  list.forEach((b) => {
    const pts = b.pts;
    const n = pts.length;
    const base = pos.length / 3;
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = new T.Vector3();
      if (i === 0) t.subVectors(pts[1], pts[0]);
      else if (i === n - 1) t.subVectors(pts[n - 1], pts[n - 2]);
      else t.subVectors(pts[i + 1], pts[i - 1]);
      t.normalize();
      let u = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), t);
      if (u.lengthSq() < 1e-6) u.crossVectors(new T.Vector3(1, 0, 0), t);
      u.normalize();
      const v = new T.Vector3().crossVectors(t, u).normalize();
      frames.push({ u, v });
    }
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const rad = b.r0 + (b.r1 - b.r0) * s;
      for (let j = 0; j < R; j++) {
        const a = (j / R) * TAU;
        const k = 1 + 0.07 * Math.sin(i * 2.3 + j * 1.7);
        const p = pts[i].clone()
          .addScaledVector(frames[i].u, Math.cos(a) * rad * k)
          .addScaledVector(frames[i].v, Math.sin(a) * rad * k);
        pos.push(p.x, p.y, p.z);
        uv.push(j / R, s);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < R; j++) {
        const a = base + i * R + j, bq = base + i * R + ((j + 1) % R);
        const c = base + (i + 1) * R + j, d = base + (i + 1) * R + ((j + 1) % R);
        idx.push(a, bq, c, bq, d, c);
      }
    }
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  const swayArr = new Float32Array(pos.length / 3);
  const phArr = new Float32Array(pos.length / 3);
  for (let i = 0; i < swayArr.length; i++) {
    const y = pos[i * 3 + 1];
    swayArr[i] = Math.pow(clamp((y - baseY) / 6.5, 0, 1), 1.5) * 0.85;
    phArr[i] = phase || 0;
  }
  g.setAttribute('aSway', new T.Float32BufferAttribute(swayArr, 1));
  g.setAttribute('aPhase', new T.Float32BufferAttribute(phArr, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* 垂枝櫻：从枝端垂下的花串 */
function addWeepStrand(start, dir, len, swayV, r, s) {
  const out = dir.clone(); out.y = 0;
  if (out.lengthSq() < 1e-5) out.set(1, 0, 0);
  out.normalize();
  const pts = [];
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new T.Vector3(
      start.x + out.x * len * 0.35 * Math.sin(t * 1.1) + (r() - 0.5) * 0.1,
      start.y + len * 0.10 * Math.sin(t * 2.2) - len * Math.pow(t, 1.4) * 0.92,
      start.z + out.z * len * 0.35 * Math.sin(t * 1.1) + (r() - 0.5) * 0.1
    ));
  }
  WEEP_BRANCHES.push({ pts, r0: 0.035 * s, r1: 0.012 * s });
  for (let i = 1; i <= n; i++) {
    const p = pts[i];
    addCluster(p, 0.30 * s * (0.8 + r() * 0.4), new T.Vector3(out.x * 0.3, -1, out.z * 0.3), swayV * (1 + i * 0.25), r);
  }
}
const WEEP_BRANCHES = [];

/* ---------- 建立树木 ---------- */
function plantTrees() {
  const configs = [
    { x: -8.6, z: 1.2, scale: 1.26, seed: 101, depth: 4, leafR: 0.70, leanX: 0.16, leanZ: 0.10, upBias: 0.14 },
    { x: 3.6, z: -9.6, scale: 1.06, seed: 202, depth: 4, leafR: 0.66, leanX: -0.12, leanZ: 0.08, upBias: 0.16 },
    { x: 9.2, z: -3.4, scale: 0.76, seed: 303, depth: 3, leafR: 0.62, leanX: -0.2, leanZ: -0.1, upBias: 0.2 },
  ];
  configs.forEach((c) => buildSakura(c));

  // 垂枝櫻（单独处理，便于加花串）
  RNG = mulberry32(404);
  const r = RNG;
  const wx = -9.6, wz = -6.4, ws = 1.05;
  const baseY = groundH(wx, wz);
  const br = [];
  function wgrow(start, dir, len, rad, depth, swayV) {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      pts.push(start.clone().addScaledVector(dir, len * t).add(new T.Vector3(0, -len * 0.10 * t * t, 0)));
    }
    br.push({ pts, r0: rad, r1: rad * 0.6 });
    const end = pts[4];
    const ed = pts[4].clone().sub(pts[3]).normalize();
    if (depth >= 2) {
      const n = 3;
      for (let i = 0; i < n; i++) {
        const a = r() * TAU, rr = 0.5 + r() * 0.8;
        addWeepStrand(
          end.clone().add(new T.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr)),
          ed, (1.1 + r() * 0.9) * ws, swayV, r, ws
        );
      }
    }
    if (depth >= 3) return;
    const kids = depth === 0 ? 4 : 2;
    for (let i = 0; i < kids; i++) {
      const roll = (i / kids) * TAU + r() * 0.8;
      const up = new T.Vector3(0, 1, 0);
      let side = new T.Vector3().crossVectors(ed, up).normalize();
      const fwd = new T.Vector3().crossVectors(side, ed).normalize();
      const axis = side.clone().multiplyScalar(Math.cos(roll)).addScaledVector(fwd, Math.sin(roll)).normalize();
      const nd = ed.clone().applyAxisAngle(axis, 0.5 + r() * 0.35);
      nd.y += 0.12;
      nd.normalize();
      wgrow(depth === 0 ? pts[1 + Math.floor(r() * 2)] : end, nd, len * 0.72, rad * 0.62, depth + 1, swayV + 0.2);
    }
  }
  wgrow(new T.Vector3(wx, baseY - 0.05, wz), new T.Vector3(0.18, 1, 0.1).normalize(), 2.4 * ws, 0.26 * ws, 0, 0);
  const wgeo = mergeBranches(br.concat(WEEP_BRANCHES), baseY, r() * TAU);
  const wMat = new T.MeshStandardMaterial({ color: new T.Color('#7a5361'), roughness: 0.92, flatShading: true });
  windifyFoliage(wMat, 0.5);
  const wmesh = new T.Mesh(wgeo, wMat);
  wmesh.castShadow = true; wmesh.receiveShadow = true;
  const wgrp = new T.Group();
  wgrp.add(wmesh);
  scene.add(wgrp);
  TREE_SPOTS.push({ x: wx, z: wz, s: ws });
  addExclude(wx, wz, 0.9 * ws);
}

/* ---------- 叶团网格 ---------- */
function buildFoliageMesh() {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(leafVerts.pos, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(leafVerts.nrm, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(leafVerts.uv, 2));
  g.setAttribute('aSway', new T.Float32BufferAttribute(leafVerts.sway, 1));
  g.setAttribute('aPhase', new T.Float32BufferAttribute(leafVerts.phase, 1));
  g.setAttribute('color', new T.Float32BufferAttribute(leafVerts.col, 3));
  g.setIndex(leafVerts.idx);
  const norm = g.attributes.normal;
  for (let i = 0; i < norm.count; i++) {
    const v = new T.Vector3(norm.getX(i), norm.getY(i), norm.getZ(i)).normalize();
    norm.setXYZ(i, v.x, v.y, v.z);
  }
  const mat = new T.MeshStandardMaterial({
    map: TEX.blossom, color: new T.Color(PAL.blossom),
    alphaTest: 0.42, side: T.DoubleSide, roughness: 0.88, metalness: 0.0, vertexColors: true,
    emissive: new T.Color('#ff9dbe'), emissiveIntensity: 0.10,
  });
  windifyFoliage(mat, 1.0);
  const mesh = new T.Mesh(g, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  const grp = new T.Group();
  grp.add(mesh);
  // 叶团坐标已是世界坐标，直接放置在原点
  scene.add(grp);
  return { mesh, mat };
}

/* ========================================================================
   C4. 落花
   ======================================================================== */
function buildPetals(count) {
  const geo = new T.PlaneGeometry(0.10, 0.10);
  const mat = new T.MeshStandardMaterial({
    map: TEX.petal, color: new T.Color('#ffc9da'), alphaTest: 0.4,
    side: T.DoubleSide, roughness: 0.85, metalness: 0, transparent: false,
  });
  const mesh = new T.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(spawnPetal({}, true));
  }
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  return { mesh, items, mat };
}
function spawnPetal(p, initial) {
  const c = CANOPY_PTS.length ? CANOPY_PTS[Math.floor(Math.random() * CANOPY_PTS.length)] : new T.Vector3(0, 4, 0);
  p.x = c.x + (Math.random() - 0.5) * 2.2;
  p.z = c.z + (Math.random() - 0.5) * 2.2;
  p.y = c.y + (Math.random() - 0.5) * 1.2;
  if (initial) p.y -= Math.random() * 6;
  p.floor = groundH(p.x, p.z) + 0.03;
  p.vx = (Math.random() - 0.5) * 0.25;
  p.vz = (Math.random() - 0.5) * 0.25;
  p.vy = 0.28 + Math.random() * 0.35;
  p.rx = Math.random() * 6.28; p.ry = Math.random() * 6.28; p.rz = Math.random() * 6.28;
  p.sx = (Math.random() - 0.5) * 2.4; p.sy = (Math.random() - 0.5) * 2.0; p.sz = (Math.random() - 0.5) * 1.6;
  p.ph = Math.random() * 6.28;
  p.sc = 0.7 + Math.random() * 0.8;
  return p;
}

/* ========================================================================
   组装
   ======================================================================== */
plantTrees();
const foliage = buildFoliageMesh();
const grassMesh = buildGrass();
scene.add(grassMesh);
const flowerBuild = buildFlowers();
scene.add(flowerBuild.mesh);
const petals = buildPetals(900);
scene.add(petals.mesh);
