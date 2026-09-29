/* ============================================================
 * 角色：分骨骼 Q 版人物（每根骨骼一个合并网格 + 顶点色）
 * 朝向 +z；角色左手在 +x
 * ============================================================ */
const CHAR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7, metalness: 0 });
function partsMesh(list) {
  const geos = list.map(([geo, m, col]) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const n = g.attributes.position.count, c = LC(col), arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
  });
  const mesh = new THREE.Mesh(mergeList(geos), CHAR_MAT);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
const S1 = (s = 1, a = 12, b = 9) => new THREE.SphereGeometry(s, a, b);
function Mx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { return M(x, y, z, rx, ry, rz, sx, sy, sz); }

function makeChar(sp) {
  const k = sp.scale || 1, bw = sp.build || 1, fem = !!sp.female;
  const skin = sp.skin || '#F0CBA8', hc = sp.hairCol || '#2a1d16', top = sp.top || '#666', pants = sp.pants || '#333', shoe = sp.shoes || '#2a2420';
  const legCol = sp.skirt ? (sp.legs || skin) : pants;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(k); root.add(body);
  const hips = new THREE.Group(); hips.position.y = .88; body.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const head = new THREE.Group(); head.position.y = .55; torso.add(head);
  const shL = new THREE.Group(), shR = new THREE.Group(), elL = new THREE.Group(), elR = new THREE.Group();
  shL.position.set(.2 * bw, .44, 0); shR.position.set(-.2 * bw, .44, 0); elL.position.y = -.27; elR.position.y = -.27;
  torso.add(shL, shR); shL.add(elL); shR.add(elR);
  const thL = new THREE.Group(), thR = new THREE.Group(), knL = new THREE.Group(), knR = new THREE.Group();
  thL.position.set(.09 * bw, -.03, 0); thR.position.set(-.09 * bw, -.03, 0); knL.position.y = -.41; knR.position.y = -.41;
  hips.add(thL, thR); thL.add(knL); thR.add(knR);

  /* ---- 躯干 ---- */
  const T = [], Hd = [], Hp = [];
  const waist = fem ? .135 : .155, chest = fem ? .175 : .19;
  const tprof = [[0, .02], [.155, .03], [waist + .01, .12], [waist, .22], [chest - .01, .34], [chest + .01, .42], [.165, .48], [.08, .52], [0, .53]];
  T.push([lathe(tprof, 16), Mx(0, 0, 0, 0, 0, 0, bw, 1, .72), top]);
  T.push([cyl(.052, .058, .12, 10), Mx(0, .56, 0), skin]);
  Hp.push([lathe([[0, -.15], [.13, -.14], [.165 * 1, -.06], [.17, .03], [.16, .06], [0, .06]], 14), Mx(0, 0, 0, 0, 0, 0, bw, 1, .76), sp.skirt ? sp.skirtCol || pants : pants]);
  const coat = sp.coat; // {len, col, flare}
  if (coat) Hp.push([lathe([[.001, -coat.len - .001], [.19 + (coat.flare ?? .05), -coat.len], [.19, -.12], [.168, .05]], 16), Mx(0, 0, 0, 0, 0, 0, bw, 1, .8), coat.col || top]);
  if (sp.skirt) Hp.push([lathe([[.001, -sp.skirt - .001], [.25, -sp.skirt], [.2, -.1], [.16, .05]], 16), Mx(0, 0, 0, 0, 0, 0, bw, 1, .82), sp.skirtCol || pants]);
  if (sp.belt) T.push([cyl(.162, .162, .045, 16), Mx(0, .14, 0, 0, 0, 0, bw, 1, .74), sp.belt]);
  if (sp.collar) T.push([new THREE.TorusGeometry(.085, .03, 6, 14), Mx(0, .5, .005, Math.PI / 2, 0, 0, 1, 1, .8), sp.collar]);
  if (sp.scarf) { T.push([new THREE.TorusGeometry(.078, .035, 6, 14), Mx(0, .52, 0, Math.PI / 2 - .15, 0, 0), sp.scarf]); T.push([box(.07, .26, .03, 1), Mx(.05, .36, .135, -.15, 0, .1), sp.scarf]); }
  if (sp.buttons) for (let i = 0; i < 4; i++) { T.push([S1(.014, 6, 4), Mx(.04, .1 + i * .085, .128), sp.buttons]); T.push([S1(.014, 6, 4), Mx(-.04, .1 + i * .085, .128), sp.buttons]); }
  if (sp.vest) { T.push([lathe(tprof.map(([r, y]) => [r * 1.06, y]), 16), Mx(0, 0, 0, 0, 0, 0, bw, .96, .74), sp.vest]); T.push([box(.09, .4, .02, 1), Mx(0, .25, .135), top]); }
  if (sp.apron) { T.push([box(.24, .32, .02, 1), Mx(0, .3, .128), sp.apron]); Hp.push([box(.3, .42, .02, 1), Mx(0, -.14, .14), sp.apron]); }
  if (sp.shirt) { T.push([box(.1, .14, .02, 1), Mx(0, .42, .13, -.1), sp.shirt]); if (sp.tie) T.push([box(.035, .2, .02, 1), Mx(0, .36, .138), sp.tie]); }
  if (sp.hood) T.push([new THREE.TorusGeometry(.1, .045, 6, 12, Math.PI), Mx(0, .5, -.07, 0, 0, Math.PI), top]);
  if (sp.strap) T.push([box(.035, .62, .02, 1), Mx(0, .26, 0, 0, 0, sp.strapSide || .75), sp.strap]);
  if (sp.bag) Hp.push([box(.2, .16, .08, 1), Mx(-.2 * (sp.bagSide || 1), -.02, .02), sp.bag]);
  if (sp.camera) { T.push([box(.12, .08, .06, 1), Mx(-.04, .3, .15), '#1c1c1e']); T.push([cyl(.03, .03, .04, 10), Mx(-.04, .3, .19, Math.PI / 2), '#333']); }
  if (sp.pocket) T.push([box(.2, .07, .02, 1), Mx(0, .12, .125), sp.pocket]);

  /* ---- 头 ---- */
  const hy = .17;
  Hd.push([S1(.185, 18, 14), Mx(0, hy, 0, 0, 0, 0, 1, 1.04, .98), skin]);
  for (const s of [-1, 1]) Hd.push([S1(.04, 8, 6), Mx(s * .18, hy - .01, 0, 0, 0, 0, .6, 1, 1), skin]);
  for (const s of [-1, 1]) {
    Hd.push([S1(1, 10, 8), Mx(s * .066, hy, .163, 0, 0, 0, .024, .034, .014), '#231815']);
    Hd.push([S1(.009, 6, 4), Mx(s * .06, hy + .013, .176), '#FFFFFF']);
    Hd.push([box(.056, .013, .012, 1), Mx(s * .068, hy + .055, .168, 0, 0, s * (sp.brow ?? -.08)), hc]);
    if (fem || sp.blush) Hd.push([S1(1, 8, 6), Mx(s * .105, hy - .05, .152, 0, 0, 0, .03, .016, .008), '#EE9E90']);
  }
  Hd.push([S1(.019, 6, 5), Mx(0, hy - .03, .182), skin]);
  Hd.push([box(.046, .011, .01, 1), Mx(0, hy - .075, .172), fem ? '#B8484A' : '#8A4A40']);
  if (sp.beard) Hd.push([S1(1, 8, 6), Mx(0, hy - .1, .14, 0, 0, 0, .06, .04, .03), sp.beard]);
  if (sp.glasses) for (const s of [-1, 1]) { Hd.push([new THREE.TorusGeometry(.042, .007, 5, 14), Mx(s * .066, hy, .18), sp.glasses]); Hd.push([box(.04, .006, .006, 1), Mx(0, hy + .005, .183), sp.glasses]); }
  if (sp.shades) for (const s of [-1, 1]) Hd.push([box(.07, .04, .01, 1), Mx(s * .065, hy + .005, .18), '#0a0a0a']);
  // 发型
  const cap = (r = .197, th = .55, tilt = -.28) => [new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI * th), Mx(0, hy, -.005, tilt), hc];
  const hs = sp.hair || 'short';
  if (hs !== 'bald') Hd.push(cap());
  if (hs === 'short') { for (const [x, sx] of [[-.07, .1], [.03, .12], [.11, .07]]) Hd.push([S1(1, 8, 6), Mx(x, hy + .13, .13, -.5, 0, 0, sx, .05, .06), hc]); }
  if (hs === 'messy') { for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; Hd.push([cone(.045, .13, 5), Mx(Math.cos(a) * .12, hy + .17, Math.sin(a) * .1 - .02, Math.sin(a) * .7, 0, -Math.cos(a) * .7), hc]); } Hd.push([S1(1, 8, 6), Mx(-.02, hy + .12, .14, -.6, 0, .2, .14, .05, .06), hc]); }
  if (hs === 'bob' || hs === 'long' || hs === 'wavy') {
    Hd.push([new THREE.SphereGeometry(.208, 18, 12, Math.PI - .45, Math.PI + .9, 0, Math.PI * .72), Mx(0, hy, -.01, 0, 0, 0, 1.04, 1, 1.02), hc]);
    Hd.push([box(.3, .07, .06, 1), Mx(0, hy + .14, .15, -.35), hc]);
    if (hs === 'long' || hs === 'wavy') {
      Hd.push([box(.32, .42, .08, 1), Mx(0, hy - .22, -.12), hc]);
      if (hs === 'wavy') for (let i = 0; i < 4; i++) Hd.push([S1(.07, 8, 6), Mx(-.12 + i * .08, hy - .42, -.11), hc]);
      for (const s of [-1, 1]) Hd.push([box(.07, .34, .07, 1), Mx(s * .16, hy - .14, .03), hc]);
    }
  }
  if (hs === 'bun') { Hd.push([S1(.1, 12, 10), Mx(0, hy + .2, -.08), hc]); for (const [x, sx] of [[-.08, .1], [.08, .1]]) Hd.push([S1(1, 8, 6), Mx(x, hy + .12, .14, -.5, 0, 0, sx, .05, .06), hc]); for (const s of [-1, 1]) Hd.push([box(.04, .16, .05, 1), Mx(s * .17, hy - .05, .06), hc]); }
  if (hs === 'ponytail') { Hd.push([S1(.06, 8, 6), Mx(0, hy + .08, -.2), hc]); Hd.push([cone(.07, .32, 8), Mx(0, hy - .12, -.24, .3), hc]); Hd.push([box(.3, .06, .06, 1), Mx(0, hy + .14, .15, -.35), hc]); }
  if (hs === 'bald') { Hd.push([new THREE.SphereGeometry(.2, 16, 6, Math.PI - .6, Math.PI + 1.2, Math.PI * .42, Math.PI * .2), Mx(0, hy, 0), hc]); }
  if (sp.hat === 'courier') { Hd.push([new THREE.SphereGeometry(.21, 16, 8, 0, Math.PI * 2, 0, Math.PI * .5), Mx(0, hy + .06, -.01, -.1, 0, 0, 1, .72, 1), sp.hatCol]); Hd.push([box(.24, .02, .14, 1), Mx(0, hy + .08, .22, .25), sp.hatCol]); Hd.push([box(.1, .05, .01, 1), Mx(0, hy + .14, .2, -.2), '#E8D8A0']); }
  if (sp.hat === 'postal') { Hd.push([cyl(.2, .2, .1, 16), Mx(0, hy + .2, 0), sp.hatCol]); Hd.push([box(.22, .02, .12, 1), Mx(0, hy + .15, .2, .2), '#111']); Hd.push([S1(.02, 6, 4), Mx(0, hy + .21, .2), '#D8B040']); }
  if (sp.hat === 'straw') { Hd.push([cone(.4, .14, 16), Mx(0, hy + .24, 0), '#D8C080']); Hd.push([cyl(.14, .16, .1, 12), Mx(0, hy + .3, 0), '#C8B070']); }
  if (sp.hat === 'scarf') { Hd.push([new THREE.SphereGeometry(.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * .56), Mx(0, hy, -.01, -.35), sp.hatCol]); Hd.push([S1(.05, 6, 5), Mx(0, hy - .12, -.17), sp.hatCol]); }
  if (sp.hat === 'beret') { Hd.push([S1(1, 14, 8), Mx(.03, hy + .19, -.02, 0, 0, .2, .2, .06, .2), sp.hatCol]); }

  /* ---- 四肢 ---- */
  const sleeve = sp.sleeve || top;
  const armU = [[cyl(.058, .05, .27, 10), Mx(0, -.135, 0), sleeve], [S1(.058, 10, 8), Mx(0, 0, 0), sleeve]];
  const armF = [[cyl(.049, .042, .21, 10), Mx(0, -.105, 0), sp.shortSleeve ? skin : sleeve], [S1(.046, 10, 8), Mx(0, -.25, .005, 0, 0, 0, .9, 1.05, .8), skin]];
  if (sp.cuff) armF.push([cyl(.052, .052, .03, 10), Mx(0, -.2, 0), sp.cuff]);
  const legU = [[cyl(.075, .063, .41, 10), Mx(0, -.205, 0), legCol]];
  const legD = [[cyl(.06, .048, .38, 10), Mx(0, -.19, 0), sp.skirt ? legCol : pants], [S1(1, 10, 8), Mx(0, -.405, .035, 0, 0, 0, .062, .05, .12), shoe]];
  if (sp.robe) legD[0][2] = pants;

  torso.add(partsMesh(T)); head.add(partsMesh(Hd)); hips.add(partsMesh(Hp));
  shL.add(partsMesh(armU)); shR.add(partsMesh(armU)); elL.add(partsMesh(armF)); elR.add(partsMesh(armF));
  thL.add(partsMesh(legU)); thR.add(partsMesh(legU)); knL.add(partsMesh(legD)); knR.add(partsMesh(legD));

  /* 名牌 */
  let tag = null;
  if (sp.tag) {
    const tex = tagTexture(sp.tag, sp.tagCol || '#A63325');
    tag = new THREE.Mesh(new THREE.PlaneGeometry(.2, .25), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .12, roughness: .8 }));
    tag.position.set(0, .3, -.132); tag.rotation.y = Math.PI; torso.add(tag);
  }
  /* 手机（右手） */
  const phone = new THREE.Group();
  const pb = new THREE.Mesh(new THREE.BoxGeometry(.05, .095, .012), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: .3 }));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(.042, .082), new THREE.MeshBasicMaterial({ color: 0xBFE4FF }));
  scr.position.z = .0065; phone.add(pb, scr); phone.position.set(0, -.28, .04); phone.visible = false; elR.add(phone);
  /* 手持物 */
  if (sp.hold === 'briefcase') { const bc = partsMesh([[box(.3, .22, .08, 1), Mx(0, -.38, 0), '#3a2418'], [box(.1, .03, .02, 1), Mx(0, -.26, 0), '#222']]); elL.add(bc); }
  if (sp.hold === 'lantern') { const ln = partsMesh([[cyl(.006, .006, .3, 4), Mx(0, -.3, .12, .6), '#3a2418'], [S1(.1, 10, 8), Mx(0, -.44, .26, 0, 0, 0, 1, 1.2, 1), '#D8321E'], [cyl(.05, .05, .03, 8), Mx(0, -.32, .26), '#C9A04A']]); elR.add(ln); }
  if (sp.hold === 'rod') { const rd = partsMesh([[cyl(.012, .006, 2.6, 5), Mx(0, -.3, 1.1, 1.25), '#6a4a2a']]); elR.add(rd); }
  if (sp.hold === 'book') { const bk = partsMesh([[box(.18, .24, .03, 1), Mx(0, -.28, .07, .3), '#6a2a1a']]); elL.add(bk); }
  if (sp.hold === 'box') { const bx = partsMesh([[box(.3, .22, .24, 1), Mx(0, -.2, .18), '#B08A58']]); elL.add(bx); }

  const ch = {
    root, body, hips, torso, head, shL, shR, elL, elR, thL, thR, knL, knR, tag, phone, screen: scr, sp,
    a: { ph: Math.random() * 6, spd: 0, crouch: 0, act: null, actW: 0, lookYaw: 0, lookPitch: 0, seed: Math.random() * 10 },
    C: {}, height: 1.8 * k,
  };
  root.traverse(o => { if (o.isMesh) o.userData.ch = ch; });
  return ch;
}

