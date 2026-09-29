/* ============================================================
 * 城市布局：老街 · 广场 · 公园 · 河道拱桥 · 东市 · 北巷
 * ============================================================ */
const LABELS = [];   // 地图文字
const RAISE = [];    // 抬高的平台 {x0,x1,z0,z1,y}
const DIG_TREES = []; // 公园银杏 {x,z,fromEast}
const BOUNDS = { x0: -88, x1: 86, z0: -101, z1: 57 };
const SIGN_POOL = ['王记糕点', '济生堂', '同福酒家', '瑞蚨布庄', '丰裕米行', '翠云茶庄', '老陈面馆', '光华照相', '豆腐坊', '香油坊', '墨香书画', '亨得利钟表', '糖水铺', '悦来客栈', '老凤银楼', '竹器社', '陶然居', '酱园', '杂货铺', '小笼馆', '馄饨铺', '烟纸店', '裁缝铺', '秤店', '箍桶铺', '剃头铺', '南货店', '绸布庄'];
const BANNER_POOL = ['酒', '面', '药', '布', '米', '茶', '糕', '粥', '当', '染'];
let signI = 0;
const takeSign = () => SIGN_POOL[(signI++) % SIGN_POOL.length];

function groundY(x, z) {
  if (x > -78 && x < -62 && z > -7.4 && z < -2.6) { const t = (x + 70) / 8; return Math.max(0, 2.3 * (1 - t * t)); }
  for (const r of RAISE) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.y;
  return 0;
}
function facingXF(c, line, facing) {
  if (facing === 'S') return { x: c, z: line, ry: 0 };
  if (facing === 'N') return { x: c, z: line, ry: Math.PI };
  if (facing === 'E') return { x: line, z: c, ry: Math.PI / 2 };
  return { x: line, z: c, ry: -Math.PI / 2 };
}
let houseSeed = 0;
function placeHouse(c, line, facing, w, d, o = {}) {
  const p = facingXF(c, line, facing); pushXF(p.x, 0, p.z, p.ry);
  const white = o.style ? o.style === 'white' : WR() < (o.whiteP ?? .35);
  const shop = o.signs && WR() < .75;
  if (white) houseWhite({ w, d, floors: WR() < .8 ? 2 : 1, sign: shop ? takeSign() : null, lanterns: shop || WR() < .3, horse: o.horse ?? WR() < .8, lowWin: w > 8 ? [-w / 3.2, w / 3.2] : null });
  else houseWood({ w, d, floors: WR() < .85 ? 2 : 1, sign: shop ? takeSign() : null, banner: shop && WR() < .45 ? wpick(BANNER_POOL) : null, bannerSide: WR() < .5 ? 1 : -1, seed: houseSeed++, lanterns: shop || WR() < .4, vsign: shop && WR() < .3 ? takeSign() : null });
  popXF();
}
function street(a0, a1, line, facing, d, o = {}) {
  let a = a0;
  while (a1 - a >= 4.5) {
    let w = wpick(o.widths || [6.5, 7.5, 8.5, 9.5, 10.5]);
    if (a1 - a - w < 5) w = a1 - a;
    placeHouse(a + w / 2, line, facing, w, d, o);
    a += w;
  }
}
/* 地面 */
function groundRect(key, x0, z0, x1, z1, y, s, col = 0xffffff) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + (x0 + x1) / 2) / s, -(pos.getZ(i) + (z0 + z1) / 2) / s);
  add(key, g, M((x0 + x1) / 2, y, (z0 + z1) / 2), col);
}

