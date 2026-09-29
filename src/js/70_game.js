/* ============================================================
 * 游戏核心：状态、输入、相机、玩家、NPC、潜行偷听、HUD、地图、对话、手册
 * ============================================================ */
const G = {
  mode: 'load', stage: 'title', coins: 0, cakes: 0, bird: 0, cred: 3, mole: null,
  period: -1, periodT: 0, periodLen: 180, plan: {}, claims: {}, cards: [], cardSet: new Set(), newCards: 0,
  helpers: {}, trust: {}, secrets: {}, sus: {}, scenes: {}, blocks: 2, shoes: false, remitBought: false,
  obj: null, stats: { heard: 0, sighted: 0, spotted: 0, coinsTotal: 0, wrong: 0, t0: 0 }, moleLog: [], flags: {},
  townHeard: {}, caught: false,
};
const PL = { x: 0, z: 16, y: 0, yaw: Math.PI, vx: 0, vz: 0, spd: 0, crouch: false, stamina: 100, sprint: false, ch: null };
const CAM = { yaw: Math.PI, pitch: .42, dist: 9, tx: 0, tz: 0, shake: 0, override: null };
let player, fubo;
const AG = {};        // 队友 id → agent
const TOWNAG = {};    // 证人
const CROWD = [];     // 路人
let blackMan = null;

/* ---------------- 输入 ---------------- */
const keys = {};
let joy = { x: 0, y: 0, on: false }, touchRun = false;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (e.target && e.target.tagName === 'INPUT') { if (k === 'enter') e.target.dispatchEvent(new Event('change')); return; }
  keys[k] = true;
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k)) e.preventDefault();
  if (e.repeat) return;
  audioInit();
  if (DLG.open && (k === 'e' || k === ' ' || k === 'enter')) { DLG.advance(); return; }
  if (G.mode === 'play' || G.mode === 'chase') {
    if (k === 'e' || k === ' ') tryInteract();
    if (k === 'c' || k === 'control') { PL.crouch = !PL.crouch; }
    if (k === 'j' || k === 'tab') openJournal();
    if (k === 'm') openMap();
  } else if (k === 'escape' || k === 'j' || k === 'tab' || k === 'm') {
    if ($('journal').style.display === 'block') closeJournal();
    else if ($('bigmap').style.display === 'flex') closeMap();
  }
  if (k === 'escape' && G.mode === 'play') openPause();
  if (G.mode === 'blackout' && '12345'.includes(k)) blackoutPick(+k - 1);
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
/* 相机拖拽 */
let drag = null;
canvas.addEventListener('pointerdown', e => {
  audioInit();
  if (G.mode === 'blackout') { blackoutClick(e); return; }
  if (IS_TOUCH && e.pointerType === 'touch' && e.clientX < innerWidth * .45) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  CAM.yaw -= dx * .0055; CAM.pitch = clamp(CAM.pitch + dy * .004, .12, 1.25);
});
const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e => { CAM.dist = clamp(CAM.dist + e.deltaY * .008, 4, 16); e.preventDefault(); }, { passive: false });
function setupTouch() {
  if (!IS_TOUCH) return;
  $('touch').style.display = 'block';
  const st = $('stick'), kn = $('knob');
  const upd = t => { const r = st.getBoundingClientRect(); let dx = t.clientX - (r.left + 62), dy = t.clientY - (r.top + 62); const l = Math.hypot(dx, dy) || 1, c = Math.min(l, 46); dx = dx / l * c; dy = dy / l * c; kn.style.left = (40 + dx) + 'px'; kn.style.top = (40 + dy) + 'px'; joy.x = dx / 46; joy.y = dy / 46; };
  st.addEventListener('touchstart', e => { joy.on = true; upd(e.touches[0]); audioInit(); e.preventDefault(); }, { passive: false });
  st.addEventListener('touchmove', e => { upd(e.targetTouches[0]); e.preventDefault(); }, { passive: false });
  st.addEventListener('touchend', e => { joy.on = false; joy.x = joy.y = 0; kn.style.left = '40px'; kn.style.top = '40px'; }, { passive: true });
  $('t-act').addEventListener('touchstart', e => { e.preventDefault(); if (DLG.open) DLG.advance(); else tryInteract(); }, { passive: false });
  $('t-run').addEventListener('touchstart', e => { e.preventDefault(); touchRun = true; $('t-run').classList.add('on'); }, { passive: false });
  $('t-run').addEventListener('touchend', e => { touchRun = false; $('t-run').classList.remove('on'); });
  $('t-crouch').addEventListener('touchstart', e => { e.preventDefault(); PL.crouch = !PL.crouch; }, { passive: false });
}

/* ---------------- 碰撞 ---------------- */
function blockedAt(x, z, r) {
  for (const c of COL) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  for (const c of CIRC) if (hyp(x - c.x, z - c.z) < c.r + r) return true;
  return false;
}
const EXTRA_CIRC = []; // 追逐时的临时障碍
function collide(x, z, r) {
  for (let it = 0; it < 2; it++) {
    for (const c of COL) {
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
        const px = Math.min(x - (c.x0 - r), (c.x1 + r) - x), pz = Math.min(z - (c.z0 - r), (c.z1 + r) - z);
        if (px < pz) x = (x - c.x0 < c.x1 - x) ? c.x0 - r : c.x1 + r; else z = (z - c.z0 < c.z1 - z) ? c.z0 - r : c.z1 + r;
      }
    }
    for (const list of [CIRC, EXTRA_CIRC]) for (const c of list) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-4) { x = c.x + dx / d * m; z = c.z + dz / d * m; }
    }
  }
  x = clamp(x, BOUNDS.x0, BOUNDS.x1); z = clamp(z, BOUNDS.z0, BOUNDS.z1);
  return [x, z];
}
/* 2D 视线：线段与碰撞盒/圆 */
function losClear(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  for (const c of COL) {
    if (c.h < 1.3) continue;
    let t0 = 0, t1 = 1;
    for (const [p, d, lo, hi] of [[ax, dx, c.x0, c.x1], [az, dz, c.z0, c.z1]]) {
      if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { t0 = 2; break; } }
      else { let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) break; }
    }
    if (t0 <= t1 && t0 < 1 && t1 > 0) return false;
  }
  for (const c of CIRC) {
    if (c.r < .5) continue;
    const L2 = dx * dx + dz * dz; let t = ((c.x - ax) * dx + (c.z - az) * dz) / L2; t = clamp(t, 0, 1);
    if (t > .05 && t < .95 && hyp(ax + dx * t - c.x, az + dz * t - c.z) < c.r * .8) return false;
  }
  return true;
}
/* 相机遮挡（3D 线段 vs 盒） */
function camClip(ax, ay, az, bx, by, bz) {
  let tmin = 1;
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  for (const c of COL) {
    if (Math.min(ax, bx) > c.x1 + .5 || Math.max(ax, bx) < c.x0 - .5 || Math.min(az, bz) > c.z1 + .5 || Math.max(az, bz) < c.z0 - .5) continue;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, d, lo, hi] of [[ax, dx, c.x0, c.x1], [ay, dy, -1, c.h], [az, dz, c.z0, c.z1]]) {
      if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { ok = false; break; } }
      else { let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; } }
    }
    if (ok && t0 < tmin && t0 > 0.02) tmin = t0;
  }
  return tmin;
}

