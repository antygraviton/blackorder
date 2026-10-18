/* ============ ENEMIES ============ */
function ikArm(par,Sp,Hd,pole,mat,reg){
  const a=.27,b=.26,d=Hd.clone().sub(Sp);let Ln=d.length();const mx=a+b-.01;if(Ln>mx){Hd=Sp.clone().add(d.clone().normalize().multiplyScalar(mx));Ln=mx;d.copy(Hd).sub(Sp);}
  const dir=d.clone().normalize();const x=(a*a-b*b+Ln*Ln)/(2*Ln),h=Math.sqrt(Math.max(0,a*a-x*x));
  const p=pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E=Sp.clone().add(dir.clone().multiplyScalar(x)).add(p.multiplyScalar(h));
  reg(segment(par,Sp,E,.05,.043,mat));reg(segment(par,E,Hd,.043,.036,mat));
  const gl=new THREE.Mesh(new THREE.BoxGeometry(.085,.075,.1),EM.glove);gl.position.copy(Hd);reg(gl);par.add(gl);
}
function mkEnemy(x,z){
  const kind=Math.floor(Math.random()*4);
  const g=new THREE.Group(),pts=[];
  const reg=(m,tag)=>{m.userData.enemy=g;m.userData.tag=tag||'body';m.castShadow=true;pts.push(m);return m;};
  const mk=(geo,mt,px,py,pz,par,tag)=>{const m=reg(new THREE.Mesh(geo,mt),tag);m.position.set(px,py,pz);(par||g).add(m);return m;};
  const camo=EM.camo[(kind+Math.floor(Math.random()*2))%3],carrier=EM.carrier[Math.floor(Math.random()*3)];
  const legs=[];
  for(const s of [-1,1]){
    const hip=new THREE.Group();hip.position.set(s*.1,.95,0);g.add(hip);
    mk(new THREE.CylinderGeometry(.085,.07,.46,8),camo,0,-.23,0,hip);
    const knee=new THREE.Group();knee.position.set(0,-.46,0);hip.add(knee);
    mk(new THREE.CylinderGeometry(.068,.052,.42,8),camo,0,-.21,0,knee);
    mk(new THREE.BoxGeometry(.11,.11,.3),EM.boot,0,-.45,.05,knee);
    mk(new THREE.BoxGeometry(.12,.12,.05),EM.carrier[2],0,-.02,.07,knee);
    legs.push({hip,knee});
  }
  mk(new THREE.BoxGeometry(.36,.2,.22),camo,0,1.0,0);
  mk(new THREE.BoxGeometry(.38,.04,.24),EM.black,0,1.08,0);
  mk(new THREE.BoxGeometry(.4,.5,.24),camo,0,1.33,0);
  mk(new THREE.BoxGeometry(.34,.38,.08),carrier,0,1.33,.15);
  mk(new THREE.BoxGeometry(.34,.38,.07),carrier,0,1.33,-.14);
  if(kind!==3)mk(new THREE.BoxGeometry(.3,.38,.14),EM.pack,0,1.34,-.22);
  for(const s of [-1,1])mk(new THREE.SphereGeometry(.07,8,6),camo,s*.22,1.53,0);
  mk(new THREE.CylinderGeometry(.045,.05,.09,8),EM.skin,0,1.61,0);
  /* head */
  const head=new THREE.Group();head.position.set(0,1.72,0);g.add(head);
  const hd=mk(new THREE.SphereGeometry(1,20,14),EM.face[kind],0,0,0,head,'head');hd.scale.set(.078,.105,.092);
  if(kind===0||kind===2){
    const hm=mk(new THREE.SphereGeometry(1,20,12,0,Math.PI*2,0,Math.PI*.56),EM.helm[kind===0?0:1],0,.02,-.005,head,'head');hm.scale.set(.1,.095,.115);
    for(const s of [-1,1]){const cup=mk(new THREE.CylinderGeometry(.04,.04,.03,10),EM.black,s*.088,-.005,-.005,head,'head');cup.rotation.z=Math.PI/2;}
    if(kind===0){
      mk(new THREE.BoxGeometry(.05,.04,.05),EM.black,0,.1,.09,head,'head');
      for(const s of [-1,1]){const tb=mk(new THREE.CylinderGeometry(.025,.025,.09,10),EM.black,s*.032,.115,.14,head,'head');tb.rotation.x=Math.PI/2;
        const gl=new THREE.Mesh(new THREE.CircleGeometry(.018,10),EM.nvg);gl.position.set(s*.032,.115,.186);head.add(gl);}
      mk(new THREE.BoxGeometry(.01,.01,.09),EM.black,-.08,-.04,.06,head,'head');
    } else {
      mk(new THREE.BoxGeometry(.14,.045,.03),EM.lens,0,.03,.103,head,'head');mk(new THREE.BoxGeometry(.2,.03,.18),EM.black,0,.035,.0,head,'head');
    }
  } else if(kind===1){
    mk(new THREE.CylinderGeometry(.088,.1,.09,12),camo,0,.1,0,head,'head');
    const br=mk(new THREE.CylinderGeometry(.2,.2,.012,16),camo,0,.07,0,head,'head');br.position.y=.062;
  } else {
    mk(new THREE.CylinderGeometry(.085,.093,.07,12),EM.helm[0],0,.1,0,head,'head');
    const bl=mk(new THREE.BoxGeometry(.1,.01,.08),EM.helm[0],0,.075,-.13,head,'head');
  }
  /* weapon */
  const wk=['hk416','hk416','ak','mp5'][Math.floor(Math.random()*4)];
  const rf=gunModel(wk,false);rf.rotation.y=Math.PI;rf.position.set(.03,1.42,-.04);g.add(rf);
  rf.traverse(o=>{if(o.isMesh){o.userData.enemy=g;o.userData.tag='body';o.castShadow=true;pts.push(o);}});
  const ud=rf.userData;
  const toW=(l)=>new THREE.Vector3(-l[0]+rf.position.x,l[1]+rf.position.y,-l[2]+rf.position.z);
  ikArm(g,new THREE.Vector3(.22,1.5,0),toW(ud.rh),new THREE.Vector3(.6,-1,-.5),camo,reg);
  ikArm(g,new THREE.Vector3(-.22,1.5,0),toW(ud.lh),new THREE.Vector3(-.6,-1,-.2),camo,reg);
  const mw=toW(ud.muzzle);
  const mf=new THREE.Mesh(new THREE.SphereGeometry(.1,6,6),new THREE.MeshBasicMaterial({color:0xffd070}));mf.position.copy(mw);mf.visible=false;g.add(mf);
  g.position.set(x,H(x,z),z);scene.add(g);
  return {g,hp:Math.round(L.hp*DIFF().hp),cd:1+Math.random()*2,x,z,alive:true,strafe:Math.random()<.5?1:-1,st:0,parts:pts,legs,mf,mfT:0,dt:0,flinch:0,walk:Math.random()*6,idle:Math.random()*6,alerted:false,stun:0,head};
}

