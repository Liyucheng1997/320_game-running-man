/* ============================================================
 * 建筑与道具零件库（全部在「局部坐标」中搭建：正面朝 +z，正面在 z=0，进深往 -z）
 * ============================================================ */
const COL = [];   // 轴对齐碰撞盒 {x0,x1,z0,z1,h}
const CIRC = [];  // 圆形碰撞 {x,z,r}
const MAPR = [];  // 小地图矩形 {x0,z0,x1,z1,c}
const LANTERNS = []; // 灯笼实例 {p:Vector3, s, c}
const WINDOW_MATS = [];
function addBox(x0, z0, x1, z1, h = 8) { COL.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h }); }
function addCirc(x, z, r) { CIRC.push({ x, z, r }); }
/* 当前变换下的局部矩形 → 世界 AABB */
function localAABB(x0, z0, x1, z1) {
  const pts = [wpt(x0, 0, z0), wpt(x1, 0, z0), wpt(x0, 0, z1), wpt(x1, 0, z1)];
  return { x0: Math.min(...pts.map(p => p.x)), x1: Math.max(...pts.map(p => p.x)), z0: Math.min(...pts.map(p => p.z)), z1: Math.max(...pts.map(p => p.z)) };
}
function solidLocal(x0, z0, x1, z1, h, mapCol) {
  const r = localAABB(x0, z0, x1, z1); addBox(r.x0, r.z0, r.x1, r.z1, h);
  if (mapCol) MAPR.push({ ...r, c: mapCol });
}
function lantern(x, y, z, s = 1, c = 0xD8321E) { LANTERNS.push({ p: wpt(x, y, z), s, c }); }
function latticeBox(w, h, v = 0, t = .08) { return boxUV(w, h, t, v / 3 + .002, .002, (v + 1) / 3 - .002, .998); }
function sign(text, style, w, h, x, y, z, vertical = false, ry = 0) {
  const uv = signUV(text, style, vertical);
  add('sign', boxUV(w, h, .07, uv[0], uv[1], uv[2], uv[3]), M(x, y, z, 0, ry, 0));
  add('wood', box(w + .16, h + .16, .05), M(x, y, z - .05, 0, ry, 0), 0x2a1a10);
}
function banner(ch, x, y, z, ry = Math.PI / 2, bg, fg) {
  const uv = bannerUV(ch, bg, fg);
  add('banner', planeUV(.62, 1.25, uv[0], uv[1], uv[2], uv[3]), M(x, y, z, 0, ry, 0));
}

