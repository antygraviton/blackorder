/* ============ WORLD ============ */
let ren,scene,cam,sun,run=false,over=false,locked=false,hadLock=false,fallback=false,raf=0,L,curLevel=0;
const keys={};
let P,enemies=[],obst=[],floors=[],obstMesh=[],nades=[],mines=[],kits=[],parts=[],smokes=[],wp={},slots=[],cur=0,view=null,flash,mflash,flashT=0,mflT=0;
let msgT=0,killed=0,total=0,lastShot=0,mouseDown=false,aim=false,reloadT=0,reloadMax=1.6,hitT=0,shake=0,kick=0,lastT=0,tAll=0,swayX=0,swayY=0,frame=0;
let AC=null;
let vehicles=[],projs=[],fires=[],clouds=[],flashA=0,allies=[],pheli=null,mounted=false,lastRocket=0,heliWeapon=0,curMode=null,wave=0,survPaid=false,surv=null,pDead=false,respT=0,tdm=null,vprojs=[],vnades=[];
const ray=new THREE.Raycaster();
const proxyMat=new THREE.MeshBasicMaterial();
function beep(f,d,t,v){t=t||'square';v=v||.15;if(!S.vol)return;try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v*S.vol/100;g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}}
function boom(){beep(70,.5,'sawtooth',.4);beep(40,.7,'square',.3);}
function addBlock(x,z,w,d,y,h,nomap){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),proxyMat);m.position.set(x,y+h/2,z);m.visible=false;scene.add(m);m.updateMatrixWorld(true);obstMesh.push(m);
  obst.push({a:x-w/2,b:x+w/2,c:z-d/2,d:z+d/2,nm:nomap});
}
function addCollider(x,z,w,d,kind){obst.push({a:x-w/2,b:x+w/2,c:z-d/2,d:z+d/2,f:kind||1});}
function inObst(x,z,m){return obst.some(b=>x>b.a-m&&x<b.b+m&&z>b.c-m&&z<b.d+m);}
function spot(rf,minStart,margin,half){half=half||70;
  for(let i=0;i<300;i++){const x=(rf()-.5)*2*half,z=(rf()-.5)*2*half;if(Math.hypot(x,z-70)<minStart)continue;if(inObst(x,z,margin))continue;return [x,z];}
  return [0,-40];
}
function mkSky(){
  const c=cvs(1024,512),x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,hx(L.skyTop));g.addColorStop(.46,hx(L.skyHor));g.addColorStop(.5,hx(L.fog));g.addColorStop(1,hx(L.fog));
  x.fillStyle=g;x.fillRect(0,0,1024,512);
  const d=new THREE.Vector3(...L.sunDir).normalize();
  const u=((Math.atan2(d.z,-d.x)/(Math.PI*2))+1)%1,v=Math.acos(d.y)/Math.PI;
  const sg=x.createRadialGradient(u*1024,v*512,0,u*1024,v*512,170);sg.addColorStop(0,'rgba(255,255,235,1)');sg.addColorStop(.06,'rgba(255,240,200,.9)');sg.addColorStop(.3,'rgba(255,200,140,.25)');sg.addColorStop(1,'rgba(255,200,140,0)');
  x.fillStyle=sg;x.fillRect(0,0,1024,512);
  for(let i=0;i<70;i++){const px=Math.random()*1024,py=70+Math.random()*130,r=30+Math.random()*70;
    const cg=x.createRadialGradient(px,py,0,px,py,r);const a=L.cloud*(.3+Math.random()*.5);cg.addColorStop(0,'rgba(255,255,255,'+a+')');cg.addColorStop(1,'rgba(255,255,255,0)');
    x.save();x.translate(px,py);x.scale(2.4,.5);x.translate(-px,-py);x.fillStyle=cg;x.fillRect(px-r,py-r,r*2,r*2);x.restore();}
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;
  const m=new THREE.Mesh(new THREE.SphereGeometry(1400,32,16),new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,depthWrite:false}));
  m.renderOrder=-1;scene.add(m);return m;
}
function mkTerrain(){
  const SZ=500,N=S.q>=3?260:S.q===2?200:140;
  const geo=new THREE.PlaneGeometry(SZ,SZ,N,N);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,n=pos.count,col=new Float32Array(n*3),uv=geo.attributes.uv;
  const pl=L.pal,cg=rgbL(pl.grass),cd=rgbL(pl.dirt),cr=rgbL(pl.road),k1=rgbL(pl.rock),k2=rgbL(pl.rock2);
  for(let i=0;i<n;i++){
    const x=pos.getX(i),z=pos.getZ(i),y=H(x,z);pos.setY(i,y);
    const sx=H(x+2,z)-H(x-2,z),sz=H(x,z+2)-H(x,z-2),slope=Math.hypot(sx,sz)/4;
    const nz=fbm(x*.06,z*.06,3),r=Math.max(Math.abs(x),Math.abs(z));
    let c=mixc(cg,cd,sstep(.45,.66,nz));
    if(r<88)c=mixc(c,cr,1-sstep(2.6,5.6,Math.abs(x)));
    const rock=Math.max(sstep(.45,.95,slope),sstep(16,60,y));
    c=mixc(c,mixc(k1,k2,nz),rock);
    const sh=.82+fbm(x*.35,z*.35,2)*.36;
    col[i*3]=c[0]*sh;col[i*3+1]=c[1]*sh;col[i*3+2]=c[2]*sh;
    uv.setXY(i,uv.getX(i)*100,uv.getY(i)*100);
  }
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:TX.ground,vertexColors:true,roughness:1,metalness:0}));
  m.receiveShadow=true;scene.add(m);
}
/* --- fences --- */
let FX;
function fenceSide(x1,z1,x2,z2,type){
  const len=Math.hypot(x2-x1,z2-z1),ux=(x2-x1)/len,uz=(z2-z1)/len,ry=-Math.atan2(uz,ux);
  const n=Math.round(len/3),span=len/n;
  addCollider((x1+x2)/2,(z1+z2)/2,Math.abs(ux)*len+.5,Math.abs(uz)*len+.5);
  for(let i=0;i<=n;i++){const px=x1+ux*span*i,pz=z1+uz*span*i,gy=H(px,pz);
    if(type==='wood')ia(FX.postW,px,gy+.95,pz,1,1,1,0);else ia(FX.postM,px,gy+1.1,pz,1,1,1,0);}
  for(let i=0;i<n;i++){
    const cx=x1+ux*span*(i+.5),cz=z1+uz*span*(i+.5),gy=H(cx,cz);
    if(type==='wood'){
      ia(FX.rail,cx,gy+.45,cz,1,1,1,ry);ia(FX.rail,cx,gy+1.15,cz,1,1,1,ry);
      for(let k=-6;k<=5;k++){if(Math.random()<.07)continue;const off=(k+.5)*.25,px=cx+ux*off,pz=cz+uz*off;
        ia(FX.picket,px,H(px,pz)+.72+(Math.random()-.5)*.08,pz,1,.9+Math.random()*.2,1,ry,undefined,(Math.random()-.5)*.08,(Math.random()-.5)*.1);}
    } else if(type==='chain'){
      ia(FX.chain,cx,gy+.95,cz,1,1,1,ry);ia(FX.railM,cx,gy+1.88,cz,1,1,1,ry);
      for(let s=0;s<3;s++)ia(FX.wire,cx,gy+2.0+s*.1,cz,1,1,1,ry);
    } else {
      for(let s=0;s<5;s++)ia(FX.wire,cx,gy+.35+s*.36,cz,1,1,1,ry);
    }
  }
}
function house(x,z,w,d){
  const hs=[H(x-w/2,z-d/2),H(x+w/2,z-d/2),H(x-w/2,z+d/2),H(x+w/2,z+d/2)],lo=Math.min(...hs),hi=Math.max(...hs);
  const hgt=3.1+R()*.6,fl=hi+.1;
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const add=(geo,mt,px,py,pz,cast)=>{const m=new THREE.Mesh(geo,mt);m.position.set(px,py,pz);m.castShadow=cast!==false;m.receiveShadow=true;g.add(m);return m;};
  add(tbox(w+.2,fl-lo+.6,d+.2,2.5),MT.concrete,0,lo-.3+(fl-lo+.6)/2,0);
  add(tbox(w,hgt,d,3.2),MT.plaster,0,fl+hgt/2,0);
  /* roof */
  const pitch=.5,hr=d/2+.45,rise=hr*Math.tan(pitch),sl=hr/Math.cos(pitch);
  for(const s of [-1,1]){const r=add(tbox(w+.9,.14,sl,2.2),MT.roof,0,fl+hgt+rise/2+.05,s*hr/2);r.rotation.x=-s*pitch*-1;}
  const tri=new THREE.Shape();tri.moveTo(-d/2,0);tri.lineTo(d/2,0);tri.lineTo(0,rise-.1);tri.closePath();
  const tg=new THREE.ExtrudeGeometry(tri,{depth:w,bevelEnabled:false});tg.rotateY(Math.PI/2);tg.translate(-w/2,0,0);
  const uv=tg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3.2,uv.getY(i)/3.2);
  add(tg,MT.plaster,0,fl+hgt,0);
  /* windows, doors */
  const fr=MT.white,gl=MT.dark;
  const nw=Math.max(2,Math.floor(w/3.4));
  for(const s of [-1,1])for(let i=0;i<nw;i++){const px=-w/2+(i+.5)*w/nw;
    if(s===1&&i===Math.floor(nw/2)){add(new THREE.BoxGeometry(1.1,2.2,.12),MT.woodDoor,px,fl+1.1,s*d/2+.02);continue;}
    add(new THREE.BoxGeometry(1.0,1.2,.1),fr,px,fl+1.8,s*d/2+.02,false);add(new THREE.BoxGeometry(.8,1.0,.12),gl,px,fl+1.8,s*d/2+.03,false);
    add(new THREE.BoxGeometry(1.15,.08,.2),fr,px,fl+1.15,s*d/2+.08,false);}
  const nd=Math.max(1,Math.floor(d/4));
  for(const s of [-1,1])for(let i=0;i<nd;i++){const pz=-d/2+(i+.5)*d/nd;
    add(new THREE.BoxGeometry(.1,1.2,1.0),fr,s*w/2+s*.02,fl+1.8,pz,false);add(new THREE.BoxGeometry(.12,1.0,.8),gl,s*w/2+s*.03,fl+1.8,pz,false);}
  add(tbox(.8,2.4,.8,2),MT.brick,w/4,fl+hgt+rise*.6+.4,-d/4);
  addBlock(x,z,w,d,lo-.3,fl-lo+hgt+.3+rise);
}
function ruin(x,z){
  const la=5+R()*5,lb=4+R()*5;
  const wall=(cx,cz,len,alongX)=>{const n=Math.max(3,Math.floor(len/1.6)),sg=len/n;
    for(let i=0;i<n;i++){const hh=1+R()*(R()<.35?3:1.8),px=alongX?cx-len/2+(i+.5)*sg:cx,pz=alongX?cz:cz-len/2+(i+.5)*sg,gy=H(px,pz);
      const w=alongX?sg:.5,dd=alongX?.5:sg;
      const m=new THREE.Mesh(tbox(w,hh+.6,dd,2.2),MT.brick);m.position.set(px,gy+hh/2-.3,pz);m.castShadow=true;m.receiveShadow=true;scene.add(m);
      addBlock(px,pz,w,dd,gy-.3,hh+.6,true);
      if(R()<.5)ia(FX.rock,px+(R()-.5)*2,gy+.2,pz+(R()-.5)*2,.5+R()*.5,.3+R()*.3,.5+R()*.5,R()*6,0x7a736b);}};
  wall(x,z,la,true);wall(x+la/2,z+lb/2,lb,false);
  for(let i=0;i<7;i++){const px=x+(R()-.2)*la,pz=z+(R()-.1)*lb;ia(FX.rock,px,H(px,pz)+.2,pz,.4+R()*.8,.25+R()*.4,.4+R()*.8,R()*6,[0x7d7068,0x6d625a,0x8a8680][i%3]);}
}
function crateStack(x,z){
  const gy=H(x,z);const m=new THREE.Mesh(tbox(1.2,1.2,1.2,1),MT.wood);m.position.set(x,gy+.6,z);m.rotation.y=R()*.4;m.castShadow=true;m.receiveShadow=true;scene.add(m);
  addBlock(x,z,1.3,1.3,gy,1.2,true);
  if(R()<.6){const m2=new THREE.Mesh(tbox(1,1,1,1),MT.wood);m2.position.set(x+.3,gy+1.7,z);m2.rotation.y=R();m2.castShadow=true;scene.add(m2);}
}
function sandbags(x,z,ang){
  const gy=H(x,z),horiz=Math.abs(Math.cos(ang))>.7;const w=horiz?3.4:.8,d=horiz?.8:3.4;
  const m=new THREE.Mesh(tbox(w,1.0,d,1.6),MT.sand);m.position.set(x,gy+.5,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
  addBlock(x,z,w,d,gy,1.0,true);
}
function barrel(x,z){const gy=H(x,z);const c=[0x7a2a1c,0x2a4a6a,0x4a5a2a][Math.floor(R()*3)];
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.9,12),stdM(null,{color:lin(c),roughness:.5,metalness:.6}));m.position.set(x,gy+.45,z);m.castShadow=true;scene.add(m);addBlock(x,z,.6,.6,gy,.9,true);}
function burnedCar(x,z){
  const gy=H(x,z),g=new THREE.Group();g.position.set(x,gy,z);g.rotation.y=R()<.5?0:Math.PI/2;scene.add(g);
  const add=(geo,mt,px,py,pz)=>{const m=new THREE.Mesh(geo,mt);m.position.set(px,py,pz);m.castShadow=true;g.add(m);return m;};
  add(tbox(4.2,.8,1.8,2),MT.rust,0,.65,0);add(tbox(2.2,.7,1.6,2),MT.rust,-.2,1.3,0);
  for(const sx of [-1.4,1.4])for(const sz of [-.9,.9]){const w=add(new THREE.CylinderGeometry(.34,.34,.25,12),MT.dark,sx,.34,sz);w.rotation.x=Math.PI/2;}
  addBlock(x,z,g.rotation.y?1.9:4.3,g.rotation.y?4.3:1.9,gy,1.6);smokeCol(x,z,5,30);
}
function smokeCol(x,z,n,hgt){
  for(let i=0;i<n;i++){const mt=new THREE.SpriteMaterial({map:TX.smoke,transparent:true,opacity:0,depthWrite:false,color:L.smoke});
    const s=new THREE.Sprite(mt);s.userData={x,z,t:i/n,hgt};scene.add(s);smokes.push(s);}
}
function powerLine(){
  const poles=[];for(let z=-72;z<=72;z+=24)poles.push([-7.5,z]);
  const pm=stdM(TX.wood);
  for(const [x,z] of poles){const gy=H(x,z);const p=new THREE.Mesh(new THREE.CylinderGeometry(.14,.2,9,8),pm);p.position.set(x,gy+4.5,z);p.castShadow=true;scene.add(p);
    const ca=new THREE.Mesh(new THREE.BoxGeometry(2.2,.12,.12),pm);ca.position.set(x,gy+8.5,z);scene.add(ca);addCollider(x,z,.5,.5,2);}
  const lm=new THREE.LineBasicMaterial({color:0x151515});
  for(let i=0;i<poles.length-1;i++){const a=poles[i],b=poles[i+1];
    for(const off of [-1,0,1]){const pts=[];for(let k=0;k<=10;k++){const t=k/10,px=a[0]+off*.9,pz=a[1]+(b[1]-a[1])*t;pts.push(new THREE.Vector3(px,H(a[0],pz)+8.4-Math.sin(t*Math.PI)*.9,pz));}
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lm));}}
}
let MT={};
function initMats(){
  MT.plaster=stdM(TX.plaster,{roughness:.95});MT.brick=stdM(TX.brick,{roughness:.9});MT.roof=stdM(TX.roof,{roughness:.8});
  MT.wood=stdM(TX.wood,{roughness:.85});MT.concrete=stdM(TX.concrete,{roughness:.95});MT.sand=stdM(TX.sandbag,{roughness:1});MT.rust=stdM(TX.rust,{roughness:.8,metalness:.3});
  MT.white=stdM(null,{color:lin(0xe6e2d6),roughness:.7});MT.dark=stdM(null,{color:lin(0x14181b),roughness:.3,metalness:.4});MT.woodDoor=stdM(TX.wood,{roughness:.8,color:0x886644});
  MT.rock=stdM(TX.rock,{roughness:1});MT.leaf=stdM(TX.leaf,{roughness:.9});MT.bark=stdM(TX.bark,{roughness:1});
}
function build(){
  SEED=L.seed;R=rng(L.seed*101);
  scene=new THREE.Scene();scene.fog=new THREE.Fog(L.fog,L.fogN,L.fogF);scene.background=new THREE.Color(L.fog);
  ren.toneMappingExposure=L.exp;
  scene.add(new THREE.HemisphereLight(0xcfe2ff,0x4a4535,L.hemiI));
  sun=new THREE.DirectionalLight(L.sun,L.sunI);sun.castShadow=S.q>=2;
  const sz=S.q>=3?2048:1024;sun.shadow.mapSize.set(sz,sz);const sc=sun.shadow.camera;sc.left=-55;sc.right=55;sc.top=55;sc.bottom=-55;sc.near=1;sc.far=260;sun.shadow.bias=-.0004;sun.shadow.normalBias=.06;
  scene.add(sun,sun.target);
  mkSky();mkTerrain();
  obst=[];floors=[];cabinInfo=null;cabinFx=null;obstMesh=[];mines=[];kits=[];enemies=[];nades=[];parts=[];smokes=[];vehicles=[];projs=[];fires=[];clouds=[];flashA=0;allies=[];pheli=null;mounted=false;
  /* instanced sets */
  FX={
    postW:Inst(new THREE.CylinderGeometry(.07,.08,1.9,6),MT.wood,400,true),
    postM:Inst(new THREE.CylinderGeometry(.035,.035,2.2,6),stdM(null,{color:lin(0x6b6a66),metalness:.7,roughness:.5}),400,true),
    rail:Inst(new THREE.BoxGeometry(3.05,.08,.05),MT.wood,300,false),
    railM:Inst(new THREE.BoxGeometry(3.05,.05,.05),stdM(null,{color:lin(0x77777a),metalness:.8,roughness:.4}),200,false),
    picket:Inst(new THREE.BoxGeometry(.1,1.4,.025),MT.wood,2400,false),
    wire:Inst(new THREE.BoxGeometry(3.05,.012,.012),stdM(null,{color:lin(0x4a4a4a),metalness:.8,roughness:.5}),1200,false),
    chain:Inst(new THREE.PlaneGeometry(3.05,1.8),new THREE.MeshStandardMaterial({map:TX.chain,transparent:true,alphaTest:.4,side:THREE.DoubleSide,roughness:.6,metalness:.5}),200,false),
    rock:Inst(new THREE.DodecahedronGeometry(1,0),MT.rock,900,true),
    trunk:Inst(new THREE.CylinderGeometry(.14,.26,1,7).translate(0,.5,0),MT.bark,200,true),
    foliage:Inst(new THREE.IcosahedronGeometry(1,1),MT.leaf,700,true),
    pine:Inst(new THREE.ConeGeometry(1,1,7).translate(0,.5,0),stdM(TX.leaf,{color:lin(0x4d6a48)}),4500,false),
    bush:Inst(new THREE.IcosahedronGeometry(1,1),MT.leaf,260,false),
    flower:Inst(new THREE.IcosahedronGeometry(1,0),stdM(null,{color:0xffffff,roughness:.6}),600,false),
    grass:Inst(new THREE.ConeGeometry(.07,.5,4).translate(0,.25,0),stdM(null,{color:0xffffff,roughness:1}),1,false)
  };
  /* perimeter: fences */
  const B_=78;
  fenceSide(-B_,B_,B_,B_,'wood');fenceSide(-B_,-B_,B_,-B_,'wood');fenceSide(-B_,-B_,-B_,B_,'chain');fenceSide(B_,-B_,B_,B_,'wire');
  if(L.runway)runway();
  /* houses */
  const fp=[];let placed=0;
  if(L.cabin){const c=cabin();if(c)fp.push(c);}
  for(let t=0;t<600&&placed<L.houses;t++){
    const w=8+Math.floor(R()*5),d=7+Math.floor(R()*4),x=(R()-.5)*136,z=(R()-.5)*120;
    if(Math.abs(x)<w/2+7)continue;if(Math.hypot(x,z-70)<24)continue;if(fp.some(f=>Math.abs(f[0]-x)<(f[2]+w)/2+6&&Math.abs(f[1]-z)<(f[3]+d)/2+6))continue;
    fp.push([x,z,w,d]);if(L.desert)hangar(x,z,w+4,d+2);else house(x,z,w,d);placed++;
  }
  for(let i=0;i<L.ruins;i++){const [x,z]=spot(R,24,10,64);ruin(x,z);}
  /* cover and props */
  for(let i=0;i<14;i++){const [x,z]=spot(R,14,2.5,68);crateStack(x,z);}
  for(let i=0;i<8;i++){const [x,z]=spot(R,14,3,68);sandbags(x,z,R()<.5?0:1.57);}
  for(let i=0;i<8;i++){const [x,z]=spot(R,12,2,68);barrel(x,z);}
  for(let i=0;i<3+curLevel;i++){const [x,z]=spot(R,22,4,64);burnedCar(x,z);}
  for(let i=0;i<5;i++){const [x,z]=spot(R,0,6,60);const r=2+R()*2.5;const cr=new THREE.Mesh(new THREE.CircleGeometry(r,16),stdM(TX.rust,{roughness:1,color:0x666666}));cr.rotation.x=-Math.PI/2;cr.position.set(x,H(x,z)+.04,z);cr.receiveShadow=true;scene.add(cr);}
  powerLine();
  smokeCol(-95,-60,8,70);smokeCol(100,30,8,80);smokeCol(20,-110,8,90);
  if(curLevel>=1)smokeCol(-60,40,6,50);
  if(curLevel===2){smokeCol(45,-45,8,60);smokeCol(-30,-20,8,55);}
  /* rocks inside the map */
  for(let i=0;i<(L.desert?110:46);i++){const [x,z]=spot(R,12,3,74),s=.5+R()*1.6;ia(FX.rock,x,H(x,z)+s*.2,z,s*(1+R()),s*(.5+R()*.5),s*(1+R()),R()*6,[0x8a857c,0x777269,0x9a948a][i%3]);if(s>1.25)addBlock(x,z,s*1.6,s*1.6,H(x,z),s*.9,true);}
  /* big rocks and cliffs behind the fences */
  for(let i=0;i<260;i++){const a=R()*6.283,r=88+R()*95,x=Math.cos(a)*r,z=Math.sin(a)*r,s=3+R()*9;ia(FX.rock,x,H(x,z)+s*.25,z,s*(1+R()*.6),s*(.6+R()*.9),s*(1+R()*.6),R()*6,[0x8a857c,0x777269,0xa59e92][i%3]);}
  /* trees on the map */
  const ntr=L.desert?8:(S.q>=2?70:40);
  for(let i=0;i<ntr;i++){const x=(R()-.5)*150,z=(R()-.5)*150;if(Math.abs(x)<8||inObst(x,z,2))continue;
    const s=.9+R()*.7,gy=H(x,z);ia(FX.trunk,x,gy,z,s,5*s,s,R()*6);
    const gc=[0x6f9a4a,0x5d8a3e,0x7aa352,0x4f7a38][i%4];
    ia(FX.foliage,x,gy+5.4*s,z,2.3*s,1.9*s,2.3*s,R()*6,gc);ia(FX.foliage,x+1.1*s,gy+4.5*s,z+.4*s,1.6*s,1.4*s,1.6*s,R()*6,gc);ia(FX.foliage,x-.9*s,gy+4.8*s,z-.6*s,1.7*s,1.5*s,1.7*s,R()*6,gc);
    addCollider(x,z,.7,.7,2);}
  /* pines on the hills */
  for(let i=0;i<(L.desert?60:(S.q>=3?1500:S.q===2?1000:500));i++){const a=R()*6.283,r=84+R()*110,x=Math.cos(a)*r,z=Math.sin(a)*r,gy=H(x,z);if(gy>52)continue;
    const s=4+R()*5,c=[0x3f5f3a,0x4a6a40,0x36553a][i%3];ia(FX.pine,x,gy-.3,z,s*.34,s,s*.34,R()*6,c);ia(FX.pine,x,gy+s*.5,z,s*.26,s*.8,s*.26,R()*6,c);ia(FX.pine,x,gy+s*.95,z,s*.18,s*.6,s*.18,R()*6,c);}
  /* flowering bushes */
  for(let i=0;i<(L.desert?25:150);i++){const x=(R()-.5)*150,z=(R()-.5)*150;if(Math.abs(x)<5||inObst(x,z,1.5))continue;
    const s=.6+R()*.9,gy=H(x,z),gc=[0x5f8e3c,0x70a04a,0x4d7a34][i%3];ia(FX.bush,x,gy+.4*s,z,1.3*s,.8*s,1.3*s,R()*6,gc);
    if(R()<.55){const fc=[0xf2a6c8,0xf6f0e6,0xe8d36a,0xd878b0][i%4];for(let k=0;k<5;k++){const aa=R()*6.28,rr=R()*1.0*s;if(FX.flower.count<590)ia(FX.flower,x+Math.cos(aa)*rr,gy+.55*s+R()*.3*s,z+Math.sin(aa)*rr,.07,.07,.07,0,fc);}}}
  /* grass */
  const ng=0;
  for(let i=0;i<ng;i++){const x=(R()-.5)*164,z=(R()-.5)*164;if(Math.abs(x)<4.5||inObst(x,z,.3))continue;
    const sc2=.7+R()*1.1;ia(FX.grass,x,H(x,z),z,sc2,sc2*(.7+R()*.8),sc2,R()*6,[0x6a8f3e,0x7da04a,0x8a9a50,0x5a7e36][i%4]);}
  Object.values(FX).forEach(ifin);
}

