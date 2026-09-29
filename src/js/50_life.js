/* ============================================================
 * 城市生气：灯笼、水、夜灯、黄雀鸟群、银杏落叶、萤火虫、猫
 * ============================================================ */
const LIFE = { lanterns: null, lanternDet: null, halos: null, water: [], lights: [], birds: [], leaves: null, leafData: [], flies: null, cats: [] };

/* ---------- 灯笼（实例化，可摆动）---------- */
function buildLanterns() {
  const n = LANTERNS.length;
  const pts = []; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; pts.push([Math.max(.001, Math.cos(a) * .27), Math.sin(a) * .23]); }
  const bodyG = lathe(pts, 16); bodyG.translate(0, -.34, 0);
  // 灯笼竖骨：径向压出条纹
  const bp = bodyG.attributes.position;
  for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), z = bp.getZ(i); const a = Math.atan2(z, x); const k = 1 - .06 * Math.pow(Math.abs(Math.cos(a * 8)), 6); bp.setX(i, x * k); bp.setZ(i, z * k); }
  bodyG.computeVertexNormals();
  const bodyM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFF4A1E, emissiveIntensity: .2, roughness: .6 });
  LIFE.lanterns = new THREE.InstancedMesh(bodyG, bodyM, n);
  const detList = [
    [cyl(.12, .14, .06, 12), Mx(0, -.1, 0), '#2a1a10'], [cyl(.14, .12, .06, 12), Mx(0, -.58, 0), '#2a1a10'],
    [cyl(.006, .006, .1, 4), Mx(0, -.04, 0), '#111'], [cone(.05, .2, 8), Mx(0, -.7, 0, Math.PI), '#C8321E'],
    [new THREE.TorusGeometry(.13, .012, 5, 14), Mx(0, -.13, 0, Math.PI / 2), '#C9A04A'], [new THREE.TorusGeometry(.13, .012, 5, 14), Mx(0, -.55, 0, Math.PI / 2), '#C9A04A'],
  ];
  const detG = partsMesh(detList).geometry;
  LIFE.lanternDet = new THREE.InstancedMesh(detG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6 }), n);
  const hp = new Float32Array(n * 3);
  LANTERNS.forEach((L, i) => { L.ph = Math.random() * 6; L.amp = .04 + Math.random() * .05; LIFE.lanterns.setColorAt(i, LC(L.c)); hp[i * 3] = L.p.x; hp[i * 3 + 1] = L.p.y - .34 * L.s; hp[i * 3 + 2] = L.p.z; });
  LIFE.lanterns.castShadow = false; LIFE.lanternDet.castShadow = true;
  scene.add(LIFE.lanterns, LIFE.lanternDet);
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
  LIFE.halos = new THREE.Points(hg, new THREE.PointsMaterial({ map: TX.halo, size: 2.4, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false, color: 0xFFB070 }));
  scene.add(LIFE.halos);
  updateLanterns(0);
}
const _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler(), _v4 = new THREE.Vector3(), _s4 = new THREE.Vector3();
function updateLanterns(t) {
  const n = LANTERNS.length;
  for (let i = 0; i < n; i++) {
    const L = LANTERNS[i];
    _e4.set(Math.sin(t * 1.1 + L.ph) * L.amp, 0, Math.sin(t * 1.4 + L.ph * 1.7) * L.amp);
    _q4.setFromEuler(_e4); _s4.setScalar(L.s);
    _m4.compose(L.p, _q4, _s4);
    LIFE.lanterns.setMatrixAt(i, _m4); LIFE.lanternDet.setMatrixAt(i, _m4);
  }
  LIFE.lanterns.instanceMatrix.needsUpdate = true; LIFE.lanternDet.instanceMatrix.needsUpdate = true;
}