/* ---------------- 木构商铺（江南老街）---------------- */
const WOOD_POSTS = [0x5A2E1E, 0x6B3A24, 0x4A3226, 0x7A2A1C];
const WALLS = [0xF1ECE0, 0xE9E2D2, 0xEDE4CF, 0xE2DDD3];
function houseWood(o) {
  const w = o.w, d = o.d, fl = o.floors || 2, h1 = 3.2, h2 = fl > 1 ? 2.8 : 0, H = .45 + h1 + h2;
  const post = o.post ?? wpick(WOOD_POSTS), wall = o.wall ?? wpick(WALLS), rise = fl > 1 ? 2.1 : 1.7;
  add('stone', box(w, .45, d + .3), M(0, .225, -d / 2 + .15), 0xB2AEA4);
  add('plaster', box(.3, H - .45, d - .9, 3), M(-w / 2 + .15, .45 + (H - .45) / 2, -(d + .9) / 2), wall, SHADE.damp);
  add('plaster', box(.3, H - .45, d - .9, 3), M(w / 2 - .15, .45 + (H - .45) / 2, -(d + .9) / 2), wall, SHADE.damp);
  add('plaster', box(w, H - .45, .3, 3), M(0, .45 + (H - .45) / 2, -d + .15), wall, SHADE.damp);
  add('wood', box(w - .5, h1, .12), M(0, .45 + h1 / 2, -1.05), 0x4a3024);
  if (fl > 1) add('wood', box(w - .3, h2, .12), M(0, .45 + h1 + h2 / 2, -.5), 0x6a4430);
  const nb = Math.max(2, Math.round(w / 2.7)), span = (w - .4) / nb;
  for (let i = 0; i <= nb; i++) add('wood', cyl(.12, .13, h1 + h2, 8), M(-w / 2 + .2 + i * span, .45 + (h1 + h2) / 2, -.25), post);
  const bays = o.bays || [];
  for (let b = 0; b < nb; b++) {
    const bx = -w / 2 + .2 + (b + .5) * span, bw = span - .26;
    const type = bays[b] || wpick(['board', 'board', 'open', 'door', 'window']);
    if (type === 'board') {
      for (let k = 0; k < 4; k++) add('wood', box(bw / 4 - .02, h1 - 1.0, .06, 1.5), M(bx - bw / 2 + (k + .5) * bw / 4, .45 + (h1 - 1) / 2, -.95), 0x9a6a44, null, .15);
    } else if (type === 'open') {
      add('wood', box(bw, .95, .55), M(bx, .45 + .475, -.72), 0x6a4630);
      add('plain', box(bw - .1, .03, .6), M(bx, .45 + .96, -.72), 0x3a2a20);
      goodsOn(bx, .45 + .98, -.72, bw);
    } else if (type === 'door') {
      add('door', boxUV(bw * .92, h1 - 1.0, .08, 0, 0, 1, 1), M(bx, .45 + (h1 - 1) / 2, -.96));
    } else {
      add('wood', box(bw, 1.0, .1), M(bx, .45 + .5, -.95), 0x7a4a30);
      add('lattice', latticeBox(bw, h1 - 2.0, (b + (o.seed | 0)) % 3), M(bx, .45 + 1.0 + (h1 - 2) / 2, -.95));
    }
    add('lattice', latticeBox(bw, .62, (b + 1) % 3), M(bx, .45 + h1 - .62, -.95));
  }
  add('wood', box(w, .28, .3), M(0, .45 + h1 - .12, -.25), post);
  if (fl > 1) {
    // 腰檐
    add('tile', box(w + .4, .07, 1.45, 1.6), M(0, .45 + h1 + .26, .22, .36, 0, 0), 0x9aa0a8);
    add('wood', box(w + .3, .12, .12), M(0, .45 + h1 + .02, .9), 0x3a2a20);
    // 二层窗 + 裙板 + 栏杆
    for (let b = 0; b < nb; b++) {
      const bx = -w / 2 + .2 + (b + .5) * span, bw = span - .26;
      add('wood', box(bw, .7, .08), M(bx, .45 + h1 + .75, -.36), 0x7a4a30);
      add('lattice', latticeBox(bw, 1.45, (b + (o.seed | 0) + 1) % 3), M(bx, .45 + h1 + 1.1 + .72, -.36));
    }
    add('wood', box(w, .2, .25), M(0, H - .1, -.3), post);
  }
  roof(w + .9, d + 1.3, rise, H, -d / 2, { lift: .5 });
  add('plaster', gableGeo(d, rise, .3), M(-w / 2 + .15, H, -d / 2), wall);
  add('plaster', gableGeo(d, rise, .3), M(w / 2 - .15, H, -d / 2), wall);
  // 招牌、灯笼、幌子
  if (o.sign) sign(o.sign, o.signStyle || wpick(['black', 'red', 'wood']), Math.min(3.2, w * .42), .72, 0, .45 + h1 - .62, -.08);
  if (o.lanterns !== false) { lantern(-w / 2 + 1.2, .45 + h1 - .45, .55); lantern(w / 2 - 1.2, .45 + h1 - .45, .55); }
  if (o.banner) {
    const bx = (o.bannerSide || 1) * (w / 2 - .3), by = .45 + h1 + (fl > 1 ? 1.9 : -.3);
    beam('wood', V(bx, by, -.2), V(bx, by + .25, 1.4), .035, 0x3a2418);
    banner(o.banner, bx, by - .45, 1.2, Math.PI / 2, o.bannerBg, o.bannerFg);
  }
  if (o.vsign) sign(o.vsign, o.vsignStyle || 'black', .42, 1.7, (w / 2 - .45) * (o.vside || -1), .45 + 1.6, .12, true);
  solidLocal(-w / 2, -d, w / 2, -.05, H + rise, '#3c3a38');
}
/* 柜台上的货 */
function goodsOn(x, y, z, w) {
  const kind = wpick(['steam', 'fruit', 'jar', 'books', 'cloth']);
  const n = Math.max(2, Math.floor(w / .55));
  for (let i = 0; i < n; i++) {
    const gx = x - w / 2 + (i + .5) * w / n;
    if (kind === 'steam') for (let k = 0; k < 3; k++) add('plain', cyl(.22, .22, .12, 12), M(gx, y + .06 + k * .13, z), k % 2 ? 0xC9A56A : 0xB8925A);
    if (kind === 'fruit') { add('plain', cyl(.22, .16, .16, 10), M(gx, y + .08, z), 0x8a6a3a); for (let k = 0; k < 4; k++) add('plain', sph(.07, 6, 5), M(gx + (k % 2 - .5) * .12, y + .2, z + (k > 1 ? .06 : -.06)), wpick([0xE06A2A, 0xD8B03A, 0x9AB03A, 0xC03A2A])); }
    if (kind === 'jar') add('glaze', lathe([[0, 0], [.12, .02], [.16, .15], [.12, .3], [.07, .34], [.08, .38], [0, .38]], 10), M(gx, y, z), wpick([0x4a2a1a, 0x2a3a4a, 0x6a3a2a]));
    if (kind === 'books') for (let k = 0; k < 4; k++) add('plain', box(.3, .05, .22), M(gx, y + .025 + k * .05, z, 0, (WR() - .5) * .4, 0), wpick([0x8a3a2a, 0x2a4a6a, 0xC9B38A, 0x3a5a3a]));
    if (kind === 'cloth') add('plain', box(.4, .18, .3), M(gx, y + .09, z), wpick([0xB03A4A, 0x3A5AA0, 0xD8B040, 0x5A8A6A]));
  }
}

