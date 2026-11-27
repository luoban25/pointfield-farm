import * as THREE from 'three';
import {farmHeight} from './farm.js';
import {waterTowers,greenhouseReadings} from './operations.js';

const anchors=[['BARN',[-3.5,2.6,-1.1],[-5.8,3.5,-.8]],['TERRACED CROPS',[3.2,farmHeight(3.2,-4)+.3,-4],[5.7,3.3,-4.3]],['GREENHOUSE',[4.25,1.02,4.05],[5.65,2.3,4.6]]];
const anchorSets=[anchors,
  waterTowers.map((t,i)=>[`WT-${String(i+1).padStart(2,'0')} / ${t.level}%`,[t.x,.46+t.height*t.level/100,t.z],[t.x-.65,t.height+1.12,t.z+.25]]),
  greenhouseReadings.map(g=>[`${g.id} / ${g.temp} C`,[g.x,1.65,1.4],[g.x-1.0,3.05,3.4]])
];
function stroke(points,color,opacity) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false}));
}
export function createDetails() {
  const root=new THREE.Group(),assets=[];
  for(const [scene,entries] of anchorSets.entries())for(const [slot,[text,p,q]] of entries.entries()) {
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font='44px Consolas, monospace';canvas.width=Math.ceil(ctx.measureText(text).width+32);canvas.height=96;
    ctx.font='44px Consolas, monospace';ctx.textBaseline='middle';ctx.fillStyle='rgba(8,10,9,.78)';ctx.fillRect(0,12,canvas.width,72);
    ctx.fillStyle='#c5cebd';ctx.fillText(text,16,48);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.72,depthWrite:false,depthTest:false}));
    const width=canvas.width*.0042;label.scale.set(width,width*96/canvas.width,1);label.center.set(0,.5);label.position.set(...q);label.renderOrder=4;
    const line=stroke([p,[q[0]-.15,q[1],q[2]],q],0xabbba1,.32);line.renderOrder=3;
    const pin=stroke([[p[0]-.065,p[1],p[2]],[p[0]+.065,p[1],p[2]]],0xd2ae76,.64);
    for(const item of [label,line,pin]) {item.userData={slot,scene,revealHeight:p[1],baseOpacity:item.material.opacity};root.add(item);assets.push(item);}
  }
  return {root,getState(active){return assets.filter(item=>item.isSprite&&item.userData.scene===active).map(item=>item.material.opacity);},update(active,morph,width,pure,time,scanY){
    for(const item of assets){
      item.visible=item.userData.scene===active&&morph>.96&&width>600&&!pure&&(active===0||scanY<item.userData.revealHeight);
      if(item.visible){const phase=(time+item.userData.slot*1.5)%9.5;const opacity=active===0?THREE.MathUtils.smoothstep(phase,.25,1)*(1-THREE.MathUtils.smoothstep(phase,4.6,5.5)):THREE.MathUtils.smoothstep(item.userData.revealHeight-scanY,0,.6);item.material.opacity=item.userData.baseOpacity*opacity;}
    }
  }};
}
