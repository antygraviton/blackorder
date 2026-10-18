/* ============ SHOOTING ============ */
/* ============ SHOOTING, EXPLOSIONS, VEHICLES ============ */
const isKnife=k=>k==='knife'||k==='machete'||k==='hammer';
function camDir(){const d=new THREE.Vector3();cam.getWorldDirection(d);return d;}
function alertNear(r){for(const e of enemies){if(e.alive&&Math.hypot(e.x-P.x,e.z-P.z)<r)e.alerted=true;}}
function distSeg(p,a,b){const ab=new THREE.Vector3().subVectors(b,a),ap=new THREE.Vector3().subVectors(p,a);const t=Math.max(0,Math.min(1,ap.dot(ab)/(ab.lengthSq()||1)));return ap.sub(ab.multiplyScalar(t)).length();}
function groundHit(o,d){for(let t=2;t<140;t+=1.5){const x=o.x+d.x*t,y=o.y+d.y*t,z=o.z+d.z*t;if(y<H(x,z))return new THREE.Vector3(x,y,z);}return null;}
function fire(first){
  if(pDead)return;
  if(mounted){heliFire(first);return;}
  const k=slots[cur],w=WEAPONS[k],s=wp[k],now=performance.now()/1000;
  if(reloadT>0||now-lastShot<(w.rate||.3))return;
  const kind=w.kind||'gun',C=NET.role==='client';
  if(kind==='frag'||kind==='dyn'||kind==='smoke'||kind==='flash'){if(s.n<=0)return;s.n--;lastShot=now;kick=-.2;throwNade(w);hud();return;}
  if(kind==='melee'||kind==='shield'){
    lastShot=now;kick=-.25;beep(500,.08,'sawtooth');
    const d=camDir();
    for(const e of enemies){if(!e.alive)continue;const dx=e.x-P.x,dz=e.z-P.z;
      if(Math.hypot(dx,dz)<2.4&&(dx*d.x+dz*d.z)>0){bloodBurst(new THREE.Vector3(e.x,1.3,e.z),8);dmg(e,w.dmg,true);if(kind==='shield'&&!C)e.stun=1.5;}}
    for(const v of vehicles){if(!v.alive||v.type!=='apc')continue;if(Math.hypot(v.g.position.x-P.x,v.g.position.z-P.z)<v.rad+1.6)vdmg(v,w.dmg,false);}
    if(C)netShot('m',k,cam.position,d);
    return;
  }
  if(s.mag<=0){beep(120,.05);reload();return;}
  if(!w.auto&&!first)return;
  if(w.bayonet){const d=camDir();
    for(const e of enemies){if(!e.alive)continue;const dx=e.x-P.x,dz=e.z-P.z;
      if(Math.hypot(dx,dz)<2.2&&(dx*d.x+dz*d.z)>0){lastShot=now;kick=-.2;beep(500,.08,'sawtooth');bloodBurst(new THREE.Vector3(e.x,1.3,e.z),8);dmg(e,90,true);if(C)netShot('b',k,cam.position,d);return;}}}
  s.mag--;lastShot=now;shake=.012;kick=.05;
  if(kind==='rocket'){kick=.14;shake=.04;beep(80,.3,'sawtooth',.35);alertNear(60);spawnProj(w,'rocket');if(s.mag<=0)reload();hud();return;}
  if(kind==='napalm'){kick=.08;beep(220,.12,'sawtooth',.25);spawnProj(w,'napalm');if(s.mag<=0)reload();hud();return;}
  if(kind==='arrow'){kick=.06;beep(500,.06,'triangle',.12);spawnProj(w,'arrow');if(s.mag<=0)reload();hud();return;}
  if(kind==='stun'){kick=.07;stunCone(w);if(s.mag<=0)reload();hud();return;}
  flashT=.05;flash.intensity=3;
  if(mflash){mflash.visible=true;mflT=.045;mflash.rotation.z=Math.random()*6;const sc=.7+Math.random()*.7;mflash.scale.set(sc,sc,sc);}
  beep(w.dmg>60?90:180,.12,'square',w.dmg>60?.35:.2);
  if(!silent(k))alertNear(50);
  const n=w.pellets||1,sp=w.spread*(aim?.35:1)*spreadMul(k);
  const targets=obstMesh.concat(...enemies.filter(e=>e.alive).map(e=>e.parts),...vehicles.filter(v=>v.alive&&v.g.visible).map(v=>v.parts));
  for(let i=0;i<n;i++){
    const d=new THREE.Vector3();cam.getWorldDirection(d);
    d.x+=(Math.random()-.5)*sp*2;d.y+=(Math.random()-.5)*sp*2;d.z+=(Math.random()-.5)*sp*2;d.normalize();
    ray.set(cam.position,d);ray.far=250;
    const hit=ray.intersectObjects(targets,false)[0];
    const gh=groundHit(cam.position,d);
    if(hit&&(!gh||hit.distance<gh.distanceTo(cam.position))){
      if(hit.object.userData.enemy){const e=enemies.find(x=>x.g===hit.object.userData.enemy);
        if(e){const head=hit.object.userData.tag==='head';bloodBurst(hit.point,head?10:6);dmg(e,w.dmg*dmgMul(k)*(head?2.5:1),head);}}
      else if(hit.object.userData.vehicle){vdmg(hit.object.userData.vehicle,w.dmg*dmgMul(k),false);if(i<2)dustBurst(hit.point,0xc0c0b0);}
      else{if(hit.object.userData.obj)objHit(hit.object.userData.obj,w.dmg*dmgMul(k));if(hit.object.userData.barrel)barrelHit(hit.object.userData.barrel,w.dmg*dmgMul(k));if(i<3)dustBurst(hit.point,0x9a9186);}
    } else if(gh&&i<3)dustBurst(gh,0x7a6a4c);
  }
  if(C)netShot('g',k,cam.position,camDir());
  if(NET.role==='host'){NET.shotN++;NET.sent=[[NET.shotN,'v']];NET.t=1;}
  P.pitch+=.004+(w.pellets?.02:0);
  if(s.mag<=0)reload();
  hud();
}
function dmg(e,v,head,ex){
  if(NET.role==='client'){hitT=.15;$('cross').classList.add('hit');return;}
  if(e.boss&&!head&&!ex)v*=.2;   /* boss armor: body shots barely hurt, headshots and explosions do */
  e.hp-=v;hitT=.15;$('cross').classList.add('hit');e.alerted=true;if(!e.boss)e.flinch=.25;
  if(e.hp>0&&e.alive)banterEnemyHit(e);
  if(e.hp<=0&&e.alive){e.alive=false;e.dt=0;killed++;if(!e.dummy)S.kills++;beep(300,.1,'triangle');banterEnemyKill(e);if(head&&!e.dummy)bulletTime();
    const p=wp[slots[0]];if(p&&p.res!==undefined)p.res+=Math.ceil(WEAPONS[slots[0]].mag/2);
    if(head)say('Headshot',1);
    if(killed>=total)win();hud();}
}
function vdmg(v,a,expl){
  if(!v.alive)return;
  if(NET.role==='client'){if(!expl){hitT=.15;$('cross').classList.add('hit');}return;}
  if(!expl){a*=v.pm;hitT=.15;$('cross').classList.add('hit');}
  if(v.dummy){say('Vehicle: '+Math.round(a)+' damage'+(expl?' (explosion)':' (bullet, armor)'),.8);return;}
  v.hp-=a;
  if(v.hp<=0)vkill(v);
}
function vkill(v){
  v.alive=false;boom();
  const p=v.g.position.clone().add(new THREE.Vector3(0,1.2,0));
  for(let i=0;i<20;i++)dustBurst(p,i%2?0x3a2e22:0xffa030);
  const f=new THREE.Mesh(new THREE.SphereGeometry(3,12,12),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.8}));f.position.copy(p);scene.add(f);setTimeout(()=>scene.remove(f),200);
  if(v.type!=='apc'&&v.type!=='tank'){v.fall=0;v.fv=0;}
  else vWreck(v);
  if(v.type==='jet'){say('Jet shot down!',2.5);}
  else{killed++;S.kills++;say(v.type==='apc'?'APC destroyed!':v.type==='tank'?'Tank destroyed!':'Helicopter shot down!',2);if(killed>=total)win();}
  hud();
}
function throwNade(w){
  if(NET.role==='client'){netShot('x',wid(w),cam.position,camDir());return;}
  throwNadeAt(w,cam.position,camDir());
}
function throwNadeAt(w,o,d){
  const kd=w.kind;let m;
  if(kd==='dyn'){m=new THREE.Group();for(let i=-1;i<=1;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,.2,6),GM.red);c.position.x=i*.045;m.add(c);}}
  else if(kd==='smoke')m=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.14,8),GM.grayCan);
  else if(kd==='flash')m=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.13,8),GM.black);
  else m=new THREE.Mesh(new THREE.SphereGeometry(.05,10,10),GM.gren);
  m.position.copy(o).addScaledVector(d,.6);scene.add(m);
  const v=d.clone().multiplyScalar(18).add(new THREE.Vector3(0,3,0));
  nades.push({m,v,t:kd==='dyn'?3.5:kd==='smoke'?1.2:kd==='flash'?1.5:2,kind:kd,dm:w.dmg,r:kd==='dyn'?9:kd==='smoke'?8:kd==='flash'?15:7});
  fxPush(['N',kd,qn(m.position.x),qn(m.position.y),qn(m.position.z),qn(v.x),qn(v.y),qn(v.z)]);
}
function detonate(n){
  const p=n.m.position.clone();
  if(n.kind==='smoke')addSmoke(p,n.r,12);
  else if(n.kind==='flash')flashbang(p,n.r);
  else explode(p,n.r,n.dm);
}
function explode(p,r,dm){
  if(NET.role==='client'){explodeVis(p);return;}
  fxPush(['e',qn(p.x),qn(p.y),qn(p.z)]);
  boom();shake=.05;
  const f=new THREE.Mesh(new THREE.SphereGeometry(2.5,12,12),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.8}));f.position.copy(p);scene.add(f);
  setTimeout(()=>scene.remove(f),160);
  for(let i=0;i<14;i++)dustBurst(p,0x5a4a38);
  for(const e of enemies){if(!e.alive)continue;const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<r){bloodBurst(new THREE.Vector3(e.x,1.2,e.z),8);dmg(e,dm*(1-d/(r+1)),false,true);}}
  for(const v of vehicles){if(!v.alive||!v.g.visible)continue;const d=Math.max(0,v.g.position.distanceTo(p)-3);if(d<r)vdmg(v,dm*1.6*(1-d/(r+1)),true);}
  for(const a of allies){if(!a.remote||!a.alive)continue;const da=Math.hypot(a.x-p.x,a.z-p.z);if(da<r)allyHit(a,dm*.5*(1-da/(r+1)));}
  for(const b of barrels){if(b.dead)continue;const bd=Math.hypot(b.x-p.x,b.z-p.z);if(bd<r+1)barrelHit(b,dm*(1-bd/(r+2)));}
  for(const o of objs){if(o.t!=='depot'||o.done)continue;const od=Math.hypot(o.x-p.x,o.z-p.z);if(od<r+1.5)objHit(o,dm*(1-od/(r+2.5)));}
  const d=Math.hypot(P.x-p.x,P.z-p.z,(mounted?P.y-p.y:0));if(d<r)hurt(dm*.6*(1-d/(r+1)));
}
function hurt(v,from){
  if(curMode==='training'||NET.role==='client'||pDead||over)return;
  if(from&&slots[cur]==='shield'){
    const dx=from.x-P.x,dz=from.z-P.z,dl=Math.hypot(dx,dz)||1,fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
    if((dx*fx+dz*fz)/dl>.3)v*=.15;
  }
  v*=DIFF().dmg*(hasPerk('armor')?.85:1);
  if(mounted&&pheli&&pheli.alive){pheli.hp-=v*.7;shake=Math.max(shake,.03);beep(110,.1,'sawtooth',.12);if(pheli.hp<=0)crashHeli();hud();return;}
  banterPlayerHurt();
  P.hp-=v;splat(1+Math.floor(v/7));beep(110,.15,'sawtooth');shake=Math.max(shake,.03);
  if(P.hp<=0&&!over&&!pDead){if(canRespawn())playerDown();else failMission();}
  hud();
}
function win(){
  over=true;S.missions++;S.wp+=L.reward;S.medals+=L.medals;S.xp+=L.xp;
  const nx=nextInCamp(curLevel),hasNext=nx>=0;
  if(hasNext)setMax(L.camp,Math.max(getMax(L.camp),idxIn(curLevel)+1));
  save();
  const txt=(hasNext?'The next mission is unlocked. ':'Campaign “'+CAMPS[L.camp].n+'” is complete.')+' Reward: '+L.reward+' Weapoints, '+L.medals+' medals, '+L.xp+' XP.';
  NET.endInfo=[1,'Mission complete',txt,L.reward,L.medals,L.xp];
  setTimeout(()=>{if(NET.role==='solo')run=false;try{document.exitPointerLock();}catch(e){}$('scope').style.display='none';
    $('endT').textContent='Mission complete';$('endP').textContent=txt;
    $('nextBtn').style.display=(hasNext&&NET.role==='solo')?'':'none';$('end').classList.add('on');},700);
}