/* ---------- 水 ---------- */
const WATER_MAT = new THREE.ShaderMaterial({
  transparent: true, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    time: { value: 0 }, deep: { value: new THREE.Color(0x0a1c1e) }, skyC: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunC: { value: new THREE.Color() }, lamp: { value: 0 }, dark: { value: 0 },
  }]),
  vertexShader: `varying vec3 vW;
    #include <fog_pars_vertex>
    void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
    }`,
  fragmentShader: `uniform float time, lamp, dark; uniform vec3 deep, skyC, sunC, sunDir; varying vec3 vW;
    #include <fog_pars_fragment>
    void main(){
      vec2 p = vW.xz;
      float dx = cos(p.x*1.9 + time*1.3)*.5 + cos(p.x*3.7 - p.y*1.3 + time*2.1)*.25 + cos(p.x*.7+p.y*.9+time*.6)*.4;
      float dz = cos(p.y*1.7 - time*1.1)*.5 + cos(p.y*4.1 + p.x*1.1 - time*1.7)*.25 + cos(p.y*.8-p.x*.5+time*.7)*.4;
      vec3 n = normalize(vec3(dx*.12, 1.0, dz*.12));
      vec3 v = normalize(cameraPosition - vW);
      float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 col = mix(deep, skyC * .8, .06 + fr*.55);
      vec3 r = reflect(-v, n);
      col += sunC * pow(max(dot(r, normalize(sunDir)), 0.0), 120.0) * .9;
      float st = sin(p.x*9.0 + sin(p.y*.35 + time*.8)*2.0) * .5 + .5;
      float band = smoothstep(.75, 1.0, st) * (.5 + .5*sin(p.y*.6 - time*1.3));
      col += vec3(1.0, .45, .15) * lamp * .05 * band;
      col *= 1.0 - dark*.8;
      gl_FragColor = vec4(col, .9);
      #include <tonemapping_fragment>
      #include <encodings_fragment>
      #include <fog_fragment>
    }`,
});
function buildWater() {
  const g = new THREE.PlaneGeometry(10.2, 180); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, WATER_MAT); m.position.set(-69, -1.05, -20); scene.add(m);
  if (POND) { const pg = new THREE.CircleGeometry(1, 40); pg.rotateX(-Math.PI / 2); const pm = new THREE.Mesh(pg, WATER_MAT); pm.scale.set(POND.rx, 1, POND.rz); pm.position.set(POND.x, .2, POND.z); scene.add(pm); }
}
/* ---------- 夜灯（站点）---------- */
function buildLights() {
  const spots = [[-42, 4.5, -4.5], [42, 4.5, -4.5], [-45, 4.5, -56], [0, 5, 35], [70, 5, -5], [-12, 4, -23], [0, 6.5, 22], [-70, 5, -5], [0, 5, -80]];
  const use = LOWQ ? spots.slice(0, 4) : spots;
  for (const [x, y, z] of use) { const l = new THREE.PointLight(0xFF9A50, 0, 20, 2); l.position.set(x, y, z); scene.add(l); LIFE.lights.push(l); }
}

