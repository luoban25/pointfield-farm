import * as THREE from 'three';

// Short asset names identify geometry, without implying live telemetry or alerts.
const anchors = [
  [['BENCH / 04', [3.6,-.85,2.6], [5.9,.4,3.3]], ['HAUL ROAD', [-3.8,-.8,1.2], [-5.6,.5,1.9]]],
  [['TANK / 03', [3,2.45,-2], [5.1,3.55,-1.8]], ['PIPE RACK', [2.1,1.2,4.3], [3.8,2.3,5.3]], ['FLARE', [0,6.75,-5.8], [-2.0,6.8,-5.5]]],
  [['CRANE / 03', [4.4,5.5,-3.8], [6.2,6.4,-3.4]], ['CONTAINER YARD', [-3.7,.8,1.3], [-5.7,2.1,2.3]]],
  [['TERRACE / 08', [2.6,2.1,1.5], [4.7,3.3,2.2]]],
  [['REFLECTOR', [2.4,4.0,0], [4.5,5.15,.5]], ['FEED ARRAY', [0,5.7,-1.8], [-2.2,6.1,-1.8]]],
  [['SOLAR ARRAY', [5.7,3.15,.9], [7.2,4.6,1.5]], ['ORBITAL MODULE', [0,3,2.8], [2.4,5.1,4.2]]],
  [['WT / 07', [0,4.65,4.64], [-2.3,5.8,4.5]], ['WT / 03', [4.35,3.2,-3.16], [6.0,4.4,-2.7]], ['OFFSHORE SUBSTATION', [-6.35,1.55,3.6], [-5.25,2.6,4.2]]]
];
function sprite(text, color, width) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = '44px Consolas, monospace';
  canvas.width = Math.ceil(ctx.measureText(text).width + 32); canvas.height = 96;
  ctx.font = '44px Consolas, monospace'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(8,12,14,0.72)'; ctx.fillRect(0,12,canvas.width,72);
  ctx.fillStyle = color; ctx.fillText(text,16,48);
  ctx.fillStyle = '#d58959';ctx.fillText(text.split(' ')[0],16,48);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  const material = new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.72,depthWrite:false,depthTest:false});
  width ??= canvas.width*.0042;
  const item = new THREE.Sprite(material); item.scale.set(width,width*96/canvas.width,1); item.center.set(0,.5); item.renderOrder=4;
  return item;
}
function stroke(points,color,opacity) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))), new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false}));
}
export function createDetails() {
  const root=new THREE.Group(), assets=anchors.map(entries=>{
    const group=new THREE.Group();
    for(const [slot,[text,p,q]] of entries.entries()){
      const elbow=[q[0]-.2,q[1],q[2]];
      const leader=stroke([p,elbow,q],0x718384,.32); leader.renderOrder=3;
      const pin=stroke([[p[0]-.075,p[1]-.075,p[2]],[p[0]+.075,p[1]-.075,p[2]],[p[0]+.075,p[1]+.075,p[2]],[p[0]-.075,p[1]+.075,p[2]],[p[0]-.075,p[1]-.075,p[2]]],0xcbae8c,.65);
      const label=sprite(text,'#bbc4bc');label.position.set(...q);
      for(const item of [leader,pin,label]){item.userData.baseOpacity=item.material.opacity;item.userData.slot=slot;group.add(item);}
    }
    group.visible=false;root.add(group);return group;
  });
  const compass=new THREE.Group();
  for(const [text,x,z] of [['N',0,-9.75],['E',9.75,0],['S',0,9.75],['W',-9.75,0]]) {
    const item=sprite(text,'#819291',.27);item.material.opacity=.5;item.position.set(x,.02,z);compass.add(item);
  }
  root.add(compass);
  const gridPoints=[];
  for(let x=-8;x<=8;x+=1)for(let z=-8;z<=8;z+=1)if(x*x+z*z<77){gridPoints.push(x,-.12,z);}
  const grid=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridPoints,3)),new THREE.PointsMaterial({color:0x617673,size:.022,transparent:true,opacity:.23,depthWrite:false}));
  root.add(grid);
  return {root,getState(active){return assets[active].children.filter(child=>child.isSprite).map(child=>child.material.opacity);},update(active,morph,width,pure,time){
    const visibility=THREE.MathUtils.smoothstep(morph,.76,1);
    for(let i=0;i<assets.length;i++){
      assets[i].visible=i===active&&visibility>.01&&width>600&&!pure;
      if(assets[i].visible)for(const child of assets[i].children){
        const phase=(time+morph*.9+child.userData.slot*1.2)%9.5;
        const fade=THREE.MathUtils.smoothstep(phase,.25,1.0)*(1-THREE.MathUtils.smoothstep(phase,4.6,5.5));
        child.material.opacity=child.userData.baseOpacity*visibility*fade;
      }
    }
    compass.visible=!pure;grid.visible=active!==5;
  }};
}
