'use strict';
/**
 * Multiplayer test with three game instances (host + 2 clients) connected by
 * an in-memory mock of the `room` capability.
 *
 * Part 1: lobby, 3-player limit, co-op mission (sync, shooting, death and
 *         respawn, explosions, mission end and rewards).
 * Part 2: team match (2 players): NPC count, score, respawns, victory.
 */
const { createGame, makeRoomBus, makeChecker, sleep } = require('./lib/harness');

async function coop(check) {
  console.log('--- co-op campaign ---');
  const bus = makeRoomBus();
  const A = createGame({ name: 'Host', id: 1, bus }), B = createGame({ name: 'Client1', id: 2, bus }), C = createGame({ name: 'Client2', id: 3, bus });
  A.$('mpName').value = 'Host'; A.click('mpCreate'); await sleep(50);
  const code = A.E('NET.code');
  check(code && code.length === 6, 'game code created: ' + code);
  for (const [W, n] of [[B, 'Client1'], [C, 'Client2']]) {
    W.$('mpName').value = n; W.$('joinCode').value = code; W.click('joinBtn'); await sleep(50);
  }
  await sleep(100);
  check(A.E('NET.ro.length') === 3, 'host roster has 3 players');
  check(A.$('mpPlayers').textContent.includes('Client1'), 'lobby lists the clients');
  A.E("NET.lobbyMode='coop';NET.lobbyLv=LEVELS.findIndex(l=>l.n==='Convoy');");  // first mission of campaign 2
  A.E('mpStartGame()'); await sleep(900);
  check(A.E('NET.role') === 'host', 'host role set');
  await sleep(600);
  check(B.E('NET.role') === 'client' && C.E('NET.role') === 'client', 'clients switched to the game');
  await sleep(600);
  const all = () => { A.step(1); B.step(1); C.step(1); };
  const step = n => { for (let k = 0; k < n; k++) all(); };
  const heal = () => { for (const g of [A, B, C]) g.E("if (!pDead) P.hp = Math.max(P.hp, 60); Object.values(NET.avatars).forEach(a => { if (a.alive) a.hp = Math.max(a.hp, 60); })"); };
  const safeStep = n => { for (let k = 0; k < n; k += 50) { step(Math.min(50, n - k)); heal(); } };
  step(60);
  const hEn = A.E('enemies.length');
  check(hEn > 0 && hEn === B.E('enemies.length') && hEn === C.E('enemies.length'), 'same enemy count on all machines (' + hEn + ')');
  check(A.E('vehicles.length') === B.E('vehicles.length'), 'same vehicle count (' + A.E('vehicles.length') + ')');
  check(A.E('allies.filter(a=>!a.remote).length') === 0, '3 players = no AI allies');
  check(A.E('allies.filter(a=>a.remote).length') === 2 && B.E('allies.filter(a=>a.remote).length') === 2, 'every player sees the 2 other players');
  B.E('P.x=10;P.z=60;'); step(60);
  const ax = A.E("(Object.values(NET.avatars).find(a=>a.name==='Client1')||{}).x");
  check(Math.abs(ax - 10) < 1.5, 'client position reaches the host (' + (ax && ax.toFixed(1)) + ')');
  A.E('enemies.forEach(e=>e.alerted=true);'); safeStep(200);
  const eh = A.E('[enemies[0].x,enemies[0].z]'), eb = B.E('[enemies[0].x,enemies[0].z]');
  check(Math.hypot(eh[0] - eb[0], eh[1] - eb[1]) < 2, 'enemy at the same place on host and client');
  A.E('dmg(enemies[1],9999,false)'); step(40);
  check(B.E('enemies[1].alive') === false && C.E('enemies[1].alive') === false, 'enemy death is replicated to the clients');
  check(B.E('killed') === A.E('killed') && A.E('killed') >= 1, 'kill counter replicated (' + B.E('killed') + '/' + A.E('killed') + ')');
  // client shoots an enemy that only the host simulates
  B.E('P.x=0;P.z=40;P.y=H(0,40)+1.7;');
  const bx = B.E('P.x');   // the dummy stands straight ahead of the client, so the shots do not depend on random spread
  A.E(`{const e=enemies[2];e.dummy=true;e.alive=true;e.x=${bx};e.z=30;e.g.position.set(${bx},H(${bx},30),30);e.hp=60;e.mhp=60;}`);
  step(40);
  B.E("slots[0]='hk416';wp.hk416={mag:30,res:150};cur=0;buildView();");
  const hp0 = A.E('enemies[2].hp');
  for (let k = 0; k < 12; k++) { B.E('P.yaw=0;P.pitch=-.05;lastShot=-10;fire(true)'); step(4); }
  const hp1 = A.E('enemies[2].hp');
  check(hp1 < hp0 || !A.E('enemies[2].alive'), `client bullets damage the enemy on the host (${hp0} -> ${hp1})`);
  A.E("allyHit(Object.values(NET.avatars).find(a=>a.name==='Client1'),30)"); step(40);
  const avHp = Math.max(0, Math.round(A.E("Object.values(NET.avatars).find(a=>a.name==='Client1').hp")));   // the client shows HP clamped at 0
  check(Math.round(B.E('P.hp')) === avHp && avHp < 100, `client HP equals the host-side HP (${Math.round(B.E('P.hp'))} = ${avHp})`);
  A.E("allyHit(Object.values(NET.avatars).find(a=>a.name==='Client1'),500)"); step(40);
  check(B.E('pDead') === true, 'client is dead');
  check(A.E('!over'), 'mission continues while other players live');
  safeStep(1000);
  check(B.E('pDead') === false && B.E('P.hp') > 0, 'client respawns after a delay');
  const fx0 = B.E('NET.fxSeen'); A.E('explode(new THREE.Vector3(5,1,5),6,10)'); step(30);
  check(B.E('NET.fxSeen') > fx0, 'explosion effect is replicated');
  check(bus.maxPresenceBytes < 4096, `presence stays under the 4 KiB limit (max ${bus.maxPresenceBytes} B)`);
  A.E("enemies.forEach(e=>{if(e.alive)dmg(e,99999,false);});vehicles.forEach(v=>{if(v.alive&&v.type!=='jet')vdmg(v,99999,true);});");
  step(100);
  for (let i = 0; i < 80 && !(B.E('over') && C.E('over')); i++) { step(10); await sleep(100); }   // wait for the end to arrive (slow CI)
  check(A.E('over') === true, 'host: mission completed');
  check(B.E('over') === true && C.E('over') === true, 'clients: mission end received');
  check(B.$('endT').textContent === 'Mission complete', 'client shows "Mission complete" (got "' + B.$('endT').textContent + '", host: "' + A.$('endT').textContent + '", B.over=' + B.E('over') + ', B.pDead=' + B.E('pDead') + ')');
  check(B.E('S.wp') > 0, 'client received the reward (' + B.E('S.wp') + ' WP)');
  B.E('stopGame()'); await sleep(30);
  check(B.E('NET.role') === 'solo', 'client returned to solo state after leaving');
  check([A, B, C].every(x => x.errors.length === 0), 'no uncaught window errors');
}

