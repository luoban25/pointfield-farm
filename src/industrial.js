import * as THREE from 'three';

export const PARTICLE_COUNT = 180000;
export const chapters = [{ name: '矿坑' }, { name: '储罐' }, { name: '港口' }, { name: '柱阵' }, { name: '天文台' }, { name: '空间站' }, { name: '海上风电' }];
export function seededRandom(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }

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

function mine(b) {
  // Irregular contour benches, strata and a winding road replace concentric bullseye rings.
  const warp = a => 1 + .05 * Math.sin(a * 3) + .025 * Math.cos(a * 7);
  const levelY = r => .4 - Math.floor(Math.max(0, 7.8 - r) / 1.05) * .42;
  for (let j = 0; j < 54000; j++) {
    const a = b.random() * Math.PI * 2, r = Math.sqrt(b.random()) * 9, noise = .03 * Math.sin(r * 14 + a * 3) + (b.random() - .5) * .055;
    b.point(Math.cos(a) * r * warp(a), levelY(r) + noise, Math.sin(a) * r * .94 * warp(a), .4 + b.random() * .27);
  }
  for (let level = 0; level < 6; level++) {
    const radius = 7.8 - level * 1.05, y = .4 - level * .42;
    for (let j = 0; j < 820; j++) { const a = j / 820 * Math.PI * 2, r = radius * warp(a); b.point(Math.cos(a) * r, y, Math.sin(a) * r * .94, .98, [0, 1, 0], 1); for (let k = 0; k < 8; k++) b.point(Math.cos(a) * r, y - k * .0525, Math.sin(a) * r * .94, .48 + b.random() * .3, [-Math.cos(a), .1, -Math.sin(a)]); }
  }
  for (let j = 0; j < 1500; j++) { const a = j / 1500 * 5.8, r = 2.7 + a * .86, y = levelY(r) + .06; for (const lane of [-.07, .07]) b.point(Math.cos(a) * (r + lane) * warp(a), y, Math.sin(a) * (r + lane) * .94 * warp(a), .78, [0, 1, 0], 1); }
  b.box(5.6, .4, -4.3, 1.1, .45, .62);
  b.box(5.6, .85, -4.3, .35, .23, .6);
  for (const x of [5.2, 6]) for (const z of [-4.65, -3.95]) b.ring(x, .55, z, .16, .9, 'xy');
  for (let j = 0; j < 3; j++) b.cylinder(-5.8 + j * .55, .4, -4.7, .18, .35);
  b.box(-6.2, .4, -3.8, 1.2, .65, .75); b.box(-6.2, 1.05, -3.8, 1.3, .08, .85);
}

function tanks(b) {
  b.ground();
  for (const [index, [x, z]] of [[-3, -2], [0, -2], [3, -2], [-3, 1], [0, 1], [3, 1]].entries()) {
    const h = 2.1 + index % 3 * .15, radius = 1.16;
    b.cylinder(x, 0, z, radius, h);
    for (const y of [.55, 1.1, 1.65]) b.ring(x, y, z, radius + .012, .68);
    b.ring(x, h + .12, z, radius * .97, .92); b.ring(x, h + .27, z, radius * .97, .72);
    for (let j = 0; j < 24; j++) { const a = j / 24 * Math.PI * 2; b.line([x + Math.cos(a) * radius * .97, h, z + Math.sin(a) * radius * .97], [x + Math.cos(a) * radius * .97, h + .27, z + Math.sin(a) * radius * .97], .75); }
    b.cylinder(x + .2, h, z, .17, .17); b.cylinder(x - .35, h, z + .25, .1, .12);
    for (const dx of [-.11, .11]) b.line([x + dx, 0, z + radius + .07], [x + dx, h + .2, z + radius + .07]);
    for (let y = .15; y < h; y += .15) b.line([x - .11, y, z + radius + .07], [x + .11, y, z + radius + .07], .8);
    b.tube([x, .25, z - radius], [x, .25, -4], .07);
  }
  for (const z of [4.05, 4.32, 4.59]) b.tube([-6.5, 1.2, z], [6.5, 1.2, z], .068, .04);
  for (let x = -6; x <= 6; x += 1.2) {
    for (const z of [3.9, 4.8]) b.line([x, 0, z], [x, 1.35, z]);
    b.line([x, 1.35, 3.9], [x, 1.35, 4.8]); b.line([x, 0, 3.9], [x + .6, 1.35, 3.9], .6);
    b.ring(x, 1.2, 4.32, .09, .9, 'yz');
  }
  for (let j = 0; j < 4; j++) { const a = j / 4 * Math.PI * 2; b.line([Math.cos(a) * .45, 0, -5.8 + Math.sin(a) * .45], [Math.cos(a) * .1, 6.6, -5.8 + Math.sin(a) * .1]); }
  for (let y = .2; y < 6.4; y += .48) for (let j = 0; j < 4; j++) { const a = j / 4 * Math.PI * 2, aa = (j + 1) / 4 * Math.PI * 2, r = .45 - y * .05, r2 = .45 - (y + .48) * .05; b.line([Math.cos(a) * r, y, -5.8 + Math.sin(a) * r], [Math.cos(aa) * r, y, -5.8 + Math.sin(aa) * r]); b.line([Math.cos(a) * r, y, -5.8 + Math.sin(a) * r], [Math.cos(aa) * r2, y + .48, -5.8 + Math.sin(aa) * r2], .58); }
  b.cylinder(0, 6.6, -5.8, .1, .3); b.box(-5.5, 0, -4.2, 1.1, .55, .8);
}

