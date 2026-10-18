/* ============ MENU ============ */
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));if(['menu','play','store'].includes(id))refresh();}
function refresh(){
  $('pName').textContent=S.name;$('pTag').textContent='LVL: '+lvl();
  $('pStats').innerHTML='Kills: <span>'+S.kills+'</span><br>Missions completed: <span>'+S.missions+'</span><br>Deaths: <span>'+S.deaths+'</span>';
  document.querySelectorAll('[data-wallet]').forEach(e=>e.innerHTML='Weapoints: <b>'+S.wp+'</b> · Medals: <b>'+S.medals+'</b>');
  renderPlay();renderStore();
}
let playTab='camp';
function renderPlay(){
  const tabs=$('playTabs');tabs.innerHTML='';
  [['camp','Campaign'],['quick','Quick Games']].forEach(([id,t])=>{const b=document.createElement('button');b.className='tab'+(playTab===id?' on':'');b.textContent=t;b.onclick=()=>{playTab=id;renderPlay();};tabs.appendChild(b);});
  const lo=$('loadout');lo.innerHTML='Loadout: <b>'+WEAPONS[S.primary].name+'</b> · <b>'+WEAPONS[S.secondary].name+'</b> · <b>'+WEAPONS[S.melee||'knife'].name+'</b> · <b>'+WEAPONS[S.grenade||'m67'].name+'</b> ';
  const sb=document.createElement('button');sb.className='btn small';sb.textContent='Edit in Store';sb.onclick=()=>show('store');lo.appendChild(sb);
  const box=$('playBody');box.innerHTML='';
  const sec=t=>{const h=document.createElement('h4');h.className='sec';h.textContent=t;box.appendChild(h);};
  const card=(h,p,btn,fn,off)=>{const c=document.createElement('div');c.className='card'+(off?' off':'');c.innerHTML='<h3>'+h+'</h3><p>'+p+'</p>';if(btn){const b=document.createElement('button');b.className='btn small';b.textContent=btn;b.disabled=!!off;b.onclick=fn;c.appendChild(b);}box.appendChild(c);return c;};
  if(playTab==='camp'){
    sec('1. Choose a campaign');
    const row=document.createElement('div');row.className='tabs';row.style.gridColumn='1/-1';row.style.marginBottom='0';
    CAMPS.forEach((c,ci)=>{const t=document.createElement('button');t.className='tab'+(ci===playCamp?' on':'');t.textContent='Campaign '+(ci+1)+': '+c.n;t.onclick=()=>{playCamp=ci;renderPlay();};row.appendChild(t);});
    box.appendChild(row);
    const st=card(CAMPS[playCamp].n,CAMPS[playCamp].txt);st.style.gridColumn='1/-1';
    sec('2. Choose a mission');
    LEVELS.forEach((L,i)=>{
      if(L.camp!==playCamp)return;
      const open=unlocked(i);
      let info='Infantry: <b>'+L.en+'</b> · Mines: <b>'+L.mines+'</b>';
      if(L.apcs)info+=' · APCs: <b>'+L.apcs+'</b>';
      if(L.tanks)info+=' · Tanks: <b>'+L.tanks+'</b>';
      if(L.helis)info+=' · Helicopters: <b>'+L.helis+'</b>';
      if(L.jets)info+=' · Jets: <b>'+L.jets+'</b>';
      card('Mission '+(idxIn(i)+1)+': '+L.n,L.txt+'<br>'+info+'<br>Reward: '+L.reward+' WP, '+L.medals+' medals',open?'Start mission':'Locked',()=>startMission(i),!open);
    });
  } else {
    sec('Available now');
    card('Training','Shooting range with every weapon: targets and armored vehicles respawn, ammo is unlimited and you cannot die. Q switches weapon.','Start Training',()=>startMode('training'));
    card('Survival','Endless waves of enemies, getting stronger (armor from wave 3, helicopters from wave 5). Record: <b>'+(S.bestWave||0)+'</b> waves.','Start Survival',()=>startMode('survival'));
    card('Team Match vs Bots','Team of players versus bots. First to 25 kills wins (or whoever has more kills after 6 minutes). After you die you respawn.','Start team match',()=>startMode('tdm'));
    sec('Online');
    card('Multiplayer','Play the campaign with up to three players (friends replace the AI allies) or a team match against bots with friends.','Open Multiplayer',()=>show('multi'));
    sec('Coming soon');
    card('Zombie Arena','The result of the Order’s experiments. Coming later.');
  }
}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.go)));
$('quitBtn').onclick=()=>{document.body.innerHTML='<div style="display:grid;place-items:center;height:100%;font-family:sans-serif;color:#9aa39a">Game closed. Reload the page to return.</div>';};
document.querySelectorAll('[data-stab]').forEach(t=>t.onclick=()=>{
  document.querySelectorAll('[data-stab]').forEach(x=>x.classList.toggle('on',x===t));
  ['audio','controls','gamet'].forEach(k=>$('st-'+k).style.display=(k===t.dataset.stab)?'block':'none');
});
$('setVol').value=S.vol;$('setSens').value=S.sens;$('setFov').value=S.fov;$('setQ').value=S.q;
$('setVol').oninput=e=>{S.vol=+e.target.value;save();};
$('setSens').oninput=e=>{S.sens=+e.target.value;save();};
$('setFov').oninput=e=>{S.fov=+e.target.value;save();};
$('setQ').onchange=e=>{S.q=+e.target.value;save();};
$('resetSave').onclick=()=>{S=JSON.parse(JSON.stringify(DEF));save();$('setVol').value=S.vol;$('setSens').value=S.sens;$('setFov').value=S.fov;$('setQ').value=S.q;$('setDiff').value=S.diff;refresh();};
let cat='primary';
document.querySelectorAll('[data-cat]').forEach(t=>t.onclick=()=>{cat=t.dataset.cat;document.querySelectorAll('[data-cat]').forEach(x=>x.classList.toggle('on',x===t));renderStore();});
function renderPerks(){
  const box=$('storeList');box.innerHTML='';
  const info=document.createElement('p');info.className='tag';info.textContent='You can have up to 2 perks selected. They unlock by level (your level: '+lvl()+').';box.appendChild(info);
  PERKS.forEach(p=>{
    const open=lvl()>=p.lvl,on=hasPerk(p.id);
    const d=document.createElement('div');d.className='item';if(!open)d.style.opacity=.55;
    d.innerHTML='<div class="n">'+p.n+'<small>'+p.desc+'</small></div><span class="tag">'+(open?(on?'Selected':'Unlocked'):'Level '+p.lvl)+'</span>';
    const b=document.createElement('button');b.className='btn small';b.textContent=on?'Remove':'Select';b.disabled=!open;
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
      d.innerHTML='<div class="n">'+a.n+'<small>'+a.desc+'</small></div><span class="tag">'+(own?(on?'Equipped':'Owned'):a.price+' Weapoints')+'</span>';
      const b=document.createElement('button');b.className='btn small';
      if(!own){b.textContent='Buy';b.onclick=()=>{if(S.wp>=a.price){S.wp-=a.price;S.attOwned[id]=1;save();refresh();}else $('storeMsg').textContent='Not enough Weapoints ('+S.wp+' / '+a.price+').';};}
      else{b.textContent=on?'Remove':'Equip';b.onclick=()=>{S.att[slot]=on?'':id;save();renderStore();};}
      d.appendChild(b);box.appendChild(d);
    });
  });
}
function renderStore(){
  if(cat==='perks')return renderPerks();
  if(cat==='att')return renderAtt();
  const box=$('storeList');box.innerHTML='';
  Object.entries(WEAPONS).filter(([k,w])=>w.cat===cat).forEach(([k,w])=>{
    const d=document.createElement('div');d.className='item';
    const owned=S.owned[k];const info=owned?'Owned':(w.medals?w.medals+' medals':w.price+' Weapoints');
    d.innerHTML='<div class="n">'+w.name+'<small>'+w.desc+(w.mag?' · magazine '+w.mag:'')+'</small></div><span class="tag">'+info+'</span>';
    const b=document.createElement('button');b.className='btn small';
    if(!owned){b.textContent='Buy';b.onclick=()=>{
      if(w.medals){if(S.medals>=w.medals){S.medals-=w.medals;S.owned[k]=1;save();refresh();}else $('storeMsg').textContent='Not enough medals ('+S.medals+' / '+w.medals+'). You earn them in missions.';}
      else{if(S.wp>=w.price){S.wp-=w.price;S.owned[k]=1;save();refresh();}else $('storeMsg').textContent='Not enough Weapoints ('+S.wp+' / '+w.price+').';}
    };}
    else{const cur=S[w.cat]===k;b.textContent=cur?'Equipped':'Equip';b.disabled=cur;b.onclick=()=>{S[w.cat]=k;save();refresh();};}
    d.appendChild(b);box.appendChild(d);
  });
}
$('setDiff').value=S.diff;$('setDiff').onchange=e=>{S.diff=+e.target.value;save();};