/* ---------------- 动画 ---------------- */
const JOINTS = ['hipY', 'hipRY', 'tRX', 'tRY', 'tRZ', 'hRX', 'hRY', 'hRZ', 'sLX', 'sLZ', 'sRX', 'sRZ', 'eL', 'eR', 'tL', 'tR', 'kL', 'kR'];
const ACTS = {
  phone: (T, t) => { T.sRX = -.45; T.sRZ = -.4; T.eR = -2.35; T.hRZ = .14; },
  photo: (T, t) => { T.sLX = T.sRX = -1.25; T.sLZ = -.3; T.sRZ = .3; T.eL = T.eR = -1.05; T.hRX = -.05; },
  crouchPhoto: (T, t) => { T.sLX = T.sRX = -.9; T.sLZ = -.3; T.sRZ = .3; T.eL = T.eR = -1.35; T.hRX = .25; },
  talk: (T, t) => { T.sRX = -.45 + Math.sin(t * 4) * .22; T.eR = -1.2 + Math.sin(t * 3) * .35; T.sLX = -.15; T.eL = -.5; T.hRX += Math.sin(t * 3.3) * .05; },
  think: (T, t) => { T.sRX = -.75; T.sRZ = .15; T.eR = -2.25; T.sLX = -.35; T.sLZ = -.35; T.eL = -1.6; T.hRX = .18; },
  read: (T, t) => { T.sLX = T.sRX = -.8; T.sLZ = -.2; T.sRZ = .2; T.eL = T.eR = -1.2; T.hRX = .4; },
  wave: (T, t) => { T.sRZ = -2.65 + Math.sin(t * 9) * .25; T.eR = -.35; },
  cheer: (T, t) => { T.sLZ = 2.7 + Math.sin(t * 8) * .15; T.sRZ = -2.7 - Math.sin(t * 8) * .15; T.eL = T.eR = -.3; },
  point: (T, t) => { T.sRX = -1.5; T.eR = -.1; },
  dig: (T, t) => { T.tRX = .75; const s = Math.sin(t * 7); T.sLX = T.sRX = -1.1 + s * .55; T.eL = T.eR = -.35; },
  lantern: (T, t) => { T.sRX = -.55; T.eR = -1.15; },
  fish: (T, t) => { T.sLX = T.sRX = -.95; T.sLZ = -.25; T.sRZ = .25; T.eL = T.eR = -.5; },
  tear: (T, t) => { T.sRX = -1.8; T.eR = -.15; T.tRX += .3; },
  hands: (T, t) => { T.sLZ = 2.3; T.sRZ = -2.3; T.eL = T.eR = -1.4; },
  cross: (T, t) => { T.sLX = T.sRX = -.55; T.sLZ = -.55; T.sRZ = .55; T.eL = T.eR = -1.95; },
  carry: (T, t) => { T.sLX = -.5; T.eL = -1.4; T.sLZ = -.1; },
  shrug: (T, t) => { T.sLZ = .6; T.sRZ = -.6; T.eL = T.eR = -1.5; T.sLX = T.sRX = -.3; },
};
function animChar(ch, dt, t) {
  const a = ch.a, s = a.spd;
  const walk = clamp(s / 2.2, 0, 1), run = clamp((s - 3.5) / 4.5, 0, 1), cr = a.crouch;
  const stride = lerp(1.25, 2.8, run);
  a.ph += dt * s / stride * Math.PI * 2;
  const sn = Math.sin(a.ph), cs = Math.cos(a.ph);
  const legA = (.5 * walk + .42 * run) * (1 - .45 * cr), kneeA = .45 * walk + 1.0 * run;
  const T = {};
  T.tL = -sn * legA - .9 * cr; T.tR = sn * legA - .9 * cr;
  T.kL = .06 + Math.max(0, cs) * kneeA + 1.55 * cr; T.kR = .06 + Math.max(0, -cs) * kneeA + 1.55 * cr;
  T.sLX = sn * (.42 * walk + .85 * run); T.sRX = -sn * (.42 * walk + .85 * run);
  T.sLZ = .08; T.sRZ = -.08;
  T.eL = T.eR = -(.15 + .2 * walk + 1.15 * run);
  const breath = Math.sin(t * 1.9 + a.seed) * .012;
  T.hipY = .88 - Math.abs(sn) * .03 * walk - Math.abs(sn) * .05 * run + .03 * run - .3 * cr;
  T.hipRY = -sn * .07 * walk;
  T.tRX = .03 * walk + .24 * run + breath + .38 * cr; T.tRY = sn * .08 * (walk + run); T.tRZ = 0;
  T.hRX = -.03 * run - .25 * cr; T.hRY = clamp(a.lookYaw, -1.15, 1.15); T.hRZ = 0;
  if (s < .2 && !a.act) { T.sLZ += Math.sin(t * .9 + a.seed) * .03; T.hRZ = Math.sin(t * .5 + a.seed) * .04; }
  if (a.act && ACTS[a.act]) {
    const B = {}; for (const kk of JOINTS) B[kk] = T[kk];
    ACTS[a.act](B, t);
    const w = a.actW; for (const kk of JOINTS) T[kk] = lerp(T[kk], B[kk], w);
  }
  a.actW = a.act ? Math.min(1, a.actW + dt * 5) : 0;
  const C = ch.C, r = Math.min(1, dt * 14);
  for (const kk of JOINTS) C[kk] = C[kk] === undefined ? T[kk] : C[kk] + (T[kk] - C[kk]) * r;
  ch.hips.position.y = C.hipY; ch.hips.rotation.y = C.hipRY;
  ch.torso.rotation.set(C.tRX, C.tRY, C.tRZ);
  ch.head.rotation.set(C.hRX, C.hRY, C.hRZ);
  ch.shL.rotation.set(C.sLX, 0, C.sLZ); ch.shR.rotation.set(C.sRX, 0, C.sRZ);
  ch.elL.rotation.x = C.eL; ch.elR.rotation.x = C.eR;
  ch.thL.rotation.x = C.tL; ch.thR.rotation.x = C.tR; ch.knL.rotation.x = C.kL; ch.knR.rotation.x = C.kR;
  ch.phone.visible = a.act === 'phone' || a.act === 'photo' || a.act === 'crouchPhoto';
}
function setAct(ch, act) { if (ch.a.act !== act) { ch.a.act = act; ch.a.actW = 0; } }