function port(b) {
  b.ground(14000);
  // Smaller stacks leave visible lanes. Ribs and door bars define individual containers.
  for (let row = 0; row < 6; row++) for (let col = 0; col < 10; col++) {
    const x = -5.6 + col * 1.25, z = -2 + row * 1.15, levels = 1 + Math.floor(b.random() * 3);
    for (let level = 0; level < levels; level++) {
      const y = level * .34;
      b.box(x, y, z, 1.08, .32, .72, true, .57, .15);
      for (let rx = -.47; rx <= .47; rx += .12) for (const side of [-1, 1]) b.line([x + rx, y + .04, z + side * .366], [x + rx, y + .28, z + side * .366], .72, .06);
      for (const dz of [-.16, .16]) b.line([x + .545, y + .03, z + dz], [x + .545, y + .29, z + dz], .92);
    }
  }
  for (const x of [-4.4, 0, 4.4]) {
    for (const dx of [-.55, .55]) for (const z of [-5.6, -4.2]) {
      b.tube([x + dx, 0, z], [x + dx, 4.5, z], .055);
      for (let y = .3; y < 4.1; y += .55) b.line([x - .55, y, z], [x + .55, y + .55, z], .64);
    }
    b.box(x, 4.35, -4.9, 1.5, .25, 1.8); b.box(x + .6, 3.9, -4.3, .45, .5, .55);
    for (const dx of [-.55, .55]) {
      b.tube([x + dx, 4.6, -5.6], [x + dx, 6.2, -6.2], .035);
      b.tube([x + dx, 6.2, -6.2], [x + dx, 4.9, -1.8], .045);
      b.tube([x + dx, 4.6, -5.6], [x + dx, 4.9, -1.8], .045);
      for (let j = 0; j < 8; j++) { const z = -5.5 + j * .48, top = 6.2 - (z + 6.2) * .295; b.line([x + dx, 4.7, z], [x + dx, top, z + .3], .6); }
      b.line([x + dx, 4.9, -1.8], [x + dx, 1.7, -1.8], .8);
    }
    b.box(x, 1.6, -1.8, 1.25, .1, .8);
    for (const dx of [-.55, .55]) for (const z of [-5.6, -4.2]) for (let n = -1; n <= 1; n++) b.ring(x + dx + n * .1, .16, z, .16, .8, 'xy');
  }
  for (const z of [5.2, -3.2]) b.line([-7, .02, z], [7, .02, z], .5, .08);
}

function archive(b) {
  b.ground(10000, 8.6, .12);
  // Terraced architectural towers replace thin featureless random columns.
  for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
    const px = (x - 3.5) * 1.05, pz = (z - 3.5) * 1.05, h = .8 + 4.5 * Math.exp(-((x - 3.5) ** 2 + (z - 3.5) ** 2) / 8);
    b.box(px, 0, pz, .68, h, .68, true, .61, .13);
    for (let y = .28; y < h; y += .28) b.path([[px - .35, y, pz - .35], [px + .35, y, pz - .35], [px + .35, y, pz + .35], [px - .35, y, pz + .35], [px - .35, y, pz - .35]], .64, .08);
    b.box(px, h, pz, .45, .12, .45, true, .8, .1);
  }
  for (let x = -4.2; x <= 4.2; x += 1.05) b.line([x, -.03, -4.2], [x, -.03, 4.2], .3, .09);
}

