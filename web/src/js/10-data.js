/* ============ DATA ============ */
const WEAPONS={
 hk416:{name:'HK416 (desert)',cat:'primary',dmg:24,rate:.085,mag:30,res:150,auto:true,spread:.01,price:0,zoom:1.25,desc:'Assault rifle'},
 ak:{name:'AK-74M',cat:'primary',dmg:27,rate:.1,mag:30,res:150,auto:true,spread:.013,price:0,zoom:1.15,desc:'Assault rifle'},
 mp5:{name:'MP5 submachine gun',cat:'primary',dmg:19,rate:.07,mag:30,res:180,auto:true,spread:.02,price:80,zoom:1.1,desc:'Fast submachine gun'},
 shotgun:{name:'Remington 870',cat:'primary',dmg:15,pellets:8,rate:.85,mag:6,res:36,auto:false,spread:.045,price:120,zoom:1.1,rel:2.2,desc:'Shotgun'},
 svd:{name:'SVD sniper rifle',cat:'primary',dmg:95,rate:.9,mag:10,res:40,auto:false,spread:.002,price:0,medals:50,zoom:3.2,scoped:true,desc:'Scope, powerful hit'},
 rpg:{name:'RPG-7',cat:'primary',kind:'rocket',dmg:220,rate:1.2,mag:1,res:5,auto:false,spread:.003,price:250,zoom:1.4,rel:3,desc:'Rocket, 8 m blast. Destroys armor'},
 bow:{name:'Bow',cat:'primary',kind:'arrow',dmg:85,rate:.9,mag:1,res:14,auto:false,spread:.002,price:150,zoom:1.6,rel:1,desc:'Silent, the arrow flies in an arc'},
 bayonet:{name:'Bayonet rifle',cat:'primary',bayonet:true,dmg:25,rate:.1,mag:30,res:150,auto:true,spread:.013,price:90,zoom:1.2,desc:'Stabs at close range (90), otherwise shoots'},
 glock:{name:'Glock 17',cat:'secondary',dmg:22,rate:.2,mag:17,res:85,auto:false,spread:.02,price:0,zoom:1.1,desc:'Pistol'},
 revolver:{name:'Colt Python',cat:'secondary',dmg:62,rate:.6,mag:6,res:36,auto:false,spread:.004,price:60,zoom:1.1,rel:2.4,desc:'Powerful revolver'},
 dpistol:{name:'Dual pistols',cat:'secondary',dmg:17,rate:.1,mag:34,res:170,auto:true,spread:.04,price:70,zoom:1.05,rel:2.2,desc:'Rapid fire, large spread'},
 napalm:{name:'Napalm',cat:'secondary',kind:'napalm',dmg:14,rate:1.5,mag:2,res:6,auto:false,spread:.005,price:140,zoom:1.1,rel:2.4,desc:'Sets the ground on fire for 6 s, damages over time'},
 hardbass:{name:'Hardbass',cat:'secondary',kind:'stun',dmg:8,rate:.8,mag:12,res:48,auto:false,spread:0,price:110,zoom:1.1,rel:1.8,desc:'Bass wave stuns enemies in front of you'},
 knife:{name:'Combat knife',cat:'melee',kind:'melee',melee:true,dmg:70,rate:.45,price:0,desc:'Fast and silent'},
 machete:{name:'Machete',cat:'melee',kind:'melee',melee:true,dmg:55,rate:.28,price:40,desc:'Very fast'},
 hammer:{name:'Hammer',cat:'melee',kind:'melee',melee:true,dmg:115,rate:.95,price:60,desc:'Slow, crushes anyone'},
 crossbow:{name:'Crossbow',cat:'melee',kind:'arrow',dmg:75,rate:1.1,mag:1,res:12,auto:false,spread:.001,price:130,zoom:1.5,rel:1.8,desc:'Silent long-range bolt'},
 shield:{name:'Riot shield',cat:'melee',kind:'shield',dmg:25,rate:.8,price:100,desc:'Blocks bullets from the front, bash stuns'},
 m67:{name:'M67 grenade',cat:'grenade',kind:'frag',dmg:130,price:0,desc:'7 m blast'},
 dynamite:{name:'Dynamite',cat:'grenade',kind:'dyn',dmg:190,price:50,desc:'Bigger 9 m blast, longer fuse'},
 smoke:{name:'Smoke grenade',cat:'grenade',kind:'smoke',price:40,desc:'Smoke blocks the enemy line of sight'},
 flash:{name:'Flashbang',cat:'grenade',kind:'flash',price:50,desc:'Stuns everyone within 15 m, blinds you too'}
};
const CAMPS=[
 {n:'Black Order',txt:'The year is 2015. A secret organization descended from Nazi structures emerges from its mountain bases. As a special-forces soldier you investigate a vanished village and uncover the army of the Black Order.'},
 {n:'Steel Fist',txt:'After the mountain base falls, the Order deploys its mechanized division. Armored personnel carriers, helicopters and jets roll toward the border region and your team must stop them before they reach the town. Ordinary bullets are not enough against armor: use the RPG (key 5), grenades or napalm.'}
];
const LEVELS=[
 {camp:0,n:'The Vanished Village',txt:'The year is 2015. A mountain village has stopped broadcasting. Investigate it.',en:12,mines:8,kits:3,houses:10,ruins:2,seed:11,reward:150,medals:20,xp:60,acc:.5,hp:60,
  pal:{grass:0x5f7d3a,dirt:0x7d6d4c,road:0x6e6048,rock:0x7f7b72,rock2:0xa39d92},skyTop:0x4f86cf,skyHor:0xd3e3ec,fog:0xbccdd8,fogN:70,fogF:520,sun:0xfff1d6,sunDir:[.55,.7,.35],sunI:2.6,hemiI:.75,exp:1.0,cloud:.28,smoke:0x3a3a38},
 {camp:0,n:'Base Infiltration',txt:'An encrypted map leads to an abandoned mine. The Order has taken it over.',en:18,mines:14,kits:3,houses:13,ruins:4,seed:23,reward:250,medals:30,xp:90,acc:.6,hp:70,
  pal:{grass:0x7d7d4a,dirt:0x927f5a,road:0x7a6c55,rock:0x8f8a80,rock2:0xbcb29c},skyTop:0x7d8c99,skyHor:0xb9c0c3,fog:0xaab1b3,fogN:50,fogF:430,sun:0xe8e2d4,sunDir:[.4,.55,.5],sunI:1.5,hemiI:1.05,exp:1.0,cloud:.55,smoke:0x302f2d},
 {camp:0,n:'City Under Fire',txt:'The Order holds a small town on the border. Evening, fog, mines in the streets.',en:24,mines:20,kits:4,houses:15,ruins:8,seed:37,reward:400,medals:40,xp:120,acc:.7,hp:80,
  pal:{grass:0x555c3a,dirt:0x62503c,road:0x48413a,rock:0x66605a,rock2:0x85705c},skyTop:0x35446a,skyHor:0xe58a58,fog:0xa5705a,fogN:35,fogF:340,sun:0xff9a55,sunDir:[-.75,.28,.45],sunI:2.8,hemiI:.55,exp:1.05,cloud:.3,smoke:0x262220},
 {camp:1,n:'Convoy',txt:'An Order armored convoy is driving through the desert toward the border town. Ambush it and destroy the APCs. Bullets are not enough: use the RPG (key 5), grenades or napalm.',en:6,apcs:3,tanks:1,helis:0,jets:0,mines:6,kits:4,houses:3,ruins:2,seed:51,desert:true,reward:300,medals:30,xp:100,acc:.5,hp:60,
  pal:{grass:0xb09c6c,dirt:0xc4aa78,road:0x96805f,rock:0x967f68,rock2:0xbea482},skyTop:0x4a86d4,skyHor:0xdce8ee,fog:0xd6d0bc,fogN:90,fogF:560,sun:0xfff6e2,sunDir:[.3,.9,.2],sunI:3.0,hemiI:.8,exp:1.0,cloud:.18,smoke:0x3a3a38},
 {camp:1,n:'Airfield',txt:'The Order has taken over a military airfield. Destroy the helicopters and APCs. Beware of jet strikes: they bomb the spot where you stand.',en:8,apcs:2,tanks:1,helis:2,jets:1,mines:6,kits:4,houses:5,ruins:1,seed:63,desert:true,runway:true,reward:450,medals:40,xp:140,acc:.55,hp:70,
  pal:{grass:0x968a6c,dirt:0xa89674,road:0x786c5a,rock:0x807668,rock2:0xa69882},skyTop:0x6f8196,skyHor:0xcbd0d0,fog:0xc2c0b2,fogN:60,fogF:470,sun:0xf0e2cc,sunDir:[.5,.5,-.3],sunI:1.7,hemiI:1.0,exp:1.0,cloud:.5,smoke:0x302f2d},
 {camp:1,n:'Steel Fist',txt:'The division command post. Armor, helicopters and jets all at once. When the last machine falls, the Order loses its strength on the border.',en:8,apcs:4,tanks:2,helis:3,jets:2,mines:8,kits:5,houses:5,ruins:3,seed:77,desert:true,reward:650,medals:60,xp:200,acc:.6,hp:80,
  pal:{grass:0x967654,dirt:0xaa805a,road:0x6e5642,rock:0x78604e,rock2:0xa07858},skyTop:0x3a4a78,skyHor:0xf09050,fog:0xb98462,fogN:50,fogF:420,sun:0xff8c46,sunDir:[-.8,.18,.3],sunI:3.0,hemiI:.6,exp:1.05,cloud:.28,smoke:0x262220}
];
const getMax=c=>c===0?(S.maxLevel||0):(S.maxLevel2||0);
const setMax=(c,v)=>{if(c===0)S.maxLevel=v;else S.maxLevel2=v;};
const idxIn=g=>{let k=0;for(let i=0;i<g;i++)if(LEVELS[i].camp===LEVELS[g].camp)k++;return k;};
const globalIdx=(c,k)=>{let n=0;for(let i=0;i<LEVELS.length;i++){if(LEVELS[i].camp!==c)continue;if(n===k)return i;n++;}return -1;};
const nextInCamp=g=>globalIdx(LEVELS[g].camp,idxIn(g)+1);
const unlocked=g=>idxIn(g)<=getMax(LEVELS[g].camp);
let playCamp=0;