/* ---------------- 角色设定 ---------------- */
const SPECS = {
  bai: { tag: '白', tagCol: '#A63325', hair: 'short', hairCol: '#1e1612', top: '#C9B68C', coat: { len: .52, flare: .07 }, belt: '#6a5438', collar: '#B8A47A', scarf: '#7A2E2A', pants: '#3a3a40', shoes: '#4a3020', buttons: '#5a4630', cuff: '#B8A47A' },
  fubo: { hair: 'bald', hairCol: '#BDB8B0', top: '#3D3A35', coat: { len: .82, flare: .1, col: '#3D3A35' }, robe: true, pants: '#222', shoes: '#111', glasses: '#8a6a30', collar: '#2a2824', beard: '#CFCAC0', hold: 'lantern', skin: '#E8C09A', scale: .96 },
  shen: { tag: '沈', tagCol: '#5B4A7A', hair: 'messy', hairCol: '#241a14', top: '#5B4A7A', hood: true, pocket: '#4B3A6A', pants: '#2a2a33', shoes: '#DDD', glasses: '#222', scarf: null, strap: '#333', strapSide: -.7 },
  gu: { tag: '顾', tagCol: '#B05672', female: true, hair: 'wavy', hairCol: '#4a2a1c', top: '#C0607A', coat: { len: .34, flare: .08 }, buttons: '#F2E4D0', collar: '#A84E68', pants: '#2a2020', skirt: 0, shoes: '#3a1a1a', camera: true, strap: '#222', scale: .96 },
  tang: { tag: '汤', tagCol: '#C98A3D', female: true, hair: 'bun', hairCol: '#3a2418', top: '#E3A447', build: 1.12, apron: '#F6F1E6', skirt: .44, skirtCol: '#8A5A3A', legs: '#EED0B0', shoes: '#8a3a2a', blush: true, scale: .93, cuff: '#F6F1E6' },
  zheng: { tag: '郑', tagCol: '#4E7A55', hair: 'short', hairCol: '#1a1410', top: '#8A8C8E', vest: '#3F6B4A', hat: 'courier', hatCol: '#3F6B4A', pants: '#4a4a3a', shoes: '#2a2a2a', bag: '#2a3a2e', bagSide: 1, strap: '#2a3a2e', skin: '#D8A880', shortSleeve: true, sleeve: '#8A8C8E' },
  lin: { tag: '林', tagCol: '#3E6B8A', female: true, hair: 'bob', hairCol: '#0e0c0c', top: '#2E4A66', shirt: '#F4F4F0', skirt: .46, skirtCol: '#2E4A66', legs: '#3a3030', shoes: '#111', hold: 'briefcase', scale: .97, cuff: '#F4F4F0' },
  wang: { female: true, hair: 'bun', hairCol: '#6a6260', hat: 'scarf', hatCol: '#3A6A9A', top: '#9A4A3A', apron: '#E8E0D0', skirt: .5, skirtCol: '#3a3a4a', legs: '#3a3a4a', shoes: '#222', build: 1.12, scale: .92, skin: '#E0B090' },
  liu: { hair: 'short', hairCol: '#9a9690', hat: 'straw', top: '#7A8A9A', pants: '#4a4a3a', shoes: '#333', hold: 'rod', beard: '#BBB', skin: '#D0A078', scale: .95 },
  boss: { female: true, hair: 'bun', hairCol: '#1a1010', top: '#6A2A4A', coat: { len: .7, flare: .04 }, collar: '#6A2A4A', pants: '#222', shoes: '#222', scale: .96 },
  chen: { hair: 'short', hairCol: '#6a6660', hat: 'postal', hatCol: '#2E5A3A', top: '#2E5A3A', buttons: '#D8B040', pants: '#2E3A30', shoes: '#111', glasses: '#333', belt: '#222' },
  shu: { hair: 'bald', hairCol: '#9a9690', top: '#6A5A48', buttons: '#3a3024', pants: '#3a3228', shoes: '#222', glasses: '#222', hold: 'book', beard: '#AAA', scale: .94 },
  black: { hair: 'short', hairCol: '#0a0a0a', top: '#161618', shirt: '#EEE', tie: '#111', pants: '#161618', shoes: '#080808', shades: true, build: 1.08 },
};
const RANDOM_TOPS = ['#8A4A3A', '#3A5A7A', '#6A7A4A', '#7A6A5A', '#A08050', '#4A4A5A', '#9A6A7A', '#5A7A7A', '#B0906A', '#6A3A3A'];
function randomSpec(i) {
  const r = mulberry32(i * 977 + 13);
  const pk = a => a[(r() * a.length) | 0];
  const fem = r() < .5, old = r() < .3, kid = !old && r() < .2;
  return {
    female: fem, hair: fem ? pk(['bun', 'bob', 'ponytail', 'long']) : pk(['short', 'short', 'messy', old ? 'bald' : 'short']),
    hairCol: old ? pk(['#9a9690', '#BDB8B0', '#6a6660']) : pk(['#1a1410', '#2a1d16', '#3a2418', '#4a2a1c']),
    top: pk(RANDOM_TOPS), pants: pk(['#2a2a33', '#3a3a3a', '#4a4030', '#2E3A4A']), shoes: pk(['#222', '#3a2a20', '#DDD']),
    skirt: fem && r() < .4 ? .45 : 0, skirtCol: pk(['#3a3a4a', '#6a3a3a', '#2a4a4a']), legs: '#3a3030',
    coat: !fem && old && r() < .5 ? { len: .7, flare: .08 } : null, hat: old && r() < .3 ? (fem ? 'scarf' : 'straw') : null, hatCol: pk(['#3A6A9A', '#8A3A3A', '#5A6A3A']),
    glasses: r() < .2 ? '#222' : null, skin: pk(['#F0CBA8', '#E8BC98', '#D9A77F', '#E0B090']),
    scale: kid ? .66 : old ? .94 : .95 + r() * .08, build: .95 + r() * .15, kid,
  };
}

