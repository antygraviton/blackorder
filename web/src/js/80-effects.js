/* ============ EFFECTS ============ */
function splat(n){
  const b=$('blood');
  for(let i=0;i<n;i++){
    const d=document.createElement('div');d.className='splat';
    const s=70+Math.random()*220;
    d.style.width=s+'px';d.style.height=s*(.8+Math.random()*.6)+'px';
    d.style.left=(Math.random()*100-8)+'%';d.style.top=(Math.random()*100-8)+'%';
    d.style.borderRadius=(40+Math.random()*20)+'% '+(40+Math.random()*20)+'% '+(40+Math.random()*20)+'% '+(40+Math.random()*20)+'%';
    b.appendChild(d);requestAnimationFrame(()=>requestAnimationFrame(()=>d.classList.add('go')));
    setTimeout(()=>d.remove(),4800);
  }
  while(b.children.length>16)b.removeChild(b.firstChild);
}
const bloodGeo=new THREE.BoxGeometry(.05,.05,.05),bloodMat=new THREE.MeshBasicMaterial({color:0x8a0808}),dustGeo=new THREE.BoxGeometry(.07,.07,.07);
function bloodBurst(pos,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(bloodGeo,bloodMat);m.position.copy(pos);scene.add(m);parts.push({m,v:new THREE.Vector3((Math.random()-.5)*3,Math.random()*3,(Math.random()-.5)*3),t:.6+Math.random()*.4});}}
function dustBurst(pos,col){const mt=new THREE.MeshBasicMaterial({color:col});for(let i=0;i<7;i++){const m=new THREE.Mesh(dustGeo,mt);m.position.copy(pos);scene.add(m);parts.push({m,v:new THREE.Vector3((Math.random()-.5)*2.2,Math.random()*2.5,(Math.random()-.5)*2.2),t:.4+Math.random()*.4});}}
function say(t,s){$('msg').textContent=t;msgT=s;if(NET.role==='host'){NET.msgId++;NET.lastMsg=[NET.msgId,t,s];}}
function hud(){
  $('hp').innerHTML=Math.max(0,Math.ceil(P.hp))+' <small>HP</small>';
  const k=slots[cur],w=WEAPONS[k],s=wp[k],kd=w.kind||'gun';
  let t='';
  if(kd==='frag'||kd==='dyn'||kd==='smoke'||kd==='flash')t='Count: '+s.n;
  else if(kd==='melee'||kd==='shield')t='';
  else t=reloadT>0?'Reloading…':s.mag+' / '+s.res;
  if(mounted&&pheli)$('ammo').innerHTML='Helicopter '+Math.ceil(pheli.hp)+' HP · '+HW[heliWeapon].n+' '+(heliWeapon===0?'∞':heliWeapon===1?pheli.pod:pheli.atgm)+'<small>1 machine gun · 2 rocket pods · 3 anti-tank missiles · Space = fire</small>';else $('ammo').innerHTML=t+'<small>'+w.name+'</small>';
  if(curMode==='tdm'){const tl=Math.max(0,Math.round(tdm?tdm.time-tdm.t:0));$('obj').innerHTML='Team match: players '+killed+' – '+(tdm?tdm.red:0)+' bots<small>Goal '+(tdm?tdm.limit:25)+' kills · time '+Math.floor(tl/60)+':'+String(tl%60).padStart(2,'0')+(NET.role!=='solo'?' · players: '+NET.roster.length:'')+'</small>';}
  else if(curMode==='training')$('obj').innerHTML='Training: targets destroyed '+killed+'<small>Q = next weapon in slot · unlimited ammo · invincible</small>';
  else if(curMode==='survival')$('obj').innerHTML='Survival – wave '+wave+' · kills '+killed+'<small>Enemies left: '+survLeft()+' · record '+(S.bestWave||0)+' waves · Allies: '+allies.filter(a=>a.alive).length+'/'+allies.length+'</small>';
  else if(L.ob&&L.ob!=='kill'){const ot=objText();$('obj').innerHTML=ot[0]+'<small>'+ot[1]+' · '+L.n+'</small>';}
  else $('obj').innerHTML='Destroy targets: '+killed+' / '+total+'<small>'+CAMPS[L.camp].n+' – mission '+(idxIn(curLevel)+1)+': '+L.n+' · Allies: '+allies.filter(a=>a.alive).length+'/'+allies.length+'</small>';
  if(pDead&&NET.role!=='client')$('prompt').textContent='You died – back in '+Math.ceil(respT)+' s';
  const low=Math.max(0,(60-P.hp)/60);
  $('vig').style.boxShadow='inset 0 0 '+(80+low*140)+'px '+(20+low*60)+'px rgba(140,8,8,'+(low*.8)+')';
}
function buildView(){
  if(view)cam.remove(view);
  const k=slots[cur];view=viewModel(k);
  const pos={knife:[.2,-.22,-.28],machete:[.2,-.22,-.28],hammer:[.2,-.22,-.28],m67:[.2,-.22,-.3],dynamite:[.2,-.22,-.3],smoke:[.2,-.22,-.3],flash:[.2,-.22,-.3],glock:[.14,-.17,-.35],revolver:[.14,-.17,-.35],dpistol:[.14,-.17,-.35],napalm:[.14,-.17,-.35],hardbass:[.14,-.17,-.35],shotgun:[.16,-.2,-.28],svd:[.16,-.2,-.3],bow:[.16,-.17,-.34],crossbow:[.16,-.17,-.34],rpg:[.18,-.22,-.26],shield:[.04,-.08,-.42]}[k]||[.16,-.19,-.28];
  view.userData.base=pos;view.position.set(...pos);
  if(isKnife(k)){view.rotation.set(.1,-.3,.1);}
  cam.add(view);
  if(view.userData.muzzle){const mm=view.userData.muzzle;mflash=new THREE.Mesh(new THREE.PlaneGeometry(.22,.22),new THREE.MeshBasicMaterial({map:TX.star,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));mflash.position.set(mm[0],mm[1],mm[2]);mflash.visible=false;view.add(mflash);}else mflash=null;
  view.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});
  hud();
}