/* ============ DIFFICULTY, PERKS, ATTACHMENTS ============ */
const DIFFS=[{n:'Easy',dmg:.6,acc:.8,hp:.8},{n:'Normal',dmg:1,acc:1,hp:1},{n:'Hard',dmg:1.4,acc:1.15,hp:1.25},{n:'Realistic',dmg:3,acc:1.2,hp:1.4}];
const DIFF=()=>DIFFS[S.diff===undefined?1:S.diff]||DIFFS[1];
const PERKS=[
 {id:'fast',n:'Quick hands',lvl:2,desc:'Reloading is 25% faster'},
 {id:'armor',n:'Body armor',lvl:3,desc:'Damage taken −15%'},
 {id:'ghost',n:'Ghost',lvl:4,desc:'Enemies see you only from 80% of the distance'},
 {id:'nades',n:'Grenadier',lvl:5,desc:'+2 grenades every mission'},
 {id:'dmg',n:'Piercing rounds',lvl:6,desc:'Weapons deal 10% more damage'},
 {id:'run',n:'Sprinter',lvl:7,desc:'Sprinting is 15% faster'}
];
const hasPerk=id=>(S.perks||[]).indexOf(id)>=0;
const ATT={supp:{n:'Suppressor',price:90,desc:'Silent shots (they do not alert enemies), −15% damage'},mag:{n:'Extended magazine',price:80,desc:'+50% magazine size'},laser:{n:'Laser sight',price:70,desc:'−35% bullet spread'}};
const attOf=k=>{const w=WEAPONS[k];return(w&&(w.cat==='primary'||w.cat==='secondary')&&!w.kind&&!w.bayonet)?((S.att&&S.att[w.cat])||''):'';};
const magOf=k=>Math.round((WEAPONS[k].mag||0)*(attOf(k)==='mag'?1.5:1));
const spreadMul=k=>attOf(k)==='laser'?.65:1;
const dmgMul=k=>(attOf(k)==='supp'?.85:1)*(hasPerk('dmg')?1.1:1);
const silent=k=>attOf(k)==='supp';
