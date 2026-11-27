export const vertexShader = `
uniform float uAngle, uSize, uTrail, uMorph, uArchive, uSlice, uGlowPass, uDepthPass, uModelTime, uReveal;
uniform vec3 uBaseColor, uScanColor;
attribute vec3 aTarget, aNormal, aTargetNormal;
attribute vec4 aTargetMotion;
attribute float aIntensity, aTargetIntensity, aEdge, aTargetEdge, aSeed;
attribute float aAccent,aTargetAccent;
attribute float aKind,aTargetKind;
varying vec3 vColor;
varying float vAlpha;
varying float vShell;
const float TAU=6.28318530718;
void main(){
  float t=clamp((uMorph-aSeed*0.12)/0.88,0.0,1.0);
  float ease=t*t*(3.0-2.0*t);
  float envelope=sin(t*3.14159265);
  vec3 target=aTarget, targetNormal=aTargetNormal;
  if(aTargetMotion.w>0.0){
    float rotation=uModelTime*aTargetMotion.w,c=cos(rotation),s=sin(rotation);
    vec2 local=target.xy-aTargetMotion.xy;
    target.xy=aTargetMotion.xy+vec2(c*local.x-s*local.y,s*local.x+c*local.y);
    targetNormal.xy=vec2(c*targetNormal.x-s*targetNormal.y,s*targetNormal.x+c*targetNormal.y);
  }else if(aTargetMotion.w<0.0){
    float amplitude=-aTargetMotion.w,x=target.x*0.9+uModelTime*0.65,z=target.z*0.8-uModelTime*0.4;
    target.y+=amplitude*sin(x)*cos(z);
    targetNormal=normalize(vec3(-amplitude*0.9*cos(x)*cos(z),1.0,amplitude*0.8*sin(x)*sin(z)));
  }
  vec3 p=mix(position,target,ease);
  float swirl=envelope*(0.18+aSeed*0.32);
  p.xz=mat2(cos(swirl),sin(swirl),-sin(swirl),cos(swirl))*p.xz;
  p+=vec3(sin(aSeed*71.0)*0.6,1.0+aSeed*1.6,cos(aSeed*53.0)*0.6)*envelope;
  vec3 n=normalize(mix(aNormal,targetNormal,ease)+vec3(0.0001));
  float intensity=mix(aIntensity,aTargetIntensity,ease);
  float structural=mix(aEdge,aTargetEdge,ease);
  float accent=mix(aAccent,aTargetAccent,ease);
  float kind=mix(aKind,aTargetKind,ease);
  float water=1.0-smoothstep(0.08,0.35,abs(kind-1.0));
  float shell=smoothstep(1.65,1.95,kind);
  vShell=shell;
  float a=atan(p.z,p.x);
  float age=mod(uAngle-a+TAU,TAU);
  float angularDistance=min(age,TAU-age);
  float head=exp(-pow(angularDistance/0.0408,2.0));
  float tail=exp(-age/max(uTrail*0.92,0.01));
  float halo=exp(-pow(angularDistance/0.12,2.0));
  float echo=exp(-pow((age-0.14)/0.012,2.0))*0.16+exp(-pow((age-0.29)/0.016,2.0))*0.07;
  float d=uSlice-p.y;
  float verticalHead=exp(-pow(d/0.119,2.0));
  float verticalTail=exp(-max(-d,0.0)*3.0/max(uTrail,0.1))*step(d,0.0);
  head=mix(head,verticalHead,uArchive);
  tail=mix(tail,verticalTail,uArchive);
  halo=mix(halo,exp(-pow(d/0.34,2.0)),uArchive);
  float scanVisibility=1.0-envelope*0.85;
  head*=scanVisibility;tail*=scanVisibility;halo*=scanVisibility;
  echo*=scanVisibility*(1.0-uArchive);
  vec4 mv=modelViewMatrix*vec4(p,1.0);
  vec3 viewNormal=normalize(normalMatrix*n);
  float facing=max(0.0,dot(viewNormal,normalize(-mv.xyz)));
  float lighting=0.42+0.58*max(0.0,dot(n,normalize(vec3(-0.45,0.8,0.5))));
  float depthFade=clamp(1.18-(-mv.z)*0.012,0.48,1.0);
  float surface=0.7+0.3*smoothstep(-0.15,1.6,p.y);
  vec3 surfaceColor=mix(uBaseColor,vec3(1.0,0.28,0.095),clamp(accent,0.0,1.0)*0.94);
  surfaceColor=mix(surfaceColor,vec3(0.22,0.47,0.63),clamp(-accent,0.0,1.0)*0.88);
  surfaceColor=mix(surfaceColor,vec3(0.58,0.73,0.36),clamp(-accent-1.0,0.0,1.0));
  surfaceColor=mix(surfaceColor,vec3(0.22,0.76,0.92),water);
  float neutral=1.0-smoothstep(0.0,0.5,abs(accent));
  vec3 shade=mix(vec3(0.25,0.31,0.32),vec3(0.37,0.38,0.40),neutral);
  vec3 base=mix(shade,surfaceColor,lighting)*(surface+structural*0.25)*depthFade*(1.0+neutral*0.08);
  vColor=mix(base,uScanColor,clamp(tail*0.76+halo*0.16+echo,0.0,1.0));
  vColor=mix(vColor,mix(uScanColor,vec3(1.0),0.82),head*0.94);
  vColor=mix(vColor,mix(uScanColor,vec3(0.8,0.9,1.0),0.6),envelope*0.45);
  float visibility=0.45+0.55*max(facing,structural);
  vAlpha=(0.18+intensity*0.86+head*0.3+echo*0.25)*visibility*(1.0-envelope*0.28);
  float revealed=smoothstep(uSlice-0.10,uSlice+0.10,p.y);
  float revealMask=mix(1.0,revealed,uReveal)*(1.0-shell*0.70);
  vAlpha*=revealMask;
  vColor=mix(vColor,surfaceColor,water*0.86);
  float size=uSize*(0.82+intensity*0.24+structural*0.1+head*0.28)*(30.0/-mv.z);
  if(uGlowPass>0.5){size*=3.2;vAlpha=(head*0.17+halo*0.028+echo*0.012)*visibility*revealMask;vColor=mix(uScanColor,surfaceColor,water);}
  if(uDepthPass>0.5){size*=0.92;}
  gl_PointSize=clamp(size,0.65,uGlowPass>0.5?12.0:3.2);
  gl_Position=projectionMatrix*mv;
}`;
export const fragmentShader = `
precision highp float;
uniform float uGlowPass,uDepthPass;
varying vec3 vColor;
varying float vAlpha;
varying float vShell;
void main(){
  float r=length(gl_PointCoord-0.5);
  if(r>0.5||vAlpha<0.002)discard;
  if(uDepthPass>0.5){if(r>0.38||vAlpha<0.18||vShell>0.5)discard;gl_FragColor=vec4(0.0);return;}
  float mask=uGlowPass>0.5?exp(-r*r*20.0)*(1.0-smoothstep(0.35,0.5,r)):1.0-smoothstep(0.24,0.5,r);
  gl_FragColor=vec4(vColor,vAlpha*mask);
}`;

