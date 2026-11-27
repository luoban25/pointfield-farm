import * as THREE from 'three';
import {buildFarm} from './farm.js';
import {chapters as industrialChapters,createCloud as createIndustrialCloud} from './industrial.js';
import {buildWaterTowers,buildGreenhouseStatus} from './operations.js';
export const PARTICLE_COUNT=180000;
export const chapters=[{name:'丘陵农场'},{name:'水塔水量'},{name:'大棚状态'},...industrialChapters];
export function seededRandom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

class CloudBuilder {
  constructor(seed) { this.random = seededRandom(seed); this.samples = []; }
  point(x, y, z, brightness = .65, normal = [0, 1, 0], edge = 0) { this.samples.push({ p: [x, y, z], n: normal, i: brightness, e: edge }); }
  line(a, b, brightness = .92, step = .037) {
    const distance = Math.hypot(...a.map((v, k) => v - b[k])), count = Math.max(2, Math.ceil(distance / step));
    for (let j = 0; j <= count; j++) { const t = j / count; this.point(...a.map((v, k) => v + (b[k] - v) * t), brightness, [0, 1, 0], 1); }
  }
  path(points, brightness = .92, step = .037) { for (let i = 1; i < points.length; i++) this.line(points[i - 1], points[i], brightness, step); }
  ring(x, y, z, radius, brightness = .9, plane = 'xz') {
    const count = Math.max(40, Math.ceil(radius * Math.PI * 2 / .027));
    for (let j = 0; j < count; j++) { const a = j / count * Math.PI * 2, c = Math.cos(a) * radius, s = Math.sin(a) * radius; this.point(x + (plane === 'yz' ? 0 : c), y + (plane === 'xz' ? 0 : plane === 'yz' ? c : s), z + (plane === 'xy' ? 0 : s), brightness, [0, 1, 0], 1); }
  }
  box(x, y, z, w, h, d, detail = true, brightness = .65, spacing = .105) {
    for (const axis of [0, 1, 2]) for (const sign of [-1, 1]) {
      const other = [0, 1, 2].filter(k => k !== axis), size = [w, h, d], center = [x, y + h / 2, z];
      const rows = Math.ceil(size[other[0]] / spacing), cols = Math.ceil(size[other[1]] / spacing);
      for (let a = 0; a <= rows; a++) for (let b = 0; b <= cols; b++) {
        const p = center.slice(), n = [0, 0, 0]; n[axis] = sign; p[axis] += size[axis] * sign / 2;
        p[other[0]] += (a / Math.max(1, rows) - .5) * size[other[0]]; p[other[1]] += (b / Math.max(1, cols) - .5) * size[other[1]];
        this.point(...p, brightness * (.75 + this.random() * .25), n);
      }
    }
    if (detail) {
      const c = [[-w / 2, 0, -d / 2], [w / 2, 0, -d / 2], [w / 2, 0, d / 2], [-w / 2, 0, d / 2], [-w / 2, h, -d / 2], [w / 2, h, -d / 2], [w / 2, h, d / 2], [-w / 2, h, d / 2]].map(p => p.map((v, k) => v + [x, y, z][k]));
      for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) this.line(c[a], c[b], .85);
    }
  }
  cylinder(x, y, z, r, h, cap = true, spacing = .065, brightness = .7) {
    const angular = Math.ceil(2 * Math.PI * r / spacing), rows = Math.ceil(h / spacing);
    for (let j = 0; j < angular; j++) { const a = j / angular * Math.PI * 2, n = [Math.cos(a), 0, Math.sin(a)]; for (let k = 0; k <= rows; k++) this.point(x + n[0] * r, y + k / rows * h, z + n[2] * r, brightness * (.8 + this.random() * .2), n); }
    if (cap) for (let j = 0; j < Math.ceil(r * r * 800); j++) { const a = this.random() * Math.PI * 2, rr = Math.sqrt(this.random()) * r; this.point(x + Math.cos(a) * rr, y + h, z + Math.sin(a) * rr, brightness, [0, 1, 0]); }
    this.ring(x, y, z, r); this.ring(x, y + h, z, r);
  }
  tube(a, b, radius = .06, density = .06) {
    const start = new THREE.Vector3(...a), direction = new THREE.Vector3(...b).sub(start), length = direction.length();
    direction.normalize(); const u = new THREE.Vector3().crossVectors(direction, Math.abs(direction.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(), v = new THREE.Vector3().crossVectors(direction, u).normalize();
    const rings = Math.max(2, Math.ceil(length / density)), angular = Math.max(8, Math.ceil(radius * Math.PI * 2 / density));
    for (let j = 0; j <= rings; j++) for (let k = 0; k < angular; k++) { const a = k / angular * Math.PI * 2, n = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)), p = start.clone().addScaledVector(direction, j / rings * length).addScaledVector(n, radius); this.point(p.x, p.y, p.z, .85, n.toArray()); }
  }
  ground(count = 15000, radius = 9, brightness = .17) {
    for (let j = 0; j < count; j++) { const a = this.random() * Math.PI * 2, r = Math.sqrt(this.random()) * radius; this.point(Math.cos(a) * r, -.06, Math.sin(a) * r, brightness * (.6 + this.random() * .4)); }
  }
}

