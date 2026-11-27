export const waterTowers = [
  {x:-3.6,z:-3.7,height:4.5,level:82}, {x:0,z:-3.7,height:5.0,level:68}, {x:3.6,z:-3.7,height:4.1,level:91},
  {x:-3.6,z:0,height:3.9,level:54}, {x:0,z:0,height:4.8,level:76}, {x:3.6,z:0,height:4.5,level:63},
  {x:-3.6,z:3.7,height:4.2,level:87}, {x:0,z:3.7,height:4.7,level:42}, {x:3.6,z:3.7,height:3.7,level:71}
];
export const greenhouseReadings = [
  {id:'GH-01',x:-4.0,temp:24.8,humidity:68,soil:54,vent:35,status:'适宜'},
  {id:'GH-02',x:0,temp:27.6,humidity:72,soil:61,vent:60,status:'加强通风'},
  {id:'GH-03',x:4.0,temp:23.9,humidity:65,soil:49,vent:25,status:'适宜'}
];
const tag=(b,start,kind,accent) => {for(let i=start;i<b.samples.length;i++){b.samples[i].kind=kind;if(accent!==undefined)b.samples[i].accent=accent;}};

export function buildWaterTowers(b) {
  b.ground(28000,8.8,.16);
  for(const [id,tower] of waterTowers.entries()) {
    const {x,z,height:h,level}=tower,r=.94,base=.46,top=base+h;
    b.box(x,.01,z,2.13,.12,2.13,true,.65,.11);
    for(const dx of [-.63,.63])for(const dz of [-.63,.63])b.tube([x+dx,.13,z+dz],[x+dx,base,z+dz],.055,.035);
    // Fine, translucent tank shell makes the actual water height visible.
    const shellStart=b.samples.length;
    b.cylinder(x,base,z,r,h,false,.06,.52);tag(b,shellStart,2);
    for(let y=.35;y<h;y+=.68)b.ring(x,base+y,z,r+.01,.79);
    b.ring(x,top,z,r+.035,.94);b.ring(x,base,z,r+.035,.84);
    // A convex roof, inspection hatch and short safety rail.
    const roofStart=b.samples.length;
    for(let j=0;j<1100;j++) {
      const a=b.random()*Math.PI*2,rr=Math.sqrt(b.random())*r;
      b.point(x+Math.cos(a)*rr,top+.24*(1-(rr/r)**2),z+Math.sin(a)*rr,.53,[Math.cos(a)*.25,1,Math.sin(a)*.25]);
    }
    tag(b,roofStart,2);b.cylinder(x+.18,top+.23,z,.12,.065,true,.035,.82);
    for(const y of [top+.10,top+.28])b.ring(x, y,z,r*.86,.74);
    for(let j=0;j<16;j++) {
      const a=j/16*Math.PI*2;
      b.line([x+Math.cos(a)*r*.86,top,z+Math.sin(a)*r*.86],[x+Math.cos(a)*r*.86,top+.28,z+Math.sin(a)*r*.86],.75,.04);
    }
    // Water fills each cylinder to the supplied level, including an explicit
    // horizontal surface. No scaling of the external tower is involved.
    const waterStart=b.samples.length,fill=h*level/100,waterY=base+fill,inner=r-.065;
    for(let j=0;j<4900;j++) {
      const a=b.random()*Math.PI*2,rr=Math.sqrt(b.random())*inner;
      const surface=j<1800;
      const yy=surface?waterY:base+b.random()*fill;
      b.point(x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr,surface?.84:.42,[0,1,0]);
    }
    b.ring(x,waterY,z,inner,.99);
    for(const rr of [inner*.38,inner*.7])b.ring(x,waterY+.003,z,rr,.47);
    tag(b,waterStart,1,-.85);
    // Ladder, level ruler, inlet/outlet risers, valves and common pipe manifold.
    for(const dx of [-.10,.10])b.line([x+dx,.17,z+r+.16],[x+dx,top+.14,z+r+.16],.8,.026);
    for(let y=.26;y<top;y+=.18)b.line([x-.1,y,z+r+.16],[x+.1,y,z+r+.16],.78,.022);
    const rulerStart=b.samples.length;
    b.line([x+r+.13,base,z],[x+r+.13,top,z],.73,.028);
    for(let j=0;j<=10;j++)b.line([x+r+.10,base+h*j/10,z],[x+r+(j%5===0?.31:.22),base+h*j/10,z],.9,.02);
    tag(b,rulerStart,0,.45);
    b.tube([x-r-.17,.22,z-.25],[x-r-.17,top-.1,z-.25],.045,.045);
    b.tube([x-r-.17,.22,z-.25],[x,.22,z-1.47],.046,.045);
    b.ring(x-r-.17,.47,z-.25,.1,.95,'xy');
    b.box(x+r+.32,.3,z+.42,.18,.28,.15,true,.62,.03);
  }
  for(const z of [-5.17,-1.47,2.23])b.tube([-5.1,.2,z],[5.1,.2,z],.052,.045);
  b.tube([-5.1,.2,-5.17],[-5.1,.2,4.75],.068,.05);
  b.box(-6.1,0,-.2,.78,.7,1.08,true,.69,.05);
  for(let j=0;j<8;j++)b.line([-6.46,.14+j*.065,.35],[-5.73,.14+j*.065,.35],.71,.03);
  for(const z of [-6.1,6.1])b.line([-6.3,.01,z],[6.3,.01,z],.3,.04);
}

