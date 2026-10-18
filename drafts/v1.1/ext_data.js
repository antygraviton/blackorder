
/* ============ EXTENSION: DATA ============ */
const DIFFS=[{n:'Easy',dmg:.6,acc:.8,hp:.8},{n:'Normal',dmg:1,acc:1,hp:1},{n:'Hard',dmg:1.4,acc:1.15,hp:1.25},{n:'Realistic',dmg:3,acc:1.2,hp:1.4}];
const DIFF=()=>DIFFS[S.diff===undefined?1:S.diff]||DIFFS[1];
const PERKS=[
 {id:'fast',n:'Quick hands',lvl:2,desc:'Reloading is 25% faster'},
 {id:'armor',n:'Body armor',lvl:3,desc:'Damage taken −15%'},
 {id:'ghost',n:'Duch',lvl:4,desc:'Enemies see you only from 80% of the distance'},
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
const DOCS=[
 {id:'d1',t:'Soldier diary',x:'The village fell silent on the third day. Nobody came back from the fields. On the hill I see strange uniforms, black as night. I hear no bells.'},
 {id:'d2',t:'Telegram from 1945',x:'Order: hide supplies, documents and people underground. The Order must survive the war. Wait for the signal, even if it takes decades.'},
 {id:'d3',t:'Supply list',x:'Fuel: 400 barrels. Ammunition: 90 crates. New uniforms: 800. Nobody is allowed into the village yet. Patrols in pairs.'},
 {id:'d4',t:'Mine plan',x:'Shaft B leads to the control room. The terminal is protected by a double bar. It can only be hacked from inside, without an alarm and preferably in the dark.'},
 {id:'d5',t:'Commander order',x:'Keep the prisoner alive. Interrogation first, then we decide. Whoever lets him escape takes his place.'},
 {id:'d6',t:'Korespondence',x:'The town is ours. The border is open, but we still have no allies. We need a steel fist, otherwise nobody will fear us.'},
 {id:'d7',t:'Chemist notes',x:'The experiments on prisoners failed. The subjects are fast, feel no pain and cannot be stopped by a body shot. Aim for the head. Never leave them unsupervised.'},
 {id:'d8',t:'Radio transcript',x:'The convoy departs at dawn. Five APCs and a tank. Target: the border town. Radio silence until arrival.'},
 {id:'d9',t:'Defense order',x:'The airfield must fall last. Protect the fuel depots at the cost of lives. Without fuel we cannot go further.'},
 {id:'d10',t:'Data sheet: Armata',x:'Prototype. Unmanned turret, 125 mm gun, active protection. Weak spot: the sides and the rear. Best attacked with anti-tank missiles from above.'},
 {id:'d11',t:'Personal letter',x:'Dear mom, I cannot sleep at night. The commander talks about the return of old glory. I only want to go home, but there is no way back.'},
 {id:'d12',t:'Last message of the commander',x:'If you are reading this, the Order has fallen. But the idea never disappears. Somewhere another man will take my pistol and start again.'}
];
const ACH=[
 {id:'first',n:'First blood',d:'Kill your first enemy',ok:()=>S.kills>=1},
 {id:'k100',n:'Veteran',d:'Kill 100 enemies in total',ok:()=>S.kills>=100},
 {id:'heads',n:'Headhunter',d:'100 headshots',ok:()=>(S.heads||0)>=100},
 {id:'apc',n:'Armor hunter',d:'Destroy 10 APCs or tanks',ok:()=>(S.apcKills||0)>=10},
 {id:'surv',n:'Survivor',d:'Survival: reach wave 15',ok:()=>(S.bestWave||0)>=15},
 {id:'zomb',n:'Undead hunter',d:'Zombie Arena: reach wave 10',ok:()=>((S.rec||{}).zomb||0)>=10},
 {id:'flaw',n:'Not a scratch',d:'Complete a mission without taking damage',ok:()=>!!(S.flag&&S.flag.flawless)},
 {id:'ghost',n:'Duch',d:'Complete Silent Infiltration without an alarm',ok:()=>!!(S.flag&&S.flag.ghost)},
 {id:'boss1',n:'Fall of the commander',d:'Defeat the commander of the Order',ok:()=>!!(S.flag&&S.flag.boss1)},
 {id:'boss2',n:'Steel Fist broken',d:'Destroy the Armata tank',ok:()=>!!(S.flag&&S.flag.boss2)},
 {id:'coop',n:'Team player',d:'Complete a mission in co-op multiplayer',ok:()=>!!(S.flag&&S.flag.coop)},
 {id:'camp1',n:'End of the Order',d:'Complete the Black Order campaign',ok:()=>!!(S.flag&&S.flag.camp1)},
 {id:'camp2',n:'Steel against steel',d:'Complete the Steel Fist campaign',ok:()=>!!(S.flag&&S.flag.camp2)},
 {id:'docs',n:'Archivist',d:'Find all 12 documents',ok:()=>DOCS.every(d=>S.docs&&S.docs[d.id])}
];
/* ---- new and modified missions ---- */
const _L=LEVELS.slice();
const lbase=l=>{const o=Object.assign({},l);['ob','stealth','docs','radio','brief','wx','bossS','bossT','nd','tanks','apcs','helis','jets','desert','runway'].forEach(k=>delete o[k]);return o;};
Object.assign(_L[0],{brief:'HQ: The mountain village has stopped broadcasting. Investigate it, neutralize the patrols and find out who is behind this. Watch out for mines.',docs:['d1','d2'],radio:[{t:15,m:'HQ: We hear gunfire from the east, be careful.'},{k:6,m:'HQ: Half of the patrols are gone, keep going.'}]});
Object.assign(_L[1],{n:'Silent Infiltration',txt:'The Order has taken the mine. Slip through the dark to the terminal on the far side of the map and hack it (hold E). Do not raise the alarm.',brief:'The Order has taken the mine. You must not raise the alarm: enemies see you only from close range and hear loud gunshots. A suppressor, a knife and a bow are your friends. Flashlight: key F. Find the terminal on the far side of the map and hack it (hold E).',ob:'hack',stealth:true,wx:'night',docs:['d3','d4'],radio:[{t:20,m:'Contact: The terminal is on the opposite side of the map.'},{t:90,m:'Contact: Stay away from the lights.'}]});
Object.assign(_L[2],{brief:'HQ: The Order holds a small town on the border. Evening, fog, mines in the streets. Clear the streets of all patrols.',docs:['d5','d6'],radio:[{t:20,m:'HQ: Watch the streets, they are mined.'}]});
Object.assign(_L[3],{brief:'HQ: An Order armored convoy is driving through the desert toward the border town. Ambush it. Ordinary bullets are not enough against armor: use the RPG (key 5), grenades or napalm.',docs:['d8'],radio:[{t:20,m:'Contact: The tank is last in the convoy.'}]});
Object.assign(_L[4],{n:'Airfield',txt:'The Order stores fuel at the airfield. Destroy all four fuel depots (gunfire or explosions). Watch out for helicopters and the jet.',brief:'The Order has taken the airfield and stores fuel there. Destroy all four fuel depots with gunfire or explosions. Watch out for helicopters and jet strikes. It is raining.',ob:'destroy',nd:4,wx:'rain',docs:['d9'],radio:[{t:30,m:'Contact: The depots are the red fuel tanks.'}]});
Object.assign(_L[5],{wx:'storm',brief:'The command post of the Order division. Armor, helicopters and jets all at once. When the last machine falls, the Order loses its strength on the border. A storm is raging.',docs:['d11'],radio:[{t:20,m:'HQ: Good luck, you have the whole sky against you.'}]});
const L_RESCUE=Object.assign(lbase(_L[0]),{camp:0,n:'Rescue the Prisoner',txt:'Find the prisoner (E), free him and bring him to the extraction point at the start. Do not let him die.',brief:'The Order has captured an officer of our ally. Find him in the settlement (hold E next to him), free him and lead him to the extraction point at the start of the map. If he dies, the mission fails. It is raining.',ob:'rescue',wx:'rain',en:14,mines:6,kits:4,houses:12,ruins:3,seed:41,reward:320,medals:30,xp:110,acc:.6,hp:65,docs:['d7'],radio:[{t:25,m:'Contact: The prisoner is somewhere in the middle of the settlement.'},{t:120,m:'Contact: Extraction waits at the start of the map.'}]});
const L_DEFEND=Object.assign(lbase(_L[2]),{camp:0,n:'Base Defense',txt:'Defend the marked zone for 2.5 minutes. The attackers come in waves.',brief:'We captured their command transmitter. The Order will launch a counterattack. Defend the marked zone (blue circle) for 2.5 minutes. Attackers come in waves every twenty seconds. Fog.',ob:'defend',wx:'fog',en:24,mines:0,kits:5,houses:8,ruins:5,seed:47,reward:420,medals:40,xp:130,acc:.65,hp:70,radio:[{t:30,m:'HQ: Waves arrive every 20 seconds.'},{t:100,m:'HQ: Hold on a little longer!'}]});
const L_BOSS=Object.assign(lbase(_L[1]),{camp:0,n:'Commander of the Order',txt:'Defeat the commander of the Black Order. Body shots barely slow him down, aim for the head.',brief:'The commander of the Black Order hides in a mountain fortress. He is heavily armored, body shots barely slow him down. Aim for the head and use grenades. Night.',ob:'boss',bossS:true,wx:'night',en:10,mines:4,kits:5,houses:9,ruins:4,seed:29,reward:700,medals:70,xp:220,acc:.65,hp:75,docs:['d12'],radio:[{t:20,m:'Contact: The commander is big. Aim for the head!'},{t:80,m:'Contact: Grenades hurt him more than bullets.'}]});
const L_TANKB=Object.assign(lbase(_L[5]),{camp:1,n:'Armata',txt:'Destroy the Armata tank prototype. It is huge and tough.',brief:'The Armata tank prototype is fighting its way to the border. It is huge and tough, bullets do nothing to it. Use the anti-tank missiles from the helicopter, the RPG and explosives. Night.',ob:'boss',bossT:true,wx:'night',en:6,apcs:0,tanks:1,helis:0,jets:0,mines:6,kits:5,houses:3,ruins:2,seed:93,desert:true,reward:900,medals:90,xp:260,acc:.6,hp:80,docs:['d10'],radio:[{t:20,m:'Contact: Aim for the weak spot on the sides.'},{t:90,m:'Contact: Use the helicopter, it carries anti-tank missiles.'}]});
LEVELS.splice(3,0,L_RESCUE,L_DEFEND,L_BOSS);LEVELS.push(L_TANKB);