/* ---------------- 角色生成 ---------------- */
function spawnAgent(id, spec, x, z, extra = {}) {
  const ch = makeChar(spec); scene.add(ch.root);
  const a = Object.assign({ id, ch, x, z, yaw: 0, path: [], speed: 0, maxSpd: 2.2, mode: 'idle', act: null, lookT: 0, look: 0, sus: 0, label: null, crouch: 0, stun: 0 }, extra);
  ch.root.position.set(x, groundY(x, z), z);
  return a;
}
function buildPeople() {
  player = makeChar(SPECS.bai); scene.add(player.root); PL.ch = player;
  fubo = spawnAgent('fubo', SPECS.fubo, 3, 26, { name: '福伯' }); setAct(fubo.ch, 'lantern');
  for (const id of IDS) AG[id] = spawnAgent(id, SPECS[id], 0, 20, { name: CAST[id].name });
  for (const [k, t] of Object.entries(TOWN)) {
    const a = TOWNAG[k] = spawnAgent(k, SPECS[t.spec], t.pos[0], t.pos[1], { name: t.name, yaw: t.yaw, town: true });
    if (t.act) setAct(a.ch, t.act); if (t.crouch) a.crouch = t.crouch;
  }
  for (let i = 0; i < (LOWQ ? 8 : 14); i++) {
    const sp = randomSpec(i + 3); const k = pick(Object.keys(NODES).filter(n => !['WX', 'EX', 'NX'].includes(n)));
    const a = spawnAgent('crowd' + i, sp, NODES[k][0] + rand(-2, 2), NODES[k][1] + rand(-2, 2), { crowd: true, maxSpd: sp.kid ? 2.6 : rand(1.1, 1.6) });
    CROWD.push(a);
  }
  blackMan = spawnAgent('black', SPECS.black, 0, -300, { name: '黑衣人' }); blackMan.ch.root.visible = false;
}

/* ---------------- NPC 移动 ---------------- */
function goTo(a, x, z, spd) { a.path = routeTo(a.x, a.z, x, z); a.maxSpd = spd || a.maxSpd; a.mode = 'walk'; }
function goStraight(a, x, z, spd) { a.path = [{ x, z }]; a.maxSpd = spd || a.maxSpd; a.mode = 'walk'; }
function stepAgent(a, dt) {
  if (a.stun > 0) { a.stun -= dt; a.speed = 0; }
  else if (a.path.length) {
    const p = a.path[0], dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
    const tol = a.path.length > 1 ? 1.2 : .25;
    if (d < tol) { a.path.shift(); if (!a.path.length) { a.mode = a.mode === 'walk' ? 'arrived' : a.mode; } }
    else {
      a.speed = Math.min(a.maxSpd, a.speed + dt * 6);
      const s = Math.min(d, a.speed * dt);
      let nx = a.x + dx / d * s, nz = a.z + dz / d * s;
      // 轻微互相避让
      if (!a.noAvoid) { const pd = hyp(nx - PL.x, nz - PL.z); if (pd < .8 && pd > .01) { nx += (nx - PL.x) / pd * .03; nz += (nz - PL.z) / pd * .03; } }
      a.x = nx; a.z = nz;
      a.yaw = a.yaw + angDiff(a.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 10);
    }
  } else a.speed = Math.max(0, a.speed - dt * 8);
  a.ch.a.spd = a.speed; a.ch.a.crouch = lerp(a.ch.a.crouch, a.crouch, Math.min(1, dt * 6));
  a.ch.root.position.set(a.x, groundY(a.x, a.z), a.z); a.ch.root.rotation.y = a.yaw;
}
function faceTo(a, x, z) { a.yaw = Math.atan2(x - a.x, z - a.z); }
function crowdThink(a, dt) {
  if (!a.path.length) {
    a.wait = (a.wait || rand(1, 5)) - dt;
    if (a.wait < 0) { a.wait = 0; const k = pick(ADJ[nearestNode(a.x, a.z)]); if (k && !['WX', 'EX', 'NX'].includes(k)) { a.path = [{ x: NODES[k][0] + rand(-1.8, 1.8), z: NODES[k][1] + rand(-1.8, 1.8) }]; } }
  }
}

/* ---------------- 标签（头顶文字）---------------- */
const LBL = new Map();
function label(a) {
  let el = LBL.get(a);
  if (!el) { el = document.createElement('div'); el.className = 'wl'; $('labels').appendChild(el); LBL.set(a, el); }
  return el;
}
const _pv = new THREE.Vector3();
function placeLabel(el, x, y, z, maxD = 30) {
  _pv.set(x, y, z);
  const d = camera.position.distanceTo(_pv);
  _pv.project(camera);
  if (_pv.z > 1 || d > maxD || Math.abs(_pv.x) > 1.1 || Math.abs(_pv.y) > 1.1) { el.style.display = 'none'; return false; }
  el.style.display = 'block';
  el.style.left = ((_pv.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - _pv.y) / 2 * innerHeight) + 'px';
  el.style.opacity = clamp(1.4 - d / maxD, 0, 1);
  return true;
}
function updateLabels() {
  const list = [fubo, ...IDS.map(i => AG[i]), ...Object.values(TOWNAG)];
  for (const a of list) {
    const el = label(a);
    if (!a.ch.root.visible || G.mode === 'title' || G.mode === 'end' || (G.mode === 'blackout' && !IDS.includes(a.id))) { el.style.display = 'none'; continue; }
    let html = '';
    const sc = G.scenes[a.id];
    if (G.mode === 'blackout' && BO.order) { const n = BO.order.indexOf(a.id); if (n >= 0) html = `<span class="key">${n + 1}</span>`; }
    else if (sc && sc.phase === 'scene' && a.sus > .05 && !sc.aborted) html = `<div class="ic q">?</div><div class="meter"><i style="width:${a.sus * 100}%"></i></div>`;
    else if (sc && sc.spottedT > 0) html = `<div class="ic x">!</div>`;
    if (a.bubble && a.bubbleT > 0) html = `<div class="bub">${a.bubble}</div>` + html;
    html += `<div class="nm">${a.name}</div>`;
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    placeLabel(el, a.x, groundY(a.x, a.z) + a.ch.height + .35, a.z, G.mode === 'blackout' ? 60 : 26);
  }
}
function bubble(a, txt, t = 3) { a.bubble = txt; a.bubbleT = t; }