function observatory(b) {
  b.ground(11000, 8.8, .13);
  b.cylinder(0, 0, 0, 3.25, .24, true, .09, .52);
  for (const r of [2.85, 3.12, 3.3]) b.ring(0, .25, 0, r, .85);
  b.cylinder(0, .24, 0, 1.35, .28, true, .06);
  b.cylinder(0, .52, 0, .55, 1.4);
  const tilt = new THREE.Matrix4().makeRotationX(-.32);
  const transform = p => new THREE.Vector3(...p).applyMatrix4(tilt).add(new THREE.Vector3(0, 2.35, 0)).toArray();
  const dishRadius = 3.25, curvature = .23;
  for (let j = 0; j < 26000; j++) {
    const a = b.random() * Math.PI * 2, r = Math.sqrt(b.random()) * dishRadius, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const n = new THREE.Vector3(-2 * curvature * x, 1, -2 * curvature * z).normalize().transformDirection(tilt).toArray();
    b.point(...transform([x, curvature * r * r, z]), .57 + b.random() * .15, n);
  }
  for (const r of [1, 1.85, 2.6, dishRadius]) {
    const points = Array.from({ length: 181 }, (_, j) => { const a = j / 180 * Math.PI * 2; return transform([Math.cos(a) * r, curvature * r * r, Math.sin(a) * r]); }); b.path(points, .93, .029);
  }
  for (let k = 0; k < 32; k++) {
    const a = k / 32 * Math.PI * 2;
    const rib = Array.from({ length: 40 }, (_, j) => { const r = j / 39 * dishRadius; return transform([Math.cos(a) * r, curvature * r * r - .1, Math.sin(a) * r]); });
    b.path(rib, .88);
    for (let j = 1; j <= 5; j++) { const r = j / 5 * dishRadius, nextA = a + Math.PI * 2 / 32; b.line(transform([Math.cos(a) * r, curvature * r * r - .1, Math.sin(a) * r]), transform([Math.cos(nextA) * (r - .4), curvature * (r - .4) ** 2 - .1, Math.sin(nextA) * (r - .4)]), .52); }
  }
  const focus = transform([0, 3.5, 0]);
  for (let j = 0; j < 3; j++) { const a = j / 3 * Math.PI * 2; b.tube(transform([Math.cos(a) * dishRadius * .92, curvature * dishRadius ** 2 * .85, Math.sin(a) * dishRadius * .92]), focus, .035, .04); }
  b.box(focus[0], focus[1] - .15, focus[2], .26, .35, .26, true, .9, .035);
  for (const x of [-.95, .95]) { b.tube([x, .55, 0], [x * .4, 2.6, -.3], .12); b.tube([x, .55, .8], [x * .4, 2.5, -.3], .07); }
  b.box(-4.8, 0, 2.4, 2.5, .95, 1.75); b.box(-4.8, .95, 2.4, 2.68, .15, 1.9, true, .75);
  for (let i = 0; i < 6; i++) b.box(-5.8 + i * .4, .35, 3.282, .22, .33, .02, false, .93, .06);
  for (let i = 0; i < 8; i++) b.box(3.55 + i * .19, 0, 1.4, .2, .28 - i * .032, .75, true, .66, .1);
  for (const z of [1, 1.8]) b.path([[3.4, .9, z], [5, .45, z]], .8);
  b.cylinder(-5.3, 1.1, 2.1, .1, 1.3); b.line([-5.7, 2.1, 2.1], [-4.9, 2.1, 2.1]);
}

