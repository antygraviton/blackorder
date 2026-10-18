/* ============ EXTENSION: GAME ============ */
let objs=[],alarm=false,missionT=0,missionDmg=0,defT=0,defGroup=0,bossPct=100;
let streak=0,ksQ=[],uavT=0,timers=[],allyOrder='follow',allyPt=null;
let barrels=[],docsList=[],torch=null,rain=[],lightT=8,thunderAt=0;
let pjeep=null,mountedKind='heli',zwave=0,zs=null;
const KSN={uav:'UAV',drop:'Ammo drop',strike:'Air strike'};
function achCheck(){
  for(const a of ACH){if(S.ach&&S.ach[a.id])continue;
    if(a.ok()){S.ach=S.ach||{};S.ach[a.id]=1;save();say('🏆 Achievement: '+a.n,4);beep(880,.25,'sine',.2);}}
}
function flagSet(k){S.flag=S.flag||{};S.flag[k]=1;}
/* ---- weather and night ---- */
function applyWx(l){
  const w=l.wx;if(!w)return l;const o=Object.assign({},l);
  if(w==='night')Object.assign(o,{skyTop:0x05080f,skyHor:0x1a2433,fog:0x0a0e16,fogN:18,fogF:190,sun:0x8fa6cc,sunI:.2,hemiI:.3,exp:1.2,cloud:.1});
  else if(w==='fog')Object.assign(o,{skyTop:0x8f98a0,skyHor:0xb8bfc2,fog:0xb8bfc2,fogN:6,fogF:150,sunI:l.sunI*.6});
  else if(w==='rain')Object.assign(o,{skyTop:0x58636b,skyHor:0x8a949a,fog:0x7a858c,fogN:22,fogF:250,sunI:l.sunI*.45,hemiI:l.hemiI*.9,cloud:.9});
  else if(w==='storm')Object.assign(o,{skyTop:0x2f363d,skyHor:0x5a646b,fog:0x4e575d,fogN:16,fogF:190,sunI:l.sunI*.25,hemiI:l.hemiI*.7,cloud:1});
  return o;
}
function initWx(){
  rain=[];torch=null;lightT=8;thunderAt=0;
  if(L.wx==='rain'||L.wx==='storm'){
    const n=1400,pos=new Float32Array(n*6);
    for(let i=0;i<n;i++){const x=(Math.random()-.5)*44,y=Math.random()*30,z=(Math.random()-.5)*44;pos.set([x,y,z,x-.1,y-.8,z-.05],i*6);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const mat=new THREE.LineBasicMaterial({color:0xaab6c0,transparent:true,opacity:.42});
    for(let k=0;k<2;k++){const r=new THREE.LineSegments(geo,mat);r.frustumCulled=false;scene.add(r);rain.push(r);}
  }
  if(L.wx==='night'){
    torch=new THREE.SpotLight(0xfff0d0,1.7,75,.5,.5,1);cam.add(torch);
    const tt=new THREE.Object3D();tt.position.set(0,0,-6);cam.add(tt);torch.target=tt;
  }
}
function updateWx(dt){
  rain.forEach((r,i)=>r.position.set(cam.position.x,cam.position.y-12-(((tAll*22)+i*15)%30),cam.position.z));
  if(L.wx==='storm'){
    lightT-=dt;if(lightT<=0){lightT=6+Math.random()*9;flashA=.75;thunderAt=1+Math.random()*1.4;}
    if(thunderAt>0){thunderAt-=dt;if(thunderAt<=0){beep(55,.9,'sawtooth',.35);shake=Math.max(shake,.02);}}
  }
}
/* ---- briefing and radio ---- */
function beginLoad(){
  $('brief').classList.remove('on');$('loading').style.display='grid';
  setTimeout(()=>{try{doStart();}catch(e){console.error(e);$('loading').textContent='Loading error: '+e.message;return;}$('loading').style.display='none';},40);
}
function updateRadio(dt){
  missionT+=dt;
  for(const r of (L.radio||[])){if(r.done)continue;if((r.t&&missionT>=r.t)||(r.k&&killed>=r.k)){r.done=true;say('📻 '+r.m,5);beep(1200,.12,'sine',.1);}}
}
/* ---- mission objectives ---- */
function addObj(t,x,z){
  const o={t,x,z,hp:150,prog:0,done:false,free:false,m:null,vis:false};objs.push(o);
  if(t==='host')return o;
  const g=new THREE.Group();g.position.set(x,H(x,z),z);scene.add(g);o.m=g;
  const mk=(geo,mat,px,py,pz)=>{const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=true;g.add(m);return m;};
  if(t==='depot'){
    mk(new THREE.CylinderGeometry(1.1,1.1,2.2,14),stdM(null,{color:lin(0xb13a22),roughness:.5,metalness:.4}),0,1.1,0);
    mk(new THREE.CylinderGeometry(1.14,1.14,.3,14),stdM(null,{color:lin(0xe0c33a),roughness:.6}),0,1.5,0);
    mk(new THREE.CylinderGeometry(.35,.35,.4,10),stdM(null,{color:lin(0x2b2b2b)}),0,2.4,0);
    addBlock(x,z,2.4,2.4,H(x,z),2.4,false);const px=obstMesh[obstMesh.length-1];px.userData.obj=o;o.px=px;o.co=obst[obst.length-1];
  } else if(t==='term'){
    mk(new THREE.BoxGeometry(1.4,1.3,.9),stdM(null,{color:lin(0x2c3236),roughness:.5,metalness:.5}),0,.65,0);
    const scr=mk(new THREE.BoxGeometry(1.1,.6,.05),new THREE.MeshBasicMaterial({color:0x3dff9a}),0,1.1,.47);o.scr=scr;
    const lt=new THREE.PointLight(0x3dff9a,1.2,9);lt.position.set(0,1.4,1);g.add(lt);o.lt=lt;
    addBlock(x,z,1.5,1,H(x,z),1.3,false);
  } else if(t==='zone'||t==='ext'){
    const col=t==='zone'?0x4aa8ff:0x4aff7a,r=t==='zone'?14:7;
    const ring=new THREE.Mesh(new THREE.RingGeometry(r-.5,r,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.y=.35;g.add(ring);o.r=r;
    const beam=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,30,6),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.35}));beam.position.y=15;g.add(beam);
  }
  return o;
}
function placeObjectives(){
  const rr=rng(L.seed*53);
  if(L.ob==='destroy'){for(let i=0;i<(L.nd||4);i++){const [x,z]=spot(rr,25,4,66);addObj('depot',x,z);}}
  else if(L.ob==='hack'){const [x,z]=spot(rr,55,4,60);addObj('term',x,z);}
  else if(L.ob==='rescue'){const [x,z]=spot(rr,55,4,60);addObj('host',x,z);const h=mkAlly(x,z,2);h.hostage=true;h.free=false;h.hp=80;if(h.marker)h.marker.material.color.set(0xffd23a);allies.push(h);addObj('ext',0,66);}
  else if(L.ob==='defend'){const [x,z]=spot(rr,0,6,25);addObj('zone',x,z);}
}
function makeBoss(e){
  e.boss=true;e.g.scale.setScalar(1.5);e.hp=Math.round(1500*DIFF().hp);e.mhp=e.hp;
  e.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&o.userData.tag!=='head'){o.material=o.material.clone();o.material.color.multiplyScalar(.55);o.material.color.r+=.12;}});
  return e;
}
function markBossTank(v){v.boss=true;v.hp=Math.round(v.hp*3.5);v.mhp=v.hp;v.g.scale.setScalar(1.25);v.rad*=1.25;return v;}
function bossDead(){
  const e=enemies.find(x=>x.boss);if(e)return !e.alive;
  const v=vehicles.find(x=>x.boss);if(v)return !v.alive;
  return false;
}
function bossHpPct(){
  const e=enemies.find(x=>x.boss);if(e)return Math.max(0,Math.round(e.hp/e.mhp*100));
  const v=vehicles.find(x=>x.boss);if(v)return v.alive?Math.max(1,Math.round(v.hp/(v.mhp||v.hp)*100)):0;
  return 0;
}
function objHit(o,d){
  if(NET.role==='client'||o.t!=='depot'||o.done)return;
  o.hp-=d;if(o.hp<=0)depotBoom(o);
}
function depotBoom(o){
  o.done=true;const p=new THREE.Vector3(o.x,H(o.x,o.z)+1,o.z);
  depotVis(o);explode(p,7,90);say('Fuel depot destroyed!',2);
}
function depotVis(o){
  if(o.vis)return;o.vis=true;
  if(o.px){const i=obstMesh.indexOf(o.px);if(i>=0)obstMesh.splice(i,1);}
  if(o.co){const i=obst.indexOf(o.co);if(i>=0)obst.splice(i,1);}
  if(o.m){o.m.traverse(m=>{if(m.isMesh&&m.material&&m.material.color){m.material=m.material.clone();m.material.color.multiplyScalar(.2);}});o.m.scale.y=.45;}
  fireZone(new THREE.Vector3(o.x,H(o.x,o.z),o.z),0);
}
function humansNear(x,z,r,needUse){
  if(!pDead&&Math.hypot(P.x-x,P.z-z)<r&&(!needUse||keys.KeyE))return true;
  for(const a of allies)if(a.remote&&a.alive&&Math.hypot(a.x-x,a.z-z)<r&&(!needUse||a.use))return true;
  return false;
}
function nearestHuman(x,z){const t=pickTarget(x,z);return t;}
function hostageTick(a,dt){
  if(!a.free){
    if(humansNear(a.x,a.z,3,true)){a.fp=(a.fp||0)+dt/1.5;if(a.fp>=1){a.free=true;say('Prisoner freed! Lead him to the extraction point.',4);beep(700,.3,'sine',.2);}}else a.fp=Math.max(0,(a.fp||0)-dt);
    a.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});return;
  }
  const t=pickTarget(a.x,a.z);if(!t)return;
  const dx=t.x-a.x,dz=t.z-a.z,d=Math.hypot(dx,dz);
  if(d>4){a.x+=dx/d*3.6*dt;a.z+=dz/d*3.6*dt;collide(a,.5);a.g.position.set(a.x,H(a.x,a.z),a.z);
    let da=Math.atan2(dx,dz)-a.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));a.g.rotation.y+=da*Math.min(1,dt*8);
    a.walk+=dt*8;const s1=Math.sin(a.walk);a.legs[0].hip.rotation.x=s1*.7;a.legs[1].hip.rotation.x=-s1*.7;}
  else a.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});
}
function updateObjectives(dt){
  if(over)return;
  const ob=L.ob;if(!ob||ob==='kill')return;
  if(ob==='boss')bossPct=bossHpPct();
  for(const o of objs){
    if(o.t==='term'&&!o.done){
      const near=humansNear(o.x,o.z,3.2,true);
      o.prog=Math.max(0,Math.min(1,o.prog+(near?dt/6:-dt/30)));
      if(o.prog>=1){o.done=true;say('Terminal hacked!',3);beep(900,.4,'sine',.2);}
    }
    if(o.t==='zone'){
      const inside=humansNear(o.x,o.z,o.r,false);o.inside=inside;
      if(inside)o.prog=Math.min(1,o.prog+dt/150);
      defT+=dt;const grp=Math.floor(defT/20);
      while(defGroup<grp&&defGroup<4){for(let i=defGroup*6;i<defGroup*6+6&&i<enemies.length;i++){enemies[i].alerted=true;}defGroup++;say('Another wave of attackers!',3);beep(600,.25,'sawtooth',.2);}
      if(o.prog>=1)o.done=true;
    }
  }
  if(ob==='destroy'&&objs.length&&objs.every(o=>o.done))win();
  else if(ob==='hack'&&objs.every(o=>o.t!=='term'||o.done)){if(!alarm){flagSet('ghost');}win();}
  else if(ob==='rescue'){
    const h=allies.find(a=>a.hostage);
    if(h&&!h.alive){failMission('The prisoner died. Mission failed.');return;}
    const ex=objs.find(o=>o.t==='ext');
    if(h&&h.free&&ex&&Math.hypot(h.x-ex.x,h.z-ex.z)<ex.r)win();
  }
  else if(ob==='defend'){const z=objs.find(o=>o.t==='zone');if(z&&z.prog>=1){enemies.forEach(e=>{if(e.alive)e.alerted=false;});win();}}
  else if(ob==='boss'){if(bossDead()){flagSet(L.bossT?'boss2':'boss1');win();}}
}
function objText(){
  if(L.ob==='destroy'){const t=objs.filter(o=>o.t==='depot'),n=t.filter(o=>o.done).length;return ['Destroy fuel depots: '+n+' / '+t.length,'Gunfire and explosions destroy the depots'];}
  if(L.ob==='hack'){const o=objs.find(x=>x.t==='term');return ['Hack the terminal: '+Math.round((o?o.prog:0)*100)+' %'+(alarm?' · ALARM':''),'Hold E at the terminal · stealth '+(alarm?'broken':'intact')];}
  if(L.ob==='rescue'){const h=allies.find(a=>a.hostage);return [!h?'Rescue the prisoner':(h.free?'Lead the prisoner to extraction (green circle)':'Find the prisoner and free him (hold E)'),h&&!h.alive?'The prisoner died':'The prisoner must survive'];}
  if(L.ob==='defend'){const z=objs.find(o=>o.t==='zone');const s=Math.max(0,Math.round(150*(1-(z?z.prog:0))));return ['Defend the zone: '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'),(z&&humansNear(z.x,z.z,z.r,false))?'You are in the zone':'Return to the blue circle'];}
  if(L.ob==='boss'){return ['Boss: '+bossPct+' %','Aim for the head, use explosives'];}
  return ['',''];
}
function raiseAlarm(msg){
  if(alarm)return;alarm=true;say('ALARM! '+msg,3.5);beep(800,.5,'sawtooth',.25);
  for(const e of enemies)if(e.alive)e.alerted=true;
}
/* ---- killstreaks ---- */
function streakKill(){
  if(NET.role!=='solo'||curMode==='training')return;
  streak++;const aw={3:'uav',5:'drop',8:'strike',12:'strike'}[streak];
  if(aw){ksQ.push(aw);say('Streak '+streak+' kills! '+KSN[aw]+' ready (G)',3.5);beep(700,.2,'sine',.2);}
}
function refillAll(){
  for(const k of slots){const w=WEAPONS[k];if(!wp[k])continue;if(w.mag){wp[k].mag=magOf(k);wp[k].res=w.res;}else if(w.cat==='grenade')wp[k].n=3+(hasPerk('nades')?2:0);}
  hud();
}
function useKs(){
  if(NET.role!=='solo'){say('Killstreaks work only in solo play.',2);return;}
  const a=ksQ.shift();if(!a)return;
  if(a==='uav'){uavT=30;say('UAV: enemies on the minimap for 30 s',3);}
  else if(a==='drop'){addKit(P.x+(Math.random()-.5)*6,P.z-4,true);say('The ammo drop landed in front of you',3);beep(500,.3,'triangle',.2);}
  else if(a==='strike'){
    const pt=heliAim();say('Air strike on the marked target in 3 s! Fall back.',3.5);addSmoke(pt.clone(),3,8);
    timers.push({t:3,fn:()=>{for(let i=0;i<4;i++)timers.push({t:i*.6,fn:()=>explode(new THREE.Vector3(pt.x+(Math.random()-.5)*14,pt.y,pt.z+(Math.random()-.5)*14),9,260)});}});
  }
}
function updateTimers(dt){
  if(uavT>0)uavT-=dt;
  for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const f=timers[i].fn;timers.splice(i,1);f();}}
}
function streakText(){return(NET.role==='solo'&&streak>0)?' · streak '+streak+(ksQ.length?' · G = '+KSN[ksQ[0]]:''):'';}
/* ---- ally commands ---- */
function setOrder(o){
  if(NET.role==='client'||!allies.some(a=>!a.remote&&!a.hostage))return;
  allyOrder=o;
  if(o==='attack'){const p=heliAim();allyPt={x:p.x,z:p.z};say('Allies: attack the marked spot',2.5);}
  else say(o==='hold'?'Allies: hold position':'Allies: follow me',2.5);
  beep(1000,.08,'sine',.1);
}
/* ---- explosive barrels ---- */
function barrelHit(b,d){if(b.dead||NET.role==='client')return;b.hp-=d;if(b.hp<=0)barrelBoom(b);}
function barrelVis(b){
  if(b.dead)return;b.dead=true;scene.remove(b.m);
  const i=obstMesh.indexOf(b.px);if(i>=0)obstMesh.splice(i,1);const j=obst.indexOf(b.co);if(j>=0)obst.splice(j,1);
}
function barrelBoom(b){
  barrelVis(b);
  const p=new THREE.Vector3(b.x,H(b.x,b.z)+.5,b.z);
  explode(p,5,110);fireZone(p,0);
}
/* ---- documents ---- */
function addDoc(x,z,id){
  const g=new THREE.Group();g.position.set(x,H(x,z)+.9,z);scene.add(g);
  const pg=new THREE.Mesh(new THREE.BoxGeometry(.5,.04,.7),new THREE.MeshBasicMaterial({color:0xfff2a0}));g.add(pg);
  const lt=new THREE.PointLight(0xffe890,1,6);g.add(lt);
  docsList.push({g,x,z,id,got:false});
}
function updateDocs(dt){
  for(const d of docsList){
    if(d.got)continue;d.g.rotation.y+=dt*1.5;d.g.position.y=H(d.x,d.z)+.9+Math.sin(tAll*2)*.12;
    if(!pDead&&Math.hypot(P.x-d.x,P.z-d.z)<1.6){
      d.got=true;scene.remove(d.g);const dc=DOCS.find(q=>q.id===d.id);
      if(!(S.docs&&S.docs[d.id])){S.docs=S.docs||{};S.docs[d.id]=1;save();say('📄 New document: '+dc.t+' (find it in the Archive)',4);beep(900,.2,'sine',.2);achCheck();}
      else say('📄 '+dc.t+' (already in the Archive)',2.5);
    }
  }
}
/* ---- jeep ---- */
function mkJeep(x,z){
  const g=new THREE.Group();
  const M=(c,r,me)=>stdM(null,{color:lin(c),roughness:r===undefined?.7:r,metalness:me||0});
  const olive=M(0x4d5a3a),dark=M(0x141516,.9),steel=M(0x2c3033,.5,.6),glass=M(0x2a3a44,.1,.5);
  const mk=(geo,mat,px,py,pz,par)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.position.set(px,py,pz);(par||g).add(m);return m;};
  mk(new THREE.BoxGeometry(2.1,.7,4.0),olive,0,.85,0);
  mk(new THREE.BoxGeometry(1.9,.4,1.4),olive,0,1.1,1.6);
  mk(new THREE.BoxGeometry(1.8,.08,.12),steel,0,1.35,.9);
  for(const s of [-1,1]){mk(new THREE.BoxGeometry(.08,.7,.08),steel,s*.88,1.5,.9);mk(new THREE.CylinderGeometry(.04,.04,1.1,6),steel,s*.8,1.7,-1.2);mk(new THREE.BoxGeometry(.5,.12,.5),olive,s*.55,1.3,-.2);}
  mk(new THREE.BoxGeometry(1.7,.06,.06),steel,0,2.25,-1.2);
  mk(new THREE.BoxGeometry(1.7,.4,.05),glass,0,1.65,.93);
  const wheels=[];
  for(const az of [-1.3,1.3])for(const s of [-1,1]){
    const wg=new THREE.Group();wg.position.set(s*1.1,.45,az);g.add(wg);wheels.push(wg);
    const t=mk(new THREE.CylinderGeometry(.5,.5,.4,14),dark,0,0,0,wg);t.rotation.z=Math.PI/2;
    for(let k=0;k<5;k++){const a=k*1.257;mk(new THREE.BoxGeometry(.06,.08,.08),steel,s*.22,Math.cos(a)*.3,Math.sin(a)*.3,wg);}
  }
  mk(new THREE.CylinderGeometry(.06,.06,1.0,6),steel,0,1.55,-.3);
  const gun=mk(new THREE.CylinderGeometry(.05,.05,1.5,8),steel,0,2.05,.35);gun.rotation.x=Math.PI/2;
  const mf=new THREE.Mesh(new THREE.SphereGeometry(.18,6,6),new THREE.MeshBasicMaterial({color:0xffd070}));mf.position.set(0,2.05,1.15);mf.visible=false;g.add(mf);
  mk(new THREE.BoxGeometry(.04,.5,.5),M(0xe8e8e0,.6),1.06,1.0,1.4);
  g.rotation.order='YXZ';g.position.set(x,H(x,z)+.55,z);g.rotation.y=Math.PI;scene.add(g);
  return {g,wheels,mf,mfT:0,hp:400,maxhp:400,v:0,yaw:Math.PI,alive:true,wa:0};
}
function driveJeep(dt){
  const j=pjeep,pos=j.g.position;
  const acc=keys.KeyW?14:keys.KeyS?-10:0;
  j.v+=acc*dt;if(!keys.KeyW&&!keys.KeyS)j.v*=(1-Math.min(1,dt*.9));j.v=Math.max(-8,Math.min(24,j.v));
  const steer=(keys.KeyA?1:0)-(keys.KeyD?1:0);
  j.yaw+=steer*dt*1.6*Math.min(1,Math.abs(j.v)/6)*(j.v<0?-1:1);
  const fx=Math.sin(j.yaw),fz=Math.cos(j.yaw);
  let nx=pos.x+fx*j.v*dt,nz=pos.z+fz*j.v*dt;
  const o={x:nx,z:nz};collide(o,2.0);if(Math.hypot(o.x-nx,o.z-nz)>.01)j.v*=.4;nx=Math.max(-76,Math.min(76,o.x));nz=Math.max(-76,Math.min(76,o.z));
  const hf=H(nx+fx*2,nz+fz*2),hb=H(nx-fx*2,nz-fz*2);
  pos.set(nx,H(nx,nz)+.55,nz);j.g.rotation.y=j.yaw;j.g.rotation.x=-Math.atan2(hf-hb,4);
  j.wa+=j.v*dt/.5;j.wheels.forEach(w=>w.rotation.x=j.wa);
  if(j.mfT>0){j.mfT-=dt;if(j.mfT<=0)j.mf.visible=false;}
  if(Math.abs(j.v)>6)for(const e of enemies){if(e.alive&&!e.dummy&&Math.hypot(e.x-nx,e.z-nz)<2.2){bloodBurst(new THREE.Vector3(e.x,1.2,e.z),8);dmg(e,90,false);j.v*=.85;}}
  P.x=nx;P.z=nz;P.y=pos.y+.95;P.vy=0;P.ground=true;
}
function chasePosJeep(){
  const h=pjeep.g.position,cp=Math.cos(P.pitch);
  const f=new THREE.Vector3(-Math.sin(P.yaw)*cp,Math.sin(P.pitch),-Math.cos(P.yaw)*cp);
  const c=h.clone().addScaledVector(f,-9);c.y+=2.6;c.y=Math.max(c.y,H(c.x,c.z)+1);return c;
}
function jeepFire(){
  const now=performance.now()/1000;if(now-lastShot<.07||!pjeep||!pjeep.alive)return;lastShot=now;
  const mz=pjeep.g.localToWorld(new THREE.Vector3(0,2.05,1.2)),pt=heliAim();
  pjeep.mf.visible=true;pjeep.mfT=.05;beep(200,.05,'square',.14);alertNear(60);
  const d=pt.clone().sub(mz).normalize();d.x+=(Math.random()-.5)*.025;d.y+=(Math.random()-.5)*.025;d.z+=(Math.random()-.5)*.025;d.normalize();
  hitscanFrom(mz,d,{dmg:14,spread:0,pellets:1});
}
function crashJeep(){
  const j=pjeep;j.alive=false;mounted=false;const pos=j.g.position;
  explode(pos.clone(),7,70);j.g.traverse(m=>{if(m.isMesh&&m.material&&m.material.color){m.material=m.material.clone();m.material.color.multiplyScalar(.2);}});
  P.x=pos.x+4;P.z=pos.z+3;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;say('Jeep destroyed!',2.5);hurt(30);
}
