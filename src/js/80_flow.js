/* ============================================================
 * 流程：序章 → 茶馆 →（自由①）→ 邮局 →（自由②）→ 公园 → 赛跑 → 书屋（熄灯）→（自由③）→ 终局
 * ============================================================ */
const PER = ['一', '二', '三'];
function newGame() {
  Object.assign(G, {
    coins: 0, cakes: 0, bird: 0, cred: 3, mole: pick(IDS), period: -1, periodT: 0, plan: {}, claims: {}, cards: [], cardSet: new Set(), newCards: 0,
    helpers: {}, trust: {}, secrets: {}, sus: {}, scenes: {}, blocks: 2, shoes: false, remitBought: false, obj: null,
    stats: { heard: 0, sighted: 0, spotted: 0, coinsTotal: 0, wrong: 0, t0: performance.now() }, moleLog: [], flags: {}, townHeard: {}, caught: false,
    periodsDone: 0, periodsEnded: 0, broke: {}, boResult: null,
  });
  const M_ = G.mole;
  for (const id of IDS) { G.plan[id] = []; G.trust[id] = 0; }
  for (let p = 0; p < 3; p++) {
    const used = IDS.filter(i => i !== M_).map(i => HERRING[i][p].spot);
    for (const id of IDS) if (id !== M_) G.plan[id][p] = HERRING[id][p].spot;
    G.plan[M_][p] = pick(MOLE_SPOTS.filter(s => !used.includes(s)));
  }
  for (const id of IDS) if (id !== M_) G.claims[id] = HERRING[id].map(h => ({ text: h.alibi }));
  G.claims[M_] = [0, 1, 2].map(p => {
    const type = p === 0 ? 'A' : p === 1 ? 'B' : pick(['A', 'B']);
    if (type === 'A') {
      const I = pick(IDS.filter(i => i !== M_ && HERRING[i][p].alibi.includes('一个人')));
      return { type, with: I, text: `我一直跟${CAST[I].name}在${spotName(HERRING[I][p].spot)}，不信你问${CAST[I].name}。` };
    }
    const T = pick(Object.keys(TOWN));
    return { type, town: T, text: `我去${TOWN[T].place}找${TOWN[T].name}待了一阵，${TOWN[T].name}能作证。` };
  });
}
function contraForAlibi(id, p) { const mc = G.claims[G.mole][p]; return (id !== G.mole && mc.type === 'A' && mc.with === id) ? [{ who: G.mole, s: p }] : []; }

/* ---------------- 站点与交互点 ---------------- */
function siteSpot(key) { const s = SITES[key]; return { x: s.x, z: s.z, name: s.name }; }
function arrange(key, instant) {
  const s = SITES[key];
  IDS.forEach((id, i) => {
    const a = AG[id], off = (i - 2) * .42, x = s.host[0] + Math.sin(s.face + off) * 3.6, z = s.host[1] + Math.cos(s.face + off) * 3.6;
    const [cx, cz] = collide(x, z, .4);
    if (instant) { a.x = cx; a.z = cz; a.path = []; a.mode = 'gather'; a.ch.root.visible = true; }
    else goTo(a, cx, cz, 2.6);
    a.gatherAt = key;
  });
  if (instant) { fubo.x = s.host[0]; fubo.z = s.host[1]; fubo.path = []; } else goTo(fubo, s.host[0], s.host[1], 2.6);
  fubo.gatherAt = key;
}
function faceGroup() {
  for (const id of IDS) { const a = AG[id]; if (a.gatherAt && !a.path.length && a.mode !== 'scene') { const s = SITES[a.gatherAt]; if (G.mode === 'dialog' || G.mode === 'ui') faceTo(a, PL.x, PL.z); else faceTo(a, s.host[0], s.host[1]); } }
  if (fubo.gatherAt && !fubo.path.length) faceTo(fubo, PL.x, PL.z);
}
function setupInteract() {
  INTERACT.length = 0;
  const siteIt = (key, stage, label, fn) => INTERACT.push({ x: SITES[key].x, z: SITES[key].z, r: 3.6, label, fn, active: () => G.stage === stage });
  siteIt('tea', 'to_tea', '德昌茶馆 · 开始', () => runSite(siteTea));
  siteIt('post', 'free1', '老邮局 · 提前集合', () => earlyGather());
  siteIt('post', 'to_post', '老邮局 · 开始', () => runSite(sitePost));
  siteIt('park', 'free2', '公园 · 提前集合', () => earlyGather());
  siteIt('park', 'to_park', '公园 · 开始', () => runSite(sitePark));
  siteIt('book', 'race_book', '三味书屋 · 冲线！', () => raceFinish());
  siteIt('finale', 'free3', '德昌号 · 提前集合', () => earlyGather());
  siteIt('finale', 'to_finale', '德昌号旧址 · 终局', () => runSite(siteFinale));
  INTERACT.push({ x: TOWN.wang.pos[0], z: TOWN.wang.pos[1] - 2.2, r: 3.2, label: '取钥匙匣！', fn: () => raceCheckpoint(), active: () => G.stage === 'race_market' });
  INTERACT.push({ x: -6, z: -17.6, r: 2.4, label: '读石碑', fn: () => readStele(), active: () => G.stage === 'park_dig' || G.stage === 'to_park' || G.stage === 'free2' });
  for (const t of DIG_TREES) INTERACT.push({ x: t.x, z: t.z + .9, r: 1.5, label: '在这棵银杏下挖挖看', fn: () => digTree(t), active: () => G.stage === 'park_dig' });
  for (const b of BAGS) INTERACT.push(b);
}
async function runSite(fn) { if (G.busy) return; G.busy = true; try { await fn(); } finally { G.busy = false; } }

/* 藏起来的钱袋 */
const BAGS = [];
function setupBags() {
  for (const c of COINS) if (c.v > 1) scene.remove(c.m);
  BAGS.length = 0;
  for (const [x, z] of [[0, -87.2], [11.6, 52], [-64.4, -44.6], [21, -46.5], [-84, -11.5], [-27, -71]]) {
    spawnCoin(x, z, 5);
  }
}

