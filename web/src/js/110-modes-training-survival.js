/* ============ MODES: TRAINING AND SURVIVAL ============ */
const MODES={
  training:Object.assign({},lbase(LEVELS[0]),{n:'Training',txt:'Shooting range: targets and vehicles respawn, ammo is unlimited and you cannot die. Q switches the weapon in the current slot (slots 1–4).',en:0,mines:0,kits:0,houses:2,ruins:0,seed:5,reward:0,medals:0,xp:0}),
  survival:Object.assign({},lbase(LEVELS[2]),{n:'Survival',txt:'Survive as long as you can. The enemy waves keep getting stronger.',en:0,mines:6,kits:2,houses:12,ruins:4,seed:91,reward:0,medals:0,xp:0}),
  tdm:Object.assign({},lbase(LEVELS[1]),{n:'Team Match vs Bots',txt:'Team of players versus bots. First to 25 kills wins, or whoever has more kills after 6 minutes.',en:0,mines:0,kits:3,houses:12,ruins:5,seed:57,reward:0,medals:0,xp:0})
};
function startMode(name){
  curMode=name;curLevel=0;L=MODES[name];show('game');$('loading').style.display='grid';
  setTimeout(()=>{try{doStart();}catch(e){console.error(e);$('loading').textContent='Loading error: '+e.message;return;}$('loading').style.display='none';},40);
}
function spawnTraining(){
  const pos=[[-8,58],[0,52],[8,58],[-14,44],[14,44],[-5,36],[5,36],[0,26]];
  for(const [x,z] of pos){const e=mkEnemy(x,z);e.dummy=true;e.mhp=e.hp;e.g.rotation.y=Math.atan2(-x,70-z);enemies.push(e);}
  const a=mkVehicle('apc',-24,30,0);a.dummy=true;a.g.rotation.y=Math.atan2(24,40);vehicles.push(a);
  const t=mkVehicle('tank',24,30,0);t.dummy=true;t.g.rotation.y=Math.atan2(-24,40);vehicles.push(t);
}
function trainCycle(){
  const k=slots[cur],cat=WEAPONS[k].cat,ids=Object.keys(WEAPONS).filter(i=>WEAPONS[i].cat===cat);
  const nk=ids[(ids.indexOf(k)+1)%ids.length];slots[cur]=nk;const w=WEAPONS[nk];
  wp[nk]=w.mag?{mag:magOf(nk),res:w.res}:(w.cat==='grenade'?{n:3}:{});reloadT=0;buildView();say(w.name,1.3);hud();
}
function trainRefill(){
  for(const k of slots){const w=WEAPONS[k];if(!wp[k])continue;if(w.mag){wp[k].mag=magOf(k);wp[k].res=w.res;}else if(w.cat==='grenade')wp[k].n=3;}
}
function initSurvival(){wave=0;survPaid=false;surv={timer:4,alive:false};}
function survLeft(){return enemies.filter(e=>e.alive).length+vehicles.filter(v=>v.alive&&v.type!=='jet').length;}
function addKit(x,z){
  const k=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.35),stdM(null,{color:lin(0xe8e8e0),roughness:.6}));const rm=new THREE.MeshBasicMaterial({color:0xc01818});
  const c1=new THREE.Mesh(new THREE.BoxGeometry(.3,.05,.1),rm),c2=new THREE.Mesh(new THREE.BoxGeometry(.1,.05,.3),rm);c1.position.y=.17;c2.position.y=.17;k.add(c1,c2);
  k.position.set(x,H(x,z)+.2,z);k.castShadow=true;scene.add(k);kits.push({k,x,z,used:false});
}
function spawnWave(){
  wave++;
  const n=Math.min(30,6+wave*3);
  L.acc=Math.min(.85,.5+wave*.02);
  for(let i=0;i<n;i++){const [x,z]=spot(Math.random,32,1.8,72);const e=mkEnemy(x,z);e.hp=Math.round(60*(1+.07*wave));e.alerted=true;enemies.push(e);}
  const kin=Math.min(2,Math.floor(wave/4));let extra='';
  if(wave>=3&&wave%3===0){const c=Math.min(3,Math.floor(wave/3));for(let i=0;i<c;i++){const [x,z]=spot(Math.random,45,7,70);vehicles.push(mkVehicle('apc',x,z,kin));}extra+=' + '+c+' APC';}
  if(wave>=5&&wave%5===0){const a=Math.random()*6.283;vehicles.push(mkVehicle('heli',Math.cos(a)*90,Math.sin(a)*90+30,kin));extra+=' + helicopter';}
  if(wave>=8&&wave%4===0){const [x,z]=spot(Math.random,50,8,70);vehicles.push(mkVehicle('tank',x,z,kin));extra+=' + tank';}
  say('Wave '+wave+': '+n+' enemies'+extra,4);beep(600,.3,'sawtooth',.2);hud();
}
function updateSurvival(dt){
  if(over||!surv)return;
  if(!surv.alive){surv.timer-=dt;if(surv.timer<=0){spawnWave();surv.alive=true;}return;}
  if(survLeft()===0){
    surv.alive=false;surv.timer=8;
    for(const e of enemies)scene.remove(e.g);enemies=[];
    for(const v of vehicles)scene.remove(v.g);vehicles=[];
    for(const k of slots){const w=WEAPONS[k];if(!wp[k])continue;if(w.mag)wp[k].res=Math.min(w.res*2,wp[k].res+Math.ceil(w.res/2));else if(w.cat==='grenade')wp[k].n=3;}
    P.hp=Math.min(100,P.hp+30);
    for(let i=0;i<2;i++)addKit(P.x+(Math.random()-.5)*14,P.z+(Math.random()-.5)*14);
    say('Wave '+wave+' cleared! Ammo and health restored. Next wave in 8 s.',4);hud();
  }
}
function survPay(){
  if(survPaid)return null;survPaid=true;
  const w=Math.max(0,wave-1),rw=w*40+killed*3,md=Math.floor(w/3);
  S.wp+=rw;S.medals+=md;S.xp+=w*10;S.bestWave=Math.max(S.bestWave||0,w);save();
  return 'You finished '+w+' waves, kills: '+killed+'. Record: '+S.bestWave+' waves. Reward: '+rw+' Weapoints'+(md?', '+md+' medals':'')+', '+(w*10)+' XP.';
}

