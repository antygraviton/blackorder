/* ============ TEXTURES (procedural) ============ */
const TX={};
function initTex(){
  if(TX.done)return;TX.done=1;
  TX.plaster=mkTex(256,256,(x,w,h)=>{x.fillStyle='#d3c8b0';x.fillRect(0,0,w,h);
    for(let i=0;i<2600;i++){x.fillStyle=Math.random()<.5?'rgba(255,255,255,'+Math.random()*.08+')':'rgba(60,50,30,'+Math.random()*.08+')';x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*6,2+Math.random()*6);}
    for(let i=0;i<14;i++){const gx=Math.random()*w,g=x.createLinearGradient(gx,0,gx,h*(.3+Math.random()*.6));g.addColorStop(0,'rgba(70,55,35,.2)');g.addColorStop(1,'rgba(70,55,35,0)');x.fillStyle=g;x.fillRect(gx,0,3+Math.random()*10,h);}
    for(let i=0;i<3;i++){const px=Math.random()*(w-70),py=40+Math.random()*(h-80);x.fillStyle='#8c5c46';x.fillRect(px,py,30+Math.random()*34,18+Math.random()*20);x.fillStyle='rgba(60,40,30,.5)';for(let k=0;k<4;k++)x.fillRect(px,py+k*6,40,1);}});
  TX.brick=mkTex(256,256,(x,w,h)=>{x.fillStyle='#6d625a';x.fillRect(0,0,w,h);for(let r=0;r<16;r++){const off=(r%2)*16;for(let c=-1;c<8;c++){const L=60+Math.random()*30,R_=90+Math.random()*30,B=70+Math.random()*25;x.fillStyle='rgb('+(130+L*.4|0)+','+(60+Math.random()*25|0)+','+(48+Math.random()*18|0)+')';x.fillRect(c*32+off+1,r*16+1,30,14);}}speck(x,w,h,1500,.15,'0,0,0');});
  TX.roof=mkTex(256,256,(x,w,h)=>{x.fillStyle='#4a2a22';x.fillRect(0,0,w,h);for(let r=0;r<10;r++){const off=(r%2)*14;for(let c=-1;c<10;c++){const g=x.createLinearGradient(0,r*26,0,r*26+26);const b=95+Math.random()*30|0;g.addColorStop(0,'rgb('+b+','+(b*.45|0)+','+(b*.33|0)+')');g.addColorStop(1,'rgb('+(b*.55|0)+','+(b*.25|0)+','+(b*.2|0)+')');x.fillStyle=g;x.fillRect(c*28+off+1,r*26,26,25);}}speck(x,w,h,800,.2,'0,0,0');});
  TX.wood=mkTex(256,256,(x,w,h)=>{x.fillStyle='#6a4b30';x.fillRect(0,0,w,h);for(let i=0;i<8;i++){x.fillStyle='rgba(0,0,0,.35)';x.fillRect(i*32,0,2,h);}for(let i=0;i<260;i++){x.strokeStyle='rgba('+(Math.random()<.5?'30,18,8':'140,100,60')+','+(.08+Math.random()*.15)+')';x.beginPath();const px=Math.random()*w;x.moveTo(px,0);x.lineTo(px+(Math.random()-.5)*8,h);x.stroke();}});
  TX.concrete=mkTex(256,256,(x,w,h)=>{x.fillStyle='#8e8c86';x.fillRect(0,0,w,h);speck(x,w,h,3500,.18,'255,255,255');speck(x,w,h,3500,.2,'0,0,0');x.strokeStyle='rgba(30,30,30,.4)';for(let i=0;i<4;i++){x.beginPath();let px=Math.random()*w,py=Math.random()*h;x.moveTo(px,py);for(let k=0;k<6;k++){px+=(Math.random()-.5)*30;py+=Math.random()*20;x.lineTo(px,py);}x.stroke();}});
  TX.rock=mkTex(256,256,(x,w,h)=>{const im=x.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const n=fbm(i*.035,j*.035,5),s=fbm(i*.2,j*.2,2),v=70+n*130+s*30,k=(j*w+i)*4;im.data[k]=v*1.03;im.data[k+1]=v*.98;im.data[k+2]=v*.9;im.data[k+3]=255;}x.putImageData(im,0,0);});
  TX.ground=mkTex(256,256,(x,w,h)=>{const im=x.createImageData(w,h);for(let j=0;j<h;j++)for(let i=0;i<w;i++){const n=fbm(i*.06,j*.06,4),s=Math.random()*.25,v=165+n*70+s*40,k=(j*w+i)*4;im.data[k]=v;im.data[k+1]=v;im.data[k+2]=v*.96;im.data[k+3]=255;}x.putImageData(im,0,0);for(let i=0;i<120;i++){x.fillStyle='rgba(60,50,40,'+Math.random()*.4+')';x.beginPath();x.arc(Math.random()*w,Math.random()*h,1+Math.random()*2.5,0,7);x.fill();}});
  TX.bark=mkTex(128,256,(x,w,h)=>{x.fillStyle='#4b3a29';x.fillRect(0,0,w,h);for(let i=0;i<90;i++){x.fillStyle='rgba('+(Math.random()<.5?'20,12,6':'110,85,60')+','+(.15+Math.random()*.3)+')';x.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*4,20+Math.random()*80);}});
  TX.leaf=mkTex(256,256,(x,w,h)=>{x.fillStyle='#4a7a38';x.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const g=60+Math.random()*90|0;x.fillStyle='rgba('+(g*.6|0)+','+(g+40)+','+(g*.4|0)+','+(.3+Math.random()*.5)+')';x.save();x.translate(Math.random()*w,Math.random()*h);x.rotate(Math.random()*6.3);x.beginPath();x.ellipse(0,0,2+Math.random()*5,1+Math.random()*2.5,0,0,7);x.fill();x.restore();}});
  TX.sandbag=mkTex(256,128,(x,w,h)=>{x.fillStyle='#4d4630';x.fillRect(0,0,w,h);for(let r=0;r<4;r++){for(let c=-1;c<4;c++){const off=(r%2)*32;x.fillStyle='rgb('+(150+Math.random()*30|0)+','+(130+Math.random()*25|0)+','+(95+Math.random()*20|0)+')';x.beginPath();x.ellipse(c*64+off+32,r*32+16,30,14,0,0,7);x.fill();x.strokeStyle='rgba(0,0,0,.4)';x.stroke();}}speck(x,w,h,900,.18,'0,0,0');});
  TX.rust=mkTex(256,256,(x,w,h)=>{x.fillStyle='#2f2823';x.fillRect(0,0,w,h);for(let i=0;i<500;i++){x.fillStyle='rgba('+(Math.random()<.5?'120,60,25':'12,10,8')+','+Math.random()*.3+')';x.fillRect(Math.random()*w,Math.random()*h,4+Math.random()*18,4+Math.random()*18);}});
  TX.chain=mkTex(128,128,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='rgba(150,155,150,.95)';x.lineWidth=2;for(let i=-8;i<16;i++){x.beginPath();x.moveTo(i*16,0);x.lineTo(i*16+128,128);x.stroke();x.beginPath();x.moveTo(i*16+128,0);x.lineTo(i*16,128);x.stroke();}});
  TX.smoke=mkTex(128,128,(x,w,h)=>{for(let i=0;i<14;i++){const px=40+Math.random()*48,py=40+Math.random()*48,r=22+Math.random()*26,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h);}},false);
  TX.star=mkTex(64,64,(x,w,h)=>{const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,250,210,1)');g.addColorStop(.25,'rgba(255,200,90,.9)');g.addColorStop(1,'rgba(255,120,20,0)');x.fillStyle=g;x.fillRect(0,0,64,64);x.strokeStyle='rgba(255,230,150,.9)';x.lineWidth=2;for(let i=0;i<6;i++){x.beginPath();x.moveTo(32,32);const a=i*1.047+Math.random();x.lineTo(32+Math.cos(a)*32,32+Math.sin(a)*32);x.stroke();}},false);
  /* camouflage */
  const blobs=(base,cols)=>mkTex(256,256,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);for(let i=0;i<70;i++){x.fillStyle=cols[i%cols.length];x.save();x.translate(Math.random()*w,Math.random()*h);x.rotate(Math.random()*6.3);x.beginPath();x.ellipse(0,0,10+Math.random()*28,6+Math.random()*16,0,0,7);x.fill();x.restore();}speck(x,w,h,1500,.14,'0,0,0');});
  TX.camoWood=blobs('#46512f',['#2b3520','#6b6a44','#1e2418','#5a5a38']);
  const digi=pal=>mkTex(256,256,(x,w,h)=>{const s=8;for(let i=0;i<w/s;i++)for(let j=0;j<h/s;j++){const n=fbm(i*.2,j*.2,3)+(Math.random()-.5)*.28;x.fillStyle=n<.36?pal[0]:n<.48?pal[1]:n<.6?pal[2]:pal[3];x.fillRect(i*s,j*s,s,s);}speck(x,w,h,800,.12,'0,0,0');});
  TX.camoDigi=digi(['#2a3322','#4b5a36','#7b7a52','#a59470']);
  TX.camoTan=digi(['#8a7650','#a99370','#c4b08a','#6e6040']);
  /* plate carrier with pouches */
  const carrier=(base,pouch)=>mkTex(128,128,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);x.strokeStyle='rgba(0,0,0,.25)';for(let i=0;i<w;i+=8){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}for(let j=0;j<h;j+=8){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke();}
    x.fillStyle=pouch;for(let i=0;i<3;i++){x.fillRect(14+i*36,70,28,44);x.strokeStyle='rgba(0,0,0,.6)';x.strokeRect(14+i*36,70,28,44);x.fillStyle='rgba(0,0,0,.25)';x.fillRect(14+i*36,70,28,8);x.fillStyle=pouch;}x.fillRect(14,14,40,36);x.strokeRect(14,14,40,36);speck(x,w,h,500,.2,'0,0,0');});
  TX.carTan=carrier('#9d8a64','#7e6d4c');TX.carOlive=carrier('#55583f','#3f422f');TX.carBlack=carrier('#25272a','#18191b');
  /* faces */
  const face=(kind)=>mkTex(1024,512,(x,w,h)=>{
    const skins=['#b98a68','#8f6445','#c9a083','#7a5238'],sk=skins[kind%4],hair=kind===1?'#2a1c12':'#1b1410';
    x.fillStyle=hair;x.fillRect(0,0,w,h);
    const cx=256;
    const g=x.createRadialGradient(cx,270,10,cx,270,190);g.addColorStop(0,sk);g.addColorStop(.75,sk);g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g;x.beginPath();x.ellipse(cx,282,150,190,0,0,7);x.fill();
    x.fillStyle=sk;x.fillRect(cx-170,220,340,60);
    x.fillStyle='rgba(0,0,0,.22)';x.beginPath();x.ellipse(cx,300,24,38,0,0,7);x.fill();
    x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.ellipse(cx,268,10,34,0,0,7);x.fill();
    for(const s of [-1,1]){const ex=cx+s*58;x.fillStyle='#e8e2d6';x.beginPath();x.ellipse(ex,244,22,10,0,0,7);x.fill();x.fillStyle=kind===1?'#3a5a3a':'#3b2a1c';x.beginPath();x.arc(ex+s*-1,244,8,0,7);x.fill();x.fillStyle='#000';x.beginPath();x.arc(ex+s*-1,244,3.5,0,7);x.fill();x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(ex,236,24,6,0,0,7);x.fill();
      x.fillStyle=hair;x.beginPath();x.moveTo(ex-s*24,226);x.quadraticCurveTo(ex,208,ex+s*30,222);x.lineTo(ex+s*30,214);x.quadraticCurveTo(ex,196,ex-s*24,215);x.fill();}
    x.fillStyle='rgba(120,50,40,.7)';x.beginPath();x.ellipse(cx,350,24,7,0,0,7);x.fill();x.fillStyle='rgba(0,0,0,.35)';x.fillRect(cx-24,349,48,2);
    if(kind===0){x.fillStyle='#1d1713';x.beginPath();x.moveTo(cx-120,255);x.quadraticCurveTo(cx-135,360,cx-80,420);x.quadraticCurveTo(cx,470,cx+80,420);x.quadraticCurveTo(cx+135,360,cx+120,255);x.lineTo(cx+80,300);x.quadraticCurveTo(cx,318,cx-80,300);x.fill();x.fillStyle='rgba(120,50,40,.8)';x.beginPath();x.ellipse(cx,350,22,6,0,0,7);x.fill();}
    if(kind===1){x.fillStyle='rgba(20,30,15,.75)';for(let i=0;i<3;i++){x.fillRect(cx-110,250+i*42,90,12);x.fillRect(cx+20,262+i*42,90,12);}}
    if(kind===2){x.fillStyle='#151617';x.fillRect(cx-200,0,400,h);x.fillStyle=sk;x.beginPath();x.ellipse(cx,243,96,20,0,0,7);x.fill();x.fillStyle='#e8e2d6';for(const s of [-1,1]){x.beginPath();x.ellipse(cx+s*58,244,20,9,0,0,7);x.fill();x.fillStyle='#2a1c12';x.beginPath();x.arc(cx+s*57,244,7,0,7);x.fill();x.fillStyle='#e8e2d6';}}
    if(kind===3){x.fillStyle='rgba(30,22,16,.45)';x.beginPath();x.ellipse(cx,370,90,50,0,0,3.14);x.fill();x.strokeStyle='#111';x.lineWidth=4;for(const s of [-1,1]){x.strokeRect(cx+s*58-30,226,60,36);}x.beginPath();x.moveTo(cx-28,240);x.lineTo(cx+28,240);x.stroke();x.fillStyle='rgba(180,200,210,.18)';x.fillRect(cx-88,226,60,36);x.fillRect(cx+28,226,60,36);}
    for(let i=0;i<260;i++){x.fillStyle='rgba(30,22,15,'+Math.random()*.25+')';x.beginPath();x.arc(cx+(Math.random()-.5)*300,200+Math.random()*240,1+Math.random()*4,0,7);x.fill();}
  },false);
  TX.face=[face(0),face(1),face(2),face(3)];
  /* weapons */
  TX.mlokTan=mkTex(128,128,(x,w,h)=>{x.fillStyle='#a8916a';x.fillRect(0,0,w,h);x.fillStyle='#2b241a';for(let j=0;j<3;j++)for(let i=0;i<4;i++){x.beginPath();x.roundRect?x.roundRect(i*32+4,j*40+14,22,10,5):x.rect(i*32+4,j*40+14,22,10);x.fill();}speck(x,w,h,600,.15,'0,0,0');});
  TX.rail=mkTex(128,32,(x,w,h)=>{x.fillStyle='#202224';x.fillRect(0,0,w,h);x.fillStyle='#0b0b0c';for(let i=0;i<16;i++)x.fillRect(i*8+2,0,3,h);});
  TX.woodGun=mkTex(128,128,(x,w,h)=>{x.fillStyle='#6b3f22';x.fillRect(0,0,w,h);for(let i=0;i<70;i++){x.strokeStyle='rgba('+(Math.random()<.5?'35,16,6':'160,100,55')+','+(.1+Math.random()*.25)+')';x.beginPath();const py=Math.random()*h;x.moveTo(0,py);x.bezierCurveTo(40,py+(Math.random()-.5)*10,80,py+(Math.random()-.5)*10,w,py+(Math.random()-.5)*8);x.stroke();}});
  TX.gunmetal=mkTex(128,128,(x,w,h)=>{x.fillStyle='#34373a';x.fillRect(0,0,w,h);speck(x,w,h,1200,.25,'255,255,255');speck(x,w,h,900,.3,'0,0,0');x.strokeStyle='rgba(200,200,200,.18)';for(let i=0;i<14;i++){x.beginPath();x.moveTo(Math.random()*w,Math.random()*h);x.lineTo(Math.random()*w,Math.random()*h);x.stroke();}});
  TX.grenade=mkTex(128,128,(x,w,h)=>{x.fillStyle='#4a5530';x.fillRect(0,0,w,h);x.strokeStyle='rgba(0,0,0,.55)';x.lineWidth=2;for(let i=0;i<=w;i+=22){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();}for(let j=0;j<=h;j+=22){x.beginPath();x.moveTo(0,j);x.lineTo(w,j);x.stroke();}speck(x,w,h,500,.3,'0,0,0');});
  /* character materials */
  const m=(t,o)=>stdM(t,o);
  EM.camo=[m(TX.camoWood),m(TX.camoDigi),m(TX.camoTan)];
  EM.carrier=[m(TX.carTan),m(TX.carOlive),m(TX.carBlack)];
  EM.black=m(null,{color:lin(0x17181a),roughness:.7});
  EM.boot=m(null,{color:lin(0x2a2420),roughness:.8});
  EM.glove=m(null,{color:lin(0x1a1b1c),roughness:.85});
  EM.skin=m(null,{color:lin(0xb98a68),roughness:.7});
  EM.helm=[m(null,{color:lin(0x4a5038),roughness:.75}),m(null,{color:lin(0x202224),roughness:.7})];
  EM.face=TX.face.map(t=>m(t,{roughness:.65}));
  EM.nvg=new THREE.MeshBasicMaterial({color:0x7dffc4});
  EM.lens=m(null,{color:lin(0x223344),roughness:.15,metalness:.6});
  EM.pack=m(TX.camoWood);
  /* weapons */
  const gm=(c,r,me,t)=>new THREE.MeshStandardMaterial({color:t?0xffffff:lin(c),roughness:r,metalness:me,map:t||null});
  GM.black=gm(0x1b1c1e,.5,.7,TX.gunmetal);GM.polymer=gm(0x232527,.8,.1);GM.tan=gm(0xb39c74,.55,.35);
  GM.rail=gm(0,.5,.6,TX.rail);GM.mlok=gm(0,.55,.4,TX.mlokTan);GM.wood=gm(0,.55,.05,TX.woodGun);
  GM.steel=gm(0x8a8e92,.3,.9);GM.orange=gm(0x7a3d1a,.7,.1);GM.glove=EM.glove;GM.camoSleeve=EM.camo[1];
  GM.optic=new THREE.MeshStandardMaterial({color:lin(0x151617),roughness:.4,metalness:.7,side:THREE.DoubleSide});
  GM.glass=new THREE.MeshBasicMaterial({color:0x4fc8c0,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false});
  GM.gren=gm(0,.55,.2,TX.grenade);GM.blade=gm(0xbfc4c8,.25,.95);GM.wrap=gm(0x161718,.9,0);GM.red=gm(0xbe281e,.7,.1);GM.grayCan=gm(0x78807a,.5,.5);GM.shieldBlue=gm(0x28323f,.5,.4);GM.shieldGlass=gm(0x7a96aa,.2,.5);
}
const EM={},GM={};