function spatialKey(p) {
  const quantize = (v, min, span) => Math.max(0, Math.min(1023, Math.floor((v - min) / span * 1023)));
  const spread = v => { v = (v | v << 16) & 0x030000ff; v = (v | v << 8) & 0x0300f00f; v = (v | v << 4) & 0x030c30c3; v = (v | v << 2) & 0x09249249; return v; };
  return (spread(quantize(p[0], -10, 20)) | spread(quantize(p[1], -3, 11)) << 1 | spread(quantize(p[2], -10, 20)) << 2) >>> 0;
}


export function createCloud(index) {
  if(index>=3){const cloud=createIndustrialCloud(index-3);cloud.kind=new Float32Array(PARTICLE_COUNT);return cloud;}
  const builder = new CloudBuilder(628 + index);
  [buildFarm,buildWaterTowers,buildGreenhouseStatus][index](builder);
  // Stratified sampling preserves all model parts; spatial ordering makes transfers local.
  const sampled = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const sample = builder.samples[Math.min(builder.samples.length - 1, Math.floor((i + builder.random()) / PARTICLE_COUNT * builder.samples.length))];
    // Tangential surface dither fills sampling gaps without inflating the shell.
    // Structural edges retain their exact coordinates and remain crisp.
    const p = sample.p.slice();
    if (sample.e < .5 && !sample.motion?.[3]) {
      const n = new THREE.Vector3(...sample.n).normalize();
      const jitter = new THREE.Vector3(builder.random()-.5,builder.random()-.5,builder.random()-.5);
      jitter.addScaledVector(n,-jitter.dot(n)).multiplyScalar(.034);
      p[0]+=jitter.x; p[1]+=jitter.y; p[2]+=jitter.z;
    }
    return { ...sample, p, i: sample.i*(.82+builder.random()*.25), key: spatialKey(p) };
  }).sort((a, b) => a.key - b.key);
  const position = new Float32Array(PARTICLE_COUNT * 3), normal = new Float32Array(PARTICLE_COUNT * 3), intensity = new Float32Array(PARTICLE_COUNT), edge = new Float32Array(PARTICLE_COUNT);
  const motion = new Float32Array(PARTICLE_COUNT * 4);
  const accent = new Float32Array(PARTICLE_COUNT);
  const kind = new Float32Array(PARTICLE_COUNT);
  sampled.forEach((sample, i) => { position.set(sample.p, i * 3); normal.set(sample.n, i * 3); intensity[i] = sample.i; edge[i] = sample.e; accent[i]=sample.accent ?? 0; kind[i]=sample.kind ?? 0; if (sample.motion) motion.set(sample.motion, i * 4); });
  return { position, normal, intensity, edge, accent, kind, motion, animated: false, sourceCount: builder.samples.length };
}