/* ---------------- 自由时段：场景调度 ---------------- */
const SCENE_LINE_GAP = 8.5;
function startPeriod(p, nextSite) {
  G.period = p; G.periodT = 0; G.nextSite = nextSite; G.scenes = {};
  const order = shuffle(IDS.slice());
  order.forEach((id, i) => {
    const spot = G.plan[id][p];
    const isMole = id === G.mole;
    const data = isMole ? moleScene(p, id) : HERRING[id][p];
    G.scenes[id] = { id, p, spot, isMole, data, phase: 'wait', t: 0, delay: 4 + i * 9 + rand(0, 5), heard: new Set(), lineI: -1, aborted: false, done: false, sighted: false, full: false, spottedT: 0, black: isMole && data.black };
    AG[id].sus = 0;
  });
  const ns = SITES[nextSite];
  goTo(fubo, ns.host[0], ns.host[1], 2.4);
}
function updateScenes(dt) {
  if (G.period < 0) return;
  G.periodT += dt;
  const night = U.night.value;
  let listening = null, anyTense = false;
  for (const id of IDS) {
    const sc = G.scenes[id], a = AG[id]; if (!sc) continue;
    const S = SPOTS[sc.spot];
    sc.spottedT = Math.max(0, sc.spottedT - dt);
    if (sc.phase === 'wait') {
      sc.delay -= dt;
      if (sc.delay <= 0) { sc.phase = 'go'; goTo(a, S.x, S.z, 2.3); setAct(a.ch, null); a.crouch = 0; }
    } else if (sc.phase === 'go') {
      if (a.mode === 'arrived' || (!a.path.length && hyp(a.x - S.x, a.z - S.z) < .6)) {
        sc.phase = 'scene'; sc.t = 0; a.yaw = S.yaw; a.mode = 'scene';
        setAct(a.ch, sc.data.act === 'crouchPhoto' ? 'crouchPhoto' : sc.data.act);
        a.crouch = sc.data.act === 'crouchPhoto' || (sc.data.act === 'think' && sc.spot === 'dcDoor') ? .8 : 0;
        if (sc.black) { blackMan.x = S.x + Math.sin(S.yaw) * 1.4; blackMan.z = S.z + Math.cos(S.yaw) * 1.4; faceTo(blackMan, a.x, a.z); blackMan.ch.root.visible = true; setAct(blackMan.ch, 'talk'); blackMan.path = []; }
      }
    } else if (sc.phase === 'scene') {
      sc.t += dt;
      const lines = sc.data.lines;
      // 张望
      a.lookT -= dt;
      if (a.lookT < 0) {
        const wary = sc.isMole || S.hide;
        a.lookT = wary ? rand(2.2, 4.5) : rand(4, 8);
        a.look = Math.random() < .45 ? 0 : rand(-1.1, 1.1) * (wary ? 1 : .6);
        if (wary && Math.random() < .25) { a.yaw = S.yaw + Math.PI + rand(-.4, .4); a.turnBack = 2.2; }
      }
      if (a.turnBack > 0) { a.turnBack -= dt; if (a.turnBack <= 0) a.yaw = S.yaw; }
      a.ch.a.lookYaw = lerp(a.ch.a.lookYaw, a.look, Math.min(1, dt * 3));
      // 台词
      const li = Math.floor((sc.t - 2) / SCENE_LINE_GAP);
      if (li >= 0 && li < lines.length && li !== sc.lineI) {
        sc.lineI = li; const d = hyp(PL.x - a.x, PL.z - a.z);
        let who = sc.black && lines[li].startsWith('黑衣人：') ? '黑衣人' : CAST[id].name;
        const txt = lines[li].replace(/^黑衣人：/, '');
        if (d < 8 && !sc.aborted) { sc.heard.add(li); showSub(who, txt, false); G.stats.heardLines = (G.stats.heardLines || 0) + 1; }
        else if (d < 14 && !sc.aborted) showSub(who, garble(txt), true);
      }
      // 观察与被发现
      const d = hyp(PL.x - a.x, PL.z - a.z);
      const seeRange = lerp(22, 14, night);
      const los = d < seeRange + 4 && losClear(PL.x, PL.z, a.x, a.z);
      if (los && d < seeRange && !sc.sighted) { sc.sighted = true; addSighting(id, sc); }
      if (sc.black && los && d < seeRange + 3 && !G.cardSet.has('black')) addCard({ id: 'black', kind: 'sight', title: `目击 · ${CAST[id].name}与黑衣人`, text: `你远远看见${CAST[id].name}在${S.name}和一个戴墨镜的黑衣男人碰头，对方塞给ta一个信封。`, per: 1, contra: [{ who: id, s: 1 }, { who: id, s: 3 }] });
      if (!sc.aborted) {
        const view = a.yaw + a.ch.a.lookYaw;
        const toP = Math.atan2(PL.x - a.x, PL.z - a.z);
        const inCone = Math.abs(angDiff(view, toP)) < 1.05;
        let rate = 0;
        if (inCone && los && d < 13) rate = (PL.crouch ? .32 : 1) * (PL.spd > 6 ? 1.8 : 1) * (d < 5 ? 1.5 : d < 9 ? .8 : .4) * (1 - night * .35);
        if (d < 1.8) rate = Math.max(rate, 1.6);
        if (PL.spd > 6 && d < 9) rate = Math.max(rate, .5);
        if (rate > 0) { a.sus = Math.min(1, a.sus + rate * dt * .55); anyTense = true; } else a.sus = Math.max(0, a.sus - dt * .2);
        if (a.sus >= 1) spotted(id, sc);
        if (d < 8 && !sc.aborted) listening = sc;
        if (d < 16) anyTense = true;
      }
      const needed = lines.length - 1;
      if (!sc.full && sc.heard.size >= needed && !sc.aborted) { sc.full = true; addOverheard(id, sc); }
      const dur = 2 + lines.length * SCENE_LINE_GAP + 2;
      if (sc.t > dur || sc.aborted) finishScene(id, sc);
    }
  }
  // HUD：偷听条
  const st = $('stealth');
  const showSt = PL.crouch || listening;
  st.style.display = showSt && (G.mode === 'play') ? 'flex' : 'none';
  $('st-mode').textContent = PL.crouch ? (listening ? '潜行 · 偷听中' : '潜行中') : '偷听中（按 C 蹲下更隐蔽）';
  $('listen').style.display = listening ? 'block' : 'none';
  if (listening) $('listen').firstChild.style.width = (listening.heard.size / Math.max(1, listening.data.lines.length - 1) * 100) + '%';
  G.tense = anyTense;
  // 计时
  const left = G.periodLen - G.periodT;
  $('timer').style.display = 'block'; $('timer').firstChild.style.width = clamp(left / G.periodLen * 100, 0, 100) + '%';
  if (left <= 0 && !G.flags['pend' + G.period]) { G.flags['pend' + G.period] = true; periodTimeout(); }
}
function garble(s) { return [...s].map((c, i) => (/[，。！？、…—「」：（）\s]/.test(c) || Math.random() < .3) ? c : '…').join('').replace(/…{2,}/g, '……'); }
function finishScene(id, sc) {
  if (sc.phase === 'done') return;
  const a = AG[id];
  sc.phase = 'done'; sc.done = !sc.aborted;
  setAct(a.ch, null); a.crouch = 0; a.ch.a.lookYaw = 0; a.look = 0;
  if (sc.black) { const bm = blackMan; goTo(bm, NODES.NX[0], NODES.NX[1], 2.6); bm.leaving = true; setAct(bm.ch, null); }
  if (sc.isMole) G.moleLog.push({ p: sc.p, spot: sc.spot, done: sc.done, black: sc.black });
  const ns = SITES[G.nextSite];
  goTo(a, ns.x + rand(-4, 4), ns.z + rand(-3, 3), 2.2);
}
function spotted(id, sc) {
  const a = AG[id];
  sc.aborted = true; sc.spottedT = 3; G.stats.spotted++;
  faceTo(a, PL.x, PL.z); a.look = 0; a.ch.a.lookYaw = 0; setAct(a.ch, null);
  sfx('alert');
  const L = sc.isMole ? pick(['（慌忙收起手机）哦……是你啊。我随便走走。', '（脸色一变）你跟着我干什么？', '……吓我一跳。没事，打个电话。'])
    : pick(['……你一直跟着我？', '（一愣）你在这儿干嘛？', '偷听别人说话，不太好吧。']);
  bubble(a, L, 3.5);
  if (!sc.isMole) G.trust[id] = (G.trust[id] || 0) - 1;
  toast(`👁 被${CAST[id].name}发现了！${sc.isMole ? '' : '（ta有点不高兴）'}`);
  if (sc.black) { blackMan.leaving = true; goTo(blackMan, NODES.NX[0], NODES.NX[1], 3.5); }
  finishScene(id, sc);
}
function addSighting(id, sc) {
  G.stats.sighted++;
  const isM = sc.isMole, S = SPOTS[sc.spot];
  const actTxt = { phone: '背着人打电话', talk: '和人低声说话', photo: '举着手机拍东西', crouchPhoto: '蹲在墙角摆弄手机，屏幕亮着', read: '低头看一张纸', think: '一个人发呆' }[sc.data.act] || '';
  const text = isM ? `你看见${CAST[id].name}在${S.name}${actTxt}${sc.black ? '，对面还站着个陌生男人' : ''}。` : sc.data.partial;
  addCard({ id: `sight-${id}-${sc.p}`, kind: 'sight', title: `目击 · ${CAST[id].name}`, text, per: sc.p, who: id, contra: isM ? [{ who: id, s: sc.p }] : [] });
}
function addOverheard(id, sc) {
  G.stats.heard++;
  const isM = sc.isMole;
  const text = isM ? `你躲在暗处听见${CAST[id].name}说：「${sc.data.lines.filter(l => !l.startsWith('黑衣人')).join('')}」${sc.black ? '——那个黑衣人说："东西在书屋那只铁匣，拍清楚，见图付款。"' : ''}`
    : `${sc.data.full}`;
  addCard({ id: `over-${id}-${sc.p}`, kind: 'over', title: `偷听 · ${CAST[id].name}`, text, per: sc.p, who: id, contra: isM ? [{ who: id, s: sc.p }, { who: id, s: 3 }] : [] });
  toast(isM ? `🔎 你听到了不该听到的话……` : `🔎 原来如此——${CAST[id].name}的秘密。`, 2400);
}