/* ---------------- 开局 ---------------- */
async function startGame() {
  if (G.mode === 'load') return;
  audioInit();
  await fade(true, 400);
  closeSheet(); $('dlg').style.display = 'none'; DLG.open = false;
  newGame(); clearCoins(); setupBags(); setupInteract();
  endChaseCleanup();
  TOD.t = TOD.target = 0; TOD.blackout = 0;
  PL.x = 0; PL.z = 14; PL.yaw = 0; PL.crouch = false; PL.stamina = 100; PL.vx = PL.vz = 0;
  CAM.yaw = Math.PI; CAM.pitch = .38; CAM.dist = 9; CAM.override = null; CAM.tx = PL.x; CAM.tz = PL.z;
  player.tag && (player.tag.visible = true);
  for (const id of IDS) { const a = AG[id]; a.ch.root.visible = true; a.sus = 0; a.stun = 0; setAct(a.ch, null); a.crouch = 0; if (a.ch.tag) { a.ch.tag.visible = true; if (a.ch.tag.parent !== a.ch.torso) { a.ch.torso.add(a.ch.tag); a.ch.tag.position.set(0, .3, -.132); a.ch.tag.rotation.set(0, Math.PI, 0); } } }
  for (const k in TOWNAG) { const t = TOWN[k], a = TOWNAG[k]; a.x = t.pos[0]; a.z = t.pos[1]; a.yaw = t.yaw; a.path = []; setAct(a.ch, t.act || null); a.crouch = t.crouch || 0; }
  blackMan.ch.root.visible = false; blackMan.x = 0; blackMan.z = -300;
  arrange('plaza', true);
  G.stage = 'prologue'; G.mode = 'play';
  $('hud').style.display = 'block'; $('cred').style.display = 'none'; $('timer').style.display = 'none';
  $('vignette').className = '';
  setObj('序章 · 请柬', '去广场中央找<b>福伯</b>（提着灯笼的老人）', { x: fubo.x, z: fubo.z, name: '福伯' });
  updateHUD(); setMood('explore');
  await fade(false, 700);
  banner('奔跑吧 · 城市探索 · 剧本杀', '黄雀在后');
  setTimeout(() => toast(IS_TOUCH ? '左下摇杆移动 · 右侧拖动转视角' : 'WASD 移动 · 鼠标拖拽转视角 · E 交互', 3200), 2800);
}

/* ---------------- 与人交谈 ---------------- */
async function talkFubo() {
  if (G.busy) return;
  if (G.stage === 'prologue') return runSite(prologue);
  if (G.stage === 'race_market' || G.stage === 'race_book' || G.stage === 'race0') return;
  G.busy = true;
  try {
    faceTo(fubo, PL.x, PL.z);
    while (true) {
      const ops = [
        { t: '🕵️ 打听一个人的行踪（3🪙）', v: 'intel', dis: G.periodsEnded < 1 || G.coins < 3 },
        { t: '🧾 买那张转账回单的消息（8🪙）', v: 'remit', dis: G.remitBought || G.periodsEnded < 2 || G.coins < 8 },
        { t: `🚧 加派一队人手（5🪙）${G.blocks >= 3 ? '·已满' : ''}`, v: 'block', dis: G.blocks >= 3 || G.coins < 5 },
        { t: `👟 一双好跑鞋（4🪙）${G.shoes ? '·已有' : ''}`, v: 'shoes', dis: G.shoes || G.coins < 4 },
        { t: '❓ 下一步去哪', v: 'hint' }, { t: '告辞', v: 'bye', alt: true }];
      const v = await ask('fubo', pick(['白先生，福伯这儿有些门路，只是要点铜钱打点。', '老爷子交代过：该花的钱，别省。', '需要什么，尽管开口。']), ops);
      if (v === 'bye' || v === undefined) break;
      if (v === 'hint') { await say('fubo', G.obj ? `眼下该去<b>${G.obj.name}</b>。${G.period >= 0 ? '自由时段里，盯紧身边人——他们报的行踪，您可要对得上。' : ''}` : '跟着灯走就是。'); continue; }
      if (v === 'shoes') { G.coins -= 4; G.shoes = true; updateHUD(); await say('fubo', '千层底的，跑起来比风快。疾跑更久、更快。'); continue; }
      if (v === 'block') { G.coins -= 5; G.blocks++; updateHUD(); await say('fubo', `好，终局时能多堵一条路了（现在 ${G.blocks} 条）。`); continue; }
      if (v === 'remit') {
        G.coins -= 8; G.remitBought = true; updateHUD();
        addCard({ id: 'remit', kind: 'intel', title: '情报 · 味莱的转账回单', text: `福伯托老关系查到一张味莱集团"特别事务部"的转账回单，定金两万，收款人一栏写着：${CAST[G.mole].name}。`, contra: [{ who: G.mole, s: 3 }] });
        await say('fubo', `（压低声音）您自己看吧——收款人那一栏。<b class="s">${CAST[G.mole].name}</b>。`); continue;
      }
      if (v === 'intel') {
        const who = await ask('fubo', '打听谁？', IDS.map(id => ({ t: CAST[id].name, v: id })).concat([{ t: '算了', v: null, alt: true }]));
        if (!who) continue;
        const ps = [0, 1, 2].filter(p => p < G.periodsEnded);
        const p = ps.length === 1 ? 0 : await ask('fubo', '哪一段时间？', ps.map(p => ({ t: `第${PER[p]}段`, v: p })));
        if (p === undefined || p === null) continue;
        G.coins -= 3; updateHUD();
        const where = spotName(G.plan[who][p]);
        addCard({ id: `intel-${who}-${p}`, kind: 'intel', title: `情报 · ${CAST[who].name}的行踪`, text: `福伯打听到：第${PER[p]}段那会儿，${CAST[who].name}其实在${where}。`, per: p, who, contra: who === G.mole ? [{ who, s: p }] : [] });
        await say('fubo', `街坊说，第${PER[p]}段那会儿，${CAST[who].name}在<b>${where}</b>。已经记进您的手册了。`);
      }
    }
  } finally { G.busy = false; }
}
const GREET = ['嗯？找我？', '白先生，有事？', '怎么了？', '你说。'];
async function talkTeammate(id) {
  if (G.busy) return;
  const sc = G.scenes[id];
  if (sc && sc.phase === 'scene' && !sc.aborted) { spotted(id, sc); return; }
  G.busy = true;
  try {
    const a = AG[id]; faceTo(a, PL.x, PL.z);
    const ops = [{ t: '💬 聊聊', v: 'chat' }, G.cakes > 0 ? { t: '🥮 送一块桂花糕', v: 'cake' } : null, G.periodsDone > 0 ? { t: '🗺 再问问刚才的行踪', v: 'ali' } : null, { t: '没事', v: 'bye', alt: true }].filter(Boolean);
    const v = await ask(id, pick(GREET), ops);
    if (v === 'cake') { G.cakes--; G.trust[id] = (G.trust[id] || 0) + 1; updateHUD(); await say(id, pick(['……桂花糕？谢谢。', '哟，还挺香。', '你怎么知道我好这口？'])); }
    if (v === 'chat' || v === 'cake') {
      if ((G.trust[id] || 0) >= 2 && !G.secrets[id]) {
        G.secrets[id] = true;
        await say(id, '……白先生，你对我不错。有件事，我憋了一路了。');
        await say(id, CAST[id].secret);
        addCard({ id: `secret-${id}`, kind: 'secret', title: `坦白 · ${CAST[id].name}`, text: CAST[id].secret, who: id });
        toast(`📖 ${CAST[id].name}向你坦白了秘密`);
      } else if (v === 'chat') await say(id, pick(CAST[id].chat) + ((G.trust[id] || 0) < 2 ? '<span class="muted">（再熟一点，也许ta会说真心话。）</span>' : ''));
    }
    if (v === 'ali') { const p = G.periodsDone - 1; await say(id, G.claims[id][p].text); }
  } finally { G.busy = false; }
}
async function talkTown(k) {
  if (G.busy) return; G.busy = true;
  try {
    const t = TOWN[k], a = TOWNAG[k]; if (k !== 'liu') faceTo(a, PL.x, PL.z);
    let first = pick(t.lines);
    const newP = [0, 1, 2].filter(p => p < G.periodsEnded && !G.cardSet.has(`town-${k}-${p}`));
    if (newP.length) {
      await say(k, first);
      for (const p of newP) {
        const vis = IDS.filter(id => SPOT_WITNESS[G.plan[id][p]] === k);
        const txt = vis.length ? `第${PER[p]}段那会儿？来过我这儿的，就${vis.map(i => CAST[i].name).join('和')}。` : `第${PER[p]}段那会儿？你们那伙人，一个都没往我这儿来。`;
        const mc = G.claims[G.mole][p];
        addCard({ id: `town-${k}-${p}`, kind: 'testi', title: `证人 · ${t.name}（${t.place}）`, text: `${t.name}：「${txt}」`, per: p, contra: mc.type === 'B' && mc.town === k ? [{ who: G.mole, s: p }] : [] });
        await say(k, txt);
      }
      G.townHeard[k] = true;
    } else if (G.periodsEnded < 1) await say(k, first + '<span class="muted">（等大家各自散开过一次，再来问问街坊见过谁。）</span>');
    if (k === 'wang') {
      const v = await ask('wang', G.periodsEnded || newP.length ? '要不要带块桂花糕？送人最体面。' : first, [{ t: '买一块桂花糕（2🪙）', v: 'buy', dis: G.coins < 2 }, { t: '不用了', v: 'no', alt: true }]);
      if (v === 'buy') { G.coins -= 2; G.cakes++; updateHUD(); toast('🥮 买了一块桂花糕——送给队友能拉近关系'); }
    } else if (!newP.length && G.periodsEnded >= 1) await say(k, first + '<span class="muted">（该问的都问过了。）</span>');
  } finally { G.busy = false; }
}