export function buildGreenhouseStatus(b) {
  b.ground(33000,8.8,.17);
  for(const reading of greenhouseReadings) {
    const {x,temp}=reading,z=0,r=1.42,length=8.1,base=.2,rise=2.0;
    b.box(x,.03,z,r*2+.16,.15,length+.15,true,.55,.09);
    // Structural hoops, ridge purlins, front door and roof ventilation panels.
    for(let j=0;j<=19;j++) {
      const zz=-length/2+j/19*length;
      b.path(Array.from({length:70},(_,k)=>{const a=k/69*Math.PI;return [x+Math.cos(a)*r,base+.55+Math.sin(a)*rise,zz];}),.87,.03);
      for(const side of [-1,1])b.line([x+side*r,base,zz],[x+side*r,base+.55,zz],.78,.026);
    }
    for(const a of [0,.45,1.1,Math.PI/2,Math.PI-1.1,Math.PI-.45,Math.PI])b.line([x+Math.cos(a)*r,base+.55+Math.sin(a)*rise,-length/2],[x+Math.cos(a)*r,base+.55+Math.sin(a)*rise,length/2],.65,.035);
    const shellStart=b.samples.length;
    for(let j=0;j<6800;j++) {
      const a=b.random()*Math.PI,zz=(b.random()-.5)*length;
      b.point(x+Math.cos(a)*r,base+.55+Math.sin(a)*rise,zz,.48,[Math.cos(a),Math.sin(a),0]);
    }
    // The warmer middle house uses an amber shell. Values are static examples.
    tag(b,shellStart,2,temp>27?.7:-.3);
    for(const zz of [-length/2,length/2]) {
      for(let j=0;j<2100;j++) {
        const xx=(b.random()-.5)*2*r,h=.55+Math.sqrt(Math.max(0,1-(xx/r)**2))*rise;
        b.point(x+xx,base+b.random()*h,zz,.32,[0,0,zz<0?-1:1]);
      }
      b.box(x,base,zz,.73,1.45,.025,true,.91,.065);
      b.line([x-.34,base+.7,zz+.03],[x+.34,base+.7,zz+.03],.79,.025);
      b.ring(x+.86,base+.8,zz,.25,.77,'xy');
      for(let j=0;j<8;j++){const a=j*Math.PI/4;b.line([x+.86,base+.8,zz],[x+.86+Math.cos(a)*.23,base+.8+Math.sin(a)*.23,zz],.65,.04);}
    }
    const ventStart=b.samples.length;
    for(const zz of [-2.75,-.75,1.25]) {
      const opening=temp>27?.38:.18;
      b.path([[x-.55,base+2.35,zz],[x-.55,base+2.35+opening,zz+.75],[x+.55,base+2.35+opening,zz+.75],[x+.55,base+2.35,zz]],.96,.026);
    }
    tag(b,ventStart,0,temp>27?.8:0);
    // Growing beds remain visible through the sparse glass skin.
    for(const dx of [-.9,-.3,.3,.9]) {
      b.box(x+dx,base+.01,0,.44,.14,length-.55,true,.58,.07);
      b.line([x+dx,base+.17,-3.7],[x+dx,base+.17,3.7],.6,.036);
      for(let j=0;j<40;j++) {
        const zz=-3.6+j*.18,start=b.samples.length;
        b.line([x+dx,base+.15,zz],[x+dx,base+.58,zz],.56,.04);
        for(let leaf=0;leaf<5;leaf++) {
          const a=leaf*Math.PI*.4;
          b.path([[x+dx,base+.35,zz],[x+dx+Math.cos(a)*.16,base+.51,zz+Math.sin(a)*.16],[x+dx+Math.cos(a)*.21,base+.41,zz+Math.sin(a)*.21]],.66,.034);
        }
        tag(b,start,0,-1.83);
      }
    }
    for(const zz of [-3.1,0,3.1]) {
      b.tube([x,base,zz],[x,base+1.35,zz],.018,.04);
      const start=b.samples.length;b.box(x,base+1.29,zz,.12,.15,.09,true,.88,.028);tag(b,start,0,.8);
    }
    b.box(x+1.62,.04,3.12,.31,.7,.5,true,.67,.05);
    b.tube([x+1.5,.15,-4.3],[x+1.5,.15,4.3],.039,.04);
  }
  for(let z=-5.1;z<=5.1;z+=.23)b.line([-6.8,.015,z],[6.8,.015,z],.25,.11);
  b.box(-6.4,.05,-5.1,.62,.8,.45,true,.72,.045);
}