/* ---------------- 证据卡 ---------------- */
const KIND = { clue: ['线索', 'k-clue'], testi: ['证词', 'k-testi'], sight: ['目击', 'k-sight'], over: ['偷听', 'k-over'], intel: ['情报', 'k-intel'], secret: ['坦白', 'k-secret'], help: ['说法', 'k-help'] };
function addCard(c) {
  if (G.cardSet.has(c.id)) return false;
  G.cardSet.add(c.id); c.at = G.cards.length; G.cards.push(c); G.newCards++;
  if (c.kind !== 'testi') sfx('q');
  updateHUD();
  return true;
}
function cardHTML(c, pickable) {
  const [k, cls] = KIND[c.kind];
  return `<div class="card ${pickable ? 'pickable' : ''}" data-id="${c.id}"><div class="ct"><span class="k ${cls}">${k}</span>${esc(c.title)}</div>${c.html || esc(c.text)}${c.per !== undefined && c.per >= 0 && c.per < 3 ? `<span class="per">第${'一二三'[c.per]}段</span>` : ''}</div>`;
}

/* ---------------- 玩家 ---------------- */
function updatePlayer(dt) {
  let mx = 0, mz = 0;
  if (G.mode === 'play' || (G.mode === 'chase' && CH.t > .7)) {
    mx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0) + joy.x;
    mz = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0) + joy.y;
  }
  if (keys['arrowleft']) CAM.yaw += dt * 2; if (keys['arrowright']) CAM.yaw -= dt * 2;
  if (keys['arrowup']) CAM.pitch = clamp(CAM.pitch - dt, .12, 1.25); if (keys['arrowdown']) CAM.pitch = clamp(CAM.pitch + dt, .12, 1.25);
  const len = Math.hypot(mx, mz);
  const want = keys['shift'] || touchRun || (IS_TOUCH && joy.on && Math.hypot(joy.x, joy.y) > .95 && G.mode === 'chase');
  let target = 0;
  if (len > .05) {
    if (len > 1) { mx /= len; mz /= len; }
    // 相机相对方向
    const cy = Math.cos(CAM.yaw), sy = Math.sin(CAM.yaw);
    const wx = -mx * cy - mz * sy, wz = mx * sy - mz * cy;
    const dirx = -wx, dirz = -wz;
    PL.sprint = want && PL.stamina > 1 && !PL.crouch;
    target = PL.crouch ? 2.6 : PL.sprint ? (G.shoes ? 10.2 : 9.6) : 5.4;
    target *= Math.min(1, len);
    PL.vx = lerp(PL.vx, dirx * target, Math.min(1, dt * 10)); PL.vz = lerp(PL.vz, dirz * target, Math.min(1, dt * 10));
    PL.yaw = PL.yaw + angDiff(PL.yaw, Math.atan2(dirx, dirz)) * Math.min(1, dt * 12);
  } else { PL.vx = lerp(PL.vx, 0, Math.min(1, dt * 12)); PL.vz = lerp(PL.vz, 0, Math.min(1, dt * 12)); PL.sprint = false; }
  if (PL.sprint && len > .05) PL.stamina = Math.max(0, PL.stamina - dt * (G.shoes ? 13 : 20)); else PL.stamina = Math.min(100, PL.stamina + dt * 14);
  let [nx, nz] = collide(PL.x + PL.vx * dt, PL.z + PL.vz * dt, .32);
  // 与人轻碰
  for (const a of [...IDS.map(i => AG[i]), fubo, ...Object.values(TOWNAG)]) { const d = hyp(nx - a.x, nz - a.z); if (d < .6 && d > .01 && a.ch.root.visible) { nx = a.x + (nx - a.x) / d * .6; nz = a.z + (nz - a.z) / d * .6; } }
  PL.spd = hyp(nx - PL.x, nz - PL.z) / Math.max(dt, 1e-4);
  PL.x = nx; PL.z = nz; PL.y = groundY(PL.x, PL.z);
  player.root.position.set(PL.x, PL.y, PL.z); player.root.rotation.y = PL.yaw;
  player.a.spd = PL.spd; player.a.crouch = lerp(player.a.crouch, PL.crouch ? 1 : 0, Math.min(1, dt * 8));
  $('stamina').style.opacity = PL.stamina < 99 ? 1 : 0; $('stamina').firstChild.style.width = PL.stamina + '%';
  // 脚步
  PL.stepT = (PL.stepT || 0) - dt * PL.spd; if (PL.stepT < 0) { PL.stepT = 1.3; if (PL.spd > 3) sfx('step'); }
  // 捡铜钱
  for (const c of COINS) if (!c.got && hyp(PL.x - c.x, PL.z - c.z) < 1.2) { c.got = true; scene.remove(c.m); gainCoins(c.v, true); }
}
function gainCoins(n, quiet) { G.coins += n; if (n > 0) G.stats.coinsTotal += n; sfx('coin'); updateHUD(); if (!quiet || n > 1) toast(`🪙 ${n > 0 ? '+' : ''}${n}`, 700); }
/* 铜钱 */
const COINS = [];
const COIN_GEO = new THREE.CylinderGeometry(.24, .24, .06, 16);
const COIN_MAT = new THREE.MeshStandardMaterial({ color: 0xE8C040, emissive: 0x6a4a10, metalness: .6, roughness: .35 });
const BAG_MAT = new THREE.MeshStandardMaterial({ color: 0xA63325, roughness: .7 });
function spawnCoin(x, z, v = 1) {
  const m = v > 1 ? new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), BAG_MAT) : new THREE.Mesh(COIN_GEO, COIN_MAT);
  if (v === 1) m.rotation.x = Math.PI / 2;
  m.position.set(x, .7, z); m.castShadow = true; scene.add(m); COINS.push({ m, x, z, v, got: false, ph: Math.random() * 6 });
}
function clearCoins() { for (const c of COINS) scene.remove(c.m); COINS.length = 0; }
function scatterCoins(n) {
  const keysN = Object.keys(NODES);
  for (let i = 0; i < n; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const a = pick(keysN), b = pick(ADJ[a]); if (!b) continue; const t = Math.random();
      const x = lerp(NODES[a][0], NODES[b][0], t) + rand(-1.5, 1.5), z = lerp(NODES[a][1], NODES[b][1], t) + rand(-1.5, 1.5);
      if (!blockedAt(x, z, .5)) { spawnCoin(x, z); break; }
    }
  }
}

