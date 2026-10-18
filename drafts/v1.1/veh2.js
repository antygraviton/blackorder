function toggleHeli(){
  if(over||pDead)return;
  if(mounted){
    if(mountedKind==='heli'&&pheli){const pos=pheli.g.position;
      if(pos.y-H(pos.x,pos.z)>4){say('Land to be able to exit (S = descend).',2);return;}
      mounted=false;P.x=pos.x+4;P.z=pos.z;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;pheli.vx=pheli.vy=pheli.vz=0;}
    else if(mountedKind==='jeep'&&pjeep){const pos=pjeep.g.position;
      if(Math.abs(pjeep.v)>4){say('Stop to be able to exit.',2);return;}
      mounted=false;P.x=pos.x+2.6;P.z=pos.z;P.y=H(P.x,P.z)+1.7;P.vy=0;P.ground=true;pjeep.v=0;}
    hud();return;
  }
  const dh=(pheli&&pheli.alive)?Math.hypot(P.x-pheli.g.position.x,P.z-pheli.g.position.z):1e9;
  const dj=(pjeep&&pjeep.alive)?Math.hypot(P.x-pjeep.g.position.x,P.z-pjeep.g.position.z):1e9;
  if(dh>7&&dj>6)return;
  if(dh<=dj){mounted=true;mountedKind='heli';aim=false;mouseDown=false;heliWeapon=0;
    say('Mi-24: mouse steers heading and pitch (nose down = fly forward), W climb, S descend, Space fire, 1–3 weapons, E exit',6);}
  else{mounted=true;mountedKind='jeep';aim=false;mouseDown=false;
    say('Jeep: W/S throttle and brake, A/D steering, the mouse aims the machine gun, Space fire, E exit',5);}
  hud();
}