/* ---------------- 特殊建筑 ---------------- */
function teahouse() {
  houseWood({ w: 16, d: 13, floors: 2, post: 0x6E2418, sign: '德昌茶馆', signStyle: 'black', bays: ['open', 'door', 'open', 'door', 'open', 'window'], banner: '茶', bannerSide: 1, seed: 1, vsign: '评弹 雅座', vside: -1 });
  // 门廊
  for (const sx of [-2.3, 2.3]) add('wood', cyl(.14, .15, 3.4, 8), M(sx, 1.7, 2.1), 0x6E2418);
  pushXF(0, 0, .8, Math.PI / 2); roof(3.6, 5.6, 1.1, 3.4, 0, { lift: .5 }); popXF();
  add('wood', box(5, .25, .3), M(0, 3.3, 2.1), 0x6E2418);
  sign('茶', 'red', .9, .9, 0, 2.85, 2.28);
  for (const [x, z] of [[-5.5, 3.2], [5.5, 3.4], [-3, 5.2]]) tableSet(x, z);
  lantern(-1.6, 3.0, 2.2, 1.3); lantern(1.6, 3.0, 2.2, 1.3);
  solidLocal(-2.6, 1.9, -2.0, 2.3, 4); solidLocal(2.0, 1.9, 2.6, 2.3, 4);
}
function postOffice() {
  const w = 16, d = 13, H = 7.6;
  add('stone', box(w + .3, .55, d + .3), M(0, .275, -d / 2), 0x9a968c);
  add('brick', box(w, H - .55, d, 2), M(0, .55 + (H - .55) / 2, -d / 2), 0xC6CEC6);
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) add('plaster', box(.7, H - .55, .36, 3), M(x, .55 + (H - .55) / 2, .1), 0xE6E0D0);
  add('plaster', box(w + .6, .5, .7), M(0, H, 0), 0xE6E0D0);
  add('plaster', box(w + .3, .9, .3), M(0, H + .7, -.1), 0xE6E0D0);
  add('plaster', box(w - .4, .1, d - .4), M(0, H + .3, -d / 2), 0xB0AA9C);
  add('plaster', box(w + .2, .2, .6), M(0, 3.9, .05), 0xE6E0D0);
  // 山花 + 钟
  const sh = new THREE.Shape(); sh.moveTo(-3.6, 0); sh.lineTo(3.6, 0); sh.lineTo(0, 1.9); sh.lineTo(-3.6, 0);
  const pg = new THREE.ExtrudeGeometry(sh, { depth: .4, bevelEnabled: false }); scaleUV(pg, 1 / 3);
  add('plaster', pg, M(0, H + 1.1, -.2), 0xE6E0D0);
  add('plain', cyl(.62, .62, .12, 24), M(0, H + 1.75, .25, Math.PI / 2, 0, 0), 0x2a2a2a);
  add('plain', cyl(.54, .54, .14, 24), M(0, H + 1.75, .27, Math.PI / 2, 0, 0), 0xF4EEDA);
  add('plain', box(.05, .42, .03), M(0, H + 1.9, .36, 0, 0, .3), 0x111111);
  add('plain', box(.05, .3, .03), M(.1, H + 1.7, .36, 0, 0, -1.9), 0x111111);
  sign('老邮局', 'green', 3.4, .85, 0, H - .75, .22);
  // 拱窗
  const arched = (x, y, ww, hh) => {
    add('plain', box(ww + .1, hh, .06), M(x, y, .02), 0x1c2a24);
    add('lattice', latticeBox(ww, hh - .1, 0), M(x, y, .05));
    add('plaster', new THREE.TorusGeometry(ww / 2 + .08, .1, 6, 14, Math.PI), M(x, y + hh / 2, .06), 0xE6E0D0);
    add('plain', new THREE.CircleGeometry(ww / 2, 14, 0, Math.PI), M(x, y + hh / 2, .03), 0x24362c);
    add('plaster', box(ww + .4, .12, .3), M(x, y - hh / 2 - .06, .1), 0xE6E0D0);
  };
  for (const x of [-w / 3, w / 3]) { arched(x - 1.1, 2.2, .9, 1.9); arched(x + 1.1, 2.2, .9, 1.9); arched(x - 1.1, 5.6, .9, 1.7); arched(x + 1.1, 5.6, .9, 1.7); }
  // 正门
  add('door', boxUV(2.0, 2.9, .1, 0, 0, 1, 1), M(0, .55 + 1.45, .03));
  add('plaster', new THREE.TorusGeometry(1.1, .14, 6, 16, Math.PI), M(0, .55 + 2.9, .1), 0xE6E0D0);
  add('plain', new THREE.CircleGeometry(1.0, 16, 0, Math.PI), M(0, .55 + 2.9, .04), 0x24362c);
  for (let k = 0; k < 3; k++) add('stone', box(3.4 - k * .3, .18, .45), M(0, .09 + k * .18, .95 - k * .4), 0xA8A49A);
  // 二层阳台
  add('plaster', box(3.2, .18, 1.1), M(0, 4.35, .5), 0xE6E0D0);
  for (let i = 0; i < 9; i++) add('metal', cyl(.02, .02, .8, 4), M(-1.5 + i * .375, 4.85, 1.0), 0x2a3a30);
  add('metal', box(3.2, .05, .05), M(0, 5.25, 1.0), 0x2a3a30);
  arched(0, 5.6, 1.1, 1.8);
  lantern(-1.8, 3.4, .6, 1.0); lantern(1.8, 3.4, .6, 1.0);
  postBox(3.6, 1.6); bicycle(-4.5, 1.8, Math.PI / 2 + .2, 0x2E5A3A); bicycle(-5.6, 1.9, Math.PI / 2 - .1, 0x3a3a3a);
  solidLocal(-w / 2 - .3, -d, w / 2 + .3, .4, H + 2.4, '#4a5450');
}
function bookstore() {
  houseWhite({ w: 14, d: 10, floors: 2, sign: '三味书屋', signStyle: 'wood', lanterns: true, vsign: '古籍旧书', vside: -1, lowWin: [-4.3, 4.3], wins: [-4.3, 0, 4.3] });
  for (const x of [-4.6, 4.2]) {
    add('wood', box(2.4, .8, .9), M(x, .4, 1.3), 0x6a4630);
    goodsOnBooks(x, .82, 1.3);
  }
  bamboo(-6.4, 1.2, 5); potPlant(2.2, .9); potPlant(-2.2, .9, .8);
  solidLocal(-5.9, .8, -3.3, 1.8, 1.2); solidLocal(3.0, .8, 5.5, 1.8, 1.2);
}
function goodsOnBooks(x, y, z) { for (let i = 0; i < 6; i++) for (let k = 0; k < 2 + (i % 3); k++) add('plain', box(.34, .06, .26), M(x - 1 + i * .4, y + .03 + k * .06, z, 0, (WR() - .5) * .3, 0), wpick([0x8a3a2a, 0x2a4a6a, 0xC9B38A, 0x3a5a3a, 0xE0D4B0])); }
function dechang() {
  houseWood({ w: 20, d: 14, floors: 2, post: 0x7A1E16, wall: 0xECE4D2, bays: ['board', 'board', 'window', 'door', 'window', 'board', 'board'], seed: 2, lanterns: false });
  sign('德昌號', 'black', 5.2, 1.35, 0, 4.35, .6);
  add('wood', box(5.6, .2, .2), M(0, 5.15, .5), 0x7A1E16);
  lantern(-3.2, 3.2, .8, 1.7); lantern(3.2, 3.2, .8, 1.7);
  // 封条
  add('plain', box(.14, 2.4, .02), M(.05, 1.7, -.86, 0, 0, .55), 0xF2EAD8);
  add('plain', box(.14, 2.4, .02), M(-.05, 1.7, -.86, 0, 0, -.55), 0xF2EAD8);
  for (let k = 0; k < 3; k++) add('stone', box(8 - k * .6, .16, .5), M(0, .08 + k * .16, 1.1 - k * .4), 0xA8A49A);
  stoneLion(-4.2, 1.8, 0); stoneLion(4.2, 1.8, 0);
  vsignPair('百年老號', '德昌桂花');
}
function vsignPair(a, b) { sign(a, 'red', .5, 2.1, -7.8, 2.1, .15, true); sign(b, 'red', .5, 2.1, 7.8, 2.1, .15, true); }

