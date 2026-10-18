/* ============ MISSION START ============ */
function startMission(idx,skipBrief){
  curMode=null;curLevel=idx;L=LEVELS[idx];show('game');
  if(L.brief&&!skipBrief){$('briefT').textContent=L.n;$('briefP').textContent=L.brief;$('brief').classList.add('on');return;}
  beginLoad();
}
function doStart(){
  L=applyWx(L);
  $('endMenu').textContent=$('toMenu').textContent=NET.role==='solo'?'To menu':'Back to lobby';
  if(!ren){ren=new THREE.WebGLRenderer({canvas:$('cv'),antialias:S.q>=2});ren.outputEncoding=THREE.sRGBEncoding;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;}
  ren.setPixelRatio(Math.min(window.devicePixelRatio||1,S.q>=3?2:1.4));
  ren.setSize(innerWidth,innerHeight,false);
  initTex();initMats();
  build();
  const man=NET.role==='client'?NET.go:null;
  const mi=NET.role==='solo'?0:NET.mi,sx=[0,-3,3][mi]||0;
  P={x:sx,y:H(sx,70)+1.7,z:70,vy:0,yaw:0,pitch:0,hp:100,ground:true};
  pDead=false;respT=0;tdm=null;vprojs=[];vnades=[];
  cam=new THREE.PerspectiveCamera(S.fov,innerWidth/innerHeight,.03,1800);
  cam.position.set(P.x,P.y,P.z);scene.add(cam);fitRenderer();
  flash=new THREE.PointLight(0xffc070,0,9);cam.add(flash);initWx();
  const kin=curMode?0:idxIn(curLevel);
  objs=[];alarm=false;missionT=0;defT=0;defGroup=0;if(L.radio)L.radio.forEach(r=>{r.done=false;});
  if(man){
    man.mi.forEach(([x,z])=>addMine(x/10,z/10));
    man.ki.forEach(([x,z])=>addKit(x/10,z/10));
    man.en.forEach(([x,z])=>enemies.push(mkEnemy(x/10,z/10)));
    man.v.forEach(([t,x,z])=>vehicles.push(mkVehicle(t,x/10,z/10,0)));
    allies=[];for(let i=0;i<man.np;i++)allies.push(mkAlly(i?3:-3,66,i));
    if(man.md==='tdm')tdm={limit:25,time:360,red:0,t:0};
  } else {
    for(let i=0;i<L.mines;i++){const [x,z]=spot(Math.random,16,1.6,72);addMine(x,z);}
    for(let i=0;i<L.kits;i++){const [x,z]=spot(Math.random,10,2,70);addKit(x,z);}
    for(let i=0;i<L.en;i++){const [x,z]=spot(Math.random,30,1.8,72);enemies.push(mkEnemy(x,z));}
    for(let i=0;i<(L.apcs||0);i++){const [x,z]=spot(Math.random,45,7,70);vehicles.push(mkVehicle('apc',x,z,kin));}
    for(let i=0;i<(L.tanks||0);i++){const [x,z]=spot(Math.random,50,8,70);vehicles.push(mkVehicle('tank',x,z,kin));}
    for(let i=0;i<(L.helis||0);i++){const a=Math.random()*6.283;vehicles.push(mkVehicle('heli',Math.cos(a)*90,Math.sin(a)*90+30,kin));}
    for(let i=0;i<(L.jets||0);i++)vehicles.push(mkVehicle('jet',0,0,kin));
    const nNpc=NET.role==='host'?NET.npc:2;
    allies=[];if(curMode!=='training')for(let i=0;i<nNpc;i++)allies.push(mkAlly(i?3:-3,66,i));
    if(curMode==='training')spawnTraining();
    if(curMode==='survival')initSurvival();
    if(curMode==='tdm')initTdm();
  }
  if(!man&&!curMode)placeObjectives();
  pheli=(L.camp===1&&NET.role==='solo'&&!curMode)?mkPlayerHeli(14,58):null;mounted=false;
  killed=0;total=(curMode||(L.ob&&L.ob!=='kill'))?1e9:enemies.length+vehicles.filter(v=>v.type!=='jet').length;over=false;$('blood').innerHTML='';
  slots=[S.primary,S.secondary,S.melee||'knife',S.grenade||'m67'];
  if(L.camp===1&&S.primary!=='rpg'&&!curMode)slots.push('rpg');
  wp={};
  slots.forEach(id=>{const w=WEAPONS[id];if(w.mag)wp[id]={mag:magOf(id),res:(id==='rpg'&&S.primary!=='rpg')?3:w.res};else if(w.cat==='grenade')wp[id]={n:3+(hasPerk('nades')?2:0)};else wp[id]={};});
  cur=0;buildView();reloadT=0;aim=false;
  $('again').style.display=NET.role==='solo'?'':'none';
  say(L.txt+(NET.role!=='solo'?' (Multiplayer: '+NET.roster.length+' player'+(NET.roster.length>1?'i':'')+')':(allies.length?' Allies Alpha and Bravo are following you.':'')+(pheli?' Mi-24 helicopter is parked nearby: E.':'')),5);
  $('end').classList.remove('on');$('pause').classList.remove('on');
  hadLock=false;fallback=false;lockMouse();
  setTimeout(()=>{if(!locked&&run)fallback=true;},700);
  run=true;lastT=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}