/* ---------------- 徽派白墙（马头墙）---------------- */
function houseWhite(o) {
  const w = o.w, d = o.d, fl = o.floors || 2, H = .4 + (fl > 1 ? 6.0 : 3.6), rise = 1.6;
  const wall = o.wall ?? wpick([0xF4F0E6, 0xEFEBE0, 0xF2EEE4]);
  add('stone', box(w, .4, d), M(0, .2, -d / 2), 0xA8A49A);
  add('plaster', box(w, H - .4, d, 3), M(0, .4 + (H - .4) / 2, -d / 2), wall, SHADE.damp);
  // 檐下墨线
  add('plain', box(w + .02, .22, .06), M(0, H - .35, .02), 0x3a3a3c);
  add('plaster', box(w + .02, .12, .06), M(0, H - .13, .03), 0xffffff);
  const doorX = o.doorX ?? 0;
  if (o.door !== false) {
    add('stone', box(1.9, 2.75, .3), M(doorX, .4 + 1.375, .05), 0xBDB8AC);
    add('door', boxUV(1.35, 2.3, .06, 0, 0, 1, 1), M(doorX, .4 + 1.15, .22));
    // 门罩
    add('plain', box(2.6, .34, .2), M(doorX, .4 + 2.95, .12), 0x55585c);
    add('plaster', box(2.3, .22, .16), M(doorX, .4 + 3.25, .14), 0xffffff);
    add('tile', box(2.9, .07, .9, 1.5), M(doorX, .4 + 3.5, .38, .4, 0, 0), 0x9aa0a8);
    add('plain', box(2.9, .12, .14), M(doorX, .4 + 3.62, .02), 0x2e3136);
    add('stone', box(1.3, .15, .5), M(doorX, .4 + .07, .45), 0xA8A49A);
  }
  const wins = o.wins ?? (fl > 1 ? [-w / 3.3, w / 3.3] : []);
  for (const wx of wins) {
    const wy = .4 + 4.5;
    add('plain', box(1.2, 1.3, .06), M(wx, wy, .02), 0x2a2420);
    add('lattice', latticeBox(1.0, 1.1, 1), M(wx, wy, .06));
    add('tile', box(1.5, .05, .5, 1), M(wx, wy + .8, .2, .4, 0, 0), 0x9aa0a8);
  }
  if (o.lowWin) for (const wx of o.lowWin) { add('plain', box(1.0, .9, .06), M(wx, 2.1, .02), 0x2a2420); add('lattice', latticeBox(.84, .74, 2), M(wx, 2.1, .06)); }
  roof(w + .1, d + .9, rise, H, -d / 2, { lift: .15 });
  if (o.horse !== false) { horseWall(d, H, rise, -w / 2 + .18); horseWall(d, H, rise, w / 2 - .18); }
  else { add('plaster', gableGeo(d, rise, .3), M(-w / 2 + .15, H, -d / 2), wall); add('plaster', gableGeo(d, rise, .3), M(w / 2 - .15, H, -d / 2), wall); }
  if (o.sign) sign(o.sign, o.signStyle || 'black', Math.min(2.6, w * .4), .62, doorX, .4 + 2.62, .24);
  if (o.lanterns) { lantern(doorX - 1.25, .4 + 2.9, .5, .9); lantern(doorX + 1.25, .4 + 2.9, .5, .9); }
  if (o.vsign) sign(o.vsign, o.vsignStyle || 'black', .42, 1.7, doorX + 1.35 * (o.vside || 1), .4 + 1.5, .1, true);
  solidLocal(-w / 2, -d, w / 2, 0, H + rise, '#44464a');
}
/* 高墙（北巷用）：从 (x0,z0) 到 (x1,z1) 的直墙 */
function wallLine(x0, z0, x1, z1, h = 3.4, t = .4, col = 0xF1EDE3) {
  const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  add('plaster', box(t, h, L, 3), M(cx, h / 2, cz, 0, ang, 0), col, SHADE.damp);
  add('plain', box(t + .34, .14, L + .1), M(cx, h + .07, cz, 0, ang, 0), 0x2f3337);
  add('tile', box(t + .2, .1, L + .1, 1), M(cx, h + .19, cz, 0, ang, 0), 0x9aa0a8);
  const ex = Math.abs(Math.sin(ang)) > .5 ? 0 : t / 2 + .1, ez = Math.abs(Math.sin(ang)) > .5 ? t / 2 + .1 : 0;
  const a = wpt(x0, 0, z0), b = wpt(x1, 0, z1);
  addBox(Math.min(a.x, b.x) - ex, Math.min(a.z, b.z) - ez, Math.max(a.x, b.x) + ex, Math.max(a.z, b.z) + ez, h);
  MAPR.push({ x0: Math.min(a.x, b.x) - ex, x1: Math.max(a.x, b.x) + ex, z0: Math.min(a.z, b.z) - ez, z1: Math.max(a.z, b.z) + ez, c: '#5a5650' });
}

