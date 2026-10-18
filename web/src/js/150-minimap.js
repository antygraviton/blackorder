/* ============ MINIMAP ============ */
const mmc=$('mm').getContext('2d');
function drawMap(){
  const W=320,sc=3.2;mmc.clearRect(0,0,W,W);
  mmc.save();mmc.beginPath();mmc.arc(160,160,158,0,Math.PI*2);mmc.clip();
  mmc.translate(160,160);mmc.rotate(P.yaw);mmc.scale(sc,sc);mmc.translate(-P.x,-P.z);
  for(const b of obst){if(b.nm)continue;mmc.fillStyle=b.f?'rgba(180,170,120,.7)':'rgba(120,130,110,.55)';mmc.fillRect(b.a,b.c,b.b-b.a,b.d-b.c);}
  mmc.fillStyle='#e8e8e0';for(const k of kits)if(!k.used)mmc.fillRect(k.x-.8,k.z-.8,1.6,1.6);
  mmc.fillStyle='#d6402a';
  for(const e of enemies){if(!e.alive||Math.hypot(e.x-P.x,e.z-P.z)>50)continue;mmc.beginPath();mmc.arc(e.x,e.z,1.5,0,Math.PI*2);mmc.fill();}
  mmc.fillStyle='#ff7a1e';
  for(const v of vehicles){if(!v.alive||v.type==='jet'||Math.hypot(v.g.position.x-P.x,v.g.position.z-P.z)>60)continue;mmc.fillRect(v.g.position.x-2,v.g.position.z-2,4,4);}
  mmc.fillStyle='#4aa8ff';
  for(const a of allies){if(!a.alive)continue;mmc.beginPath();mmc.arc(a.x,a.z,1.6,0,6.283);mmc.fill();}
  if(pheli&&pheli.alive&&!mounted)mmc.fillRect(pheli.g.position.x-2,pheli.g.position.z-2,4,4);
  mmc.restore();
  mmc.fillStyle='#e7e3d4';mmc.beginPath();mmc.moveTo(160,148);mmc.lineTo(168,170);mmc.lineTo(160,165);mmc.lineTo(152,170);mmc.closePath();mmc.fill();
}

