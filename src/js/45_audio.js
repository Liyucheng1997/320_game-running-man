/* ============================================================
 * 程序化音频：五声音阶「古筝」拨弦 + 环境铺底 + 音效
 * ============================================================ */
const AU = { ctx: null, master: null, music: null, sfx: null, rev: null, muted: false, mood: 'explore', next: 0, step: 0, drone: null };
try { AU.muted = localStorage.getItem('hq_mute') === '1'; } catch (e) { }
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = AU.ctx = new AC();
  AU.master = ctx.createGain(); AU.master.gain.value = AU.muted ? 0 : .8; AU.master.connect(ctx.destination);
  AU.music = ctx.createGain(); AU.music.gain.value = .5; AU.sfx = ctx.createGain(); AU.sfx.gain.value = .8;
  // 简易混响
  const len = ctx.sampleRate * 2.4, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  AU.rev = ctx.createConvolver(); AU.rev.buffer = buf;
  const wet = ctx.createGain(); wet.gain.value = .35; AU.rev.connect(wet); wet.connect(AU.master);
  AU.music.connect(AU.master); AU.music.connect(AU.rev); AU.sfx.connect(AU.master); AU.sfx.connect(AU.rev);
  // 铺底：低音 D + A
  const dg = ctx.createGain(); dg.gain.value = .05; dg.connect(AU.music);
  for (const f of [73.4, 110]) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; const lfo = ctx.createOscillator(); lfo.frequency.value = .07 + Math.random() * .05; const lg = ctx.createGain(); lg.gain.value = .6; lfo.connect(lg); lg.connect(o.frequency); o.connect(dg); o.start(); lfo.start(); }
  AU.drone = dg;
  AU.next = ctx.currentTime + .3;
}
function toggleMute() {
  AU.muted = !AU.muted; try { localStorage.setItem('hq_mute', AU.muted ? '1' : '0'); } catch (e) { }
  if (AU.master) AU.master.gain.value = AU.muted ? 0 : .8;
  $('mute-btn').textContent = AU.muted ? '🔇' : '🔊';
}
const PENTA = [0, 2, 4, 7, 9]; // 宫商角徵羽
function noteF(deg, oct = 0) { const n = PENTA[((deg % 5) + 5) % 5] + 12 * (Math.floor(deg / 5) + oct); return 293.66 * Math.pow(2, n / 12); }
function pluck(f, t, vol = .16, dur = 1.8, bus = AU.music) {
  const ctx = AU.ctx; const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * 5; lp.Q.value = 1;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  lp.frequency.setValueAtTime(f * 7, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur * .6);
  for (const [type, mul, v] of [['triangle', 1, 1], ['sawtooth', 1.002, .35], ['sine', 2, .25]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * mul * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + .08);
    const og = ctx.createGain(); og.gain.value = v; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + .1);
  }
  lp.connect(g); g.connect(bus);
}
function noiseHit(t, dur = .08, vol = .2, freq = 2000, type = 'bandpass', bus = AU.sfx) {
  const ctx = AU.ctx; const n = ctx.createBufferSource(); const len = Math.floor(ctx.sampleRate * dur);
  const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  n.buffer = b; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = vol;
  n.connect(f); f.connect(g); g.connect(bus); n.start(t);
}
function kick(t, vol = .35) { const ctx = AU.ctx; const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + .15); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(g); g.connect(AU.music); o.start(t); o.stop(t + .25); }
let melDeg = 5;
function musicTick() {
  if (!AU.ctx || AU.muted) return;
  const ctx = AU.ctx; const now = ctx.currentTime;
  const mood = AU.mood;
  const beat = mood === 'chase' ? .19 : mood === 'tense' ? .42 : mood === 'night' ? .62 : .5;
  while (AU.next < now + .25) {
    const t = AU.next, s = AU.step++;
    if (mood === 'chase') {
      if (s % 4 === 0) kick(t, .4); if (s % 4 === 2) noiseHit(t, .06, .12, 3000);
      noiseHit(t, .03, .05, 8000, 'highpass');
      if (s % 2 === 0) { melDeg += pick([-2, -1, 1, 1, 2]); melDeg = clamp(melDeg, 2, 11); pluck(noteF(melDeg), t, .13, .5); }
      if (s % 8 === 0) pluck(noteF(0, -1), t, .16, 1.2);
    } else if (mood === 'tense') {
      if (s % 4 === 0) pluck(noteF(0, -1), t, .12, 2.4);
      if (s % 8 === 6) pluck(noteF(pick([3, 4, 6])), t, .08, 2.5);
      if (s % 2 === 0) { const hb = ctx.createOscillator(), g = ctx.createGain(); hb.frequency.value = 55; g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + .25); hb.connect(g); g.connect(AU.music); hb.start(t); hb.stop(t + .3); }
    } else {
      if (Math.random() < (mood === 'night' ? .38 : .5)) {
        melDeg += pick([-2, -1, -1, 1, 1, 2, 0]); melDeg = clamp(melDeg, 3, 12);
        pluck(noteF(melDeg), t, .12 + Math.random() * .06, 2.2);
        if (Math.random() < .2) pluck(noteF(melDeg + 2), t + beat * .5, .08, 1.6);
      }
      if (s % 8 === 0) pluck(noteF(pick([0, 3, 4]), -1), t, .1, 3);
    }
    AU.next += beat * (mood === 'explore' && Math.random() < .15 ? 2 : 1);
  }
}
function setMood(m) { if (AU.mood !== m) { AU.mood = m; if (AU.ctx) AU.next = Math.max(AU.next, AU.ctx.currentTime + .05); } }
/* 音效 */
function sfx(name) {
  if (!AU.ctx || AU.muted) return; const t = AU.ctx.currentTime;
  switch (name) {
    case 'coin': pluck(1318, t, .12, .35, AU.sfx); pluck(1760, t + .06, .1, .5, AU.sfx); break;
    case 'clue': for (const [f, d] of [[392, 0], [587, .12], [784, .24]]) pluck(f, t + d, .15, 2.5, AU.sfx); break;
    case 'gong': { const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(140, t + 2); g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t + 3); o.connect(g); g.connect(AU.sfx); o.start(t); o.stop(t + 3); noiseHit(t, .3, .15, 600); break; }
    case 'alert': pluck(880, t, .15, .3, AU.sfx); pluck(1175, t + .09, .15, .4, AU.sfx); break;
    case 'q': pluck(660, t, .08, .3, AU.sfx); break;
    case 'rip': noiseHit(t, .35, .45, 2500, 'bandpass'); noiseHit(t + .05, .25, .3, 5000, 'highpass'); break;
    case 'click': noiseHit(t, .02, .15, 3000); break;
    case 'win': [0, 2, 4, 5, 7].forEach((d, i) => pluck(noteF(d + 5), t + i * .09, .14, 1.5, AU.sfx)); break;
    case 'fail': [4, 2, 0].forEach((d, i) => pluck(noteF(d, -1), t + i * .15, .14, 1.4, AU.sfx)); break;
    case 'stamp': kick(t, .6); noiseHit(t, .12, .3, 800); break;
    case 'step': noiseHit(t, .04, .03, 900, 'lowpass'); break;
    case 'birds': for (let i = 0; i < 5; i++) pluck(2400 + Math.random() * 1200, t + i * .05, .03, .12, AU.sfx); break;
    case 'meow': { const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(700, t); o.frequency.linearRampToValueAtTime(950, t + .15); o.frequency.linearRampToValueAtTime(600, t + .4); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.12, t + .05); g.gain.exponentialRampToValueAtTime(.001, t + .45); o.connect(g); g.connect(AU.sfx); o.start(t); o.stop(t + .5); break; }
    case 'dig': noiseHit(t, .12, .2, 400, 'lowpass'); break;
    case 'lights': noiseHit(t, .4, .3, 200, 'lowpass'); kick(t, .3); break;
    case 'whoosh': noiseHit(t, .4, .2, 1200, 'bandpass'); break;
  }
}
