/* ============================================================
 * 几何合并系统：所有静态建筑按「材质 × 区块」合并成少量网格
 * 每个零件带顶点色，贴图 × 顶点色 = 最终颜色
 * ============================================================ */
const MAT = {};
function stdMat(o) { return new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .85, metalness: 0 }, o)); }
function addWind(mat, code) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = U.time;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + code);
  };
}
function buildMaterials() {
  MAT.plaster = stdMat({ map: TX.plaster, roughness: .95 });
  MAT.wood = stdMat({ map: TX.wood, roughness: .8 });
  MAT.tile = stdMat({ map: TX.tile, bumpMap: TX.tileBump, bumpScale: .04, roughness: .8, side: THREE.DoubleSide });
  MAT.stone = stdMat({ map: TX.stone, roughness: .92 });
  MAT.brick = stdMat({ map: TX.brick, roughness: .9 });
  MAT.lattice = stdMat({ map: TX.lattice, emissiveMap: TX.latticeE, emissive: new THREE.Color(0xFFB45A), emissiveIntensity: 0, roughness: .85 });
  MAT.door = stdMat({ map: TX.door, roughness: .6 });
  MAT.plain = stdMat({ roughness: .8 });
  MAT.metal = stdMat({ roughness: .35, metalness: .7 });
  MAT.glaze = stdMat({ roughness: .25, metalness: .1 });
  MAT.sign = stdMat({ map: SIGN.tex, roughness: .6, emissiveMap: SIGN.tex, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 });
  MAT.paving = stdMat({ map: TX.paving, bumpMap: TX.pavingBump, bumpScale: .03, roughness: .88, vertexColors: true });
  MAT.grass = stdMat({ map: TX.grass, roughness: 1 });
  MAT.dirt = stdMat({ map: TX.dirt, roughness: 1 });
  MAT.gravel = stdMat({ map: TX.gravel, roughness: 1 });
  MAT.glow = stdMat({ emissive: new THREE.Color(0xFF6A2A), emissiveIntensity: 1, roughness: .7 });
  // 布：uv.y=1 为挂点，越往下摆动越大
  MAT.cloth = stdMat({ side: THREE.DoubleSide, roughness: .95 });
  addWind(MAT.cloth, `{ vec4 wp = modelMatrix * vec4(transformed,1.0); float w = (1.0-uv.y);
    transformed.x += sin(uTime*2.3 + wp.x*.7 + wp.z*.5) * .12 * w; transformed.z += cos(uTime*1.9 + wp.x*.4) * .1 * w; }`);
  MAT.banner = stdMat({ map: BANNER.tex, side: THREE.DoubleSide, roughness: .95 });
  addWind(MAT.banner, `{ vec4 wp = modelMatrix * vec4(transformed,1.0); float w = (1.0-uv.y);
    transformed.x += sin(uTime*2.6 + wp.x*.6 + wp.z*.6) * .16 * w * w; transformed.z += sin(uTime*2.1 + wp.z) * .12 * w; }`);
  MAT.foliage = stdMat({ roughness: .9, flatShading: true });
  addWind(MAT.foliage, `{ vec4 wp = modelMatrix * vec4(transformed,1.0); float w = clamp(wp.y*.12, 0., 1.);
    transformed.x += sin(uTime*1.3 + wp.x*.3 + wp.z*.2) * .08 * w; transformed.z += cos(uTime*1.1 + wp.x*.2) * .06 * w; }`);
  MAT.willow = stdMat({ roughness: .9, side: THREE.DoubleSide });
  addWind(MAT.willow, `{ vec4 wp = modelMatrix * vec4(transformed,1.0); float w = (1.0-uv.y);
    transformed.x += sin(uTime*1.4 + wp.x*.4 + wp.z*.3) * .35 * w * w; transformed.z += cos(uTime*1.2 + wp.z*.4) * .25 * w * w; }`);
}

