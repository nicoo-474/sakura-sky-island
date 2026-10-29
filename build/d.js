/* =========================================================================
   D. 和风建筑 · 遗迹
   ========================================================================= */

/* ---------- 做旧：世界高度积垢 / 污渍条纹 ---------- */
function weatherify(mat, opts) {
  const o = opts || {};
  const bottom = o.bottom === undefined ? 0.62 : o.bottom;
  const top = o.top === undefined ? 2.5 : o.top;
  const strength = o.strength === undefined ? 0.85 : o.strength;
  const stain = o.stain === undefined ? 0.18 : o.stain;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWBottom = { value: bottom };
    sh.uniforms.uWTop = { value: top };
    sh.uniforms.uWStr = { value: strength };
    sh.uniforms.uWStain = { value: stain };
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vWP = (modelMatrix * vec4(position, 1.0)).xyz;'
    );
    sh.fragmentShader = 'varying vec3 vWP;\nuniform float uWBottom;uniform float uWTop;uniform float uWStr;uniform float uWStain;\n' +
      sh.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float dirt = 1.0 - smoothstep(uWBottom, uWTop, vWP.y);
          float streak = 0.5 + 0.5 * sin(vWP.x * 5.3 + vWP.z * 4.1);
          streak *= 0.5 + 0.5 * sin(vWP.y * 1.7 + vWP.x * 2.2);
          float k = mix(1.0, 0.52 + 0.20 * streak, dirt * uWStr);
          // 局部水渍/霉斑
          float blot = sin(vWP.x * 1.9 + 1.3) * cos(vWP.z * 2.3 - 0.7) * sin(vWP.y * 2.9);
          k *= 1.0 - max(0.0, blot) * uWStain;
          diffuseColor.rgb *= k;
        }`
      );
  };
  mat.customProgramCacheKey = () => 'weather' + bottom + '_' + top + '_' + strength;
  return mat;
}

function texRepeat(t, x, y) {
  const c = t.clone();
  c.needsUpdate = true;
  c.wrapS = c.wrapT = T.RepeatWrapping;
  c.repeat.set(x, y);
  c.colorSpace = T.SRGBColorSpace;
  c.anisotropy = 8;
  return c;
}

/* ---------- 材质 ---------- */
const M = {
  wood: weatherify(matStd({
    color: new T.Color('#c795a2'), roughness: 0.88, metalness: 0.0,
    map: texRepeat(TEX.woodGrain, 1.6, 0.85), bumpMap: texRepeat(TEX.woodGrain, 1.6, 0.85), bumpScale: 0.004,
  }), { bottom: 0.4, top: 2.6, strength: 0.42 }),
  woodOld: weatherify(matStd({
    color: new T.Color('#bd939e'), roughness: 0.93, metalness: 0.0,
    map: texRepeat(TEX.woodGrain, 1.3, 1.0), bumpMap: texRepeat(TEX.woodGrain, 1.3, 1.0), bumpScale: 0.004,
  }), { bottom: 0.45, top: 2.2, strength: 0.5 }),
  woodDark: weatherify(matStd({
    color: new T.Color('#6b4c58'), roughness: 0.86, metalness: 0.0,
    map: texRepeat(TEX.woodGrain, 2.0, 0.7), bumpMap: texRepeat(TEX.woodGrain, 2.0, 0.7), bumpScale: 0.003,
  }), { bottom: 0.3, top: 2.4, strength: 0.7 }),
  stone: weatherify(matStd({
    color: new T.Color('#dcc3cc'), roughness: 0.95, metalness: 0.0,
    map: texRepeat(TEX.stoneGrain, 1.1, 1.1), bumpMap: texRepeat(TEX.stoneGrain, 1.1, 1.1), bumpScale: 0.006,
  }), { bottom: 0.42, top: 1.5, strength: 1.0, stain: 0.24 }),
  stoneDark: weatherify(matStd({
    color: new T.Color('#c0a3af'), roughness: 0.96, metalness: 0.0,
    map: texRepeat(TEX.stoneGrain, 0.9, 0.9), bumpMap: texRepeat(TEX.stoneGrain, 0.9, 0.9), bumpScale: 0.006,
  }), { bottom: 0.35, top: 1.3, strength: 1.0, stain: 0.26 }),
  roof: weatherify(matStd({
    color: new T.Color('#6b5561'), roughness: 0.74, metalness: 0.08, side: T.DoubleSide,
    map: texRepeat(TEX.stoneGrain, 2.4, 2.4), bumpMap: texRepeat(TEX.stoneGrain, 2.4, 2.4), bumpScale: 0.004,
  }), { bottom: 1.2, top: 3.4, strength: 0.55, stain: 0.2 }),
  plaster: weatherify(matStd({
    color: new T.Color('#e6ccd4'), roughness: 0.95, metalness: 0.0,
    map: texRepeat(TEX.stone, 2, 2),
  }), { bottom: 0.5, top: 2.4, strength: 0.8, stain: 0.28 }),
  paper: new T.MeshStandardMaterial({ color: new T.Color('#fdf5ee'), roughness: 0.95, metalness: 0.0, side: T.DoubleSide, emissive: new T.Color('#ffe9d6'), emissiveIntensity: 0.55 }),
  metal: new T.MeshStandardMaterial({ color: new T.Color('#7e6570'), roughness: 0.5, metalness: 0.55 }),
  lanternGlow: new T.MeshStandardMaterial({
    color: new T.Color('#ffd9a8'), emissive: new T.Color('#ffb765'), emissiveIntensity: 0.0, roughness: 1,
  }),
  rope: weatherify(matStd({
    color: new T.Color('#efe0c9'), roughness: 0.97, metalness: 0.0,
    map: texRepeat(TEX.woodGrain, 3, 3),
  }), { bottom: 1.0, top: 2.8, strength: 0.5, stain: 0.15 }),
  plaque: new T.MeshStandardMaterial({ map: TEX.kanjiTorii, roughness: 0.85, metalness: 0.0, side: T.DoubleSide }),
};

/* ---------- 排除区（草丛避让） ---------- */
const EXCLUDE = [];
function addExclude(x, z, r) { EXCLUDE.push({ x, z, r }); }

/* ---------- 通用：沿折线扫掠截面 ---------- */
function loftSection(points, profile, upHint) {
  const n = points.length, np = profile.length;
  const pos = [], idx = [];
  const up = upHint || new T.Vector3(0, 1, 0);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = new T.Vector3();
    if (i === 0) t.subVectors(points[1], points[0]);
    else if (i === n - 1) t.subVectors(points[n - 1], points[n - 2]);
    else t.subVectors(points[i + 1], points[i - 1]);
    t.normalize();
    let u = new T.Vector3().crossVectors(up, t);
    if (u.lengthSq() < 1e-6) u.crossVectors(new T.Vector3(0, 0, 1), t);
    u.normalize();
    const v = new T.Vector3().crossVectors(t, u).normalize();
    frames.push({ u, v });
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < np; j++) {
      const p = points[i].clone()
        .addScaledVector(frames[i].u, profile[j][0])
        .addScaledVector(frames[i].v, profile[j][1]);
      pos.push(p.x, p.y, p.z);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < np; j++) {
      const a = i * np + j, b = i * np + ((j + 1) % np), c = (i + 1) * np + j, d = (i + 1) * np + ((j + 1) % np);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* 圆管（树枝、绳索、柱） */
function loftTube(points, r0, r1, radial, jitter) {
  const n = points.length, R = radial || 8;
  const pos = [], idx = [], uv = [];
  const up = new T.Vector3(0, 1, 0);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = new T.Vector3();
    if (i === 0) t.subVectors(points[1], points[0]);
    else if (i === n - 1) t.subVectors(points[n - 1], points[n - 2]);
    else t.subVectors(points[i + 1], points[i - 1]);
    t.normalize();
    let u = new T.Vector3().crossVectors(up, t);
    if (u.lengthSq() < 1e-6) u.crossVectors(new T.Vector3(1, 0, 0), t);
    u.normalize();
    const v = new T.Vector3().crossVectors(t, u).normalize();
    frames.push({ u, v, t });
  }
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    const rad = r0 + (r1 - r0) * s;
    for (let j = 0; j < R; j++) {
      const ang = (j / R) * TAU;
      const k = jitter ? 1 + jitter(i, j) : 1;
      const p = points[i].clone()
        .addScaledVector(frames[i].u, Math.cos(ang) * rad * k)
        .addScaledVector(frames[i].v, Math.sin(ang) * rad * k);
      pos.push(p.x, p.y, p.z);
      uv.push(j / R, s);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * R + j, b = i * R + ((j + 1) % R), c = (i + 1) * R + j, d = (i + 1) * R + ((j + 1) % R);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* 倒角矩形截面 */
function chamferRect(w, h, c) {
  c = Math.min(c, Math.min(w, h) * 0.4);
  return [
    [-w / 2 + c, -h / 2], [w / 2 - c, -h / 2], [w / 2, -h / 2 + c], [w / 2, h / 2 - c],
    [w / 2 - c, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c],
  ];
}

/* 拱形梁：沿 X 微翘 */
function curvedBeam(len, depth, height, curl, chamfer, segs) {
  segs = segs || 14;
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = (t - 0.5) * len;
    const y = curl * Math.pow(Math.abs(t - 0.5) * 2, 2.4);
    pts.push(new T.Vector3(x, y, 0));
  }
  return loftSection(pts, chamferRect(depth, height, chamfer || Math.min(depth, height) * 0.18));
}

/* 带厚度的屋顶曲面（脊沿 X，坡向 ±Z） */
function makeRoof(ridgeLen, spread, height, lift, thick, nu, nv) {
  nu = nu || 18; nv = nv || 10;
  const pos = [], idx = [];
  const cols = nu + 1, rows = nv + 1;
  const surf = (u, v, sgn, dy) => {
    const x = u * ridgeLen * 0.5;
    const z = sgn * v * spread * 0.5;
    const y = height * Math.pow(1 - v, 1.32) + lift * Math.pow(Math.abs(u), 3.2) * Math.pow(v, 2.2) + dy;
    return [x, y, z];
  };
  [1, -1].forEach((sgn) => {
    const base = pos.length / 3;
    // 上表面
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i / nu) * 2 - 1, v = j / nv;
      const p = surf(u, v, sgn, thick);
      pos.push(p[0], p[1], p[2]);
    }
    // 下表面
    const base2 = pos.length / 3;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const u = (i / nu) * 2 - 1, v = j / nv;
      const p = surf(u, v, sgn, 0);
      pos.push(p[0], p[1], p[2]);
    }
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = base + j * cols + i, b = a + 1, c = a + cols, d = c + 1;
        if (sgn > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
        const a2 = base2 + j * cols + i, b2 = a2 + 1, c2 = a2 + cols, d2 = c2 + 1;
        if (sgn > 0) idx.push(a2, c2, b2, b2, c2, d2); else idx.push(a2, b2, c2, b2, d2, c2);
      }
    }
    // 檐口封边（v=1 一侧）
    for (let i = 0; i < cols - 1; i++) {
      const t0 = base + (rows - 1) * cols + i, t1 = t0 + 1;
      const b0 = base2 + (rows - 1) * cols + i, b1 = b0 + 1;
      if (sgn > 0) idx.push(t0, b0, t1, t1, b0, b1); else idx.push(t0, t1, b0, t1, b1, b0);
    }
    // 两侧封边
    for (let j = 0; j < rows - 1; j++) {
      [0, cols - 1].forEach((ci, k2) => {
        const t0 = base + j * cols + ci, t1 = base + (j + 1) * cols + ci;
        const b0 = base2 + j * cols + ci, b1 = base2 + (j + 1) * cols + ci;
        if (k2 === 0) idx.push(t0, t1, b0, t1, b1, b0);
        else idx.push(t0, b0, t1, t1, b0, b1);
      });
    }
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- 建筑总组 ---------- */
const buildings = new T.Group();
scene.add(buildings);

/* ========================================================= *
 *  D1. 鸟居（明神鸟居 + 注连绳 / 纸垂 / 神额 / 提灯 / 风铎）
 * ========================================================= */
function makeShideGeo(w, h) {
  const pos = [], idx = [];
  const n = 4;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = -t * h;
    const xo = (i % 2 ? 1 : -1) * w * 0.40 * (i === 0 || i === n ? 0.15 : 1);
    const ww = w * (1 - t * 0.18);
    pos.push(-ww / 2 + xo, y, 0, ww / 2 + xo, y, 0);
  }
  for (let i = 0; i < n; i++) {
    const p0 = i * 2, p1 = p0 + 1, p2 = p0 + 2, p3 = p0 + 3;
    idx.push(p0, p1, p2, p1, p3, p2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const mossMat = new T.MeshStandardMaterial({ color: new T.Color('#8d6a70'), roughness: 1.0, flatShading: true });

function buildTorii(px, pz, yaw, scl) {
  const g = new T.Group();
  const s = scl || 1;
  const H = 4.1 * s, halfW = 1.42 * s;
  // 横梁整体上提：笠木顶面齐柱顶
  const yNuki = 2.42 * s, yGakuC = 2.90 * s, yGakuH = 0.66 * s;
  const yRope = 3.45 * s, yShimaki = 3.62 * s, yKasagi = 3.94 * s, yCap = 4.06 * s;

  // 柱（略有收分与内倾）
  [-1, 1].forEach((sgn) => {
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push(new T.Vector3(sgn * (halfW + 0.06 - 0.10 * t), t * H, 0.02 * sgn * (1 - t)));
    }
    const geo = loftTube(pts, 0.185 * s, 0.150 * s, 12, (i, j) => 0.025 * Math.sin(i * 1.7 + j * 2.1));
    const m = new T.Mesh(geo, M.wood);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // 柱脚石
    const base = new T.Mesh(roundedBoxGeo(0.52 * s, 0.20 * s, 0.52 * s, 0.06 * s, 3), M.stoneDark);
    base.position.set(sgn * (halfW + 0.06), 0.06 * s, 0);
    base.castShadow = true; base.receiveShadow = true;
    g.add(base);
    // 石座上的苔痕
    for (let k = 0; k < 3; k++) {
      const mo = new T.Mesh(stoneChunk(0.22 * s, 0.07 * s, 0.18 * s, 0.4, 1200 + k), mossMat);
      mo.position.set(sgn * (halfW + 0.06) + rnd(-0.2, 0.2) * s, 0.17 * s, rnd(-0.2, 0.2) * s);
      mo.rotation.y = rnd(0, TAU);
      g.add(mo);
    }
    // 藤蔓缠绕
    for (let v = 0; v < 2; v++) {
      const vp = [];
      const y0 = 0.22 + rnd(0, 0.3), y1 = y0 + 0.9 + rnd(0, 0.7);
      const turns = 1.6 + rnd(0, 1.0), r0 = 0.20 * s;
      for (let k = 0; k <= 16; k++) {
        const t = k / 16;
        const ang = t * turns * TAU + v * 2.1;
        vp.push(new T.Vector3(
          sgn * (halfW + 0.06) + Math.cos(ang) * r0,
          y0 + (y1 - y0) * t,
          Math.sin(ang) * r0
        ));
      }
      const vm = new T.Mesh(loftTube(vp, 0.014 * s, 0.006 * s, 5), new T.MeshStandardMaterial({
        color: new T.Color('#7a5a5e'), roughness: 0.98,
      }));
      vm.castShadow = true;
      g.add(vm);
    }
  });

  // 贯（下横梁）
  const nuki = new T.Mesh(curvedBeam(2 * (halfW + 0.30 * s), 0.17 * s, 0.28 * s, 0.015 * s, 0.022 * s, 10), M.woodOld);
  nuki.position.y = yNuki;
  nuki.castShadow = true; nuki.receiveShadow = true;
  g.add(nuki);

  // 额束
  const gaku = new T.Mesh(roundedBoxGeo(0.30 * s, yGakuH, 0.15 * s, 0.02 * s, 3), M.wood);
  gaku.position.set(0, yGakuC, 0);
  gaku.castShadow = true;
  g.add(gaku);

  // 神额（木牌）
  [-1, 1].forEach((sz) => {
    const pl = new T.Mesh(new T.PlaneGeometry(0.40 * s, 0.20 * s), M.plaque);
    pl.position.set(0, yGakuC - 0.02 * s, sz * 0.082 * s);
    pl.rotation.y = sz > 0 ? 0 : Math.PI;
    g.add(pl);
  });

  // 岛木
  const shimaki = new T.Mesh(curvedBeam(2 * (halfW + 0.42 * s), 0.30 * s, 0.15 * s, 0.05 * s, 0.018 * s, 16), M.wood);
  shimaki.position.y = yShimaki;
  shimaki.castShadow = true;
  g.add(shimaki);

  // 笠木（顶部微翘）
  const kasagi = new T.Mesh(curvedBeam(2 * (halfW + 0.58 * s), 0.38 * s, 0.21 * s, 0.20 * s, 0.03 * s, 22), M.woodDark);
  kasagi.position.y = yKasagi;
  kasagi.castShadow = true; kasagi.receiveShadow = true;
  g.add(kasagi);

  const cap = new T.Mesh(roundedBoxGeo(2 * (halfW + 0.58 * s), 0.05 * s, 0.30 * s, 0.018 * s, 2), M.woodDark);
  cap.position.y = yCap;
  cap.castShadow = true;
  g.add(cap);

  /* ---- 注连绳 + 纸垂 ---- */
  const ropePts = [];
  const ropeY = yRope, sag = 0.18 * s;
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    ropePts.push(new T.Vector3(
      (-1.30 + 2.60 * t) * s,
      ropeY - Math.sin(t * Math.PI) * sag,
      Math.sin(t * Math.PI * 3) * 0.02 * s
    ));
  }
  const rope = new T.Mesh(loftTube(ropePts, 0.072 * s, 0.072 * s, 7,
    (i, j) => 0.16 * Math.sin(i * 2.4 + j * 1.9)), M.rope);
  rope.castShadow = true;
  g.add(rope);
  // 绳上草束
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9;
    const x = (-1.30 + 2.60 * t) * s;
    const y = ropeY - Math.sin(t * Math.PI) * sag - 0.06 * s;
    const tuft = new T.Mesh(roundedBoxGeo(0.05 * s, 0.14 * s, 0.02 * s, 0.01, 2), M.rope);
    tuft.position.set(x, y, 0);
    tuft.rotation.z = rnd(-0.25, 0.25);
    g.add(tuft);
  }
  // 纸垂
  [-1.02, -0.5, 0, 0.5, 1.02].forEach((xx, i) => {
    const x = xx * s;
    const t = (x / s + 1.30) / 2.60;
    const y = ropeY - Math.sin(t * Math.PI) * sag - 0.15 * s;
    const sh = new T.Mesh(makeShideGeo(0.105 * s, (0.30 + (i % 2) * 0.07) * s), M.paper);
    sh.position.set(x, y, 0.07 * s);
    sh.rotation.z = rnd(-0.08, 0.08);
    sh.castShadow = true;
    g.add(sh);
  });

  /* ---- 提灯 ---- */
  [-1, 1].forEach((sgn) => {
    const lx = sgn * 1.06 * s, ly = yNuki + 0.08 * s;
    const cord = new T.Mesh(roundedBoxGeo(0.012 * s, 0.26 * s, 0.012 * s, 0.004, 1), M.rope);
    cord.position.set(lx, ly - 0.13 * s, 0.06 * s);
    g.add(cord);
    const body = new T.Mesh(new T.SphereGeometry(0.19 * s, 16, 12), M.lanternGlow);
    body.scale.set(1, 1.28, 1);
    body.position.set(lx, ly - 0.44 * s, 0.06 * s);
    body.castShadow = true;
    g.add(body);
    const capT = new T.Mesh(roundedBoxGeo(0.13 * s, 0.035 * s, 0.13 * s, 0.008, 2), M.woodDark);
    capT.position.set(lx, ly - 0.24 * s, 0.06 * s);
    g.add(capT);
    const capB = new T.Mesh(roundedBoxGeo(0.11 * s, 0.03 * s, 0.11 * s, 0.008, 2), M.woodDark);
    capB.position.set(lx, ly - 0.63 * s, 0.06 * s);
    g.add(capB);
    // 灯笼上的字条
    const tag = new T.Mesh(roundedBoxGeo(0.07 * s, 0.20 * s, 0.008 * s, 0.003, 1), M.paper);
    tag.position.set(lx, ly - 0.86 * s, 0.06 * s);
    g.add(tag);
  });

  /* ---- 风铎 ---- */
  const chimeCord = new T.Mesh(roundedBoxGeo(0.01 * s, 0.30 * s, 0.01 * s, 0.003, 1), M.rope);
  chimeCord.position.set(-0.72 * s, yNuki - 0.16 * s, 0);
  g.add(chimeCord);
  const bell = new T.Mesh(new T.ConeGeometry(0.065 * s, 0.11 * s, 10), M.metal);
  bell.position.set(-0.72 * s, yNuki - 0.30 * s, 0);
  bell.rotation.x = Math.PI;
  bell.castShadow = true;
  g.add(bell);
  for (let i = 0; i < 3; i++) {
    const strip = new T.Mesh(roundedBoxGeo(0.018 * s, 0.18 * s, 0.004 * s, 0.002, 1), M.paper);
    strip.position.set(-0.72 * s + rnd(-0.03, 0.03) * s, yNuki - 0.50 * s, rnd(-0.03, 0.03) * s);
    strip.rotation.z = rnd(-0.15, 0.15);
    g.add(strip);
  }

  const y = groundH(px, pz);
  g.position.set(px, y - 0.06, pz);
  g.rotation.y = yaw;
  g.rotation.z = 0.012;
  buildings.add(g);
  addExclude(px, pz, 1.9 * s);
  return g;
}

/* ========================================================= *
 *  D2. 小祠（妻入り）
 * ========================================================= */
function buildShrine(px, pz, yaw) {
  const g = new T.Group();
  const W = 3.25, D = 2.45;          // 主体宽 / 深

  // 石基坛（两级）
  const p1 = new T.Mesh(roundedBoxGeo(W + 0.95, 0.34, D + 0.85, 0.05, 4), M.stone);
  p1.position.y = 0.17; p1.castShadow = true; p1.receiveShadow = true; g.add(p1);
  const p2 = new T.Mesh(roundedBoxGeo(W + 0.5, 0.22, D + 0.42, 0.04, 4), M.stoneDark);
  p2.position.y = 0.44; p2.castShadow = true; p2.receiveShadow = true; g.add(p2);

  const floorY = 0.62;
  // 木地板
  const floor = new T.Mesh(roundedBoxGeo(W + 0.16, 0.16, D + 0.16, 0.03, 3), M.woodOld);
  floor.position.y = floorY; floor.castShadow = true; floor.receiveShadow = true; g.add(floor);

  // 四角柱
  const pH = 1.72;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const post = new T.Mesh(roundedBoxGeo(0.17, pH, 0.17, 0.022, 3), M.wood);
    post.position.set(sx * (W / 2 - 0.06), floorY + pH / 2, sz * (D / 2 - 0.06));
    post.castShadow = true; post.receiveShadow = true; g.add(post);
  });

  // 墙体：背板 + 两侧板（内凹）
  const back = new T.Mesh(roundedBoxGeo(W - 0.20, pH - 0.12, 0.10, 0.02, 3), M.plaster);
  back.position.set(0, floorY + pH / 2, -D / 2 + 0.10);
  back.castShadow = true; back.receiveShadow = true; g.add(back);

  [-1, 1].forEach((sx) => {
    const side = new T.Mesh(roundedBoxGeo(0.10, pH - 0.12, D - 0.36, 0.02, 3), M.plaster);
    side.position.set(sx * (W / 2 - 0.10), floorY + pH / 2, 0);
    side.castShadow = true; side.receiveShadow = true; g.add(side);
  });

  // 正面：格栅门两扇 + 框架
  const doorW = (W - 0.5) / 2, doorH = pH - 0.30;
  [-1, 1].forEach((sx) => {
    const dg = new T.Group();
    const fr = new T.Mesh(roundedBoxGeo(doorW, doorH, 0.05, 0.014, 2), M.woodDark);
    fr.castShadow = true; dg.add(fr);
    const inner = new T.Mesh(roundedBoxGeo(doorW - 0.14, doorH - 0.14, 0.03, 0.008, 2), M.paper);
    inner.position.z = 0.02; dg.add(inner);
    // 格栅
    for (let i = 0; i < 4; i++) {
      const bar = new T.Mesh(roundedBoxGeo(0.022, doorH - 0.16, 0.028, 0.006, 2), M.wood);
      bar.position.set(-doorW / 2 + 0.1 + i * ((doorW - 0.2) / 3), 0, 0.045);
      dg.add(bar);
    }
    for (let i = 0; i < 5; i++) {
      const bar = new T.Mesh(roundedBoxGeo(doorW - 0.14, 0.022, 0.028, 0.006, 2), M.wood);
      bar.position.set(0, -doorH / 2 + 0.1 + i * ((doorH - 0.2) / 4), 0.045);
      dg.add(bar);
    }
    dg.position.set(sx * (doorW / 2 + 0.13), floorY + pH / 2 - 0.02, D / 2 - 0.06);
    g.add(dg);
  });

  // 头贯（前后横梁）
  [-1, 1].forEach((sz) => {
    const beam = new T.Mesh(roundedBoxGeo(W + 0.30, 0.15, 0.13, 0.02, 3), M.wood);
    beam.position.set(0, floorY + pH + 0.03, sz * (D / 2 - 0.05));
    beam.castShadow = true; g.add(beam);
  });
  // 侧向梁
  [-1, 1].forEach((sx) => {
    const beam = new T.Mesh(roundedBoxGeo(0.13, 0.13, D + 0.22, 0.02, 3), M.wood);
    beam.position.set(sx * (W / 2 - 0.05), floorY + pH + 0.03, 0);
    beam.castShadow = true; g.add(beam);
  });

  // 屋顶（脊沿 X → 旋转 90°，使山面朝前）
  const roof = new T.Mesh(makeRoof(4.55, 4.05, 1.02, 0.17, 0.15, 24, 10), M.roof);
  roof.position.y = floorY + pH + 0.20;
  roof.castShadow = true; roof.receiveShadow = true;
  roof.rotation.y = Math.PI / 2;
  g.add(roof);

  // 山面三角（前后两片）
  [-1, 1].forEach((sz) => {
    const tri = new T.BufferGeometry();
    const yBot = floorY + pH + 0.20;
    const yTop = yBot + 0.99;
    const w = 3.94;
    const v = [
      -w / 2, yBot, 0, w / 2, yBot, 0, 0, yTop + 0.02, 0,
    ];
    tri.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    tri.setIndex([0, 1, 2]);
    tri.computeVertexNormals();
    const m = new T.Mesh(tri, new T.MeshStandardMaterial({ color: new T.Color('#e8d3d9'), roughness: 0.95, side: T.DoubleSide }));
    m.position.z = sz * 2.21;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    // 破风板（沿山面斜边）
    const L = Math.hypot(w / 2, yTop - yBot);
    [-1, 1].forEach((sx) => {
      const bb = new T.Mesh(roundedBoxGeo(L, 0.09, 0.08, 0.018, 2), M.woodDark);
      bb.position.set(sx * w / 4, yBot + (yTop - yBot) / 2, sz * 2.24);
      bb.rotation.z = -sx * Math.atan2(yTop - yBot, w / 2);
      bb.castShadow = true;
      g.add(bb);
    });
  });

  // 脊梁 + 鬼瓦
  const ridge = new T.Mesh(roundedBoxGeo(0.16, 0.17, 3.9, 0.03, 3), M.woodDark);
  ridge.position.set(0, floorY + pH + 0.24 + 1.06, 0);
  ridge.castShadow = true; g.add(ridge);
  [-1, 1].forEach((sz) => {
    const oni = new T.Mesh(roundedBoxGeo(0.22, 0.30, 0.16, 0.035, 3), M.woodDark);
    oni.position.set(0, floorY + pH + 0.24 + 1.10, sz * 1.92);
    oni.rotation.x = 0.12 * sz;
    oni.castShadow = true; g.add(oni);
  });

  // 注连绳 + 纸垂
  const ropePts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    ropePts.push(new T.Vector3(-1.35 + 2.7 * t, floorY + pH - 0.06 - 0.16 * Math.sin(t * Math.PI), D / 2 + 0.04));
  }
  const rope = new T.Mesh(loftTube(ropePts, 0.038, 0.038, 6, (i, j) => 0.14 * Math.sin(i * 2.3 + j)), M.paper);
  rope.castShadow = true; g.add(rope);
  [-0.75, 0, 0.75].forEach((x, i) => {
    for (let k = 0; k < 3; k++) {
      const sh = new T.Mesh(roundedBoxGeo(0.16, 0.16, 0.012, 0.005, 1), M.paper);
      sh.position.set(x + (k % 2 ? 0.045 : -0.045), floorY + pH - 0.22 - k * 0.15, D / 2 + 0.09);
      sh.rotation.z = (k % 2 ? 1 : -1) * 0.12;
      g.add(sh);
    }
  });

  // 前端台阶（三级）
  for (let i = 0; i < 3; i++) {
    const st = new T.Mesh(roundedBoxGeo(1.5 - i * 0.1, 0.14, 0.42, 0.035, 3), M.stone);
    st.position.set(0, 0.07 + (2 - i) * 0.14, D / 2 + 0.62 + i * 0.34);
    st.castShadow = true; st.receiveShadow = true; g.add(st);
  }

  // 赛钱箱
  const box = new T.Mesh(roundedBoxGeo(0.78, 0.42, 0.46, 0.035, 3), M.woodOld);
  box.position.set(0, 0.21, D / 2 + 1.15);
  box.castShadow = true; box.receiveShadow = true; g.add(box);
  for (let i = 0; i < 4; i++) {
    const sl = new T.Mesh(roundedBoxGeo(0.66, 0.03, 0.06, 0.008, 1), M.woodDark);
    sl.position.set(0, 0.44, D / 2 + 0.99 + i * 0.09);
    g.add(sl);
  }

  const y = groundH(px, pz);
  g.position.set(px, y - 0.10, pz);
  g.rotation.y = yaw;
  buildings.add(g);
  addExclude(px, pz, 3.1);
  return g;
}

/* ========================================================= *
 *  D3. 石灯笼
 * ========================================================= */
function hexPrism(r, h, seg) {
  const g = new T.CylinderGeometry(r, r, h, seg || 6, 1, false);
  g.translate(0, h / 2, 0);
  return g;
}
function buildLantern(px, pz, scl, rot) {
  const g = new T.Group();
  const s = scl || 1;
  const seg = 6;
  const add = (geo, mat, y) => {
    const m = new T.Mesh(geo, mat);
    m.position.y = y; m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  add(new T.CylinderGeometry(0.36 * s, 0.40 * s, 0.16 * s, seg), M.stoneDark, 0.08 * s); // 基础
  add(new T.CylinderGeometry(0.20 * s, 0.26 * s, 0.14 * s, seg, 1), M.stone, 0.23 * s);
  add(new T.CylinderGeometry(0.13 * s, 0.16 * s, 0.82 * s, seg, 1), M.stone, 0.71 * s); // 竿
  add(new T.CylinderGeometry(0.30 * s, 0.20 * s, 0.12 * s, seg, 1), M.stone, 1.18 * s); // 中台
  // 火袋
  const fire = add(new T.CylinderGeometry(0.27 * s, 0.27 * s, 0.36 * s, seg, 1), M.stone, 1.42 * s);
  // 火袋窗口（四向暗格）
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 6;
    const win = new T.Mesh(roundedBoxGeo(0.16 * s, 0.20 * s, 0.05 * s, 0.012, 2), M.woodDark);
    win.position.set(Math.cos(a) * 0.245 * s, 1.42 * s, Math.sin(a) * 0.245 * s);
    win.rotation.y = -a + Math.PI / 2;
    g.add(win);
  }
  // 灯火
  const glow = new T.Mesh(new T.SphereGeometry(0.085 * s, 10, 8), M.lanternGlow);
  glow.position.y = 1.42 * s;
  g.add(glow);
  // 笠（六角，端部微翘）
  const capPts = [];
  for (let j = 0; j <= 4; j++) {
    const t = j / 4;
    capPts.push([0.44 * s * (1 - t * 0.95), 0.20 * t]);
  }
  const capGeo = new T.LatheGeometry(capPts.map((p) => new T.Vector2(p[0], p[1])), 6);
  const cap = new T.Mesh(capGeo, M.stone);
  cap.position.y = 1.60 * s;
  cap.castShadow = true; cap.rotation.y = Math.PI / 6;
  g.add(cap);
  // 宝珠
  const orb = new T.Mesh(new T.SphereGeometry(0.075 * s, 10, 8), M.stone);
  orb.position.y = 1.86 * s; orb.castShadow = true; g.add(orb);
  const tip = new T.Mesh(new T.ConeGeometry(0.045 * s, 0.10 * s, 6), M.stone);
  tip.position.y = 1.95 * s; g.add(tip);

  const y = groundH(px, pz);
  g.position.set(px, y - 0.02, pz);
  g.rotation.y = rot || 0;
  g.rotation.z = 0.01;
  buildings.add(g);
  addExclude(px, pz, 0.62 * s);
  return { group: g, glow };
}

/* ========================================================= *
 *  D4. 参道石板
 * ========================================================= */
const PATH_PTS = [
  new T.Vector3(7.6, 0, 9.4), new T.Vector3(5.9, 0, 6.9), new T.Vector3(4.3, 0, 4.4), new T.Vector3(2.6, 0, 1.9),
  new T.Vector3(0.9, 0, -0.8), new T.Vector3(-0.7, 0, -3.4), new T.Vector3(-2.1, 0, -5.6),
];
const pathCurve = new T.CatmullRomCurve3(PATH_PTS, false, 'catmullrom', 0.4);
const PATH_SAMPLES = [];
for (let i = 0; i <= 42; i++) PATH_SAMPLES.push(pathCurve.getPointAt(i / 42));

function buildPath() {
  const g = new T.Group();
  const r = mulberry32(1234);
  const mat = M.stone, mat2 = M.stoneDark;
  let idx = 0;
  for (let t = 0.015; t < 0.995; t += 0.052) {
    const p = pathCurve.getPointAt(t);
    const tan = pathCurve.getTangentAt(t);
    const n = new T.Vector3(-tan.z, 0, tan.x).normalize();
    const off = (r() - 0.5) * 0.34;
    const w = 0.46 + r() * 0.30, d = 0.34 + r() * 0.20;
    const geo = roundedBoxGeo(w, 0.09 + r() * 0.04, d, 0.028, 3);
    const m = new T.Mesh(geo, r() > 0.7 ? mat2 : mat);
    const yy = groundH(p.x + n.x * off, p.z + n.z * off);
    m.position.set(p.x + n.x * off, yy - 0.015, p.z + n.z * off);
    m.rotation.y = Math.atan2(tan.x, tan.z) + (r() - 0.5) * 0.5;
    m.rotation.z = (r() - 0.5) * 0.05;
    m.rotation.x = (r() - 0.5) * 0.04;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    idx++;
  }
  // 两侧碎石
  for (let i = 0; i < 26; i++) {
    const t = r();
    const p = pathCurve.getPointAt(t);
    const tan = pathCurve.getTangentAt(t);
    const n = new T.Vector3(-tan.z, 0, tan.x).normalize();
    const off = (r() > 0.5 ? 1 : -1) * (0.62 + r() * 0.7);
    const s = 0.08 + r() * 0.13;
    const m = new T.Mesh(stoneChunk(s * 1.4, s, s * 1.2, 0.3, 900 + i), mat2);
    const yy = groundH(p.x + n.x * off, p.z + n.z * off);
    m.position.set(p.x + n.x * off, yy + s * 0.15, p.z + n.z * off);
    m.rotation.y = r() * TAU;
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
  }
  return g;
}
buildings.add(buildPath());

/* ========================================================= *
 *  D5. 遗迹：断柱 / 倒梁 / 石阶 / 矮墙 / 水钵
 * ========================================================= */
function buildRuins() {
  const g = new T.Group();
  const r = mulberry32(6060);

  // 断柱三根
  const pillars = [[6.4, -6.2, 0.16, 2.0], [7.9, -4.6, 0.14, 1.25], [5.2, -7.6, 0.13, 0.75]];
  pillars.forEach(([x, z, rad, hh], i) => {
    const y0 = groundH(x, z);
    const pts = [];
    const n = 7;
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      pts.push(new T.Vector3(x + Math.sin(t * 2 + i) * 0.03, y0 - 0.15 + hh * t, z + Math.cos(t * 2.4 + i) * 0.03));
    }
    const geo = loftTube(pts, rad * 1.06, rad * 0.96, 9, (q, j) => 0.03 * Math.sin(q * 1.3 + j * 2.7 + i));
    const m = new T.Mesh(geo, i % 2 ? M.stone : M.stoneDark);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    // 断口碎石
    const ch = new T.Mesh(stoneChunk(rad * 2.0, rad * 0.9, rad * 1.7, 0.35, 700 + i), M.stoneDark);
    ch.position.set(x + rad * 1.4, y0 + rad * 0.2, z + rad * 0.9);
    ch.rotation.set(r(), r() * TAU, r() * 0.3);
    ch.castShadow = true; g.add(ch);
    addExclude(x, z, rad * 2.2);
  });

  // 倒塌木梁
  const beam = new T.Mesh(roundedBoxGeo(2.9, 0.20, 0.26, 0.03, 3), M.woodOld);
  const bx = 5.0, bz = -3.4, by = groundH(bx, bz);
  beam.position.set(bx, by + 0.14, bz);
  beam.rotation.set(0.06, 0.9, 0.05);
  beam.castShadow = true; beam.receiveShadow = true; g.add(beam);
  addExclude(bx, bz, 1.5);

  // 断裂台阶
  for (let i = 0; i < 3; i++) {
    const st = new T.Mesh(roundedBoxGeo(1.6 - i * 0.14, 0.16, 0.5, 0.03, 3), i === 2 ? M.stoneDark : M.stone);
    const sx = -6.9 + i * 0.06, sz = -1.2 + i * 0.52;
    st.position.set(sx, groundH(sx, sz) + 0.06, sz);
    st.rotation.y = 0.28 + (r() - 0.5) * 0.06;
    st.rotation.z = (r() - 0.5) * 0.04;
    st.castShadow = true; st.receiveShadow = true; g.add(st);
  }
  addExclude(-6.8, -0.3, 1.4);

  // 矮石墙（几块堆叠）
  const wallX = -9.2, wallZ = -4.2;
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = wallX + t * 3.4, z = wallZ + Math.sin(t * 2.2) * 0.55;
    const y0 = groundH(x, z);
    const hh = 0.24 + r() * 0.34;
    const m = new T.Mesh(stoneChunk(0.6 + r() * 0.5, hh, 0.44 + r() * 0.2, 0.18, 800 + i), i % 3 ? M.stone : M.stoneDark);
    m.position.set(x, y0 + hh * 0.30, z);
    m.rotation.y = r() * TAU;
    m.rotation.z = (r() - 0.5) * 0.18;
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    if (i === 3 || i === 6) {
      const m2 = new T.Mesh(stoneChunk(0.5, 0.22, 0.4, 0.2, 850 + i), M.stone);
      m2.position.set(x + 0.05, y0 + hh * 0.75, z);
      m2.rotation.y = r() * TAU;
      m2.castShadow = true; g.add(m2);
    }
  }
  addExclude(-8.0, -4.0, 2.2);

  // 手水钵
  const bxz = [1.7, 9.0];
  const byg = groundH(bxz[0], bxz[1]);
  const basinOuter = new T.Mesh(new T.CylinderGeometry(0.46, 0.40, 0.42, 8, 1), M.stone);
  basinOuter.position.set(bxz[0], byg + 0.21, bxz[1]);
  basinOuter.castShadow = true; basinOuter.receiveShadow = true; g.add(basinOuter);
  const basinInner = new T.Mesh(new T.CylinderGeometry(0.36, 0.34, 0.34, 8, 1), new T.MeshStandardMaterial({ color: new T.Color('#6d5563'), roughness: 0.9 }));
  basinInner.position.set(bxz[0], byg + 0.27, bxz[1]);
  g.add(basinInner);
  addExclude(bxz[0], bxz[1], 0.9);

  return g;
}
buildings.add(buildRuins());

/* ========================================================= *
 *  D6. 崖边观景台（缘侧）
 * ========================================================= */
function buildDeck(px, pz, yaw) {
  const g = new T.Group();
  const W = 3.4, D = 2.3;
  const y0 = groundH(px, pz);
  const deckY = y0 + 0.52;

  // 甲板（横向板条）
  for (let i = 0; i < 8; i++) {
    const pl = new T.Mesh(roundedBoxGeo(W - 0.1, 0.09, D / 8 - 0.035, 0.012, 2), M.woodOld);
    pl.position.set(0, deckY, -D / 2 + (i + 0.5) * (D / 8));
    pl.castShadow = true; pl.receiveShadow = true;
    g.add(pl);
  }
  // 龙骨
  [-1, 1].forEach((sx) => {
    const j = new T.Mesh(roundedBoxGeo(0.14, 0.16, D, 0.02, 2), M.woodDark);
    j.position.set(sx * (W / 2 - 0.12), deckY - 0.12, 0);
    j.castShadow = true; g.add(j);
  });
  // 支柱（落到地面以下）
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const h = 1.5;
    const p = new T.Mesh(roundedBoxGeo(0.16, h, 0.16, 0.02, 2), M.wood);
    p.position.set(sx * (W / 2 - 0.16), deckY - h / 2 - 0.07, sz * (D / 2 - 0.16));
    p.castShadow = true; g.add(p);
  });
  // 栏杆（外侧 + 两侧）
  const railY = deckY + 0.82;
  const railGeo = roundedBoxGeo(W, 0.10, 0.10, 0.02, 2);
  const rail = new T.Mesh(railGeo, M.wood);
  rail.position.set(0, railY, -D / 2 + 0.08);
  rail.castShadow = true; g.add(rail);
  const rail2 = new T.Mesh(roundedBoxGeo(W, 0.07, 0.07, 0.015, 2), M.wood);
  rail2.position.set(0, railY - 0.34, -D / 2 + 0.08);
  g.add(rail2);
  for (let i = 0; i < 7; i++) {
    const post = new T.Mesh(roundedBoxGeo(0.055, 0.86, 0.055, 0.012, 2), M.wood);
    post.position.set(-W / 2 + 0.12 + i * ((W - 0.24) / 6), deckY + 0.44, -D / 2 + 0.08);
    post.castShadow = true; g.add(post);
  }
  [-1, 1].forEach((sx) => {
    const r2 = new T.Mesh(roundedBoxGeo(0.09, 0.09, D - 0.1, 0.018, 2), M.wood);
    r2.position.set(sx * (W / 2 - 0.06), railY, 0.02);
    r2.castShadow = true; g.add(r2);
    const post = new T.Mesh(roundedBoxGeo(0.11, 1.0, 0.11, 0.02, 2), M.wood);
    post.position.set(sx * (W / 2 - 0.06), deckY + 0.5, -D / 2 + 0.08);
    g.add(post);
  });

  // 边缘垂下的绳与木牌
  const ropePts = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    ropePts.push(new T.Vector3(W / 2 - 0.06, deckY + 0.05 - t * 0.45, -D / 2 + 0.1 + Math.sin(t * 3) * 0.04));
  }
  g.add(new T.Mesh(loftTube(ropePts, 0.02, 0.015, 5), M.paper));

  g.position.set(px, 0, pz);
  g.rotation.y = yaw;
  buildings.add(g);
  addExclude(px, pz, 2.2);
  return g;
}

/* ========================================================= *
 *  布点
 * ========================================================= */
const TORII = buildTorii(6.55, 8.05, 0.61, 1.0);
const SHRINE = buildShrine(-3.9, -7.8, 0.62);
const L1 = buildLantern(3.35, 3.55, 1.0, 0.4);
const L2 = buildLantern(-0.15, -2.4, 0.86, 2.3);
buildDeck(2.6, 13.15, 3.33);
scene.add(buildOutcrops());
