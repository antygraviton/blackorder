/* ============ TOUCH CONTROLS ============ */
/* Overlay for phones and tablets. It adds no game logic: it feeds the existing desktop input paths
   (synthetic key and mouse events, and the same yaw/pitch update as mousemove). Enabled on coarse
   pointers; ?touch=1 forces it on, ?touch=0 forces it off. */
let touchOn=false;
function touchWanted(){
  if(/[?&]touch=0\b/.test(location.search))return false;
  if(/[?&]touch=1\b/.test(location.search))return true;
  return !!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
}
function initTouch(force){
  if(touchOn||(!force&&!touchWanted()))return;
  touchOn=true;document.body.classList.add('touch');
  const root=document.createElement('div');root.id='touch';
  const BTN=[['tFire','Fire'],['tAim','Aim'],['tJump','Jump'],['tReload','Reload'],['tSwap','Swap'],['tNade','Nade'],['tUse','Use'],['tPause','II']];
  root.innerHTML='<div id="tJoy"></div><div id="tLook"></div><div id="tBase"><div id="tKnob"></div></div>'
    +BTN.map(b=>'<div class="tb" id="'+b[0]+'">'+b[1]+'</div>').join('')
    +'<div id="tRotate">Rotate your phone to landscape</div>';
  $('game').appendChild(root);
  const el=id=>root.querySelector('#'+id);
  const held={};
  const setKey=(code,down)=>{if(!!held[code]===down)return;held[code]=down;window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code}));};
  const tapKey=code=>{window.dispatchEvent(new KeyboardEvent('keydown',{code}));window.dispatchEvent(new KeyboardEvent('keyup',{code}));};
  const mouse=(type,button)=>window.dispatchEvent(new MouseEvent(type,{button}));
  const find=(e,id)=>Array.from(e.changedTouches).find(t=>t.identifier===id);
  let fsDone=false;
  const fsOnce=()=>{
    if(fsDone)return;fsDone=true;
    try{const d=document.documentElement,f=d.requestFullscreen||d.webkitRequestFullscreen;if(f){const p=f.call(d);if(p&&p.catch)p.catch(()=>{});}}catch(e){}
    try{if(screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(()=>{});}catch(e){}
  };
  const look=(dx,dy)=>{
    if(!canAct())return;
    const s=(.0004+S.sens/100*.0032)*2.2*(aim?.5:1);
    P.yaw-=dx*s;P.pitch=Math.max(-1.4,Math.min(1.4,P.pitch-dy*s));
    swayX=Math.max(-.04,Math.min(.04,swayX-dx*.0009));swayY=Math.max(-.03,Math.min(.03,swayY-dy*.0009));
  };
  const drag=(node,onStart,onMove,onEnd)=>{
    let id=null,lx=0,ly=0;
    node.addEventListener('touchstart',e=>{e.preventDefault();fsOnce();if(id!==null)return;const t=e.changedTouches[0];id=t.identifier;lx=t.clientX;ly=t.clientY;onStart&&onStart(t);},{passive:false});
    node.addEventListener('touchmove',e=>{e.preventDefault();const t=find(e,id);if(!t)return;onMove(t.clientX-lx,t.clientY-ly,t);lx=t.clientX;ly=t.clientY;},{passive:false});
    const end=e=>{e.preventDefault();if(!find(e,id))return;id=null;onEnd&&onEnd();};
    node.addEventListener('touchend',end,{passive:false});node.addEventListener('touchcancel',end,{passive:false});
  };
  // left stick: W/A/S/D, pushed to the edge = sprint
  const base=el('tBase'),knob=el('tKnob');
  let ox=0,oy=0;
  const stick=(dx,dy)=>{
    const R=60,m=Math.hypot(dx,dy)||1,k=Math.min(1,m/R),nx=dx/m*k,ny=dy/m*k;
    knob.style.transform='translate('+nx*36+'px,'+ny*36+'px)';
    setKey('KeyW',ny<-.3);setKey('KeyS',ny>.3);setKey('KeyA',nx<-.3);setKey('KeyD',nx>.3);setKey('ShiftLeft',k>.95&&ny<-.3);
  };
  let sx=0,sy=0;
  drag(el('tJoy'),t=>{ox=sx=t.clientX;oy=sy=t.clientY;base.style.left=ox+'px';base.style.top=oy+'px';base.style.display='block';stick(0,0);},
    (dx,dy)=>{sx+=dx;sy+=dy;stick(sx-ox,sy-oy);},()=>{base.style.display='none';stick(0,0);});
  // right side: look
  drag(el('tLook'),null,look);
  const press=(id,down,up)=>{
    const n=el(id);
    n.addEventListener('touchstart',e=>{e.preventDefault();fsOnce();n.classList.add('on');down();},{passive:false});
    const end=e=>{e.preventDefault();n.classList.remove('on');up&&up();};
    n.addEventListener('touchend',end,{passive:false});n.addEventListener('touchcancel',end,{passive:false});
  };
  // fire button also looks, so the thumb can shoot and aim at once
  const fireBtn=el('tFire');
  drag(fireBtn,()=>{fireBtn.classList.add('on');mouse('mousedown',0);},look,()=>{fireBtn.classList.remove('on');mouse('mouseup',0);});
  press('tAim',()=>{if(aim)mouse('mouseup',2);else mouse('mousedown',2);});
  press('tJump',()=>setKey('Space',true),()=>setKey('Space',false));
  press('tReload',()=>tapKey('KeyR'));
  press('tUse',()=>setKey('KeyE',true),()=>setKey('KeyE',false));
  press('tSwap',()=>{if(mounted||!run)return;for(let i=1;i<slots.length;i++){const j=(cur+i)%slots.length;if(wp[slots[j]]){sw(j);break;}}});
  press('tNade',()=>{
    if(mounted||!run||!slots[3]||!wp[slots[3]]||!(wp[slots[3]].n>0))return;
    const prev=cur;sw(3);if(canAct())fire(true);setTimeout(()=>sw(prev),450);
  });
  press('tPause',()=>{if(run&&!over)pauseGame();});
}
initTouch(false);