/* 月洞门墙段 */
function moonGateWall(x0, x1, z, h = 2.6) {
  const w = x1 - x0, cx = (x0 + x1) / 2;
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0);
  const hole = new THREE.Path(); hole.absarc(0, 1.55, 1.55, 0, Math.PI * 2, false); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: .45, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, -.225); scaleUV(g, 1 / 3);
  add('plaster', g, M(cx, 0, z), 0xF2EDE2);
  add('plain', box(w + .3, .14, .8), M(cx, h + .07, z), 0x2f3337);
  add('tile', box(w + .2, .1, .7, 1), M(cx, h + .19, z), 0x9aa0a8);
  add('stone', new THREE.TorusGeometry(1.55, .1, 6, 28), M(cx, 1.55, z + .24), 0x9a968c);
  add('stone', new THREE.TorusGeometry(1.55, .1, 6, 28), M(cx, 1.55, z - .24), 0x9a968c);
  addBox(x0, z - .3, cx - 1.35, z + .3, h); addBox(cx + 1.35, z - .3, x1, z + .3, h);
  sign('怡园', 'wood', 1.4, .45, cx, 2.35, z + .26);
}
function pavilion(x, z) {
  pushXF(x, 0, z);
  add('stone', box(5.2, .45, 5.2), M(0, .225, 0), 0xA8A49A);
  for (let k = 0; k < 2; k++) add('stone', box(1.6, .15, .5), M(2.85 + k * .35, .075 + (1 - k) * .15, 0, 0, Math.PI / 2, 0), 0xA8A49A);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add('wood', cyl(.13, .14, 3.1, 8), M(sx * 2.1, .45 + 1.55, sz * 2.1), 0x7A1E16);
  for (const [sx, sz, ry] of [[0, -2.1, 0], [-2.1, 0, Math.PI / 2], [0, 2.1, 0]]) {
    add('wood', box(3.9, .1, .45), M(sx, .95, sz, 0, ry, 0), 0x6a3020);
    add('wood', box(3.9, .5, .06), M(sx * 1.08, 1.3, sz * 1.08, 0, ry, 0), 0x7A2A1C);
  }
  add('wood', box(4.5, .22, .22), M(0, 3.45, 2.1), 0x7A1E16); add('wood', box(4.5, .22, .22), M(0, 3.45, -2.1), 0x7A1E16);
  add('wood', box(.22, .22, 4.5), M(2.1, 3.45, 0), 0x7A1E16); add('wood', box(.22, .22, 4.5), M(-2.1, 3.45, 0), 0x7A1E16);
  add('tile', pyramidRoofGeo(3.7, 2.2, 4, .7), M(0, 3.55, 0), 0x9aa0a8);
  add('wood', pyramidRoofGeo(3.6, 2.1, 4, .7), M(0, 3.45, 0), 0x3a2a20);
  add('plain', sph(.22, 8, 6), M(0, 5.8, 0), 0x8a6a30); add('plain', cone(.12, .5, 6), M(0, 6.15, 0), 0x8a6a30);
  sign('听秋亭', 'black', 1.5, .45, 0, 3.2, 2.2);
  lantern(-1.2, 3.25, 2.2, .9); lantern(1.2, 3.25, 2.2, .9);
  popXF();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addCirc(x + sx * 2.1, z + sz * 2.1, .25);
  addBox(x - 2.4, z - 2.4, x - 1.9, z + 2.4, 1); addBox(x - 2.4, z - 2.4, x + 2.4, z - 1.9, 1); addBox(x - 2.4, z + 1.9, x + 2.4, z + 2.4, 1);
  RAISE.push({ x0: x - 2.6, x1: x + 2.6, z0: z - 2.6, z1: z + 2.6, y: .45 });
  MAPR.push({ x0: x - 2.6, x1: x + 2.6, z0: z - 2.6, z1: z + 2.6, c: '#7a3a2a' });
}
function steleMesh(x, z) {
  add('stone', box(1.9, .5, .9), M(x, .25, z), 0x8a867c);
  add('stone', box(1.5, .2, .6), M(x, .6, z), 0x8e8a80);
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.2, .3), [
    new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: .9 }), new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: .9 }),
    new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: .9 }), new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: .9 }),
    new THREE.MeshStandardMaterial({ map: steleTexture(['亭东银杏七株', '其三藏秋']), roughness: .85 }),
    new THREE.MeshStandardMaterial({ color: 0x6d6a63, roughness: .9 })]);
  m.position.set(x, 1.8, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  add('stone', box(1.55, .25, .42), M(x, 3.0, z), 0x77736b);
  addBox(x - .95, z - .45, x + .95, z + .45, 3);
}

