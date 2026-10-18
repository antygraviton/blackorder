/* ============ BANTER: speech bubbles and barks ============ */
/* Short one-liners above the heads of allies, enemies, bosses and the boss tank (text tables: BANTER in 10-data.js).
   They are decided on the host or in solo play and replicated to clients as one-shot 'b' fx events; they never change the
   simulation. `banterRate` scales every chance (0 = silent, used by the tests). */
let bubbles=[],banterT=0,banterScanT=0,allyWarnT=0,bossTier=0,banterRate=1;
const roll=p=>Math.random()<p*banterRate;
const allyBark=type=>{const a=allies.find(x=>!x.remote&&x.alive&&!x.hostage);if(a)bark(a,type);};
function bubbleSprite(text,tone,label){
  /* A big, high-contrast bubble: constant size on the screen (no distance shrinking), not dimmed by fog or tone mapping. */
  const font='bold 36px sans-serif',nfont='bold 22px sans-serif',m=document.createElement('canvas').getContext('2d');
  m.font=font;let tw=m.measureText(text).width;m.font=nfont;const lw=label?m.measureText(label).width:0;
  const w=Math.min(780,Math.ceil(Math.max(tw,lw))+60),h=label?96:70,c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d'),col=tone==='boss'?'#ffd23a':tone==='ally'?'#6ab7ff':'#ff7a6a';
  x.fillStyle=tone==='boss'?'rgba(52,34,4,.96)':tone==='ally'?'rgba(8,30,56,.96)':'rgba(52,10,8,.96)';
  const r=14;x.beginPath();x.moveTo(r+3,3);x.lineTo(w-r-3,3);x.arcTo(w-3,3,w-3,r+3,r);x.lineTo(w-3,h-r-3);x.arcTo(w-3,h-3,w-r-3,h-3,r);x.lineTo(r+3,h-3);x.arcTo(3,h-3,3,h-r-3,r);x.lineTo(3,r+3);x.arcTo(3,3,r+3,3,r);x.closePath();
  x.fill();x.lineWidth=5;x.strokeStyle=col;x.stroke();
  x.textAlign='center';x.textBaseline='middle';
  if(label){x.font=nfont;x.fillStyle=col;x.fillText(label,w/2,24);}
  x.font=font;x.lineWidth=5;x.strokeStyle='rgba(0,0,0,.9)';x.strokeText(text,w/2,label?64:h/2+1);x.fillStyle='#fff';x.fillText(text,w/2,label?64:h/2+1);
  const tex=new THREE.CanvasTexture(c);tex.minFilter=THREE.LinearFilter;tex.generateMipmaps=false;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,fog:false,toneMapped:false,sizeAttenuation:false}));
  sp.renderOrder=10;sp.userData.sy=.1*h/70;sp.userData.sx=sp.userData.sy*w/h;sp.scale.set(sp.userData.sx,sp.userData.sy,1);
  return sp;
}
/** Short mumbled "voice": three quick blips, pitch by speaker. */
function voice(ent){
  const p=ent.g.position;if(Math.hypot(p.x-P.x,p.z-P.z)>30)return;
  const base=ent.boss||ent.type?95:(ent.ally?250:150),wave=ent.boss||ent.type?'sawtooth':'square';
  for(let i=0;i<3;i++)setTimeout(()=>beep(base*(.75+Math.random()*.6),.05,wave,.04),i*65);
}
function showBark(ent,type,ix){
  const list=BANTER[type];if(!list||!ent||!ent.g||!scene)return;
  let text=list[ix%list.length];const tone=ent.boss?'boss':ent.ally?'ally':'foe';
  let label=ent.type?'ARMATA CREW':ent.boss?'COMMANDER':ent.ally?String(ent.name||'Ally').toUpperCase():'';
  text=text.replace(/^Armata crew: /,'');
  const sp=bubbleSprite(text,tone,label);scene.add(sp);
  bubbles.push({sp,ent,t:0,life:2.6+text.length*.04,h:ent.type?5.2:ent.boss?(ent.g.scale.y||1)*2.1+1:2.5});
  while(bubbles.length>4){const o=bubbles.shift();scene.remove(o.sp);o.sp.material.map.dispose();o.sp.material.dispose();}
  voice(ent);
}
/** Make `ent` say a random line of `type`. Not on clients; `force` skips the cooldowns and the distance limit. */
function bark(ent,type,force){
  if(NET.role==='client'||!ent||!ent.g||!BANTER[type])return;
  if(!force){
    if(banterRate<=0||tAll<banterT||(ent.barkT&&tAll<ent.barkT))return;
    const p=ent.g.position;if(Math.hypot(p.x-P.x,p.z-P.z)>34)return;
  }
  banterT=tAll+.9;ent.barkT=tAll+6;
  const ix=Math.floor(Math.random()*BANTER[type].length);
  showBark(ent,type,ix);
  if(NET.role==='host'){
    const kind=ent.type?'v':ent.ally?'a':'e',list=ent.type?vehicles:ent.ally?allies.filter(a=>!a.remote):enemies,i=list.indexOf(ent);
    if(i>=0)fxPush(['b',kind,i,BANTER_KEYS.indexOf(type),ix]);
  }
}
const nearest=(list,ent,r)=>{let b=null,bd=r;for(const o of list){if(o===ent||!o.alive)continue;const d=Math.hypot(o.x-ent.x,o.z-ent.z);if(d<bd){bd=d;b=o;}}return b;};
/* hooks called from the damage code */
function banterEnemyHit(e){if(!e.dummy&&roll(.4))bark(e,'enemyHit');}
function banterEnemyKill(e){
  if(e.dummy||e.boss)return;
  if(roll(.4)){bark(e,'enemyDown');return;}
  const b=nearest(enemies,e,24);if(b&&roll(.6))bark(b,'enemyBuddyDown');
}
function banterPlayerHurt(){if(tAll>allyWarnT&&roll(.45)){allyWarnT=tAll+8;allyBark('allyWarn');}}
function bossBanter(){
  const b=enemies.find(e=>e.boss)||vehicles.find(v=>v.boss);if(!b)return;
  const tiers=[75,50,25,10];
  while(bossTier<tiers.length&&bossPct<=tiers[bossTier]){bark(b,(b.type?'tank':'boss')+tiers[bossTier],true);bossTier++;}
}
function updateBanter(dt){
  for(let i=bubbles.length-1;i>=0;i--){
    const b=bubbles[i];b.t+=dt;const p=b.ent.g.position;b.sp.position.set(p.x,p.y+b.h,p.z);
    b.sp.material.opacity=b.t>b.life-.5?Math.max(0,(b.life-b.t)/.5):1;
    const pop=b.t<.18?.7+.3*(b.t/.18):1;b.sp.scale.set(b.sp.userData.sx*pop,b.sp.userData.sy*pop,1);
    if(b.t>=b.life){scene.remove(b.sp);b.sp.material.map.dispose();b.sp.material.dispose();bubbles.splice(i,1);}
  }
  if(NET.role==='client'||banterRate<=0)return;
  banterScanT-=dt;if(banterScanT>0)return;banterScanT=.3;
  for(const e of enemies){if(!e.alive)continue;if(e.alerted&&!e._al){e._al=true;if(roll(.45))bark(e,'enemyAlert');}else if(!e.alerted)e._al=false;}
}
