/* ============ WEAPON MODELS ============ */
function gunModel(k,det){
  const g=new THREE.Group();
  const A=(geo,m,x,y,z,rx,ry,rz)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(ry)o.rotation.y=ry;if(rz)o.rotation.z=rz;g.add(o);return o;};
  const B=(w,h,d,m,x,y,z,rx)=>A(new THREE.BoxGeometry(w,h,d),m,x,y,z,rx);
  const TB=(w,h,d,t,m,x,y,z,rx)=>A(tbox(w,h,d,t),m,x,y,z,rx);
  const C=(r,len,m,x,y,z,open)=>A(new THREE.CylinderGeometry(r,r,len,det?14:8,1,!!open),m,x,y,z,Math.PI/2);
  const disc=(r,x,y,z,ry)=>A(new THREE.CircleGeometry(r,14),GM.glass,x,y,z,0,ry||0);
  let ud={muzzle:[0,0,-.8],rh:[0,-.1,-.03],lh:[0,-.03,-.5],sy:.08};
  if(k==='hk416'){
    B(.05,.07,.22,GM.tan,0,-.045,-.13);B(.052,.062,.32,GM.tan,0,.018,-.2);
    TB(.03,.012,.6,.05,GM.rail,0,.056,-.32);
    TB(.064,.068,.34,.06,GM.mlok,0,.012,-.52);
    C(.0095,.14,GM.black,0,.014,-.74);C(.016,.075,GM.black,0,.014,-.82);
    B(.034,.17,.07,GM.black,0,-.15,-.15,.1);B(.036,.11,.05,GM.polymer,0,-.115,-.02,.4);
    C(.016,.2,GM.tan,0,.012,.06);B(.042,.1,.17,GM.tan,0,-.008,.2);
    if(det){B(.02,.03,.02,GM.black,0,.075,-.64);B(.014,.04,.06,GM.black,0,-.05,-.1);
      C(.027,.1,GM.optic,0,.1,-.24,true);C(.031,.03,GM.optic,0,.1,-.3,true);B(.03,.03,.07,GM.black,0,.075,-.24);
      disc(.022,0,.1,-.3,Math.PI);disc(.022,0,.1,-.19,0);
      const l1=A(new THREE.CircleGeometry(.005,8),new THREE.MeshBasicMaterial({color:0x7dffd0}),0,.1,-.299,0,Math.PI);}
    else{C(.028,.1,GM.black,0,.1,-.24);B(.03,.03,.07,GM.black,0,.075,-.24);}
    ud={muzzle:[0,.014,-.87],rh:[0,-.115,-.02],lh:[0,-.035,-.52],sy:.1};
  }
  else if(k==='ak'||k==='bayonet'){
    B(.05,.075,.3,GM.black,0,0,-.18);B(.044,.03,.3,GM.black,0,.05,-.18);
    TB(.054,.05,.22,.08,GM.wood,0,-.005,-.46);TB(.05,.03,.2,.08,GM.wood,0,.04,-.46);
    C(.011,.22,GM.black,0,.07,-.5);C(.0095,.3,GM.black,0,.02,-.7);C(.015,.06,GM.black,0,.02,-.86);
    B(.012,.04,.012,GM.black,0,.045,-.82);
    B(.034,.1,.07,GM.orange,0,-.1,-.16,.15);B(.034,.1,.07,GM.orange,0,-.19,-.12,.5);
    B(.038,.11,.05,GM.wood,0,-.1,-.04,.35);TB(.04,.09,.3,.08,GM.wood,0,-.01,.2);
    if(det){B(.012,.03,.03,GM.black,0,.075,-.3);}
    if(k==='bayonet'){B(.012,.035,.22,GM.steel,0,-.012,-1.0);B(.012,.02,.05,GM.black,0,.008,-.9);}
    ud={muzzle:[0,.02,-.9],rh:[0,-.1,-.04],lh:[0,-.03,-.46],sy:.078};
  }
  else if(k==='mp5'){
    B(.05,.07,.3,GM.black,0,0,-.18);TB(.058,.055,.22,.06,GM.polymer,0,-.01,-.45);
    C(.011,.08,GM.black,0,.01,-.62);B(.012,.03,.012,GM.black,0,.035,-.66);
    B(.032,.12,.06,GM.black,0,-.12,-.2,.05);B(.032,.1,.06,GM.black,0,-.22,-.19,.15);
    B(.036,.11,.05,GM.polymer,0,-.1,-.04,.35);C(.009,.22,GM.black,.025,.01,.12);B(.04,.09,.03,GM.black,0,0,.23);
    ud={muzzle:[0,.01,-.67],rh:[0,-.1,-.04],lh:[0,-.03,-.44],sy:.065};
  }
  else if(k==='svd'){
    B(.052,.075,.28,GM.black,0,0,-.17);TB(.05,.05,.3,.08,GM.wood,0,-.005,-.5);
    C(.013,.4,GM.black,0,.02,-.85);C(.018,.07,GM.black,0,.02,-1.07);
    TB(.045,.1,.34,.08,GM.wood,0,-.02,.2);B(.034,.1,.07,GM.black,0,-.1,-.15,.1);
    C(.02,.2,GM.optic,0,.098,-.2,true);C(.028,.06,GM.optic,0,.098,-.32,true);C(.025,.04,GM.optic,0,.098,-.08,true);
    B(.03,.03,.1,GM.black,0,.07,-.2);disc(.026,0,.098,-.35,Math.PI);disc(.02,0,.098,-.06,0);
    ud={muzzle:[0,.02,-1.12],rh:[0,-.1,-.03],lh:[0,-.03,-.5],sy:.098};
  }
  else if(k==='shotgun'){
    B(.05,.07,.22,GM.black,0,0,-.13);C(.013,.6,GM.black,0,.02,-.55);C(.012,.5,GM.black,0,-.03,-.5);
    TB(.05,.05,.2,.08,GM.wood,0,-.03,-.45);TB(.045,.09,.3,.08,GM.wood,0,-.02,.17);
    B(.04,.1,.05,GM.wood,0,-.09,-.02,.3);B(.008,.02,.008,GM.steel,0,.035,-.84);
    ud={muzzle:[0,.02,-.86],rh:[0,-.09,-.02],lh:[0,-.03,-.45],sy:.06};
  }
  else if(k==='glock'){
    B(.03,.036,.2,GM.black,0,.03,-.1);B(.028,.022,.17,GM.polymer,0,.0,-.1);
    B(.03,.1,.045,GM.polymer,0,-.05,.0,-.2);B(.012,.03,.05,GM.polymer,0,-.025,-.12);
    B(.006,.012,.008,GM.black,0,.054,-.19);B(.01,.012,.008,GM.black,0,.054,-.015);
    C(.005,.02,GM.black,0,.03,-.205);
    if(det){for(let i=0;i<4;i++)B(.032,.03,.004,GM.polymer,0,.03,-.02-i*.008);}
    ud={muzzle:[0,.03,-.22],rh:[0,-.04,.0],lh:[-.02,-.06,-.02],sy:.056};
  }
  else if(k==='revolver'){
    B(.028,.05,.14,GM.steel,0,0,-.07);C(.026,.06,GM.steel,0,.012,-.14);
    if(det)for(let i=0;i<6;i++){const a=i*1.047;C(.006,.062,GM.black,Math.cos(a)*.017,.012+Math.sin(a)*.017,-.14);}
    C(.008,.17,GM.steel,0,.012,-.255);B(.012,.02,.17,GM.steel,0,.04,-.25);
    B(.01,.03,.015,GM.steel,0,.04,-.015,-.4);TB(.032,.1,.045,.05,GM.wood,0,-.06,.0,-.25);
    ud={muzzle:[0,.012,-.345],rh:[0,-.05,.0],lh:[-.02,-.065,-.02],sy:.05};
  }
  else if(k==='knife'){
    const sh=new THREE.Shape();sh.moveTo(0,-.014);sh.lineTo(.16,-.014);sh.quadraticCurveTo(.215,-.012,.24,.012);sh.lineTo(.12,.018);sh.lineTo(0,.018);sh.closePath();
    const bg=new THREE.ExtrudeGeometry(sh,{depth:.004,bevelEnabled:false});bg.rotateY(Math.PI/2);bg.translate(-.002,0,-.02);
    A(bg,GM.blade,0,0,0);
    B(.012,.05,.012,GM.black,0,0,-.02);C(.016,.11,GM.wrap,0,0,.04);A(new THREE.SphereGeometry(.017,8,6),GM.black,0,0,.1);
    ud={muzzle:null,rh:[0,-.005,.045],lh:null,sy:.0};
  }
  else if(k==='m67'){
    A(new THREE.SphereGeometry(.036,16,12),GM.gren,0,0,0);C(.012,.03,GM.steel,0,.04,0);
    const sp=B(.012,.07,.006,GM.steel,.028,.045,0,0);sp.rotation.z=-.5;
    A(new THREE.TorusGeometry(.014,.002,6,10),GM.steel,-.02,.05,0);
    ud={muzzle:null,rh:[0,-.03,.0],lh:null,sy:0};
  }

  else if(k==='rpg'){
    C(.04,.9,GM.black,0,.03,-.45);C(.065,.22,GM.orange,0,.03,-1.0);B(.06,.09,.22,GM.polymer,0,-.01,-.05);
    B(.036,.11,.05,GM.polymer,0,-.1,-.2,.3);B(.02,.05,.05,GM.black,0,.09,-.3);
    ud={muzzle:[0,.03,-1.15],rh:[0,-.1,-.2],lh:[0,-.03,-.62],sy:.09};
  }
  else if(k==='bow'){
    B(.03,.18,.04,GM.wood,0,0,-.38);B(.02,.26,.02,GM.wood,0,.2,-.34,.35);B(.02,.26,.02,GM.wood,0,-.2,-.34,-.35);
    B(.004,.5,.004,GM.steel,0,0,-.22);B(.008,.008,.65,GM.wood,0,.02,-.5);B(.012,.02,.03,GM.steel,0,.02,-.83);
    ud={muzzle:[0,.02,-.83],rh:[0,0,-.22],lh:[0,0,-.38],sy:.05};
  }
  else if(k==='dpistol'){
    for(const kx of [-1,1]){const x=kx*.045;
      B(.03,.036,.2,GM.black,x,.03,-.1);B(.028,.022,.17,GM.polymer,x,0,-.1);
      B(.03,.1,.045,GM.polymer,x,-.05,0,-.2);B(.012,.03,.05,GM.polymer,x,-.025,-.12);}
    ud={muzzle:[0,.03,-.22],rh:[.045,-.04,0],lh:[-.045,-.04,0],sy:.056};
  }
  else if(k==='napalm'){
    B(.04,.045,.22,GM.polymer,0,.03,-.11);B(.03,.1,.045,GM.polymer,0,-.05,0,-.2);
    C(.035,.16,GM.orange,0,-.012,-.16);C(.012,.08,GM.steel,0,.03,-.26);
    ud={muzzle:[0,.03,-.3],rh:[0,-.04,0],lh:[-.02,-.06,-.02],sy:.056};
  }
  else if(k==='hardbass'){
    B(.04,.045,.2,GM.polymer,0,.03,-.1);B(.03,.1,.045,GM.polymer,0,-.05,0,-.2);
    C(.055,.03,GM.orange,0,.03,-.22);C(.04,.04,GM.black,0,.03,-.24);
    ud={muzzle:[0,.03,-.26],rh:[0,-.04,0],lh:[-.02,-.06,-.02],sy:.056};
  }
  else if(k==='machete'){
    B(.012,.075,.42,GM.steel,0,.005,-.28);B(.012,.09,.015,GM.black,0,0,-.06);C(.016,.12,GM.polymer,0,0,0);
    ud={muzzle:null,rh:[0,-.005,0],lh:null,sy:0};
  }
  else if(k==='hammer'){
    C(.016,.5,GM.wood,0,0,-.2);B(.13,.06,.06,GM.black,0,0,-.46);
    ud={muzzle:null,rh:[0,-.005,0],lh:null,sy:0};
  }
  else if(k==='crossbow'){
    B(.04,.05,.5,GM.wood,0,-.01,-.3);B(.5,.02,.025,GM.black,0,.005,-.55);B(.004,.004,.3,GM.steel,0,.01,-.45);
    B(.008,.008,.38,GM.wood,0,.03,-.45);B(.036,.09,.05,GM.polymer,0,-.1,-.12,.2);
    ud={muzzle:[0,.03,-.64],rh:[0,-.07,-.1],lh:[0,-.04,-.42],sy:.06};
  }
  else if(k==='shield'){
    B(.6,.78,.05,GM.shieldBlue,-.04,0,-.38);B(.34,.09,.056,GM.shieldGlass,-.04,.2,-.38);B(.55,.03,.06,GM.black,-.04,-.36,-.38);
    ud={muzzle:null,rh:[-.1,-.05,-.28],lh:null,sy:0};
  }
  else if(k==='dynamite'){
    for(const k2 of [-1,0,1])C(.022,.2,GM.red,k2*.045,0,-.03);
    B(.14,.012,.02,GM.black,0,0,-.03);B(.004,.06,.004,GM.steel,0,.04,-.13);
    ud={muzzle:null,rh:[0,-.03,0],lh:null,sy:0};
  }
  else if(k==='smoke'){
    C(.035,.14,GM.grayCan,0,0,0);C(.037,.02,GM.black,0,0,0);
    ud={muzzle:null,rh:[0,-.03,0],lh:null,sy:0};
  }
  else if(k==='flash'){
    C(.03,.13,GM.black,0,0,0);C(.032,.02,GM.orange,0,0,0);
    ud={muzzle:null,rh:[0,-.03,0],lh:null,sy:0};
  }
  g.userData=ud;return g;
}
function glove(parent,x,y,z,flip){
  const g=new THREE.Group(),m=GM.glove;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.08,.04,.09),m));
  for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.CylinderGeometry(.009,.008,.055,6),m);f.rotation.x=Math.PI/2;f.position.set(-.027+i*.018,-.018,-.06);g.add(f);}
  const t=new THREE.Mesh(new THREE.BoxGeometry(.022,.022,.05),m);t.position.set(flip*.045,.004,-.03);g.add(t);
  const cuff=new THREE.Mesh(new THREE.BoxGeometry(.085,.05,.04),GM.polymer);cuff.position.z=.065;g.add(cuff);
  g.position.set(x,y,z);parent.add(g);return g;
}
function segment(parent,A,B,r1,r2,mat){
  const len=A.distanceTo(B);const m=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,len,8),mat);
  m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());parent.add(m);return m;
}
function viewModel(k){
  const g=gunModel(k,true),ud=g.userData;
  const H1=new THREE.Vector3(...ud.rh);
  glove(g,ud.rh[0],ud.rh[1],ud.rh[2],-1);
  segment(g,H1.clone().add(new THREE.Vector3(.01,0,.05)),H1.clone().add(new THREE.Vector3(.15,-.3,.5)),.045,.05,GM.camoSleeve);
  if(ud.lh){const L1=new THREE.Vector3(...ud.lh);glove(g,ud.lh[0],ud.lh[1],ud.lh[2],1);
    segment(g,L1.clone().add(new THREE.Vector3(0,0,.05)),L1.clone().add(new THREE.Vector3(-.28,-.28,.55)),.045,.05,GM.camoSleeve);}
  return g;
}

