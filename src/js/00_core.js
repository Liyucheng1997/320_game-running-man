"use strict";
/* ============================================================
 * 核心：工具函数、渲染器、天空、昼夜
 * 坐标约定：x 向东，z 向南（北 = -z），y 向上，单位米
 * ============================================================ */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[(Math.random() * a.length) | 0];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hyp = Math.hypot;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* 城市用固定种子：每次打开都是同一座城 */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const WR = mulberry32(20060417);
const wr = (a = 0, b = 1) => a + WR() * (b - a);
const wpick = a => a[(WR() * a.length) | 0];

/* sRGB 十六进制 → 线性颜色（r128 不做自动色彩管理） */
const _colCache = new Map();
function LC(hex) { let c = _colCache.get(hex); if (!c) { c = new THREE.Color(hex).convertSRGBToLinear(); _colCache.set(hex, c); } return c; }

const IS_TOUCH = matchMedia('(pointer:coarse)').matches;
const LOWQ = IS_TOUCH || /Android|iPhone|iPad/i.test(navigator.userAgent);

/* ---------------- 渲染器 ---------------- */
const canvas = $('c3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOWQ, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOWQ ? 1.5 : 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE8B889, 70, 260);
const camera = new THREE.PerspectiveCamera(52, 1, 0.15, 900);
function onResize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', onResize); onResize();

/* 全局 uniform（风、水、时间） */
const U = { time: { value: 0 }, night: { value: 0 } };

/* ---------------- 灯光 ---------------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.castShadow = true;
sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
const SHC = sun.shadow.camera;
SHC.left = -46; SHC.right = 46; SHC.top = 46; SHC.bottom = -46; SHC.near = 1; SHC.far = 260;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const ambient = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambient);

/* ---------------- 天空 ---------------- */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
    stars: { value: 0 }, moon: { value: 0 }, time: U.time, cloudCol: { value: new THREE.Color() }
  },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    uniform vec3 top, hor, bot, sunCol, cloudCol; uniform vec3 sunDir; uniform float stars, moon, time; varying vec3 vD;
    float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
    float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
    float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n2(p); p*=2.03; a*=.5; } return s; }
    void main(){
      vec3 d = normalize(vD); float h = d.y;
      vec3 c = h > 0. ? mix(hor, top, pow(clamp(h,0.,1.), .55)) : mix(hor, bot, clamp(-h*3.,0.,1.));
      float sd = max(dot(d, normalize(sunDir)), 0.);
      c += sunCol * (pow(sd, 6.) * .35 + pow(sd, 60.) * .6) * (1. - moon*.7);
      c += sunCol * smoothstep(.9975, .9985, sd) * (1.2 - moon*.4);
      // 云
      if (h > 0.) {
        vec2 uv = d.xz / (h + .18) * 1.6 + vec2(time*.004, time*.002);
        float cl = smoothstep(.52, .85, fbm(uv)) * smoothstep(0., .25, h) * (1. - smoothstep(.5, .9, h));
        vec3 cc = mix(cloudCol, sunCol, pow(sd,3.)*.6);
        c = mix(c, cc, cl * .75);
        // 星
        vec2 sp = floor(d.xz / (h + .6) * 180.);
        float st = step(.9965, h21(sp)) * smoothstep(.05, .4, h) * stars * (1. - cl);
        c += vec3(st) * (.6 + .4 * sin(time*3. + h21(sp+3.)*40.));
      }
      gl_FragColor = vec4(c, 1.);
    }`
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), skyMat);
sky.renderOrder = -10; sky.frustumCulled = false;
scene.add(sky);

/* ---------------- 昼夜关键帧 ----------------
 * tod: 0=17:00 金色黄昏 → 1=21:30 入夜
 */
const TOD_KEYS = [
  { t: 0.00, top: '#5E93D6', hor: '#F7CD96', bot: '#8a7a64', sun: '#FFD7A0', si: 2.6, hs: '#FFE8C8', hg: '#7E6A50', hi: .95, el: 22, lamp: .15, win: 0, cloud: '#FFF0DA', exp: 1.0, stars: 0, moon: 0 },
  { t: 0.30, top: '#4F74BA', hor: '#F4AE70', bot: '#7a6450', sun: '#FFB878', si: 2.2, hs: '#FAD2A8', hg: '#6E5A48', hi: .9, el: 12, lamp: .4, win: .2, cloud: '#F9D3B0', exp: 1.0, stars: 0, moon: 0 },
  { t: 0.55, top: '#33427E', hor: '#E08A68', bot: '#5a4450', sun: '#FF9060', si: 1.5, hs: '#C4A0B0', hg: '#40343E', hi: .62, el: 4, lamp: 1.2, win: .8, cloud: '#D98A7A', exp: 1.08, stars: .15, moon: 0 },
  { t: 0.75, top: '#18234E', hor: '#5E5080', bot: '#2a2438', sun: '#A8BCFF', si: .6, hs: '#7C88BE', hg: '#2A2436', hi: .5, el: 28, lamp: 2.2, win: 1.4, cloud: '#46406A', exp: 1.12, stars: .8, moon: 1 },
  { t: 1.00, top: '#0C1334', hor: '#343C6C', bot: '#1a1828', sun: '#A8BCFF', si: .5, hs: '#66749E', hg: '#221E2C', hi: .44, el: 38, lamp: 2.6, win: 1.6, cloud: '#2E3050', exp: 1.15, stars: 1, moon: 1 },
];
const TOD = { t: 0, target: 0, lamp: 0, win: 0, blackout: 0 };
const _ca = new THREE.Color(), _cb = new THREE.Color();
function mixHex(a, b, t, out) { _ca.set(a); _cb.set(b); return out.copy(_ca).lerp(_cb, t); }
const SUN_AZ = -0.62; // 太阳从西南方照来
function applyTOD() {
  const t = TOD.t; let i = 0;
  while (i < TOD_KEYS.length - 2 && t > TOD_KEYS[i + 1].t) i++;
  const A = TOD_KEYS[i], B = TOD_KEYS[i + 1], k = smooth(clamp((t - A.t) / (B.t - A.t), 0, 1));
  const L = (f) => lerp(A[f], B[f], k);
  mixHex(A.top, B.top, k, skyMat.uniforms.top.value);
  mixHex(A.hor, B.hor, k, skyMat.uniforms.hor.value);
  mixHex(A.bot, B.bot, k, skyMat.uniforms.bot.value);
  mixHex(A.sun, B.sun, k, skyMat.uniforms.sunCol.value);
  mixHex(A.cloud, B.cloud, k, skyMat.uniforms.cloudCol.value);
  skyMat.uniforms.stars.value = L('stars');
  skyMat.uniforms.moon.value = L('moon');
  const bo = TOD.blackout;
  // 雾色 = 地平线色（转线性）
  const fogC = new THREE.Color().copy(skyMat.uniforms.hor.value).lerp(skyMat.uniforms.bot.value, .25).convertSRGBToLinear();
  scene.fog.color.copy(fogC).multiplyScalar(1 - bo * .85);
  const night = clamp((t - .45) / .4, 0, 1);
  scene.fog.near = lerp(70, 40, night); scene.fog.far = lerp(260, 170, night);
  const el = L('el') * Math.PI / 180;
  const dir = new THREE.Vector3(Math.cos(el) * Math.sin(SUN_AZ), Math.sin(el), Math.cos(el) * Math.cos(SUN_AZ));
  skyMat.uniforms.sunDir.value.copy(dir);
  sun.userData.dir = dir;
  sun.color.copy(new THREE.Color(A.sun).lerp(new THREE.Color(B.sun), k)).convertSRGBToLinear();
  sun.intensity = L('si') * (1 - bo * .97);
  hemi.color.set(A.hs).lerp(_cb.set(B.hs), k).convertSRGBToLinear();
  hemi.groundColor.set(A.hg).lerp(_cb.set(B.hg), k).convertSRGBToLinear();
  hemi.intensity = L('hi') * (1 - bo * .9);
  ambient.intensity = .14 * (1 - bo);
  renderer.toneMappingExposure = L('exp') * (1 - bo * .35);
  TOD.lamp = L('lamp') * (1 - bo);
  TOD.win = L('win') * (1 - bo);
  U.night.value = night;
}
function clockText() {
  const mins = 17 * 60 + Math.round(TOD.t * 270);
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
