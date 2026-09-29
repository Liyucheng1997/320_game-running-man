/* ============================================================
 * 终局：各报行踪 → 布置围捕 → 对质（出示证据）→ 追逐撕名牌 → 结局
 * ============================================================ */
const MOTIVES = {
  shen: '压垮他的是那张收养公证书——"沈氏后人"四个字判了他出局。既然注定一无所有，不如先卖个好价钱。',
  gu: '她恨错了方向：翻案无门，就让沈家也尝尝身败名裂的滋味。味莱只是递刀的人，握刀的是二十年的怨。',
  tang: '七位数的报价，第一通电话她挂了，第二通她没挂。扩张欠下的债，比奶奶临终的嘱托声音更响。',
  zheng: '十八万的债、平台抽成、老家的娃。五十万，买走了老街最热心的野哥。',
  lin: '明面谈收购只是幌子，她自己就是上司口中的"其他人"。第十二盏老字号的灯，她要亲手关掉。',
};
async function siteFinale() {
  G.stage = 'finale'; arrange('finale'); setObj('终局 · 德昌号旧址', '开箱之前，先清门户', null);
  TOD.target = 1;
  if (!G.flags.finIntro) {
  G.flags.finIntro = true;
  await alibiRound(2);
  await sayAll([
    ['fubo', '宝箱就在旧址地窖里。但老爷子有规矩——<b class="s">开箱之前，先清门户。</b>黄雀不除，箱子不开。'],
    ['fubo', '白先生，您是警察的儿子。当年您父亲不肯错判一个人——今天，轮到您了。'],
    ['fubo', '话一出口，那只雀一定会跑。老街三个出口：<b>西桥、东市、北巷</b>。指认之前，先让福伯的人把路堵上。'],
  ]);
  }
  $('cred').style.display = 'block'; updateHUD();
  while (true) {
    const v = await ask('fubo', `您手里有 <b>${G.cards.length}</b> 张记录，<b class="gold">${G.coins}🪙</b>。准备好了吗？`, [
      { t: '⚖ 布置围捕，开始指认', v: 'go' }, { t: '📖 再翻翻手册', v: 'book' }, { t: '🛒 找福伯买点东西', v: 'shop' },
      { t: '🗣 最后找街坊问问（去去就回）', v: 'walk', alt: true }]);
    if (v === 'book') { await new Promise(r => { openJournal(); const iv = setInterval(() => { if ($('journal').style.display !== 'block') { clearInterval(iv); r(); } }, 200); }); continue; }
    if (v === 'shop') { G.busy = false; await talkFubo(); G.busy = true; continue; }
    if (v === 'walk') { G.stage = 'to_finale'; setObj('终局 · 德昌号旧址', '问完了就回到<b>德昌号门口</b>', siteSpot('finale')); toast('去吧，回来找福伯（门口光柱）。'); return; }
    if (v === 'go') break;
  }
  const blocked = await placeBlocks();
  CH.blocked = new Set(blocked);
  await confront();
}
function placeBlocks() {
  return new Promise(res => {
    const sel = new Set(); const max = G.blocks;
    const draw = () => {
      sheet(`<span class="tag">布置围捕 · 可以堵 ${max} 条路</span>
        <p style="margin-top:0">福伯：「人手只够堵${'零一二三'[max]}条路。老爷子说过——<b class="s">人急了，只会往自己最熟的路跑。</b>想想你要指认的人是干什么的。」</p>
        <div class="letter" style="font-size:14px;line-height:1.8"><b>西桥</b>：过了桥就是停车场和工作室街区<br><b>东市</b>：人山人海的集市，铺子挨着铺子<br><b>北巷</b>：七拐八绕的小巷，生人进去就迷路</div>
        <div class="dq" style="font-size:13.5px">街坊们都知道：${IDS.map(i => `<b>${CAST[i].name}</b>——${CAST[i].exitWhy}`).join('；')}。</div>
        ${Object.entries(EXITS).map(([k, e]) => `<button class="opt ${sel.has(k) ? 'sel' : ''}" data-k="${k}">🚧 堵住 <b>${e.name}</b></button>`).join('')}
        <p class="center"><button id="bk-go" ${sel.size ? '' : 'disabled'}>就这么布置</button></p>
        <p class="center muted" style="font-size:13px">没堵上的出口，黄雀冲过去就逃掉了。堵住的出口会逼ta掉头——那就是你撕名牌的机会。</p>`);
      $('ui').querySelectorAll('.opt').forEach(b => b.onclick = () => { const k = b.dataset.k; if (sel.has(k)) sel.delete(k); else if (sel.size < max) sel.add(k); else toast('人手不够了，先取消一条'); sfx('click'); draw(); });
      $('bk-go').onclick = () => { closeSheet(); res([...sel]); };
    };
    draw();
  });
}

