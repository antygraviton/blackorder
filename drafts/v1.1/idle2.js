function updateHeliIdle(dt){
  if(pheli){pheli.rotor.rotation.y+=dt*(mounted&&mountedKind==='heli'?22:(pheli.alive?2:0));pheli.tail.rotation.x+=dt*(mounted&&mountedKind==='heli'?28:(pheli.alive?2:0));}
  let txt='';
  if(!mounted){
    if(pheli&&pheli.alive&&Math.hypot(P.x-pheli.g.position.x,P.z-pheli.g.position.z)<7)txt='Press E to board the helicopter';
    else if(pjeep&&pjeep.alive&&Math.hypot(P.x-pjeep.g.position.x,P.z-pjeep.g.position.z)<6)txt='Press E to board the jeep';
  } else if(mountedKind==='heli'&&pheli&&pheli.g.position.y-H(pheli.g.position.x,pheli.g.position.z)<4.5)txt='E = exit';
  else if(mountedKind==='jeep'&&pjeep&&Math.abs(pjeep.v)<4)txt='E = exit';
  $('prompt').textContent=pDead?'You died – back in '+Math.ceil(respT)+' s':txt;
}

