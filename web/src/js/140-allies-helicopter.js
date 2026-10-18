/* ============ ALLIES AND YOUR HELICOPTER ============ */
function mkAlly(x,z,idx){
  const a=mkEnemy(x,z);a.hp=120;a.ally=true;a.alerted=false;a.name=idx?'Bravo':'Alpha';
  a.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.map&&(o.material.map===TX.camoWood||o.material.map===TX.camoDigi||o.material.map===TX.camoTan)){o.material=o.material.clone();o.material.color.set(0x9db8e8);}});
  const mk=new THREE.Mesh(new THREE.OctahedronGeometry(.13),new THREE.MeshBasicMaterial({color:0x4aa8ff}));mk.position.y=2.4;a.g.add(mk);a.marker=mk;
  return a;
}
function allyDmg(e,v,head){
  e.hp-=v*(head?2.5:1);e.alerted=true;e.flinch=.25;
  if(e.hp<=0&&e.alive){e.alive=false;e.dt=0;killed++;S.kills++;beep(300,.1,'triangle',.1);if(killed>=total)win();hud();}
}
function updateAllies(dt){
  for(const a of allies){
    if(a.remote)continue;
    if(a.marker)a.marker.rotation.y+=dt*2;
    if(a.hostage&&a.alive){hostageTick(a,dt);continue;}
    if(!a.alive){
      if(a.dt<1){a.dt+=dt*2.2;const q=Math.min(1,a.dt);a.g.rotation.x=-q*1.5;a.g.position.y=H(a.x,a.z)-q*.05;a.legs[0].hip.rotation.x=q*.5;a.legs[1].hip.rotation.x=-q*.3;if(a.marker)a.marker.visible=false;}
      continue;
    }
    if(a.mfT>0){a.mfT-=dt;if(a.mfT<=0)a.mf.visible=false;}
    if(a.flinch>0){a.flinch-=dt;a.g.rotation.x=-.18*(a.flinch/.25);}else a.g.rotation.x=0;
    const eyeA=new THREE.Vector3(a.x,H(a.x,a.z)+1.6,a.z);
    let tg=null,td=1e9;
    for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-a.x,e.z-a.z);
      if(d<td&&d<45){const to=new THREE.Vector3(e.x,H(e.x,e.z)+1.5,e.z);if(los(eyeA,to)&&!smokeBlocks(eyeA,to)){tg=e;td=d;}}}
    let vt=null,vd=1e9;
    if(!tg)for(const v of vehicles){if(!v.alive||!v.g.visible||v.type==='jet')continue;
      const d=Math.hypot(v.g.position.x-a.x,v.g.position.z-a.z);
      if(d<vd&&d<60){const to=v.g.position.clone();to.y+=1.5;if(los(eyeA,to)&&!smokeBlocks(eyeA,to)){vt=v;vd=d;}}}
    const dpl=Math.hypot(P.x-a.x,P.z-a.z);
    let fx=P.x-a.x,fz=P.z-a.z,mx=0,mz=0,walking=false;
    if(tg){fx=tg.x-a.x;fz=tg.z-a.z;}else if(vt){fx=vt.g.position.x-a.x;fz=vt.g.position.z-a.z;}
    if(!tg&&!vt&&dpl>8){mx=(P.x-a.x)/dpl;mz=(P.z-a.z)/dpl;}
    else if((tg||vt)&&dpl>22){mx=(P.x-a.x)/dpl;mz=(P.z-a.z)/dpl;}
    walking=(mx||mz)?true:false;
    if(walking){a.x+=mx*3.4*dt;a.z+=mz*3.4*dt;collide(a,.5);a.g.position.set(a.x,H(a.x,a.z),a.z);}
    if(Math.hypot(fx,fz)>.5){const tgt=Math.atan2(fx,fz);let da=tgt-a.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));a.g.rotation.y+=da*Math.min(1,dt*8);}
    a.cd-=dt;
    if((tg||vt)&&a.cd<=0){
      a.cd=.5+Math.random()*.5;a.mf.visible=true;a.mfT=.06;beep(190,.05,'square',.04);
      if(tg){if(Math.random()<.6)allyDmg(tg,12+Math.random()*8,Math.random()<.12);}
      else if(vt){vt.hp-=10*vt.pm;if(vt.hp<=0)vkill(vt);}
    }
    if(walking){a.walk+=dt*8;const s1=Math.sin(a.walk);a.legs[0].hip.rotation.x=s1*.7;a.legs[1].hip.rotation.x=-s1*.7;a.legs[0].knee.rotation.x=Math.max(0,-s1)*.9;a.legs[1].knee.rotation.x=Math.max(0,s1)*.9;}
    else{a.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});}
  }
}
const HW=[{n:'Machine gun'},{n:'Rocket pods',dmg:90,rad:4.5},{n:'Anti-tank missiles',dmg:260,rad:8}];
function mkPlayerHeli(x,z){
  /* Mi-24 (Hind): twin cockpit, wings with rocket pods, 5-blade rotor */
  const g=new THREE.Group();
  const M=(c,r,me)=>stdM(null,{color:lin(c),roughness:r===undefined?.6:r,metalness:me||0});
  const camoTex=mkTex(256,256,(c,w,h)=>{c.fillStyle='#8c978d';c.fillRect(0,0,w,h);const cols=['#52634c','#657660','#3e4c3a'];
    for(let i=0;i<46;i++){c.fillStyle=cols[i%3];c.save();c.translate(Math.random()*w,Math.random()*h);c.rotate(Math.random()*6.3);c.beginPath();c.ellipse(0,0,14+Math.random()*34,8+Math.random()*18,0,0,7);c.fill();c.restore();}
    speck(c,w,h,1200,.12,'0,0,0');});
  const camo=stdM(camoTex,{roughness:.6,metalness:.15});
  const gray=M(0xa7aea8,.5,.2),dark=M(0x1a1c1e,.8),olive=M(0x4a5846,.6,.1),wing=M(0x3e4a40,.6,.1),yellow=M(0xb4a45a,.5,.4),exhM=M(0x4a525a,.7,.3);
  const glass=stdM(null,{color:lin(0x4c6c86),roughness:.08,metalness:.7});
  const mk=(geo,mat,px,py,pz,par)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.position.set(px,py,pz);(par||g).add(m);return m;};
  const fus=mk(new THREE.SphereGeometry(1,20,14),camo,0,.1,0);fus.scale.set(1.25,1.3,3.7);
  const gunc=mk(new THREE.SphereGeometry(1,16,12),glass,0,.45,3.0);gunc.scale.set(.85,.75,1.0);
  const pilc=mk(new THREE.SphereGeometry(1,16,12),glass,0,1.0,2.0);pilc.scale.set(.9,.85,1.15);
  const sens=mk(new THREE.SphereGeometry(1,14,10),gray,0,-.95,3.35);sens.scale.set(.7,.55,.9);
  for(const s of [-1,1]){const b=mk(new THREE.CylinderGeometry(.045,.045,1.2,8),dark,s*.14,-1.1,4.25);b.rotation.x=Math.PI/2;}
  for(const s of [-1,1])mk(new THREE.SphereGeometry(.62,12,10),olive,s*.6,1.55,.9);
  mk(new THREE.BoxGeometry(1.4,.9,1.6),exhM,0,1.55,-.8);
  for(let i=0;i<5;i++)mk(new THREE.BoxGeometry(1.42,.04,.05),dark,0,1.3+i*.17,-.05);
  const boom=mk(new THREE.CylinderGeometry(.17,.46,5.4,10),camo,0,.75,-5.2);boom.rotation.x=-Math.PI/2;
  const fin=mk(new THREE.BoxGeometry(.16,2.1,1.5),camo,0,1.55,-7.6);fin.rotation.x=.28;
  mk(new THREE.BoxGeometry(2.4,.1,.8),camo,0,.85,-7.2);
  const tail=new THREE.Group();tail.position.set(.5,1.85,-7.7);g.add(tail);
  for(let i=0;i<3;i++){const a=i*2.094,b=mk(new THREE.BoxGeometry(.04,1.2,.2),dark,0,Math.cos(a)*.55,Math.sin(a)*.55,tail);b.rotation.x=a;}
  mk(new THREE.CylinderGeometry(.14,.2,.6,8),dark,0,2.25,.3);
  const rot=new THREE.Group();rot.position.set(0,2.6,.3);g.add(rot);
  mk(new THREE.CylinderGeometry(.28,.28,.2,10),dark,0,0,0,rot);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,b=mk(new THREE.BoxGeometry(8.4,.05,.38),dark,Math.cos(a)*4.4,0,Math.sin(a)*4.4,rot);b.rotation.y=-a;}
  for(const s of [-1,1]){
    const w=mk(new THREE.BoxGeometry(3.6,.14,1.5),wing,s*2.5,.2,-.3);w.rotation.z=s*.12;
    mk(new THREE.BoxGeometry(.12,.7,1.5),wing,s*4.35,0,-.3);
    for(const px of [1.7,2.9]){
      const p=mk(new THREE.CylinderGeometry(.3,.3,1.7,12),gray,s*px,-.35,.2);p.rotation.x=Math.PI/2;
      mk(new THREE.CircleGeometry(.26,12),dark,s*px,-.35,1.06);
      mk(new THREE.BoxGeometry(.08,.3,.8),wing,s*px,-.1,0);
    }
    for(const dy of [-.35,-.6]){const r=mk(new THREE.CylinderGeometry(.08,.08,1.6,8),yellow,s*4.45,dy,.3);r.rotation.x=Math.PI/2;}
    mk(new THREE.BoxGeometry(.12,1.0,.12),dark,s*1.4,-1.0,-.6);
    const wh=mk(new THREE.CylinderGeometry(.42,.42,.32,14),dark,s*1.55,-1.5,-.6);wh.rotation.z=Math.PI/2;
  }
  mk(new THREE.BoxGeometry(.12,.9,.12),dark,0,-1.1,2.8);
  const nw=mk(new THREE.CylinderGeometry(.3,.3,.26,12),dark,0,-1.55,2.8);nw.rotation.z=Math.PI/2;
  const numTex=mkTex(128,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='#f2f2ee';c.font='bold 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('3362',w/2,h/2);},false);
  const numMat=new THREE.MeshBasicMaterial({map:numTex,transparent:true});
  for(const s of [-1,1]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.65),numMat);pl.position.set(s*.97,.1,2.5);pl.rotation.y=s*Math.PI/2;g.add(pl);}
  g.rotation.order='YXZ';g.position.set(x,H(x,z)+1.8,z);g.rotation.y=Math.PI;scene.add(g);
  return {g,rotor:rot,tail,hp:500,maxhp:500,pod:40,atgm:8,vx:0,vy:0,vz:0,alive:true};
}
function toggleHeli(){
  if(!pheli||!pheli.alive||over)return;
  const pos=pheli.g.position;
  if(!mounted){
    if(Math.hypot(P.x-pos.x,P.z-pos.z)>7)return;
    if(!heliFree()){say('The helicopter is taken by another player.',2);return;}
    mounted=true;aim=false;mouseDown=false;heliWeapon=0;NET.boardAt=Date.now();if(NET.role==='host')NET.heliPilot=0;
    say('Mi-24: mouse steers heading and pitch (nose down = fly forward), W climb, S descend, Space fire, 1–3 weapons, E exit',6);
  } else {
    if(pos.y-H(pos.x,pos.z)>4){say('Land to be able to exit (S = descend).',2);return;}
    mounted=false;P.x=pos.x+4;P.z=pos.z;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;pheli.vx=pheli.vy=pheli.vz=0;if(NET.role==='host')NET.heliPilot=-1;
  }
  hud();
}
function flyHeli(dt){
  const h=pheli,pos=h.g.position;
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),fw=[-sy,-cy],rg=[cy,-sy];
  const pit=Math.max(-.9,Math.min(.6,P.pitch));
  const fs=Math.abs(pit)<.06?0:Math.max(-.45,Math.min(1,-pit/.45))*26;
  let sx=0;if(keys.KeyD)sx+=1;if(keys.KeyA)sx-=1;
  const tvx=fw[0]*fs+rg[0]*sx*13,tvz=fw[1]*fs+rg[1]*sx*13,tvy=keys.KeyW?9:(keys.KeyS?-9:0);
  const k=Math.min(1,dt*1.4);
  h.vx+=(tvx-h.vx)*k;h.vz+=(tvz-h.vz)*k;h.vy+=(tvy-h.vy)*Math.min(1,dt*2.2);
  pos.x+=h.vx*dt;pos.z+=h.vz*dt;pos.y+=h.vy*dt;
  const gy=H(pos.x,pos.z)+1.8;
  if(pos.y<gy){pos.y=gy;if(h.vy<0)h.vy=0;}
  if(pos.y>100){pos.y=100;if(h.vy>0)h.vy=0;}
  if(pos.y-gy<6){const o={x:pos.x,z:pos.z};collide(o,3.5);pos.x=o.x;pos.z=o.z;}
  pos.x=Math.max(-76,Math.min(76,pos.x));pos.z=Math.max(-76,Math.min(76,pos.z));
  h.g.rotation.y=P.yaw+Math.PI;
  const vr=h.vx*rg[0]+h.vz*rg[1];
  h.g.rotation.x=Math.max(-.5,Math.min(.5,-pit*.7));h.g.rotation.z=-vr/26*.3;
  P.x=pos.x;P.z=pos.z;P.y=pos.y+.5;P.vy=0;P.ground=true;
}
function chasePos(){
  const h=pheli.g.position,cp=Math.cos(P.pitch);
  const f=new THREE.Vector3(-Math.sin(P.yaw)*cp,Math.sin(P.pitch),-Math.cos(P.yaw)*cp);
  const c=h.clone().addScaledVector(f,-17);c.y+=3.2;
  c.y=Math.max(c.y,H(c.x,c.z)+1.2);
  return c;
}
function crashHeli(){
  const h=pheli;h.alive=false;if(NET.role==='host')NET.heliPilot=-1;const pos=h.g.position;
  explode(pos.clone(),8,60);
  mounted=false;
  pos.y=H(pos.x,pos.z)+1.8;h.g.rotation.x=.25;h.g.rotation.z=.45;
  P.x=pos.x+5;P.z=pos.z+5;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;
  say('Helicopter destroyed! You bailed out.',3);
  hurt(35);
}
function heliAim(){
  const d=camDir();
  const targets=obstMesh.concat(...enemies.filter(e=>e.alive).map(e=>e.parts),...vehicles.filter(v=>v.alive&&v.g.visible).map(v=>v.parts));
  ray.set(cam.position,d);ray.far=400;
  const h=ray.intersectObjects(targets,false)[0],gh=groundHit(cam.position,d);
  let pt=cam.position.clone().addScaledVector(d,250);
  if(h&&(!gh||h.distance<gh.distanceTo(cam.position)))pt=h.point.clone();else if(gh)pt=gh;
  return pt;
}
function heliFire(first){
  if(!pheli||!pheli.alive)return;
  const now=performance.now()/1000,aimPt=heliAim(),mz=pheli.g.localToWorld(new THREE.Vector3(0,-1.1,4.8));
  if(heliWeapon===0){
    if(now-lastShot<.06)return;lastShot=now;
    beep(210,.05,'square',.14);shake=Math.max(shake,.006);alertNear(70);
    const d=aimPt.clone().sub(mz).normalize();d.x+=(Math.random()-.5)*.02;d.y+=(Math.random()-.5)*.02;d.z+=(Math.random()-.5)*.02;d.normalize();
    if(NET.role==='client')netShot('h','heli',mz,d);
    const targets=obstMesh.concat(...enemies.filter(e=>e.alive).map(e=>e.parts),...vehicles.filter(v=>v.alive&&v.g.visible).map(v=>v.parts));
    ray.set(mz,d);ray.far=300;
    const hit=ray.intersectObjects(targets,false)[0],gh=groundHit(mz,d);
    if(hit&&(!gh||hit.distance<gh.distanceTo(mz))){
      if(hit.object.userData.enemy){const e=enemies.find(x=>x.g===hit.object.userData.enemy);if(e){const head=hit.object.userData.tag==='head';bloodBurst(hit.point,head?10:6);dmg(e,16*(head?2:1),head);}}
      else if(hit.object.userData.vehicle){vdmg(hit.object.userData.vehicle,16,false);dustBurst(hit.point,0xc0c0b0);}
      else{if(hit.object.userData.obj)objHit(hit.object.userData.obj,16);if(hit.object.userData.barrel)barrelHit(hit.object.userData.barrel,16);dustBurst(hit.point,0x9a9186);}
    } else if(gh)dustBurst(gh,0x7a6a4c);
  } else if(heliWeapon===1){
    if(now-lastRocket<.8)return;
    if(pheli.pod<4){say('Out of rocket-pod rockets.',1.5);return;}
    lastRocket=now;pheli.pod-=4;
    for(let i=0;i<4;i++){
      const o=pheli.g.localToWorld(new THREE.Vector3((i%2?1:-1)*(i<2?1.7:2.9),-.35,1.1));
      const d=aimPt.clone().sub(o).normalize();d.x+=(Math.random()-.5)*.03;d.y+=(Math.random()-.5)*.03;d.z+=(Math.random()-.5)*.03;
      heliRocket(HW[1],o,d.normalize());
    }
    beep(90,.3,'sawtooth',.3);shake=.03;alertNear(70);
  } else {
    if(now-lastRocket<1.5)return;
    if(pheli.atgm<=0){say('Out of anti-tank missiles.',1.5);return;}
    lastRocket=now;pheli.atgm--;
    heliRocket(HW[2],mz,aimPt.clone().sub(mz).normalize());
    beep(70,.4,'sawtooth',.4);shake=.05;alertNear(70);
  }
  hud();
}
function updateHeliIdle(dt){
  if(!pheli)return;
  pheli.rotor.rotation.y+=dt*(mounted?22:(pheli.alive?2:0));pheli.tail.rotation.x+=dt*(mounted?28:(pheli.alive?2:0));
  const near=pheli.alive&&!mounted&&Math.hypot(P.x-pheli.g.position.x,P.z-pheli.g.position.z)<6;
  $('prompt').textContent=near?'Press E to board the helicopter':(mounted&&pheli.g.position.y-H(pheli.g.position.x,pheli.g.position.z)<4.5?'E = exit':'');
}
/* ---- helicopter in multiplayer ----
   One pilot at a time (NET.heliPilot = roster index, -1 = nobody). The pilot's machine flies the helicopter: the host does it for
   itself, for a client pilot the host copies the position from that player's presence (heliArbitrate) and publishes it in s.h;
   everybody else sees a ghost that follows the snapshot. A client claims the helicopter with presence hm:1, the host decides. */