/* ---------------- 对质 ---------------- */
function statements(id) { return [0, 1, 2].map(p => `第${PER[p]}段：${G.claims[id][p].text}`).concat([CAST[id].s4]); }
async function confront() {
  G.mode = 'ui'; setMood('tense'); $('vignette').className = 'tense';
  let acc = null;
  while (true) {
    if (!acc) {
      acc = await new Promise(res => {
        sheet(`<span class="tag">对质 · 你要指认谁？</span><h2>黄雀，就在这五个人当中</h2>
          <p class="muted" style="font-size:14px;margin-top:0">选中一个人，ta会为自己辩白。在ta的话里找出<b class="s">一句谎言</b>，出示与之矛盾的证据——<b>击破两句</b>，ta就无从抵赖。<br>出示错误会损失信誉（<span style="color:#E85A3C">◉</span> × ${G.cred}），信誉耗尽，你就成了当年冤枉好人的那群人。</p>
          ${IDS.map(id => `<button class="opt" data-id="${id}"><img src="${PORTRAIT[id]}"><span><b>${CAST[id].name}</b> · <span class="muted">${CAST[id].job}</span>${G.sus[id] ? ` <b class="s">〔${['', '存疑', '可疑', '就是ta'][G.sus[id]]}〕</b>` : ''}</span></button>`).join('')}
          <p class="center"><button class="alt" id="cf-j">📖 翻手册</button><button class="alt" id="cf-q">我认输（放弃指认）</button></p>`, true);
        $('ui').querySelectorAll('.opt').forEach(b => b.onclick = () => { sfx('click'); res(b.dataset.id); });
        $('cf-j').onclick = () => { jTab = 'table'; openJournal(); };
        $('cf-q').onclick = () => { if (confirm('放弃指认，黄雀就会带着配方离开。确定？')) res('quit'); };
      });
      if (acc === 'quit') { closeSheet(); return endGame('B', { gaveUp: true }); }
      G.broke[acc] = G.broke[acc] || new Set();
    }
    const id = acc, S = statements(id), broke = G.broke[id];
    const r = await new Promise(res => {
      let sel = -1;
      const draw = () => {
        sheet(`<div class="confront"><div class="who"><img src="${PORTRAIT[id]}"><div class="brush" style="font-size:24px">${CAST[id].name}</div><div class="muted" style="font-size:12px">${CAST[id].job}</div></div>
          <div style="flex:1"><div class="dq"><span class="who">${CAST[id].name}：</span>「${pick(['凭什么说是我？我今天的行踪清清楚楚。', '你要指我？好，那你听着——', '白先生，话可不能乱说。'])}」</div>
          ${S.map((s, i) => `<div class="stmt ${broke.has(i) ? 'broke' : ''} ${sel === i ? 'sel' : ''}" data-i="${i}">${esc(s)}</div>`).join('')}
          <p class="muted" style="font-size:13px">点选一句话，再出示证据。已击破 <b class="s">${broke.size}</b> / 2 · 信誉 ${'<span style="color:#E85A3C">◉</span>'.repeat(G.cred)}</p>
          <p><button id="cf-show" ${sel < 0 ? 'disabled' : ''}>⚖ 出示证据</button><button class="alt" id="cf-back">换一个人</button></p></div></div>`, true);
        $('ui').querySelectorAll('.stmt').forEach(el => el.onclick = () => { const i = +el.dataset.i; if (broke.has(i)) return; sel = i; sfx('click'); draw(); });
        $('cf-back').onclick = () => res({ back: true });
        $('cf-show').onclick = async () => { $('ui').style.display = 'none'; jTab = 'obs'; const c = await pickCard(); $('ui').style.display = 'block'; if (c) res({ s: sel, card: c }); else draw(); };
      };
      draw();
    });
    if (r.back) { acc = null; continue; }
    const ok = r.card.contra && r.card.contra.some(x => x.who === id && x.s === r.s);
    closeSheet();
    if (ok) {
      broke.add(r.s); stamp('破绽！');
      if (broke.size === 1) await say(id, pick(['……那、那是我记错了。', '（额头冒汗）这……这能说明什么？', '（沉默了两秒）……我一时说岔了。']));
      if (broke.size >= 2) { await crack(id); return; }
    } else {
      G.cred--; G.stats.wrong++; updateHUD(); stamp('不成立', true); sfx('fail');
      await say(id, id === G.mole ? pick(['这能说明什么？你在诈我。', '白先生，就这？', '（冷笑）拿这个就想定我的罪？']) : CAST[id].rebut);
      if (G.cred <= 0) { await say('fubo', '……白先生。够了。'); return endGame(id === G.mole ? 'B' : 'C', { accused: id }); }
    }
  }
}
async function crack(id) {
  $('vignette').className = 'chase';
  await say(id, '……');
  await say(id, pick(['（猛地抬头，推开挡在身前的人）——让开！', '（一把推开福伯）你们谁也别想拦我！', '（把名牌往身后一藏，转身就跑）']));
  startChase(id);
}

