/* ============ MISSION EXTENSIONS: objectives, weather, briefing, radio ============ */
/* Objective missions (L.ob = destroy | hack | rescue | defend) are solo-only: they are not replicated (see docs/MULTIPLAYER.md). */
let objs=[],alarm=false,missionT=0,defT=0,defGroup=0,torch=null,rain=[],lightT=8,thunderAt=0;
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
  if(L.stealth&&!alarm&&enemies.some(e=>e.alive&&e.alerted))raiseAlarm('Enemy alerted!');
  const ob=L.ob;if(!ob||ob==='kill')return;
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
}
function objText(){
  if(L.ob==='destroy'){const t=objs.filter(o=>o.t==='depot'),n=t.filter(o=>o.done).length;return ['Destroy fuel depots: '+n+' / '+t.length,'Gunfire and explosions destroy the depots'];}
  if(L.ob==='hack'){const o=objs.find(x=>x.t==='term');return ['Hack the terminal: '+Math.round((o?o.prog:0)*100)+' %'+(alarm?' · ALARM':''),'Hold E at the terminal · stealth '+(alarm?'broken':'intact')];}
  if(L.ob==='rescue'){const h=allies.find(a=>a.hostage);return [!h?'Rescue the prisoner':(h.free?'Lead the prisoner to extraction (green circle)':'Find the prisoner and free him (hold E)'),h&&!h.alive?'The prisoner died':'The prisoner must survive'];}
  if(L.ob==='defend'){const z=objs.find(o=>o.t==='zone');const s=Math.max(0,Math.round(150*(1-(z?z.prog:0))));return ['Defend the zone: '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'),(z&&humansNear(z.x,z.z,z.r,false))?'You are in the zone':'Return to the blue circle'];}
  return ['',''];
}
function raiseAlarm(msg){
  if(alarm)return;alarm=true;say('ALARM! '+msg,3.5);beep(800,.5,'sawtooth',.25);
  for(const e of enemies)if(e.alive)e.alerted=true;
}
$('briefGo').onclick=beginLoad;$('briefBack').onclick=()=>{$('brief').classList.remove('on');show('play');};