/* ---------------- 相机 ---------------- */
function updateCamera(dt) {
  if (CAM.override) { CAM.override(dt); return; }
  const tx = PL.x, ty = PL.y + 1.5 - player.a.crouch * .4, tz = PL.z;
  CAM.tx = lerp(CAM.tx, tx, Math.min(1, dt * 10)); CAM.tz = lerp(CAM.tz, tz, Math.min(1, dt * 10));
  const cp = Math.cos(CAM.pitch), sp = Math.sin(CAM.pitch);
  let cx = CAM.tx + Math.sin(CAM.yaw) * cp * CAM.dist, cy = ty + sp * CAM.dist, cz = CAM.tz + Math.cos(CAM.yaw) * cp * CAM.dist;
  const t = camClip(CAM.tx, ty, CAM.tz, cx, cy, cz);
  if (t < 1) { const k = Math.max(.12, t - .06); cx = lerp(CAM.tx, cx, k); cy = lerp(ty, cy, k); cz = lerp(CAM.tz, cz, k); }
  cy = Math.max(cy, groundY(cx, cz) + .4);
  camera.position.set(cx, cy, cz);
  if (CAM.shake > 0) { CAM.shake -= dt; camera.position.x += rand(-.08, .08); camera.position.y += rand(-.06, .06); }
  camera.lookAt(CAM.tx, ty, CAM.tz);
}

/* ---------------- 交互 ---------------- */
let near = null;
const INTERACT = []; // 额外交互点 {x,z,r,label,fn,active()}
function findNear() {
  if (G.mode !== 'play' && G.mode !== 'chase') return null;
  let best = null, bd = 1e9;
  const consider = (d, o) => { if (d < bd) { bd = d; best = o; } };
  for (const it of INTERACT) { if (it.active && !it.active()) continue; const d = hyp(PL.x - it.x, PL.z - it.z); if (d < it.r) consider(d - .5, it); }
  if (G.mode === 'chase') return best;
  for (const id of IDS) { const a = AG[id]; const d = hyp(PL.x - a.x, PL.z - a.z); if (d < 2.3) consider(d, { label: `和${a.name}说话`, fn: () => talkTeammate(id) }); }
  for (const k in TOWNAG) { const a = TOWNAG[k]; const d = hyp(PL.x - a.x, PL.z - a.z); if (d < 2.6) consider(d, { label: `和${a.name}说话`, fn: () => talkTown(k) }); }
  { const d = hyp(PL.x - fubo.x, PL.z - fubo.z); if (d < 2.4) consider(d, { label: '找福伯', fn: () => talkFubo() }); }
  for (const c of LIFE.cats) { const d = hyp(PL.x - c.x, PL.z - c.z); if (d < 1.6) consider(d + .3, { label: `摸摸猫（${c.name}）`, fn: () => petCat(c) }); }
  return best;
}
function tryInteract() { if (near && (G.mode === 'play' || G.mode === 'chase')) near.fn(); }
function petCat(c) {
  sfx('meow'); c.st = 'loaf'; c.t = 6;
  toast(`🐱 ${c.name}眯起眼睛，发出呼噜呼噜的声音`);
  if (!c.petted) { c.petted = true; if (Math.random() < .6) { gainCoins(1); toast(`🐱 ${c.name}的项圈上挂着一枚铜钱！`); } }
}

