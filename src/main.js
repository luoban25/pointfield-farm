import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { chapters, createCloud, PARTICLE_COUNT, seededRandom } from './scenes.js';
import { vertexShader, fragmentShader, morphPosition, poseTarget, beamVertexShader, beamFragmentShader } from './shaders.js';
import { createDetails } from './details.js';
import {createDetails as createIndustrialDetails} from './industrial-details.js';
import {industrialCopy,componentPanel} from './catalog.js';
import { BEAM, createBeamGeometry } from './beam.js';
import {waterTowers,greenhouseReadings} from './operations.js';
import './style.css';
import './typography.css';
import {sceneGlyphs,waterReading,greenhouseReading} from './graphics.js';

const $ = selector => document.querySelector(selector);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const defaults = () => ({ speed: .32, size: 1.15, trail: .85, auto: false, rotate: !motionPreference.matches, palette: 'amber' });
const config = defaults();
const palettes = { mint: { color: 0x83d5c2, rgb: [.45, .9, .78] }, amber: { color: 0xe8af65, rgb: [1, .56, .23] }, violet: { color: 0xb29bdd, rgb: [.7, .58, 1] } };
const DEFAULT_SCENE = 0;
const isOperational=index=>index===1||index===2;
const isVertical=index=>isOperational(index)||index===6;
let active = DEFAULT_SCENE, chapterTime = 0, modelTime = 0, angle = 1.55, morph = 1, initialized = false, modeFrom = 0, modeTo = 0;
const MORPH_DURATION = 1.85;
let paused = motionPreference.matches, frameId = 0, last = performance.now(), dirty = true, contextLost = false, disposed = false;
let width = 1, height = 1, renderedFrames = 0;
let viewTransition = null, currentView = 'overview';
let scanProgress = 1, statusStamp = 0;
const sceneCopy = [
  {eyebrow:'01 / 丘陵之间的农场',title:'<span class="title-lead">顺着土地，</span><br><span class="title-line">看见<em>生长。</em></span>',description:'沿着丘陵，探索梯田、果园与农舍。切换模型，查看农场的供水与温室状态。',metrics:[['地形','丘陵梯田'],['种植','麦田 · 果园'],['设施','谷仓 · 温室']]},
  {eyebrow:'02 / 灌溉供水 · 演示数据',title:'<span class="title-lead">每一滴水，</span><br><span class="title-line">都有<em>刻度。</em></span>',description:'从塔顶向下扫描，让储水结构与水位逐层显现。九座水塔，一眼看清供水余量。',metrics:[['平均水量','70.4%'],['最低水位','42%'],['供水设施','9 座水塔']]},
  {eyebrow:'03 / 温室环境 · 演示数据',title:'<span class="title-lead">让生长，</span><br><span class="title-line"><em>清晰可见。</em></span>',description:'扫描穿过棚架与种植床，显出温度、湿度与土壤状态，及时发现需要加强通风的区域。',metrics:[['平均温度','25.4°C'],['空气湿度','68.3%'],['土壤含水','54.7%']]},
  ...industrialCopy
];
const farmViews = {
  overview: {position:[Math.sin(.38)*24.5,16.5,Math.cos(.38)*24.5],target:[0,1.3,0],label:'农场全景'},
  terrace: {position:[9,9,9],target:[3.2,1,-3.3],label:'梯田种植'},
  buildings: {position:[1.2,8,10],target:[-4,1,-2],label:'农舍与谷仓'},
  orchard: {position:[-1,7,16],target:[-4.6,.5,4.5],label:'果园与水系'}
};
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch {
  $('#error').hidden = false;
  $('#error').textContent = '无法启动三维渲染，请在支持 WebGL 的浏览器中打开。';
  throw new Error('WebGL initialization failed');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.setAttribute('aria-hidden', 'true');
$('#viewport').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .1, 150);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, { enableDamping: true, dampingFactor: .09, enablePan: false, minDistance: 6, maxDistance: 45, minPolarAngle: .32, maxPolarAngle: 1.38, autoRotateSpeed: .3 });
const uniforms = {
  uAngle: { value: angle }, uSize: { value: config.size * renderer.getPixelRatio() },
  uTrail: { value: config.trail }, uMorph: { value: 1 }, uArchive: { value: 0 }, uSlice: { value: 3 }, uGlowPass: { value: 0 }, uDepthPass: {value:0}, uReveal:{value:0},
  uBaseColor: { value: new THREE.Vector3(1, 1, 1) }, uScanColor: { value: new THREE.Vector3(...palettes[config.palette].rgb) }, uModelTime: {value: 0}
};
const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false });
const models = chapters.map((_, index) => createCloud(index));
const geometry = new THREE.BufferGeometry();
const attributes = [['position', 'position', 3], ['aNormal', 'normal', 3], ['aIntensity', 'intensity', 1], ['aEdge', 'edge', 1], ['aAccent','accent',1],['aKind','kind',1]];
for (const [name, key, itemSize] of attributes) geometry.setAttribute(name, new THREE.BufferAttribute(models[0][key].slice(), itemSize).setUsage(THREE.DynamicDrawUsage));
const targetAttributes=[['aTarget', 'position', 3], ['aTargetNormal', 'normal', 3], ['aTargetIntensity', 'intensity', 1], ['aTargetEdge', 'edge', 1], ['aTargetAccent','accent',1],['aTargetKind','kind',1]];
for (const [name, key, itemSize] of targetAttributes) geometry.setAttribute(name, new THREE.BufferAttribute(models[0][key].slice(), itemSize).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('aTargetMotion', new THREE.BufferAttribute(models[0].motion.slice(), 4).setUsage(THREE.DynamicDrawUsage));
const posedPosition = new Float32Array(PARTICLE_COUNT * 3), posedNormal = new Float32Array(PARTICLE_COUNT * 3);
const random = seededRandom(804), seeds = Float32Array.from({length: PARTICLE_COUNT}, () => random());
geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
const particles = new THREE.Points(geometry, material);
particles.frustumCulled = false;
// A small depth-only splat removes rear-surface clutter without filling the
// space between particles. All three passes share the same pose and buffers.
const depthMaterial = new THREE.ShaderMaterial({uniforms:{...uniforms,uDepthPass:{value:1}},vertexShader,fragmentShader,colorWrite:false,depthWrite:true});
const depthCloud = new THREE.Points(geometry,depthMaterial);
depthCloud.frustumCulled=false;depthCloud.renderOrder=-2;
const glowUniforms = {...uniforms, uGlowPass: {value: 1}};
const glowMaterial = new THREE.ShaderMaterial({uniforms: glowUniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
const glow = new THREE.Points(geometry, glowMaterial);
glow.frustumCulled = false; glow.renderOrder = 1;
scene.add(depthCloud, particles, glow);
const farmDetails=createDetails(),industrialDetails=createIndustrialDetails();
scene.add(farmDetails.root,industrialDetails.root);
const details={getState(index){return index<3?farmDetails.getState(index):industrialDetails.getState(index-3);},update(index,morph,width,pure,time,scanY){
  farmDetails.root.visible=index<3;industrialDetails.root.visible=index>=3;
  if(index<3)farmDetails.update(index,morph,width,pure,time,scanY);
  else industrialDetails.update(index-3,morph,width,pure,time);
}};
function line(points, color = 0x597276, opacity = .23) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(point => new THREE.Vector3(...point)));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
scene.add(line(Array.from({ length: 361 }, (_, i) => {
  const a = i * Math.PI / 180;
  return [Math.cos(a) * 9.35, -.02, Math.sin(a) * 9.35];
})));
scene.add(line(Array.from({length:361},(_,i)=>{const a=i*Math.PI/180;return [Math.cos(a)*9.05,-.025,Math.sin(a)*9.05];}),0x61716b,.075));
for (let i = 0; i < 48; i++) {
  const a = i / 48 * Math.PI * 2, r = 9.35, extension = i % 4 === 0 ? .3 : .12;
  scene.add(line([[Math.cos(a) * r, -.02, Math.sin(a) * r], [Math.cos(a) * (r + extension), -.02, Math.sin(a) * (r + extension)]]));
}
// Surface glow and the perimeter crescent follow the same scan angle as the light sheet.
const sweepMaterial = new THREE.ShaderMaterial({uniforms: {uAngle: uniforms.uAngle, uColor: uniforms.uScanColor, uOpacity: {value: 1}}, vertexShader: 'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}', fragmentShader: 'uniform float uAngle,uOpacity; uniform vec3 uColor; varying vec3 vWorld; void main(){float age=mod(uAngle-atan(vWorld.z,vWorld.x)+6.2831853,6.2831853);float a=exp(-age*5.0)*0.72+exp(-pow(min(age,6.2831853-age)/0.068,2.0))*0.25;gl_FragColor=vec4(uColor,a*uOpacity);}', transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending});
const scanRim = new THREE.Mesh(new THREE.RingGeometry(9.33,9.355,256), sweepMaterial);
scanRim.rotation.x = -Math.PI / 2; scanRim.position.y = .015;
scene.add(scanRim);
// The vertical origin guide stays visible while the model particles reorganize.
const centerGuide = line([[0, BEAM.bottom, 0], [0, BEAM.top, 0]], palettes.mint.color, .3);
centerGuide.renderOrder = 2;
centerGuide.material.depthWrite = false;
const centerTip = new THREE.Mesh(new THREE.OctahedronGeometry(.065), new THREE.MeshBasicMaterial({color: palettes.mint.color, transparent: true, opacity: .85, depthWrite: false}));
centerTip.position.set(0, 7.2, 0);
const sourceHalo = new THREE.Mesh(new THREE.RingGeometry(.12,.135,48), new THREE.MeshBasicMaterial({color:palettes[config.palette].color,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide}));
sourceHalo.position.copy(centerTip.position);
scene.add(centerGuide, centerTip, sourceHalo);
const beamGeometry = createBeamGeometry();
const beamMaterial = new THREE.ShaderMaterial({
  uniforms: {uScanColor: uniforms.uScanColor, uOpacity: {value: .18},uCameraLocal:{value:new THREE.Vector3()},
    uRadius:{value:BEAM.radius},uTop:{value:BEAM.top},uBottom:{value:BEAM.bottom},uOuterY:{value:BEAM.outerY},uHalfSlope:{value:Math.tan(BEAM.aperture/2)}},
  vertexShader: beamVertexShader, fragmentShader: beamFragmentShader,
  transparent: true, depthWrite: false, depthTest:false, side: THREE.BackSide
});
const scanBeam = new THREE.Mesh(beamGeometry, beamMaterial);
scanBeam.renderOrder = -1;
scene.add(scanBeam);
const slice = new THREE.Mesh(new THREE.PlaneGeometry(13.4, 13.4), new THREE.MeshBasicMaterial({ color: palettes.mint.color, transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false,depthTest:false }));
slice.rotation.x = -Math.PI / 2;
const sliceBorder = line([[-6.7, 0, -6.7], [6.7, 0, -6.7], [6.7, 0, 6.7], [-6.7, 0, 6.7], [-6.7, 0, -6.7]], palettes.mint.color, .4);
sliceBorder.material.depthTest=false;
scene.add(slice, sliceBorder);

function requestFrame() {
  if (!frameId && !document.hidden && !contextLost && !disposed) frameId = requestAnimationFrame(frame);
}
function invalidate() { dirty = true; requestFrame(); }
function applyPalette() {
  const palette = palettes[config.palette];
  uniforms.uScanColor.value.set(...palette.rgb);
  for (const object of [slice, sliceBorder, centerGuide, centerTip, sourceHalo]) object.material.color.setHex(palette.color);
  invalidate();
}
function revealSceneButton(instant=true) {
  const strip=$('.model-buttons'),selected=strip?.querySelector(`[data-scene="${active}"]`);
  if(!selected)return;
  const left=selected.offsetLeft-strip.offsetLeft;
  if(left<strip.scrollLeft||left+selected.offsetWidth>strip.scrollLeft+strip.clientWidth)strip.scrollTo({left:left-(strip.clientWidth-selected.offsetWidth)/2,behavior:instant?'instant':'smooth'});
}
function resize() {
  width = $('#viewport').clientWidth;
  height = $('#viewport').clientHeight;
  if (!width || !height) return;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  // Fit a centered composition across narrow, wide and landscape screens.
  camera.zoom = Math.min(1.2, Math.max(.28, camera.aspect / (active===0?1.08:1.02)));
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
  revealSceneButton();
  invalidate();
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe($('#viewport'));
function selectView(name) {
  if(active!==0) switchScene(0);
  const view = farmViews[name];
  if (!view) return;
  currentView = name;
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.closest('.view-buttons')) button.setAttribute('aria-pressed', String(button.dataset.view === name));
  });
  $('#scene-status').textContent = `当前观察：${view.label}`;
  config.rotate = false; syncSettings();
  // Flush any remaining drag inertia before capturing an interruptible flight.
  controls.enableDamping = false; controls.autoRotate = false; controls.update();
  const position = new THREE.Vector3(...view.position), target = new THREE.Vector3(...view.target);
  if (motionPreference.matches) {
    camera.position.copy(position); controls.target.copy(target); controls.update();
    controls.enableDamping = true; viewTransition = null;
  } else {
    viewTransition = {fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position,target,elapsed:0};
  }
  invalidate();
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  selectView(button.dataset.view);
  if (button.classList.contains('region-link')) {
    $('#explore').scrollIntoView({behavior:motionPreference.matches?'instant':'smooth',block:'center'});
    $('#viewport').focus({preventScroll:true});
  }
}));
function captureMorph() {
  poseTarget(geometry.attributes.aTarget.array, geometry.attributes.aTargetNormal.array, geometry.attributes.aTargetMotion.array, uniforms.uModelTime.value, posedPosition, posedNormal);
  const position = geometry.attributes.position.array, target = posedPosition;
  const normal = geometry.attributes.aNormal.array, targetNormal = posedNormal;
  const intensity = geometry.attributes.aIntensity.array, targetIntensity = geometry.attributes.aTargetIntensity.array;
  const edge = geometry.attributes.aEdge.array, targetEdge = geometry.attributes.aTargetEdge.array;
  const accent = geometry.attributes.aAccent.array,targetAccent=geometry.attributes.aTargetAccent.array;
  const kind=geometry.attributes.aKind.array,targetKind=geometry.attributes.aTargetKind.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const offset = i * 3, ease = morphPosition(position, target, seeds[i], morph, position, offset);
    let length = 0;
    for (let k = 0; k < 3; k++) { normal[offset+k] += (targetNormal[offset+k]-normal[offset+k])*ease + .0001; length += normal[offset+k] ** 2; }
    length = Math.sqrt(length);
    for (let k = 0; k < 3; k++) normal[offset+k] /= length;
    intensity[i] += (targetIntensity[i]-intensity[i])*ease;
    edge[i] += (targetEdge[i]-edge[i])*ease;
    accent[i] += (targetAccent[i]-accent[i])*ease;
    kind[i] += (targetKind[i]-kind[i])*ease;
  }
  for (const [name] of attributes) geometry.attributes[name].needsUpdate = true;
}
function switchScene(index, { immediate = false } = {}) {
  const next = ((index % chapters.length) + chapters.length) % chapters.length;
  if (initialized && next === active && !immediate) return;
  const instant = !initialized || immediate || motionPreference.matches;
  if (!instant) captureMorph();
  modeFrom = uniforms.uArchive.value;
  active = next;
  $('#explore').dataset.model=String(active);
  scanProgress=!isOperational(active)||motionPreference.matches?1:0;
  chapterTime = 0; modelTime = 0; uniforms.uModelTime.value = 0;
  const model = models[active];
  if (instant) for (const [name, key] of attributes) { geometry.attributes[name].array.set(model[key]); geometry.attributes[name].needsUpdate = true; }
  for (const [name, key] of targetAttributes) { geometry.attributes[name].array.set(model[key]); geometry.attributes[name].needsUpdate = true; }
  geometry.attributes.aTargetMotion.array.set(model.motion); geometry.attributes.aTargetMotion.needsUpdate = true;
  morph = instant ? 1 : 0;
  last = performance.now();
  uniforms.uMorph.value = morph;
  $('#scene-number').textContent = `${String(active+1).padStart(2,'0')} / ${chapters.length}`;
  $('#scene-name').textContent = chapters[active].name;
  $('#explore').setAttribute('aria-label',`探索${chapters[active].name}`);
  $('#viewport').setAttribute('aria-label',`三维${chapters[active].name}。拖拽旋转，滚轮或双指缩放；加减键缩放。`);
  $('#next-model').innerHTML=`查看${chapters[(active+1)%chapters.length].name.replace('水塔水量','水塔').replace('大棚状态','大棚').replace('丘陵农场','农场')} <span aria-hidden="true">↗</span>`;
  $('#scene-status').textContent = `当前场景：${chapters[active].name}`;
  document.querySelectorAll('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(+button.dataset.scene === active)));
  modeTo = isVertical(active) ? 1 : 0;
  const copy=sceneCopy[active];
  $('#hero-title').innerHTML=copy.title;
  $('#overview').dataset.mode=active;
  $('#scene-glyph').innerHTML=active<3?sceneGlyphs[active]:copy.glyph;
  $('#overview').style.setProperty('--scene-color',copy.color||['#beeb86','#53dcff','#b0ef85'][active]);
  $('#explore').classList.toggle('has-components',active>=3);
  $('#asset-readings').classList.toggle('component-panel',active>=3);
  $('#scene-metrics').classList.toggle('structural-metrics',active>=3);
  $('#asset-readings').classList.toggle('water-array',active===1);
  $('.hero-copy .eyebrow').textContent=copy.eyebrow;
  $('.hero-description').textContent=copy.description;
  $('.view-buttons').hidden=active!==0;
  $('#rescan').hidden=!isOperational(active);
  $('#scan-monitor').hidden=!isOperational(active);
  $('#asset-readings').hidden=active===0;
  $('#scene-metrics').hidden=active===0;
  $('#scene-metrics').innerHTML=copy.metrics.map(([label,value])=>`<div><span>${label}</span><strong>${active>=3?value:'—'}</strong></div>`).join('');
  if(active>=3)$('#asset-readings').innerHTML=componentPanel(copy);
  $('.model-navigation').style.setProperty('--scene-color',copy.color||['#beeb86','#53dcff','#b0ef85'][active]);
  revealSceneButton(instant);
  if(active===1)$('#asset-readings').innerHTML=waterTowers.map(waterReading).join('');
  if(active===2)$('#asset-readings').innerHTML=greenhouseReadings.map(greenhouseReading).join('');
  config.rotate=false;syncSettings();
  viewTransition=null;currentView='overview';
  document.querySelectorAll('.view-buttons button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view==='overview')));
  controls.enableDamping=false;controls.autoRotate=false;controls.update();
  const nextPosition=new THREE.Vector3(...farmViews.overview.position),nextTarget=new THREE.Vector3(0,active===1?2:1.3,0);
  if(instant){camera.position.copy(nextPosition);controls.target.copy(nextTarget);controls.update();controls.enableDamping=true;}
  else viewTransition={fromPosition:camera.position.clone(),fromTarget:controls.target.clone(),position:nextPosition,target:nextTarget,elapsed:0};
  updateStatus();
  if (instant) modeFrom = modeTo;
  if (!initialized || immediate) {
    const yaw = .38;
    camera.position.set(Math.sin(yaw) * 24.5, 16.5, Math.cos(yaw) * 24.5);
    controls.target.set(0, 1.3, 0);
    controls.enableDamping = false; controls.update(); controls.enableDamping = true;
  }
  initialized = true;
  invalidate();
}
function updateStatus() {
  if(!isOperational(active))return;
  const complete=scanProgress>=1,copy=sceneCopy[active];
  $('#scan-stage').textContent=morph<1?'粒子重组':complete?'扫描完成':'由上向下扫描';
  $('#scan-percent').textContent=`${Math.floor(scanProgress*100)}%`;
  $('#scan-track').style.transform=`scaleX(${scanProgress})`;
  $('#scene-metrics').querySelectorAll('strong').forEach((item,i)=>{const threshold=active===1?.66+i*.08:.8+i*.05;const value=scanProgress>threshold?copy.metrics[i][1]:'—';if(item.textContent!==value)item.textContent=value;});
  const readings=document.querySelectorAll('[data-reading]');
  for(const reading of readings){const i=+reading.dataset.reading,ready=morph===1&&scanProgress>.01&&(active===1?uniforms.uSlice.value<.46+waterTowers[i].height*waterTowers[i].level/100:scanProgress>.72+i*.025);
    reading.textContent=ready?(active===1?`${waterTowers[i].level}%`:greenhouseReadings[i].status):'—';
    reading.classList.toggle('needs-attention',ready&&(active===1?waterTowers[i].level<45:greenhouseReadings[i].temp>27));
    reading.parentElement.classList.toggle('reading-revealed',ready);
  }
}
$('#rescan').onclick=()=>{scanProgress=motionPreference.matches?1:0;modelTime=0;uniforms.uModelTime.value=0;if(!motionPreference.matches){paused=false;syncPause();}updateStatus();invalidate();};
$('#next-model').onclick=()=>switchScene(active+1);
function frame(now) {
  frameId = 0;
  if (document.hidden || contextLost || disposed) return;
  const dt = Math.min((now - last) / 1000, .1);
  last = now;
  const running = !paused && ((config.speed > 0 && (!isOperational(active) || scanProgress<1)) || config.rotate || config.auto || models[active].animated);
  if (running) {
    chapterTime += dt; angle = (angle + dt * config.speed) % (Math.PI * 2);
    if (config.auto && chapterTime > 12) switchScene(active + 1);
    modelTime += dt;
    if(isOperational(active)&&morph===1)scanProgress=Math.min(1,scanProgress+dt*config.speed/1.65);
  }
  const reorganizing = morph < 1;
  const movingView = viewTransition !== null;
  if (viewTransition) {
    viewTransition.elapsed += dt;
    const t = Math.min(1, viewTransition.elapsed / 1.1), ease = t*t*(3-2*t);
    camera.position.lerpVectors(viewTransition.fromPosition,viewTransition.position,ease);
    controls.target.lerpVectors(viewTransition.fromTarget,viewTransition.target,ease);
    if (t === 1) viewTransition = null;
  }
  if (reorganizing) morph = Math.min(1, morph + dt / MORPH_DURATION);
  if (dirty || running || reorganizing || movingView) {
    dirty = false;
    uniforms.uMorph.value = morph;
    uniforms.uModelTime.value = modelTime;
    const eased = morph * morph * (3-2*morph), transitionVisibility = 1 - Math.sin(morph * Math.PI) * .9;
    uniforms.uArchive.value = modeFrom + (modeTo-modeFrom) * eased;
    uniforms.uReveal.value=isOperational(active)?THREE.MathUtils.smoothstep(morph,.72,1):0;
    uniforms.uAngle.value = angle;
    uniforms.uSize.value = config.size * renderer.getPixelRatio();
    uniforms.uTrail.value = config.trail;
    const sliceY = active===6?6.3-angle/(Math.PI*2)*6.6:6.1-scanProgress*6.45;
    uniforms.uSlice.value = sliceY;
    slice.position.y = sliceBorder.position.y = sliceY;
    slice.visible = sliceBorder.visible = morph===1&&(active===6||(isOperational(active)&&scanProgress<1));
    slice.material.opacity = active===6?.008:.026;
    sliceBorder.material.opacity = active===6?.18:.38;
    centerGuide.visible=centerTip.visible=sourceHalo.visible=!isVertical(active);
    sweepMaterial.uniforms.uOpacity.value = transitionVisibility * (1-uniforms.uArchive.value);
    centerGuide.material.opacity = .2 + .1 * transitionVisibility;
    centerTip.material.opacity = .65 + .2 * transitionVisibility;
    scanBeam.rotation.y = -angle;
    beamMaterial.uniforms.uOpacity.value = .18 * (.55 + .45 * transitionVisibility) * (1-uniforms.uArchive.value);
    scanBeam.visible = uniforms.uArchive.value < .99;
    controls.autoRotate = config.rotate && running && !movingView;
    controls.enableDamping = !movingView;
    controls.dampingFactor = 1 - Math.exp(-Math.max(dt, 1 / 240) * 14);
    controls.update(dt);
    scanBeam.worldToLocal(beamMaterial.uniforms.uCameraLocal.value.copy(camera.position));
    sourceHalo.quaternion.copy(camera.quaternion);
    details.update(active,morph,width,document.body.classList.contains('pure'),modelTime,sliceY);
    if(isOperational(active)&&(now-statusStamp>120||(scanProgress===1&&$('#scan-percent').textContent!=='100%'))){updateStatus();statusStamp=now;}
    renderer.render(scene, camera);
    renderedFrames++;
  }
  if (running || morph < 1 || dirty || viewTransition) requestFrame();
}
controls.addEventListener('change', invalidate);
controls.addEventListener('start', () => {
  viewTransition = null; controls.enableDamping = true;
  currentView = 'free';
  document.querySelectorAll('.view-buttons button').forEach(button=>button.setAttribute('aria-pressed','false'));
  invalidate();
});
function syncPause() {
  $('#pause').setAttribute('aria-pressed', String(paused));
  $('#pause').setAttribute('aria-label', paused ? '继续扫描' : '暂停扫描');
  $('#pause').title = `${paused ? '继续' : '暂停'} · 空格`;
  $('#pause-icon').setAttribute('d', paused ? 'm9 5 10 7-10 7Z' : 'M9 6v12M15 6v12');
}
function togglePause() { paused = !paused; last = performance.now(); syncPause(); invalidate(); }
$('#pause').onclick = togglePause;
const settings = $('#settings');
function closeSettings() { settings.close(); }
function openSettings() { if (!settings.open) settings.showModal(); }
$('#settings-toggle').onclick = openSettings;
$('#close-settings').onclick = closeSettings;
settings.addEventListener('click', event => { if (event.target === settings) { const r = settings.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeSettings(); } });
function syncSettings() {
  for (const key of ['speed', 'size', 'trail']) { $(`#${key}`).value = config[key]; $(`#${key}-value`).value = String(config[key]); }
  $('#rotate').checked = config.rotate;
  $('#palette').value = config.palette;
}
for (const key of ['speed', 'size', 'trail']) $(`#${key}`).oninput = event => { config[key] = +event.target.value; $(`#${key}-value`).value = event.target.value; invalidate(); };
$('#rotate').onchange = event => { config.rotate = event.target.checked; invalidate(); };
$('#palette').onchange = event => { config.palette = event.target.value; applyPalette(); };
$('#reset').onclick = () => { viewTransition=null; currentView='overview'; document.querySelectorAll('.view-buttons button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view==='overview'))); Object.assign(config, defaults()); paused = motionPreference.matches; syncPause(); syncSettings(); applyPalette(); switchScene(DEFAULT_SCENE, {immediate:true}); };
function togglePure() {
  const pure = document.body.classList.toggle('pure');
  $('#pure').setAttribute('aria-label', pure ? '显示界面' : '隐藏界面');
  $('#pure').title = `${pure ? '显示' : '隐藏'}界面 · H`;
  invalidate();
}
$('#pure').onclick = togglePure;
$('.model-buttons').innerHTML=chapters.map((chapter,index)=>`<button data-scene="${index}" aria-pressed="${index===DEFAULT_SCENE}"><small>${String(index+1).padStart(2,'0')}</small><span>${chapter.name.replace('丘陵农场','农场全景')}</span></button>`).join('');
document.querySelectorAll('[data-scene]').forEach(button => { button.onclick = () => switchScene(+button.dataset.scene); });
document.addEventListener('keydown', event => {
  if (settings.open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.toLowerCase() === 'c') openSettings();
  if (event.key.toLowerCase() === 'h') togglePure();
  if (event.code === 'Space' && (event.target === document.body || event.target === $('#viewport'))) { event.preventDefault(); togglePause(); }
  if ((event.key === '+' || event.key === '-' || event.key === '=') && event.target === $('#viewport')) {
    event.preventDefault(); const distance = camera.position.distanceTo(controls.target); const targetDistance = THREE.MathUtils.clamp(distance * (event.key === '-' ? 1.1 : .9), controls.minDistance, controls.maxDistance); camera.position.sub(controls.target).multiplyScalar(targetDistance / distance).add(controls.target); invalidate();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else { last = performance.now(); invalidate(); } });
motionPreference.addEventListener('change', event => { if (event.matches) { paused = true; config.rotate = config.auto = false; morph = 1; if(viewTransition){camera.position.copy(viewTransition.position);controls.target.copy(viewTransition.target);viewTransition=null;controls.enableDamping=false;controls.update();controls.enableDamping=true;} syncPause(); syncSettings(); invalidate(); } });
renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; cancelAnimationFrame(frameId); frameId = 0; $('#error').hidden = false; $('#error').textContent = '渲染暂时中断，正在等待恢复。'; });
renderer.domElement.addEventListener('webglcontextrestored', () => { contextLost = false; $('#error').hidden = true; last = performance.now(); invalidate(); });
window.addEventListener('pagehide', event => {
  cancelAnimationFrame(frameId); frameId = 0;
  if (event.persisted) return;
  disposed = true; resizeObserver.disconnect(); controls.dispose();
  const geometries = new Set(), materials = new Set();
  scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) materials.add(object.material); });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(value => {value.map?.dispose();value.dispose();}); renderer.dispose();
});
window.addEventListener('pageshow', () => { last = performance.now(); invalidate(); });
syncPause(); syncSettings(); applyPalette(); switchScene(DEFAULT_SCENE); resize(); requestFrame();
function getTransitionSnapshot(start = 0) {
  const p = start * 3, m = start * 4, end = Math.min(PARTICLE_COUNT, start + 10), target = new Float32Array((end - start) * 3);
  poseTarget(geometry.attributes.aTarget.array.subarray(p,end*3), geometry.attributes.aTargetNormal.array.subarray(p,end*3), geometry.attributes.aTargetMotion.array.subarray(m,end*4), uniforms.uModelTime.value, target);
  return {from:Array.from(geometry.attributes.position.array.subarray(p,end*3)), to:Array.from(target), seeds:Array.from(seeds.subarray(start,end)), fromAccent:Array.from(geometry.attributes.aAccent.array.subarray(start,end)),toAccent:Array.from(geometry.attributes.aTargetAccent.array.subarray(start,end)),progress:morph};
}
function getMovingSnapshot() {
  const motion = geometry.attributes.aTargetMotion.array;
  const index = Math.floor(motion.findIndex((v,k) => k % 4 === 3 && v > 0) / 4);
  if (index < 0) return null;
  const p = index * 3, m = index * 4, target = new Float32Array(3);
  poseTarget(geometry.attributes.aTarget.array.subarray(p,p+3), geometry.attributes.aTargetNormal.array.subarray(p,p+3), motion.subarray(m,m+4), uniforms.uModelTime.value, target);
  return {index, position:Array.from(target), hub:Array.from(motion.subarray(m,m+3)), time:uniforms.uModelTime.value};
}
window.__radar = {
  get active() { return active; }, get pointCounts() { return models.map(() => PARTICLE_COUNT); },
  get sourceCounts() { return models.map(model => model.sourceCount); }, get morphProgress() { return morph; },
  get modelTime() { return uniforms.uModelTime.value; }, get renderedFrames() { return renderedFrames; },
  get paused() { return paused; }, config, switchScene, get rendererInfo() { return renderer.info; },
  get view() {return {name:currentView,moving:!!viewTransition,position:camera.position.toArray(),target:controls.target.toArray()};},
  get scan(){return {progress:scanProgress,height:uniforms.uSlice.value,vertical:uniforms.uArchive.value,reveal:uniforms.uReveal.value,readings:active===1?waterTowers:active===2?greenhouseReadings:[],visiblePoints:models[active].position.filter((v,i)=>i%3===1&&v>=uniforms.uSlice.value).length};},
  get beam() {return {apertureDegrees:BEAM.aperture*180/Math.PI,outerWidth:BEAM.radius*2*Math.tan(BEAM.aperture/2),triangles:beamGeometry.attributes.position.count/3};},
  get appearance() { const accent=geometry.attributes.aTargetAccent.array;return {warmPoints:accent.filter(v=>v>0).length,bluePoints:accent.filter(v=>v<0).length,firstAccentIndex:accent.findIndex(v=>v!==0),labelOpacities:details.getState(active)}; },
  getTransitionSnapshot, getMovingSnapshot
};
