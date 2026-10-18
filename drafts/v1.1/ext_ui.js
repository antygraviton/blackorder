/* ============ EXTENSION: UI (perks, attachments, archive, achievements) ============ */
function renderPerks(){
  const box=$('storeList');box.innerHTML='';
  const info=document.createElement('p');info.className='tag';info.textContent='You can have up to 2 perks selected. They unlock by level (your level: '+lvl()+').';box.appendChild(info);
  PERKS.forEach(p=>{
    const open=lvl()>=p.lvl,on=hasPerk(p.id);
    const d=document.createElement('div');d.className='item';if(!open)d.style.opacity=.55;
    d.innerHTML='<div class="n">'+p.n+'<small>'+p.desc+'</small></div><span class="tag">'+(open?(on?'Selected':'Unlocked'):'Level '+p.lvl)+'</span>';
    const b=document.createElement('button');b.className='btn small';b.textContent=on?'Sundat':'Vybrat';b.disabled=!open;
    b.onclick=()=>{S.perks=S.perks||[];const i=S.perks.indexOf(p.id);if(i>=0)S.perks.splice(i,1);else{if(S.perks.length>=2){$('storeMsg').textContent='You already have 2 perks. Remove one first.';return;}S.perks.push(p.id);}save();renderStore();};
    d.appendChild(b);box.appendChild(d);
  });
}
function renderAtt(){
  const box=$('storeList');box.innerHTML='';
  const info=document.createElement('p');info.className='tag';info.textContent='Attachments are applied to the weapon in the slot (only firearms without a special mode). One attachment per slot.';box.appendChild(info);
  [['primary','Primary'],['secondary','Secondary']].forEach(([slot,sn])=>{
    const h=document.createElement('h4');h.className='sec';h.style.gridColumn='auto';h.textContent=sn+': '+WEAPONS[S[slot]].name;box.appendChild(h);
    Object.entries(ATT).forEach(([id,a])=>{
      S.attOwned=S.attOwned||{};S.att=S.att||{};
      const own=S.attOwned[id],on=S.att[slot]===id;
      const d=document.createElement('div');d.className='item';
      d.innerHTML='<div class="n">'+a.n+'<small>'+a.desc+'</small></div><span class="tag">'+(own?(on?'Nasazeno':'Owned'):a.price+' Weapoints')+'</span>';
      const b=document.createElement('button');b.className='btn small';
      if(!own){b.textContent='Koupit';b.onclick=()=>{if(S.wp>=a.price){S.wp-=a.price;S.attOwned[id]=1;save();refresh();}else $('storeMsg').textContent='Not enough Weapoints ('+S.wp+' / '+a.price+').';};}
      else{b.textContent=on?'Sundat':'Nasadit';b.onclick=()=>{S.att[slot]=on?'':id;save();renderStore();};}
      d.appendChild(b);box.appendChild(d);
    });
  });
}
let xTab='ach';
function renderExtras(){
  document.querySelectorAll('[data-xt]').forEach(b=>b.classList.toggle('on',b.dataset.xt===xTab));
  const box=$('xBody');box.innerHTML='';
  if(xTab==='ach'){
    const n=ACH.filter(a=>S.ach&&S.ach[a.id]).length;
    const p=document.createElement('p');p.className='tag';p.textContent='Unlocked '+n+' z '+ACH.length;box.appendChild(p);
    ACH.forEach(a=>{const own=S.ach&&S.ach[a.id];const d=document.createElement('div');d.className='item';if(!own)d.style.opacity=.55;
      d.innerHTML='<div class="n">'+(own?'🏆 ':'🔒 ')+a.n+'<small>'+a.d+'</small></div><span class="tag">'+(own?'Completed':'Locked')+'</span>';box.appendChild(d);});
  } else if(xTab==='docs'){
    const n=DOCS.filter(d=>S.docs&&S.docs[d.id]).length;
    const p=document.createElement('p');p.className='tag';p.textContent='Nalezeno '+n+' z '+DOCS.length+'. Look for documents in campaign missions (golden glowing papers).';box.appendChild(p);
    DOCS.forEach(dc=>{const own=S.docs&&S.docs[dc.id];const d=document.createElement('div');d.className='item';d.style.display='block';if(!own)d.style.opacity=.55;
      d.innerHTML='<div class="n">'+(own?'📄 '+dc.t:'🔒 ???')+'<small>'+(own?dc.x:'This document has not been found yet.')+'</small></div>';box.appendChild(d);});
  } else {
    const r=S.rec||{};
    const rows=[['Survival – highest wave',(S.bestWave||0)],['Zombie Arena – highest wave',(r.zomb||0)],['Team Match – most kills',(r.tdm||0)]];
    const t=document.createElement('table');t.style.maxWidth='520px';
    rows.forEach(([a,b])=>{const tr=document.createElement('tr');tr.innerHTML='<td>'+a+'</td><td><b>'+b+'</b></td>';t.appendChild(tr);});
    box.appendChild(t);
    const h=document.createElement('h4');h.className='sec';h.style.marginTop='16px';h.textContent='Best mission times';box.appendChild(h);
    const t2=document.createElement('table');t2.style.maxWidth='520px';
    LEVELS.forEach(l=>{const s=(r.times||{})[l.n];const tr=document.createElement('tr');tr.innerHTML='<td>'+l.n+'</td><td>'+(s?Math.floor(s/60)+':'+String(s%60).padStart(2,'0'):'—')+'</td>';t2.appendChild(tr);});
    box.appendChild(t2);
  }
}
document.querySelectorAll('[data-xt]').forEach(b=>b.onclick=()=>{xTab=b.dataset.xt;renderExtras();});
$('setDiff').value=(S.diff===undefined?1:S.diff);$('setDiff').onchange=e=>{S.diff=+e.target.value;save();};
$('briefGo').onclick=beginLoad;$('briefBack').onclick=()=>{$('brief').classList.remove('on');show('play');};