/* ---------------- 求助 ---------------- */
function helperPick(site) {
  return new Promise(res => {
    const H = HELP[site];
    sheet(`<span class="tag">${H.title} · 带谁帮忙？</span>
      <p class="muted" style="font-size:14px;margin-top:0">每个人专长不同，选对人事半功倍，也会拉近你们的关系。但记住——<b class="s">队伍里有一只黄雀</b>，ta的"帮忙"未必是帮忙。</p>
      ${IDS.map(id => `<button class="opt" data-id="${id}"><img src="${PORTRAIT[id]}"><span><b>${CAST[id].name}</b> · <span class="muted">${CAST[id].skill}</span></span></button>`).join('')}
      <p class="center"><button class="alt" data-id="">不求助，自己来</button></p>`);
    $('ui').querySelectorAll('button[data-id]').forEach(b => b.onclick = () => { sfx('click'); closeSheet(); res(b.dataset.id || null); });
  });
}
async function doHelp(site) {
  const id = await helperPick(site); G.helpers[site] = id;
  if (!id) return null;
  const H = HELP[site], n = CAST[id].name;
  G.trust[id] = (G.trust[id] || 0) + 1;
  let line;
  if (id === G.mole) { line = H.m(n); addCard({ id: `help-${site}`, kind: 'help', title: `说法 · ${n}（${H.title}）`, text: H.lieCard(n).replace(/<[^>]+>/g, ''), who: id, contra: [{ who: id, s: 3 }] }); }
  else { line = id === H.best ? H.gBest(n) : H.g(n); addCard({ id: `help-${site}`, kind: 'help', title: `说法 · ${n}（${H.title}）`, text: line.replace(/<[^>]+>/g, ''), who: id }); }
  await say(id, line);
  return id;
}

/* ---------------- 序章 ---------------- */
async function prologue() {
  faceTo(fubo, PL.x, PL.z);
  await sayAll([
    ['fubo', '白先生，您来了。我是福伯，德昌号的管家，也是老爷子遗嘱的执行人。'],
    ['fubo', '老爷子走前只留下一句话：<b class="s">真正的德昌号，藏在这座城里。</b>五个地方，五条线索，走完了，您就知道二十年前的四月十七，德昌号里到底发生了什么。'],
    ['bai', '（你摸了摸口袋里父亲的笔记本。最后一页写着："现场系伪造。存疑：报案人。愧对顾。"）'],
    ['fubo', '还有一句，福伯必须原样带到——<b class="s">"螳螂捕蝉，黄雀在后。我请来的人里，有一只黄雀。"</b>'],
    ['fubo', '每两站之间，大家各自散开一刻钟。那时候，<b>谁去了哪儿、见了谁、说了什么</b>……您得自己盯着。回来以后大家会各报行踪——对不上的，就是破绽。'],
  ]);
  addCard({ id: 'clue-0', kind: 'clue', title: '父亲的笔记', text: '"现场系伪造。存疑：报案人。愧对顾。"——二十年前的失窃案，另有隐情。' });
  await say('fubo', '不过开张之前，先活动活动腿脚。老规矩——<b>抢铜钱</b>！我这一把撒出去，三十息之内，谁捡得多谁得。');
  await coinRace();
}
async function coinRace() {
  G.stage = 'race0';
  const spots = []; for (let i = 0; i < 22; i++) { let x, z; do { const a = rand(0, 6.28), r = rand(2, 14); x = Math.cos(a) * r; z = 24 + Math.sin(a) * r * .9; } while (blockedAt(x, z, .6)); spots.push([x, z]); }
  const race = []; for (const [x, z] of spots) { spawnCoin(x, z); race.push(COINS[COINS.length - 1]); }
  const counts = {}; IDS.forEach(id => counts[id] = 0);
  const before = G.coins;
  setObj('热身 · 抢铜钱', '30 秒内在广场上捡铜钱！按住 <kbd>Shift</kbd> 疾跑', null);
  banner('热身', '抢 铜 钱', 1400);
  for (const id of IDS) { AG[id].raceSpd = rand(4.2, 5.4); AG[id].gatherAt = null; }
  G.mode = 'play';
  let T = 30;
  await new Promise(res => {
    G.tick = dt => {
      T -= dt; $('timer').style.display = 'block'; $('timer').firstChild.style.width = (T / 30 * 100) + '%';
      $('obj').innerHTML = `捡铜钱！还剩 <b class="gold">${Math.ceil(T)}</b> 秒 · 你：${G.coins - before} 枚`;
      for (const id of IDS) {
        const a = AG[id];
        const live = race.filter(c => !c.got);
        if (!live.length) break;
        if (!a.tc || a.tc.got) { a.tc = live.reduce((b, c) => hyp(c.x - a.x, c.z - a.z) < hyp(b.x - a.x, b.z - a.z) ? c : b); goStraight(a, a.tc.x, a.tc.z, a.raceSpd); }
        if (hyp(a.tc.x - a.x, a.tc.z - a.z) < .9 && !a.tc.got) { a.tc.got = true; scene.remove(a.tc.m); counts[id]++; a.tc = null; }
      }
      if (T <= 0 || race.every(c => c.got)) { G.tick = null; res(); }
    };
  });
  for (const c of race) if (!c.got) { c.got = true; scene.remove(c.m); }
  $('timer').style.display = 'none';
  const mine = G.coins - before;
  const board = [['bai', mine], ...IDS.map(id => [id, counts[id]])].sort((a, b) => b[1] - a[1]);
  const rank = board.findIndex(b => b[0] === 'bai') + 1;
  const bonus = rank === 1 ? 3 : rank === 2 ? 1 : 0;
  if (bonus) gainCoins(bonus, true);
  sfx(rank === 1 ? 'win' : 'coin');
  arrange('plaza');
  await sheetWait(`<span class="tag">热身结果</span><h2>${rank === 1 ? '头名！' : `第 ${rank} 名`}</h2>
    ${board.map(([w, n], i) => `<div class="dq"><span class="who">${i + 1}. ${w === 'bai' ? '你（白一鸣）' : CAST[w].name}</span> —— ${n} 枚</div>`).join('')}
    ${bonus ? `<p>福伯另赏 <b class="gold">${bonus}🪙</b>。</p>` : ''}<p class="muted" style="font-size:14px">铜钱可以在福伯那里买情报、加派人手、换跑鞋；东市王婶的桂花糕能送人，拉近关系。</p>`);
  await say('fubo', '好身手。第一站——<b>德昌茶馆</b>，就在东西大街西头。诸位，跟我来。');
  G.stage = 'to_tea'; arrange('tea'); TOD.target = .1;
  setObj('第一站 · 德昌茶馆', '跟着光柱，去<b>德昌茶馆</b>', siteSpot('tea'));
}