// Evaluate moving targets only for interrupted transitions, never per frame.
// The formulas mirror the vertex shader so rotating blades retain their pose.
export function poseTarget(position, normal, motion, time, outPosition, outNormal) {
  for (let i = 0; i < position.length / 3; i++) {
    const p = i * 3, m = i * 4, rate = motion[m + 3];
    let x = position[p], y = position[p + 1], z = position[p + 2];
    let nx = normal[p], ny = normal[p + 1], nz = normal[p + 2];
    if (rate > 0) {
      const c = Math.cos(time * rate), s = Math.sin(time * rate), dx = x - motion[m], dy = y - motion[m + 1];
      x = motion[m] + c * dx - s * dy; y = motion[m + 1] + s * dx + c * dy;
      const oldNX = nx; nx = c * nx - s * ny; ny = s * oldNX + c * ny;
    } else if (rate < 0) {
      const amplitude = -rate, wx = x * .9 + time * .65, wz = z * .8 - time * .4;
      y += amplitude * Math.sin(wx) * Math.cos(wz);
      nx = -amplitude * .9 * Math.cos(wx) * Math.cos(wz); ny = 1; nz = amplitude * .8 * Math.sin(wx) * Math.sin(wz);
      const length = Math.hypot(nx, ny, nz); nx /= length; ny /= length; nz /= length;
    }
    outPosition[p] = x; outPosition[p + 1] = y; outPosition[p + 2] = z;
    if (outNormal) { outNormal[p] = nx; outNormal[p + 1] = ny; outNormal[p + 2] = nz; }
  }
}