/* ---------------- 追逐 ---------------- */
const CH = { mole: null, blocked: new Set(), known: new Set(), t: 0, target: null, throwT: 0, dodgeT: 0, over: false, props: [], tackleCD: {}, repath: 0 };
function endChaseCleanup() {
  for (const p of CH.props) scene.remove(p); CH.props.length = 0; EXTRA_CIRC.length = 0;
  CH.mole = null; CH.over = false; CH.known = new Set();
  if (INTERACT.length && INTERACT[INTERACT.length - 1].chase) INTERACT.pop();
}
let barricadeGeo = null;
function barricadeMesh() {
  if (!barricadeGeo) barricadeGeo = partsMesh([[box(2.4, .25, .08), Mx(0, .95, 0), '#C8321E'], [box(2.4, .25, .08), Mx(0, .6, 0), '#F2EAD8'], [box(.08, 1.1, .5), Mx(-1, .55, 0, .2), '#4a3424'], [box(.08, 1.1, .5), Mx(1, .55, 0, .2), '#4a3424']]).geometry;
  const m = new THREE.Mesh(barricadeGeo, CHAR_MAT); m.castShadow = true; return m;
}
function startChase(id) {
  closeSheet();
  CH.mole = id; CH.t = 0; CH.throwT = 3; CH.dodgeT = 0; CH.over = false; CH.known = new Set(); CH.tackleCD = {}; CH.repath = 0;
  const m = AG[id]; m.noAvoid = true;
  // 堵路
  const guards = { west: 'liu', east: 'wang', north: 'chen' };
  for (const e of Object.keys(EXITS)) {
    const X = EXITS[e], g = TOWNAG[guards[e]];
    if (CH.blocked.has(e)) {
      const nb = NODES[X.node]; const inward = e === 'north' ? [0, 6] : e === 'west' ? [6, 0] : [-6, 0];
      for (const off of [-2.2, 0, 2.2]) {
        const bm = barricadeMesh(); const bx = X.x + inward[0] + (e === 'north' ? off * .7 : 0), bz = X.z + inward[1] + (e === 'north' ? 0 : off * 1.5);
        bm.position.set(bx, 0, bz); bm.rotation.y = e === 'north' ? 0 : Math.PI / 2; scene.add(bm); CH.props.push(bm); EXTRA_CIRC.push({ x: bx, z: bz, r: .9 });
      }
      g.x = X.x + inward[0] * .6; g.z = X.z + inward[1] * .6; g.path = []; setAct(g.ch, 'hands'); g.crouch = 0; faceTo(g, X.x + inward[0] * 3, X.z + inward[1] * 3);
    }
  }
  // 站位
  m.x = 0; m.z = 27; m.path = []; m.ch.root.visible = true; setAct(m.ch, null); m.yaw = Math.PI; m.speed = 7.5; m.stun = 0;
  PL.x = 0; PL.z = 33.5; PL.yaw = Math.PI; PL.stamina = 100; CAM.yaw = 0; CAM.pitch = .32; CAM.dist = 8;
  IDS.filter(i => i !== id).forEach((i, k) => { const a = AG[i]; a.x = -6 + k * 4; a.z = 31.5; a.path = []; a.gatherAt = null; setAct(a.ch, null); });
  chooseTarget();
  G.mode = 'chase'; G.stage = 'chase'; setMood('chase');
  setObj('追 · 撕名牌！', `追上<b>${CAST[id].name}</b>，从<b>背后</b>靠近按 <kbd>E</kbd> 撕下名牌！<kbd>Shift</kbd> 疾跑`, null);
  banner('撕名牌', '追！', 1400);
  INTERACT.push({ chase: true, get x() { return AG[CH.mole] ? AG[CH.mole].x : 0; }, get z() { return AG[CH.mole] ? AG[CH.mole].z : 0; }, r: 2.1, label: '撕名牌！', fn: () => tryTear(), active: () => G.mode === 'chase' && !CH.over });
}
function chooseTarget() {
  const m = AG[CH.mole];
  const pref = CAST[CH.mole].exit;
  let tgt = !CH.known.has(pref) ? pref : null;
  if (!tgt) { const cands = Object.keys(EXITS).filter(e => !CH.known.has(e)); if (cands.length) tgt = cands.reduce((b, e) => hyp(EXITS[e].x - m.x, EXITS[e].z - m.z) < hyp(EXITS[b].x - m.x, EXITS[b].z - m.z) ? e : b); }
  CH.target = tgt;
  const spd = 7.8;
  if (tgt) { const X = EXITS[tgt]; m.path = routeTo(m.x, m.z, X.x, X.z, new Set()); m.maxSpd = spd; }
  else { // 无路可逃：在城里乱窜
    const far = Object.keys(NODES).filter(k => !['WX', 'EX', 'NX'].includes(k) && hyp(NODES[k][0] - PL.x, NODES[k][1] - PL.z) > 30);
    const k = pick(far); m.path = routeTo(m.x, m.z, NODES[k][0], NODES[k][1]); m.maxSpd = spd * .92;
  }
}
function updateChase(dt, t) {
  if (G.mode !== 'chase' || CH.over) return;
  CH.t += dt;
  const m = AG[CH.mole];
  const fat = clamp(1 - Math.max(0, CH.t - 10) * .015, .7, 1);
  m.maxSpd = (CH.target ? 7.8 : 7.2) * fat;
  if (m.stun > 0) setAct(m.ch, 'hands'); else if (m.ch.a.act === 'hands') setAct(m.ch, null);
  // 发现路障
  for (const e of CH.blocked) { if (!CH.known.has(e) && hyp(m.x - EXITS[e].x, m.z - EXITS[e].z) < 17) { CH.known.add(e); bubble(m, pick(['可恶，这边堵了！', '……有人！', '换路！']), 2); if (CH.target === e) chooseTarget(); } }
  if (!m.path.length) { if (CH.target && !CH.blocked.has(CH.target) && hyp(m.x - EXITS[CH.target].x, m.z - EXITS[CH.target].z) < 3) return chaseEscape(); chooseTarget(); }
  if (CH.target && !CH.blocked.has(CH.target) && hyp(m.x - EXITS[CH.target].x, m.z - EXITS[CH.target].z) < 2.5) return chaseEscape();
  // 拉直路径：能直接看到下一个路点就抄近道
  if (m.path.length > 1 && losClear(m.x, m.z, m.path[1].x, m.path[1].z) && !blockedAt((m.x + m.path[1].x) / 2, (m.z + m.path[1].z) / 2, .5)) m.path.shift();
  // 丢障碍
  CH.throwT -= dt;
  const dP = hyp(PL.x - m.x, PL.z - m.z);
  if (CH.throwT < 0 && dP < 16 && dP > 3 && m.speed > 3) {
    CH.throwT = rand(4.5, 6.5);
    const bx = m.x - Math.sin(m.yaw) * 1.4, bz = m.z - Math.cos(m.yaw) * 1.4;
    const cm = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), new THREE.MeshStandardMaterial({ map: TX.wood, color: 0xC09060 }));
    cm.position.set(bx, .4, bz); cm.rotation.y = rand(0, 3); cm.castShadow = true; scene.add(cm); CH.props.push(cm); EXTRA_CIRC.push({ x: bx, z: bz, r: .6 });
    sfx('whoosh'); bubble(m, pick(['别过来！', '让开！', '（掀翻了路边的木箱）']), 1.5);
  }
  // 队友围堵
  for (const id of IDS) {
    if (id === CH.mole) continue; const a = AG[id];
    CH.tackleCD[id] = (CH.tackleCD[id] || 0) - dt;
    a.repath = (a.repath || 0) - dt;
    if (a.repath < 0) { a.repath = .6; a.path = routeTo(a.x, a.z, m.x, m.z); a.maxSpd = 6.9; }
    if (hyp(a.x - m.x, a.z - m.z) < 1.2 && CH.tackleCD[id] < 0 && m.stun <= 0) {
      CH.tackleCD[id] = 4;
      if (Math.random() < .5) { m.stun = 1.4; bubble(a, pick(['抓住了！快撕！', '别跑！', '我拖住ta了！']), 1.6); toast(`💥 ${CAST[id].name}扑上去拖住了${CAST[CH.mole].name}！快撕！`); CAM.shake = .2; }
      else bubble(m, '（一个急转甩开了）', 1.2);
    }
  }
  // 玩家从正面靠近时闪躲
  CH.dodgeT -= dt;
  if (dP < 2.2 && CH.dodgeT < 0 && m.stun <= 0 && !isBehind()) {
    CH.dodgeT = 1.6; const side = Math.random() < .5 ? 1 : -1;
    const [nx, nz] = collide(m.x + Math.cos(m.yaw) * 1.6 * side, m.z - Math.sin(m.yaw) * 1.6 * side, .35); m.x = nx; m.z = nz; m.path = [];
    sfx('whoosh');
  }
  $('obj').innerHTML = `追上<b>${CAST[CH.mole].name}</b>，从<b>背后</b>按 <kbd>E</kbd> 撕名牌！<br><span class="muted">距离 ${dP.toFixed(0)} 米${CH.target ? ` · ta 正往<b>${EXITS[CH.target].name}</b>跑` : ' · ta 被堵得无路可逃'}</span>`;
  G.obj = { x: m.x, z: m.z, name: CAST[CH.mole].name };
}
function isBehind() { const m = AG[CH.mole]; const to = Math.atan2(PL.x - m.x, PL.z - m.z); return Math.abs(angDiff(m.yaw, to)) > 1.75 || m.stun > 0 || m.speed < 1; }
async function tryTear() {
  if (CH.over) return;
  const m = AG[CH.mole];
  setAct(player, 'tear'); setTimeout(() => setAct(player, null), 400);
  if (!isBehind()) { toast('被ta躲开了！<b>绕到背后</b>，或者等队友拖住ta！'); CH.dodgeT = 0; return; }
  CH.over = true;
  sfx('rip'); stamp('刺啦——'); CAM.shake = .4;
  // 名牌飞出
  const tag = m.ch.tag; const wp = new THREE.Vector3(); tag.getWorldPosition(wp);
  scene.attach(tag);
  const t0 = performance.now(), v = new THREE.Vector3(rand(-1, 1), 4, rand(-1, 1));
  G.slowmo = 1.6;
  m.stun = 99; setAct(m.ch, null); m.path = []; m.crouch = .9;
  const fly = () => { const k = (performance.now() - t0) / 1000; if (k < 1.4) { tag.position.set(wp.x + v.x * k, wp.y + v.y * k - 4.9 * k * k, wp.z + v.z * k); tag.rotation.x += .3; tag.rotation.y += .2; requestAnimationFrame(fly); } else tag.visible = false; };
  fly();
  await new Promise(r => setTimeout(r, 1800));
  endGame('A', { tore: true });
}
async function chaseEscape() {
  if (CH.over) return; CH.over = true;
  const m = AG[CH.mole];
  toast(`${CAST[CH.mole].name}冲出了${EXITS[CH.target].name}，消失在夜色里……`, 3000);
  sfx('fail');
  await new Promise(r => setTimeout(r, 2200));
  m.ch.root.visible = false;
  endGame('B', { escaped: true });
}