/* ---------------- 布局 ---------------- */
function buildCity() {
  /* 地面 */
  groundRect('dirt', -140, -130, -74.5, 90, 0, 6);
  groundRect('dirt', -63.7, -130, 140, 90, 0, 6);
  // 街道铺装
  const P = (x0, z0, x1, z1, c = 0xffffff) => groundRect('paving', x0, z0, x1, z1, .02, 3.2, c);
  P(-63.7, -10, 88, 0);                  // 东西大街
  P(-90, -16, -74.5, 6);                 // 西桥头小广场
  P(-63.7, -60.5, 62, -51.5);            // 北横街
  P(-5, 0, 5, 11);                       // 通广场
  P(-18, 11, 18, 40, 0xF2E6D8);          // 广场
  P(10, 40, 13, 53);                     // 德昌号侧巷
  P(-30, -51.5, -24, -10); P(24, -51.5, 30, -10); // 公园两侧巷
  P(-63.7, -60.5, -59, 52);              // 河岸步道
  P(-2, -78, 2, -60.5); P(-29, -80, 29, -76); P(-29, -94, -25, -60.5); P(25, -94, 29, -60.5); P(-29, -94, 29, -90); P(-2, -104, 2, -90); // 北巷
  // 广场拼花
  add('stone', new THREE.RingGeometry(11.6, 12.2, 48).rotateX(-Math.PI / 2), M(0, .035, 24), 0xB8B0A0);
  add('stone', new THREE.RingGeometry(5.6, 6.0, 40).rotateX(-Math.PI / 2), M(0, .035, 24), 0xB8B0A0);
  add('stone', new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2), M(0, .04, 24), 0x9C8A70);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add('stone', box(.3, .02, 5.6), M(Math.sin(a) * 8.8, .036, 24 + Math.cos(a) * 8.8, 0, a, 0), 0xB0A898); }
  LABELS.push({ x: 0, z: 26, t: '广场' });

  /* 东西大街北侧 */
  street(-59, -50, -10, 'S', 12, { signs: true });
  pushXF(-42, 0, -10); teahouse(); popXF();
  LABELS.push({ x: -42, z: -17, t: '德昌茶馆' });
  pushXF(42, 0, -10); postOffice(); popXF();
  LABELS.push({ x: 42, z: -17, t: '老邮局' });
  street(50, 86, -10, 'S', 12, { signs: true });
  wallLine(-34, -10.3, -30.5, -10.3, 2.6); wallLine(30.5, -10.3, 34, -10.3, 2.6);
  osmanthus(-32.3, -12.5); osmanthus(32.3, -12.5);
  /* 东西大街南侧 */
  street(-59, -5, 0, 'N', 11, { signs: true });
  street(5, 86, 0, 'N', 11, { signs: true });
  /* 北横街 */
  street(-59, -30, -51.5, 'N', 10, { signs: true });
  street(30, 60, -51.5, 'N', 10, { signs: true });
  pushXF(64, 0, -56, -Math.PI / 2); houseWhite({ w: 9, d: 8, floors: 2 }); popXF();
  street(-59, -52, -60.5, 'S', 9, { signs: true });
  pushXF(-45, 0, -60.5); bookstore(); popXF();
  LABELS.push({ x: -45, z: -65, t: '三味书屋' });
  street(-38, -29, -60.5, 'S', 9, { signs: true });
  street(-25, -2, -60.5, 'S', 9, { signs: true, whiteP: .6 });
  street(2, 25, -60.5, 'S', 9, { signs: true, whiteP: .6 });
  street(29, 60, -60.5, 'S', 9, { signs: true });
  /* 公园两侧巷 */
  street(-41.5, -24, -30, 'E', 9, { whiteP: .7 });
  street(-41.5, -24, 30, 'W', 9, { whiteP: .7 });
  /* 广场两侧 & 德昌号 */
  street(12, 40, -18, 'E', 12, { signs: true });
  street(12, 40, 18, 'W', 12, { signs: true });
  pushXF(0, 0, 40, Math.PI); dechang(); popXF();
  LABELS.push({ x: 0, z: 47, t: '德昌号旧址' });
  placeHouse(-14, 40, 'N', 8, 12, { style: 'white' });
  placeHouse(15.5, 40, 'N', 5, 12, { style: 'wood' });
  wallLine(10, 53.2, 13, 53.2, 3.2);
  crate(12.2, 51.5); crate(11.2, 51.8, .8); barrel(12.4, 50.2); jar(10.9, 44.5, .9);
  /* 背景填充（广场两翼、东北角、河西） */
  for (let z = 14; z < 54; z += 12) { placeHouse(z, -59, 'W', 11, 10, { whiteP: .6 }); placeHouse(z, -32, 'E', 11, 10, { whiteP: .6 }); }
  for (let x = 36; x < 84; x += 12) for (let z = 14; z < 54; z += 13) placeHouse(x, z, 'N', 11, 9, { whiteP: .5 });
  for (let x = 72; x < 90; x += 10) for (const z of [-48, -36]) placeHouse(x, z, 'S', 9, 10, { whiteP: .6 });
  for (let x = 68; x < 90; x += 10) for (let z = -64; z > -104; z -= 12) placeHouse(x, z, 'S', 9, 10, { whiteP: .8 });
  osmanthus(-45, -33); osmanthus(45, -33); pine(-53, -35); pine(53, -35); osmanthus(-55, -28, .9); osmanthus(55, -28, .9);
  for (let z = -110; z < 80; z += 13) { if (z > -24 && z < 12) continue; placeHouse(z, -76, 'E', 12, 10, { whiteP: .7 }); }
  placeHouse(-20, -76, 'E', 7, 9, { style: 'white' }); placeHouse(10, -76, 'E', 7, 9, { style: 'white' });
  for (let z = -60; z < 80; z += 14) placeHouse(z, -100, 'E', 13, 11, { whiteP: .8 });

  /* 北巷：高墙窄巷 */
  wallLine(-25, -76, -2, -76, 3.6); wallLine(2, -76, 25, -76, 3.6);
  wallLine(-2, -69.5, -2, -76, 3.6); wallLine(2, -69.5, 2, -76, 3.6);
  wallLine(-25, -69.5, -25, -76, 3.6); wallLine(25, -69.5, 25, -76, 3.6);
  street(-25, 25, -80, 'S', 5, { style: 'white', widths: [7, 8, 9], horse: true });
  street(-25, -2, -90, 'N', 5, { style: 'white', widths: [7, 8] });
  street(2, 25, -90, 'N', 5, { style: 'white', widths: [7, 8] });
  street(-29, -2, -94, 'S', 7, { style: 'white', widths: [7, 8, 9] });
  street(2, 29, -94, 'S', 7, { style: 'white', widths: [7, 8, 9] });
  street(-94, -69.5, -29, 'E', 9, { style: 'white', widths: [8, 9, 10] });
  street(-94, -69.5, 29, 'W', 9, { style: 'white', widths: [8, 9, 10] });
  for (const [x, z] of [[-13, -72.5], [13, -72.5], [-8, -72.8]]) osmanthus(x, z, .9);
  laundry(-28.8, -83, -25.2, -84.5, 3.0); laundry(25.2, -70, 28.8, -71, 2.9); laundry(-10, -76.3, -4, -79.8, 3.1); laundry(8, -90.3, 14, -93.7, 2.9);
  crate(-26, -88); crate(-26.2, -87.1, .7, .4, .8); barrel(28.1, -82); jar(27.9, -84.2); basket(-1, -91.2); crate(-5, -93.2, .9); barrel(-7.2, -93.3);
  pushXF(0, 0, -99.5); paifang('北巷', 5.4, 5.2); popXF();
  LABELS.push({ x: 0, z: -84, t: '北巷' });

  /* 东市 */
  const stallsN = [[58, 0xB03A2E, '热馄饨'], [64, 0x2E5AA0, '杂货'], [76, 0x3A7A4A, '鲜果']];
  for (const [x, c, t] of stallsN) stall(x, -8.3, 0, c, 'x', t);
  const stallsS = [[60, 0xC0762A, '糖画'], [70, 0xB03A2E, '桂花糕'], [80, 0x6A3A8A, '香囊']];
  for (const [x, c, t] of stallsS) stall(x, -1.6, Math.PI, c, 'x', t);
  for (let x = 56; x < 84; x += 4.5) { lantern(x, 4.6, -5, 1.0); }
  for (let x = 56; x < 84; x += 4.5) beam('plain', V(x - 4.5, 4.9, -5), V(x, 4.9, -5), .01, 0x222222);
  pushXF(85, 0, -5, Math.PI / 2); paifang('东市', 9.2, 6.4); popXF();
  LABELS.push({ x: 70, z: -5, t: '东市' });
  basket(66.5, -8.6); crate(73, -1.2, .8); barrel(83.5, -9.2); jar(57, -1.0, .8);

  /* 河道 & 西桥 */
  const cz0 = -110, cz1 = 70;
  add('dirt', box(10, .2, cz1 - cz0), M(-69, -2.7, (cz0 + cz1) / 2), 0x3a3428);
  for (const x of [-74.1, -63.9]) {
    add('stone', box(.6, 2.9, cz1 - cz0, 2), M(x, -1.25, (cz0 + cz1) / 2), 0x9a968c);
    add('stone', box(.9, .2, cz1 - cz0, 2), M(x, .1, (cz0 + cz1) / 2), 0xB4B0A6);
  }
  addBox(-74.6, cz0, -63.7, -7.35, 1); addBox(-74.6, -2.65, -63.7, cz1, 1);
  MAPR.push({ x0: -74, x1: -64, z0: cz0, z1: cz1, c: '#2d4a4a' });
  // 河埠头台阶
  for (let k = 0; k < 6; k++) add('stone', box(.5, .2, 3), M(-64.4 - k * .45, -.1 - k * .36, -45), 0xA8A49A);
  // 河岸栏杆
  for (let z = -100; z < 55; z += 2.2) { if (Math.abs(z + 45) < 2.2 || (z > -9 && z < -1)) continue; add('stone', box(.2, .7, .2), M(-63.8, .45, z), 0xB4B0A6); }
  for (let z = -100; z < 53; z += 2.2) { if (Math.abs(z + 45) < 3.3 || (z > -10 && z < 0)) continue; add('stone', box(.1, .08, 2.2), M(-63.8, .72, z + 1.1), 0xB4B0A6); }
  // 拱桥（台阶）
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const x0 = -78 + i * 16 / steps, x1 = x0 + 16 / steps, xm = (x0 + x1) / 2;
    const y = groundY(xm, -5);
    add('stone', box(x1 - x0 + .02, .35, 4.6, 1.5), M(xm, y - .1, -5), 0xB0ACA2);
  }
  const bsh = new THREE.Shape(); bsh.moveTo(-8, -2.7); bsh.lineTo(-3, -2.7); bsh.lineTo(-3, -1.3);
  bsh.absarc(0, -1.3, 3, Math.PI, 0, true); bsh.lineTo(3, -2.7); bsh.lineTo(8, -2.7);
  for (let i = 0; i <= 24; i++) { const x = 8 - i * 16 / 24; bsh.lineTo(x, Math.max(0, 2.3 * (1 - (x / 8) ** 2)) - .15); }
  for (const z of [-7.25, -2.75]) { const g = new THREE.ExtrudeGeometry(bsh, { depth: .5, bevelEnabled: false, curveSegments: 16 }); g.translate(0, 0, -.25); scaleUV(g, 1 / 2); add('stone', g, M(-70, 0, z), 0x9e9a90); }
  const vault = new THREE.CylinderGeometry(3, 3, 4.5, 20, 1, true, -Math.PI / 2, Math.PI); vault.rotateX(-Math.PI / 2);
  { const ia = vault.index.array; for (let i = 0; i < ia.length; i += 3) { const t = ia[i]; ia[i] = ia[i + 2]; ia[i + 2] = t; } vault.computeVertexNormals(); }
  add('stone', vault, M(-70, -1.3, -5), 0x7e7a70);
  for (let i = 0; i <= 8; i++) {
    const x = -77.5 + i * 15 / 8, y = groundY(x, -5);
    for (const z of [-7.35, -2.65]) add('stone', box(.24, .9, .24), M(x, y + .45, z), 0xB4B0A6);
    if (i < 8) { const xn = x + 15 / 8, yn = groundY(xn, -5); for (const z of [-7.35, -2.65]) beam('stone', V(x, y + .75, z), V(xn, yn + .75, z), .07, 0xB4B0A6); }
  }
  addBox(-78, -7.8, -62, -7.25, 1.2); addBox(-78, -2.75, -62, -2.2, 1.2);
  MAPR.push({ x0: -78, x1: -62, z0: -7.3, z1: -2.7, c: '#9a968c' });
  LABELS.push({ x: -70, z: -12, t: '西桥' });
  // 乌篷船
  boat(-68.5, 18, .1); boat(-69.5, -40, -.2); boat(-68.8, -72, .05);
  // 西岸
  pushXF(-86, 0, -5, Math.PI / 2); paifang('西桥', 9.2, 6.4); popXF();
  wallLine(-90, -16.2, -74.8, -16.2, 3); wallLine(-90, 6.2, -74.8, 6.2, 3);
  willow(-81, -13.5); willow(-80, 3.5); bench(-83, -12.5, 0);
  // 河岸柳树
  for (const z of [-92, -80, -66, -36, -22, 12, 26, 44]) willow(-61.2, z, .95);
  stoneLantern(-60, -40); stoneLantern(-60, -14);
  lampPost(-60.2, -30); lampPost(-60.2, 6); lampPost(-60.2, 32);

  /* 公园 */
  groundRect('grass', -24, -50.5, 24, -10, .01, 5);
  const G = (x0, z0, x1, z1) => groundRect('gravel', x0, z0, x1, z1, .025, 3);
  G(-2, -50.5, 2, -10); G(-9.5, -24.2, -2, -21.8); G(-24, -34.2, 24, -31.8); G(-5, -44, -2, -38);
  moonGateWall(-6, 6, -10.2);
  wallLine(-24, -10.2, -6, -10.2, 2.6); wallLine(6, -10.2, 24, -10.2, 2.6);
  wallLine(-24, -50.5, -2.3, -50.5, 2.6); wallLine(2.3, -50.5, 24, -50.5, 2.6);
  wallLine(-24, -10.2, -24, -31.6, 2.6); wallLine(-24, -34.4, -24, -50.5, 2.6);
  wallLine(24, -10.2, 24, -31.6, 2.6); wallLine(24, -34.4, 24, -50.5, 2.6);
  for (const x of [-2.4, 2.4]) { add('stone', box(.6, 3.2, .6), M(x, 1.6, -50.5), 0x9a968c); lantern(x, 2.8, -50.1, .8); }
  pavilion(-12, -23);
  steleMesh(-6, -18.3);
  const gx = [20.7, 18.0, 15.3, 12.6, 9.9, 7.2, 4.5];
  gx.forEach((x, i) => { ginkgo(x, -26, .95 + (i % 2) * .08); DIG_TREES.push({ x, z: -26, fromEast: i + 1 }); });
  ginkgo(16, -14, 1.05); ginkgo(-19, -15, 1.1);
  // 池塘
  const pc = { x: -12.5, z: -42, rx: 7.5, rz: 5 };
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, a2 = (i + 1) / 28 * Math.PI * 2;
    const x = pc.x + Math.cos(a) * pc.rx, z = pc.z + Math.sin(a) * pc.rz, x2 = pc.x + Math.cos(a2) * pc.rx, z2 = pc.z + Math.sin(a2) * pc.rz;
    add('stone', box(Math.hypot(x2 - x, z2 - z) + .3, .38, .7), M((x + x2) / 2, .19, (z + z2) / 2, 0, Math.atan2(x2 - x, z2 - z) + Math.PI / 2, 0), 0xA8A49A, null, .15); }
  POND = pc;
  for (let i = 0; i < 14; i++) lotus(pc.x + (WR() - .5) * pc.rx * 1.4, pc.z + (WR() - .5) * pc.rz * 1.3, .22);
  for (let i = 0; i < 5; i++) addCirc(pc.x - pc.rx * .6 + i * pc.rx * .3, pc.z, pc.rz * .95);
  rock(-21, -38, 1.1); rock(-20, -46, .8); rock(-4.5, -47, .9); rock(-6, -36.5, .6);
  MAPR.push({ x0: pc.x - pc.rx, x1: pc.x + pc.rx, z0: pc.z - pc.rz, z1: pc.z + pc.rz, c: '#2d4a4a', ell: true });
  willow(-19, -36.5); willow(-5.5, -48);
  pine(19, -45); pine(-20, -12.8, .9); pine(10, -47, .85); osmanthus(20.5, -13.5); osmanthus(13, -43); osmanthus(-21, -27);
  bamboo(21.5, -48.5); bamboo(-22, -48.5); bamboo(22, -37);
  bench(4.2, -18, Math.PI / 2); bench(-4.2, -30, Math.PI / 2); bench(4.2, -38, Math.PI / 2); bench(12, -30, 0);
  stoneLantern(3.2, -13); stoneLantern(-3.2, -13); stoneLantern(3.2, -47); stoneLantern(-3.2, -47); stoneLantern(3.2, -29.5);
  LABELS.push({ x: 6, z: -40, t: '公园' });

  /* 广场陈设 */
  for (const [x, z] of [[-14, 15], [14, 15], [-14, 35], [14, 35]]) {
    add('stone', box(2.6, .55, 2.6), M(x, .275, z), 0xA8A49A); add('dirt', box(2.2, .05, 2.2), M(x, .56, z), 0x5a4a3a);
    osmanthus(x, z, 1.1, .55); addCirc(x, z, 1.6);
  }
  well(-8, 31);
  for (const [x, z] of [[-6, 12.5], [6, 12.5], [-16.5, 24], [16.5, 24]]) lampPost(x, z);
  bench(-9.5, 17, 0); bench(9.5, 17, 0);
  potPlant(-4, 38.8); potPlant(4, 38.8); jar(-9, 38.5, .8, 0x2a3a4a);

  /* 街景杂物 & 路灯 */
  for (let x = -54; x < 54; x += 13) { if (Math.abs(x) < 6) continue; lampPost(x, -9.2); }
  for (let x = -54; x < 58; x += 14) { if (Math.abs(x) < 6) continue; lampPost(x, -52.3); }
  crate(-28.6, -26.5); crate(-28.9, -25.6, .7, .4, .8); barrel(-25.2, -40); jar(-25.3, -18, .9); basket(28.5, -44); crate(28.6, -20.5, .9); barrel(28.7, -38);
  barrel(-57, -8.8); jar(-50.5, -1.1); crate(-20, -1.2, .8); basket(-12, -1.3); barrel(22, -8.8); jar(-31, -58.5); crate(34, -59.3, .9); barrel(52, -59.2);
  potPlant(-36, -1); potPlant(18.5, -1); potPlant(-58, -59); potPlant(46, -52.5);
  // 远山：两层水墨山影
  mountainRing(420, 38, 0x6E7A8E, 1); mountainRing(330, 24, 0x56627A, 2);
}
let POND = null;
function mountainRing(R, H, col, seed) {
  const N = 180, pos = [], idx = [];
  const rr = mulberry32(seed * 101);
  const ph = [rr() * 6, rr() * 6, rr() * 6];
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2;
    const h = H * (.35 + .35 * Math.sin(a * 3 + ph[0]) * .5 + .5 * Math.pow(Math.abs(Math.sin(a * 7 + ph[1])), 1.5) * .6 + .25 * Math.abs(Math.sin(a * 17 + ph[2])));
    pos.push(Math.cos(a) * R, -30, Math.sin(a) * R, Math.cos(a) * R, h, Math.sin(a) * R);
    if (i < N) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: LC(col).clone(), side: THREE.DoubleSide, fog: false }));
  m.userData.base = LC(col).clone(); m.userData.k = seed === 1 ? .6 : .4; m.renderOrder = -5; scene.add(m); MOUNTAINS.push(m);
}
const MOUNTAINS = [];
function boat(x, z, ry) {
  pushXF(x, 0, z, ry);
  const hull = lathe([[0, -.5], [.6, -.35], [.85, 0], [.9, .1], [0, .1]], 14);
  add('wood', hull, M(0, -1.05, 0, 0, 0, 0, 1, 1, 3.6), 0x4a3424);
  const awn = new THREE.CylinderGeometry(.75, .75, 2.4, 12, 1, true, -Math.PI / 2, Math.PI); awn.rotateX(Math.PI / 2);
  add('plain', awn, M(0, -.95, .2), 0x1e1e20);
  add('wood', box(.05, .05, 2.6), M(.5, -.95, -2.4, -.5, 0, 0), 0x6a4a2a);
  popXF();
}

