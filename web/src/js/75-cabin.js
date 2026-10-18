/* ============ CABIN ============ */
/* A landmark building modelled on a real mountain cabin: a long log-clad upper volume with a flat roof stands on a
   smaller plastered base, the rest of the ground floor is an open garage under two wooden posts. A staircase on the
   south side leads to the door; upstairs is one big room with a brick chimney and a large fireplace in the middle.
   World generation is deterministic (seeded), so every machine builds the same cabin.
   Walkable raised surfaces live in `floors` (absolute y of the top); obstacles may carry a height range (y0..y1) so that
   walls only block entities whose feet are inside it (see collide() and groundAt()). */
let cabinInfo=null,cabinFx=null;
function groundAt(x,z,feet){
  let g=H(x,z);
  for(const f of floors)if(x>f.a&&x<f.b&&z>f.c&&z<f.d&&f.top<=feet+.55&&f.top>g)g=f.top;
  return g;
}
function cabinMats(){
  if(MT.logs)return;
  TX.logs=mkTex(256,256,(x,w,h)=>{
    for(let i=0;i<4;i++){const y=i*64,g=x.createLinearGradient(0,y,0,y+64);g.addColorStop(0,'#2e1d10');g.addColorStop(.35,'#6f4c2c');g.addColorStop(.65,'#5e3f24');g.addColorStop(1,'#2a1a0e');x.fillStyle=g;x.fillRect(0,y,w,64);}
    for(let i=0;i<500;i++){x.strokeStyle='rgba('+(Math.random()<.5?'20,12,6':'150,110,70')+','+(.05+Math.random()*.1)+')';x.beginPath();const yy=Math.random()*h,xx=Math.random()*w;x.moveTo(xx,yy);x.lineTo(xx+20+Math.random()*60,yy);x.stroke();}
  });
  TX.boards=mkTex(256,256,(x,w,h)=>{
    x.fillStyle='#3b2a1d';x.fillRect(0,0,w,h);
    for(let i=0;i<8;i++){x.fillStyle='rgba(0,0,0,.45)';x.fillRect(i*32,0,2,h);x.fillStyle='rgba(120,90,60,'+(.04+Math.random()*.08)+')';x.fillRect(i*32+2,0,30,h);}
    for(let i=0;i<300;i++){x.fillStyle='rgba(0,0,0,'+Math.random()*.12+')';x.fillRect(Math.random()*w,Math.random()*h,1,10+Math.random()*30);}
  });
  MT.logs=stdM(TX.logs,{roughness:.9});MT.boards=stdM(TX.boards,{roughness:.9});
  MT.frame=stdM(null,{color:lin(0x4a2f1c),roughness:.7});MT.rug=stdM(null,{color:lin(0x6b2c20),roughness:1});
  MT.copper=stdM(null,{color:lin(0x9a4a2a),roughness:.45,metalness:.6});
  MT.curtain=new THREE.MeshBasicMaterial({color:0xe6e2d4});MT.glassblock=new THREE.MeshBasicMaterial({color:0xaec2bd});
  MT.flame=new THREE.MeshBasicMaterial({color:0xff9a2a,transparent:true,opacity:.9});MT.flame2=new THREE.MeshBasicMaterial({color:0xffe070,transparent:true,opacity:.9});
}
/** Builds the cabin at a flat spot and returns its footprint [x,z,w,d] for the house placement, or null. */
function cabin(){
  cabinMats();
  const rr=rng(L.seed*131+7),Lu=10,Du=6.4,FH=2.5,HW=2.6,T=.25,DX=1.6,RUN=3.9;
  let best=null;
  for(let t=0;t<120;t++){
    const x=(rr()-.5)*110,z=(rr()-.5)*90-5;
    if(Math.abs(x)>58||Math.abs(z)>52||Math.hypot(x,z-70)<30)continue;
    let hi=-1e9,lo=1e9;
    for(const a of [-1,0,1])for(const b of [-Du/2,0,Du/2,Du/2+RUN]){const h=H(x+a*Lu/2,z+b);hi=Math.max(hi,h);lo=Math.min(lo,h);}
    if(!best||hi-lo<best.s)best={x,z,s:hi-lo,lo};
    if(hi-lo<.5)break;
  }
  if(!best)return null;
  const cx=best.x,cz=best.z,gy=best.lo+.05;
  const g=new THREE.Group();g.position.set(cx,gy,cz);scene.add(g);
  const add=(geo,mt,px,py,pz,cast)=>{const m=new THREE.Mesh(geo,mt);m.position.set(px,py,pz);m.castShadow=cast!==false;m.receiveShadow=true;g.add(m);return m;};
  const box=(w,h,d,mt,px,py,pz,tile,cast)=>add(tbox(w,h,d,tile||1),mt,px,py+h/2,pz,cast);        /* py = bottom edge */
  /* a solid part: visible box, bullet/sight proxy, and a collider that only acts between heights y0 and y1 */
  const solid=(w,h,d,mt,px,py,pz,tile,y0,y1)=>{box(w,h,d,mt,px,py,pz,tile);addBlock(cx+px,cz+pz,w,d,gy+py,h,true);const o=obst[obst.length-1];o.y0=gy+y0;o.y1=gy+y1;};
  const proxy=(w,h,d,px,py,pz)=>{addBlock(cx+px,cz+pz,w,d,gy+py,h,true);obst[obst.length-1].ph=true;};
  const deco=(w,h,d,mt,px,py,pz)=>add(new THREE.BoxGeometry(w,h,d),mt,px,py,pz,false);
  const wy0=FH-.2,wy1=FH+HW+.5;
  /* ground floor: plastered base (west half) and open garage (east half) on two posts */
  solid(4.6,FH+.3,Du-1,MT.plaster,-2.2,-.3,0,3,-9,FH-.1);
  box(4.4,.3,Du-1,MT.concrete,2.3,-.3,0,2.5,false);
  floors.push({a:cx+.1,b:cx+4.5,c:cz-(Du-1)/2,d:cz+(Du-1)/2,top:gy});
  for(const pz of [-Du/2+.5,Du/2-.5]){
    add(new THREE.CylinderGeometry(.17,.17,FH+.3,10),MT.logs,Lu/2-.6,(FH+.3)/2-.3,pz);
    addBlock(cx+Lu/2-.6,cz+pz,.4,.4,gy-.3,FH+.3,true);const o=obst[obst.length-1];o.y0=gy-9;o.y1=gy+FH-.1;
  }
  deco(1.2,1.0,.06,MT.glassblock,-2.2,1.3,Du/2-.47);deco(1.4,1.2,.05,MT.frame,-2.2,1.3,Du/2-.5);   /* glass-block window on the base */
  deco(.06,1.9,.9,MT.woodDoor,.13,.95,0);                                                          /* door from the garage */
  /* upper floor slab and flat roof */
  box(Lu,T,Du,MT.wood,0,FH-T,0,2);proxy(Lu,T,Du,0,FH-T,0);
  floors.push({a:cx-Lu/2+.1,b:cx+Lu/2-.1,c:cz-Du/2+.1,d:cz+Du/2-.1,top:gy+FH});
  box(Lu+1.6,.22,Du+1.6,MT.boards,0,FH+HW,0,2);proxy(Lu+1.6,.22,Du+1.6,0,FH+HW,0);
  /* walls: logs on the long sides, shingles on the short ends; the door gap is in the south wall at x = DX */
  const sw1=DX-.55+Lu/2,sw2=Lu/2-(DX+.55);
  solid(Lu,HW,T,MT.logs,0,FH,-Du/2+T/2,.8,wy0,wy1);
  solid(sw1,HW,T,MT.logs,-Lu/2+sw1/2,FH,Du/2-T/2,.8,wy0,wy1);
  solid(sw2,HW,T,MT.logs,Lu/2-sw2/2,FH,Du/2-T/2,.8,wy0,wy1);
  solid(1.1,HW-2,T,MT.logs,DX,FH+2,Du/2-T/2,.8,FH+2,wy1);
  solid(T,HW,Du-2*T,MT.roof,-Lu/2+T/2,FH,0,2.4,wy0,wy1);
  solid(T,HW,Du-2*T,MT.roof,Lu/2-T/2,FH,0,2.4,wy0,wy1);
  for(const s of [-1,1]){
    deco(Lu+.2,.55,.1,MT.boards,0,FH+HW-.275,s*(Du/2+.05));deco(.1,.55,Du+.2,MT.boards,s*(Lu/2+.05),FH+HW-.275,0);
    deco(.1,2.0,.3,MT.frame,DX+s*.58,FH+1,Du/2-T/2);
  }
  /* windows: decals on both faces of the wall */
  const winZ=(px,sz,w,h,y)=>{for(const [zf,o] of [[sz*Du/2,1],[sz*(Du/2-T),-1]]){
    const z=zf+sz*o*.02;deco(w+.16,h+.16,.04,MT.frame,px,y+h/2,z);deco(w,h,.05,MT.curtain,px,y+h/2,zf+sz*o*.03);deco(.05,h,.06,MT.frame,px,y+h/2,zf+sz*o*.045);}
    deco(w+.3,.07,.18,MT.frame,px,y-.03,sz*Du/2+sz*.09);};
  const winX=(sx,pz,w,h,y)=>{for(const [xf,o] of [[sx*Lu/2,1],[sx*(Lu/2-T),-1]]){
    const x=xf+sx*o*.02;deco(.04,h+.16,w+.16,MT.frame,x,y+h/2,pz);deco(.05,h,w,MT.curtain,xf+sx*o*.03,y+h/2,pz);deco(.06,h,.05,MT.frame,xf+sx*o*.045,y+h/2,pz);}};
  for(const px of [-4,-2.6,-1.2,.2,3.4])winZ(px,1,1.2,1.2,FH+.9);
  for(const px of [-2.5,2.5])winZ(px,-1,1,1.1,FH+1);
  winX(-1,0,1,1.1,FH+1);winX(1,0,1,1.1,FH+1);
  deco(.1,HW+FH-.1,.1,MT.copper,-3,(HW+FH-.1)/2+.05,-Du/2-.14);                                    /* drain pipe */
  /* chimney with a large fireplace in the middle of the room */
  solid(1.6,HW+1.4,1.2,MT.brick,0,FH,0,2.5,wy0,wy1);
  deco(1.0,.8,.06,MT.dark,0,FH+.55,.62);box(1.9,.2,.8,MT.brick,0,FH,1.0,1,false);
  const logG=new THREE.CylinderGeometry(.09,.09,.8,8);
  for(const [px,pz,rz] of [[-.1,.75,Math.PI/2],[.1,.9,Math.PI/2+.3]]){const m=add(logG,MT.logs,px,FH+.3,pz,false);m.rotation.z=rz;}
  const flames=[[-.22,.8,.2,.55,MT.flame],[.2,.85,.17,.45,MT.flame],[0,.78,.12,.7,MT.flame2]].map(([px,pz,r,h,mt])=>add(new THREE.ConeGeometry(r,h,7),mt,px,FH+.25+h/2,pz,false));
  const fire=new THREE.PointLight(0xff8a3a,1.6,13);fire.position.set(0,FH+.9,1.2);g.add(fire);
  const lamp=new THREE.PointLight(0xffe3b0,.45,9);lamp.position.set(0,FH+HW-.4,-.5);g.add(lamp);
  cabinFx={l:fire,f:flames};
  /* furniture around the fireplace */
  box(2.4,.02,1.6,MT.rug,0,FH,2.0,1,false);
  solid(1.5,.45,.4,MT.wood,-1.7,FH,2.2,1,wy0,FH+1);solid(1.5,.45,.4,MT.wood,1.7,FH,2.2,1,wy0,FH+1);
  solid(1.4,.75,.8,MT.wood,-3.6,FH,-1.7,1,wy0,FH+1);
  /* staircase from the south up to the door */
  box(1.4,.2,1.15,MT.wood,DX,FH-.2,Du/2+.425,1);
  floors.push({a:cx+DX-.7,b:cx+DX+.7,c:cz+Du/2-.15,d:cz+Du/2+1.0,top:gy+FH});
  for(let i=1;i<=9;i++){
    const top=FH-.25*i,zs=Du/2+1.0+(i-1)*.32;
    box(1.4,top+.3,.32,MT.wood,DX,-.3,zs+.16,1);
    floors.push({a:cx+DX-.7,b:cx+DX+.7,c:cz+zs,d:cz+zs+.32,top:gy+top});
  }
  const dz=9*.32,dy=(FH+.9)-(.25+.9),len=Math.hypot(dz,dy);
  for(const s of [-1,1]){const r=deco(.06,.06,len,MT.frame,DX+s*.72,(FH+.9+.25+.9)/2,Du/2+1.0+dz/2);r.rotation.x=Math.atan2(dy,dz);}
  obst.push({a:cx-Lu/2,b:cx+Lu/2,c:cz-Du/2,d:cz+Du/2,ph:true});                                   /* minimap footprint */
  cabinInfo={x:cx,z:cz,gy,Lu,Du,FH,DX};
  return [cx,cz+RUN/2,Lu+2,Du+RUN+2];
}
function updateCabin(){
  if(!cabinFx)return;
  cabinFx.l.intensity=1.5+Math.sin(tAll*11)*.25+Math.random()*.2;
  cabinFx.f.forEach((m,i)=>{m.scale.y=.85+Math.sin(tAll*(9+i*3)+i)*.2;m.scale.x=m.scale.z=.9+Math.sin(tAll*7+i)*.1;});
}