function spaceStation(b) {
  // Continuous capsule sampling with pressure-shell seams and docking rings.
  const capsule = (start, end, radius) => {
    b.tube(start, end, radius, .055);
    const axis = new THREE.Vector3(...end).sub(new THREE.Vector3(...start)).normalize();
    const basis = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(), second = new THREE.Vector3().crossVectors(axis, basis).normalize();
    for (const center of [start, end]) {
      for (let j = 0; j < 1000; j++) { const a = b.random() * Math.PI * 2, rr = Math.sqrt(b.random()) * radius, p = new THREE.Vector3(...center).addScaledVector(basis, Math.cos(a) * rr).addScaledVector(second, Math.sin(a) * rr); b.point(p.x, p.y, p.z, .78, axis.toArray()); }
    }
    const length = Math.hypot(...start.map((v, i) => v - end[i]));
    for (let j = 0; j <= Math.ceil(length / .4); j++) {
      const center = new THREE.Vector3(...start).lerp(new THREE.Vector3(...end), j / Math.ceil(length / .4));
      const points = Array.from({ length: 65 }, (_, k) => center.clone().addScaledVector(basis, Math.cos(k / 64 * Math.PI * 2) * radius * 1.015).addScaledVector(second, Math.sin(k / 64 * Math.PI * 2) * radius * 1.015).toArray()); b.path(points, .86, .04);
    }
  };
  capsule([0, 3, -3.6], [0, 3, 3.6], .72);
  capsule([-2.6, 3, 0], [2.6, 3, 0], .65);
  capsule([0, 3, 0], [0, 4.9, 0], .53);
  capsule([0, 3, 2.1], [0, 1.3, 2.1], .42);
  b.tube([-7.4, 3, -1.4], [7.4, 3, -1.4], .065, .04);
  for (let x = -7.2; x < 7.2; x += .35) for (const z of [-1.65, -1.15]) { b.line([x, 2.8, z], [x + .35, 3.2, z], .72); b.line([x, 3.2, z], [x + .35, 2.8, z], .72); }
  for (const x of [-5.7, -3.65, 3.65, 5.7]) for (const z of [-3.7, .9]) {
    const w = 1.55, d = 3.3, y = 3.1;
    b.box(x, y, z, w, .07, d, true, .43, .09);
    // Cell grid: raised buses and narrow, separated photovoltaic rows.
    for (let row = 0; row <= 16; row++) b.line([x - w / 2, y + .075, z - d / 2 + row * d / 16], [x + w / 2, y + .075, z - d / 2 + row * d / 16], .81, .048);
    for (let col = 0; col <= 6; col++) b.line([x - w / 2 + col * w / 6, y + .075, z - d / 2], [x - w / 2 + col * w / 6, y + .075, z + d / 2], .76, .045);
    b.tube([x, 3, -1.4], [x, y, z], .055); b.line([x - .5, 2.8, -1.4], [x, y, z], .65);
  }
  for (const z of [-3.65, 3.65]) { b.ring(0, 3, z, .8, .98, 'xy'); b.ring(0, 3, z, .44, .9, 'xy'); b.box(.7, 3.15, z - .15, .27, .25, .3); }
  b.box(-1.1, 3.55, -1.2, .6, .12, 1.4); b.box(1.1, 3.55, -1.2, .6, .12, 1.4);
  b.tube([0, 4.9, 0], [0, 5.7, .8], .04); b.ring(0, 5.7, .8, .68, .9, 'xz');
  for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; b.line([0, 5.4, .8], [Math.cos(a) * .68, 5.7, .8 + Math.sin(a) * .68], .76); }
  for (const x of [-2.7, 2.7]) { b.tube([x, 3.4, 0], [x, 4.5, .3], .027); b.tube([x, 4.5, .3], [x + .6, 4.8, 1.2], .027); b.line([x + .3, 4.8, 1.2], [x + .9, 4.8, 1.2], .9); }
}