/* ---------------- 自由时段 ---------------- */
async function beginFree(p, next, nextName) {
  G.stage = 'free' + (p + 1);
  for (const id of IDS) AG[id].gatherAt = null;
  fubo.gatherAt = null;
  startPeriod(p, next);
  scatterCoins(9);
  TOD.target = [.22, .42, .82][p];
  setObj(`自由时段 · 第${PER[p]}段`, `大家散开了。<b>跟上可疑的人</b>，偷听、记下行踪——或者直接去<b>${nextName}</b>等。<br><span class="muted">小地图上闪白圈的人正在做什么事。</span>`, siteSpot(next));
  if (!G.flags.tut) {
    G.flags.tut = true;
    await sayAll([
      ['fubo', `一刻钟后，${nextName}集合。各位——自便。`],
      ['bai', '（自由时段。这是看清每个人的机会。）'],
      ['bai', `（<b>靠近</b>到能听清的距离，就能偷听到ta在说什么；${IS_TOUCH ? '点"潜行"' : '按 <b>C</b>'} 蹲下，脚步轻、不容易被发现。头顶的 <b class="s">?</b> 涨满，就会被发现。）`],
      ['bai', '（离远了只能看见ta在哪、在干嘛——那也算线索。<b>最后大家会报自己的行踪，谎话会和你看到的对不上。</b>）'],
    ]);
  } else await say('fubo', `一刻钟后，${nextName}集合。诸位自便。`);
}
async function earlyGather() {
  if (G.busy) return;
  const left = Math.ceil(G.periodLen - G.periodT);
  const busy = IDS.some(id => { const s = G.scenes[id]; return s && (s.phase === 'scene' || s.phase === 'go'); });
  if (busy && left > 5) {
    const v = await ask('bai', `（还剩约 ${left} 秒。还有人在外面没回来——现在就集合，他们在做的事你就看不到了。）`, [{ t: '现在就集合', v: 1 }, { t: '再转转', v: 0, alt: true }]);
    if (!v) return;
  }
  await endFree();
}
function periodTimeout() { if (G.period >= 0 && !G.busy) { toast('🕰 福伯：时候到了，诸位集合！', 2500); endFree(); } else setTimeout(periodTimeout, 800); }
async function endFree() {
  if (G.period < 0) return;
  const p = G.period, next = G.nextSite;
  G.busy = true;
  for (const id of IDS) {
    const sc = G.scenes[id];
    if (sc && sc.phase !== 'done') { const was = sc.phase; sc.phase = 'done'; sc.done = !sc.aborted; setAct(AG[id].ch, null); AG[id].crouch = 0; if (sc.isMole) G.moleLog.push({ p, spot: sc.spot, done: sc.done, black: sc.black, offscreen: was !== 'scene' }); }
  }
  const msc = G.scenes[G.mole];
  blackMan.ch.root.visible = false; blackMan.path = []; blackMan.z = -300;
  G.period = -1; G.periodsEnded = p + 1; $('timer').style.display = 'none'; $('stealth').style.display = 'none';
  const far = IDS.some(id => hyp(AG[id].x - SITES[next].x, AG[id].z - SITES[next].z) > 12);
  if (far) { await fade(true, 350); arrange(next, true); await fade(false, 450); } else arrange(next);
  G.busy = false;
  if (msc.done) { G.bird = Math.min(100, G.bird + 25); updateHUD(); sfx('birds'); toast('🐦 远处的屋檐上，一只黄雀扑棱棱飞走了……<br><span style="font-size:15px">黄雀进度 +25%</span>', 3200); }
  else toast('🐦 黄雀这一次没能得手。', 2200);
  const stageTo = { post: 'to_post', park: 'to_park', finale: 'to_finale' }[next];
  G.stage = stageTo;
  setObj(`集合 · ${SITES[next].name}`, `大家都到了。去<b>${SITES[next].name}</b>。`, siteSpot(next));
  if (hyp(PL.x - SITES[next].x, PL.z - SITES[next].z) < 5) { const fn = { post: sitePost, park: sitePark, finale: siteFinale }[next]; runSite(fn); }
}
/* 各报行踪 */
async function alibiRound(p) {
  await say('fubo', '人齐了。老规矩——刚才那一刻钟，各位都去了哪儿？');
  for (const id of IDS) addCard({ id: `ali-${id}-${p}`, kind: 'testi', title: `${CAST[id].name} · 第${PER[p]}段自述`, text: `「${G.claims[id][p].text}」`, per: p, who: id, contra: contraForAlibi(id, p) });
  G.periodsDone = p + 1;
  await sheetWait(`<span class="tag">第${PER[p]}段 · 各报行踪</span>
    <p class="muted" style="font-size:14px;margin-top:0">都记进手册了（手册 → 证词 / 行踪表）。<b class="s">和你亲眼所见、和街坊的说法对一对</b>——撒谎的人，总会有一处对不上。</p>
    ${IDS.map(id => `<div class="opt" style="cursor:default"><img src="${PORTRAIT[id]}"><span><b>${CAST[id].name}</b>：「${esc(G.claims[id][p].text)}」</span></div>`).join('')}
    <p class="muted" style="font-size:13px">街坊证人（王婶、刘伯、茶馆老板娘、陈局长、书屋店主）也许见过谁——找他们聊聊。</p>`, '记下了');
}

