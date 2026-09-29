/* ============================================================
 * 程序化贴图：全部用 canvas 现场绘制，无外部图片
 * ============================================================ */
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = MAX_ANISO;
  return t;
}
function noise(g, w, h, amt) {
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
}
const FONT_BRUSH = '"Ma Shan Zheng","STXingkai","KaiTi","STKaiti",serif';
const FONT_SERIF = '"Noto Serif SC","Songti SC","STSong",SimSun,serif';

/* 青石板 */
function texPaving() {
  const S = 512; const [c, g] = mkCanvas(S, S); const [b, bg] = mkCanvas(S, S);
  g.fillStyle = '#34373c'; g.fillRect(0, 0, S, S); bg.fillStyle = '#202020'; bg.fillRect(0, 0, S, S);
  const slab = (x, y, w, h) => {
    const hue = 200 + Math.random() * 30, s = 4 + Math.random() * 9, l = 38 + Math.random() * 17;
    g.fillStyle = `hsl(${hue},${s}%,${l}%)`; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.1)');
    g.fillStyle = gr; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    for (let k = 0; k < 5; k++) {
      g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${.03 + Math.random() * .05})`;
      g.beginPath(); g.ellipse(x + Math.random() * w, y + Math.random() * h, 6 + Math.random() * 22, 4 + Math.random() * 12, Math.random() * 3, 0, 7); g.fill();
    }
    if (Math.random() < .18) { g.strokeStyle = 'rgba(20,20,20,.35)'; g.lineWidth = 1; g.beginPath(); let px = x + Math.random() * w, py = y + 3; g.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (Math.random() - .5) * 18; py += h / 5; g.lineTo(px, Math.min(py, y + h - 3)); } g.stroke(); }
    const v = 150 + Math.random() * 80 | 0; bg.fillStyle = `rgb(${v},${v},${v})`; bg.fillRect(x + 3, y + 3, w - 6, h - 6);
  };
  let y = 0;
  while (y < S) {
    let h = 46 + Math.random() * 40 | 0; if (S - y - h < 40) h = S - y;
    let tot = 0; const ws = [];
    while (tot < S) { let w = 70 + Math.random() * 90 | 0; if (S - tot - w < 60) w = S - tot; ws.push(w); tot += w; }
    let x = Math.random() * S;
    for (const w of ws) { slab(x, y, w, h); slab(x - S, y, w, h); x += w; }
    y += h;
  }
  noise(g, S, S, 14);
  // 苔
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(80,110,50,${.08 + Math.random() * .12})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 3, 2 + Math.random() * 3); }
  return { map: toTex(c), bump: toTex(b, { srgb: false }) };
}
/* 瓦 */
function texTile() {
  const S = 256; const [c, g] = mkCanvas(S, S); const [b, bg] = mkCanvas(S, S);
  const id = g.createImageData(S, S), bd = bg.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const col = (x % 32) / 32, row = (y % 32) / 32;
    const ridge = Math.pow(.5 + .5 * Math.cos(col * Math.PI * 2), 1.6);
    const course = row < .12 ? .45 + row * 3 : 1;
    const v = (0.35 + ridge * .55) * course;
    const i = (y * S + x) * 4;
    id.data[i] = 42 + v * 52; id.data[i + 1] = 46 + v * 52; id.data[i + 2] = 52 + v * 54; id.data[i + 3] = 255;
    const bv = (ridge * .8 + .2) * course * 255; bd.data[i] = bd.data[i + 1] = bd.data[i + 2] = bv; bd.data[i + 3] = 255;
  }
  g.putImageData(id, 0, 0); bg.putImageData(bd, 0, 0);
  noise(g, S, S, 18);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(90,110,60,${.1 + Math.random() * .15})`; g.fillRect(Math.random() * S, Math.random() * S, 3, 2); }
  return { map: toTex(c), bump: toTex(b, { srgb: false }) };
}
/* 白粉墙 */
function texPlaster() {
  const S = 512; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#ECE6DA'; g.fillRect(0, 0, S, S);
  for (let k = 0; k < 40; k++) {
    const x = Math.random() * S, w = 3 + Math.random() * 14, h = 60 + Math.random() * 300;
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, `rgba(90,85,75,${.05 + Math.random() * .1})`); gr.addColorStop(1, 'rgba(90,85,75,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, h); g.fillRect(x - S, 0, w, h);
  }
  for (let k = 0; k < 25; k++) {
    const x = Math.random() * S, y = Math.random() * S, r = 60 + Math.random() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(120,110,95,${.03 + Math.random() * .04})`); gr.addColorStop(1, 'rgba(120,110,95,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  noise(g, S, S, 10);
  return toTex(c);
}
/* 木板 */
function texWood() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  for (let x = 0; x < S; x += 32) {
    const l = 30 + Math.random() * 10; g.fillStyle = `hsl(${20 + Math.random() * 8},${38 + Math.random() * 10}%,${l}%)`; g.fillRect(x, 0, 32, S);
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(40,20,10,${.12 + Math.random() * .2})`; g.lineWidth = .6 + Math.random() * 1.2;
      g.beginPath(); let px = x + 2 + Math.random() * 28; g.moveTo(px, 0);
      for (let y = 0; y <= S; y += 16) { px += (Math.random() - .5) * 2.4; g.lineTo(px, y); } g.stroke();
    }
    g.fillStyle = 'rgba(20,10,5,.55)'; g.fillRect(x, 0, 2, S);
  }
  noise(g, S, S, 12);
  return toTex(c);
}
/* 石块（驳岸/台基/桥） */
function texStone() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#56565a'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    let x = (y / 32) % 2 ? -30 : 0;
    while (x < S) { const w = 50 + Math.random() * 40; const l = 48 + Math.random() * 14;
      g.fillStyle = `hsl(40,${4 + Math.random() * 6}%,${l}%)`; g.fillRect(x + 2, y + 2, w - 3, 29);
      if (x + w > S) { g.fillRect(x + 2 - S, y + 2, w - 3, 29); }
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 2, y + 2, w - 3, 3);
      x += w; }
  }
  noise(g, S, S, 22);
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(70,95,50,${.1 + Math.random() * .15})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 5, 2 + Math.random() * 3); }
  return toTex(c);
}
/* 青砖（邮局） */
function texBrick() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#8c8a84'; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) {
    const off = (y / 16) % 2 ? 16 : 0;
    for (let x = -32; x < S; x += 32) {
      const l = 36 + Math.random() * 14; const h = Math.random() < .12 ? 12 : 205;
      g.fillStyle = `hsl(${h},${h > 100 ? 6 : 22}%,${l}%)`; g.fillRect(x + off + 1, y + 1, 30, 14);
    }
  }
  noise(g, S, S, 16);
  return toTex(c);
}
/* 木格窗：三种纹样横排，uv.x 取 1/3 段选纹样。emissive 贴图：纸亮木暗 */
function texLattice() {
  const W = 768, H = 256; const [c, g] = mkCanvas(W, H); const [e, eg] = mkCanvas(W, H);
  g.fillStyle = '#EAD3A2'; g.fillRect(0, 0, W, H); noise(g, W, H, 10);
  eg.fillStyle = '#FFE2B0'; eg.fillRect(0, 0, W, H);
  const line = (x1, y1, x2, y2, w = 6) => { for (const [ctx, col] of [[g, '#3a2418'], [eg, '#000']]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } };
  for (let v = 0; v < 3; v++) {
    const ox = v * 256;
    if (v === 0) { for (let i = 1; i < 6; i++) { line(ox + i * 256 / 6, 0, ox + i * 256 / 6, H); line(ox, i * H / 6, ox + 256, i * H / 6); } }
    if (v === 1) { // 步步锦
      for (let i = 0; i < 4; i++) { const m = 18 + i * 26; line(ox + m, m, ox + 256 - m, m, 5); line(ox + m, H - m, ox + 256 - m, H - m, 5); line(ox + m, m, ox + m, H - m, 5); line(ox + 256 - m, m, ox + 256 - m, H - m, 5); }
      line(ox + 128, 0, ox + 128, 18, 5); line(ox + 128, H - 18, ox + 128, H, 5); line(ox, 128, ox + 18, 128, 5); line(ox + 238, 128, ox + 256, 128, 5);
    }
    if (v === 2) { // 菱花格
      for (const ctx of [g, eg]) { ctx.save(); ctx.beginPath(); ctx.rect(ox, 0, 256, H); ctx.clip(); }
      for (let i = -6; i <= 6; i++) { const o = i * 42; line(ox + o, 0, ox + o + 256, H, 5); line(ox + o + 256, 0, ox + o, H, 5); }
      for (const ctx of [g, eg]) ctx.restore();
    }
    // 外框
    for (const [ctx, col] of [[g, '#3a2418'], [eg, '#000']]) { ctx.strokeStyle = col; ctx.lineWidth = 22; ctx.strokeRect(ox + 11, 11, 234, H - 22); }
  }
  return { map: toTex(c, { repeat: false }), emap: toTex(e, { repeat: false }) };
}
/* 门板 */
function texDoor() {
  const W = 256, H = 512; const [c, g] = mkCanvas(W, H);
  g.fillStyle = '#6E2A1C'; g.fillRect(0, 0, W, H);
  for (let leaf = 0; leaf < 2; leaf++) {
    const x = leaf * 128;
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(x + 12, 20, 104, 180); g.strokeRect(x + 12, 220, 104, 270);
    g.strokeStyle = 'rgba(255,200,150,.12)'; g.lineWidth = 2; g.strokeRect(x + 16, 24, 96, 172); g.strokeRect(x + 16, 224, 96, 262);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + 126, 0, 4, H);
    // 门钉
    g.fillStyle = '#C9A04A'; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(x + 34 + q * 30, 250 + r * 50, 5, 0, 7); g.fill(); }
    g.strokeStyle = '#D8B060'; g.lineWidth = 4; g.beginPath(); g.arc(x + (leaf ? 18 : 110), 210, 12, 0, 7); g.stroke();
  }
  noise(g, W, H, 16);
  return toTex(c, { repeat: false });
}
/* 草地 / 泥土 / 碎石 */
function texGrass() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#687A3E'; g.fillRect(0, 0, S, S); noise(g, S, S, 30);
  for (let k = 0; k < 1400; k++) { const h = 60 + Math.random() * 40; g.strokeStyle = `hsla(${h},${40 + Math.random() * 20}%,${25 + Math.random() * 25}%,.7)`; g.lineWidth = 1;
    const x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 4, y - 3 - Math.random() * 5); g.stroke(); }
  return toTex(c);
}
function texDirt() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#7C6B54'; g.fillRect(0, 0, S, S); noise(g, S, S, 34);
  for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(${Math.random() < .5 ? '60,50,40' : '170,160,140'},.35)`; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, .8 + Math.random() * 2, 0, 7); g.fill(); }
  return toTex(c);
}
function texGravel() {
  const S = 256; const [c, g] = mkCanvas(S, S);
  g.fillStyle = '#B2A68F'; g.fillRect(0, 0, S, S); noise(g, S, S, 40);
  for (let k = 0; k < 900; k++) { const l = 45 + Math.random() * 35; g.fillStyle = `hsl(35,10%,${l}%)`; g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, 1 + Math.random() * 2.5, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); }
  return toTex(c);
}
/* 光晕 */
function texHalo() {
  const S = 64; const [c, g] = mkCanvas(S, S);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,180,1)'); gr.addColorStop(.25, 'rgba(255,170,90,.55)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return toTex(c, { repeat: false });
}

/* ---------------- 招牌图集 ----------------
 * 2048×4096：上部 横匾 512×128（4 列 × 24 行），底部 竖牌 128×512（16 列 × 2 行）
 */
const SIGN = { c: null, g: null, tex: null, h: 0, v: 0, map: new Map() };
function initSignAtlas() {
  const [c, g] = mkCanvas(2048, 4096); SIGN.c = c; SIGN.g = g;
  g.fillStyle = '#222'; g.fillRect(0, 0, 2048, 4096);
  SIGN.tex = toTex(c, { repeat: false });
}
const SIGN_STYLES = {
  black: { bg: '#1E1712', fg: '#E6C063', bd: '#8C6A2E' },
  red: { bg: '#7A1E16', fg: '#F2D68A', bd: '#C9A04A' },
  wood: { bg: '#8A5E3A', fg: '#231710', bd: '#4A2E1A' },
  green: { bg: '#2E4A38', fg: '#EEDDAA', bd: '#C9A04A' },
  stone: { bg: '#77756F', fg: '#2A2826', bd: '#5E5C57' },
  paper: { bg: '#E8D8B0', fg: '#8A2418', bd: '#8A2418' },
};
/* 返回 uv 矩形 [u0,v0,u1,v1] */
function signUV(text, style = 'black', vertical = false) {
  const key = text + '|' + style + '|' + vertical;
  if (SIGN.map.has(key)) return SIGN.map.get(key);
  const g = SIGN.g, st = SIGN_STYLES[style];
  let x, y, w, h;
  if (!vertical) { if (SIGN.h >= 96) return [...SIGN.map.values()][0]; const i = SIGN.h++; x = (i % 4) * 512; y = Math.floor(i / 4) * 128; w = 512; h = 128; }
  else { if (SIGN.v >= 32) return [...SIGN.map.values()][0]; const i = SIGN.v++; x = (i % 16) * 128; y = 3072 + Math.floor(i / 16) * 512; w = 128; h = 512; }
  g.fillStyle = st.bg; g.fillRect(x, y, w, h);
  g.strokeStyle = st.bd; g.lineWidth = 10; g.strokeRect(x + 7, y + 7, w - 14, h - 14);
  g.strokeStyle = st.bd; g.lineWidth = 2; g.strokeRect(x + 17, y + 17, w - 34, h - 34);
  g.fillStyle = st.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (!vertical) {
    const n = text.length; const fs = Math.min(92, 400 / n);
    g.font = `${fs}px ${FONT_BRUSH}`;
    const step = Math.min(110, 420 / n);
    for (let k = 0; k < n; k++) g.fillText(text[k], x + w / 2 + (k - (n - 1) / 2) * step, y + h / 2 + 4);
  } else {
    const n = text.length; const fs = Math.min(92, 420 / n);
    g.font = `${fs}px ${FONT_BRUSH}`;
    for (let k = 0; k < n; k++) g.fillText(text[k], x + w / 2, y + h / 2 + (k - (n - 1) / 2) * (fs * 1.05) + 4);
  }
  const uv = [x / 2048, 1 - (y + h) / 4096, (x + w) / 2048, 1 - y / 4096];
  SIGN.map.set(key, uv);
  return uv;
}
/* 幌子（布招）图集：8 格 128×256 */
const BANNER = { c: null, g: null, tex: null, n: 0, map: new Map() };
function initBannerAtlas() { const [c, g] = mkCanvas(1024, 256); BANNER.c = c; BANNER.g = g; BANNER.tex = toTex(c, { repeat: false }); }
function bannerUV(ch, bg = '#E8DCC0', fg = '#8A2418') {
  const key = ch + bg; if (BANNER.map.has(key)) return BANNER.map.get(key);
  const i = BANNER.n++, g = BANNER.g, x = i * 128;
  g.fillStyle = bg; g.fillRect(x, 0, 128, 256);
  g.fillStyle = fg; g.fillRect(x, 0, 128, 18);
  for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x + k * 25.6, 232); g.lineTo(x + k * 25.6 + 12.8, 256); g.lineTo(x + (k + 1) * 25.6, 232); g.fill(); }
  g.fillRect(x, 222, 128, 12);
  g.font = `96px ${FONT_BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, x + 64, 124);
  const uv = [x / 1024, 0, (x + 128) / 1024, 1];
  BANNER.map.set(key, uv); return uv;
}
/* 名牌（撕名牌用）——跑男式：白底彩边大字 */
function tagTexture(ch, col) {
  const [c, g] = mkCanvas(128, 160);
  g.fillStyle = '#FBF6EA'; g.fillRect(0, 0, 128, 160);
  g.fillStyle = col; g.fillRect(0, 0, 128, 26); g.fillRect(0, 144, 128, 16);
  g.strokeStyle = col; g.lineWidth = 6; g.strokeRect(3, 3, 122, 154);
  g.fillStyle = '#FBF6EA'; g.font = `bold 16px ${FONT_SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RUNNING', 64, 14);
  g.fillStyle = '#1a1a1a'; g.font = `92px ${FONT_BRUSH}`; g.fillText(ch, 64, 88);
  const t = toTex(c, { repeat: false }); return t;
}
/* 碑文 */
function steleTexture(lines) {
  const [c, g] = mkCanvas(256, 384);
  g.fillStyle = '#6d6a63'; g.fillRect(0, 0, 256, 384); noise(g, 256, 384, 30);
  g.strokeStyle = '#4a4843'; g.lineWidth = 8; g.strokeRect(14, 14, 228, 356);
  g.font = `52px ${FONT_BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((ln, col) => {
    const cx = 256 / 2 + ((lines.length - 1) / 2 - col) * 70;
    [...ln].forEach((ch, k) => {
      const cy = 70 + k * 58;
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillText(ch, cx + 1.5, cy + 1.5);
      g.fillStyle = '#26241f'; g.fillText(ch, cx, cy);
    });
  });
  return toTex(c, { repeat: false });
}

/* 生成全部贴图 */
const TX = {};
function buildTextures() {
  const p = texPaving(); TX.paving = p.map; TX.pavingBump = p.bump;
  const t = texTile(); TX.tile = t.map; TX.tileBump = t.bump;
  TX.plaster = texPlaster(); TX.wood = texWood(); TX.stone = texStone(); TX.brick = texBrick();
  const l = texLattice(); TX.lattice = l.map; TX.latticeE = l.emap;
  TX.door = texDoor(); TX.grass = texGrass(); TX.dirt = texDirt(); TX.gravel = texGravel(); TX.halo = texHalo();
  initSignAtlas(); initBannerAtlas();
}
