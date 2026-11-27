import * as THREE from 'three';

const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);
const hill = (x,z,cx,cz,sx,sz) => Math.exp(-(((x-cx)/sx)**2+((z-cz)/sz)**2));
// Terraces form actual steps in the height field; all plants, roads and fences
// sample this same surface. The scan origin remains at terrain height zero.
export function farmHeight(x,z) {
  const relief = .13*Math.sin(x*.55)*Math.cos(z*.4)
    + 1.42*hill(x,z,4,-5.2,4.5,3.7) + .73*hill(x,z,-6,-4,3.8,3.2)
    - .16*hill(x,z,6.65,1,1.0,7);
  const center = 1.42*hill(0,0,4,-5.2,4.5,3.7)+.73*hill(0,0,-6,-4,3.8,3.2)-.16*hill(0,0,6.65,1,1,7);
  const terrace = smooth(.4,1,x)*(1-smooth(5.7,6.1,x))*(1-smooth(-.7,-.25,z));
  const steps = .18*Math.floor(Math.max(0,-z-.7)/1.4);
  return relief-center+terrace*steps;
}
export const farmRoadX = z => -1.25 + .48*Math.sin(z*.55);
const streamX = z => 6.5+.45*Math.sin(z*.62);

export function buildFarm(b) {
  const colorSince=(start,accent) => {for(let i=start;i<b.samples.length;i++)b.samples[i].accent=accent;};
  const point=(x,y,z,intensity=.7,accent=0,normal=[0,1,0],edge=0) => {
    b.point(x,y,z,intensity,normal,edge);b.samples.at(-1).accent=accent;
  };
  const normalAt=(x,z) => new THREE.Vector3(farmHeight(x-.025,z)-farmHeight(x+.025,z),.05,farmHeight(x,z-.025)-farmHeight(x,z+.025)).normalize().toArray();
  const surfacePath=(coordinates,lift=.04,intensity=.7,step=.03) => b.path(coordinates.map(([x,z])=>[x,farmHeight(x,z)+lift,z]),intensity,step);

  // Dense random surface and a thin exposed soil edge make the hills readable
  // from an oblique viewpoint without relying on a flat disc or mesh backdrop.
  for(let i=0;i<61000;i++) {
    const a=b.random()*Math.PI*2,r=Math.sqrt(b.random())*8.94,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const water=Math.abs(x-streamX(z))<.24;
    const road=Math.abs(x-farmRoadX(z))<.34;
    const y=farmHeight(x,z)+(b.random()-.5)*.018;
    point(x,y-(water?.04:0),z,water?.26:road?.42:.26+b.random()*.20,water?-1:0,normalAt(x,z));
  }
  for(let i=0;i<11000;i++) {
    const a=b.random()*Math.PI*2,x=Math.cos(a)*8.93,z=Math.sin(a)*8.93;
    const top=farmHeight(x,z),y=top-.05-b.random()*(top+.48);
    point(x,y,z,.18+b.random()*.16,0,[Math.cos(a),0,Math.sin(a)]);
  }
  // Terrace retaining walls, contour-following field boundaries, irrigation.
  for(const z of [-6.3,-4.9,-3.5,-2.1,-.7]) {
    const coords=Array.from({length:130},(_,i)=>[.8+i/129*5.0,z]);
    surfacePath(coords,.025,.58,.028);
    for(const [x,zz] of coords)for(let k=0;k<5;k++) {
      const y=farmHeight(x,zz)+.008-k*.043;
      point(x,y,zz,.35+b.random()*.12,0,[0,.1,1]);
    }
    surfacePath(coords.map(([x,zz])=>[x,zz+.07]),.025,.3,.045);
  }
  for(const side of [-1,1]) {
    const coords=Array.from({length:210},(_,i)=>{const z=-8.5+i/209*16.8;return [farmRoadX(z)+side*.33,z];});
    surfacePath(coords,.025,.5,.035);
    surfacePath(coords.map(([x,z])=>[x-side*.12,z]),.028,.28,.04);
  }
  // Narrow winding brook and two low stone banks.
  for(const side of [-1,1])surfacePath(Array.from({length:170},(_,i)=>{const z=-6.0+i/169*11.9;return [streamX(z)+side*.27,z];}),.025,.42,.036);
  for(let i=0;i<4200;i++) {
    const z=-6+b.random()*11.9,x=streamX(z)+(b.random()-.5)*.43;
    if(x*x+z*z<79)point(x,farmHeight(x,z)-.045,z,.32+b.random()*.14,-1);
  }

  // Individual cereal stems, drooping leaves and seed heads across four terraces.
  for(let band=0;band<4;band++)for(let row=0;row<19;row++)for(let col=0;col<17;col++) {
    const x=.95+row*.255+(b.random()-.5)*.04,z=-6.05+band*1.4+col*.066+(b.random()-.5)*.025;
    const y=farmHeight(x,z),h=.18+b.random()*.15,bend=(b.random()-.5)*.06;
    const start=b.samples.length;
    b.line([x,y+.025,z],[x+bend,y+h,z],.64,.035);
    for(const side of [-1,1])b.path([[x,y+h*.35,z],[x+side*.055,y+h*.7,z+.026],[x+side*.08,y+h*.52,z+.045]],.49,.03);
    for(let k=0;k<4;k++) {
      const yy=y+h+k*.015;
      b.line([x+bend-.025,yy,z],[x+bend+.025,yy+.011,z],.77,.015);
    }
    colorSince(start,-1.74);
  }
  // Front vegetable beds use low rosettes, raised earth and drip irrigation lines.
  for(let bed=0;bed<7;bed++) {
    const x=.75+bed*.49;
    for(const side of [-1,1])surfacePath(Array.from({length:50},(_,i)=>[x+side*.18,.4+i/49*1.7]),.04,.4,.04);
    surfacePath(Array.from({length:50},(_,i)=>[x,.4+i/49*1.7]),.055,.47,.035);
    for(let col=0;col<11;col++) {
      const z=.49+col*.15,y=farmHeight(x,z)+.06;
      for(let leaf=0;leaf<6;leaf++)for(let j=0;j<5;j++) {
        const a=leaf*Math.PI/3,t=j/4;
        point(x+Math.cos(a)*.09*t,y+.085*Math.sin(t*Math.PI*.8),z+Math.sin(a)*.09*t,.52,-2,[0,1,0]);
      }
    }
  }

  const building=(x,z,w,d,h,roofRise,accent) => {
    const y=farmHeight(x,z)+.04,start=b.samples.length;
    b.box(x,y-.03,z,w+.12,.09,d+.12,true,.55,.065);
    b.box(x,y+.06,z,w,h,d,true,.65,.07);colorSince(start,accent*.24);
    const eave=y+.06+h,roofStart=b.samples.length;
    for(const side of [-1,1]) {
      const n=new THREE.Vector3(side*roofRise,w/2,0).normalize().toArray();
      for(let j=0;j<=Math.ceil(w/.06);j++)for(let k=0;k<=Math.ceil(d/.065);k++) {
        const t=j/Math.ceil(w/.06),zz=z-d/2+k/Math.ceil(d/.065)*d;
        point(x+side*(w/2+.08)*t,eave+roofRise*(1-t),zz,.66,accent,n);
      }
      b.line([x-side*(w/2+.08),eave,z-d/2-.04],[x-side*(w/2+.08),eave,z+d/2+.04],.9,.025);
    }
    b.line([x,eave+roofRise,z-d/2-.04],[x,eave+roofRise,z+d/2+.04],.95,.025);
    for(const zz of [z-d/2,z+d/2]) {
      b.path([[x-w/2,eave,zz],[x,eave+roofRise,zz],[x+w/2,eave,zz]],.9,.025);
      // Filled gables and timber cladding, rather than an empty roof wireframe.
      for(let xx=-w/2;xx<=w/2;xx+=.065)for(let yy=0;yy<=roofRise*(1-Math.abs(xx)/(w/2));yy+=.065)point(x+xx,eave+yy,zz,.57,accent*.3,[0,0,zz<z?-1:1]);
    }
    colorSince(roofStart,accent);
    for(let xx=-w/2+.1;xx<w/2;xx+=.14)b.line([x+xx,y+.1,z+d/2+.008],[x+xx,eave-.06,z+d/2+.008],.45,.05);
    for(const side of [-1,1])for(let zz=-d/2+.1;zz<d/2;zz+=.15)b.line([x+side*w/2,y+.1,z+zz],[x+side*w/2,eave-.06,z+zz],.43,.05);
    return {y,eave};
  };
  // Large barn: split cross-braced doors, loft window, ridge vents and gutters.
  const bx=-3.5,bz=-2.6,barn=building(bx,bz,2.55,3.0,1.55,.68,.8),front=bz+1.511;
  for(const side of [-1,1]) {
    const x=bx+side*.36;
    b.box(x,barn.y+.11,front,.68,1.1,.025,true,.7,.045);
    b.line([x-.3,barn.y+.16,front+.02],[x+.3,barn.y+1.16,front+.02],.96,.024);
    b.line([x+.3,barn.y+.16,front+.02],[x-.3,barn.y+1.16,front+.02],.96,.024);
    b.box(x-side*.08,barn.y+.62,front+.035,.025,.09,.022,false,.95,.02);
  }
  b.ring(bx,barn.eave+.23,front,.16,.95,'xy');
  b.line([bx-.15,barn.eave+.23,front],[bx+.15,barn.eave+.23,front],.8,.02);
  for(const x of [bx-1.31,bx+1.31]) {
    b.tube([x,barn.eave,bz-1.5],[x,barn.eave,bz+1.5],.028,.035);
    b.tube([x,barn.eave,bz+1.38],[x,barn.y+.1,bz+1.38],.025,.035);
  }
  for(const z of [bz-.65,bz+.55])b.box(bx,barn.eave+.68,z,.22,.11,.35,true,.73,.035);
  // Corrugated silo, conical lid, ladder and safety hoops.
  const sx=-5.6,sz=-3.5,sy=farmHeight(sx,sz);
  b.cylinder(sx,sy,sz,.48,2.25,true,.05,.68);
  for(let y=.2;y<2.2;y+=.21)b.ring(sx,sy+y,sz,.487,.76);
  for(let i=0;i<1600;i++) {
    const a=b.random()*Math.PI*2,r=Math.sqrt(b.random())*.53;
    point(sx+Math.cos(a)*r,sy+2.25+.4*(1-r/.53),sz+Math.sin(a)*r,.72,0,[Math.cos(a)*.5,.8,Math.sin(a)*.5]);
  }
  for(const dx of [-.075,.075])b.line([sx+dx,sy+.1,sz+.54],[sx+dx,sy+2.3,sz+.54],.9,.025);
  for(let y=.18;y<2.3;y+=.14)b.line([sx-.075,sy+y,sz+.54],[sx+.075,sy+y,sz+.54],.85,.025);
  for(let y=.75;y<2.2;y+=.35)b.path(Array.from({length:20},(_,i)=>{const a=i/19*Math.PI;return [sx+Math.cos(a)*.13,sy+y,sz+.54+Math.sin(a)*.13];}),.66,.025);

  // Farmhouse with a porch, framed windows, chimney and four front steps.
  const hx=-5.05,hz=.45,house=building(hx,hz,1.7,1.55,1.03,.5,.4),hzFront=hz+.79;
  for(const dx of [-.5,.5]) {
    const wy=house.y+.46;
    b.box(hx+dx,wy,hzFront,.32,.36,.015,true,.88,.035);
    b.line([hx+dx,wy,hzFront+.01],[hx+dx,wy+.36,hzFront+.01],.97,.02);
    b.line([hx+dx-.16,wy+.18,hzFront+.01],[hx+dx+.16,wy+.18,hzFront+.01],.97,.02);
  }
  b.box(hx,house.y+.07,hzFront,.29,.76,.03,true,.72,.04);
  b.box(hx,house.y-.02,hz+1.03,1.7,.09,.5,true,.6,.06);
  b.box(hx,house.y+.83,hz+1.04,1.8,.045,.57,true,.65,.06);
  for(const dx of [-.78,.78])b.tube([hx+dx,house.y+.04,hz+1.25],[hx+dx,house.y+.84,hz+1.25],.028,.03);
  for(let i=0;i<4;i++)b.box(hx,house.y-.08-i*.025,hz+1.35+i*.11,.55,.045,.16,true,.52,.045);
  b.box(hx+.47,house.eave+.18,hz-.32,.19,.57,.24,true,.7,.035);
  b.box(hx+.47,house.eave+.75,hz-.32,.25,.05,.3,true,.8,.035);

  // Two translucent tunnel greenhouses, each ribbed with longitudinal purlins
  // and visible interior crop benches. Light shell avoids an opaque roof cap.
  for(const gx of [2.05,4.25]) {
    const gz=4.05,y=farmHeight(gx,gz)+.06,r=.65,length=2.6;
    for(let j=0;j<=12;j++) {
      const z=gz-length/2+j/12*length;
      b.path(Array.from({length:48},(_,k)=>{const a=k/47*Math.PI;return [gx+Math.cos(a)*r,y+.18+Math.sin(a)*.77,z];}),.82,.025);
      for(const side of [-1,1])b.line([gx+side*r,y,z],[gx+side*r,y+.18,z],.67,.025);
    }
    for(const a of [0,.4,Math.PI/2,Math.PI-.4,Math.PI])b.line([gx+Math.cos(a)*r,y+.18+Math.sin(a)*.77,gz-length/2],[gx+Math.cos(a)*r,y+.18+Math.sin(a)*.77,gz+length/2],.65,.03);
    for(let i=0;i<4200;i++) {
      const a=b.random()*Math.PI,z=gz+(b.random()-.5)*length;
      point(gx+Math.cos(a)*r,y+.18+Math.sin(a)*.77,z,.22,-.35,[Math.cos(a),Math.sin(a),0]);
    }
    for(const zz of [gz-length/2,gz+length/2]) {
      b.box(gx,y,zz,.42,.66,.018,true,.78,.035);
      b.line([gx,y+.37,zz],[gx+.2,y+.37,zz],.9,.022);
    }
    for(const dx of [-.34,.34])for(let j=0;j<21;j++) {
      const z=gz-length/2+.15+j*.11;
      b.box(gx+dx,y+.08,z,.25,.1,.07,false,.48,.04);
      for(let k=0;k<14;k++)point(gx+dx+(b.random()-.5)*.2,y+.2+b.random()*.13,z+(b.random()-.5)*.075,.57,-2);
    }
  }

  // Orchard trees have nonuniform ellipsoidal foliage, forked trunks and fruit.
  const tree=(x,z,r=.47) => {
    const y=farmHeight(x,z),h=.55+b.random()*.16;
    b.tube([x,y,z],[x+.025,y+h,z],.032,.04);
    for(let k=0;k<3;k++) {
      const a=k*Math.PI*2/3+.3;
      b.tube([x,y+h*.5,z],[x+Math.cos(a)*r*.55,y+h+.08,z+Math.sin(a)*r*.55],.018,.04);
    }
    for(let i=0;i<850;i++) {
      const a=b.random()*Math.PI*2,u=b.random()*2-1,rr=r*(.8+b.random()*.2)*(1+.1*Math.sin(a*5)),v=Math.sqrt(1-u*u);
      const px=x+Math.cos(a)*v*rr,pz=z+Math.sin(a)*v*rr,py=y+h+.3+u*r*.85;
      point(px,py,pz,.55+b.random()*.30,-1.83,[Math.cos(a)*v,u,Math.sin(a)*v]);
    }
    for(let j=0;j<14;j++) {
      const a=b.random()*Math.PI*2,u=b.random()*.9-.25,v=Math.sqrt(1-u*u);
      const px=x+Math.cos(a)*v*r,pz=z+Math.sin(a)*v*r,py=y+h+.3+u*r*.85;
      for(let k=0;k<5;k++)point(px+(b.random()-.5)*.025,py+(b.random()-.5)*.025,pz+(b.random()-.5)*.025,.8,.64);
    }
  };
  for(let row=0;row<4;row++)for(let col=0;col<5;col++) {
    const x=-6.65+col*.93,z=3.08+row*1.01;
    if(x*x+z*z<70)tree(x,z,.39+b.random()*.09);
  }
  for(const [x,z,r] of [[-6.8,-5.0,.62],[-5.6,-6.3,.64],[-3.9,-6.9,.6],[-2.2,-7.1,.48],[.2,-7.9,.48],[7.4,-1.7,.45],[7.8,.1,.43]])tree(x,z,r);
  // A fence follows the terrain, with two rails and diagonal gate bracing.
  for(const [a,c] of [[[-7.3,2.35],[-2.35,2.35]],[[-2.35,2.35],[-2.35,6.7]],[[-7.3,2.35],[-7.3,4.7]]]) {
    const count=Math.ceil(Math.hypot(a[0]-c[0],a[1]-c[1])/.44);
    for(let j=0;j<=count;j++) {
      const t=j/count,x=a[0]+(c[0]-a[0])*t,z=a[1]+(c[1]-a[1])*t,y=farmHeight(x,z);
      b.tube([x,y,z],[x,y+.36,z],.022,.035);
      if(j<count)for(const h of [.14,.3]) {
        const xx=a[0]+(c[0]-a[0])*(j+1)/count,zz=a[1]+(c[1]-a[1])*(j+1)/count;
        b.line([x,y+h,z],[xx,farmHeight(xx,zz)+h,zz],.64,.03);
      }
    }
  }

  // Tractor: thick treaded rear tires, small fronts, hood, glass cabin, exhaust
  // and a separate wheeled trailer. Wheel axes run across the vehicle (X).
  const tx=-2.65,tz=.65,ty=farmHeight(tx,tz)+.02,tractorStart=b.samples.length;
  b.box(tx,ty+.27,tz,.51,.2,1.12,true,.71,.045);
  b.box(tx,ty+.47,tz+.29,.44,.25,.55,true,.68,.04);
  b.box(tx,ty+.48,tz-.32,.47,.58,.48,true,.57,.04);
  b.box(tx,ty+1.06,tz-.32,.58,.06,.6,true,.85,.04);
  for(const dx of [-.235,.235])for(const dz of [-.24,.24])b.tube([tx+dx,ty+.52,tz-.32+dz],[tx+dx,ty+1.06,tz-.32+dz],.017,.025);
  b.tube([tx+.13,ty+.7,tz+.35],[tx+.13,ty+1.15,tz+.35],.026,.03);
  for(let j=0;j<7;j++)b.line([tx-.19+j*.063,ty+.51,tz+.575],[tx-.19+j*.063,ty+.7,tz+.575],.86,.02);
  colorSince(tractorStart,.68);
  const wheel=(x,y,z,r,width) => {
    for(let j=0;j<62;j++)for(let k=0;k<8;k++) {
      const a=j/62*Math.PI*2,xx=x+(k/7-.5)*width;
      point(xx,y+Math.cos(a)*r,z+Math.sin(a)*r,.49,0,[0,Math.cos(a),Math.sin(a)]);
    }
    for(const side of [-1,1]) {
      b.ring(x+side*width/2,y,z,r,.76,'yz');b.ring(x+side*width/2,y,z,r*.43,.77,'yz');
      for(let j=0;j<10;j++) {
        const a=j*Math.PI/5;
        b.line([x+side*width/2,y,z],[x+side*width/2,y+Math.cos(a)*r*.43,z+Math.sin(a)*r*.43],.66,.025);
      }
    }
    for(let j=0;j<23;j++) {
      const a=j/23*Math.PI*2;
      b.line([x-width/2,y+Math.cos(a)*r*1.03,z+Math.sin(a)*r*1.03],[x+width/2,y+Math.cos(a+.11)*r*1.03,z+Math.sin(a+.11)*r*1.03],.8,.02);
    }
  };
  for(const side of [-1,1]) {
    wheel(tx+side*.36,ty+.32,tz-.36,.32,.18);wheel(tx+side*.3,ty+.2,tz+.48,.2,.13);
  }
  b.tube([tx,ty+.28,tz-.85],[tx,ty+.22,tz-1.09],.026,.035);
  b.box(tx,ty+.25,tz-1.6,.73,.35,.95,true,.61,.055);
  for(let j=0;j<4;j++)for(const dx of [-.375,.375])b.line([tx+dx,ty+.26,tz-2.02+j*.25],[tx+dx,ty+.6,tz-2.02+j*.25],.81,.03);
  for(const side of [-1,1])wheel(tx+side*.43,ty+.19,tz-1.64,.19,.12);
  // Hay rolls and stacked crates beside the barn.
  for(const [x,z] of [[-2.2,-4.8],[-2.75,-4.9],[-2.4,-5.4]]) {
    const y=farmHeight(x,z),start=b.samples.length;
    b.cylinder(x,y,z,.22,.33,true,.035,.58);
    for(let yy=.04;yy<.33;yy+=.045)b.ring(x,y+yy,z,.226,.73);
    colorSince(start,.36);
  }
  for(let j=0;j<5;j++)b.box(-4.65+j*.25,farmHeight(-4.65+j*.25,-.9),-.9,.21,.2,.25,true,.59,.03);
  // Footbridge spans the creek with deck planks and low rails.
  const z=2.7,x=streamX(z),y=farmHeight(x,z)+.14;
  for(let j=0;j<16;j++)b.box(x-.52+j*.068,y,z,.056,.045,.6,true,.56,.045);
  for(const dz of [-.29,.29]) {
    b.line([x-.57,y+.32,z+dz],[x+.57,y+.32,z+dz],.72,.025);
    for(let dx=-.54;dx<=.54;dx+=.27)b.line([x+dx,y,z+dz],[x+dx,y+.32,z+dz],.65,.025);
  }
}