/* ---------------- 第一站：茶馆 ---------------- */
async function siteTea() {
  G.stage = 'tea'; arrange('tea'); setObj('第一站 · 德昌茶馆', '对暗号、赢彩头', null);
  await say('boss', '哟，老沈说的客人到了？想看二十年前的旧报纸——老规矩，先对暗号。');
  const hid = await doHelp('tea');
  let ok = false;
  while (!ok) {
    const v = await ask('boss', '上句是：<b>螳螂捕蝉</b>——下句呢？', shuffle([{ t: '「黄雀在后。」', v: 1 }, { t: '「雀上高枝。」', v: 0 }, { t: '「蝉鸣依旧。」', v: 0 }]));
    if (v === 1) ok = true; else await say('boss', '不对。回去想想请柬上那位老爷子，最爱说哪句老话。');
  }
  await say('boss', '对上了。报纸给你们——不过得先赢我一局「茶碗藏珠」。三局，赢一局给一份彩头。');
  const mul = hid === G.mole ? 1 : hid === 'gu' ? 1.35 : hid ? 1.12 : 1;
  const wins = await shellGame(mul);
  if (wins) gainCoins(wins * 2, true);
  await say('boss', wins === 3 ? '好眼力！老沈要是看见，准得乐。' : wins ? `赢了 ${wins} 局，不赖。` : '眼神还得练练。报纸照给，彩头就没了。');
  sfx('clue');
  addCard({ id: 'clue-1', kind: 'clue', title: '线索一 · 2006年《城南晚报》', text: '头版：「百年德昌号祖传配方失窃 学徒顾某涉重大嫌疑」。案发于4月17日夜（4月18日见报）。办案民警白国安（你父亲）："证据不足，不对任何人定性。"角落小广告："莱记商行——蜜饯糖料，价廉物美。"' });
  await sheetWait(`<span class="tag">线索一 · 入册</span>
    <div class="letter"><b style="font-size:18px">百年德昌号祖传配方失窃 学徒顾某涉重大嫌疑</b><br><span class="muted" style="font-size:14px">《城南晚报》2006年<b>4月18日</b>头版</span><br>
    本报讯　本市百年老字号德昌号于<b class="s">四月十七日夜</b>发生失窃案，店主沈德昌报案称祖传桂花糕配方不翼而飞。知情人士透露，案发当晚仅学徒<b>顾守拙</b>出入内室。办案民警<b>白国安</b>表示："目前证据不足，不对任何人定性。"<br>
    <span class="muted" style="font-size:13px">（角落小广告：<b class="s">"莱记商行——蜜饯糖料，价廉物美。"</b>）</span></div>
    <p>父亲的名字印在二十年前的头版上。这一案，你替他查完。</p>`);
  await beginFree(0, 'post', '老邮局');
}
/* 茶碗藏珠 */
function shellGame(mul) {
  return new Promise(res => {
    const cupSVG = `<svg viewBox="0 0 100 100"><defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#cfd8e0"/><stop offset=".5" stop-color="#fbfdff"/><stop offset="1" stop-color="#b8c4ce"/></linearGradient></defs>
      <path d="M8 92 Q10 30 50 22 Q90 30 92 92 Z" fill="url(#cg)" stroke="#2a3a5a" stroke-width="2"/><rect x="36" y="12" width="28" height="12" rx="3" fill="url(#cg)" stroke="#2a3a5a" stroke-width="2"/>
      <path d="M18 70 Q50 58 82 70" fill="none" stroke="#2E5AA0" stroke-width="4"/><path d="M24 52 q8 -10 16 0 q8 10 16 0 q8 -10 16 0" fill="none" stroke="#2E5AA0" stroke-width="3"/><circle cx="50" cy="80" r="5" fill="#2E5AA0"/></svg>`;
    let round = 0, wins = 0, slots = [0, 1, 2], pearlCup = 1, busy = true;
    sheet(`<span class="tag">茶碗藏珠</span><div id="sg-t" style="font-size:16px">第 1 局 · 看好珠子在哪只碗下</div>
      <div class="cups" id="cups"><div class="table-top"></div><div class="pearl" id="pearl"></div>${[0, 1, 2].map(i => `<div class="cup" data-c="${i}">${cupSVG}</div>`).join('')}</div>
      <div class="center coinrow" id="sg-m">&nbsp;</div>`);
    const cupsEl = [...$('ui').querySelectorAll('.cup')], pearl = $('pearl');
    const X = s => (18 + s * 32) + '%';
    const place = () => { cupsEl.forEach((c, i) => { c.style.left = X(slots[i]); c.style.bottom = '26px'; c.style.zIndex = 2; }); };
    place();
    const lift = (i, up) => { cupsEl[i].style.transition = 'bottom .3s'; cupsEl[i].style.bottom = up ? '96px' : '26px'; };
    const swap = (a, b, dur) => new Promise(r => {
      const ia = slots.indexOf(a), ib = slots.indexOf(b);
      const ca = cupsEl[ia], cb = cupsEl[ib]; const t0 = performance.now();
      ca.style.transition = cb.style.transition = 'none';
      const step = now => {
        const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const xa = lerp(18 + a * 32, 18 + b * 32, e), xb = lerp(18 + b * 32, 18 + a * 32, e);
        ca.style.left = xa + '%'; cb.style.left = xb + '%';
        ca.style.transform = `translateY(${Math.sin(k * Math.PI) * 14}px) scale(${1 + Math.sin(k * Math.PI) * .06})`; ca.style.zIndex = 3;
        cb.style.transform = `translateY(${-Math.sin(k * Math.PI) * 10}px) scale(${1 - Math.sin(k * Math.PI) * .06})`; cb.style.zIndex = 1;
        if (k < 1) requestAnimationFrame(step); else { slots[ia] = b; slots[ib] = a; ca.style.transform = cb.style.transform = ''; r(); }
      };
      requestAnimationFrame(step);
    });
    const start = async () => {
      busy = true;
      $('sg-t').innerHTML = `第 ${round + 1} 局 · 看好珠子在哪只碗下`;
      pearlCup = randi(0, 2);
      pearl.style.left = X(slots[pearlCup]); pearl.style.opacity = 1;
      lift(pearlCup, true); await new Promise(r => setTimeout(r, 900)); lift(pearlCup, false); await new Promise(r => setTimeout(r, 400));
      pearl.style.opacity = 0;
      const n = [5, 7, 10][round], dur = [470, 340, 250][round] * mul;
      for (let i = 0; i < n; i++) { const a = randi(0, 2); let b = randi(0, 1); if (b >= a) b++; await swap(a, b, dur); }
      $('sg-t').innerHTML = `第 ${round + 1} 局 · <b class="s">珠子在哪？</b>点一只碗`;
      busy = false;
    };
    cupsEl.forEach((c, i) => c.onclick = async () => {
      if (busy) return; busy = true;
      const win = i === pearlCup;
      pearl.style.left = X(slots[pearlCup]); pearl.style.opacity = 1;
      lift(i, true); if (!win) setTimeout(() => lift(pearlCup, true), 350);
      sfx(win ? 'coin' : 'fail'); if (win) wins++;
      $('sg-m').innerHTML = win ? '<b class="gold">猜中了！+2🪙</b>' : '<span class="s">空的……</span>';
      await new Promise(r => setTimeout(r, 1300));
      cupsEl.forEach((_, k) => lift(k, false)); await new Promise(r => setTimeout(r, 400));
      $('sg-m').innerHTML = '&nbsp;';
      round++;
      if (round < 3) start(); else { closeSheet(); res(wins); }
    });
    setTimeout(start, 500);
  });
}