/* ---------------- 对话框（视觉小说式）---------------- */
const DLG = {
  open: false, resolve: null, typing: null, full: '',
  advance() { if (this.typing) { clearInterval(this.typing); this.typing = null; $('dlg-tx').innerHTML = this.full; return; } if (this.opsOn) return; this.close(true); },
  close(v) { const r = this.resolve; this.resolve = null; this.open = false; $('dlg').style.display = 'none'; if (G.mode === 'dialog') G.mode = G.prevMode || 'play'; r && r(v); },
};
$('dlg').addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') DLG.advance(); });
function speakerInfo(who) {
  if (!who) return { nm: '', por: '' };
  if (CAST[who]) return { nm: CAST[who].name, sub: CAST[who].job, por: PORTRAIT[who] };
  if (TOWN[who]) return { nm: TOWN[who].name, sub: TOWN[who].place, por: PORTRAIT[TOWN[who].spec] };
  if (who === 'fubo') return { nm: '福伯', sub: '德昌号管家', por: PORTRAIT.fubo };
  if (who === 'bai') return { nm: '白一鸣', sub: '你', por: PORTRAIT.bai };
  if (who === 'black') return { nm: '黑衣人', sub: '', por: PORTRAIT.black };
  return { nm: who, sub: '', por: '' };
}
function say(who, text, ops) {
  return new Promise(res => {
    if (G.mode !== 'dialog') G.prevMode = G.mode === 'dialog' ? 'play' : G.mode;
    G.mode = 'dialog';
    const s = speakerInfo(who);
    $('dlg-nm').innerHTML = s.nm ? `${s.nm}<small>${s.sub || ''}</small>` : '';
    $('dlg-por').style.display = s.por ? 'block' : 'none'; $('dlg-por').style.backgroundImage = s.por ? `url(${s.por})` : '';
    DLG.full = text; DLG.open = true; DLG.resolve = res; DLG.opsOn = !!ops;
    const tx = $('dlg-tx'); tx.innerHTML = '';
    const plain = text.replace(/<[^>]+>/g, ''); let i = 0;
    clearInterval(DLG.typing);
    DLG.typing = setInterval(() => { i += 2; if (i >= plain.length) { clearInterval(DLG.typing); DLG.typing = null; tx.innerHTML = text; } else tx.textContent = plain.slice(0, i); }, 22);
    const ob = $('dlg-ops'); ob.innerHTML = '';
    $('dlg-next').style.display = ops ? 'none' : 'block';
    if (ops) ops.forEach((o, k) => { if (!o) return; const b = document.createElement('button'); b.innerHTML = o.t; if (o.alt) b.className = 'alt'; if (o.dis) b.disabled = true; b.onclick = ev => { ev.stopPropagation(); sfx('click'); if (DLG.typing) { clearInterval(DLG.typing); DLG.typing = null; } DLG.close(o.v !== undefined ? o.v : k); }; ob.appendChild(b); });
    $('dlg').style.display = 'block';
  });
}
const ask = (who, text, ops) => say(who, text, ops.map(o => typeof o === 'string' ? { t: o } : o));
async function sayAll(list) { for (const [w, t] of list) await say(w, t); }

/* ---------------- 纸面浮层 ---------------- */
function sheet(html, wide) { if (G.mode !== 'ui') G.prevUI = G.mode === 'dialog' ? 'play' : G.mode; G.mode = 'ui'; $('ui').innerHTML = `<div class="sheet ${wide ? 'wide' : ''}">${html}</div>`; $('ui').style.display = 'block'; $('ui').scrollTop = 0; }
function closeSheet() { $('ui').style.display = 'none'; if (G.mode === 'ui') G.mode = G.prevUI && G.prevUI !== 'ui' ? G.prevUI : 'play'; }
function sheetWait(html, btn = '继续', wide) { return new Promise(res => { sheet(html + `<p class="center"><button id="sw-ok">${btn}</button></p>`, wide); $('sw-ok').onclick = () => { sfx('click'); closeSheet(); res(); }; }); }
function toast(t, ms = 1800) { const el = $('toast'); el.innerHTML = t; el.style.opacity = 1; clearTimeout(el._t); el._t = setTimeout(() => el.style.opacity = 0, ms); }
function banner(k, t, ms = 2600) { $('bn-k').textContent = k; $('bn-t').textContent = t; const b = $('banner'); b.style.opacity = 1; clearTimeout(b._t); b._t = setTimeout(() => b.style.opacity = 0, ms); sfx('gong'); }
function showSub(who, txt, faint) {
  const box = $('subs'); const el = document.createElement('div');
  el.innerHTML = `<span class="ln ${faint ? 'faint' : ''}"><span class="who">${who}：</span>${esc(txt)}</span>`;
  box.appendChild(el); while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(() => { el.style.opacity = 0; setTimeout(() => el.remove(), 500); }, 6500);
}
function stamp(txt, grey) { const s = $('bigstamp'); s.textContent = txt; s.classList.toggle('grey', !!grey); s.classList.add('on'); sfx('stamp'); CAM.shake = .25; setTimeout(() => s.classList.remove('on'), 1100); }
function fade(on, ms = 600) { return new Promise(r => { $('fade').style.transition = `opacity ${ms}ms`; $('fade').style.opacity = on ? 1 : 0; setTimeout(r, ms); }); }