function lockMouse(){try{const p=$('cv').requestPointerLock();if(p&&p.catch)p.catch(()=>{fallback=true;});}catch(e){fallback=true;}}
document.addEventListener('pointerlockchange',()=>{
  locked=document.pointerLockElement===$('cv');
  if(locked)hadLock=true;
  if(!locked&&hadLock&&run&&!over)pauseGame();
});
document.addEventListener('pointerlockerror',()=>{fallback=true;});
function pauseGame(){if(NET.role==='solo')run=false;$('pause').classList.add('on');}
$('resume').onclick=()=>{$('pause').classList.remove('on');lockMouse();run=true;lastT=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);};
$('toMenu').onclick=()=>{stopGame();show(NET.room?'multi':'menu');};
$('endMenu').onclick=()=>{stopGame();show(NET.room?'multi':'menu');};
$('again').onclick=()=>{if(curMode)startMode(curMode);else startMission(curLevel,true);};
$('nextBtn').onclick=()=>{const nx=nextInCamp(curLevel);if(nx>=0)startMission(nx);};
function stopGame(){if(NET.role!=='solo'){if(NET.room)mpBackToLobby();else netLeave();}if(curMode==='survival'&&!survPaid&&wave>0)survPay();run=false;over=true;try{document.exitPointerLock();}catch(e){}$('pause').classList.remove('on');$('end').classList.remove('on');$('scope').style.display='none';}
const canAct=()=>run&&(locked||fallback)&&!pDead;
addEventListener('keydown',e=>{keys[e.code]=true;
  if(!run)return;
  if(curMode==='training'&&e.code==='KeyQ'&&!mounted)trainCycle();
  if(mounted){if(e.code==='Digit1')heliWeapon=0;if(e.code==='Digit2')heliWeapon=1;if(e.code==='Digit3')heliWeapon=2;if(e.code==='Space'&&heliWeapon>0)heliFire(true);hud();}
  if(e.code==='Escape'&&!locked)pauseGame();
  if(e.code==='KeyR')reload();
  if(e.code==='KeyF'&&torch)torch.visible=!torch.visible;
  if(e.code==='Digit1')sw(0);if(e.code==='Digit2')sw(1);if(e.code==='Digit3')sw(2);if(e.code==='Digit4')sw(3);if(e.code==='Digit5')sw(4);if(e.code==='KeyE')toggleHeli();
});
addEventListener('keyup',e=>keys[e.code]=false);
addEventListener('mousedown',e=>{if(!canAct())return;if(e.button===0){mouseDown=true;fire(true);}if(e.button===2){if(mounted){heliWeapon=(heliWeapon+1)%3;hud();}else aim=true;}});
addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false;if(e.button===2)aim=false;});
addEventListener('contextmenu',e=>{if(run)e.preventDefault();});
addEventListener('mousemove',e=>{if(!canAct())return;const s=.0004+S.sens/100*.0032;const z=aim?.5:1;P.yaw-=e.movementX*s*z;P.pitch=Math.max(-1.4,Math.min(1.4,P.pitch-e.movementY*s*z));swayX=Math.max(-.04,Math.min(.04,swayX-e.movementX*.0004));swayY=Math.max(-.03,Math.min(.03,swayY-e.movementY*.0004));});
/* The canvas is sized by CSS (100% of #game); only the drawing buffer follows its real size. innerWidth can be stale
   right after a phone rotates or goes fullscreen, so also listen to orientationchange and observe the element. */
function fitRenderer(){
  if(!ren||!cam)return;
  const g=$('game'),w=g.clientWidth||innerWidth,h=g.clientHeight||innerHeight;
  ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
}
addEventListener('resize',fitRenderer);
addEventListener('orientationchange',()=>{fitRenderer();setTimeout(fitRenderer,300);});
if(window.ResizeObserver)new ResizeObserver(fitRenderer).observe($('game'));
function sw(i){if(mounted||i===cur||!wp[slots[i]])return;cur=i;reloadT=0;buildView();}
function reload(){if(mounted)return;const k=slots[cur],w=WEAPONS[k],s=wp[k];if(!w.mag||reloadT>0||s.mag===magOf(k)||s.res<=0)return;reloadMax=(w.rel||1.6)*(hasPerk('fast')?.75:1);reloadT=reloadMax;beep(200,.15);hud();}