/* ---------------- 第二站：邮局 ---------------- */
async function sitePost() {
  G.stage = 'post'; arrange('post'); setObj('第二站 · 老邮局', '各报行踪，然后读那封信', null);
  await alibiRound(0);
  await say('chen', '老沈说，走到这儿的人，配读这封信。——他在我这儿压了整整二十年。');
  const hid = await doHelp('post');
  const hint = hid && hid !== G.mole && hid === 'shen';
  const res = await poemPuzzle(hint);
  if (res) gainCoins(res, true);
  sfx('clue');
  addCard({ id: 'clue-2', kind: 'clue', title: '线索二 · 沈德昌的藏头诗', text: '竖读每行首字："黄雀在身边"——内鬼确凿存在。"黄铜锁扣自内落"：当年的锁是从里面落下的——根本没有外贼，现场是伪造的。' });
  await sheetWait(`<span class="tag">线索二 · 入册</span><p>竖读首字——<b class="s brush" style="font-size:28px">黄 雀 在 身 边</b></p>
    <p>老掌柜早就知道队伍里有内鬼。还有一句扎眼的："锁扣<b>自内</b>落"——和父亲笔记里"现场系伪造"对上了。<b class="s">当年根本没有外贼。</b></p>`);
  await beginFree(1, 'park', '公园');
}
function poemPuzzle(hinted) {
  const L = ['黄铜锁扣自内落', '雀衔桂枝印火漆', '在案卷上蒙尘者', '身负污名二十载', '边角账页留半纸'];
  const ans = '黄雀在身边';
  return new Promise(res => {
    let sel = [], fails = 0;
    const draw = () => {
      sheet(`<span class="tag">老邮局 · 沈德昌的信</span>
        <div class="letter" style="font-size:14px">见字如面。走到这里的人，配读这封信。</div>
        <div class="poem">${L.map((ln, r) => [...ln].map((ch, c) => `<span data-r="${r}" data-c="${c}" class="${sel.some(s => s[0] === r && s[1] === c) ? 'on' : ''} ${(hinted || fails >= 2) && c === 0 ? 'hint' : ''}">${ch}</span>`).join('')).join('')}</div>
        <div class="letter" style="font-size:14px">聪明人，竖着读。读懂了，就替我看好你们身边的每一个人。——沈德昌</div>
        <p class="center muted" style="font-size:14px">诗里藏着一句五个字的话。按顺序点出这五个字。</p>
        <div class="picked" id="pk">${sel.map(s => L[s[0]][s[1]]).join('') || '·····'}</div>
        <p class="center"><button class="alt" id="pz-clr">重选</button>${fails >= 1 ? '<button class="alt" id="pz-skip">求福伯提示</button>' : ''}</p>`);
      $('ui').querySelectorAll('.poem span').forEach(el => el.onclick = () => {
        const r = +el.dataset.r, c = +el.dataset.c;
        if (sel.some(s => s[0] === r && s[1] === c)) return;
        sel.push([r, c]); sfx('click');
        if (sel.length === 5) {
          const w = sel.map(s => L[s[0]][s[1]]).join('');
          if (w === ans) { sfx('win'); closeSheet(); res(fails === 0 ? 3 : fails === 1 ? 2 : 1); return; }
          fails++; sel = []; draw(); $('pk').classList.add('shake'); sfx('fail'); $('pk').textContent = '不对……'; return;
        }
        draw();
      });
      $('pz-clr').onclick = () => { sel = []; draw(); };
      if ($('pz-skip')) $('pz-skip').onclick = () => { fails = Math.max(fails, 2); sel = []; draw(); toast('福伯：每行的第一个字，连起来读。'); };
    };
    draw();
  });
}

/* ---------------- 第三站：公园 ---------------- */
let digTries = 0;
async function sitePark() {
  G.stage = 'park'; arrange('park'); setObj('第三站 · 公园', '各报行踪，然后寻宝', null);
  await alibiRound(1);
  await say('fubo', '老爷子在这园子里埋了样东西。他只留了一句——<b class="s">去读亭边的石碑。</b>');
  await doHelp('park');
  digTries = 0;
  G.stage = 'park_dig';
  setObj('第三站 · 公园寻宝', '先读<b>亭边的石碑</b>，再找对那棵银杏，按 E 挖开', { x: -6, z: -17.6, name: '石碑' });
  toast('🪦 石碑在月洞门进来左手边');
}
async function readStele() {
  await sheetWait(`<span class="tag">石碑</span><div class="letter old" style="text-align:center">亭东银杏七株<br>其三藏秋</div>
    <p class="muted" style="font-size:14px">"亭"是西边那座听秋亭。<b>亭子东边</b>那一排七棵银杏里，第三棵……从哪头数？</p>
    <p class="muted" style="font-size:13px">提示：屏幕上方罗盘和小地图都是上北下南。东边是地图右侧。</p>`, '去找那棵树');
  if (G.stage === 'park_dig') setObj('第三站 · 公园寻宝', '"亭东银杏七株，其三藏秋"——找到那棵银杏，按 E 挖', { x: 12.6, z: -24, name: '银杏道' });
}
async function digTree(t) {
  if (G.busy) return; G.busy = true;
  setAct(player, 'dig'); G.mode = 'cutscene';
  for (let i = 0; i < 3; i++) { sfx('dig'); await new Promise(r => setTimeout(r, 380)); }
  setAct(player, null); G.mode = 'play'; G.busy = false;
  digTries++;
  if (t.fromEast !== 3) { toast(`🕳 土是实的，什么都没有……（这是从东数第 ${t.fromEast} 棵）`, 2400); return; }
  G.stage = 'park_found';
  gainCoins(digTries === 1 ? 3 : digTries === 2 ? 2 : 1, true);
  sfx('clue');
  addCard({ id: 'clue-3', kind: 'clue', title: '线索三 · 账本残页', text: '丙戌年四月：4月10日莱记桂花蜜廿坛入库；4月14日"莱记 桂花蜜 廿坛——退"；4月15日送检。朱批："蜜不对。守拙验出来的。蝉不知螳螂——螳螂也未必知道树后头的东西。"案发前三天，德昌号把莱记的蜜退货送检。' });
  await sheetWait(`<span class="tag">线索三 · 入册</span><p>树根旁的土是松的。你挖出一只油布包——里面是一页烧焦边角的账本。</p>
    <div class="letter">丙戌年四月<br>4月10日　莱记 桂花蜜 廿坛 入库<br><b>4月14日　莱记 桂花蜜 廿坛——退</b><br>4月15日　送 检〔后字被墨涂去〕<br>
    <span class="muted">朱批："蜜不对。守拙验出来的。<b class="s">蝉不知螳螂——螳螂也未必知道树后头的东西。</b>"</span></div>
    <p>案发前三天，德昌号把莱记的蜜整批退货送检。"莱记"——报纸角落那个广告，又出现了。</p>`);
  arrange('park');
  await say('fubo', '找到了？好！……糟了，天色不早，<b>三味书屋七点关门</b>！');
  await say('fubo', '老爷子寄存的钥匙匣在<b>东市王婶</b>那儿。谁先取了匣子、再赶到<b>三味书屋</b>，福伯重重有赏——跑起来！');
  await raceBook();
}

