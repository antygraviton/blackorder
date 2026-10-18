/* ============ SAVE DATA ============ */
const DEF={name:'PLAYER',xp:0,wp:0,medals:0,kills:0,missions:0,deaths:0,maxLevel:0,maxLevel2:0,bestWave:0,owned:{hk416:1,ak:1,glock:1,knife:1,m67:1},primary:'hk416',secondary:'glock',melee:'knife',grenade:'m67',vol:60,sens:50,fov:80,q:2,cine:1,diff:1,perks:[],att:{primary:'',secondary:''},attOwned:{}};
let S=JSON.parse(JSON.stringify(DEF));
try{const r=localStorage.getItem('blackorder_save')||localStorage.getItem('cernyrad03');if(r)S=Object.assign(S,JSON.parse(r));}catch(e){}
function save(){try{localStorage.setItem('blackorder_save',JSON.stringify(S));}catch(e){}}
const lvl=()=>1+Math.floor(S.xp/100);
const $=id=>document.getElementById(id);

