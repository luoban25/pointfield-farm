import * as THREE from 'three';

export const BEAM = Object.freeze({radius:9.34,top:7.2,bottom:0,outerY:.015,aperture:14*Math.PI/180});

// The two origin points and the two outer corners enclose a real tetrahedral
// scan sector. There are no stacked transparent sheets inside this volume.
export function createBeamGeometry() {
  const {radius,top,bottom,outerY,aperture}=BEAM, halfWidth=radius*Math.tan(aperture/2);
  const vertices=[new THREE.Vector3(0,top,0),new THREE.Vector3(0,bottom,0),new THREE.Vector3(radius,outerY,-halfWidth),new THREE.Vector3(radius,outerY,halfWidth)];
  const faces=[[0,1,2],[0,3,1],[0,2,3],[1,3,2]],positions=[];
  const center=vertices.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).multiplyScalar(.25);
  // Point each face outward so drawing back faces emits one exit surface per ray.
  for(const face of faces){
    const [a,b,c]=face.map(i=>vertices[i]);
    const normal=b.clone().sub(a).cross(c.clone().sub(a));
    const faceCenter=a.clone().add(b).add(c).multiplyScalar(1/3);
    if(normal.dot(faceCenter.sub(center))<0)[face[1],face[2]]=[face[2],face[1]];
    for(const i of face)positions.push(...vertices[i].toArray());
  }
  const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.computeBoundingSphere();return geometry;
}