/* ---------------- HUD ---------------- */
function setObj(chap, text, target) { $('chap').textContent = chap; $('obj').innerHTML = text; G.obj = target || null; }
function updateHUD() {
  $('coins').textContent = G.coins; $('cakes').textContent = G.cakes; $('cake-chip').style.display = G.cakes > 0 ? 'flex' : 'none';
  $('bird-i').style.width = G.bird + '%'; $('bird-p').textContent = G.bird + '%';
  $('cred').innerHTML = '信誉 ' + '<span style="color:#E85A3C">◉</span>'.repeat(G.cred) + '<span style="opacity:.3">◉</span>'.repeat(3 - G.cred);
}
function updateCompass() {
  const o = G.obj, c = $('compass');
  if (!o || G.mode === 'title') { c.style.display = 'none'; return; }
  c.style.display = 'flex';
  const dx = o.x - PL.x, dz = o.z - PL.z, d = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz) - (CAM.yaw + Math.PI);
  $('cmp-arrow').style.transform = `rotate(${-ang * 180 / Math.PI}deg)`;
  $('cmp-txt').textContent = `${o.name}  ${d < 4 ? '就在这里' : Math.round(d) + ' 米'}`;
}
/* 信标 */
let beacon;
function buildBeacon() {
  const [c, g] = mkCanvas(32, 256); const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(255,220,140,.9)'); gr.addColorStop(1, 'rgba(255,200,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 256);
  beacon = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, 11, 20, 1, true), new THREE.MeshBasicMaterial({ map: toTex(c, { repeat: false }), color: 0xFFB84A, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  m.position.y = 5.5; beacon.add(m);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.35, 32), new THREE.MeshBasicMaterial({ color: 0xFFD37A, transparent: true, opacity: .8, depthWrite: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .06; beacon.add(ring); beacon.userData.ring = ring;
  scene.add(beacon);
}

/* ---------------- 小地图 ---------------- */
const MAP = { x0: -96, z0: -106, w: 188, h: 168, s: 4, base: null };
function wx2m(x) { return (x - MAP.x0) * MAP.s; } function wz2m(z) { return (z - MAP.z0) * MAP.s; }
function buildMapBase() {
  const [c, g] = mkCanvas(MAP.w * MAP.s, MAP.h * MAP.s);
  g.fillStyle = '#2a2016'; g.fillRect(0, 0, c.width, c.height);
  const R = (x0, z0, x1, z1, col) => { g.fillStyle = col; g.fillRect(wx2m(x0), wz2m(z0), (x1 - x0) * MAP.s, (z1 - z0) * MAP.s); };
  R(-24, -50.5, 24, -10, '#3e4a2a');
  for (const [x0, z0, x1, z1] of [[-63.7, -10, 88, 0], [-90, -16, -74.5, 6], [-63.7, -60.5, 62, -51.5], [-5, 0, 5, 11], [-18, 11, 18, 40], [10, 40, 13, 53], [-30, -51.5, -24, -10], [24, -51.5, 30, -10], [-63.7, -60.5, -59, 52], [-2, -78, 2, -60.5], [-29, -80, 29, -76], [-29, -94, -25, -60.5], [25, -94, 29, -60.5], [-29, -94, 29, -90], [-2, -104, 2, -90], [-2, -50.5, 2, -10], [-24, -34.2, 24, -31.8]]) R(x0, z0, x1, z1, '#8a7a5e');
  for (const r of MAPR) { g.fillStyle = r.c; if (r.ell) { g.beginPath(); g.ellipse(wx2m((r.x0 + r.x1) / 2), wz2m((r.z0 + r.z1) / 2), (r.x1 - r.x0) / 2 * MAP.s, (r.z1 - r.z0) / 2 * MAP.s, 0, 0, 7); g.fill(); } else g.fillRect(wx2m(r.x0), wz2m(r.z0), (r.x1 - r.x0) * MAP.s, (r.z1 - r.z0) * MAP.s); }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
  for (const r of MAPR) if (!r.ell) g.strokeRect(wx2m(r.x0), wz2m(r.z0), (r.x1 - r.x0) * MAP.s, (r.z1 - r.z0) * MAP.s);
  g.font = `bold 26px ${FONT_SERIF}`; g.textAlign = 'center'; g.fillStyle = '#F2D38A'; g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 5;
  for (const l of LABELS) { g.strokeText(l.t, wx2m(l.x), wz2m(l.z)); g.fillText(l.t, wx2m(l.x), wz2m(l.z)); }
  MAP.base = c;
}
function drawMarkers(g, S, ox, oz, big) {
  const P = (x, z) => [(x - ox) * S, (z - oz) * S];
  const dot = (x, z, r, col, stroke) => { const [a, b] = P(x, z); g.beginPath(); g.arc(a, b, r, 0, 7); g.fillStyle = col; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
  for (const c of COINS) if (!c.got) dot(c.x, c.z, big ? 3 : 2.5, '#F2C84A');
  for (const k in TOWNAG) { const a = TOWNAG[k]; dot(a.x, a.z, big ? 5 : 4, '#9AA6B0', '#222'); if (big) { const [x, y] = P(a.x, a.z); g.fillStyle = '#DDE'; g.font = '16px sans-serif'; g.fillText(a.name, x, y - 9); } }
  if (G.obj) { const [x, y] = P(G.obj.x, G.obj.z); g.fillStyle = '#FFD37A'; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + 7, y); g.lineTo(x, y + 9); g.lineTo(x - 7, y); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); }
  if (G.mode === 'chase' && CH.mole) { const m = AG[CH.mole]; dot(m.x, m.z, 8, '#FF4A2A', '#fff'); for (const e in EXITS) { const X = EXITS[e]; dot(X.x, X.z, 7, CH.blocked.has(e) ? '#6a8a6a' : '#FF4A2A', '#000'); } }
  for (const id of IDS) {
    const a = AG[id]; if (!a.ch.root.visible) continue;
    const sc = G.scenes[id]; const inScene = sc && sc.phase === 'scene';
    dot(a.x, a.z, big ? 7 : 5.5, CAST[id].col, inScene ? '#FFF' : '#111');
    if (inScene) { const [x, y] = P(a.x, a.z); g.strokeStyle = 'rgba(255,255,255,' + (.5 + .5 * Math.sin(performance.now() / 180)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, big ? 13 : 10, 0, 7); g.stroke(); }
    if (big) { const [x, y] = P(a.x, a.z); g.fillStyle = '#fff'; g.font = 'bold 17px sans-serif'; g.fillText(CAST[id].name, x, y - 11); }
  }
  dot(fubo.x, fubo.z, big ? 6 : 4.5, '#E8D8A0', '#000');
  const [px, py] = P(PL.x, PL.z);
  g.save(); g.translate(px, py); g.rotate(-PL.yaw + Math.PI); g.fillStyle = '#FF5A3C'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -10); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke(); g.restore();
}
function drawMinimap() {
  const c = $('minimap'), g = c.getContext('2d'), W = c.width, R = 55; const S = W / (R * 2);
  g.clearRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.clip();
  g.fillStyle = '#1c150d'; g.fillRect(0, 0, W, W);
  const ox = PL.x - R, oz = PL.z - R;
  g.drawImage(MAP.base, (ox - MAP.x0) * MAP.s, (oz - MAP.z0) * MAP.s, R * 2 * MAP.s, R * 2 * MAP.s, 0, 0, W, W);
  g.textAlign = 'center';
  drawMarkers(g, S, ox, oz, false);
  if (G.obj) { const dx = G.obj.x - PL.x, dz = G.obj.z - PL.z, d = Math.hypot(dx, dz); if (d > R * .92) { const a = Math.atan2(dz, dx); const x = W / 2 + Math.cos(a) * (W / 2 - 14), y = W / 2 + Math.sin(a) * (W / 2 - 14); g.fillStyle = '#FFD37A'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
  g.restore();
}
function openMap() {
  if (G.mode !== 'play' && G.mode !== 'chase') return;
  $('bigmap').style.display = 'flex'; G.mapOpen = true; drawBigMap();
}
function drawBigMap() {
  const c = $('bigmap-c'), g = c.getContext('2d'); const S = Math.min(c.width / MAP.w, c.height / MAP.h);
  g.fillStyle = '#1c150d'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(MAP.base, 0, 0, MAP.w * S, MAP.h * S);
  g.textAlign = 'center'; drawMarkers(g, S, MAP.x0, MAP.z0, true);
}
function closeMap() { $('bigmap').style.display = 'none'; G.mapOpen = false; }
$('bigmap').addEventListener('click', closeMap);

/* ---------------- 手册 ---------------- */
let jTab = 'clue';
function openJournal(pickCb, filter) {
  if (!pickCb && G.mode !== 'play' && G.mode !== 'chase' && G.mode !== 'dialog' && G.mode !== 'ui') return;
  G.jPick = pickCb || null; G.jFilter = filter || null;
  G.newCards = 0;
  $('journal').style.display = 'block'; renderJournal();
}
function closeJournal() { $('journal').style.display = 'none'; if (G.jPick) { const cb = G.jPick; G.jPick = null; cb(null); } }
function renderJournal() {
  const tabs = [['clue', '线索', c => c.kind === 'clue'], ['testi', '证词', c => c.kind === 'testi'], ['obs', '目击 · 偷听', c => ['sight', 'over'].includes(c.kind)], ['other', '说法 · 情报', c => ['help', 'intel', 'secret'].includes(c.kind)], ['people', '人物', null], ['table', '行踪表', null]];
  const pickMode = !!G.jPick;
  const cnt = f => G.cards.filter(f).length;
  let body = '';
  const tab = tabs.find(t => t[0] === jTab);
  if (jTab === 'people') {
    body = `<p class="muted" style="font-size:13px">给每个人标上你的怀疑程度——只是给你自己看的笔记。</p><div class="dossier">` + IDS.map(id => {
      const C = CAST[id], s = G.sus[id] || 0;
      return `<div class="dos"><img src="${PORTRAIT[id]}"><div><div class="nm">${C.name}</div><div class="muted" style="font-size:12px">${C.job}</div><div style="font-size:12.5px;margin-top:3px">专长：${C.skill}</div>
      <div style="font-size:12.5px">好感：${'♥'.repeat(Math.max(0, G.trust[id] || 0)) || '—'} ${G.secrets[id] ? '<b class="s">· 已坦白</b>' : ''}</div>
      <div class="sus">${['清白', '存疑', '可疑', '就是ta'].map((t, i) => `<button class="${s === i ? 'on' : ''}" onclick="G.sus['${id}']=${i};renderJournal()">${t}</button>`).join('')}</div></div></div>`;
    }).join('') + `</div>`;
  } else if (jTab === 'table') {
    const P = [0, 1, 2].filter(p => p < (G.periodsDone || 0) || (p === G.period && false));
    body = `<p class="muted" style="font-size:13px">每段自由时段结束后，大家各自报的行踪。<b class="s">对不上的地方，就是破绽。</b></p>`;
    if (!P.length) body += `<p class="muted">还没有记录。</p>`;
    else body += `<table class="timeline"><tr><th>人物</th>${P.map(p => `<th>第${'一二三'[p]}段 自称</th>`).join('')}</tr>` + IDS.map(id => `<tr><td><b>${CAST[id].name}</b></td>${P.map(p => `<td>${esc(G.claims[id][p].text)}</td>`).join('')}</tr>`).join('') + `</table>`;
    const tw = Object.keys(G.townHeard).filter(k => G.townHeard[k]); if (P.length) body += `<p class="muted" style="font-size:13px;margin-top:10px">街坊证人：${Object.keys(TOWN).map(k => `${TOWN[k].name}（${TOWN[k].place}）`).join('、')}——找他们聊聊，他们会告诉你那会儿见过谁。</p>`;
  } else {
    let list = G.cards.filter(tab[2]);
    if (G.jFilter) list = list.filter(G.jFilter);
    body = list.length ? list.slice().reverse().map(c => cardHTML(c, pickMode)).join('') : `<p class="muted">这里还是空的。</p>`;
  }
  $('journal').innerHTML = `<div class="book"><div class="jh"><h2>${pickMode ? '出示哪一张？' : '白一鸣的调查手册'}</h2>${tabs.map(t => `<button class="tab ${jTab === t[0] ? 'on' : ''}" onclick="jTab='${t[0]}';renderJournal()">${t[1]}${t[2] ? `<span class="n">${cnt(t[2])}</span>` : ''}</button>`).join('')}</div>
    <div class="jb">${body}</div><div class="jf"><span>${pickMode ? '点一张卡片出示' : `铜钱 ${G.coins} · 黄雀进度 ${G.bird}%`}</span><button class="btn" style="margin:0;padding:6px 18px;font-size:14px" onclick="closeJournal()">${pickMode ? '算了' : '合上 (J)'}</button></div></div>`;
  if (pickMode) $('journal').querySelectorAll('.card.pickable').forEach(el => el.onclick = () => { const c = G.cards.find(x => x.id === el.dataset.id); const cb = G.jPick; G.jPick = null; $('journal').style.display = 'none'; cb(c); });
}
$('journal').addEventListener('click', e => { if (e.target.id === 'journal') closeJournal(); });
function pickCard(filter) { return new Promise(res => { jTab = 'obs'; openJournal(c => res(c), filter); }); }

/* ---------------- 暂停 ---------------- */
function openPause() {
  if (G.mode !== 'play') return;
  sheet(`<h2 class="brush">暂停</h2><p class="muted">当前：${$('chap').textContent}</p>
    <div class="keys">操作：<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走动 · <kbd>Shift</kbd> 疾跑 · <kbd>C</kbd> 潜行 · <kbd>E</kbd>/<kbd>空格</kbd> 交互 · 鼠标拖拽/方向键 转视角 · 滚轮 远近 · <kbd>J</kbd> 手册 · <kbd>M</kbd> 地图</div>
    <p class="center"><button onclick="closeSheet()">继续</button><button class="alt" onclick="toggleMute();openPause2()">声音：${AU.muted ? '关' : '开'}</button><button class="alt" onclick="if(confirm('重新开始？当前进度会丢失。')){closeSheet();startGame();}">重新开始</button></p>`);
}
function openPause2() { closeSheet(); openPause(); }