/* ---------------- 立绘（头像）---------------- */
const PORTRAIT = {};
function renderPortraits() {
  const S = 192;
  const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  r2.setSize(S, S); r2.outputEncoding = THREE.sRGBEncoding; r2.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0xD9C9A2);
  sc.add(new THREE.HemisphereLight(0xFFF2DC, 0x6a5a48, 1.1));
  const dl = new THREE.DirectionalLight(0xFFE2B8, 1.6); dl.position.set(1.5, 2.5, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(24, 1, .1, 20);
  for (const id of Object.keys(SPECS)) {
    const ch = makeChar(SPECS[id]);
    sc.add(ch.root); ch.root.rotation.y = -.35;
    ch.a.spd = 0; animChar(ch, 1, 1);
    ch.root.updateMatrixWorld(true);
    const hp = new THREE.Vector3(); ch.head.getWorldPosition(hp); hp.y += .12;
    cam.position.set(hp.x + .05, hp.y + .02, hp.z + 1.55); cam.lookAt(hp.x, hp.y - .06, hp.z);
    sc.background = new THREE.Color(id === 'black' ? 0x8a8078 : 0xD9C9A2);
    r2.render(sc, cam);
    PORTRAIT[id] = r2.domElement.toDataURL('image/png');
    sc.remove(ch.root);
  }
  r2.dispose(); r2.forceContextLoss && r2.forceContextLoss();
}