/* ---------------- 合并缓冲 ---------------- */
const BUILD = new Map(); // key|chunk → [geo]
const CHUNK = 48;
let XF = new THREE.Matrix4(); const XFS = [];
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _p.set(x, y, z); _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}
function pushXF(x, y, z, ry = 0, s = 1) { XFS.push(XF); XF = XF.clone().multiply(M(x, y, z, 0, ry, 0, s, s, s)); }
function popXF() { XF = XFS.pop(); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function wpt(x, y, z) { return new THREE.Vector3(x, y, z).applyMatrix4(XF); }
/* 给每个零件在世界坐标下再上一层顶点色明暗：墙根返潮等 */
const SHADE = {
  damp: (x, y, z) => y < .5 ? .62 : y < 1.6 ? lerp(.62, 1, (y - .5) / 1.1) : 1,
  ao: (x, y, z) => y < .3 ? .7 : 1,
};
function add(key, geo, local, color = 0xffffff, shade = null, jitter = 0) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  const m = local ? XF.clone().multiply(local) : XF;
  g.applyMatrix4(m);
  const n = g.attributes.position.count;
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = LC(typeof color === 'number' ? color : color);
  const col = new Float32Array(n * 3), pos = g.attributes.position.array;
  const jr = jitter ? (1 + (WR() - .5) * jitter) : 1;
  for (let i = 0; i < n; i++) {
    let k = jr; if (shade) k *= shade(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // 只保留统一的属性，保证可合并
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(a)) g.deleteAttribute(a);
  g.computeBoundingBox(); const bb = g.boundingBox;
  const cx = Math.floor((bb.min.x + bb.max.x) / 2 / CHUNK), cz = Math.floor((bb.min.z + bb.max.z) / 2 / CHUNK);
  const k2 = key + '|' + cx + ',' + cz;
  if (!BUILD.has(k2)) BUILD.set(k2, []);
  BUILD.get(k2).push(g);
  geo.dispose && geo !== g && 0;
}
function mergeList(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    uv.set(g.attributes.uv.array, o * 2); col.set(g.attributes.color.array, o * 3);
    o += c; g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.setAttribute('color', new THREE.BufferAttribute(col, 3));
  m.computeBoundingSphere();
  return m;
}
const NO_SHADOW_CAST = new Set(['paving', 'grass', 'dirt', 'gravel', 'sign', 'glow', 'willow']);
const STATIC_MESHES = [];
function finalizeBuild() {
  for (const [k, list] of BUILD) {
    const key = k.split('|')[0];
    const mesh = new THREE.Mesh(mergeList(list), MAT[key]);
    mesh.castShadow = !NO_SHADOW_CAST.has(key);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    scene.add(mesh); STATIC_MESHES.push(mesh);
  }
  BUILD.clear();
}

/* ---------------- 基础几何 ---------------- */
/* 世界尺度 uv 的盒子（贴图每 s 米重复一次） */
function box(w, h, d, s = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  return g;
}
function boxUV(w, h, d, u0, v0, u1, v1) { // 前后面贴指定 uv 矩形（窗、门、招牌）
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v;
    if (f === 4 || f === 5) uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i))); else uv.setXY(i, u0 + .001, v0 + .001); }
  return g;
}
function planeUV(w, h, u0, v0, u1, v1) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, lerp(u0, u1, uv.getX(i)), lerp(v0, v1, uv.getY(i))); return g; }
const cyl = (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const sph = (r, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs);
const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
function lathe(pts, seg = 16) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); }
function scaleUV(g, s) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s); return g; }
/* 两点之间的杆件 */
function beam(key, a, b, r, color, seg = 6) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
  const g = cyl(r, r, L, seg); const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
  m.compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), q, new THREE.Vector3(1, 1, 1));
  add(key, g, m, color);
}

/* ---------------- 中式屋顶 ----------------
 * 双坡：屋脊沿 x，前后檐在 z=±D/2，檐口高度 0，脊高 rise
 * 凹曲面 + 四角起翘
 */