function offshoreWind(b) {
  // Quiet, low-contrast water leaves the turbines readable. Negative motion rates
  // identify water; positive rates identify blades rotating around their own hub.
  for (let i = 0; i < 56000; i++) {
    const a = b.random() * Math.PI * 2, r = Math.sqrt(b.random()) * 9.05;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const crests = Math.pow(.5 + .5 * Math.sin(x * 2.5 + z * 1.1), 12);
    b.point(x, -.095, z, .07 + b.random() * .08 + crests * .12);
    b.samples.at(-1).motion = [0, 0, 0, -.028];
  }
  const ellipsoid = (cx, cy, cz, rx, ry, rz, brightness = .7) => {
    const rows = Math.max(12, Math.ceil(Math.max(rx, ry, rz) * Math.PI / .035));
    for (let j = 1; j < rows; j++) {
      const a = j / rows * Math.PI, ring = Math.sin(a), count = Math.max(12, Math.ceil(Math.max(rx, rz) * ring * Math.PI * 2 / .032));
      for (let k = 0; k < count; k++) {
        const t = k / count * Math.PI * 2, x = ring * Math.cos(t), y = Math.cos(a), z = ring * Math.sin(t);
        const n = new THREE.Vector3(x / rx, y / ry, z / rz).normalize().toArray();
        b.point(cx + x * rx, cy + y * ry, cz + z * rz, brightness, n);
      }
    }
  };
  const turbines = [
    [-4.35, -3.55, 3.2, 1.27, .18], [0, -5.15, 3.45, 1.32, 1.05], [4.35, -3.55, 3.2, 1.27, 1.75],
    [-4.15, .75, 3.85, 1.48, .75], [0, -.65, 3.7, 1.42, 1.45], [4.15, .75, 3.85, 1.48, .1],
    [0, 4.25, 4.65, 1.78, .42]
  ];
  for (const [id, [x, z, hubY, bladeRadius, phase]] of turbines.entries()) {
    // Monopile, tapered steel tower, shell seams and maintenance platform.
    b.cylinder(x, -.22, z, .19, .55, true, .038, .6);
    b.cylinder(x, .18, z, .46, .095, true, .04, .75);
    for (const y of [.31, .49]) b.ring(x, y, z, .465, .92);
    for (let k = 0; k < 18; k++) {
      const a = k / 18 * Math.PI * 2, px = x + Math.cos(a) * .465, pz = z + Math.sin(a) * .465;
      b.line([px, .27, pz], [px, .49, pz], .8, .025);
    }
    // Grated maintenance deck, landing fenders and a small service cabinet.
    for (let dx = -.4; dx <= .4; dx += .052) {
      const dz = Math.sqrt(.46 ** 2 - dx ** 2);
      b.line([x + dx, .28, z - dz], [x + dx, .28, z + dz], .53, .03);
    }
    b.box(x + .23, .28, z - .15, .105, .16, .13, true, .7, .025);
    for (const dx of [-.1, .1]) b.tube([x + dx, -.08, z + .46], [x + dx, .21, z + .46], .025, .025);
    const towerTop = hubY - .06, rows = Math.ceil((towerTop - .28) / .035);
    for (let j = 0; j <= rows; j++) {
      const t = j / rows, y = .28 + t * (towerTop - .28), radius = .185 - .083 * t;
      for (let k = 0; k < 36; k++) {
        const a = k / 36 * Math.PI * 2;
        b.point(x + Math.cos(a) * radius, y, z + Math.sin(a) * radius, .68, [Math.cos(a), .02, Math.sin(a)]);
      }
      if (j % 30 === 0) b.ring(x, y, z, radius + .003, .83);
    }
    b.box(x, .3, z + .19, .12, .27, .025, true, .94, .025);
    for (const dx of [-.045, .045]) b.line([x + dx, -.1, z + .26], [x + dx, .28, z + .26], .85, .022);
    for (let y = -.08; y <= .27; y += .07) b.line([x - .045, y, z + .26], [x + .045, y, z + .26], .8, .025);
    // Rounded nacelle with service seams, cooling vents and a rooftop anemometer.
    ellipsoid(x, hubY, z - .075, .21, .18, .43, .74);
    b.box(x, hubY - .1, z - .48, .33, .045, .23, true, .67, .025);
    for (const dx of [-.17, .17]) {
      b.line([x + dx, hubY - .06, z - .59], [x + dx, hubY + .09, z - .59], .7, .025);
      b.line([x + dx, hubY + .09, z - .59], [x + dx, hubY + .09, z - .37], .78, .025);
    }
    b.path([[x - .16, hubY + .14, z - .34], [x + .16, hubY + .14, z - .34], [x + .16, hubY + .14, z + .1], [x - .16, hubY + .14, z + .1], [x - .16, hubY + .14, z - .34]], .91, .025);
    for (let j = 0; j < 6; j++) for (const side of [-1, 1]) b.line([x + side * .205, hubY - .04, z - .27 + j * .042], [x + side * .205, hubY + .06, z - .27 + j * .042], .86, .018);
    b.line([x, hubY + .16, z - .28], [x, hubY + .34, z - .28], .9, .022);
    b.line([x - .08, hubY + .32, z - .28], [x + .08, hubY + .32, z - .28], .88, .018);
    const hubZ = z + .39;
    ellipsoid(x, hubY, hubZ, .145, .145, .2, .9);
    b.ring(x, hubY, hubZ, .146, .95, 'xy');
    // Curved, twisted airfoil sections: finite-difference normals follow the
    // actual cambered surface rather than treating the blades as flat triangles.
    const bladePoint = (t, a, bladeAngle) => {
      const chord = bladeRadius * (.025 + .125 * Math.pow(Math.sin(Math.PI * Math.min(.999, t * .88 + .06)), .9)) * (1 - .55 * t);
      const thickness = chord * (.22 - .1 * t), twist = .32 * (1 - t) - .12;
      const qx = Math.cos(a) * chord / 2, qz = Math.sin(a) * thickness / 2 + .012 * bladeRadius * Math.sin(Math.PI * t);
      const bx = qx * Math.cos(twist) - qz * Math.sin(twist) - bladeRadius * .105 * t * t;
      const by = bladeRadius * (.105 + .895 * t), bz = qx * Math.sin(twist) + qz * Math.cos(twist);
      return [bx * Math.cos(bladeAngle) - by * Math.sin(bladeAngle), bx * Math.sin(bladeAngle) + by * Math.cos(bladeAngle), bz];
    };
    const start = b.samples.length;
    for (let blade = 0; blade < 3; blade++) {
      const ba = phase + blade * Math.PI * 2 / 3;
      for (let j = 0; j <= 120; j++) for (let k = 0; k < 24; k++) {
        const t = Math.min(1, (j + (b.random() - .5) * .8) / 120), a = (k + b.random() * .8) / 24 * Math.PI * 2, p = bladePoint(Math.max(0,t), a, ba);
        const tangent = new THREE.Vector3(...bladePoint(t + .001, a, ba)).sub(new THREE.Vector3(...p));
        const across = new THREE.Vector3(...bladePoint(t, a + .001, ba)).sub(new THREE.Vector3(...p));
        const normal = new THREE.Vector3().crossVectors(tangent, across).normalize().toArray();
        b.point(x + p[0], hubY + p[1], hubZ + p[2], .78, normal);
      }
      for (const a of [0, Math.PI]) {
        const outline = Array.from({length: 105}, (_, j) => { const p = bladePoint(j / 104, a, ba); return [x + p[0], hubY + p[1], hubZ + p[2]]; });
        b.path(outline, .98, .019);
      }
      const tip = Array.from({length: 25}, (_, k) => { const p = bladePoint(1, k / 24 * Math.PI * 2, ba); return [x + p[0], hubY + p[1], hubZ + p[2]]; });
      b.path(tip, .97, .012);
    }
    for (let i = start; i < b.samples.length; i++) b.samples[i].motion = [x, hubY, hubZ, .21 + (id % 3) * .025];
    // A few wake rings around each pile establish the waterline.
    for (const r of [.63, .85]) b.ring(x, -.064, z, r, .18);
  }
  // Small offshore substation on jacket legs, plus a maintenance vessel.
  const sx = -6.35, sz = 3.6;
  for (const dx of [-.43, .43]) for (const dz of [-.36, .36]) b.tube([sx + dx * 1.3, -.15, sz + dz * 1.3], [sx + dx, .75, sz + dz], .045, .035);
  for (const dz of [-.36, .36]) { b.line([sx - .52, -.05, sz + dz], [sx + .43, .75, sz + dz], .7); b.line([sx + .52, -.05, sz + dz], [sx - .43, .75, sz + dz], .7); }
  b.box(sx, .72, sz, 1.25, .12, 1.1, true, .8, .06);
  b.box(sx, .84, sz, .92, .57, .76, true, .69, .06);
  b.box(sx, 1.41, sz, 1.04, .07, .86, true, .85, .06);
  for (let j = 0; j < 5; j++) b.line([sx - .35 + j * .17, .94, sz + .386], [sx - .35 + j * .17, 1.29, sz + .386], .93, .03);
  b.cylinder(sx + .3, 1.48, sz, .045, .38, true, .03);
  // Roof busbars, transformer banks and the surrounding safety rail.
  for (const dx of [-.28, 0, .28]) {
    b.box(sx + dx, 1.48, sz - .12, .18, .17, .28, true, .66, .027);
    for (let j = 0; j < 4; j++) b.line([sx + dx - .075, 1.5 + j * .035, sz + .03], [sx + dx + .075, 1.5 + j * .035, sz + .03], .85, .025);
  }
  for (const dz of [-.5, .5]) {
    b.line([sx - .61, 1.03, sz + dz], [sx + .61, 1.03, sz + dz], .78, .025);
    for (let dx = -.6; dx <= .6; dx += .2) b.line([sx + dx, .84, sz + dz], [sx + dx, 1.03, sz + dz], .75, .025);
  }
  // Array cables tie the turbines to a common substation, with low contrast.
  for (const [x, z] of turbines) {
    const start = b.samples.length;
    const cable = Array.from({length: 80}, (_, j) => {
      const t = j / 79, s = t*t*(3-2*t);
      return [x + (sx - x) * s, -.058, z + (sz - z) * t - Math.sin(t*Math.PI)*.45];
    });
    b.path(cable, .28, .027);
    for (let i = start; i < b.samples.length; i++) b.samples[i].e = .25;
  }
  const vx = 5.7, vz = 4.15;
  for (let j = 0; j < 16; j++) {
    const y = .02 + j / 15 * .25, w = .12 + j / 15 * .22;
    b.path([[vx - w, y, vz - .6], [vx - w, y, vz + .35], [vx, y, vz + .68], [vx + w, y, vz + .35], [vx + w, y, vz - .6], [vx - w, y, vz - .6]], .69, .035);
  }
  b.box(vx, .28, vz - .1, .4, .27, .48, true, .87, .045);
  b.box(vx, .56, vz - .1, .43, .06, .52, true, .92, .045);
  b.line([vx, .62, vz - .18], [vx, .94, vz - .18], .95, .025);
  for (const side of [-1, 1]) {
    b.line([vx + side*.29, .42, vz - .53], [vx + side*.29, .42, vz + .25], .75, .025);
    for (let j = 0; j < 6; j++) b.line([vx + side*.29, .27, vz - .53 + j*.15], [vx + side*.29, .42, vz - .53 + j*.15], .7, .025);
    for (let j = 0; j < 240; j++) {
      const t = j / 239;
      b.point(vx + side*(.08+t*.5), -.06, vz - .68 - t*1.35, .24*(1-t)+.07, [0,1,0]);
      b.samples.at(-1).motion = [0,0,0,-.028];
    }
  }
}

