/* =========================================================================
   空の島 · SAKURA SKY ISLAND
   A hand-built three.js scene — procedural geometry only, no external assets.
   ========================================================================= */
(function () {
"use strict";
const T = THREE;

/* ------------------------------------------------------------------ *
 *  0. 基础：随机、噪声、数学
 * ------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let RNG = mulberry32(20260401);
const rnd = (a = 0, b = 1) => a + (b - a) * RNG();
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(RNG() * a.length) % a.length];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;

function hash2(x, y, s) {
  s = s || 0;
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
function fbm(x, y, oct, s) {
  oct = oct || 4; s = s || 0;
  let val = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { val += amp * vnoise(x * f, y * f, s + i * 37); norm += amp; f *= 2.03; amp *= 0.5; }
  return val / norm;
}

/* ------------------------------------------------------------------ *
 *  1. 色板 —— 樱花 / 和风
 * ------------------------------------------------------------------ */
const PAL = {
  groundBase: '#eec3d3',
  groundShades: ['#fceaf1', '#f7d7e3', '#eec3d3', '#e2aec1', '#d5a0b3', '#fae1ea'],
  grass: '#ad6786',
  grassHi: '#a05a7c',
  flower: '#fff4f7',
  blossom: '#ffbcd3',
  blossomAlt: '#ffd2e0',
  wood: '#4b3139',
  woodHi: '#5d3c45',
  stone: '#e2cdd4',
  stoneDk: '#c2a6b1',
  rock: '#b08a9b',
  roof: '#3a2a33',
  paper: '#f4e8dc',
  lantern: '#ffd9a8',
};

/* ------------------------------------------------------------------ *
 *  2. 程序化贴图
 * ------------------------------------------------------------------ */
function cv(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function toTex(canvas, opt) {
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  if (opt && opt.repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; }
  else { t.wrapS = t.wrapT = T.ClampToEdgeWrapping; }
  t.needsUpdate = true;
  return t;
}

/* --- 2.1 厚涂草地：单一色系、纯色色块笔触 --- */
function makeGroundTexture(size) {
  size = size || 1536;
  const c = cv(size), g = c.getContext('2d');
  g.fillStyle = PAL.groundBase; g.fillRect(0, 0, size, size);

  const blob = (cx, cy, r, col, alpha, wob) => {
    const n = 13;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r * (1 - wob * 0.5 + RNG() * wob);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (0.75 + RNG() * 0.5)]);
    }
    g.beginPath();
    g.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    g.closePath();
    g.globalAlpha = alpha;
    g.fillStyle = col;
    g.fill();
    g.globalAlpha = 1;
  };

  const S = PAL.groundShades;
  // 大色块（柔边）—— 铺底
  try { g.filter = 'blur(16px)'; } catch (e) {}
  for (let i = 0; i < 22; i++) blob(rnd(0, size), rnd(0, size), rnd(size * 0.13, size * 0.30), S[rndi(0, 5)], rnd(0.7, 1.0), 0.5);
  // 中色块（微柔）
  try { g.filter = 'blur(2px)'; } catch (e) {}
  for (let i = 0; i < 150; i++) blob(rnd(0, size), rnd(0, size), rnd(size * 0.05, size * 0.18), S[rndi(0, 5)], rnd(0.85, 1.0), 0.55);
  try { g.filter = 'none'; } catch (e) {}
  // 硬边笔触（厚涂感）
  for (let i = 0; i < 520; i++) {
    const x = rnd(0, size), y = rnd(0, size);
    const r = rnd(size * 0.006, size * 0.028);
    g.save(); g.translate(x, y); g.rotate(rnd(0, TAU));
    g.globalAlpha = rnd(0.22, 0.62);
    g.fillStyle = S[rndi(0, 5)];
    g.beginPath(); g.ellipse(0, 0, r * rnd(0.7, 2.2), r * rnd(0.25, 0.7), 0, 0, TAU); g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
  return c;
}

/* --- 2.2 樱花团簇（镂空 alpha，整体球形法线用） --- */
function blossomBlossom(g, x, y, r, rot, val) {
  g.save();
  g.translate(x, y); g.rotate(rot);
  g.fillStyle = 'rgb(' + val + ',' + val + ',' + val + ')';
  for (let p = 0; p < 5; p++) {
    g.save(); g.rotate((p / 5) * TAU);
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(-r * 0.62, -r * 0.35, -r * 0.44, -r * 1.02, 0, -r * 0.96);
    g.bezierCurveTo(r * 0.44, -r * 1.02, r * 0.62, -r * 0.35, 0, 0);
    g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, r * 0.19, 0, TAU); g.fill();
  g.restore();
}
function makeBlossomTexture(size) {
  size = size || 512;
  const c = cv(size), g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  // 主体：致密重叠，形成花团
  for (let i = 0; i < 150; i++) {
    const a = RNG() * TAU, rr = Math.pow(RNG(), 0.42) * size * 0.315;
    const x = size / 2 + Math.cos(a) * rr, y = size / 2 + Math.sin(a) * rr;
    const s = size * (0.032 + RNG() * 0.022);
    const v = Math.round(206 + RNG() * 49);
    blossomBlossom(g, x, y, s, RNG() * TAU, v);
  }
  // 外缘破碎的散花，打断圆形轮廓
  for (let i = 0; i < 26; i++) {
    const a = RNG() * TAU, rr = size * (0.335 + RNG() * 0.08);
    const x = size / 2 + Math.cos(a) * rr, y = size / 2 + Math.sin(a) * rr;
    blossomBlossom(g, x, y, size * (0.016 + RNG() * 0.020), RNG() * TAU, Math.round(212 + RNG() * 43));
  }
  return toTex(c);
}

/* --- 2.3 单花瓣（飘落用） --- */
function makePetalTexture(size) {
  size = size || 128;
  const c = cv(size), g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  g.translate(size / 2, size * 0.56);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(0, size * 0.36);
  g.bezierCurveTo(-size * 0.40, size * 0.14, -size * 0.34, -size * 0.30, -size * 0.09, -size * 0.34);
  g.quadraticCurveTo(0, -size * 0.22, size * 0.09, -size * 0.34);
  g.bezierCurveTo(size * 0.34, -size * 0.30, size * 0.40, size * 0.14, 0, size * 0.36);
  g.fill();
  return toTex(c);
}

/* --- 2.4 云 --- */
function makeCloudTexture(size) {
  size = size || 512;
  const c = cv(size), g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  const puff = (x, y, r, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    gr.addColorStop(0.42, 'rgba(255,255,255,' + a * 0.72 + ')');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  };
  for (let i = 0; i < 30; i++) {
    const t = RNG();
    const x = size * (0.18 + t * 0.64) + rnd(-0.05, 0.05) * size;
    const y = size * (0.56 - Math.sin(t * Math.PI) * 0.16) + rnd(-0.05, 0.05) * size;
    puff(x, y, size * rnd(0.06, 0.16), rnd(0.18, 0.44));
  }
  for (let i = 0; i < 12; i++) puff(size * rnd(0.25, 0.75), size * rnd(0.58, 0.72), size * rnd(0.08, 0.2), rnd(0.16, 0.3));
  return toTex(c);
}

/* --- 2.5 柔光点 --- */
function makeGlowTexture(size) {
  size = size || 128;
  const c = cv(size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.16)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return toTex(c);
}

/* --- 2.6 石材 / 木纹（极淡，只为破掉塑料感） --- */
function makeNoiseTexture(size, base, amp, streak) {
  size = size || 256;
  const c = cv(size), g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const bc = new T.Color(base);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.06, y * (streak ? 0.012 : 0.06), 3, 7) - 0.5;
      const k = 1 + n * amp;
      const i = (y * size + x) * 4;
      img.data[i] = clamp(bc.r * 255 * k, 0, 255);
      img.data[i + 1] = clamp(bc.g * 255 * k, 0, 255);
      img.data[i + 2] = clamp(bc.b * 255 * k, 0, 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

/* --- 2.7 月面（月海 + 环形山） --- */
function makeMoonTexture(size) {
  size = size || 1024;
  const c = cv(size), g = c.getContext('2d');
  g.fillStyle = '#efece7'; g.fillRect(0, 0, size, size);
  // 表面细噪
  for (let i = 0; i < 2600; i++) {
    const x = RNG() * size, y = RNG() * size, r = size * (0.001 + RNG() * 0.006);
    const v = RNG() > 0.5 ? 255 : 205;
    g.fillStyle = 'rgba(' + v + ',' + v + ',' + (v - 4) + ',' + (0.03 + RNG() * 0.07) + ')';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // 月海
  for (let i = 0; i < 8; i++) {
    const x = size * (0.18 + RNG() * 0.64), y = size * (0.18 + RNG() * 0.64);
    const r = size * (0.07 + RNG() * 0.13);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(150,148,152,0.55)');
    gr.addColorStop(0.55, 'rgba(165,162,166,0.34)');
    gr.addColorStop(1, 'rgba(170,168,170,0)');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  // 环形山
  for (let i = 0; i < 120; i++) {
    const a = RNG() * TAU, rr = Math.sqrt(RNG()) * size * 0.46;
    const x = size / 2 + Math.cos(a) * rr, y = size / 2 + Math.sin(a) * rr;
    const r = size * (0.004 + RNG() * 0.018);
    const gj = g.createRadialGradient(x, y, r * 0.5, x, y, r * 2.1);
    gj.addColorStop(0, 'rgba(255,255,255,0.13)');
    gj.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gj; g.beginPath(); g.arc(x, y, r * 2.1, 0, TAU); g.fill();
    const gc = g.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
    gc.addColorStop(0, 'rgba(118,116,120,0.5)');
    gc.addColorStop(0.72, 'rgba(150,148,150,0.3)');
    gc.addColorStop(1, 'rgba(196,194,196,0)');
    g.fillStyle = gc; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  return toTex(c);
}

/* --- 2.8 木牌（神额） --- */
function makeKanjiTexture(text, w, h) {
  w = w || 256; h = h || 128;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#d9c6bc'; g.fillRect(0, 0, w, h);
  // 木纹
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = 'rgba(120,92,86,' + (0.05 + RNG() * 0.12) + ')';
    g.lineWidth = 0.6 + RNG() * 1.6;
    g.beginPath();
    const y = RNG() * h;
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + rnd(-6, 6), w * 0.7, y + rnd(-6, 6), w, y + rnd(-4, 4));
    g.stroke();
  }
  // 边框
  g.strokeStyle = 'rgba(70,48,48,0.85)'; g.lineWidth = Math.max(2, h * 0.045);
  g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  // 文字
  g.fillStyle = 'rgba(46,26,30,0.92)';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.round(h * 0.56);
  g.font = '600 ' + fs + 'px "Songti SC","Noto Serif SC",serif';
  g.fillText(text, w / 2, h / 2 + fs * 0.03);
  return toTex(c);
}

/* --- 2.9 做旧木纹（竖向纹理 + 结疤 + 风化斑） --- */
function makeWoodGrain(size) {
  size = size || 512;
  const c = cv(size), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
  // 竖向木纤维
  for (let i = 0; i < 900; i++) {
    const x = RNG() * size;
    const w = 0.6 + RNG() * 2.6;
    const dark = RNG() > 0.55;
    g.fillStyle = dark ? 'rgba(90,70,62,' + (0.05 + RNG() * 0.17) + ')' : 'rgba(255,255,255,' + (0.06 + RNG() * 0.2) + ')';
    g.fillRect(x, 0, w, size);
  }
  // 长条裂纹
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = 'rgba(58,42,38,' + (0.10 + RNG() * 0.24) + ')';
    g.lineWidth = 0.7 + RNG() * 1.7;
    const x = RNG() * size;
    g.beginPath();
    g.moveTo(x, 0);
    let cx = x;
    for (let y = 0; y < size; y += size / 8) {
      cx += (RNG() - 0.5) * size * 0.02;
      g.lineTo(cx, y);
    }
    g.stroke();
  }
  // 结疤
  for (let i = 0; i < 5; i++) {
    const x = RNG() * size, y = RNG() * size, r = size * (0.008 + RNG() * 0.016);
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = 'rgba(72,52,46,' + (0.22 - k * 0.03) + ')';
      g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(x, y, r * (1 + k * 0.55), r * (1.6 + k * 0.8), 0, 0, TAU); g.stroke();
    }
  }
  // 风化斑
  for (let i = 0; i < 20; i++) {
    const x = RNG() * size, y = RNG() * size, r = size * (0.03 + RNG() * 0.09);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(140,120,110,' + (0.10 + RNG() * 0.16) + ')');
    gr.addColorStop(1, 'rgba(140,120,110,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/* --- 2.10 做旧石纹（斑点 + 裂纹 + 水渍） --- */
function makeStoneGrain(size) {
  size = size || 512;
  const c = cv(size), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 5200; i++) {
    const x = RNG() * size, y = RNG() * size, r = 0.5 + RNG() * 2.1;
    const v = RNG() > 0.5 ? 255 : 150;
    g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.05 + RNG() * 0.18) + ')';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 16; i++) {
    const x = RNG() * size, y = RNG() * size, r = size * (0.05 + RNG() * 0.12);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(120,108,104,' + (0.06 + RNG() * 0.12) + ')');
    gr.addColorStop(1, 'rgba(120,108,104,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  for (let i = 0; i < 14; i++) {
    g.strokeStyle = 'rgba(70,58,56,' + (0.14 + RNG() * 0.26) + ')';
    g.lineWidth = 0.7 + RNG() * 1.4;
    let x = RNG() * size, y = RNG() * size;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (RNG() - 0.5) * size * 0.16;
      y += (RNG() - 0.5) * size * 0.16;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const TEX = {};
TEX.groundCanvas = makeGroundTexture(1536);
TEX.ground = toTex(TEX.groundCanvas);
TEX.blossom = makeBlossomTexture(512);
TEX.petal = makePetalTexture(128);
TEX.cloud = makeCloudTexture(512);
TEX.glow = makeGlowTexture(128);
TEX.wood = makeNoiseTexture(256, '#ffffff', 0.30, true);
TEX.stone = makeNoiseTexture(256, '#ffffff', 0.16, false);
TEX.moon = makeMoonTexture(1024);
TEX.woodGrain = makeWoodGrain(512);
TEX.stoneGrain = makeStoneGrain(512);
TEX.kanjiTorii = makeKanjiTexture('空 島', 256, 128);

/* ------------------------------------------------------------------ *
 *  3. 渲染器 / 场景 / 相机
 * ------------------------------------------------------------------ */
const app = document.getElementById('app');
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new T.Scene();
scene.fog = new T.FogExp2(0xffe9f0, 0.0034);

const camera = new T.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.5, 1200);

/* ------------------------------------------------------------------ *
 *  4. 天空穹顶：渐变 + 奔流云层 + 常驻星 + 月
 * ------------------------------------------------------------------ */
const MOON_DIR = new T.Vector3(-0.6466, 0.2419, -0.7234).normalize();   // 仰角约 14°

const skyUniforms = {
  uTop: { value: new T.Color('#1f93e2') },
  uMid: { value: new T.Color('#6cc2f2') },
  uHor: { value: new T.Color('#ffcfe0') },
  uMoon: { value: new T.Color('#fff6e2') },
  uMoonDir: { value: MOON_DIR.clone() },
  uStar: { value: 0.35 },
  uGlow: { value: 0.5 },
  uTime: { value: 0 },
  uCloud: { value: 0.55 },
  uCloudSpeed: { value: 0.05 },
  uCloudA: { value: new T.Color('#ffffff') },
  uCloudB: { value: new T.Color('#c9a8bc') },
  uSkyWind: { value: 0.6 },
};
const skyMat = new T.ShaderMaterial({
  uniforms: skyUniforms,
  side: T.BackSide,
  depthWrite: false,
  fog: false,
  vertexShader: `
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }`,
  fragmentShader: `
    uniform vec3 uTop,uMid,uHor,uMoon,uMoonDir,uCloudA,uCloudB;
    uniform float uStar,uGlow,uTime,uCloud,uCloudSpeed,uSkyWind;
    varying vec3 vDir;

    float hash21(vec2 p){
      p = fract(p*vec2(123.34,456.21));
      p += dot(p, p+45.32);
      return fract(p.x*p.y);
    }
    float vnoise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      float a = hash21(i), b = hash21(i+vec2(1.0,0.0));
      float c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));
      return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    }
    float fbm5(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<5;i++){ v += a*vnoise(p); p = p*2.03 + 7.1; a *= 0.5; }
      return v;
    }
    float fbm4(vec2 p){
      float v = 0.0, a = 0.5;
      for(int i=0;i<4;i++){ v += a*vnoise(p); p = p*2.07 - 3.3; a *= 0.5; }
      return v;
    }
    float h31(vec3 p){
      return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);
    }

    void main(){
      vec3 d = normalize(vDir);
      float y = clamp(d.y*0.5+0.5, 0.0, 1.0);

      /* --- 基础渐变 --- */
      vec3 col = mix(uHor, uMid, smoothstep(0.448,0.512,y));
      col = mix(col, uTop, smoothstep(0.498,0.680,y));
      col = mix(col*0.55, col, smoothstep(0.40,0.505,y));

      /* --- 星：恒在，随时间闪烁 --- */
      if(uStar > 0.002){
        vec3 q = floor(d*430.0);
        float sd = h31(q);
        float tw = 0.35 + 0.65*abs(sin(uTime*1.9 + sd*97.0));
        float star = smoothstep(0.9958, 1.0, sd) * tw;
        float big = smoothstep(0.9993, 1.0, sd) * (0.6 + 0.4*sin(uTime*3.1 + sd*40.0));
        col += vec3(0.88,0.92,1.0) * (star*1.0 + big*1.6) * uStar * smoothstep(0.47,0.60,y);
      }

      /* --- 云海：两层流动噪声，风向驱动，快速流转 --- */
      vec2 wdir = vec2(cos(uSkyWind), sin(uSkyWind));
      vec2 flow = wdir * uTime * uCloudSpeed;
      vec2 sp = d.xz * (1.9 / (d.y + 0.42));

      // 大团块 + 拉丝 + 碎云，三层叠出奔涌感
      float warp = fbm4(sp*0.50 + flow*0.5 + 3.7);
      vec2 q1 = sp*0.72 + flow + vec2(warp*0.70, warp*0.45);
      float base = fbm5(q1);
      float detail = fbm4(q1*3.4 + 11.3 + flow*1.1);
      vec2 stq = sp*vec2(0.40, 1.9) + flow*1.8;
      float streak = fbm4(stq*1.7 + 5.1);

      float dsum = base*0.74 + detail*0.34 + streak*0.16;
      float dens = smoothstep(0.42, 0.63, dsum);
      dens *= 0.72 + 0.42*streak;
      float hfade = smoothstep(-0.03, 0.09, d.y);
      float thin = smoothstep(0.30, 0.85, d.y);   // 高处云更薄透

      vec3 cloudCol = mix(uCloudB, uCloudA, smoothstep(0.38, 0.78, dsum));
      cloudCol *= mix(1.0, 0.86, thin);
      // 月光在云缘的银边
      float md0 = max(dot(d, normalize(uMoonDir)), 0.0);
      cloudCol += uMoon * pow(md0, 18.0) * 0.55;
      col = mix(col, cloudCol, clamp(dens * uCloud, 0.0, 1.0) * hfade);

      /* --- 月晕 --- */
      float md = max(dot(d, normalize(uMoonDir)), 0.0);
      col += uMoon * pow(md, 340.0) * 0.55 * uGlow;
      col += uMoon * pow(md, 14.0) * 0.10 * uGlow;

      col += (fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-0.5)/255.0;
      gl_FragColor = vec4(col,1.0);
    }`,
});
const sky = new T.Mesh(new T.SphereGeometry(560, 48, 32), skyMat);
sky.frustumCulled = false;
sky.renderOrder = -1000;
scene.add(sky);

/* --- 月：带环形山与球面衰减的实心天体 --- */
const moonUniforms = {
  uMap: { value: TEX.moon },
  uColor: { value: new T.Color('#fff6e2') },
};
const moonMat = new T.ShaderMaterial({
  uniforms: moonUniforms,
  fog: false,
  vertexShader: `
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vUv = uv;
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform vec3 uColor;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      vec3 t = texture2D(uMap, vUv).rgb;
      float limb = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 0.45);
      vec3 col = t * uColor * mix(0.26, 1.08, limb);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const moon = new T.Mesh(new T.SphereGeometry(18, 56, 36), moonMat);
moon.position.copy(MOON_DIR).multiplyScalar(470);
moon.renderOrder = -900;
moon.frustumCulled = false;
scene.add(moon);

const moonHalo = new T.Sprite(new T.SpriteMaterial({
  map: TEX.glow, color: 0xffe9c8, transparent: true, opacity: 0.42,
  blending: T.AdditiveBlending, depthWrite: false, fog: false,
}));
moonHalo.scale.set(210, 210, 1);
moonHalo.position.copy(moon.position);
moonHalo.renderOrder = -880;
scene.add(moonHalo);

/* 云海在 E 段构建（需要独立的贴图实例） */

/* ------------------------------------------------------------------ *
 *  5. 光照：均匀光 + 一道直射光束
 * ------------------------------------------------------------------ */
const hemi = new T.HemisphereLight(0xdff0ff, 0xffd3e2, 0.95);
scene.add(hemi);

const sun = new T.DirectionalLight(0xfff3e4, 2.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 230;
sun.shadow.camera.left = -52; sun.shadow.camera.right = 52;
sun.shadow.camera.top = 52; sun.shadow.camera.bottom = -52;
sun.shadow.bias = -0.0007;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 2.2;
scene.add(sun);
scene.add(sun.target);

const SUN_DIR = new T.Vector3(-0.46, 0.74, -0.49).normalize();

/* 月光边光：从月亮方向来的弱冷光，让月亮的方位在物体上可读 */
const moonRim = new T.DirectionalLight(0xd4e2ff, 0.22);
moonRim.position.copy(MOON_DIR).multiplyScalar(90);
moonRim.castShadow = false;
scene.add(moonRim);

/* --- 5.1 月光柱：原来的体积光圆锥，只是起点改到月亮 --- */
const BEAM_LEN = 470;
const beamGeo = new T.CylinderGeometry(1.3, 4.6, BEAM_LEN, 48, 1, true);
beamGeo.translate(0, BEAM_LEN * 0.5, 0);      // 底端在岛心
const beamUniforms = {
  uTime: { value: 0 },
  uInt: { value: 0.42 },
  uColor: { value: new T.Color('#ffe6c8') },
};
const beamMat = new T.ShaderMaterial({
  uniforms: beamUniforms,
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
    uniform float uTime,uInt; uniform vec3 uColor;
    varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){
      float ndv = abs(dot(normalize(vN), normalize(vV)));
      float body = pow(ndv, 0.85) * 1.2;
      float vfade = smoothstep(0.0, 0.02, vUv.y) * (1.0 - smoothstep(0.50, 0.95, vUv.y));
      float n1 = 0.78 + 0.22 * sin(vUv.x * 34.0 + uTime * 0.55) * sin(vUv.y * 38.0 - uTime * 0.30);
      float n2 = 0.86 + 0.14 * sin(vUv.x * 11.0 - uTime * 0.22 + 2.1);
      float a = body * vfade * n1 * n2 * uInt;
      gl_FragColor = vec4(uColor, a);
    }`,
});
const beam = new T.Mesh(beamGeo, beamMat);
beam.frustumCulled = false;
beam.renderOrder = 3;
scene.add(beam);
const _beamX = new T.Vector3(), _beamY = new T.Vector3(), _beamZ = new T.Vector3(), _toCam = new T.Vector3();
function updateBeamOrientation() {
  // 圆锥本身有体积，只需对齐月光方向
  beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), MOON_DIR);
  beam.position.set(0, 0, 0);
}

/* 地面光斑 */
const beamPool = new T.Sprite(new T.SpriteMaterial({
  map: TEX.glow, color: 0xffe3c2, transparent: true, opacity: 0.55,
  blending: T.AdditiveBlending, depthWrite: false, depthTest: true,
}));
beamPool.scale.set(13, 13, 1);
beamPool.renderOrder = 2;
scene.add(beamPool);

/* 光柱中的尘埃 */
function makeMotes(count, color, size, spread, yRange) {
  const g = new T.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = RNG() * TAU, r = Math.sqrt(RNG()) * spread;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = yRange[0] + RNG() * (yRange[1] - yRange[0]);
    pos[i * 3 + 2] = Math.sin(a) * r;
    seed[i] = RNG();
  }
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new T.BufferAttribute(seed, 1));
  const m = new T.PointsMaterial({
    size: size, map: TEX.glow, color: color, transparent: true, opacity: 0.75,
    blending: T.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false,
  });
  const p = new T.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* ------------------------------------------------------------------ *
 *  6. 风：给材质注入顶点摆动
 * ------------------------------------------------------------------ */
const windState = { target: 0.26, cur: 0.26, dirAngle: 0.6, dir: new T.Vector2(1, 0) };
const sharedUniforms = {
  uTime: { value: 0 },
  uWind: { value: 0.26 },
  uWindDir: { value: new T.Vector2(1, 0) },
};

/* 6.1 草：InstancedMesh，每实例带 aRot / aPhase */
function windifyGrass(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = sharedUniforms.uTime;
    sh.uniforms.uWind = sharedUniforms.uWind;
    sh.uniforms.uWindDir = sharedUniforms.uWindDir;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uWind; uniform vec2 uWindDir;
        attribute float aRot; attribute float aPhase;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 ipos = instanceMatrix[3].xyz;
          #else
            vec3 ipos = vec3(0.0);
          #endif
          float c = cos(aRot), s = sin(aRot);
          vec2 wd = normalize(uWindDir + vec2(1e-5));
          vec2 ld = vec2(wd.x*c - wd.y*s, wd.x*s + wd.y*c);
          float hgt = clamp(transformed.y, 0.0, 2.4);
          float bendw = pow(hgt, 1.75);
          float gust = 0.55 + 0.45*sin(uTime*0.75 + dot(ipos.xz, vec2(0.19,0.13)));
          float sway = 0.5 + 0.5*sin(uTime*2.15 + aPhase + dot(ipos.xz, vec2(0.55,0.42)));
          float amp = (0.06 + 0.62*uWind) * gust * (0.45 + 0.55*sway) * bendw;
          transformed.xz += ld * amp;
          transformed.y -= amp*amp*0.55;
          transformed.x += sin(uTime*5.2 + aPhase*2.3) * 0.012 * hgt * (0.3 + uWind);
          transformed.z += cos(uTime*4.6 + aPhase*1.7) * 0.010 * hgt * (0.3 + uWind);
        }`);
    sh.fragmentShader = sh.fragmentShader.replace(
      'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;',
      'float faceDirection = 1.0;'
    );
  };
  mat.customProgramCacheKey = () => 'grasswind';
}

/* 6.2 叶团 / 花：静态合并网格，用 aSway 权重 */
function windifyFoliage(mat, ampScale) {
  ampScale = ampScale || 1;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = sharedUniforms.uTime;
    sh.uniforms.uWind = sharedUniforms.uWind;
    sh.uniforms.uWindDir = sharedUniforms.uWindDir;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float uWind; uniform vec2 uWindDir;
        attribute float aSway; attribute float aPhase;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          float k = ${(1.15 * ampScale).toFixed(3)};
          float sway = sin(uTime*1.55 + aPhase) * 0.5 + 0.5;
          float gust = 0.55 + 0.45*sin(uTime*0.62 + aPhase*0.35);
          float amp = (0.06 + 1.15*uWind) * aSway * k * (0.28 + 0.72*sway) * gust;
          transformed.x += uWindDir.x * amp;
          transformed.z += uWindDir.y * amp;
          transformed.y -= abs(amp) * 0.16;
          float fl = 0.055 * uWind * aSway;
          transformed.x += sin(uTime*3.9 + aPhase*2.3) * fl;
          transformed.z += cos(uTime*3.3 + aPhase*1.7) * fl;
        }`);
    sh.fragmentShader = sh.fragmentShader.replace(
      'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;',
      'float faceDirection = 1.0;'
    );
  };
  mat.customProgramCacheKey = () => 'foliagewind' + ampScale;
}

/* 便捷构建 */
function matStd(o) { return new T.MeshStandardMaterial(o); }
function shadowOn(o, cast, recv) { o.castShadow = cast !== false; o.receiveShadow = recv !== false; return o; }