// GPU and interrupted-transition snapshots use this exact same path.
export function morphPosition(from, to, seed, progress, out, offset) {
  const t=Math.max(0,Math.min(1,(progress-seed*.12)/.88)), ease=t*t*(3-2*t), envelope=Math.sin(t*Math.PI), swirl=envelope*(.18+seed*.32), c=Math.cos(swirl), s=Math.sin(swirl);
  const x=from[offset]+(to[offset]-from[offset])*ease, y=from[offset+1]+(to[offset+1]-from[offset+1])*ease, z=from[offset+2]+(to[offset+2]-from[offset+2])*ease;
  out[offset]=c*x-s*z+Math.sin(seed*71)*.6*envelope;
  out[offset+1]=y+(1+seed*1.6)*envelope;
  out[offset+2]=s*x+c*z+Math.cos(seed*53)*.6*envelope;
  return ease;
}

export const beamVertexShader = `
varying vec3 vBeamPosition;
void main(){vBeamPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
export const beamFragmentShader = `
precision highp float;
uniform vec3 uScanColor,uCameraLocal;
uniform float uOpacity,uRadius,uTop,uBottom,uOuterY,uHalfSlope;
varying vec3 vBeamPosition;
bool clipPlane(vec3 normal,float offset,vec3 origin,vec3 direction,inout vec2 interval){
  float denominator=dot(normal,direction),distance=dot(normal,origin)+offset;
  if(abs(denominator)<0.00001)return distance<=0.0;
  float t=-distance/denominator;
  if(denominator<0.0)interval.x=max(interval.x,t);else interval.y=min(interval.y,t);
  return interval.y>interval.x;
}
void main(){
  vec3 origin=uCameraLocal,direction=normalize(vBeamPosition-origin);
  vec2 interval=vec2(0.0,150.0);
  if(!clipPlane(vec3(-uHalfSlope,0.0,1.0),0.0,origin,direction,interval))discard;
  if(!clipPlane(vec3(-uHalfSlope,0.0,-1.0),0.0,origin,direction,interval))discard;
  if(!clipPlane(vec3((uTop-uOuterY)/uRadius,1.0,0.0),-uTop,origin,direction,interval))discard;
  if(!clipPlane(vec3((uOuterY-uBottom)/uRadius,-1.0,0.0),uBottom,origin,direction,interval))discard;
  float length=interval.y-interval.x,density=0.0;
  // Integrate a continuous, feathered density through the enclosed scan volume.
  // Smooth functions only: no noise, stripe modulation or internal light sheets.
  for(int i=0;i<24;i++){
    float t=interval.x+length*(float(i)+0.5)/24.0;
    vec3 p=origin+direction*t;
    float radial=clamp(p.x/uRadius,0.0,1.0),width=max(uHalfSlope*p.x,0.0001);
    float side=clamp(1.0-abs(p.z)/width,0.0,1.0);
    float upper=mix(uTop,uOuterY,radial),lower=mix(uBottom,uOuterY,radial);
    float height=clamp((p.y-lower)/max(upper-lower,0.0001),0.0,1.0);
    float feather=smoothstep(0.0,0.22,side)*smoothstep(0.0,0.06,1.0-radial);
    feather*=smoothstep(0.0,0.08,height)*smoothstep(0.0,0.08,1.0-height);
    density+=feather*mix(1.0,0.35,height)*mix(0.72,1.0,side);
  }
  float opticalDepth=length*density/24.0;
  float alpha=uOpacity*1.6*(1.0-exp(-opticalDepth*0.9));
  if(alpha<0.0002)discard;
  vec3 pale=mix(uScanColor,vec3(1.0,0.88,0.30),0.78);
  gl_FragColor=vec4(pale,alpha);
}
`;
