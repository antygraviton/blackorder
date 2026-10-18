/* ============ BANTER: speech bubbles and barks ============ */
/* Short one-liners above the heads of allies, enemies, bosses and the boss tank (text tables: BANTER in 10-data.js).
   They are decided on the host or in solo play and replicated to clients as one-shot 'b' fx events; they never change the
   simulation. `banterRate` scales every chance (0 = silent, used by the tests). */
let bubbles=[],banterT=0,banterScanT=0,allyWarnT=0,bossTier=0,banterRate=1;
const roll=p=>Math.random()<p*banterRate;
const allyBark=type=>{const a=allies.find(x=>!x.remote&&x.alive&&!x.hostage);if(a)bark(a,type);};
function bubbleSprite(text,tone){
  const font='bold 28px sans-serif',m=document.createElement('canvas').getContext('2d');m.font=font;
  const w=Math.min(640,Math.ceil(m.measureText(text).width)+40),h=60,c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');
  x.fillStyle=tone==='boss'?'rgba(60,40,6,.9)':tone==='ally'?'rgba(14,40,64,.88)':'rgba(56,14,12,.88)';
  x.strokeStyle=tone==='boss'?'#ffd23a':tone==='ally'?'#6ab7ff':'#ff7a6a';x.lineWidth=3;
  x.fillRect(2,2,w-4,h-4);x.strokeRect(2,2,w-4,h-4);
  x.font=font;x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(text,w/2,h/2+1);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false,depthWrite:false}));
  sp.renderOrder=10;sp.scale.set(w/90,h/90,1);
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
  const text=list[ix%list.length],tone=ent.boss?'boss':ent.ally?'ally':'foe';
  const sp=bubbleSprite(text,tone);scene.add(sp);
  bubbles.push({sp,ent,t:0,life:2.2+text.length*.035,h:ent.type?5.2:ent.boss?(ent.g.scale.y||1)*2.1+1:2.5});
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
  banterT=tAll+1.1;ent.barkT=tAll+7;
  const ix=Math.floor(Math.random()*BANTER[type].length);
  showBark(ent,type,ix);
  if(NET.role==='host'){
    const kind=ent.type?'v':ent.ally?'a':'e',list=ent.type?vehicles:ent.ally?allies.filter(a=>!a.remote):enemies,i=list.indexOf(ent);
    if(i>=0)fxPush(['b',kind,i,BANTER_KEYS.indexOf(type),ix]);
  }
}
const nearest=(list,ent,r)=>{let b=null,bd=r;for(const o of list){if(o===ent||!o.alive)continue;const d=Math.hypot(o.x-ent.x,o.z-ent.z);if(d<bd){bd=d;b=o;}}return b;};
/* hooks called from the damage code */
function banterEnemyHit(e){if(!e.dummy&&roll(.28))bark(e,'enemyHit');}
function banterEnemyKill(e){
  if(e.dummy||e.boss)return;
  if(roll(.3)){bark(e,'enemyDown');return;}
  const b=nearest(enemies,e,24);if(b&&roll(.45))bark(b,'enemyBuddyDown');
}
function banterPlayerHurt(){if(tAll>allyWarnT&&roll(.3)){allyWarnT=tAll+9;allyBark('allyWarn');}}
function bossBanter(){
  const b=enemies.find(e=>e.boss)||vehicles.find(v=>v.boss);if(!b)return;
  const tiers=[75,50,25,10];
  while(bossTier<tiers.length&&bossPct<=tiers[bossTier]){bark(b,(b.type?'tank':'boss')+tiers[bossTier],true);bossTier++;}
}
function updateBanter(dt){
  for(let i=bubbles.length-1;i>=0;i--){
    const b=bubbles[i];b.t+=dt;const p=b.ent.g.position;b.sp.position.set(p.x,p.y+b.h,p.z);
    b.sp.material.opacity=b.t>b.life-.5?Math.max(0,(b.life-b.t)/.5):1;
    if(b.t>=b.life){scene.remove(b.sp);b.sp.material.map.dispose();b.sp.material.dispose();bubbles.splice(i,1);}
  }
  if(NET.role==='client'||banterRate<=0)return;
  banterScanT-=dt;if(banterScanT>0)return;banterScanT=.3;
  for(const e of enemies){if(!e.alive)continue;if(e.alerted&&!e._al){e._al=true;if(roll(.3))bark(e,'enemyAlert');}else if(!e.alerted)e._al=false;}
}
