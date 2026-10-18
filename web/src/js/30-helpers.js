/* ============ HELPER FUNCTIONS ============ */
let SEED=1;
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
let R=rng(1);
function hash2(x,y){const s=Math.sin(x*127.1+y*311.7+SEED*17.3)*43758.5453;return s-Math.floor(s);}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  return (hash2(xi,yi)*(1-u)+hash2(xi+1,yi)*u)*(1-v)+(hash2(xi,yi+1)*(1-u)+hash2(xi+1,yi+1)*u)*v;}
function fbm(x,y,o){let a=.5,f=1,s=0;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f);f*=2;a*=.5;}return s;}
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function H(x,z){
  const r=Math.max(Math.abs(x),Math.abs(z));
  let h=(fbm(x*.018,z*.018,3)-.5)*3.2*(L&&L.desert?.6:1);
  if(r<90)h*=.25+.75*sstep(3,11,Math.abs(x));
  const ridge=1-Math.abs(fbm(x*.011+9,z*.011+4,4)*2-1);
  h+=sstep(84,150,r)*(20+ridge*85)+sstep(150,240,r)*60;
  return h;
}
const lin=h=>new THREE.Color(h).convertSRGBToLinear();
const rgbL=h=>{const c=lin(h);return [c.r,c.g,c.b];};
const mixc=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const cvs=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const hx=n=>'#'+n.toString(16).padStart(6,'0');
function mkTex(w,h,fn,rep){const c=cvs(w,h),x=c.getContext('2d');fn(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=rep===false?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t;}
function speck(x,w,h,n,a,col){for(let i=0;i<n;i++){x.fillStyle='rgba('+col+','+(Math.random()*a)+')';x.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3);}}
function tbox(w,h,d,tile){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;const dm=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let f=0;f<6;f++)for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*dm[f][0]/tile,uv.getY(k)*dm[f][1]/tile);}return g;}
const stdM=(map,o)=>{o=o||{};return new THREE.MeshStandardMaterial(Object.assign({map:map||null,color:map?0xffffff:0x888888,roughness:.9,metalness:0},o));};
const _D=new THREE.Object3D(),_C=new THREE.Color();
function Inst(geo,mat,max,shadow){const m=new THREE.InstancedMesh(geo,mat,max);m.count=0;m.frustumCulled=false;m.castShadow=!!shadow;m.receiveShadow=true;scene.add(m);return m;}
function ia(m,x,y,z,sx,sy,sz,ry,col,rx,rz){_D.position.set(x,y,z);_D.rotation.set(rx||0,ry||0,rz||0);_D.scale.set(sx,sy,sz);_D.updateMatrix();m.setMatrixAt(m.count,_D.matrix);if(col!==undefined)m.setColorAt(m.count,_C.setHex(col).convertSRGBToLinear());m.count++;}
function ifin(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}