/* ---------------- 赛跑：公园 → 东市 → 书屋 ---------------- */
let RACE = null;
async function raceBook() {
  TOD.target = .6;
  RACE = { t: 0, done: [], leg: {} };
  for (const id of IDS) { const a = AG[id]; a.gatherAt = null; a.raceSpd = rand(5.4, 6.9); RACE.leg[id] = 0; }
  for (let k = 3; k > 0; k--) { banner('赛跑 · 东市取匣 → 三味书屋', String(k), 700); await new Promise(r => setTimeout(r, 850)); }
  banner('赛跑', '跑！', 800);
  G.stage = 'race_market';
  setObj('赛跑 · 第一程', '先去<b>东市王婶的糕摊</b>取钥匙匣！<kbd>Shift</kbd> 疾跑', { x: 70, z: -3.5, name: '王婶糕摊' });
  for (const id of IDS) goTo(AG[id], 70 + rand(-1.5, 1.5), -3.6, AG[id].raceSpd);
  goTo(fubo, SITES.book.host[0], SITES.book.host[1], 6);
  setMood('chase');
  G.tick = dt => {
    RACE.t += dt;
    for (const id of IDS) {
      const a = AG[id];
      if (RACE.leg[id] === 0 && !a.path.length) { RACE.leg[id] = 1; goTo(a, SITES.book.x + rand(-2, 2), SITES.book.z + rand(-1, 1.5), a.raceSpd); }
      else if (RACE.leg[id] === 1 && !a.path.length) { RACE.leg[id] = 2; RACE.done.push(id); }
    }
    $('obj').innerHTML = (G.stage === 'race_market' ? '先去<b>东市王婶的糕摊</b>取钥匙匣！' : '拿到了！冲向<b>三味书屋</b>！') + ` <span class="muted">${RACE.t.toFixed(1)}s · 已到 ${RACE.done.length} 人</span>`;
  };
}
async function raceCheckpoint() {
  if (G.stage !== 'race_market') return;
  G.stage = 'race_book'; sfx('coin');
  bubble(TOWNAG.wang, '钥匙匣在这儿！快跑！', 2.5);
  setObj('赛跑 · 第二程', '拿到了！冲向<b>三味书屋</b>！', siteSpot('book'));
}
async function raceFinish() {
  if (G.stage !== 'race_book') return;
  G.tick = null; G.stage = 'book';
  const rank = RACE.done.length + 1;
  const bonus = [5, 3, 2, 1, 1, 1][rank - 1];
  gainCoins(bonus, true); setMood('explore');
  for (const id of IDS) if (RACE.leg[id] < 2) { /* 其余人随后赶到 */ }
  sfx(rank === 1 ? 'win' : 'coin');
  banner(`用时 ${RACE.t.toFixed(1)} 秒`, rank === 1 ? '头名冲线！' : `第 ${rank} 名`, 2000);
  await new Promise(r => setTimeout(r, 1200));
  await fade(true, 300); arrange('book', true); await fade(false, 400);
  await say('fubo', `（气喘吁吁）${rank === 1 ? '白先生好腿脚！' : '都到了，都到了。'}赏 <b class="gold">${bonus}🪙</b>。`);
  runSite(siteBook);
}

/* ---------------- 第四站：书屋 ---------------- */
async function siteBook() {
  G.stage = 'book'; arrange('book'); setObj('第四站 · 三味书屋', '打开老掌柜的铁匣', null);
  TOD.target = .7;
  await say('shu', '老沈这只铁匣，在我这儿放了十年。他说——钥匙不是铜的，是<b>记性</b>。');
  const hid = await doHelp('book');
  const tries = await cryptex();
  gainCoins([0, 1, 2, 4][tries], true);
  sfx('clue');
  addCard({ id: 'clue-4', kind: 'clue', title: '线索四 · 检验单与半张配方', text: '检验报告单：送检日期2006年4月16日，送检人沈德昌，样品"莱记商行桂花蜜"，结论"致敏物超标十二倍，不得用于食品"。另有《德昌桂花糕·改方》下半阙，撕口有半枚衔桂雀鸟火漆印。——先知道蜜有毒，后"丢"了配方：失窃案是老掌柜自导自演。' });
  await sheetWait(`<span class="tag">线索四 · 入册</span>
    <div class="letter"><b>检验报告单</b>　送检日期：2006年<b>4月16日</b>　送检人：<b>沈德昌</b><br>样品：桂花蜜（莱记商行）<br>结论：<b class="s">致敏物超标十二倍</b>，不得用于食品。</div>
    <div class="letter"><b>德昌桂花糕 · 改方（下半阙）</b>　〔撕口处有半枚衔桂雀鸟火漆印〕<br><span class="muted">背面小字："上半阙托付故人。持之来见者，即我故人。"</span></div>
    <p>送检4月16，"失窃"4月17。<b class="s">先知道蜜有毒，后"丢"了配方。</b>莱记掉包投毒 → 老掌柜将计就计，自导自演失窃案把配方藏起来——却让学徒顾守拙背了二十年黑锅。</p>`);
  await say('tang', '（突然捂住嘴）这个火漆印……我、我包里有个东西，你们看——');
  await say('tang', '（她颤着手掏出半张泛黄的纸。两个撕口，<b class="s">严丝合缝</b>。）奶奶说，等持另一半的人来……原来等的是今天。');
  await say('fubo', '齐了。老爷子的方子，二十年来头一回合在一处——');
  await blackout();
}

/* 密码锁 */
function cryptex() {
  return new Promise(res => {
    const d = [0, 0, 0, 0]; let left = 3;
    const draw = (msg = '') => {
      sheet(`<span class="tag">三味书屋 · 铁匣</span>
        <div class="letter" style="text-align:center">「头版记得那一天，请柬写着那一天。<br><b>月在前，日在后。</b>三次机会。」</div>
        <div class="lock">${d.map((v, i) => `<div class="wheel"><button data-i="${i}" data-d="1">▲</button><div class="d">${v}</div><button data-i="${i}" data-d="-1">▼</button></div>`).join('')}</div>
        <p class="center"><button id="ck-go">开锁</button></p><p class="center muted" id="ck-m">${msg || `还剩 ${left} 次机会`}</p>`);
      $('ui').querySelectorAll('.wheel button').forEach(b => b.onclick = () => { const i = +b.dataset.i; d[i] = (d[i] + (+b.dataset.d) + 10) % 10; sfx('click'); draw(msg); });
      $('ui').querySelectorAll('.wheel .d').forEach((el, i) => el.onwheel = e => { e.preventDefault(); d[i] = (d[i] + (e.deltaY < 0 ? 1 : -1) + 10) % 10; draw(msg); });
      $('ck-go').onclick = () => {
        const code = d.join('');
        if (code === '0417') { sfx('win'); closeSheet(); toast('🔓 咔哒——锁开了！'); res(left); return; }
        left--; sfx('fail');
        if (left <= 0) { closeSheet(); toast('店主叹口气，摸出备用钥匙：「记性不好的人也配知道真相，只是不配拿彩头。」', 3500); res(0); return; }
        draw(`纹丝不动。还剩 <b>${left}</b> 次。<span class="muted">（案发那一天……月在前，日在后）</span>`);
        $('ui').querySelector('.lock').classList.add('shake');
      };
    };
    draw();
  });
}