/* ---------------- 结局 ---------------- */
function confession() {
  return `<div class="letter">「二十年前的四月十七日夜里，德昌号没有进过贼。<b class="s">贼是我。我偷走了我自己的配方。</b><br>
    莱记的蜜有毒。我怕的不是丢方子，是方子落进他们手里，害了满城街坊。我藏起配方，报了假案——却没想到人言把守拙钉在了案板上。<br>
    守拙，师父对不住你。白警官，你是唯一看穿我的人。<br>掌灯的人换了。德昌号，明天照常开门。」<div style="text-align:right" class="muted">——沈德昌 绝笔</div></div>`;
}
function grade(type) {
  let s = type === 'A' ? 55 : type === 'B' ? 18 : 5;
  s += G.cred * 6 + (100 - G.bird) * .15 + Math.min(20, G.cards.length * .8) + Math.min(10, G.coins * .25) + G.stats.heard * 2 - G.stats.spotted * 2;
  if (G.caught) s += 6;
  const g = s >= 100 ? '甲上' : s >= 88 ? '甲' : s >= 72 ? '乙' : s >= 50 ? '丙' : '丁';
  return { s: Math.round(s), g };
}
function moleTimeline() {
  const id = G.mole, rows = [];
  for (let p = 0; p < 3; p++) {
    const log = G.moleLog.find(l => l.p === p);
    const sc = moleScene(p, id);
    const what = p === 0 ? '给味莱的"周先生"打电话汇报' : p === 1 ? '和黑衣人碰头，领取"铁匣"的指令' : '把配方照片发给味莱，商量调包';
    rows.push(`<tr><td>第${PER[p]}段</td><td>${spotName(G.plan[id][p])}</td><td>${what}${log && !log.done ? '（被你撞破，没能得手）' : ''}</td><td>谎称：${esc(G.claims[id][p].text)}</td></tr>`);
  }
  rows.push(`<tr><td>熄灯</td><td>三味书屋</td><td>${G.caught ? '偷拍配方——被你当场抓住' : '趁黑偷拍了配方'}</td><td>—</td></tr>`);
  return `<table class="timeline"><tr><th>时段</th><th>真实去向</th><th>做了什么</th><th>对外说法</th></tr>${rows.join('')}</table>`;
}
function endGame(type, info = {}) {
  G.mode = 'end'; G.stage = 'end'; setMood(type === 'A' ? 'explore' : 'night'); $('vignette').className = '';
  $('stealth').style.display = 'none';
  const mole = CAST[G.mole], MN = mole.name;
  const T = { A: ['雀', '落', '结局 · 雀落'], B: ['雀', '飞', '结局 · 雀飞'], C: ['错', '网', '结局 · 错网'] }[type];
  let head = '', tail = '';
  if (type === 'A') {
    head = `<p>名牌在你手里。${MN}瘫坐在青石板上，再没了辩解的力气。</p>`;
    tail = `<p>福伯从地窖抬出宝箱，当众念出那封信：</p>${confession()}
      <p>${G.bird >= 75 ? `<b class="s">可惜，配方的照片早已发了出去。</b>味莱拿到了方子，却拿不到"德昌号"三个字——检验单和人证俱在，他们的新品发布会，大概是开不成了。` : '配方没有流出去。检验单、台账，还有人赃并获的这一位，够味莱喝一壶了。'}</p>
      <p>顾守拙的名字从此干干净净，父亲那句"证据不足"，终于等到了下文。<b class="s brush" style="font-size:26px">结案。</b></p>`;
  } else if (type === 'B') {
    head = info.escaped ? `<p>${MN}冲出了你没堵上的那条路，背影消失在夜色里。口袋里，是整张配方的照片。</p>` : info.gaveUp ? `<p>你终究没能说出那个名字。人群散去时，${MN}回头看了你一眼。</p>` : `<p>你离真相只差一步——可你拿不出让人信服的证据。${MN}拍拍衣服，从容地走出了广场。</p>`;
    tail = `<p>三天后，味莱发布"复刻百年老味"新品桂花糕。德昌号的招牌被摆进他们的陈列柜，标签写着：<b class="s">已收购。</b></p><p class="muted">至少，真相你带回来了：</p>${confession()}`;
  } else {
    const inn = CAST[info.accused].name;
    head = `<p>二十年前，全城的人指着一个无辜的学徒说：就是他。</p><p>二十年后，你指着<b>${inn}</b>，说：就是ta。</p><p>${inn}的眼里只有委屈：「白先生，<b class="s">你和当年那些人，有什么分别？</b>」混乱里，真正的黄雀——<b class="s">${MN}</b>——悄悄退出了广场。</p>`;
    tail = `<p>父亲一辈子不肯错判一个人。今天你替他结了案，却也替这座城，又冤了一个人。</p>${confession()}`;
  }
  const gr = grade(type);
  let best = null; try { best = JSON.parse(localStorage.getItem('hq_best') || 'null'); if (!best || gr.s > best.s) localStorage.setItem('hq_best', JSON.stringify({ s: gr.s, g: gr.g })); } catch (e) { }
  const mins = ((performance.now() - G.stats.t0) / 60000).toFixed(0);
  sfx(type === 'A' ? 'win' : 'fail');
  sheet(`<div class="stamp">${gr.g}</div><p class="kicker">${T[2]}</p><h1>${T[0]}<span>${T[1]}</span></h1>${head}
    <div class="letter" style="border-color:var(--seal)"><b>黄雀 · ${MN}</b>（${mole.job}）<br><span class="muted" style="font-size:14px">${MOTIVES[G.mole]}</span></div>
    <h2 style="font-size:22px;margin-top:14px">黄雀的这一晚</h2>${moleTimeline()}
    ${tail}
    <div class="grid2" style="font-size:14px;margin-top:10px">
      <div class="dq">收集记录 <b>${G.cards.length}</b> 张 · 偷听成功 <b>${G.stats.heard}</b> 次</div>
      <div class="dq">被发现 <b>${G.stats.spotted}</b> 次 · 出示错误 <b>${G.stats.wrong}</b> 次</div>
      <div class="dq">黄雀进度 <b>${G.bird}%</b> · 剩余铜钱 <b>${G.coins}</b></div>
      <div class="dq">用时约 <b>${mins}</b> 分钟 · 评分 <b>${gr.s}</b>（${gr.g}）</div>
    </div>
    <p class="center muted" style="font-size:13px">黄雀每局随机，行踪与谎言也随之改变。${best ? `历史最佳：${best.g}（${best.s}分）` : ''}</p>
    <div class="center"><button onclick="startGame()">🔄 再来一局</button><button class="alt" onclick="showTitle()">回到标题</button></div>`, true);
  G.mode = 'end';
}