function heliFree(){
  if(NET.role==='solo')return true;
  if(NET.role==='host')return NET.heliPilot<0;
  const h=NET.snap&&NET.snap.h;return !h||h[0]<0;
}
function heliRocket(w,o,d){if(NET.role==='client')netShot(w===HW[1]?'p':'t','heli',o,d);else spawnProj(w,'rocket',o,d);}
function heliShot(a,s){
  if(!pheli||!pheli.alive||a.ridx!==NET.heliPilot)return;
  const code=s[1],o=new THREE.Vector3(s[3]/10,s[4]/10,s[5]/10),d=new THREE.Vector3(s[6]/1000,s[7]/1000,s[8]/1000).normalize();
  if(code==='h'){alertAt(o,70);hitscanFrom(o,d,{dmg:16,spread:0,pellets:1});}
  else if(code==='p'){spawnProj(HW[1],'rocket',o,d);pheli.pod=Math.max(0,pheli.pod-1);}
  else if(code==='t'){spawnProj(HW[2],'rocket',o,d);pheli.atgm=Math.max(0,pheli.atgm-1);}
}
/** Host: decide who flies, move the helicopter for a client pilot, let it sink when nobody flies it. */
function heliArbitrate(dt){
  if(!pheli)return;
  const ro=NET.roster,av=i=>NET.avatars[ro[i]];
  if(NET.heliPilot>0){const a=av(NET.heliPilot);if(!a||!a.alive||!a.hm||!pheli.alive)NET.heliPilot=-1;}
  if(NET.heliPilot===0&&(!mounted||!pheli.alive))NET.heliPilot=-1;
  if(NET.heliPilot<0&&pheli.alive&&!mounted)for(let i=1;i<ro.length;i++){const a=av(i);if(a&&a.alive&&a.hm&&Math.hypot(a.px-pheli.g.position.x,a.pz-pheli.g.position.z)<9){NET.heliPilot=i;break;}}
  const pos=pheli.g.position;
  if(NET.heliPilot>0){
    const a=av(NET.heliPilot),k=Math.min(1,dt*12);
    pos.x+=(a.px-pos.x)*k;pos.y+=(a.py-.5-pos.y)*k;pos.z+=(a.pz-pos.z)*k;
    pheli.g.rotation.y=a.pyaw+Math.PI;pheli.g.rotation.x=Math.max(-.5,Math.min(.5,-Math.max(-.9,Math.min(.6,a.ppitch||0))*.7));
  } else if(pheli.alive&&NET.heliPilot<0&&!mounted){
    const gy=H(pos.x,pos.z)+1.8;if(pos.y>gy)pos.y=Math.max(gy,pos.y-6*dt);
  }
}
function crashHeliRemote(a){
  const pos=pheli.g.position;pheli.alive=false;NET.heliPilot=-1;
  explode(pos.clone(),8,60);
  pos.y=H(pos.x,pos.z)+1.8;pheli.g.rotation.x=.25;pheli.g.rotation.z=.45;
  allyHit(a,35);
}
/** Client: take over the host's view of the helicopter. */
function heliApply(h){
  NET.heliPilot=h[0];NET.heliSnap=h;
  const me=h[0]===NET.mi;
  if(mounted&&!me&&Date.now()-(NET.boardAt||0)>1500){
    mounted=false;P.x=pheli.g.position.x+4;P.z=pheli.g.position.z;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;
    say(h[7]?'The helicopter is taken by another player.':'Helicopter destroyed! You bailed out.',3);
  }
  if(!mounted){pheli.pod=h[8];pheli.atgm=h[9];}
  pheli.hp=h[10];
  if(!h[7]&&pheli.alive){
    pheli.alive=false;const pos=pheli.g.position;pos.y=H(pos.x,pos.z)+1.8;pheli.g.rotation.x=.25;pheli.g.rotation.z=.45;
    if(mounted){mounted=false;P.x=pos.x+5;P.z=pos.z+5;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;say('Helicopter destroyed! You bailed out.',3);}
  }
}
function heliFollow(dt){
  const h=NET.heliSnap;if(!pheli||!h||!pheli.alive||mounted)return;
  const p=pheli.g.position,k=Math.min(1,dt*10);
  p.x+=(h[1]/10-p.x)*k;p.y+=(h[2]/10-p.y)*k;p.z+=(h[3]/10-p.z)*k;
  let da=h[4]/100-pheli.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));pheli.g.rotation.y+=da*k;
  pheli.g.rotation.x=h[5]/100;pheli.g.rotation.z=h[6]/100;
}