function enrichIndustrial(b, index) {
  if (index === 0) {
    // Faceted outcrops across the outer benches, with brighter exposed strata.
    for (let rock = 0; rock < 52; rock++) {
      const a = b.random()*Math.PI*2, r=7.9+b.random()*.75, radius=.07+b.random()*.16;
      const x=Math.cos(a)*r,z=Math.sin(a)*r*.94;
      for(let j=0;j<100;j++){
        const t=b.random()*Math.PI*2,h=b.random(),rr=radius*(1-h*.65);
        b.point(x+Math.cos(t)*rr,.39+h*radius*.85,z+Math.sin(t)*rr,.35+b.random()*.3,[Math.cos(t),.5,Math.sin(t)]);
      }
    }
    // A short articulated conveyor and supports near the service compound.
    for(const z of [-3.65,-3.35]){
      b.line([-6.2,1.05,z],[-3.8,.47,z],.76,.026);
      b.line([-6.2,.91,z],[-3.8,.33,z],.6,.026);
      for(let j=0;j<8;j++){
        const x=-6.2+j*.3,y=1.05-j*.0725;
        b.line([x,.4,z],[x,y,z],.57,.032);
        b.line([x,y-.12,z],[x+.3,y-.0725,z],.7,.028);
      }
    }
    for(let j=0;j<18;j++)b.line([-6.2+j*.14,1.05-j*.034,-3.65],[-6.2+j*.14,1.05-j*.034,-3.35],.68,.025);
  }
  if (index === 1) {
    for(const [id,[x,z]] of [[-3,-2],[0,-2],[3,-2],[-3,1],[0,1],[3,1]].entries()){
      const h=2.1+id%3*.15;
      for(let j=0;j<24;j++){
        const a=j/24*Math.PI*2;
        b.line([x+Math.cos(a)*.25,h+.008,z+Math.sin(a)*.25],[x+Math.cos(a)*1.13,h+.008,z+Math.sin(a)*1.13],.48,.038);
      }
      for(const r of [.46,.8])b.ring(x,h+.008,z,r,.48);
      for(let j=0;j<12;j++){
        const a=j/12*Math.PI*2;
        for(let y=.1;y<h;y+=.035)b.point(x+Math.cos(a)*1.165,y,z+Math.sin(a)*1.165,.52,[Math.cos(a),0,Math.sin(a)],.4);
      }
      // Ladder safety cage and the inlet valve handwheel.
      for(let y=.5;y<h+.15;y+=.32){
        const pts=Array.from({length:25},(_,j)=>{const a=j/24*Math.PI;return [x+Math.cos(a)*.19,y,z+1.22+Math.sin(a)*.19];});b.path(pts,.7,.022);
      }
      b.ring(x,.35,z-1.4,.12,.91,'xy');
      b.line([x-.11,.35,z-1.4],[x+.11,.35,z-1.4],.85,.02);
      b.line([x,.24,z-1.4],[x,.46,z-1.4],.85,.02);
    }
    for(const z of [3.7,5.0]){
      b.line([-6.4,1.47,z],[6.4,1.47,z],.64,.032);
      for(let x=-6.4;x<=6.4;x+=.64)b.line([x,1.2,z],[x,1.47,z],.62,.027);
    }
    for(let x=-6;x<6;x+=.16)b.line([x,1.19,3.7],[x,1.19,5],.31,.07);
    b.box(-5.5,.56,-4.2,.78,.045,.65,true,.7,.045);
    for(let j=0;j<3;j++)b.box(-5.76+j*.25,.18,-3.785,.12,.18,.02,false,.84,.03);
  }
  if(index===2){
    // Quay edge, bollards, a service truck and crane maintenance walkways.
    for(const z of [-7.25,-6.95])b.line([-7.3,.03,z],[7.3,.03,z],.65,.034);
    for(let x=-7;x<=7;x+=.65)b.cylinder(x,0,-7.12,.075,.13,true,.025,.73);
    for(const x of [-4.4,0,4.4]){
      for(const dx of [-.72,.72]){
        b.line([x+dx,4.62,-5.8],[x+dx,4.62,-4.0],.8,.025);
        for(let z=-5.8;z<=-4;z+=.3)b.line([x+dx,4.37,z],[x+dx,4.62,z],.69,.026);
      }
      for(const z of [-4.025,-4.58])b.box(x+.6,4.05,z,.25,.18,.016,false,.85,.03);
      for(let j=0;j<12;j++)b.line([x-.69,4.38,-5.75+j*.145],[x+.69,4.38,-5.75+j*.145],.43,.045);
    }
    b.box(-6.7,0,2.7,.48,.35,1.1,true,.64,.045);
    b.box(-6.7,.35,3.03,.48,.27,.43,true,.77,.04);
    b.box(-6.7,.39,3.253,.35,.14,.012,false,.94,.025);
    for(const x of [-6.97,-6.43])for(const z of [2.37,3.07])b.ring(x,.15,z,.12,.85,'yz');
    for(let j=0;j<45;j++){
      const x=-7.3+j*.33;
      b.line([x,0,5.65],[x,.48,5.65],.36,.045);
      if(j<44){b.line([x,.48,5.65],[x+.33,.48,5.65],.43,.045);b.line([x,.07,5.65],[x+.33,.48,5.65],.27,.055);}
    }
  }
}