async function teamMatch(check) {
  console.log('--- team match ---');
  const bus = makeRoomBus();
  const A = createGame({ name: 'Host', id: 1, bus }), B = createGame({ name: 'Client1', id: 2, bus });
  A.click('mpCreate'); await sleep(50);
  const code = A.E('NET.code');
  B.$('joinCode').value = code; B.click('joinBtn'); await sleep(100);
  const C = createGame({ name: 'Client2', id: 3, bus }), D = createGame({ name: 'Extra', id: 4, bus });
  for (const W of [C, D]) { W.$('joinCode').value = code; W.click('joinBtn'); await sleep(80); }
  await sleep(3600);
  check(A.E('NET.ro.length') === 3, 'roster is limited to 3 players');
  check(D.E('NET.room') === null, 'a 4th player is rejected');
  check(D.$('mpStatus').textContent.includes('full'), 'the 4th player gets a "game is full" message');
  C.E('mpLeave()'); await sleep(150);
  check(A.E('NET.ro.length') === 2, 'two players remain after one leaves');
  A.E("NET.lobbyMode='tdm';"); A.E('mpStartGame()'); await sleep(1800);
  const step = n => { for (let k = 0; k < n; k++) { A.step(1); B.step(1); } };
  step(60);
  check(A.E('curMode') === 'tdm' && B.E('curMode') === 'tdm', 'both players are in the team match');
  check(A.E('allies.filter(a=>!a.remote).length') === 1, '2 players = 1 AI ally');
  check(A.E('enemies.length') === 6 && B.E('enemies.length') === 6, '6 bots on both machines');
  A.E('dmg(enemies[0],9999,false)'); step(30);
  check(A.E('killed') === 1 && B.E('killed') === 1, 'player-team score is 1 on host and client');
  for (let i = 0; i < 20 && !A.E('enemies[0].alive'); i++) step(100);
  check(A.E('enemies[0].alive') === true, 'bots respawn');
  A.E('hurt(1000,{x:0,z:0})'); step(30);
  check(A.E('pDead') === true && A.E('tdm.red') === 1, 'host death: point for the bots and respawn timer');
  check(B.E('tdm.red') === 1, 'client sees the bot score');
  step(500);
  check(A.E('pDead') === false && A.E('P.hp') > 0, 'host respawned');
  A.E('allyHit(Object.values(NET.avatars)[0],999)'); step(30);
  check(A.E('tdm.red') === 2, 'client death: bot score 2');
  A.E('killed=24;'); A.E('dmg(enemies[1],9999,false)'); step(80);
  for (let i = 0; i < 80 && !B.E('over'); i++) { step(10); await sleep(100); }   // wait for the end to arrive (slow CI)
  check(A.E('over') && B.E('over'), 'match ended on both machines');
  check(B.$('endT').textContent === 'Victory', 'client sees "Victory"');
  check(B.E('S.wp') >= 200, 'client received the reward (' + B.E('S.wp') + ' WP)');
  check(B.$('again').style.display === 'none', '"Play again" is hidden in multiplayer');
  check([A, B].every(x => x.errors.length === 0), 'no uncaught window errors');
}

(async () => {
  const check = makeChecker('multiplayer');
  await coop(check);
  await teamMatch(check);
  process.exit(check.done() ? 0 : 1);
})().catch(e => { console.log('ERROR', e.stack); process.exit(1); });
