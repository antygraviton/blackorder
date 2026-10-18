/* ============ ZOMBIE ARENA ============ */
function initZombie(){zwave=0;survPaid=false;zs={timer:4,alive:false};}
function mkZombie(x,z,kind){
  const e=mkEnemy(x,z,{noGun:true});e.zombie=true;e.alerted=true;
  const K={walker:{hp:60,spd:2.3,dm:10,sc:1},runner:{hp:40,spd:4.4,dm:8,sc:.95},brute:{hp:300,spd:1.7,dm:26,sc:1.4},tyrant:{hp:1400,spd:2.6,dm:38,sc:1.8}}[kind];
  e.hp=Math.round(K.hp*DIFF().hp*(1+zwave*.04));e.mhp=e.hp;e.spd=K.spd;e.zdm=K.dm;e.zk=kind;e.g.scale.setScalar(K.sc);e.boss=(kind==='tyrant');e.cd=0;
  e.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.color){o.material=o.material.clone();o.material.color.set(kind==='tyrant'?0x8a3a3a:0x8fa882);}});
  return e;
}
function spawnZWave(){
  zwave++;const n=Math.min(36,8+zwave*4);
  for(let i=0;i<n;i++){const [x,z]=spot(Math.random,28,1.6,72),r=Math.random();
    const kind=(zwave>=3&&r<.12)?'brute':(r<.2+Math.min(.35,zwave*.04))?'runner':'walker';enemies.push(mkZombie(x,z,kind));}
  if(zwave%5===0){const [x,z]=spot(Math.random,40,2,70);enemies.push(mkZombie(x,z,'tyrant'));say('Wave '+zwave+': TYRANT and '+n+' undead!',4);}
  else say('Wave '+zwave+': '+n+' undead',3.5);
  beep(120,.6,'sawtooth',.3);hud();
}
function updateZombie(dt){
  if(over||!zs)return;
  if(!zs.alive){zs.timer-=dt;if(zs.timer<=0){spawnZWave();zs.alive=true;}return;}
  if(enemies.filter(e=>e.alive).length===0){
    zs.alive=false;zs.timer=8;
    for(const e of enemies)scene.remove(e.g);enemies=[];
    for(const k of slots){const w=WEAPONS[k];if(!wp[k])continue;if(w.mag)wp[k].res=Math.min(w.res*2,wp[k].res+Math.ceil(w.res/2));else if(w.cat==='grenade')wp[k].n=3+(hasPerk('nades')?2:0);}
    P.hp=Math.min(100,P.hp+30);
    for(let i=0;i<2;i++)addKit(P.x+(Math.random()-.5)*14,P.z+(Math.random()-.5)*14);
    S.rec=S.rec||{};S.rec.zomb=Math.max(S.rec.zomb||0,zwave);save();achCheck();
    say('Wave '+zwave+' cleared! Next in 8 s.',4);hud();
  }
}
function zPay(){
  if(survPaid)return null;survPaid=true;
  const w=Math.max(0,zwave-1),rw=w*45+killed*4,md=Math.floor(w/3);
  S.wp+=rw;S.medals+=md;S.xp+=w*12;S.rec=S.rec||{};S.rec.zomb=Math.max(S.rec.zomb||0,w);save();achCheck();
  return 'You survived '+w+' waves of undead, kills: '+killed+'. Record: '+S.rec.zomb+' waves. Reward: '+rw+' Weapoints'+(md?', '+md+' medals':'')+', '+(w*12)+' XP.';
}
function zombieTick(e,dt){
  const tg=pickTarget(e.x,e.z);let tA=null,bd=tg?Math.hypot(tg.x-e.x,tg.z-e.z):1e9;
  for(const a of allies){if(a.alive&&!a.remote&&!a.hostage){const d=Math.hypot(a.x-e.x,a.z-e.z);if(d<bd){bd=d;tA=a;}}}
  const tx=tA?tA.x:(tg?tg.x:e.x),tz=tA?tA.z:(tg?tg.z:e.z);
  const dx=tx-e.x,dz=tz-e.z,dist=Math.hypot(dx,dz)||1;
  let da=Math.atan2(dx,dz)-e.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));e.g.rotation.y+=da*Math.min(1,dt*6);
  let walking=false;
  if(e.flinch>0){e.flinch-=dt;e.g.rotation.x=-.18*(e.flinch/.25);}else e.g.rotation.x=0;
  if(dist>1.6){const sp=e.spd*(e.flinch>0?.4:1);e.x+=dx/dist*sp*dt;e.z+=dz/dist*sp*dt;collide(e,.5);e.g.position.set(e.x,H(e.x,e.z),e.z);walking=true;}
  else{e.cd-=dt;if(e.cd<=0){e.cd=.9;if(tA)allyHit(tA,e.zdm);else if(tg)hitTgt(tg,e.zdm,e.g.position);beep(90,.1,'sawtooth',.1);}}
  if(walking){e.walk+=dt*(e.zk==='runner'?12:7);const s1=Math.sin(e.walk);e.legs[0].hip.rotation.x=s1*.7;e.legs[1].hip.rotation.x=-s1*.7;e.legs[0].knee.rotation.x=Math.max(0,-s1)*.9;e.legs[1].knee.rotation.x=Math.max(0,s1)*.9;}
  else e.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});
}