function roofGeo(W, D, rise, lift = .45, nu = 16, ns = 9) {
  const pos = [], uv = [], idx = [];
  const slope = Math.hypot(D / 2, rise);
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, x = (u - .5) * W, ex = Math.abs(u - .5) * 2;
      for (let j = 0; j <= ns; j++) {
        const s = j / ns; const cor = Math.pow(ex, 3) * Math.pow(1 - s, 2);
        const z = side * ((1 - s) * D / 2 + cor * lift * .5);
        const y = rise * Math.pow(s, 1.45) + cor * lift;
        pos.push(x, y, z); uv.push(x / 1.6, s * slope / 1.6);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < ns; j++) {
      const a = base + i * (ns + 1) + j, b = a + ns + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/* 攒尖顶（亭子）：n 边，半径 R */
function pyramidRoofGeo(R, rise, n = 4, lift = .5) {
  const pos = [], uv = [], idx = []; const nu = 10, ns = 8;
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 + Math.PI / n, a1 = ((k + 1) / n) * Math.PI * 2 + Math.PI / n;
    const base = pos.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, ex = Math.abs(u - .5) * 2;
      const ex0 = lerp(Math.cos(a0), Math.cos(a1), u) * R, ez0 = lerp(Math.sin(a0), Math.sin(a1), u) * R;
      for (let j = 0; j <= ns; j++) {
        const s = j / ns, cor = Math.pow(ex, 3) * Math.pow(1 - s, 2);
        const f = (1 - s) * (1 + cor * lift * .3);
        pos.push(ex0 * f, rise * Math.pow(s, 1.5) + cor * lift, ez0 * f); uv.push(u * R, s * rise);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < ns; j++) { const a = base + i * (ns + 1) + j, b = a + ns + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
/* 山墙（屋顶下的三角墙），在 yz 平面，厚度 t */
function gableGeo(D, rise, t = .3) {
  const sh = new THREE.Shape(); const n = 10;
  sh.moveTo(-D / 2, 0);
  for (let j = 1; j <= n; j++) { const s = j / n; sh.lineTo(-(1 - s) * D / 2, rise * Math.pow(s, 1.45)); }
  for (let j = n - 1; j >= 0; j--) { const s = j / n; sh.lineTo((1 - s) * D / 2, rise * Math.pow(s, 1.45)); }
  sh.lineTo(-D / 2, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
  g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2); scaleUV(g, 1 / 3);
  return g;
}
/* 完整屋顶：瓦面 + 正脊 + 脊端起翘 */
function roof(W, D, rise, y, z, o = {}) {
  const lift = o.lift ?? .45, tint = o.tint ?? 0x9aa0a8;
  add('tile', roofGeo(W, D, rise, lift), M(0, y, z), tint);
  // 瓦面下的檐椽（深色底板）
  add('wood', roofGeo(W - .05, D - .05, rise, lift, 8, 5), M(0, y - .1, z), 0x3a2a20);
  const rl = W - .3;
  add('plain', box(rl, .32, .34), M(0, y + rise + .08, z), 0x2e3136);
  add('plain', box(rl + .1, .08, .44), M(0, y + rise + .26, z), 0x3a3e44);
  for (const sx of [-1, 1]) { // 脊端鸱吻式翘头
    add('plain', box(.3, .5, .36), M(sx * rl / 2, y + rise + .25, z, 0, 0, sx * .25), 0x2e3136);
    add('plain', cone(.14, .55, 6), M(sx * (rl / 2 + .12), y + rise + .6, z, 0, 0, -sx * .7), 0x2e3136);
  }
  if (o.ornament) { add('plain', sph(.22, 8, 6), M(0, y + rise + .5, z), 0x8a6a30); add('plain', cone(.12, .5, 6), M(0, y + rise + .85, z), 0x8a6a30); }
}
/* 马头墙（徽派阶梯山墙） */
function horseWall(D, H, rise, x, t = .36) {
  const steps = [[0, .2], [.2, .4], [.4, .6], [.6, .8], [.8, 1]];
  const hs = [H + .5, H + rise * .55 + .5, H + rise + .7, H + rise * .55 + .5, H + .5];
  steps.forEach(([a, b], i) => {
    const z0 = -D + a * D, z1 = -D + b * D, zc = (z0 + z1) / 2, len = z1 - z0 + .02, h = hs[i];
    add('plaster', box(t, h, len, 3), M(x, h / 2, zc), 0xF2EDE2, SHADE.damp);
    add('plain', box(t + .34, .16, len + .12), M(x, h + .08, zc), 0x2f3337);
    add('tile', box(t + .22, .1, len + .1, 1), M(x, h + .21, zc), 0x9aa0a8);
    if (i !== 2) { const zz = i < 2 ? z0 : z1; add('plain', box(t + .3, .2, .25), M(x, h + .3, zz, (i < 2 ? -1 : 1) * .5, 0, 0), 0x2f3337); }
  });
}
