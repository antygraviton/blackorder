/* ============ MAIN LOOP ============ */
function collide(o,r){
  const fy=o===P?P.y-1.7:H(o.x,o.z);
  for(const b of obst){
    if(b.ph)continue;
    if(b.y1!==undefined&&(fy>=b.y1||fy+1.8<=b.y0))continue;
    const cx=Math.max(b.a,Math.min(o.x,b.b)),cz=Math.max(b.c,Math.min(o.z,b.d));
    const dx=o.x-cx,dz=o.z-cz,dd=dx*dx+dz*dz;
    if(dd<r*r){ if(dd<1e-6){o.x=b.a-r;continue;} const d=Math.sqrt(dd);o.x=cx+dx/d*r;o.z=cz+dz/d*r; }
  }
}
function los(a,b){const d=new THREE.Vector3().subVectors(b,a);const Ln=d.length();ray.set(a,d.normalize());ray.far=Ln;return !ray.intersectObjects(obstMesh,false)[0];}
function loop(){
  if(!run)return;raf=requestAnimationFrame(loop);
  const now=performance.now();const dt=Math.min(.05,(now-lastT)/1000);lastT=now;tAll+=dt;frame++;
  /* player */
  const sp=((keys.ShiftLeft||keys.ShiftRight)?7.5*(hasPerk('run')?1.15:1):4.6)*(aim?.6:1)*(pDead?0:1);
  let fx=0,fz=0;
  if(keys.KeyW)fz-=1;if(keys.KeyS)fz+=1;if(keys.KeyA)fx-=1;if(keys.KeyD)fx+=1;
  const moving=!!(fx||fz);const l=Math.hypot(fx,fz)||1;fx/=l;fz/=l;
  const sn=Math.sin(P.yaw),cs=Math.cos(P.yaw);
  if(mounted&&pheli&&pheli.alive)flyHeli(dt);
  else{
  P.x+=(fx*cs+fz*sn)*sp*dt;P.z+=(-fx*sn+fz*cs)*sp*dt;
  collide(P,.45);
  const gy=groundAt(P.x,P.z,P.y-1.7)+1.7;
  if(keys.Space&&P.ground&&!pDead){P.vy=5.2;P.ground=false;}
  if(P.ground){P.y+=(gy-P.y)*Math.min(1,dt*18);}
  else{P.vy-=14*dt;P.y+=P.vy*dt;if(P.y<=gy){P.y=gy;P.vy=0;P.ground=true;}}
  }
  const bob=!mounted&&moving&&P.ground?Math.sin(tAll*((keys.ShiftLeft||keys.ShiftRight)?14:9))*.03:0;
  if(mounted&&pheli&&pheli.alive)cam.position.copy(chasePos());else cam.position.set(P.x,P.y+bob,P.z);
  cam.rotation.order='YXZ';cam.rotation.y=P.yaw;cam.rotation.x=P.pitch;
  const wk=slots[cur],wdef=WEAPONS[wk],z=wdef.zoom||1;
  const scoped=aim&&wdef.scoped;
  const tf=S.fov/(aim?z*(wdef.scoped?1.8:1.3):1);cam.fov+=(tf-cam.fov)*.2;cam.updateProjectionMatrix();
  $('scope').style.display=scoped?'block':'none';if(view)view.visible=!scoped&&!mounted;
  /* sun and shadows follow the player */
  const sd=L.sunDir;const sl=Math.hypot(sd[0],sd[1],sd[2]);
  sun.position.set(P.x+sd[0]/sl*90,sd[1]/sl*90,P.z+sd[2]/sl*90);sun.target.position.set(P.x,0,P.z);sun.target.updateMatrixWorld();
  /* weapon animation */
  if(view){
    const b=view.userData.base,sy=view.userData.sy||0;
    kick*=.8;
    let rx=0,py=0;
    if(reloadT>0){const q=1-reloadT/reloadMax;rx=-.7*Math.sin(Math.PI*q);py=-.12*Math.sin(Math.PI*q);}
    const ax=aim&&view.userData.sy?0:b[0],ay=aim&&view.userData.sy?-view.userData.sy-.012:b[1];
    swayX*=.9;swayY*=.9;
    view.position.x+=(ax+swayX*.6+(moving&&!aim?Math.sin(tAll*9)*.012:0)-view.position.x)*.25;
    view.position.y+=(ay+py+swayY*.6+(moving&&!aim?Math.abs(Math.sin(tAll*9))*.012:Math.sin(tAll*1.6)*.002)-view.position.y)*.25;
    view.position.z=b[2]+kick;
    view.rotation.x=rx+kick*1.2+swayY;view.rotation.y=(isKnife(wk)?-.3:0)+swayX;
  }
  if(shake>0){cam.rotation.x+=(Math.random()-.5)*shake;cam.rotation.y+=(Math.random()-.5)*shake;shake*=.85;}
  if(flashT>0){flashT-=dt;if(flashT<=0)flash.intensity=0;}
  if(mflT>0){mflT-=dt;if(mflT<=0&&mflash)mflash.visible=false;}
  if(mounted){if((mouseDown||keys.Space)&&heliWeapon===0)heliFire(false);}else if(mouseDown&&wdef.auto)fire(false);
  if(reloadT>0){reloadT-=dt;if(reloadT<=0){const k=slots[cur],w=WEAPONS[k],s=wp[k];const take=Math.min(magOf(k)-s.mag,s.res);s.mag+=take;s.res-=take;hud();}}
  if(hitT>0){hitT-=dt;if(hitT<=0)$('cross').classList.remove('hit');}
  if(msgT>0){msgT-=dt;if(msgT<=0)$('msg').textContent='';}
  /* particles */
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.t-=dt;if(p.t<=0){scene.remove(p.m);parts.splice(i,1);}}
  /* smoke */
  for(const s of smokes){const u=s.userData;u.t=(u.t+dt*.045)%1;const t=u.t;
    s.position.set(u.x+t*14,H(u.x,u.z)+2+t*u.hgt*1.6,u.z+t*5);const sc=5+t*u.hgt*.8;s.scale.set(sc,sc,1);s.material.opacity=Math.sin(t*Math.PI)*.6;}
  if(NET.role!=='client'){
  if(pDead){respT-=dt;if(respT<=0)respawnPlayer();}
  /* grenades */
  for(let i=nades.length-1;i>=0;i--){const n=nades[i];n.v.y-=14*dt;n.m.position.addScaledVector(n.v,dt);
    const g0=H(n.m.position.x,n.m.position.z)+.06;
    if(n.m.position.y<g0){n.m.position.y=g0;n.v.y*=-.35;n.v.x*=.6;n.v.z*=.6;}
    n.t-=dt;if(n.t<=0){detonate(n);scene.remove(n.m);nades.splice(i,1);}}
  /* mines */
  let near=1e9;
  for(const m of mines){
    if(!m.live)continue;
    m.led.visible=(Math.floor(tAll*2)%2===0);
    const dp=Math.hypot(P.x-m.x,P.z-m.z);near=Math.min(near,dp);
    let trig=!pDead&&dp<1.1&&P.y-H(P.x,P.z)<2.4;
    if(!trig)for(const e of enemies){if(e.alive&&Math.hypot(e.x-m.x,e.z-m.z)<.9){trig=true;break;}}
    if(!trig)for(const a of allies){if(a.remote&&a.alive&&Math.hypot(a.x-m.x,a.z-m.z)<1.1){trig=true;break;}}
    if(trig){m.live=false;scene.remove(m.m);explode(new THREE.Vector3(m.x,H(m.x,m.z)+.3,m.z),6,150);if(dp<1.1)say('You stepped on a mine',1.5);}
  }
  $('warn').textContent=near<6?'Mine nearby! ('+near.toFixed(0)+' m)':'';
  if(near<6&&Math.floor(tAll*(near<3?6:3))%2===0&&Math.floor((tAll-dt)*(near<3?6:3))%2!==0)beep(900,.04,'square',.1);
  for(const k of kits){if(k.used)continue;if(!pDead&&Math.hypot(P.x-k.x,P.z-k.z)<1.3&&P.hp<100){k.used=true;scene.remove(k.k);P.hp=Math.min(100,P.hp+40);say('Medkit +40 HP',1.5);beep(600,.1,'sine');}}
  for(const a of allies){if(!a.remote||!a.alive||a.hp>=100)continue;for(const k of kits){if(!k.used&&Math.hypot(a.x-k.x,a.z-k.z)<1.3){k.used=true;scene.remove(k.k);a.hp=Math.min(100,a.hp+40);}}}
  /* enemies */
  const eye=new THREE.Vector3(P.x,P.y,P.z);
  for(const e of enemies){
    if(!e.alive){
      if(e.dt<1){e.dt+=dt*2.2;const q=Math.min(1,e.dt);e.g.rotation.x=-q*1.5;e.g.position.y=H(e.x,e.z)-q*.05;e.legs[0].hip.rotation.x=q*.5;e.legs[1].hip.rotation.x=-q*.3;}
      if(e.dummy){e.rt=(e.rt||0)+dt;if(e.rt>3){e.alive=true;e.hp=e.mhp;e.rt=0;e.dt=0;e.g.rotation.x=0;e.g.position.y=H(e.x,e.z);e.legs[0].hip.rotation.x=0;e.legs[1].hip.rotation.x=0;}}
      else if(curMode==='tdm'){e.rt=(e.rt||0)+dt;if(e.rt>4)respawnBot(e);}
      continue;
    }
    if(e.dummy)continue;
    if(e.boss)e.stun=0;
    if(e.stun>0){e.stun-=dt;e.alerted=true;if(e.mfT>0){e.mfT-=dt;if(e.mfT<=0)e.mf.visible=false;}e.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});continue;}
    let dx=P.x-e.x,dz=P.z-e.z,dist=Math.hypot(dx,dz);
    const gH=H(e.x,e.z);
    const hd=new THREE.Vector3(e.x,gH+1.7,e.z);
    let see=!pDead&&dist<(L.stealth&&!alarm?22:60)*(hasPerk('ghost')?.8:1)&&los(hd,eye)&&!smokeBlocks(hd,eye);
    let tAlly=null;
    for(const a of allies){if(!a.alive)continue;const da=Math.hypot(a.x-e.x,a.z-e.z);
      if(da<(see?dist:55)&&da<(L.stealth&&!alarm?22:50)){const ta=new THREE.Vector3(a.x,H(a.x,a.z)+1.5,a.z);if(los(hd,ta)&&!smokeBlocks(hd,ta)){tAlly=a;dx=a.x-e.x;dz=a.z-e.z;dist=da;see=true;}}}
    if(see)e.alerted=true;
    let walking=false;
    if(e.flinch>0){e.flinch-=dt;e.g.rotation.x=-.18*(e.flinch/.25);}else e.g.rotation.x=0;
    if(e.alerted){
      const target=Math.atan2(dx,dz);let da=target-e.g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));e.g.rotation.y+=da*Math.min(1,dt*8);
      let mx=0,mz=0;
      if(dist>16){mx=dx/dist;mz=dz/dist;}
      else if(dist<8){mx=-dx/dist;mz=-dz/dist;}
      else{e.st-=dt;if(e.st<=0){e.strafe*=-1;e.st=1+Math.random()*2;}mx=-dz/dist*e.strafe*.6;mz=dx/dist*e.strafe*.6;}
      walking=(mx*mx+mz*mz)>0;
      e.x+=mx*2.6*dt;e.z+=mz*2.6*dt;collide(e,.5);e.g.position.set(e.x,H(e.x,e.z),e.z);
      e.cd-=dt;
      if(see&&e.cd<=0){e.cd=.9+Math.random()*1.1;e.mf.visible=true;e.mfT=.07;beep(140,.08,'square',.08);
        const chance=Math.max(.12,L.acc*DIFF().acc-dist/70);
        if(Math.random()<chance){if(tAlly)allyHit(tAlly,7+Math.random()*5);else hurt(7+Math.random()*5,e.g.position);}}
    } else {
      e.idle+=dt*.4;e.g.rotation.y+=Math.sin(e.idle)*dt*.5;
    }
    if(e.mfT>0){e.mfT-=dt;if(e.mfT<=0)e.mf.visible=false;}
    if(walking){e.walk+=dt*8;const s1=Math.sin(e.walk);e.legs[0].hip.rotation.x=s1*.7;e.legs[1].hip.rotation.x=-s1*.7;e.legs[0].knee.rotation.x=Math.max(0,-s1)*.9;e.legs[1].knee.rotation.x=Math.max(0,s1)*.9;e.head.rotation.z=Math.sin(e.walk*.5)*.03;}
    else{e.legs.forEach(q=>{q.hip.rotation.x*=.8;q.knee.rotation.x*=.8;});}
    if(frame%20===0){const cast=dist<45;e.parts.forEach(p=>{p.castShadow=cast;});}
  }
  if(curMode==='survival')updateSurvival(dt);
  if(curMode==='training')trainRefill();
  if(curMode==='tdm')updateTDM(dt);
  updateRadio(dt);updateObjectives(dt);updateWx(dt);updateCabin();
  updateVehicles(dt);updateAllies(dt);updateHeliIdle(dt);updateProjs(dt);updateFires(dt);updateClouds(dt);
  }else clientTick(dt);
  netTick(dt);
  if(flashA>0)flashA=Math.max(0,flashA-dt*.3);
  $('flashw').style.opacity=Math.min(1,flashA*1.3);
  hud();drawMap();
  ren.render(scene,cam);
}
refresh();