/* ---------------- 牌坊 ---------------- */
function paifang(name, w = 9, h = 6.2) {
  const px = [-w / 2, -w / 6, w / 6, w / 2];
  for (const x of px) {
    const outer = Math.abs(x) > w / 3;
    const ph = outer ? h - 1.2 : h;
    add('stone', box(.6, .7, 1.4), M(x, .35, 0), 0x9a968c);
    add('wood', box(.46, ph, .46), M(x, ph / 2, 0), 0x6E2418);
    add('stone', box(.3, 1.1, 1.1), M(x, .9, 0, .0), 0x8e8a80);
  }
  add('wood', box(w + .6, .45, .5), M(0, h - .6, 0), 0x6E2418);
  add('wood', box(w / 3 + .4, .35, .45), M(0, h - 1.7, 0), 0x6E2418);
  add('wood', box(w + .4, .35, .45), M(0, h - 2.2 - 1.2 * 0, 0), 0x3a4a5a);
  sign(name, 'black', 2.6, .8, 0, h - 1.15, .26);
  sign(name, 'black', 2.6, .8, 0, h - 1.15, -.26, false, Math.PI);
  roof(w / 3 + 1.2, 1.6, .7, h - .38, 0, { lift: .35 });
  roof(w / 3 + .6, 1.3, .55, h - 1.45, 0, { lift: .3 }); // 次间小顶偏移
  for (const sx of [-1, 1]) { pushXF(sx * w / 3, 0, 0); roof(w / 3 + .4, 1.3, .55, h - 1.55, 0, { lift: .3 }); popXF(); }
  lantern(-w / 6 - .9, h - 2.7, .45, 1.1); lantern(w / 6 + .9, h - 2.7, .45, 1.1);
  for (const x of px) { const p = wpt(x, 0, 0); addCirc(p.x, p.z, .55); }
}

