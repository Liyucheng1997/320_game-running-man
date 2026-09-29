/* ============================================================
 * 启动与主循环
 * ============================================================ */
const nextFrame = () => new Promise(r => setTimeout(r, 16));
async function loadStep(p, txt) { $('load-i').style.width = p + '%'; $('load-t').textContent = txt; await nextFrame(); }
async function init() {
  try {
    await loadStep(5, '研墨……');
    try { await Promise.race([Promise.all([document.fonts.load('64px "Ma Shan Zheng"', '德昌黄雀'), document.fonts.load('20px "Noto Serif SC"', '德昌')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
    await loadStep(12, '正在铺青石板……');
    buildTextures(); buildMaterials();
    await loadStep(25, '正在起屋架、盖青瓦……');
    buildCity();
    await loadStep(60, '正在挂灯笼……');
    finalizeBuild();
    SIGN.tex.needsUpdate = true; BANNER.tex.needsUpdate = true;
    buildLanterns(); buildWater(); buildLights();
    await loadStep(72, '正在放飞黄雀……');
    buildBirds(); buildLeaves(); buildFlies(); buildCats();
    await loadStep(82, '正在请人入城……');
    renderPortraits();
    buildPeople(); buildBeacon(); buildMapBase(); setupTouch();
    await loadStep(96, '暮色将至……');
    applyTOD(); updateLanterns(0);
    renderer.compile(scene, camera);
    await loadStep(100, '入城');
    $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 900);
    $('mute-btn').textContent = AU.muted ? '🔇' : '🔊';
    showTitle();
    fade(false, 900);
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e);
    $('load-t').textContent = '载入失败：' + e.message;
  }
}

let last = performance.now(), T = 0, frame = 0;
const ALL_AGENTS = () => [fubo, blackMan, ...IDS.map(i => AG[i]), ...Object.values(TOWNAG), ...CROWD];
function loop(now) {
  requestAnimationFrame(loop);
  let dt = clamp((now - last) / 1000, 0, .05); last = now;
  if (G.slowmo > 0) { G.slowmo -= dt; dt *= .3; }
  T += dt; frame++;
  U.time.value = T; WATER_MAT.uniforms.time.value = T;

  // 昼夜
  if (G.mode === 'title') { TOD.t = .52 + Math.sin(T * .05) * .05; }
  else TOD.t += clamp(TOD.target - TOD.t, -dt * .012, dt * .012);
  applyTOD();
  const night = U.night.value;
  for (const m of MOUNTAINS) m.material.color.copy(m.userData.base).multiplyScalar(1 - night * .6).lerp(scene.fog.color, m.userData.k);
  MAT.lattice.emissiveIntensity = TOD.win;
  MAT.sign.emissiveIntensity = .06 + night * .12 * (1 - TOD.blackout);
  MAT.glow.emissiveIntensity = (.4 + TOD.lamp * .8) * (1 - TOD.blackout);
  LIFE.lanterns.material.emissiveIntensity = (.25 + TOD.lamp * 1.1) * (1 - TOD.blackout * .97);
  LIFE.halos.material.opacity = clamp((TOD.lamp - .3) / 1.6, 0, 1) * .85;
  for (const l of LIFE.lights) l.intensity = TOD.lamp * .32;
  WATER_MAT.uniforms.skyC.value.copy(skyMat.uniforms.hor.value).convertSRGBToLinear();
  WATER_MAT.uniforms.sunC.value.copy(sun.color); WATER_MAT.uniforms.sunDir.value.copy(sun.userData.dir);
  WATER_MAT.uniforms.lamp.value = TOD.lamp; WATER_MAT.uniforms.dark.value = TOD.blackout;
  // 太阳阴影跟随
  const fx = G.mode === 'title' ? 0 : PL.x, fz = G.mode === 'title' ? 10 : PL.z;
  sun.target.position.set(fx, 0, fz); sun.position.set(fx + sun.userData.dir.x * 120, sun.userData.dir.y * 120, fz + sun.userData.dir.z * 120);

  const live = G.mode !== 'title' && G.mode !== 'load';
  if (live) {
    if (G.mode !== 'end') updatePlayer(dt);
    if (G.tick) G.tick(dt);
    updateScenes(dt);
    updateChase(dt, T);
    updateBlackout(dt, T);
    faceGroup();
    for (const a of CROWD) crowdThink(a, dt);
    if (blackMan.leaving && !blackMan.path.length) { blackMan.leaving = false; blackMan.ch.root.visible = false; blackMan.z = -300; }
  } else {
    for (const a of CROWD) crowdThink(a, dt);
  }
  for (const a of ALL_AGENTS()) {
    stepAgent(a, dt);
    if (a.bubbleT > 0) a.bubbleT -= dt;
    if (a.ch.root.visible && hyp(a.x - camera.position.x, a.z - camera.position.z) < 70) animChar(a.ch, dt, T);
  }
  animChar(player, dt, T);
  // 生气
  updateLanterns(T);
  const fled = updateBirds(dt, T, live ? PL.x : 999, live ? PL.z : 999, live ? PL.spd : 0);
  if (fled > 2 && live) sfx('birds');
  updateLeaves(dt, T); updateFlies(T); updateCats(dt, T);
  for (const c of COINS) if (!c.got) { c.m.rotation.z = T * 3 + c.ph; c.m.position.y = .7 + Math.sin(T * 2.5 + c.ph) * .08; }

  // 信标
  if (G.obj && live && G.mode !== 'chase') { beacon.visible = true; beacon.position.set(G.obj.x, groundY(G.obj.x, G.obj.z), G.obj.z); beacon.userData.ring.scale.setScalar(1 + Math.sin(T * 3) * .08); beacon.children[0].material.opacity = clamp((hyp(PL.x - G.obj.x, PL.z - G.obj.z) - 6) / 14, 0, .5); }
  else beacon.visible = false;

  // 相机
  if (G.mode === 'title') {
    const a = T * .05;
    camera.position.set(Math.sin(a) * 34, 15 + Math.sin(T * .1) * 2, 16 + Math.cos(a) * 34);
    camera.lookAt(0, 3, 4);
  } else updateCamera(dt);

  // HUD
  if (live) {
    near = findNear();
    const pr = $('prompt');
    if (near && (G.mode === 'play' || G.mode === 'chase')) { pr.style.display = 'block'; pr.innerHTML = `<kbd>${IS_TOUCH ? '调查' : 'E'}</kbd> ${near.label}`; $('t-act').disabled = false; }
    else { pr.style.display = 'none'; $('t-act').disabled = true; }
    updateLabels(); updateCompass();
    if (frame % 2 === 0) drawMinimap();
    if (G.mapOpen && frame % 6 === 0) drawBigMap();
    $('clock').textContent = clockText();
    if (G.mode === 'play' || G.mode === 'chase') {
      const vg = G.mode === 'chase' ? 'chase' : (G.tense && G.period >= 0) ? 'tense' : '';
      if ($('vignette').className !== vg) $('vignette').className = vg;
      if (G.mode === 'play') setMood(G.tense && G.period >= 0 ? 'tense' : G.stage.startsWith('race') ? 'chase' : night > .5 ? 'night' : 'explore');
    }
  } else updateLabels();
  musicTick();
  renderer.render(scene, camera);
}
init();
