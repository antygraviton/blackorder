/* ============ CINEMATICS: intro fly-over, boss kill-cam, bullet time ============ */
/* Solo play only (online games never freeze for one player), switched off by Settings > Game > Cinematic scenes (S.cine).
   Intro: the world is frozen while the camera circles the main objective of the mission (title card with a caption), then
   glides into the player's view; any key or click skips it. Kill-cam: the last boss dies in slow motion before the mission
   ends. Bullet time: a headshot kill briefly slows the game down. */
let cine={on:false,kind:'',t:0,dur:0,freeze:false,focus:null,a0:0,done:null,endP:null,endQ:null},timeScale=1,bt=0,btCD=0,btK=0,bossEnding=false;
function cineFocus(){
  const v=(x,z)=>new THREE.Vector3(x,H(x,z),z);
  if(L.bossS){const b=enemies.find(e=>e.boss);if(b)return v(b.x,b.z);}
  if(L.bossT){const t=vehicles.find(x=>x.boss);if(t)return v(t.g.position.x,t.g.position.z);}
  const h=allies.find(a=>a.hostage);if(h)return v(h.x,h.z);
  const o=objs.find(q=>q.t!=='ext'&&q.t!=='host');if(o)return v(o.x,o.z);
  if(cabinInfo)return v(cabinInfo.x,cabinInfo.z);
  const e=enemies.find(q=>q.alive);if(e)return v(e.x,e.z);
  return v(P.x,P.z-30);
}
function cineStart(kind,target){
  if(!S.cine||NET.role!=='solo')return false;
  cine.on=true;cine.kind=kind;cine.t=0;cine.a0=Math.random()*6.28;cine.endP=cine.endQ=null;
  document.body.classList.add('cine');$('cineBars').classList.add('on');
  const ti=$('cineTitle');ti.textContent='';
  const mk=(tag,txt)=>{const n=document.createElement(tag);n.textContent=txt;ti.appendChild(n);};
  if(kind==='intro'){
    cine.freeze=true;cine.dur=4.6;cine.focus=cineFocus();
    mk('h1',L.n);if(L.cap)mk('p',L.cap);mk('small','Click or press a key to skip');
    const b=enemies.find(e=>e.boss)||vehicles.find(v=>v.boss);if(b&&cine.focus)setTimeout(()=>{if(cine.on&&b.alive!==false)showBark(b,b.type?'tank75':'bossSpawn',Math.floor(Math.random()*2));},1200);
  } else {
    cine.freeze=false;cine.dur=2.8;cine.focus=target;
    mk('h1',kind==='killTank'?'TANK DESTROYED':'TARGET ELIMINATED');
  }
  ti.classList.add('on');
  return true;
}
function cineEnd(){
  if(!cine.on)return;
  cine.on=false;cam.rotation.z=0;
  document.body.classList.remove('cine');$('cineBars').classList.remove('on');$('cineTitle').classList.remove('on');
  const f=cine.done;cine.done=null;if(f)f();
}
function cineCam(){
  const f=cine.focus;if(!f||!cam)return;
  const t=cine.t;
  if(cine.kind==='intro'){
    const A=cine.dur-1;
    if(t<A){
      const k=t/A,ang=cine.a0+k*1.1,r=26-6*k,x=f.x+Math.cos(ang)*r,z=f.z+Math.sin(ang)*r;
      cam.position.set(x,Math.max(f.y+15-6*k,H(x,z)+3),z);cam.lookAt(f.x,f.y+1.6,f.z);
      cine.endP=cam.position.clone();cine.endQ=cam.quaternion.clone();
    } else if(cine.endP){
      const k=Math.min(1,(t-A)/(cine.dur-A)),e=k*k*(3-2*k);
      const pq=new THREE.Quaternion().setFromEuler(new THREE.Euler(P.pitch,P.yaw,0,'YXZ'));
      cam.position.lerpVectors(cine.endP,new THREE.Vector3(P.x,P.y,P.z),e);cam.quaternion.copy(cine.endQ).slerp(pq,e);
    }
  } else {
    const ang=cine.a0+t*.9,x=f.x+Math.cos(ang)*7,z=f.z+Math.sin(ang)*7;
    cam.position.set(x,Math.max(f.y+2.6,H(x,z)+1.5),z);cam.lookAt(f.x,f.y+1,f.z);
  }
}
/** One frame of the frozen intro: no simulation, only the camera, weather, fire and bubbles. */
function cineStep(rdt){
  cine.t+=rdt;cineCam();updateWx(rdt);updateCabin();updateBanter(rdt);
  ren.render(scene,cam);
  if(cine.t>=cine.dur)cineEnd();
}
/** Slow-motion kill-cam: called every frame from the main loop; ends by running cine.done. */
function cineKill(rdt){cine.t+=rdt;cineCam();if(cine.t>=cine.dur)cineEnd();}
function bulletTime(){if(NET.role!=='solo'||!S.cine||cine.on||tAll<btCD)return;bt=.55;btCD=tAll+8;}
function updateTimeScale(rdt){
  if(bt>0){bt-=rdt;btK=Math.sin(Math.max(0,bt)/.55*Math.PI);timeScale=.28;}else{timeScale=1;btK=0;}
  if(cine.on&&!cine.freeze)timeScale=.3;
}
for(const ev of ['keydown','mousedown','touchstart'])addEventListener(ev,()=>{if(cine.on&&cine.freeze&&cine.t>.4)cineEnd();},{passive:true});