/* ---------------- 标题 ---------------- */
function showTitle() {
  G.mode = 'title'; G.stage = 'title'; G.tick = null;
  $('hud').style.display = 'none'; $('dlg').style.display = 'none'; DLG.open = false;
  TOD.t = .52; TOD.target = .52; TOD.blackout = 0; CAM.override = null;
  let best = null; try { best = JSON.parse(localStorage.getItem('hq_best') || 'null'); } catch (e) { }
  $('ui').innerHTML = `<div class="sheet"><p class="kicker">奔跑吧 · 城市探索 · 剧本杀</p><h1>黄雀<span>在后</span></h1><h2 style="margin-top:-6px">迷城寻踪</h2>
    <p>百年老字号"德昌号"的老掌柜临终设局：一座暮色中的江南老城，五处藏着线索的地标，六个各怀心事的人。</p>
    <p>你是调查员<b>白一鸣</b>——二十年前办案民警的儿子。走遍老城破解谜题；在大家各自散开的时候<b class="s">跟踪、偷听</b>，记下每个人的行踪；终局<b class="s">当面对质</b>，用证据戳穿黄雀的谎言，再在城里<b class="s">追上ta，撕下名牌</b>。</p>
    <p class="muted" style="font-size:14px">🐦 黄雀每局随机 · 约 25–35 分钟 · ${best ? `最佳评级：${best.g}` : '首次游玩'}</p>
    <div class="keys">${IS_TOUCH ? '左下摇杆走动 · 右侧拖动转视角 · "调查"交互 · "疾跑""潜行"按钮' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 走动 · <kbd>Shift</kbd> 疾跑 · <kbd>C</kbd> 潜行 · <kbd>E</kbd> 交互 · 鼠标拖拽 转视角 · <kbd>J</kbd> 手册 · <kbd>M</kbd> 地图'}</div>
    <p class="center"><button style="font-size:20px" onclick="startGame()">🏮 入城</button><button class="alt" onclick="howTo()">怎么玩</button></p></div>`;
  $('ui').style.display = 'block';
}
function howTo() {
  $('ui').innerHTML = `<div class="sheet"><h2>怎么玩</h2>
    <p><b>① 破解四站谜题</b>：茶馆"茶碗藏珠"、邮局藏头诗、公园按碑文寻宝、书屋密码锁。每站可以带一位队友帮忙——但黄雀的"帮忙"里藏着谎话。</p>
    <p><b>② 自由时段</b>：两站之间大家会散开一阵。小地图上闪白圈的人正在做事。<b>靠近</b>能听清ta说什么，<b>蹲下</b>（C）不容易被发现；头顶的 <b class="s">?</b> 满了就会被发现。每个人都有秘密——看着可疑，不一定是黄雀。</p>
    <p><b>③ 对证词</b>：每段结束后大家各报行踪。黄雀会撒谎——和别人的证词、街坊的见闻、你亲眼所见对不上。街坊证人：王婶、刘伯、茶馆老板娘、陈局长、书屋店主。</p>
    <p><b>④ 黄雀进度</b>：黄雀每次得手都会上涨。撞破ta的行动、在熄灯时抓住ta，都能让ta落空。</p>
    <p><b>⑤ 终局对质</b>：选一个人，挑出ta话里的一句谎言，出示矛盾的证据。击破两句即定罪。出错会扣信誉。</p>
    <p><b>⑥ 撕名牌</b>：黄雀会夺路而逃。提前用路障堵住ta最可能跑的出口，追上去，<b>从背后</b>撕下名牌。</p>
    <p class="center"><button onclick="showTitle()">明白了</button></p></div>`;
}