/* ---------------- 道具 ---------------- */
function crate(x, z, s = 1, ry = 0, y = 0) {
  add('wood', box(.8 * s, .8 * s, .8 * s, 1), M(x, y + .4 * s, z, 0, ry, 0), 0xB08058, null, .2);
  add('wood', box(.84 * s, .08 * s, .84 * s, 1), M(x, y + .76 * s, z, 0, ry, 0), 0x7a5234);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .55 * s);
}
function barrel(x, z, s = 1) {
  add('wood', lathe([[0, 0], [.3, 0], [.36, .45], [.3, .9], [0, .9]], 12), M(x, 0, z, 0, 0, 0, s, s, s), 0x8a5a36);
  for (const y of [.15, .75]) add('metal', cyl(.335 * s, .335 * s, .05, 12, true), M(x, y * s, z), 0x3a3a3a);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .4 * s);
}
function jar(x, z, s = 1, col = 0x3a2418) {
  add('glaze', lathe([[0, 0], [.3, .02], [.46, .35], [.42, .7], [.34, .82], [.36, .88], [0, .88]], 14), M(x, 0, z, 0, 0, 0, s, s, s), col);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .45 * s);
}
function basket(x, z, y = 0) { add('plain', cyl(.3, .22, .3, 10), M(x, y + .15, z), 0xB89A5A); }
function bench(x, z, ry = 0) {
  add('stone', box(1.6, .12, .45), M(x, .45, z, 0, ry, 0), 0x9a968c);
  add('stone', box(.2, .45, .4), M(x - .6 * Math.cos(ry), .22, z + .6 * Math.sin(ry), 0, ry, 0), 0x8a867c);
  add('stone', box(.2, .45, .4), M(x + .6 * Math.cos(ry), .22, z - .6 * Math.sin(ry), 0, ry, 0), 0x8a867c);
}
function stoneLantern(x, z) {
  add('stone', box(.5, .3, .5), M(x, .15, z), 0x9a968c);
  add('stone', cyl(.1, .12, .8, 6), M(x, .7, z), 0x9a968c);
  add('stone', box(.45, .4, .45), M(x, 1.3, z), 0x8e8a80);
  add('glow', box(.28, .22, .47), M(x, 1.3, z), 0xFFB060);
  add('stone', cone(.45, .35, 4), M(x, 1.68, z, 0, Math.PI / 4, 0), 0x8a867c);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .35);
}
function lampPost(x, z) {
  add('wood', cyl(.07, .09, 3.2, 6), M(x, 1.6, z), 0x2a1a10);
  add('wood', box(.9, .08, .08), M(x + .4, 3.1, z), 0x2a1a10);
  lantern(x + .75, 2.65, z, .85);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .2);
}
function well(x, z) {
  add('stone', lathe([[.5, 0], [.8, 0], [.8, .75], [.62, .8], [.55, .75], [.55, .1]], 16), M(x, 0, z), 0x8a867c);
  add('plain', cyl(.56, .56, .02, 16), M(x, .55, z), 0x10151a);
  for (const sx of [-1, 1]) add('wood', box(.12, 1.7, .12), M(x + sx * .75, .85, z), 0x5a3a24);
  add('wood', cyl(.08, .08, 1.6, 8), M(x, 1.55, z, 0, 0, Math.PI / 2), 0x6a4a2a);
  add('wood', roofGeo(2, 1.4, .45, .1, 6, 4), M(x, 1.75, z), 0x5a3a24);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .9);
}
function stoneLion(x, z, ry) {
  pushXF(x, 0, z, ry);
  add('stone', box(1.0, .5, 1.3), M(0, .25, 0), 0x8a867c);
  add('stone', box(1.1, .12, 1.4), M(0, .56, 0), 0x9a968c);
  add('stone', box(.9, .25, 1.2), M(0, .74, 0), 0x86827a);
  const c = 0xA29E94, y = .86;
  add('stone', sph(1, 12, 9), M(0, y + .42, -.18, -.35, 0, 0, .36, .46, .42), c);            // 身
  add('stone', sph(1, 12, 9), M(0, y + .32, -.35, 0, 0, 0, .34, .3, .3), c);                 // 臀
  for (const s of [-1, 1]) { add('stone', cyl(.08, .1, .55, 8), M(s * .17, y + .27, .12), c); add('stone', sph(.1, 8, 6), M(s * .17, y + .05, .18, 0, 0, 0, 1, .6, 1.3), c); }
  add('stone', sph(.34, 12, 10), M(0, y + 1.0, .1), c);                                        // 头
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; add('stone', sph(.12, 6, 5), M(Math.cos(a) * .3, y + 1.0 + Math.sin(a) * .3, .0), 0x928e84); } // 鬃
  add('stone', sph(1, 10, 8), M(0, y + .92, .38, 0, 0, 0, .2, .14, .12), c);                  // 吻
  for (const s of [-1, 1]) add('stone', sph(.055, 6, 5), M(s * .12, y + 1.08, .4), 0x6a6660);  // 眼
  add('stone', sph(.13, 10, 8), M(.19, y + .12, .34), 0x928e84);                               // 绣球
  popXF();
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .75);
}
function postBox(x, z) {
  add('plain', cyl(.3, .3, 1.2, 14), M(x, .6, z), 0x2E6B3E);
  add('plain', sph(.3, 14, 7), M(x, 1.2, z, 0, 0, 0, 1, .5, 1), 0x2E6B3E);
  add('plain', box(.3, .05, .05), M(x, .95, z + .29), 0x111111);
  add('plain', box(.22, .14, .02), M(x, .7, z + .3), 0xE8D8A0);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .35);
}
function bicycle(x, z, ry = 0, col = 0x2E5A3A) {
  pushXF(x, 0, z, ry);
  for (const zz of [-.52, .52]) add('metal', new THREE.TorusGeometry(.32, .025, 6, 20), M(0, .34, zz, 0, Math.PI / 2, 0), 0x222222);
  beam('plain', V(0, .34, -.52), V(0, .75, -.05), .025, col);
  beam('plain', V(0, .75, -.05), V(0, .8, .42), .025, col);
  beam('plain', V(0, .34, .52), V(0, .8, .42), .025, col);
  beam('plain', V(0, .34, -.52), V(0, .36, .0), .025, col);
  beam('plain', V(0, .36, 0), V(0, .75, -.05), .025, col);
  add('plain', box(.12, .05, .25), M(0, .82, -.12), 0x222222);
  add('metal', box(.5, .03, .03), M(0, .98, .46), 0x333333);
  add('plain', box(.34, .25, .3), M(0, .98, .62), 0x6a5030);
  popXF();
}
function laundry(x0, z0, x1, z1, y = 2.9) {
  const a = wpt(x0, y, z0), b = wpt(x1, y, z1);
  beam('plain', new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z1), .01, 0x222222);
  const n = Math.floor(Math.hypot(x1 - x0, z1 - z0) / .9);
  for (let i = 1; i < n; i++) {
    if (WR() < .35) continue;
    const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t), ang = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    const w = .45 + WR() * .3, h = .5 + WR() * .5;
    const g = new THREE.PlaneGeometry(w, h); g.translate(0, -h / 2, 0);
    add('cloth', g, M(x, y, z, 0, ang, 0), wpick([0xC84A3A, 0x3A6AA8, 0xEEE6D2, 0xD8B040, 0x6A9A6A, 0x8A5AA0]));
  }
}
function stall(x, z, ry, cloth = 0xB03A2E, goods = 'steam', txt) {
  pushXF(x, 0, z, ry);
  add('wood', box(2.2, .9, .9), M(0, .45, 0), 0x7a5234);
  add('plain', box(2.3, .05, 1.0), M(0, .92, 0), 0x4a3424);
  for (const [sx, sz] of [[-1.05, -.4], [1.05, -.4], [-1.05, .4], [1.05, .4]]) add('wood', cyl(.04, .04, 2.4, 6), M(sx, 1.2, sz), 0x4a3424);
  // 条纹棚布
  for (let i = 0; i < 6; i++) { const g = new THREE.PlaneGeometry(.42, 1.6); g.rotateX(-Math.PI / 2 + .35); add('cloth', g, M(-1.05 + .21 + i * .42, 2.35, 0), i % 2 ? cloth : 0xF2E8D4); }
  goodsOn(0, .95, 0, 2.0);
  if (txt) sign(txt, 'paper', 1.3, .36, 0, 1.95, .5);
  lantern(1.0, 1.9, .55, .7);
  popXF();
  const p = wpt(x, 0, z); addCirc(p.x, p.z, 1.15);
}
function tableSet(x, z) {
  add('wood', cyl(.55, .55, .06, 14), M(x, .78, z), 0x6a4a2a);
  add('wood', cyl(.08, .12, .78, 8), M(x, .39, z), 0x5a3a24);
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + .3; add('wood', cyl(.2, .2, .45, 10), M(x + Math.cos(a) * .85, .225, z + Math.sin(a) * .85), 0x6a4a2a); }
  add('glaze', cyl(.07, .09, .12, 10), M(x + .15, .87, z), 0xE8E0D0);
  add('glaze', sph(.1, 10, 8), M(x - .15, .9, z, 0, 0, 0, 1, .8, 1), 0x3a5a6a);
  const p = wpt(x, 0, z); addCirc(p.x, p.z, .7);
}
function potPlant(x, z, s = 1) {
  add('glaze', lathe([[0, 0], [.2, 0], [.28, .38], [.3, .42], [0, .42]], 10), M(x, 0, z, 0, 0, 0, s, s, s), 0x6a3a2a);
  add('foliage', ico(.32 * s, 0), M(x, .6 * s, z), wpick([0x4a7a3a, 0x5a8a3a, 0x3a6a3a]));
}
function rock(x, z, s = 1, y = 0) {
  const g = ico(1, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const k = .75 + WR() * .5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 1.3, p.getZ(i) * k); }
  g.computeVertexNormals();
  add('stone', g, M(x, y + .5 * s, z, WR(), WR() * 3, 0, s, s, s), 0xA8A49C);
}