/* ---------- 黄雀鸟群 ---------- */
const BIRD_PERCH = [];
function buildBirds() {
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; BIRD_PERCH.push([Math.cos(a) * rand(4, 14), 0, 24 + Math.sin(a) * rand(4, 12)]); }
  for (let i = 0; i < 14; i++) BIRD_PERCH.push([rand(4, 20), 0, rand(-48, -14)]);
  for (let i = 0; i < 10; i++) BIRD_PERCH.push([rand(-60, 80), 0, rand(-9, -1)]);
  for (let x = -22; x <= 22; x += 4) BIRD_PERCH.push([x, 2.85, -10.2]);
  for (let z = -48; z <= -14; z += 5) BIRD_PERCH.push([24, 2.85, z]);
  const bodyG = partsMesh([
    [S1(1, 8, 6), Mx(0, .06, 0, 0, 0, 0, .05, .045, .08), '#D9B23A'], [S1(.035, 8, 6), Mx(0, .1, .06), '#8A6A2A'],
    [cone(.012, .03, 4), Mx(0, .1, .1, Math.PI / 2), '#E09030'], [box(.04, .01, .07, 1), Mx(0, .07, -.09, .3), '#5A4A2A'],
    [S1(.006, 4, 3), Mx(.022, .11, .085), '#111'], [S1(.006, 4, 3), Mx(-.022, .11, .085), '#111'],
  ]).geometry;
  const wingG = new THREE.PlaneGeometry(.09, .06); wingG.translate(.045, 0, 0);
  const N = 30;
  LIFE.birdMesh = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 }), N);
  LIFE.wingMesh = new THREE.InstancedMesh(wingG, new THREE.MeshStandardMaterial({ color: 0x6A5020, roughness: .8, side: THREE.DoubleSide }), N * 2);
  scene.add(LIFE.birdMesh, LIFE.wingMesh);
  for (let i = 0; i < N; i++) {
    const p = BIRD_PERCH[(i / 3 | 0) * 3 % BIRD_PERCH.length];
    LIFE.birds.push({ x: p[0] + rand(-1.5, 1.5), y: p[1], z: p[2] + rand(-1.5, 1.5), yaw: rand(0, 6.28), st: 'perch', t: rand(0, 3), hop: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0, flap: rand(0, 6) });
  }
}
function updateBirds(dt, t, px, pz, pspd) {
  const B = LIFE.birds; let fled = 0;
  for (let i = 0; i < B.length; i++) {
    const b = B[i];
    if (b.st === 'perch') {
      b.t -= dt;
      if (b.t < 0) { b.t = rand(.6, 2.5); if (b.y < .1) { b.hop = .25; b.yaw += rand(-1.2, 1.2); } }
      if (b.hop > 0) { b.hop -= dt; const k = b.hop / .25; b.x += Math.sin(b.yaw) * dt * .8; b.z += Math.cos(b.yaw) * dt * .8; b.bob = Math.sin(k * Math.PI) * .08; } else b.bob = 0;
      const d = hyp(b.x - px, b.z - pz);
      if (d < (pspd > 6 ? 7 : 3.2)) {
        const p = pick(BIRD_PERCH.filter(q => hyp(q[0] - px, q[2] - pz) > 20 && hyp(q[0] - b.x, q[2] - b.z) < 45)) || pick(BIRD_PERCH);
        b.st = 'fly'; b.tx = p[0] + rand(-1, 1); b.ty = p[1]; b.tz = p[2] + rand(-1, 1); b.t0x = b.x; b.t0y = b.y; b.t0z = b.z; b.ft = 0;
        b.dur = Math.max(1.5, hyp(b.tx - b.x, b.tz - b.z) / 9); fled++;
      }
    } else {
      b.ft += dt; const k = Math.min(1, b.ft / b.dur), e = smooth(k);
      const nx = lerp(b.t0x, b.tx, e), nz = lerp(b.t0z, b.tz, e), ny = lerp(b.t0y, b.ty, e) + Math.sin(k * Math.PI) * (4 + b.dur * 1.5);
      b.yaw = Math.atan2(nx - b.x, nz - b.z); b.x = nx; b.y = ny; b.z = nz; b.bob = 0;
      if (k >= 1) { b.st = 'perch'; b.t = rand(.5, 2); }
    }
    const flying = b.st === 'fly';
    _e4.set(0, b.yaw, 0); _q4.setFromEuler(_e4); _v4.set(b.x, b.y + (b.bob || 0), b.z); _s4.setScalar(1.3);
    _m4.compose(_v4, _q4, _s4); LIFE.birdMesh.setMatrixAt(i, _m4);
    const fl = flying ? Math.sin(t * 38 + b.flap) * 1.1 : -.1;
    for (const s of [1, -1]) {
      _e4.set(0, b.yaw, 0, 'YXZ'); _q4.setFromEuler(_e4);
      const wq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s > 0 ? 0 : Math.PI, fl * (s > 0 ? 1 : 1) + (flying ? 0 : .15), 'YXZ'));
      _q4.multiply(wq); _v4.set(b.x, b.y + .075 + (b.bob || 0), b.z);
      _m4.compose(_v4, _q4, _s4); LIFE.wingMesh.setMatrixAt(i * 2 + (s > 0 ? 0 : 1), _m4);
    }
  }
  LIFE.birdMesh.instanceMatrix.needsUpdate = true; LIFE.wingMesh.instanceMatrix.needsUpdate = true;
  return fled;
}

