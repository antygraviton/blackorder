/* ============ MULTIPLAYER (room: live sharing between players) ============ */
const NET={api:undefined,room:null,host:false,role:'solo',code:'',myPeer:'',unsub:[],go:null,roster:[],ro:null,mi:0,npc:2,t:0,seq:0,fx:[],fxId:0,fxSeen:0,shotN:0,sent:[],snap:null,seqSeen:-1,msgSeen:0,msgId:0,lastMsg:null,endInfo:null,avatars:{},hostLost:0,joinedAt:0,first:true,lobbyMode:'coop',lobbyLv:0};
const qn=v=>Math.round(v*10);
const wid=w=>Object.keys(WEAPONS).find(k=>WEAPONS[k]===w)||'';
async function netApi(){
  if(NET.api!==undefined)return NET.api;
  try{NET.api=(window.claude&&window.claude.use)?await window.claude.use('room'):null;}catch(e){NET.api=null;}
  if(!NET.api){try{await loadPeerJs();NET.api=window.Peer?makePeerRoomApi(window.Peer):null;}catch(e){NET.api=null;}}
  return NET.api;
}
function fxPush(arr){if(NET.role!=='host')return;NET.fxId++;NET.fx.push([NET.fxId,...arr]);if(NET.fx.length>10)NET.fx.shift();}
function netShot(code,w,o,d){
  NET.shotN++;NET.sent.push([NET.shotN,code,w,qn(o.x),qn(o.y),qn(o.z),Math.round(d.x*1000),Math.round(d.y*1000),Math.round(d.z*1000)]);
  if(NET.sent.length>8)NET.sent.shift();NET.t=1;
}
/* ---- lobby ---- */
const mpMsg=t=>{$('mpStatus').textContent=t;};
function mpUI(inRoom){
  $('mpStart').style.display=inRoom?'none':'block';$('mpLobby').style.display=inRoom?'block':'none';
  $('mpHostCfg').style.display=(inRoom&&NET.host)?'block':'none';$('mpClientInfo').style.display=(inRoom&&!NET.host)?'block':'none';
}
function mpFillMissions(){
  const sel=$('mpMission');sel.innerHTML='';
  LEVELS.forEach((l,i)=>{const o=document.createElement('option');o.value=i;o.textContent='Campaign '+(l.camp+1)+' – mission '+(idxIn(i)+1)+': '+l.n;sel.appendChild(o);});
  sel.value=NET.lobbyLv;
}
function mpModeTabs(){
  document.querySelectorAll('[data-mpmode]').forEach(b=>b.classList.toggle('on',b.dataset.mpmode===NET.lobbyMode));
  $('mpMissionWrap').style.display=NET.lobbyMode==='coop'?'flex':'none';
}
async function mpEnter(code,host){
  if(NET.room||NET.joining)return;
  NET.joining=true;
  const api=await netApi();
  if(!api){NET.joining=false;mpMsg('Online play is not available: the connection library could not be loaded. Check your internet connection and reload the page.');return;}
  try{NET.room=await api.join('cr-'+code.toLowerCase());}catch(e){NET.joining=false;mpMsg('Could not join the game ('+((e&&e.code)||'error')+').');return;}
  NET.joining=false;
  NET.code=code;NET.host=host;NET.joinedAt=Date.now();NET.ro=null;NET.go=null;NET.role='solo';
  $('partyCode').textContent=code;
  NET.room.presence({n:S.name,r:host?'h':'c'});
  if(host)NET.room.presence({md:NET.lobbyMode,lv:NET.lobbyLv});
  NET.unsub.push(NET.room.onPeers(mpPeers,()=>{}));
  clearInterval(NET.poll);NET.poll=setInterval(()=>{if(NET.room&&NET.role==='solo')mpPeers({peers:NET.room.peers()});},1000);
  mpFillMissions();mpModeTabs();mpUI(true);mpMsg('');
}
function mpLeave(msg){
  clearInterval(NET.poll);
  NET.unsub.forEach(f=>{try{f();}catch(e){}});NET.unsub=[];
  if(NET.room){try{NET.room.leave();}catch(e){}}
  NET.room=null;NET.host=false;NET.role='solo';NET.go=null;NET.ro=null;NET.avatars={};
  mpUI(false);if(msg)mpMsg(msg);
}
/** Name shown in the lobby; players with the same name get a number so they can be told apart. Also HTML-escaped. */
function lobbyName(ro,peers,i){
  const nm=id=>{const q=peers.find(x=>x.peer===id);return String((q&&q.presence.n)||'Player');};
  const mine=nm(ro[i]);let k=1;for(let j=0;j<i;j++)if(nm(ro[j])===mine)k++;
  return (mine+(k>1?' ('+k+')':'')).replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
}
/** Client in a running game: follow the host's pause flag, and leave when the host closes the game. */
function clientPauseSync(host){
  const paused=!!(host&&host.presence.ps);
  if(paused&&!NET.hostPaused){
    NET.hostPaused=true;run=false;try{document.exitPointerLock();}catch(e){}
    $('pause').classList.remove('on');$('hostPauseGo').disabled=true;$('hostPauseP').textContent='The host paused the game. Please wait…';$('hostPause').classList.add('on');
  } else if(!paused&&NET.hostPaused){$('hostPauseGo').disabled=false;$('hostPauseP').textContent='The host resumed the game.';}
  if(host&&!host.presence.go&&Date.now()-NET.goStart>1500){stopGame();show('multi');}
}
function mpPeers(ch){
  if(NET.role==='client'&&NET.room){clientPauseSync(ch.peers.find(p=>p.presence&&p.presence.r==='h'));return;}
  if(NET.role!=='solo'||!NET.room)return;
  const peers=ch.peers,me=peers.find(p=>p.sameTab);if(me)NET.myPeer=me.peer;
  const hostP=peers.find(p=>p.presence&&p.presence.r==='h');
  if(NET.host){
    let ro=(NET.ro||[NET.myPeer]).filter(id=>peers.some(p=>p.peer===id));
    if(ro.indexOf(NET.myPeer)<0)ro.unshift(NET.myPeer);
    for(const p of peers){if(ro.length>=3)break;if(ro.indexOf(p.peer)<0&&p.presence&&p.presence.r==='c')ro.push(p.peer);}
    if(JSON.stringify(ro)!==JSON.stringify(NET.ro)){NET.ro=ro;NET.room.presence({ro});}
  }
  const ro=(NET.host?NET.ro:(hostP&&hostP.presence.ro))||[];
  const t=$('mpPlayers');t.innerHTML='';
  for(let i=0;i<3;i++){
    const id=ro[i],p=id&&peers.find(x=>x.peer===id);
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+(i+1)+'</td><td>'+(p?(lobbyName(ro,peers,i)+(i===0?' (host)':'')+(p.sameTab?' (you)':'')):'<span class="tag">free slot (an AI ally takes it)</span>')+'</td>';
    t.appendChild(tr);
  }
  if(!NET.host){
    if(!hostP){if(Date.now()-NET.joinedAt>4000)$('mpClientText').textContent='No host found for this code.';return;}
    if(ro.length&&ro.indexOf(NET.myPeer)<0&&Date.now()-NET.joinedAt>2500){mpLeave('The game is full (max. 3 players).');return;}
    const md=hostP.presence.md==='tdm'?'Team Match vs Bots':'Co-op campaign'+(hostP.presence.lv!==undefined&&LEVELS[hostP.presence.lv]?' – '+LEVELS[hostP.presence.lv].n:'');
    const g=hostP.presence.go,inGame=!!(g&&g.ro&&g.ro.indexOf(NET.myPeer)>=0);
    const s=hostP.presence.s,live=!!(g&&s&&s.st&&!s.st[2]);
    $('mpRejoin').style.display=(inGame&&g.id===NET.goDone&&live)?'':'none';
    if(g&&inGame&&g.id!==NET.goDone&&(!NET.go||NET.go.id!==g.id)){mpGo(g);return;}
    $('mpClientText').textContent=!g?'Host selected: '+md+'. Waiting for the host to start the game…'
      :!inGame?'A game is running without you. Wait until the host returns to the lobby.'
      :live?'You left the running game. Press "Rejoin the game" to continue.':'The game is over. Waiting for the host to return to the lobby…';
  }
}
function mpStartGame(){
  if(!NET.host||!NET.room)return;
  const ro=NET.ro&&NET.ro.length?NET.ro.slice():[NET.myPeer];
  NET.roster=ro;NET.mi=0;NET.npc=Math.max(0,Math.min(2,3-ro.length));
  NET.role='host';NET.avatars={};NET.fx=[];NET.fxId=0;NET.seq=0;NET.lastMsg=null;NET.endInfo=null;NET.sent=[];NET.t=1;
  const md=NET.lobbyMode;
  if(md==='tdm'){curMode='tdm';curLevel=0;L=MODES.tdm;}else{curMode=null;curLevel=NET.lobbyLv;L=LEVELS[curLevel];}
  show('game');$('loading').style.display='grid';
  setTimeout(()=>{
    try{doStart();}catch(e){console.error(e);$('loading').textContent='Loading error: '+e.message;return;}
    NET.go={id:Date.now(),md,lv:curLevel,ro,np:NET.npc,
      en:enemies.map(e=>[qn(e.x),qn(e.z)]),v:vehicles.map(v=>[v.type,qn(v.g.position.x),qn(v.g.position.z)]),
      mi:mines.map(m=>[qn(m.x),qn(m.z)]),ki:kits.map(k=>[qn(k.x),qn(k.z)])};
    NET.room.presence({go:NET.go});
    $('loading').style.display='none';
  },40);
}
function mpGo(g){
  NET.go=g;NET.role='client';NET.roster=g.ro;NET.mi=Math.max(0,g.ro.indexOf(NET.myPeer));NET.avatars={};
  NET.fxSeen=0;NET.msgSeen=0;NET.seqSeen=-1;NET.snap=null;NET.first=true;NET.sent=[];NET.shotN=0;NET.t=1;NET.hostLost=0;NET.endInfo=null;NET.goStart=Date.now();NET.hostPaused=false;
  if(g.md==='tdm'){curMode='tdm';curLevel=0;L=MODES.tdm;}else{curMode=null;curLevel=g.lv;L=LEVELS[g.lv];}
  show('game');$('loading').style.display='grid';
  setTimeout(()=>{try{doStart();}catch(e){console.error(e);$('loading').textContent='Loading error: '+e.message;return;}$('loading').style.display='none';},40);
}
/** Leave a running online game but stay in the room, so the lobby (player list, host's start button) is shown again. */
function mpBackToLobby(){
  NET.goDone=NET.go?NET.go.id:NET.goDone;
  for(const a of allies)if(a.remote&&a.g&&scene)scene.remove(a.g);
  NET.avatars={};NET.role='solo';NET.go=null;NET.roster=[];NET.fx=[];NET.sent=[];NET.snap=null;NET.ro=null;NET.joinedAt=Date.now();
  NET.hostPaused=false;$('hostPause').classList.remove('on');
  Promise.resolve(NET.room.presence({go:null,s:null,sh:null,p:null,ps:null})).catch(()=>{});
  mpUI(true);
}
function netLeave(){
  mpLeave();
  for(const a of allies)if(a.remote)scene&&scene.remove(a.g);
  NET.role='solo';
}
$('multiBack').onclick=()=>{if(NET.room)mpLeave();show('menu');};
$('mpCreate').onclick=async()=>{S.name=($('mpName').value||S.name).trim().slice(0,14)||'PLAYER';save();await mpEnter(newCode(),true);};
$('joinBtn').onclick=async()=>{const c=$('joinCode').value.trim().toUpperCase();if(c.length<4){mpMsg('Enter the code from the host.');return;}S.name=($('mpName').value||S.name).trim().slice(0,14)||'PLAYER';save();await mpEnter(c,false);};
$('mpRejoin').onclick=()=>{
  const hp=NET.room&&NET.room.peers().find(p=>p.presence&&p.presence.r==='h'),g=hp&&hp.presence.go;
  if(g&&g.ro&&g.ro.indexOf(NET.myPeer)>=0){NET.goDone=0;mpGo(g);}
};
$('hostPauseGo').onclick=()=>{NET.hostPaused=false;$('hostPause').classList.remove('on');lockMouse();run=true;lastT=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);};
$('hostPauseLeave').onclick=()=>{stopGame();show('multi');};
$('mpLeaveBtn').onclick=()=>mpLeave();$('mpLeaveBtn2').onclick=()=>mpLeave();
$('mpStartBtn').onclick=()=>mpStartGame();
$('mpMission').onchange=e=>{NET.lobbyLv=+e.target.value;if(NET.room)NET.room.presence({lv:NET.lobbyLv});};
document.querySelectorAll('[data-mpmode]').forEach(b=>b.onclick=()=>{NET.lobbyMode=b.dataset.mpmode;mpModeTabs();if(NET.room)NET.room.presence({md:NET.lobbyMode});});
function newCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<6;i++)c+=a[Math.floor(Math.random()*a.length)];return c;}
$('mpName').value=S.name;
/* ---- avatars of other players ---- */
function nameTag(g,text){
  const c=cvs(256,64),x=c.getContext('2d');x.font='bold 34px sans-serif';x.textAlign='center';x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,8,256,48);x.fillStyle='#e7e3d4';x.fillText(String(text).slice(0,14),128,44);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false,fog:false}));sp.scale.set(2,.5,1);sp.position.y=2.9;g.add(sp);
}
function newAvatar(name,idx){
  const a=mkAlly(0,0,idx);a.remote=true;a.name=name;a.hp=100;a.alive=true;a.px=0;a.pz=0;a.py=0;a.pyaw=0;a.respT=0;a.lastSh=0;a.lastShot=0;
  nameTag(a.g,name);allies.push(a);return a;
}
function avatarFor(pr,idx){
  let a=NET.avatars[pr.peer];
  if(!a){a=NET.avatars[pr.peer]=newAvatar(pr.presence.n||'Player',idx);const p=pr.presence.p;if(p){a.x=a.px=p[0]/10;a.z=a.pz=p[2]/10;}}
  return a;
}
function readAvatarPresence(a,pr){
  const p=pr.presence.p;a.use=!!pr.presence.u;
  if(p&&a.alive){a.px=p[0]/10;a.py=p[1]/10;a.pz=p[2]/10;a.pyaw=p[3]/100;}
  const sh=pr.presence.sh;
  if(sh&&sh.length){const id=sh[sh.length-1][0];if(id!==a.lastSh){a.lastSh=id;a.mf.visible=true;a.mfT=.06;}}
}
function updateAvatars(dt){
  for(const a of allies){
    if(!a.remote)continue;
    if(a.mfT>0){a.mfT-=dt;if(a.mfT<=0)a.mf.visible=false;}
    if(a.marker)a.marker.rotation.y+=dt*2;
    if(!a.alive){
      if(a.dt<1){a.dt+=dt*2.2;const q=Math.min(1,a.dt);a.g.rotation.x=-q*1.5;a.g.position.y=H(a.x,a.z)-q*.05;a.legs[0].hip.rotation.x=q*.5;a.legs[1].hip.rotation.x=-q*.3;}
      continue;
    }
    if(a.dt>0){a.dt=0;a.g.rotation.x=0;a.legs[0].hip.rotation.x=0;a.legs[1].hip.rotation.x=0;}
    const k=Math.min(1,dt*10),ox=a.x,oz=a.z;
    a.x+=(a.px-a.x)*k;a.z+=(a.pz-a.z)*k;a.g.position.set(a.x,H(a.x,a.z),a.z);
    const ty=a.pyaw+Math.PI;let da=ty-a.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));a.g.rotation.y+=da*k;
    const mv=Math.hypot(a.x-ox,a.z-oz)/Math.max(dt,.001);
    if(mv>.5){a.walk+=dt*8;const s1=Math.sin(a.walk);a.legs[0].hip.rotation.x=s1*.7;a.legs[1].hip.rotation.x=-s1*.7;a.legs[0].knee.rotation.x=Math.max(0,-s1)*.9;a.legs[1].knee.rotation.x=Math.max(0,s1)*.9;}
    else a.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});
  }
}
/* ---- host ---- */
function hostSnap(){
  const ro=NET.roster,pl=[];
  for(let i=0;i<ro.length;i++){
    if(i===0)pl.push([Math.max(0,Math.round(P.hp)),pDead?0:1,Math.ceil(respT)]);
    else{const a=NET.avatars[ro[i]];pl.push(a?[Math.max(0,Math.round(a.hp)),a.alive?1:0,Math.ceil(a.respT||0)]:[100,1,0]);}
  }
  const s={q:++NET.seq,
    e:enemies.map(e=>[qn(e.x),qn(e.z),Math.round(e.g.rotation.y*100),(e.alive?1:0)|((e.mf&&e.mf.visible)?2:0)]),
    v:vehicles.map(v=>[qn(v.g.position.x),qn(v.g.position.y),qn(v.g.position.z),Math.round(v.g.rotation.y*100),Math.round(v.g.rotation.x*100),v.turret?Math.round(v.turret.rotation.y*100):0,(v.alive?1:0)|((v.mf&&v.mf.visible)?2:0)|(v.g.visible?4:0)]),
    a:allies.filter(a=>!a.remote).map(a=>[qn(a.x),qn(a.z),Math.round(a.g.rotation.y*100),a.alive?1:0]),
    pl,st:[killed,total>1e8?0:total,over?1:0,tdm?Math.round(tdm.t):0,tdm?tdm.red:0],
    mn:mines.map(m=>m.live?'1':'0').join(''),ki:kits.map(k=>k.used?'1':'0').join(''),fx:NET.fx};
  if(L.ob&&L.ob!=='kill'){const h=allies.find(a=>a.hostage);s.ob=[alarm?1:0,h&&h.free?1:0,objs.map(o=>[Math.round(o.prog*1000),o.done?1:0])];}
  if(NET.lastMsg)s.m=NET.lastMsg;
  if(NET.endInfo)s.o=NET.endInfo;
  return s;
}
function hostShot(a,s){
  const code=s[1],W=WEAPONS[s[2]];if(!W)return;
  const o=new THREE.Vector3(s[3]/10,s[4]/10,s[5]/10),d=new THREE.Vector3(s[6]/1000,s[7]/1000,s[8]/1000).normalize();
  if(code==='g'){alertAt(o,50);hitscanFrom(o,d,W);}
  else if(code==='m'||code==='b'){
    for(const e of enemies){if(!e.alive)continue;const dx=e.x-o.x,dz=e.z-o.z;
      if(Math.hypot(dx,dz)<2.5&&(dx*d.x+dz*d.z)>0){bloodBurst(new THREE.Vector3(e.x,1.3,e.z),8);dmg(e,code==='b'?90:W.dmg,true);if(W.kind==='shield')e.stun=1.5;}}
    for(const v of vehicles){if(!v.alive||v.type!=='apc')continue;if(Math.hypot(v.g.position.x-o.x,v.g.position.z-o.z)<v.rad+1.6)vdmg(v,W.dmg,false);}
  }
  else if(code==='r')spawnProj(W,'rocket',o,d);
  else if(code==='n')spawnProj(W,'napalm',o,d);
  else if(code==='a')spawnProj(W,'arrow',o,d);
  else if(code==='s')stunConeAt(W,o,d);
  else if(code==='x')throwNadeAt(W,o,d);
}
function hostRead(dt){
  const peers=NET.room.peers(),ro=NET.roster;
  for(const pr of peers){
    if(pr.isMe)continue;
    const idx=ro.indexOf(pr.peer);if(idx<1||!pr.presence.p)continue;
    const a=avatarFor(pr,idx);
    readAvatarPresence(a,pr);
    const sh=pr.presence.sh;
    if(sh)for(const s of sh){if(typeof s[1]==='string'&&s[0]>(a.lastShot||0)){a.lastShot=s[0];if(a.alive&&!pDeadAll())hostShot(a,s);}}
  }
  for(const id in NET.avatars){
    if(!peers.some(p=>p.peer===id)){const a=NET.avatars[id];scene.remove(a.g);const i=allies.indexOf(a);if(i>=0)allies.splice(i,1);delete NET.avatars[id];
      if(curMode===null&&!over&&pDead&&!allies.some(x=>x.remote&&x.alive))failMission();}
  }
  for(const a of allies){
    if(!a.remote||a.alive)continue;
    a.respT-=dt;
    if(a.respT<=0){a.alive=true;a.hp=100;a.dt=0;a.x=a.px=0;a.z=a.pz=70;}
  }
}
const pDeadAll=()=>false;
function alertAt(p,r){for(const e of enemies){if(e.alive&&Math.hypot(e.x-p.x,e.z-p.z)<r)e.alerted=true;}}
function hitscanFrom(o,dir,w){
  const n=w.pellets||1,sp=w.spread||0;
  const targets=obstMesh.concat(...enemies.filter(e=>e.alive).map(e=>e.parts),...vehicles.filter(v=>v.alive&&v.g.visible).map(v=>v.parts));
  for(let i=0;i<n;i++){
    const d=dir.clone();d.x+=(Math.random()-.5)*sp*2;d.y+=(Math.random()-.5)*sp*2;d.z+=(Math.random()-.5)*sp*2;d.normalize();
    ray.set(o,d);ray.far=250;
    const hit=ray.intersectObjects(targets,false)[0],gh=groundHit(o,d);
    if(hit&&(!gh||hit.distance<gh.distanceTo(o))){
      if(hit.object.userData.enemy){const e=enemies.find(x=>x.g===hit.object.userData.enemy);if(e){const head=hit.object.userData.tag==='head';bloodBurst(hit.point,head?10:6);dmg(e,w.dmg*(head?2.5:1),head);}}
      else if(hit.object.userData.vehicle)vdmg(hit.object.userData.vehicle,w.dmg,false);
      else if(hit.object.userData.obj)objHit(hit.object.userData.obj,w.dmg);
    }
  }
}
/* ---- client ---- */
function explodeVis(p){
  boom();shake=Math.max(shake,.03);
  const f=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,12),new THREE.MeshBasicMaterial({color:0xffb347,transparent:true,opacity:.8}));f.position.copy(p);scene.add(f);setTimeout(()=>scene.remove(f),160);
  for(let i=0;i<10;i++)dustBurst(p,0x5a4a38);
}
function visProj(t,o,v){
  let m;
  if(t==='a'){m=new THREE.Group();const sh=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.7,5),GM.wood);sh.rotation.x=Math.PI/2;m.add(sh);}
  else if(t==='n')m=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:0xe66e1e}));
  else if(t==='s')m=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshBasicMaterial({color:0xffa030}));
  else{m=new THREE.Group();const b=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,8),stdM(null,{color:lin(0x3c4632)}));b.rotation.x=Math.PI/2;m.add(b);}
  m.position.copy(o);scene.add(m);m.lookAt(o.clone().add(v));
  vprojs.push({m,v:v.clone(),g:t==='r'?.6:t==='s'?1.5:6,t:7});
}
function visNade(k,o,v){
  const m=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),GM.gren);m.position.copy(o);scene.add(m);
  vnades.push({m,v:v.clone(),t:k==='dyn'?3.5:k==='smoke'?1.2:k==='flash'?1.5:2});
}
function vWreck(v){
  v.g.traverse(o=>{if(o.isMesh&&o.material&&o.material.color){o.material=o.material.clone();o.material.color.multiplyScalar(.22);}});
  fireZone(v.g.position.clone(),0);
}
function clientFx(f){
  const V3=(i)=>new THREE.Vector3(f[i]/10,f[i+1]/10,f[i+2]/10);
  switch(f[1]){
    case 'e':explodeVis(V3(2));break;
    case 'S':addSmoke(V3(2),f[5],f[6]);break;
    case 'F':fireZone(V3(2),0);break;
    case 'L':flashbang(V3(2),15);break;
    case 'P':visProj(f[2],V3(3),V3(6));break;
    case 'N':visNade(f[2],V3(3),V3(6));break;
  }
}
function clientApply(s){
  NET.snap=s;
  if(NET.first){NET.first=false;if(s.fx&&s.fx.length)NET.fxSeen=s.fx[s.fx.length-1][0];if(s.m)NET.msgSeen=s.m[0];}
  killed=s.st[0];total=s.st[1]||1e9;
  if(tdm){tdm.red=s.st[4];tdm.t=s.st[3];}
  const me=s.pl[NET.mi];
  if(me){
    if(me[0]<P.hp-.5&&!pDead){splat(1+Math.floor((P.hp-me[0])/7));shake=Math.max(shake,.03);beep(110,.15,'sawtooth');}
    P.hp=me[0];respT=me[2];
    if(!me[1]&&!pDead){pDead=true;splat(8);}
    if(me[1]&&pDead){pDead=false;P.hp=100;P.x=[0,-3,3][NET.mi]||0;P.z=70;P.y=H(P.x,70)+1.7;P.vy=0;say('Back in the fight!',2);}
  }
  for(const f of (s.fx||[])){if(f[0]<=NET.fxSeen)continue;NET.fxSeen=f[0];clientFx(f);}
  if(s.m&&s.m[0]>NET.msgSeen){NET.msgSeen=s.m[0];say(s.m[1],s.m[2]);}
  if(s.ob){
    alarm=!!s.ob[0];const h=allies.find(a=>a.hostage);if(h)h.free=!!s.ob[1];
    s.ob[2].forEach((d,i)=>{const o=objs[i];if(!o)return;o.prog=d[0]/1000;if(d[1]&&!o.done){o.done=true;if(o.t==='depot')depotVis(o);}});
  }
  if(s.o&&!over)clientEnd(s.o);
}
function clientEnd(o){
  over=true;S.wp+=o[3]||0;S.medals+=o[4]||0;S.xp+=o[5]||0;
  if(curMode===null){
    if(o[0]===1){S.missions++;const nx=nextInCamp(curLevel);if(nx>=0)setMax(L.camp,Math.max(getMax(L.camp),idxIn(curLevel)+1));}
    else S.deaths++;
  }
  save();try{document.exitPointerLock();}catch(e){}
  $('scope').style.display='none';$('endT').textContent=o[1];$('endP').textContent=o[2];$('nextBtn').style.display='none';
  setTimeout(()=>$('end').classList.add('on'),700);
}
function clientRead(dt){
  const peers=NET.room.peers();
  const host=peers.find(p=>p.presence&&p.presence.r==='h');
  if(!host){NET.hostLost+=dt;if(NET.hostLost>4&&!over){over=true;$('endT').textContent='Host left';$('endP').textContent='The game ended because the host left.';$('nextBtn').style.display='none';$('end').classList.add('on');}return;}
  NET.hostLost=0;
  const s=host.presence.s;if(s&&s.q!==NET.seqSeen){NET.seqSeen=s.q;clientApply(s);}
  for(const pr of peers){
    if(pr.isMe)continue;const idx=NET.roster.indexOf(pr.peer);if(idx<0||!pr.presence.p)continue;
    const a=avatarFor(pr,idx);readAvatarPresence(a,pr);
    const st=NET.snap&&NET.snap.pl[idx];if(st){const al=!!st[1];if(!al&&a.alive){a.alive=false;a.dt=0;}if(al&&!a.alive){a.alive=true;a.dt=0;a.x=a.px;a.z=a.pz;}}
  }
}
function clientTick(dt){
  const s=NET.snap;
  if(s){
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i],d=s.e[i];if(!d)continue;
      const was=e.alive;e.alive=!!(d[3]&1);
      const tx=d[0]/10,tz=d[1]/10,ty=d[2]/100,k=Math.min(1,dt*12);
      if(e.alive){
        if(!was){e.dt=0;e.g.rotation.x=0;e.legs[0].hip.rotation.x=0;e.legs[1].hip.rotation.x=0;e.x=tx;e.z=tz;}
        const ox=e.x,oz=e.z;e.x+=(tx-e.x)*k;e.z+=(tz-e.z)*k;e.g.position.set(e.x,H(e.x,e.z),e.z);
        let da=ty-e.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));e.g.rotation.y+=da*k;
        const mv=Math.hypot(e.x-ox,e.z-oz)/Math.max(dt,.001);
        if(mv>.5){e.walk+=dt*8;const s1=Math.sin(e.walk);e.legs[0].hip.rotation.x=s1*.7;e.legs[1].hip.rotation.x=-s1*.7;e.legs[0].knee.rotation.x=Math.max(0,-s1)*.9;e.legs[1].knee.rotation.x=Math.max(0,s1)*.9;}
        else e.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});
        if(d[3]&2){e.mf.visible=true;e.mfT=.08;}
      } else if(e.dt<1){e.dt+=dt*2.2;const q=Math.min(1,e.dt);e.g.rotation.x=-q*1.5;e.g.position.y=H(e.x,e.z)-q*.05;e.legs[0].hip.rotation.x=q*.5;e.legs[1].hip.rotation.x=-q*.3;}
      if(e.mfT>0){e.mfT-=dt;if(e.mfT<=0)e.mf.visible=false;}
    }
    for(let i=0;i<vehicles.length;i++){
      const v=vehicles[i],d=s.v[i];if(!d)continue;
      const was=v.alive;v.alive=!!(d[6]&1);const pos=v.g.position,k=Math.min(1,dt*10);
      v.g.visible=(v.type==='jet')?!!(d[6]&4):true;
      const ox=pos.x,oz=pos.z;
      pos.x+=(d[0]/10-pos.x)*k;pos.y+=(d[1]/10-pos.y)*k;pos.z+=(d[2]/10-pos.z)*k;
      let da=d[3]/100-v.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));v.g.rotation.y+=da*k;v.g.rotation.x=d[4]/100;
      if(v.turret)v.turret.rotation.y=d[5]/100;
      if(v.mf)v.mf.visible=!!(d[6]&2);
      if(v.wheels&&v.wheels.length){v.wa+=Math.hypot(pos.x-ox,pos.z-oz)/.5;for(const w of v.wheels)w.rotation.x=v.wa;}
      if(v.rotor)v.rotor.rotation.y+=dt*22;if(v.tail)v.tail.rotation.x+=dt*28;
      if(was&&!v.alive&&(v.type==='apc'||v.type==='tank'))vWreck(v);
    }
    const npcs=allies.filter(a=>!a.remote);
    for(let i=0;i<npcs.length;i++){
      const a=npcs[i],d=s.a[i];if(!d)continue;
      const was=a.alive;a.alive=!!d[3];const k=Math.min(1,dt*10),ox=a.x,oz=a.z;
      if(a.marker)a.marker.rotation.y+=dt*2;
      if(a.alive){
        if(!was){a.dt=0;a.g.rotation.x=0;}
        a.x+=(d[0]/10-a.x)*k;a.z+=(d[1]/10-a.z)*k;a.g.position.set(a.x,H(a.x,a.z),a.z);
        let da=d[2]/100-a.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));a.g.rotation.y+=da*k;
        const mv=Math.hypot(a.x-ox,a.z-oz)/Math.max(dt,.001);
        if(mv>.5){a.walk+=dt*8;const s1=Math.sin(a.walk);a.legs[0].hip.rotation.x=s1*.7;a.legs[1].hip.rotation.x=-s1*.7;}else a.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});
      } else if(a.dt<1){a.dt+=dt*2.2;const q=Math.min(1,a.dt);a.g.rotation.x=-q*1.5;a.g.position.y=H(a.x,a.z)-q*.05;if(a.marker)a.marker.visible=false;}
    }
    for(let i=0;i<mines.length;i++){const m=mines[i],live=s.mn[i]!=='0';if(m.live&&!live){m.live=false;scene.remove(m.m);}else if(live)m.led.visible=(Math.floor(tAll*2)%2===0);}
    for(let i=0;i<kits.length;i++){const k=kits[i];if(!k.used&&s.ki[i]==='1'){k.used=true;scene.remove(k.k);}}
  }
  for(let i=vprojs.length-1;i>=0;i--){const p=vprojs[i];p.v.y-=p.g*dt;p.m.position.addScaledVector(p.v,dt);p.t-=dt;if(p.v.lengthSq()>.01)p.m.lookAt(p.m.position.clone().add(p.v));
    if(p.t<=0||p.m.position.y<H(p.m.position.x,p.m.position.z)){scene.remove(p.m);vprojs.splice(i,1);}}
  for(let i=vnades.length-1;i>=0;i--){const n=vnades[i];n.v.y-=14*dt;n.m.position.addScaledVector(n.v,dt);const g0=H(n.m.position.x,n.m.position.z)+.06;
    if(n.m.position.y<g0){n.m.position.y=g0;n.v.y*=-.35;n.v.x*=.6;n.v.z*=.6;}n.t-=dt;if(n.t<=0){scene.remove(n.m);vnades.splice(i,1);}}
  updateFires(dt);updateClouds(dt);updateWx(dt);updateCabin();
  $('prompt').textContent=pDead?'You died – back in '+Math.ceil(respT)+' s':'';
}
function netTick(dt){
  const room=NET.room;if(!room||NET.role==='solo')return;
  NET.t+=dt;
  if(NET.t>=1/12){
    NET.t=0;
    const st={p:[qn(P.x),qn(P.y),qn(P.z),Math.round(P.yaw*100),Math.round(P.pitch*100),pDead?0:1]};
    if(NET.role==='host'){st.s=hostSnap();if(JSON.stringify(st.s).length>3000)st.s.fx=st.s.fx.slice(-3);if(NET.sent.length)st.sh=NET.sent;}
    else{st.sh=NET.sent;st.u=keys.KeyE?1:0;}
    Promise.resolve(room.presence(st)).catch(()=>{});
  }
  if(NET.role==='host')hostRead(dt);else clientRead(dt);
  updateAvatars(dt);
}