/* ---- projectiles ---- */
function spawnProj(w,type,orig,dirv){
  if(NET.role==='client'){netShot(type==='rocket'?'r':type==='napalm'?'n':'a',wid(w),cam.position,camDir());return;}
  const d=dirv?dirv.clone():camDir();let m;
  if(type==='arrow'){m=new THREE.Group();const sh=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.7,5),GM.wood);sh.rotation.x=Math.PI/2;const tip=new THREE.Mesh(new THREE.BoxGeometry(.03,.03,.06),GM.steel);tip.position.z=.36;m.add(sh,tip);}
  else if(type==='napalm')m=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:0xe66e1e}));
  else{m=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,8),stdM(null,{color:lin(0x3c4632)}));b.rotation.x=Math.PI/2;const h=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),stdM(null,{color:lin(0x78281e)}));h.position.z=.35;m.add(b,h);}
  m.position.copy(orig||cam.position).addScaledVector(d,orig?0:.8);
  const sp=type==='arrow'?52:type==='napalm'?28:42;
  const pr={type,m,v:d.clone().multiplyScalar(sp),g:type==='rocket'?.6:6,w,t:8,stuck:false};
  scene.add(m);m.lookAt(m.position.clone().add(pr.v));projs.push(pr);
  fxPush(['P',type==='rocket'?'r':type==='napalm'?'n':'a',qn(m.position.x),qn(m.position.y),qn(m.position.z),qn(pr.v.x),qn(pr.v.y),qn(pr.v.z)]);
}
function updateProjs(dt){
  for(let i=projs.length-1;i>=0;i--){const p=projs[i];
    p.t-=dt;
    if(p.t<=0){scene.remove(p.m);projs.splice(i,1);continue;}
    if(p.type==='shell'){
      p.v.y-=1.5*dt;
      const from=p.m.position.clone(),step=p.v.clone().multiplyScalar(dt),to=from.clone().add(step);
      ray.set(from,step.clone().normalize());ray.far=step.length()+.05;
      const h=ray.intersectObjects(obstMesh,false)[0];
      let hit=null;
      if(h)hit=h.point.clone();
      else if(to.y<H(to.x,to.z)+.05)hit=new THREE.Vector3(to.x,H(to.x,to.z),to.z);
      else if(Math.hypot(to.x-P.x,to.z-P.z)<1.8&&Math.abs(to.y-P.y)<2.5)hit=to.clone();
      else for(const a of allies){if(a.alive&&Math.hypot(to.x-a.x,to.z-a.z)<1.4&&to.y<H(a.x,a.z)+2.2){hit=to.clone();break;}}
      if(!hit){p.m.position.copy(to);p.m.lookAt(to.clone().add(p.v));continue;}
      shellBlast(hit,4.5,p.dm);scene.remove(p.m);projs.splice(i,1);continue;
    }
    if(p.stuck)continue;
    p.v.y-=p.g*dt;
    const from=p.m.position.clone(),step=p.v.clone().multiplyScalar(dt),to=from.clone().add(step);
    const targets=obstMesh.concat(...enemies.filter(e=>e.alive).map(e=>e.parts),...vehicles.filter(v=>v.alive&&v.g.visible).map(v=>v.parts));
    ray.set(from,step.clone().normalize());ray.far=step.length()+.05;
    const h=ray.intersectObjects(targets,false)[0];
    let hit=null,obj=null;
    if(h){hit=h.point.clone();obj=h.object;}
    else if(to.y<H(to.x,to.z)+.05)hit=new THREE.Vector3(to.x,H(to.x,to.z),to.z);
    if(!hit){p.m.position.copy(to);p.m.lookAt(to.clone().add(p.v));continue;}
    p.m.position.copy(hit);
    if(p.type==='rocket'){explode(hit,p.w.rad||8,p.w.dmg);scene.remove(p.m);projs.splice(i,1);}
    else if(p.type==='napalm'){fireZone(hit,p.w.dmg);scene.remove(p.m);projs.splice(i,1);}
    else{
      if(obj&&obj.userData.enemy){const e=enemies.find(x=>x.g===obj.userData.enemy);if(e){const head=obj.userData.tag==='head';bloodBurst(hit,head?10:6);dmg(e,p.w.dmg*(head?2.5:1),head);}}
      else if(obj&&obj.userData.vehicle)vdmg(obj.userData.vehicle,p.w.dmg,false);
      p.stuck=true;p.t=6;
    }
  }
}
function fireShell(v,tg){
  const from=new THREE.Vector3();v.mf.getWorldPosition(from);
  const to=tg?new THREE.Vector3(tg.x,tg.y-.4,tg.z):new THREE.Vector3(P.x,P.y-.4,P.z),dir=to.clone().sub(from),dist=dir.length();dir.normalize();
  const sc=.02+dist*.0004;dir.x+=(Math.random()-.5)*sc;dir.y+=(Math.random()-.5)*sc;dir.z+=(Math.random()-.5)*sc;dir.normalize();
  const m=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshBasicMaterial({color:0xffa030}));m.position.copy(from);scene.add(m);
  projs.push({type:'shell',m,v:dir.multiplyScalar(70),dm:55,t:6,stuck:false});
  fxPush(['P','s',qn(from.x),qn(from.y),qn(from.z),qn(dir.x),qn(dir.y),qn(dir.z)]);
  v.mf.visible=true;v.mfT=.12;beep(60,.4,'sawtooth',.4);for(let i=0;i<5;i++)dustBurst(from,0x8a8070);
}
function shellBlast(p,r,dm){
  fxPush(['e',qn(p.x),qn(p.y),qn(p.z)]);
  boom();shake=.05;
  const f=new THREE.Mesh(new THREE.SphereGeometry(2,12,12),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.8}));f.position.copy(p);scene.add(f);setTimeout(()=>scene.remove(f),160);
  for(let i=0;i<12;i++)dustBurst(p,0x5a4a38);
  const d=Math.hypot(P.x-p.x,P.z-p.z,(mounted?P.y-p.y:0));if(d<r)hurt(dm*(1-d/(r+1)));
  for(const a of allies){if(!a.alive)continue;const da=Math.hypot(a.x-p.x,a.z-p.z);if(da<r)allyHit(a,dm*(1-da/(r+1)));}
}
/* ---- fire (napalm) ---- */
function fireZone(p,dps){
  if(dps>0)fxPush(['F',qn(p.x),qn(p.y),qn(p.z)]);
  const grp=new THREE.Group();grp.position.copy(p);scene.add(grp);
  const fl=[],cm=[0xff7814,0xffd650];
  for(let i=0;i<14;i++){const m=new THREE.Mesh(new THREE.ConeGeometry(.35,1,5).translate(0,.5,0),new THREE.MeshBasicMaterial({color:cm[i%2]}));const a=Math.random()*6.283,r=Math.sqrt(Math.random())*3;m.position.set(Math.cos(a)*r,0,Math.sin(a)*r);grp.add(m);fl.push(m);}
  const lt=new THREE.PointLight(0xff8030,2,14);lt.position.y=1.5;grp.add(lt);
  fires.push({p:p.clone(),grp,fl,lt,t:0,dur:6,dps,d:0});beep(150,.4,'sawtooth',.25);
}
function fireDamage(p,r,d){
  if(d<=0||NET.role==='client')return;
  for(const e of enemies){if(e.alive&&Math.hypot(e.x-p.x,e.z-p.z)<r)dmg(e,d,false);}
  for(const v of vehicles){if(v.alive&&v.g.visible&&v.type!=='jet'&&Math.hypot(v.g.position.x-p.x,v.g.position.z-p.z)<r+2)vdmg(v,d,true);}
  if(Math.hypot(P.x-p.x,P.z-p.z)<r)hurt(d*.5);
}
function updateFires(dt){
  for(let i=fires.length-1;i>=0;i--){const f=fires[i];
    f.t+=dt;f.d+=dt;const k=Math.max(0,Math.min(1,(f.dur-f.t)/1.5));
    for(const m of f.fl)m.scale.set(1,(.5+Math.random()*1.1)*k+.001,1);
    f.lt.intensity=2*k*(.7+Math.random()*.5);
    if(f.d>=.25){f.d=0;fireDamage(f.p,3.5,f.dps*.25);}
    if(f.t>=f.dur){scene.remove(f.grp);fires.splice(i,1);}
  }
}
/* ---- smoke and flashbang ---- */
function addSmoke(p,r,dur){
  fxPush(['S',qn(p.x),qn(p.y),qn(p.z),r,dur]);
  const grp=new THREE.Group();grp.position.copy(p);scene.add(grp);
  const bs=[],mt=new THREE.MeshLambertMaterial({color:0x969a96});
  for(let i=0;i<16;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),mt);const a=Math.random()*6.283,rr=Math.sqrt(Math.random())*r*.7;m.position.set(Math.cos(a)*rr,Math.random()*3,Math.sin(a)*rr);m.scale.setScalar(.1);grp.add(m);bs.push(m);}
  clouds.push({p:p.clone().add(new THREE.Vector3(0,1.5,0)),r,t:0,dur,grp,bs});beep(300,.2,'triangle',.15);
}
function updateClouds(dt){
  for(let i=clouds.length-1;i>=0;i--){const c=clouds[i];
    c.t+=dt;const grow=Math.min(1,c.t/1.5),fade=Math.max(0,Math.min(1,(c.dur-c.t)/2));
    for(const m of c.bs){m.scale.setScalar(Math.max(.01,c.r*.45*grow*fade));m.position.y+=dt*.3;}
    if(c.t>=c.dur){scene.remove(c.grp);clouds.splice(i,1);}
  }
}
function smokeBlocks(a,b){for(const c of clouds){if(c.t>=c.dur)continue;if(distSeg(c.p,a,b)<c.r*.7)return true;}return false;}
function flashbang(p,r){
  fxPush(['L',qn(p.x),qn(p.y),qn(p.z)]);
  boom();for(let i=0;i<10;i++)dustBurst(p,0xffffee);
  for(const e of enemies){if(e.alive&&Math.hypot(e.x-p.x,e.z-p.z)<r)e.stun=4;}
  const to=new THREE.Vector3(p.x-P.x,p.y-P.y,p.z-P.z),dd=to.length();
  if(dd<r*.7&&to.normalize().dot(camDir())>-.2)flashA=1;
}
function stunCone(w){
  if(NET.role==='client'){
    const d=camDir();netShot('s',wid(w),cam.position,d);beep(90,.3,'sawtooth',.4);shake=.04;
    for(let i=0;i<14;i++)dustBurst(cam.position.clone().addScaledVector(d,2+Math.random()*5),0x6ec0ff);return;
  }
  stunConeAt(w,cam.position,camDir());
}
function stunConeAt(w,o,d){
  beep(90,.3,'sawtooth',.4);shake=.04;alertAt(o,40);
  for(let i=0;i<14;i++)dustBurst(o.clone().addScaledVector(d,2+Math.random()*5),0x6ec0ff);
  const cosMin=Math.cos(28*Math.PI/180),dl=Math.hypot(d.x,d.z)||1;
  for(const e of enemies){if(!e.alive)continue;const dx=e.x-o.x,dz=e.z-o.z,dist=Math.hypot(dx,dz);if(dist>15||dist<.01)continue;
    if((dx*d.x+dz*d.z)/(dist*dl)<cosMin)continue;e.stun=2.5;dmg(e,w.dmg,false);}
}
/* ---- vehicles: APC, helicopter, jet ---- */
function mkVehicle(type,x,z,kin){
  const g=new THREE.Group(),parts=[];
  const v={type,g,parts,alive:true,hp:0,pm:.06,rad:3.4,cd:2+Math.random()*2,burst:0,bt:0,mf:null,mfT:0,fall:null,fv:0,avoid:0,avDir:1,ang:Math.random()*6.28,jet:0,jwait:5+Math.random()*5,wheels:[],wa:0,jdir:new THREE.Vector3(),jtarget:new THREE.Vector3(),bombed:false,turret:null,rotor:null,tail:null};
  const reg=m=>{m.userData.vehicle=v;m.castShadow=type!=='jet';parts.push(m);return m;};
  const mk=(geo,mat,px,py,pz,par)=>{const m=reg(new THREE.Mesh(geo,mat));m.position.set(px,py,pz);(par||g).add(m);return m;};
  const M=(c,r,me)=>stdM(null,{color:lin(c),roughness:r===undefined?.7:r,metalness:me||0});
  if(type==='apc'){
    /* 8x8 armored personnel carrier (BTR type): wedge hull, turret with heavy machine gun, 8 wheels */
    const camoTex=mkTex(256,256,(c,w,h)=>{c.fillStyle='#5b6444';c.fillRect(0,0,w,h);const cols=['#2e3a2a','#6a5338','#8a8a64','#3c4a32'];
      for(let i=0;i<60;i++){c.fillStyle=cols[i%4];c.save();c.translate(Math.random()*w,Math.random()*h);c.rotate(Math.random()*6.3);c.beginPath();c.ellipse(0,0,12+Math.random()*30,7+Math.random()*16,0,0,7);c.fill();c.restore();}
      speck(c,w,h,1200,.14,'0,0,0');});
    const camo=stdM(camoTex,{roughness:.7,metalness:.1});
    const dark=M(0x121314,.9),steel=M(0x2c3033,.5,.6),rim=M(0x8a8f8a,.5,.5),red=M(0xbe1e1e,.6),lamp=M(0xe6dca0,.3,.2);
    const glass=stdM(null,{color:lin(0x2a3a44),roughness:.1,metalness:.6});
    // hull
    mk(new THREE.BoxGeometry(2.9,1.05,7.0),camo,0,.95,0);
    mk(new THREE.BoxGeometry(2.6,.75,4.6),camo,0,1.82,-.6);
    const gl=mk(new THREE.BoxGeometry(2.8,.95,1.8),camo,0,1.2,3.5);gl.rotation.x=-.5;
    const vane=mk(new THREE.BoxGeometry(2.0,.08,.9),steel,0,1.6,3.25);vane.rotation.x=-.5;
    for(const s of [-1,1]){
      mk(new THREE.BoxGeometry(.28,.2,.12),lamp,s*1.05,1.02,3.9);
      mk(new THREE.BoxGeometry(.7,.18,.06),glass,s*.6,1.97,1.72);
      mk(new THREE.BoxGeometry(.04,.7,1.1),dark,s*1.46,1.05,.8);
      for(const z of [-1.0,-1.8,-2.6])mk(new THREE.BoxGeometry(.04,.18,.18),dark,s*1.31,1.4,z);
      mk(new THREE.BoxGeometry(.7,.1,6.2),camo,s*1.6,1.12,.3);
      mk(new THREE.BoxGeometry(.04,.5,.5),red,s*1.46,1.55,2.1);
      const h=mk(new THREE.CylinderGeometry(.34,.34,.12,10),steel,s*.5,2.25,-1.4);
    }
    mk(new THREE.BoxGeometry(2.2,.1,1.6),steel,0,1.54,-2.9);
    for(let i=0;i<4;i++)mk(new THREE.BoxGeometry(2.0,.03,.06),dark,0,1.6,-2.4-i*.3);
    const ex=mk(new THREE.CylinderGeometry(.12,.12,.7,8),dark,1.0,.95,-3.6);ex.rotation.x=Math.PI/2;
    mk(new THREE.CylinderGeometry(.02,.02,3.2,5),dark,-1.0,3.6,-2.6);
    // wheels (spinning)
    v.wheels=[];
    for(const az of [-2.5,-.9,.7,2.3])for(const s of [-1,1]){
      const wg=new THREE.Group();wg.position.set(s*1.55,.5,az);g.add(wg);v.wheels.push(wg);
      const tire=mk(new THREE.CylinderGeometry(.5,.5,.5,16),dark,0,0,0,wg);tire.rotation.z=Math.PI/2;
      const hub=mk(new THREE.CylinderGeometry(.27,.27,.52,10),rim,0,0,0,wg);hub.rotation.z=Math.PI/2;
      for(let k=0;k<6;k++){const a=k*1.047,lug=mk(new THREE.BoxGeometry(.05,.06,.06),dark,s*.27,Math.cos(a)*.18,Math.sin(a)*.18,wg);}
    }
    // turret
    const tur=new THREE.Group();tur.position.set(0,2.35,.5);g.add(tur);v.turret=tur;
    mk(new THREE.CylinderGeometry(.65,.9,.55,8),camo,0,.28,0,tur);
    mk(new THREE.BoxGeometry(.3,.25,.4),steel,.42,.55,.35,tur);
    mk(new THREE.BoxGeometry(.2,.14,.05),glass,.42,.55,.56,tur);
    const gun=mk(new THREE.CylinderGeometry(.055,.055,2.4,8),steel,0,.28,1.6,tur);gun.rotation.x=Math.PI/2;
    const slv=mk(new THREE.CylinderGeometry(.09,.09,1.1,8),dark,0,.28,.95,tur);slv.rotation.x=Math.PI/2;
    const cox=mk(new THREE.CylinderGeometry(.03,.03,1.0,6),steel,.2,.2,1.2,tur);cox.rotation.x=Math.PI/2;
    for(const s of [-1,1])for(let k=0;k<3;k++){const d=mk(new THREE.CylinderGeometry(.04,.04,.25,6),dark,s*.7,.45,.15+k*.1,tur);d.rotation.z=s*.5;}
    v.mf=new THREE.Mesh(new THREE.SphereGeometry(.2,6,6),new THREE.MeshBasicMaterial({color:0xffd070}));v.mf.position.set(0,.28,2.85);v.mf.visible=false;tur.add(v.mf);
    v.hp=560+60*kin;v.pm=.06;v.rad=3.4;
    g.position.set(x,H(x,z),z);g.rotation.y=Math.random()*6.28;
  } else if(type==='tank'){
    /* heavy tank (T-14 Armata type): low angular hull, side skirts, flat unmanned turret, long gun */
    const sandTex=mkTex(256,256,(c,w,h)=>{c.fillStyle='#a79c7c';c.fillRect(0,0,w,h);const cols=['#8d8160','#bdb391','#7a7254'];
      for(let i=0;i<40;i++){c.fillStyle=cols[i%3];c.save();c.translate(Math.random()*w,Math.random()*h);c.rotate(Math.random()*6.3);c.beginPath();c.ellipse(0,0,16+Math.random()*40,8+Math.random()*20,0,0,7);c.fill();c.restore();}
      speck(c,w,h,1500,.1,'0,0,0');});
    const tan=stdM(sandTex,{roughness:.75,metalness:.1});
    const dark=M(0x1b1d1f,.9),steel=M(0x3a3d40,.5,.6),wheelM=M(0x2d3033,.8,.2),rimM=M(0x6a6e6c,.5,.4),rivet=M(0x5c5640,.6,.3),lamp=M(0xe6dca0,.3,.2);
    const glass=stdM(null,{color:lin(0x1c2a32),roughness:.1,metalness:.6});
    for(const s of [-1,1]){
      mk(new THREE.BoxGeometry(.95,1.05,8.6),dark,s*1.95,.62,0);
      mk(new THREE.BoxGeometry(.98,.12,8.7),wheelM,s*1.95,1.15,0);
      const sk=mk(new THREE.BoxGeometry(.18,.95,7.4),tan,s*2.5,1.0,-.2);sk.rotation.z=s*.06;
      const nk=mk(new THREE.BoxGeometry(.2,.95,.9),tan,s*2.45,1.0,3.9);nk.rotation.y=-s*.35;
      for(let i=0;i<14;i++)mk(new THREE.BoxGeometry(.05,.05,.05),rivet,s*2.6,1.35,-3.3+i*.5);
      mk(new THREE.BoxGeometry(.05,.5,.05),rivet,s*2.6,.8,0);
      mk(new THREE.BoxGeometry(.3,.16,.1),lamp,s*1.2,1.2,4.45);
    }
    v.wheels=[];
    for(let i=0;i<7;i++)for(const s of [-1,1]){
      const wg=new THREE.Group();wg.position.set(s*2.45,.55,-3.0+i*1.0);g.add(wg);v.wheels.push(wg);
      const w=mk(new THREE.CylinderGeometry(.5,.5,.2,14),wheelM,0,0,0,wg);w.rotation.z=Math.PI/2;
      for(let k=0;k<5;k++){const a=k*1.257;mk(new THREE.BoxGeometry(.06,.08,.08),rimM,s*.12,Math.cos(a)*.3,Math.sin(a)*.3,wg);}
    }
    mk(new THREE.BoxGeometry(3.4,.9,8.8),tan,0,1.05,0);
    const gl=mk(new THREE.BoxGeometry(3.2,.5,2.6),tan,0,1.5,3.7);gl.rotation.x=-.32;
    mk(new THREE.BoxGeometry(3.0,.45,6.2),tan,0,1.78,-1.0);
    for(const s of [-1,1])mk(new THREE.CylinderGeometry(.42,.42,.14,12),tan,s*.95,2.05,2.4);
    const tur=new THREE.Group();tur.position.set(0,2.0,-.4);g.add(tur);v.turret=tur;
    mk(new THREE.BoxGeometry(2.7,.55,3.6),tan,0,.28,0,tur);
    const wd=mk(new THREE.BoxGeometry(2.3,.6,1.5),tan,0,.3,2.2,tur);wd.rotation.x=.38;
    mk(new THREE.BoxGeometry(1.4,.4,1.1),tan,0,.6,-.3,tur);
    mk(new THREE.BoxGeometry(.5,.28,.5),glass,.5,.85,.3,tur);
    const bus=mk(new THREE.BoxGeometry(2.6,.75,1.1),tan,0,.4,-2.2,tur);bus.rotation.x=.22;
    for(let i=0;i<5;i++){const b=mk(new THREE.BoxGeometry(.42,.08,1.0),steel,-.95+i*.48,.82,-2.35,tur);b.rotation.x=.55;}
    const sl=mk(new THREE.CylinderGeometry(.21,.21,3.4,10),steel,0,.34,3.8,tur);sl.rotation.x=Math.PI/2;
    const gn=mk(new THREE.CylinderGeometry(.16,.16,2.6,10),dark,0,.34,6.2,tur);gn.rotation.x=Math.PI/2;
    const mb=mk(new THREE.CylinderGeometry(.19,.19,.3,10),steel,0,.34,7.4,tur);mb.rotation.x=Math.PI/2;
    mk(new THREE.CylinderGeometry(.25,.28,.5,10),steel,.95,.85,-.9,tur);
    mk(new THREE.BoxGeometry(.4,.35,.6),tan,.95,1.2,-.9,tur);
    const mg=mk(new THREE.CylinderGeometry(.04,.04,1.6,6),dark,.95,1.5,-.3,tur);mg.rotation.x=.88;
    for(const [ax,az] of [[-1.0,-1.6],[1.2,-1.8]])mk(new THREE.CylinderGeometry(.02,.02,2.6,5),dark,ax,1.6,az,tur);
    v.mf=new THREE.Mesh(new THREE.SphereGeometry(.28,6,6),new THREE.MeshBasicMaterial({color:0xffd070}));v.mf.position.set(0,.34,7.7);v.mf.visible=false;tur.add(v.mf);
    v.hp=900+90*kin;v.pm=.03;v.rad=4.4;
    g.position.set(x,H(x,z),z);g.rotation.y=Math.random()*6.28;
  } else if(type==='heli'){
    const gray=M(0x3c463e),dark=M(0x14161a,.8),glass=stdM(null,{color:lin(0x1e3246),roughness:.2,metalness:.5});
    const fus=mk(new THREE.SphereGeometry(1,16,12),gray,0,0,0);fus.scale.set(1.0,1.1,3.0);
    const cp=mk(new THREE.SphereGeometry(1,12,10),glass,0,.25,1.9);cp.scale.set(.85,.75,1.1);
    mk(new THREE.BoxGeometry(.3,.3,4.2),gray,0,.25,-4.2);
    mk(new THREE.BoxGeometry(.08,1.1,.5),gray,0,.75,-6.2);
    const tail=new THREE.Group();tail.position.set(.2,.8,-6.3);g.add(tail);v.tail=tail;
    mk(new THREE.BoxGeometry(.04,1.3,.1),dark,0,0,0,tail);mk(new THREE.BoxGeometry(.04,.1,1.3),dark,0,0,0,tail);
    mk(new THREE.CylinderGeometry(.08,.08,.5,6),dark,0,1.25,0);
    const rot=new THREE.Group();rot.position.set(0,1.55,0);g.add(rot);v.rotor=rot;
    mk(new THREE.BoxGeometry(7.2,.04,.22),dark,0,0,0,rot);mk(new THREE.BoxGeometry(.22,.04,7.2),dark,0,0,0,rot);
    for(const s of [-1,1]){mk(new THREE.BoxGeometry(.1,.1,3.8),dark,s*.95,-1.25,0);mk(new THREE.BoxGeometry(.08,.6,.08),dark,s*.9,-.95,.9);mk(new THREE.BoxGeometry(.08,.6,.08),dark,s*.9,-.95,-.9);mk(new THREE.BoxGeometry(.3,.3,1),gray,s*1.3,-.2,.6);}
    const gun=mk(new THREE.CylinderGeometry(.06,.06,.9,8),dark,0,-.75,2.6);gun.rotation.x=Math.PI/2;
    v.mf=new THREE.Mesh(new THREE.SphereGeometry(.2,6,6),new THREE.MeshBasicMaterial({color:0xffd070}));v.mf.position.set(0,-.75,3.15);v.mf.visible=false;g.add(v.mf);
    v.hp=380+40*kin;v.pm=.22;v.rad=3.5;
    g.position.set(x,H(P.x,P.z)+28,z);
  } else {
    const gray=M(0x6a6e76,.5,.3),dark=M(0x1c1c1e,.8),glass=stdM(null,{color:lin(0x1e3246),roughness:.2,metalness:.5});
    const fus=mk(new THREE.CylinderGeometry(.55,.55,13,12),gray,0,0,0);fus.rotation.x=Math.PI/2;
    const nose=mk(new THREE.SphereGeometry(1,12,10),gray,0,0,6.5);nose.scale.set(.55,.55,1.7);
    const cp=mk(new THREE.SphereGeometry(1,10,8),glass,0,.45,3.3);cp.scale.set(.32,.3,1.5);
    for(const s of [-1,1]){const w=mk(new THREE.BoxGeometry(4.5,.1,5.2),gray,s*2.6,-.05,-1);w.rotation.y=-s*.38;
      const f=mk(new THREE.BoxGeometry(.1,2,1.6),gray,s*.45,1,-5.6);f.rotation.z=s*.17;}
    mk(new THREE.BoxGeometry(3.8,.08,1.7),gray,0,.1,-6.2);
    const ex=mk(new THREE.CylinderGeometry(.45,.45,.8,10),dark,0,0,-6.8);ex.rotation.x=Math.PI/2;
    v.hp=300;v.pm=.02;v.rad=7;
    g.position.set(0,90,0);g.visible=false;
  }
  g.rotation.order='YXZ';scene.add(g);
  return v;
}
function vShoot(v,dist,cb,dd,dmin,dmax,tg){
  if(v.mf){v.mf.visible=true;v.mfT=.06;}
  beep(150,.07,'square',.08);
  const chance=Math.max(.06,cb-dist/dd);
  if(Math.random()<chance)hitTgt(tg,dmin+Math.random()*(dmax-dmin),v.g.position);
}
function updateVehicles(dt){
  for(const v of vehicles){
    const g=v.g,pos=g.position;
    if(v.mfT>0){v.mfT-=dt;if(v.mfT<=0&&v.mf)v.mf.visible=false;}
    if(v.dummy)continue;
    if(!v.alive){
      if(v.fall!==null&&v.type!=='apc'){v.fv+=14*dt;pos.y-=v.fv*dt;g.rotation.y+=3.5*dt;g.rotation.z+=.5*dt;if(v.rotor)v.rotor.rotation.y+=10*dt;
        const gr=H(pos.x,pos.z)+(v.type==='jet'?.8:1.6);if(pos.y<=gr){pos.y=gr;v.fall=null;explode(pos.clone(),6,70);}}
      continue;
    }
    const tg=pickTarget(pos.x,pos.z);if(!tg)continue;const eye=tg.eye;
    const dx=tg.x-pos.x,dz=tg.z-pos.z,dist=Math.hypot(dx,dz);
    if(v.type==='apc'||v.type==='tank'){
      const isT=v.type==='tank';
      const target=Math.atan2(dx,dz);let yaw=g.rotation.y,want=target,speed=dist>(isT?40:30)?(isT?3.0:4.5):0;
      if(v.avoid>0){v.avoid-=dt;want=yaw+v.avDir*1.2;speed=3;}
      const da=Math.atan2(Math.sin(want-yaw),Math.cos(want-yaw));const tr=(isT?.45:.7)*dt;yaw+=Math.max(-tr,Math.min(tr,da));
      const fx=Math.sin(yaw),fz=Math.cos(yaw);let nx=pos.x+fx*speed*dt,nz=pos.z+fz*speed*dt;
      if(speed>0&&inObst(nx+fx*4,nz+fz*4,3)){if(v.avoid<=0){v.avoid=1.4;v.avDir=Math.random()<.5?1:-1;}nx=pos.x;nz=pos.z;}
      const hf=H(nx+fx*3,nz+fz*3),hb=H(nx-fx*3,nz-fz*3);
      v.wa+=Math.hypot(nx-pos.x,nz-pos.z)/.5;for(const w of v.wheels)w.rotation.x=v.wa;
      pos.set(nx,H(nx,nz),nz);g.rotation.y=yaw;g.rotation.x=-Math.atan2(hf-hb,6);
      if(v.turret)v.turret.rotation.y=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));
      const pd=Math.hypot(P.x-pos.x,P.z-pos.z);if(!mounted&&pd<v.rad&&pd>.01){P.x=pos.x+(P.x-pos.x)/pd*v.rad;P.z=pos.z+(P.z-pos.z)/pd*v.rad;}
      const from=new THREE.Vector3(pos.x,pos.y+2.8,pos.z);
      const see=!pDead&&dist<(isT?95:75)&&los(from,eye)&&!smokeBlocks(from,eye);
      v.cd-=dt;
      if(v.shell2>0){v.shell2-=dt;if(v.shell2<=0&&see)fireShell(v,tg);}
      if(isT){if(see&&v.cd<=0){v.cd=5+Math.random()*2.5;fireShell(v,tg);if(v.boss)v.shell2=.6;}}
      else if(v.burst>0){v.bt-=dt;if(v.bt<=0){v.bt=.1;v.burst--;if(see)vShoot(v,dist,.4,150,5,8,tg);}}
      else if(see&&v.cd<=0){v.burst=8;v.cd=2.5+Math.random()*1.5;}
    } else if(v.type==='heli'){
      v.ang+=dt*.18;
      const tx=tg.x+Math.cos(v.ang)*40,tz=tg.z+Math.sin(v.ang)*40,ty=H(tg.x,tg.z)+28+Math.sin(v.ang*3)*3,k=1-Math.exp(-dt);
      pos.x+=(tx-pos.x)*k;pos.y+=(ty-pos.y)*k;pos.z+=(tz-pos.z)*k;
      g.rotation.y=Math.atan2(tg.x-pos.x,tg.z-pos.z);g.rotation.x=.12;
      if(v.rotor)v.rotor.rotation.y+=dt*22;if(v.tail)v.tail.rotation.x+=dt*28;
      const from=new THREE.Vector3(pos.x,pos.y-.7,pos.z);
      const see=dist<90&&los(from,eye)&&!smokeBlocks(from,eye);
      v.cd-=dt;
      if(v.burst>0){v.bt-=dt;if(v.bt<=0){v.bt=.09;v.burst--;if(see)vShoot(v,dist,.25,400,5,8,tg);}}
      else if(see&&v.cd<=0){v.burst=12;v.cd=3+Math.random()*2;}
    } else {
      if(v.jet===0){
        g.visible=false;v.jwait-=dt;if(v.jwait>0)continue;
        v.jtarget.set(tg.x,0,tg.z);const a=Math.random()*6.283;v.jdir.set(-Math.cos(a),0,-Math.sin(a));
        pos.set(tg.x-v.jdir.x*600,H(tg.x,tg.z)+55,tg.z-v.jdir.z*600);g.rotation.y=Math.atan2(v.jdir.x,v.jdir.z);g.rotation.x=0;g.rotation.z=0;
        g.visible=true;v.bombed=false;v.jet=1;say('FIGHTER JET STRIKE! Run!',3.5);beep(700,.5,'sawtooth',.25);
        continue;
      }
      pos.addScaledVector(v.jdir,90*dt);
      const along=(pos.x-v.jtarget.x)*v.jdir.x+(pos.z-v.jtarget.z)*v.jdir.z;
      if(!v.bombed&&along>-3){v.bombed=true;explode(new THREE.Vector3(v.jtarget.x,H(v.jtarget.x,v.jtarget.z),v.jtarget.z),10,95);}
      if(along>600){v.jet=0;v.jwait=14+Math.random()*8;}
    }
  }
}
/* ---- buildings for desert maps ---- */
function hangar(x,z,w,d){
  const hs=[H(x-w/2,z-d/2),H(x+w/2,z-d/2),H(x-w/2,z+d/2),H(x+w/2,z+d/2)],lo=Math.min(...hs),hi=Math.max(...hs),hgt=5.5,fl=hi+.1;
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const add=(geo,mt,px,py,pz)=>{const m=new THREE.Mesh(geo,mt);m.position.set(px,py,pz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;};
  add(tbox(w+.2,fl-lo+.6,d+.2,2.5),MT.concrete,0,lo-.3+(fl-lo+.6)/2,0);
  add(tbox(w,hgt,d,3.2),MT.concrete,0,fl+hgt/2,0);
  add(new THREE.BoxGeometry(w+.7,.4,d+.7),stdM(null,{color:lin(0x686c68),roughness:.8}),0,fl+hgt+.2,0);
  add(new THREE.BoxGeometry(w*.6,4.2,.2),stdM(null,{color:lin(0x282c30),roughness:.6,metalness:.4}),0,fl+2.1,d/2+.05);
  add(new THREE.BoxGeometry(w,.5,.22),stdM(null,{color:lin(0xc85a1e),roughness:.7}),0,fl+4.8,d/2+.06);
  addBlock(x,z,w,d,lo-.3,fl-lo+hgt+.3);
}
function runway(){
  const cx=34;
  const asph=stdM(null,{color:lin(0x46484a),roughness:.95}),line=stdM(null,{color:lin(0xe6e6dc),roughness:.9});
  for(let i=-7;i<=7;i++){const z=i*10,gy=H(cx,z);
    const a=new THREE.Mesh(new THREE.BoxGeometry(24,.5,10.2),asph);a.position.set(cx,gy+.12,z);a.receiveShadow=true;scene.add(a);
    if(i%2===0){const l=new THREE.Mesh(new THREE.BoxGeometry(.6,.52,4),line);l.position.set(cx,gy+.13,z);scene.add(l);}}
  obst.push({a:cx-13,b:cx+13,c:-76,d:76,nm:true,ph:true});
}