/* ---------- 银杏落叶 ---------- */
function buildLeaves() {
  const g = new THREE.CircleGeometry(.09, 6, 0, Math.PI * .6); g.rotateX(-Math.PI / 2);
  const N = LOWQ ? 70 : 150;
  LIFE.leaves = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xF0C040, side: THREE.DoubleSide, roughness: .9 }), N);
  const src = DIG_TREES.map(t => [t.x, t.z]).concat([[16, -14], [-19, -15]]);
  for (let i = 0; i < N; i++) { const s = pick(src); LIFE.leafData.push({ sx: s[0], sz: s[1], x: s[0] + rand(-2, 2), y: rand(0, 6.5), z: s[1] + rand(-2, 2), vy: rand(.35, .7), ph: rand(0, 6), rest: 0, rx: rand(0, 6), ry: rand(0, 6) }); }
  scene.add(LIFE.leaves);
}
function updateLeaves(dt, t) {
  const L = LIFE.leafData;
  for (let i = 0; i < L.length; i++) {
    const f = L[i];
    if (f.y > .03) { f.y -= f.vy * dt; f.x += Math.sin(t * 1.3 + f.ph) * dt * .6; f.z += Math.cos(t * 1.1 + f.ph) * dt * .4; f.rx += dt * 2.3; f.ry += dt * 1.7; }
    else { f.y = .03; f.rest += dt; if (f.rest > 14) { f.rest = 0; f.x = f.sx + rand(-2, 2); f.z = f.sz + rand(-2, 2); f.y = rand(3.5, 6.5); } }
    _e4.set(f.y > .03 ? Math.sin(f.rx) * .8 : 0, f.ry, f.y > .03 ? Math.cos(f.rx) * .6 : 0); _q4.setFromEuler(_e4); _v4.set(f.x, f.y, f.z); _s4.setScalar(1);
    _m4.compose(_v4, _q4, _s4); LIFE.leaves.setMatrixAt(i, _m4);
  }
  LIFE.leaves.instanceMatrix.needsUpdate = true;
}
/* ---------- 萤火虫 ---------- */
function buildFlies() {
  const N = 70, p = new Float32Array(N * 3); LIFE.flyBase = [];
  for (let i = 0; i < N; i++) {
    const zone = i % 3 === 0 ? [POND.x, POND.z, 8] : i % 3 === 1 ? [-62, rand(-90, 40), 3] : [rand(-20, 20), rand(-48, -14), 4];
    LIFE.flyBase.push([zone[0] + rand(-zone[2], zone[2]), rand(.4, 2.2), zone[1] + rand(-zone[2], zone[2]), rand(0, 6)]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  LIFE.flies = new THREE.Points(g, new THREE.PointsMaterial({ map: TX.halo, size: .5, color: 0xD8FF8A, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
  scene.add(LIFE.flies);
}
function updateFlies(t) {
  const a = LIFE.flies.geometry.attributes.position;
  LIFE.flyBase.forEach((b, i) => a.setXYZ(i, b[0] + Math.sin(t * .4 + b[3]) * 1.2, b[1] + Math.sin(t * .9 + b[3] * 2) * .3, b[2] + Math.cos(t * .33 + b[3]) * 1.2));
  a.needsUpdate = true;
  LIFE.flies.material.opacity = clamp((TOD.t - .55) / .3, 0, 1) * (.6 + .4 * Math.sin(t * 3));
}
/* ---------- 猫 ---------- */
function makeCat(col, belly) {
  const g = new THREE.Group();
  const body = partsMesh([
    [S1(1, 10, 8), Mx(0, .22, 0, 0, 0, 0, .13, .12, .24), col], [S1(1, 8, 6), Mx(0, .2, .05, 0, 0, 0, .1, .1, .16), belly],
    [S1(.1, 10, 8), Mx(0, .34, .22), col], [cone(.035, .07, 4), Mx(.05, .44, .21, 0, 0, -.2), col], [cone(.035, .07, 4), Mx(-.05, .44, .21, 0, 0, .2), col],
    [S1(.012, 5, 4), Mx(.035, .35, .31), '#1a3a1a'], [S1(.012, 5, 4), Mx(-.035, .35, .31), '#1a3a1a'], [S1(.01, 4, 3), Mx(0, .32, .32), '#E08080'],
    ...[[.07, .15], [-.07, .15], [.07, -.15], [-.07, -.15]].map(([x, z]) => [cyl(.028, .025, .16, 6), Mx(x, .08, z), col]),
  ]);
  const tail = new THREE.Group(); tail.position.set(0, .26, -.22);
  tail.add(partsMesh([[cyl(.022, .016, .28, 6), Mx(0, .12, -.04, -.35), col]]));
  g.add(body, tail); g.userData.tail = tail;
  return g;
}
function buildCats() {
  const defs = [[-7, 20, '#D88A3A', '#F2E2C8', '奶黄'], [-26.5, -71, '#2a2a2a', '#3a3a3a', '煤球'], [-30.5, -15, '#9a9a9a', '#E8E8E8', '雪团']];
  for (const [x, z, c, b, nm] of defs) { const m = makeCat(c, b); m.position.set(x, 0, z); scene.add(m); LIFE.cats.push({ m, x, z, hx: x, hz: z, yaw: rand(0, 6), st: 'sit', t: rand(2, 5), name: nm, petted: false, heart: 0 }); }
}
function updateCats(dt, t) {
  for (const c of LIFE.cats) {
    c.t -= dt;
    if (c.t < 0) {
      if (c.st === 'walk') { c.st = Math.random() < .5 ? 'sit' : 'loaf'; c.t = rand(3, 8); }
      else { c.st = 'walk'; c.t = rand(1.5, 3.5); c.yaw = Math.atan2(c.hx - c.x, c.hz - c.z) + rand(-1.4, 1.4); }
    }
    if (c.st === 'walk') { const nx = c.x + Math.sin(c.yaw) * dt * .7, nz = c.z + Math.cos(c.yaw) * dt * .7; if (!blockedAt(nx, nz, .25)) { c.x = nx; c.z = nz; } else c.yaw += 1.5; }
    c.m.position.set(c.x, 0, c.z); c.m.rotation.y = c.yaw;
    c.m.scale.y = c.st === 'loaf' ? .8 : 1;
    c.m.userData.tail.rotation.z = Math.sin(t * (c.st === 'walk' ? 6 : 2) + c.x) * .5;
  }
}