/* ---------------- 熄灯：抓偷拍 ---------------- */
const BO = { order: null, t: 0, glowAt: 0, picked: null, res: null, sprite: null, active: false };
async function blackout() {
  const cx = -45, cz = -57.4;
  // 围成半圈
  BO.order = shuffle(IDS.slice());
  const angs = [-1.1, -.55, 0, .55, 1.1];
  BO.order.forEach((id, i) => { const a = AG[id]; a.x = cx + Math.sin(Math.PI + angs[i]) * 2.4; a.z = cz + Math.cos(Math.PI + angs[i]) * 2.4; a.path = []; faceTo(a, cx, cz); a.gatherAt = null; setAct(a.ch, null); });
  fubo.x = cx - 2.8; fubo.z = cz + 1.2; fubo.path = []; faceTo(fubo, cx, cz);
  PL.x = cx; PL.z = cz + 2.8; PL.yaw = Math.PI;
  if (!BO.table) {
    BO.table = new THREE.Group();
    BO.table.add(partsMesh([[box(1.4, .08, .8), Mx(0, .8, 0), '#5a3a24'], [box(.1, .8, .1), Mx(-.6, .4, -.3), '#4a2e1a'], [box(.1, .8, .1), Mx(.6, .4, -.3), '#4a2e1a'], [box(.1, .8, .1), Mx(-.6, .4, .3), '#4a2e1a'], [box(.1, .8, .1), Mx(.6, .4, .3), '#4a2e1a'],
      [box(.5, .28, .34), Mx(0, .98, 0), '#3a3a3e'], [box(.52, .06, .36), Mx(0, 1.15, -.12, -.9), '#4a4a4e'], [box(.36, .005, .24), Mx(0, 1.125, .02), '#EDE0C0']]));
    BO.table.position.set(cx, 0, cz); scene.add(BO.table);
    const sm = new THREE.SpriteMaterial({ map: TX.halo, color: 0xBFE4FF, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    BO.sprite = new THREE.Sprite(sm); BO.sprite.scale.set(1.4, 1.4, 1); BO.sprite.visible = false; scene.add(BO.sprite);
  }
  BO.table.visible = true;
  G.mode = 'cutscene';
  CAM.override = dt => { camera.position.set(cx + .3, 4.1, cz + 5.4); camera.lookAt(cx, .9, cz - 1.2); };
  await new Promise(r => setTimeout(r, 900));
  sfx('lights'); stamp('啪！', true);
  const t0 = performance.now();
  await new Promise(r => { const f = () => { const k = Math.min(1, (performance.now() - t0) / 250); TOD.blackout = k; if (k < 1) requestAnimationFrame(f); else r(); }; f(); });
  toast('书屋的灯……灭了。<br><b>黑暗里，有人在动。按 1-5 或点击，抓住那个人！</b>', 2600);
  BO.t = 0; BO.glowAt = rand(2.2, 5.2); BO.picked = null; BO.active = true;
  G.mode = 'blackout'; setMood('tense');
  const result = await new Promise(r => { BO.res = r; });
  BO.active = false; BO.sprite.visible = false;
  const m = AG[G.mole]; setAct(m.ch, null);
  await new Promise(r => setTimeout(r, 500));
  TOD.blackout = 0; sfx('lights');
  G.mode = 'cutscene';
  const MN = CAST[G.mole].name;
  if (result === 'caught') {
    G.caught = true;
    addCard({ id: 'catch', kind: 'over', title: `人赃并获 · ${MN}`, text: `熄灯的一瞬间，你一把攥住了${MN}的手腕——ta的手机屏幕上，正是那张配方的照片。`, who: G.mole, contra: [{ who: G.mole, s: 3 }] });
    await say(G.mole, '（手机屏幕还亮着，照片停在配方上）我、我就是想……留个纪念！');
    await say('fubo', '（眯起眼）……福伯都记下了。开箱之前，自有分晓。');
    toast('🐦 黄雀这一次没能得手。', 2400);
  } else {
    G.bird = Math.min(100, G.bird + 25); updateHUD(); sfx('birds');
    if (result && result !== 'none') { const w = CAST[result].name; G.trust[result] = (G.trust[result] || 0) - 1; await say(result, `（被你攥住手腕）你干什么？！——${w}甩开你的手，脸色很难看。`); }
    await say('fubo', '灯亮了。大家面面相觑，谁也说不清刚才那几秒发生了什么。');
    toast('🐦 黑暗里传来一声极轻的"咔嚓"……<br><span style="font-size:15px">黄雀进度 +25%</span>', 3000);
    G.moleLog.push({ p: 'bo', done: true });
  }
  if (result === 'caught') G.moleLog.push({ p: 'bo', done: false });
  CAM.override = null; BO.table.visible = false; setMood('night');
  G.mode = 'play';
  await say('fubo', '最后一程：<b>德昌号旧址</b>。宝箱在地窖里。一刻钟后，旧址门口集合——在那之前，诸位自便。');
  G.stage = 'bo_done';
  await beginFree(2, 'finale', '德昌号旧址');
}
function updateBlackout(dt, t) {
  if (!BO.active) return;
  BO.t += dt;
  // 其余人在黑暗里轻微挪动
  for (const id of IDS) { const a = AG[id]; if (id !== G.mole || BO.t < BO.glowAt) a.ch.a.lookYaw = Math.sin(t * 1.3 + a.ch.a.seed) * .4; }
  const m = AG[G.mole];
  const on = BO.t > BO.glowAt && BO.t < BO.glowAt + .95;
  if (on) {
    setAct(m.ch, 'photo'); m.ch.a.actW = 1;
    m.ch.root.updateMatrixWorld(true); const p = new THREE.Vector3(); m.ch.phone.getWorldPosition(p);
    BO.sprite.position.copy(p); BO.sprite.visible = true; BO.sprite.material.opacity = .6 + .4 * Math.sin(t * 30);
  } else { BO.sprite.visible = false; if (BO.t > BO.glowAt + .95) setAct(m.ch, null); }
  if (BO.t > BO.glowAt + 2.8 && !BO.picked) { BO.picked = 'none'; BO.res('none'); }
}
function blackoutPick(i) {
  if (!BO.active || BO.picked) return;
  const id = BO.order[i]; if (!id) return;
  BO.picked = id;
  const ok = id === G.mole && BO.t > BO.glowAt - .1;
  stamp(ok ? '抓住了！' : '抓错了', !ok);
  BO.res(ok ? 'caught' : id);
}
const _ray = new THREE.Raycaster(), _mv = new THREE.Vector2();
function blackoutClick(e) {
  _mv.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  _ray.setFromCamera(_mv, camera);
  const objs = []; for (const id of IDS) AG[id].ch.root.traverse(o => { if (o.isMesh) objs.push(o); });
  const hit = _ray.intersectObjects(objs, false)[0];
  if (hit) { const id = IDS.find(i => AG[i].ch === hit.object.userData.ch); if (id) blackoutPick(BO.order.indexOf(id)); }
}