/* ---------------- 导航图 ---------------- */
const NODES = {
  PL: [0, 24], PLW: [-11, 24], PLE: [11, 24], PN: [0, 9], DSa: [11.5, 38], C0: [0, -5],
  W1: [-27, -5], W2: [-42, -5], W3: [-61.5, -5], WB: [-70, -5], WB1: [-80, -5], WX: [-86.5, -5],
  E1: [27, -5], E2: [42, -5], E3: [56, -5], E4: [70, -5], EX: [85.5, -5],
  PS: [0, -12], PC: [0, -23], PW: [-7.5, -23], PCm: [0, -33], PGW: [-21, -33], PGE: [21, -33], PPond: [-3.2, -40], PNg: [0, -50],
  WLm: [-27, -33], ELm: [27, -33],
  N0: [0, -56], NW1: [-27, -56], NW2: [-45, -56], NW3: [-61.5, -56], NE1: [27, -56], NE2: [44, -56], NE3: [58, -56],
  EMb: [-61.5, -45], EMm: [-61.5, -20], EMs: [-61.5, 20], EMs2: [-61.5, 40],
  A0: [0, -63], A1: [0, -78], AW0: [-27, -63], AW1: [-27, -78], AWm: [-27, -85], AW2: [-27, -92], AE0: [27, -63], AE1: [27, -78], AEm: [27, -85], AE2: [27, -92], AN2: [0, -92], NX: [0, -99.5],
};
const EDGES = 'PL-PLW PL-PLE PL-PN PL-DSa PN-C0 C0-W1 W1-W2 W2-W3 W3-WB WB-WB1 WB1-WX C0-E1 E1-E2 E2-E3 E3-E4 E4-EX C0-PS PS-PC PC-PW PC-PCm PCm-PGW PCm-PGE PCm-PPond PCm-PNg PNg-N0 PGW-WLm PGE-ELm W1-WLm WLm-NW1 E1-ELm ELm-NE1 N0-NW1 NW1-NW2 NW2-NW3 NW3-EMb EMb-EMm EMm-W3 W3-EMs EMs-EMs2 N0-NE1 NE1-NE2 NE2-NE3 N0-A0 A0-A1 A1-AW1 A1-AE1 NW1-AW0 AW0-AW1 AW1-AWm AWm-AW2 NE1-AE0 AE0-AE1 AE1-AEm AEm-AE2 AW2-AN2 AE2-AN2 AN2-NX'.split(' ').map(e => e.split('-'));
const ADJ = {}; for (const k in NODES) ADJ[k] = [];
for (const [a, b] of EDGES) { ADJ[a].push(b); ADJ[b].push(a); }
function nodeD(a, b) { return hyp(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]); }
function nearestNode(x, z, filter) {
  let best = null, bd = 1e9;
  for (const k in NODES) { if (filter && !filter(k)) continue; const d = hyp(NODES[k][0] - x, NODES[k][1] - z); if (d < bd) { bd = d; best = k; } }
  return best;
}
function astar(s, t, blocked) {
  const open = new Set([s]), g = { [s]: 0 }, f = { [s]: nodeD(s, t) }, came = {};
  while (open.size) {
    let cur = null, bf = 1e9; for (const n of open) if (f[n] < bf) { bf = f[n]; cur = n; }
    if (cur === t) { const path = [cur]; while (came[cur]) { cur = came[cur]; path.unshift(cur); } return path; }
    open.delete(cur);
    for (const nb of ADJ[cur]) {
      if (blocked && blocked.has(nb) && nb !== t) continue;
      const ng = g[cur] + nodeD(cur, nb);
      if (g[nb] === undefined || ng < g[nb]) { came[nb] = cur; g[nb] = ng; f[nb] = ng + nodeD(nb, t); open.add(nb); }
    }
  }
  return [s];
}
/* 从 (x,z) 到 (tx,tz) 的路点序列 */
function routeTo(x, z, tx, tz, blocked) {
  const a = nearestNode(x, z), b = nearestNode(tx, tz);
  const path = astar(a, b, blocked).map(k => ({ x: NODES[k][0], z: NODES[k][1], k }));
  // 起点若离第二个节点更近且方向一致，跳过第一个
  if (path.length > 1) { const p0 = path[0], p1 = path[1]; if (hyp(p1.x - x, p1.z - z) < hyp(p1.x - p0.x, p1.z - p0.z)) path.shift(); }
  path.push({ x: tx, z: tz });
  return path;
}

