/* ============ TEAM MATCH, DEATH AND RESPAWN ============ */
function initTdm(){
  tdm={limit:25,time:360,red:0,t:0};
  for(let i=0;i<6;i++){const [x,z]=spot(Math.random,36,1.8,72);const e=mkEnemy(x,z);e.alerted=true;enemies.push(e);}
}
function respawnBot(e){
  const [x,z]=spot(Math.random,36,1.8,72);
  e.x=x;e.z=z;e.hp=L.hp;e.alive=true;e.dt=0;e.rt=0;e.alerted=true;e.stun=0;
  e.g.rotation.x=0;e.g.position.set(x,H(x,z),z);e.legs[0].hip.rotation.x=0;e.legs[1].hip.rotation.x=0;
}
function updateTDM(dt){
  if(over||!tdm)return;
  tdm.t+=dt;
  if(killed>=tdm.limit)endMatch(true);else if(tdm.red>=tdm.limit)endMatch(false);else if(tdm.t>=tdm.time)endMatch(killed>=tdm.red);
}
function endMatch(won){
  over=true;
  const rw=(won?200:80)+killed*4,md=won?10:0,xp=won?80:30;
  S.wp+=rw;S.medals+=md;S.xp+=xp;save();
  const txt=(won?'The player team won ':'The bots won ')+killed+' : '+tdm.red+'. Reward: '+rw+' Weapoints'+(md?', '+md+' medals':'')+'.';
  NET.endInfo=[won?1:2,won?'Victory':'Defeat',txt,rw,md,xp];
  setTimeout(()=>{if(NET.role==='solo')run=false;try{document.exitPointerLock();}catch(e){}$('scope').style.display='none';
    $('endT').textContent=won?'Victory':'Defeat';$('endP').textContent=txt;$('nextBtn').style.display='none';$('end').classList.add('on');},700);
}
function canRespawn(){
  if(curMode==='tdm')return true;
  return NET.role==='host'&&curMode===null&&allies.some(a=>a.remote&&a.alive);
}
function playerDown(){
  pDead=true;respT=curMode==='tdm'?6:15;
  S.deaths++;if(curMode==='tdm'&&tdm)tdm.red++;
  splat(8);say('You died. Back in the game in '+respT+' s.',3);save();hud();
}
function respawnPlayer(){
  pDead=false;P.hp=100;const sx=[0,-3,3][NET.role==='solo'?0:NET.mi]||0;
  P.x=sx;P.z=70;P.y=H(P.x,70)+1.7;P.vy=0;say('Back in the fight!',2);hud();
}
function failMission(msg){
  over=true;S.deaths++;const sv=(curMode==='survival')?survPay():null;if(!sv)S.wp+=10;save();
  const txt=sv||(msg?msg+' You get 10 Weapoints for the effort.':'Mission failed. You get 10 Weapoints for the effort.');
  const ttl=msg?'Mission failed':'You died';
  NET.endInfo=[2,ttl,txt,10,0,0];
  if(NET.role==='solo')run=false;
  try{document.exitPointerLock();}catch(e){}
  splat(8);$('endT').textContent=ttl;$('endP').textContent=txt;$('nextBtn').style.display='none';$('scope').style.display='none';$('end').classList.add('on');hud();
}
function allyHit(a,d){
  if(a.remote&&a.ridx>0&&a.ridx===NET.heliPilot&&pheli&&pheli.alive){pheli.hp-=d*.7;if(pheli.hp<=0)crashHeliRemote(a);return;}
  a.hp-=d;a.flinch=.25;
  if(a.hp<=0&&a.alive){if(a.remote)remoteDown(a);else{a.alive=false;a.dt=0;say('An ally went down!',2);beep(200,.3,'triangle',.2);}}
}
function remoteDown(a){
  a.alive=false;a.dt=0;a.respT=curMode==='tdm'?6:15;
  if(curMode==='tdm'&&tdm)tdm.red++;
  say(a.name+' padl!',2);
  if(curMode===null&&!over&&pDead&&!allies.some(x=>x.remote&&x.alive))failMission();
}
function pickTarget(x,z){
  let best=null,bd=1e9;
  if(!pDead){bd=Math.hypot(P.x-x,P.z-z);best={x:P.x,y:P.y,z:P.z,rem:null};}
  for(const a of allies){if(!a.remote||!a.alive)continue;const d=Math.hypot(a.x-x,a.z-z);if(d<bd){bd=d;best={x:a.x,y:H(a.x,a.z)+1.6,z:a.z,rem:a};}}
  if(best)best.eye=new THREE.Vector3(best.x,best.y,best.z);
  return best;
}
function hitTgt(tg,d,from){if(tg&&tg.rem)allyHit(tg.rem,d);else hurt(d,from);}
function addMine(x,z){
  const m=new THREE.Group();const disc=new THREE.Mesh(new THREE.CylinderGeometry(.28,.3,.07,14),stdM(null,{color:lin(0x3b3d2c),roughness:.7,metalness:.4}));
  const led=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),new THREE.MeshBasicMaterial({color:0xff2200}));led.position.y=.06;
  m.add(disc,led);m.position.set(x,H(x,z)+.04,z);scene.add(m);mines.push({m,led,x,z,live:true});
}