/* ---------------- 树 ---------------- */
function trunk(x, z, h, r, col = 0x5a4030, lean = 0) {
  add('plain', cyl(r * .6, r, h, 8), M(x, h / 2, z, lean, 0, 0), col, null, .1);
}
function ginkgo(x, z, s = 1, y = 0) {
  pushXF(x, y, z, WR() * 6, s);
  add('plain', cyl(.14, .26, 5.2, 8), M(0, 2.6, 0), 0x6a5040);
  for (let i = 0; i < 5; i++) { const a = i * 1.3 + WR(); beam('plain', V(0, 2.4 + i * .5, 0), V(Math.cos(a) * 1.6, 3.6 + i * .5, Math.sin(a) * 1.6), .06, 0x6a5040); }
  const cols = [0xE8B830, 0xDDA626, 0xF2C84A, 0xD49A22, 0xEFC040];
  for (let i = 0; i < 10; i++) {
    const a = WR() * 6.28, r = .5 + WR() * 1.3, yy = 3.2 + WR() * 3.4, rr = (1.3 - (yy - 3.2) / 6) * (1 + WR() * .5);
    add('foliage', ico(rr, 1), M(Math.cos(a) * r, yy, Math.sin(a) * r, 0, 0, 0, 1, .8, 1), wpick(cols), null, .12);
  }
  popXF();
  addCirc(x, z, .45 * s);
}
function willow(x, z, s = 1) {
  pushXF(x, 0, z, WR() * 6, s);
  add('plain', cyl(.18, .3, 3.4, 8), M(0, 1.7, 0, .12, 0, 0), 0x5a4a3a);
  for (let i = 0; i < 4; i++) { const a = i * 1.6; beam('plain', V(.1, 3.2, .1), V(Math.cos(a) * 1.3, 4.3, Math.sin(a) * 1.3), .07, 0x5a4a3a); }
  add('foliage', ico(1.3, 1), M(.2, 4.3, .3, 0, 0, 0, 1.3, .55, 1.3), 0x5E7A34);
  for (let i = 0; i < 44; i++) {
    const a = WR() * 6.28, r = .5 + WR() * 1.5, h = 1.6 + WR() * 2.4;
    const g = new THREE.PlaneGeometry(.14, h); g.translate(0, -h / 2, 0);
    add('willow', g, M(Math.cos(a) * r + .2, 4.4 - r * .25 + WR() * .3, Math.sin(a) * r + .3, 0, a + Math.PI / 2, 0), wpick([0x6E8C3A, 0x5E7C30, 0x7E9A44, 0x587430]));
  }
  popXF();
  addCirc(x, z, .45 * s);
}
function osmanthus(x, z, s = 1, y = 0) { // 桂花树
  pushXF(x, y, z, WR() * 6, s);
  add('plain', cyl(.12, .2, 1.8, 7), M(0, .9, 0), 0x5a4a3a);
  for (let i = 0; i < 6; i++) add('foliage', ico(.9 + WR() * .3, 1), M((WR() - .5) * 1.2, 2.2 + WR() * 1.1, (WR() - .5) * 1.2), wpick([0x3E6A34, 0x4A7A3A, 0x36602E]));
  for (let i = 0; i < 26; i++) { const a = WR() * 6.28, r = .9 + WR() * .5; add('plain', sph(.06, 4, 3), M(Math.cos(a) * r, 2.0 + WR() * 1.5, Math.sin(a) * r), wpick([0xF2B640, 0xE8A030])); }
  popXF();
  addCirc(x, z, .35 * s);
}
function pine(x, z, s = 1) {
  pushXF(x, 0, z, WR() * 6, s);
  add('plain', cyl(.12, .24, 4.2, 7), M(0, 2.1, 0, .1, 0, .08), 0x5a4232);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + WR(), yy = 2.4 + i * .8, r = 1.2 - i * .15;
    beam('plain', V(0, yy - .3, 0), V(Math.cos(a) * r, yy, Math.sin(a) * r), .05, 0x5a4232);
    add('foliage', sph(1, 8, 5), M(Math.cos(a) * r, yy + .1, Math.sin(a) * r, 0, 0, 0, 1.1 - i * .12, .35, 1.0 - i * .12), wpick([0x2E4E2E, 0x355a34, 0x2a4a2c]));
  }
  popXF(); addCirc(x, z, .3 * s);
}
function bamboo(x, z, n = 9) {
  for (let i = 0; i < n; i++) {
    const bx = x + (WR() - .5) * 1.6, bz = z + (WR() - .5) * 1.6, h = 4 + WR() * 2.5;
    add('plain', cyl(.04, .05, h, 5), M(bx, h / 2, bz, (WR() - .5) * .12, 0, (WR() - .5) * .12), 0x6A8A3A);
    for (let k = 0; k < 3; k++) add('foliage', ico(.45, 0), M(bx + (WR() - .5), h - k * .7, bz + (WR() - .5), 0, 0, 0, 1.4, .5, 1.1), wpick([0x5A8A3A, 0x6A9A40, 0x4A7A30]));
  }
  addCirc(x, z, .9);
}
function lotus(x, z, y) { add('plain', cyl(.35 + WR() * .2, .35, .02, 12), M(x, y, z), wpick([0x4A7A3A, 0x5A8A40])); if (WR() < .3) add('plain', cone(.1, .22, 6), M(x + .1, y + .12, z), 0xF0A0B0); }