function spatialKey(p) {
  const quantize = (v, min, span) => Math.max(0, Math.min(1023, Math.floor((v - min) / span * 1023)));
  const spread = v => { v = (v | v << 16) & 0x030000ff; v = (v | v << 8) & 0x0300f00f; v = (v | v << 4) & 0x030c30c3; v = (v | v << 2) & 0x09249249; return v; };
  return (spread(quantize(p[0], -10, 20)) | spread(quantize(p[1], -3, 11)) << 1 | spread(quantize(p[2], -10, 20)) << 2) >>> 0;
}

// Asset materials persist between sweeps: a few selected structures are copper,
// solar panels are blue, and the rest remain neutral. This is separate from scan.
function assetAccent(index,p) {
  const [x,y,z]=p;
  if(index===0)return x<-5&&z<-3&&z>-5&&y>.43?.8:0;
  if(index===1){
    if(Math.hypot(x-3,z-1)<1.28&&y>.15)return 1;
    if(Math.hypot(x+3,z+2)<1.28&&y>.15)return .35;
    if(z>4.15&&z<4.48&&y>1.08&&y<1.35)return .85;
    return y>5.8?.75:0;
  }
  if(index===2){
    if(z<-3.6&&Math.abs(x+4.4)<.9&&y>1.2)return .7;
    const col=Math.round((x+5.6)/1.25),row=Math.round((z+2)/1.15);
    if(col>=0&&col<10&&row>=0&&row<6&&Math.abs(x-(-5.6+col*1.25))<.56&&Math.abs(z-(-2+row*1.15))<.38&&y>.025&&y<1.1){
      const group=(col+row*2)%7;return group===3?1:group===1?.4:0;
    }
  }
  if(index===3){const col=Math.round(x/1.05+3.5),row=Math.round(z/1.05+3.5);return y>.05&&(col+row*2)%7===2?.85:0;}
  if(index===4)return x<-3.5&&z>1.4&&z<3.5&&y>.15?.9:y>.5&&y<1.75&&Math.hypot(x,z)<1.5?.35:0;
  if(index===5)return Math.abs(x)>2.8&&y>3&&y<3.3?-1:Math.abs(z)>3.5&&Math.abs(x)<.85?.6:0;
  if(index===6){
    if(x<-5.55&&z>2.9&&z<4.3&&y>.72)return .92;
    if(y>.26&&y<.5&&(Math.hypot(x,z-4.25)<.51||Math.hypot(x-4.15,z-.75)<.51))return .85;
    if(x>5.3&&x<6.1&&z>3.5&&z<4.85&&y>.27)return .7;
    return 0;
  }
  return 0;
}

export function createCloud(index) {
  const builder = new CloudBuilder(628 + index);
  [mine, tanks, port, archive, observatory, spaceStation, offshoreWind][index](builder);
  enrichIndustrial(builder,index);
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
  sampled.forEach((sample, i) => { position.set(sample.p, i * 3); normal.set(sample.n, i * 3); intensity[i] = sample.i; edge[i] = sample.e; accent[i]=assetAccent(index,sample.p); if (sample.motion) motion.set(sample.motion, i * 4); });
  return { position, normal, intensity, edge, accent, motion, animated: index === 6, sourceCount: builder.samples.length };
}