/* ---------------- 场景点位 ---------------- */
const SPOTS = {
  dcSide: { x: 11.5, z: 48.5, yaw: Math.PI, name: '德昌号侧巷', hide: true },
  dcDoor: { x: -2.2, z: 38.2, yaw: 0, name: '德昌号门前' },
  teaBack: { x: -27, z: -22, yaw: Math.PI, name: '茶馆后巷', hide: true },
  teaFront: { x: -40, z: -7.2, yaw: Math.PI, name: '德昌茶馆门口', witness: 'boss' },
  bridgeFoot: { x: -61.8, z: -16, yaw: -Math.PI / 2, name: '西桥下柳树旁', witness: 'liu' },
  bridgeTop: { x: -70, z: -4.4, yaw: Math.PI, name: '西桥桥上', witness: 'liu' },
  marketStall: { x: 70, z: -3.4, yaw: 0, name: '东市王婶的糕摊', witness: 'wang' },
  marketEnd: { x: 80.5, z: -6, yaw: Math.PI / 2, name: '东市牌坊下' },
  postFront: { x: 42, z: -6.6, yaw: Math.PI, name: '老邮局门口', witness: 'chen' },
  parkPav: { x: -12, z: -23, yaw: 0, name: '公园听秋亭' },
  parkPond: { x: -3.4, z: -42, yaw: -Math.PI / 2, name: '公园池塘边' },
  alleyW: { x: -27, z: -86.5, yaw: Math.PI, name: '北巷西头', hide: true },
  alleyE: { x: 27, z: -86.5, yaw: Math.PI, name: '北巷东头', hide: true },
  alleyN: { x: -8, z: -92, yaw: -Math.PI / 2, name: '北巷深处', hide: true },
  canalN: { x: -61.6, z: -47, yaw: -Math.PI / 2, name: '河埠头', hide: true },
  bookSide: { x: -45, z: -57.5, yaw: Math.PI, name: '三味书屋门口', witness: 'shu' },
};
/* 站点（剧情地点） */
const SITES = {
  plaza: { x: 0, z: 24, name: '广场', host: [3.2, 26], face: Math.PI },
  tea: { x: -42, z: -5.2, name: '德昌茶馆', host: [-40, -7.8], face: Math.PI },
  post: { x: 42, z: -5.2, name: '老邮局', host: [44, -7.8], face: Math.PI },
  park: { x: 0, z: -19, name: '公园', host: [-3, -17.6], face: Math.PI },
  market: { x: 70, z: -5, name: '东市', host: [70, -3.3], face: 0 },
  book: { x: -45, z: -56.4, name: '三味书屋', host: [-42.4, -58.4], face: Math.PI },
  finale: { x: 0, z: 30, name: '德昌号旧址', host: [2.5, 36.5], face: Math.PI },
};
const EXITS = {
  west: { node: 'WX', x: -86.5, z: -5, name: '西桥' },
  east: { node: 'EX', x: 85.5, z: -5, name: '东市' },
  north: { node: 'NX', x: 0, z: -99.5, name: '北巷' },
};
