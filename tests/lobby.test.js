'use strict';
/**
 * Online lobby over the real PeerJS adapter (with an in-memory fake PeerJS): joining, duplicate
 * clicks, display names, and returning to the lobby after a game.
 */
const { createGame, makeChecker, sleep } = require('./lib/harness');
const { makePeerBus } = require('./lib/fakepeer');

const rows = g => g.E("[...document.querySelectorAll('#mpPlayers tr')].map(r => r.textContent).join(' | ')");

(async () => {
  const check = makeChecker('lobby');
  const bus = makePeerBus();
  const H = createGame({ name: 'host', bus, id: 1 }), A = createGame({ name: 'a', bus, id: 2 }), B = createGame({ name: 'b', bus, id: 3 });

  H.E("$('mpName').value = 'Host'"); H.click('mpCreate'); await sleep(100);
  const code = H.E("$('partyCode').textContent");
  check(/^[A-Z2-9]{6}$/.test(code), 'host gets a 6-character code (' + code + ')');

  // duplicate clicks on Join must not create a ghost player
  A.E(`$('mpName').value = 'Alice'; $('joinCode').value = '${code}'`);
  A.click('joinBtn'); A.click('joinBtn'); A.click('joinBtn');
  B.E(`$('mpName').value = 'Alice'; $('joinCode').value = '${code}'`);   // same name on purpose
  B.click('joinBtn');
  await sleep(3500);                                                     // longer than the 2.5 s "game is full" check
  check(A.E('!!NET.room') && B.E('!!NET.room') && H.E('!!NET.room'), 'nobody was bounced out of the lobby');
  check(H.E("document.querySelectorAll('#mpPlayers .tag').length") === 0, 'host list is full: host + two clients, no ghost, no free slot');
  check(/Alice \(2\)/.test(rows(H)) && /Alice(?! \()/.test(rows(H)), 'players with the same name are told apart: ' + rows(H));
  check(/\(host\)/.test(rows(B)) && /\(you\)/.test(rows(B)) && !/hostitel|\(ty\)/.test(rows(B)), 'lobby labels are English');
  check(/<|>/.test(rows(H)) === false, 'names are rendered as text');

  // start a co-op game, then everybody goes back to the lobby
  H.E("NET.lobbyMode = 'coop'; NET.lobbyLv = LEVELS.findIndex(l => l.n === 'Convoy'); mpStartGame()");
  await sleep(800);
  check(H.E('NET.role') === 'host' && A.E('NET.role') === 'client' && B.E('NET.role') === 'client', 'game started: host and two clients');
  check(A.E("$('endMenu').textContent") === 'Back to lobby', 'end screen offers "Back to lobby" online');
  const idBefore = H.E('NET.go.id');
  for (const g of [A, B, H]) { g.click('endMenu'); }
  await sleep(300);
  for (const [n, g] of [['host', H], ['client A', A], ['client B', B]]) {
    check(g.E('NET.role') === 'solo' && g.E('!!NET.room'), n + ': back in the room after the game');
    check(g.E("document.getElementById('multi').classList.contains('on')"), n + ': the multiplayer lobby screen is shown, not the main menu');
  }
  await sleep(3000);
  check(A.E("document.getElementById('multi').classList.contains('on')") && A.E('NET.role') === 'solo', 'client does not jump back into the finished game');
  check(H.E("document.querySelectorAll('#mpPlayers .tag').length") === 0, 'all three players are still listed');
  H.E("mpStartGame()"); await sleep(800);
  check(A.E('NET.role') === 'client' && H.E('NET.go.id') !== idBefore, 'the host can start the next game and clients join it');

  // the host's pause stops the game for everybody
  H.step(30, 16); await sleep(100);
  H.E('pauseGame()'); await sleep(150);
  check(H.E('run') === false, 'host pause: the host simulation stops');
  for (const [n, g] of [['A', A], ['B', B]]) {
    check(g.E('NET.hostPaused') === true && g.E('run') === false && g.E("$('hostPause').classList.contains('on')"), 'host pause: client ' + n + ' is stopped and sees the "Host paused" screen');
    check(g.E("$('hostPauseGo').disabled") === true, 'host pause: client ' + n + ' cannot continue while the host is paused');
  }
  H.click('resume'); await sleep(150);
  check(H.E('run') === true && A.E("$('hostPauseGo').disabled") === false, 'host resume: the host runs again and clients may continue');
  A.click('hostPauseGo');
  check(A.E('run') === true && !A.E("$('hostPause').classList.contains('on')"), 'client continues after the host resumed');

  // a player who left a running game can rejoin it
  B.click('toMenu'); H.step(30, 16); await sleep(300);
  check(B.E('NET.role') === 'solo' && B.E("document.getElementById('multi').classList.contains('on')"), 'client left the running game into the lobby');
  check(B.E("$('mpRejoin').style.display") !== 'none' && /Rejoin/.test(B.E("$('mpClientText').textContent")), 'lobby offers "Rejoin the game" while the game is running');
  B.click('mpRejoin'); await sleep(300);
  check(B.E('NET.role') === 'client', 'the client rejoined the running game');

  // when the host goes back to the lobby, clients are taken there too and cannot start anything themselves
  await sleep(1700);
  H.click('toMenu'); await sleep(300);
  for (const [n, g] of [['A', A], ['B', B]]) {
    check(g.E('NET.role') === 'solo' && g.E("document.getElementById('multi').classList.contains('on')"), 'host closed the game: client ' + n + ' is back in the lobby');
  }
  check(/Waiting for the host to start the game/.test(A.E("$('mpClientText').textContent")), 'lobby text: "Waiting for the host to start the game"');
  A.E('mpStartGame()'); await sleep(300);
  check(A.E('NET.role') === 'solo' && H.E('NET.role') === 'solo', 'a client cannot start the game, only the host can');

  // ---- objective missions in co-op ----
  const pos = g => g.E("objs.map(o => o.t + ':' + Math.round(o.x) + ',' + Math.round(o.z)).join(' ')");
  const startMission = async name => {
    H.E(`NET.lobbyMode = 'coop'; NET.lobbyLv = LEVELS.findIndex(l => l.n === ${JSON.stringify(name)}); mpStartGame()`);
    await sleep(1500);
  };
  const backToLobby = async () => { for (const g of [A, B, H]) g.click('endMenu'); await sleep(400); };
  const cycle = async (n) => { for (let i = 0; i < n; i++) { H.step(4, 16); A.step(4, 16); B.step(4, 16); await sleep(15); } };
  check(H.E("[...document.querySelectorAll('#mpMission option')].some(o => /Silent Infiltration/.test(o.textContent) && /Airfield/.test(document.getElementById('mpMission').textContent) && /Base Defense/.test(document.getElementById('mpMission').textContent))"), 'all missions, including the objective missions, are offered in the co-op lobby');
  await backToLobby();

  await startMission('Airfield');
  check(H.E('NET.role') === 'host' && A.E('NET.role') === 'client' && B.E('NET.role') === 'client', 'Airfield: co-op game started');
  check(H.E('objs.length') === 4 && pos(H) === pos(A) && pos(H) === pos(B), 'Airfield: all players have the same four depots (' + pos(H) + ')');
  check(A.E('total') > 1e8 && /Destroy fuel depots: 0 \/ 4/.test(A.E("$('obj').textContent")), 'Airfield: clients show the objective in the HUD');
  H.E('objHit(objs[1], 1e4)'); await cycle(10);
  check(A.E('objs[1].done') && B.E('objs[1].done') && !A.E('objs[0].done'), 'Airfield: a destroyed depot is destroyed for the clients too');
  check(/1 \/ 4/.test(A.E("$('obj').textContent")), 'Airfield: clients see the progress (1 / 4)');
  H.E('objs.forEach(o => objHit(o, 1e4))'); await cycle(60);
  check(H.E('over') && A.E('over') && B.E('over'), 'Airfield: the mission ends for everybody when the last depot falls');
  await backToLobby();

  await startMission('Rescue the Prisoner');
  check(H.E("allies.some(a => a.hostage)") && A.E("allies.some(a => a.hostage)") && pos(H) === pos(A), 'Rescue: the prisoner and the extraction point exist for the clients too');
  H.E("allies.find(a => a.hostage).free = true"); await cycle(10);
  check(A.E("allies.find(a => a.hostage).free") && /extraction/.test(A.E("$('obj').textContent")), 'Rescue: clients see that the prisoner was freed');
  await backToLobby();

  await startMission('Silent Infiltration');
  H.E("enemies.forEach(e => { e.x = 1000; e.z = 1000; e.g.position.set(1000, 0, 1000); })");
  A.E("(function () { const t = objs.find(o => o.t === 'term'); P.x = t.x; P.z = t.z + 1; P.y = H(P.x, P.z) + 1.7; keys.KeyE = true; })()");
  H.E("P.x = 0; P.z = 70");
  await cycle(80);
  check(H.E("objs.find(o => o.t === 'term').prog") > .3, 'Silent Infiltration: a client holding E at the terminal progresses the hack on the host (' + H.E("objs.find(o => o.t === 'term').prog").toFixed(2) + ')');
  check(B.E("objs.find(o => o.t === 'term').prog") > .3, 'Silent Infiltration: the other client sees the hack progress');
  A.E('keys.KeyE = false');
  await backToLobby();

  // ---- boss and barrels in co-op ----
  await startMission('Commander of the Order');
  check(A.E('enemies.filter(e => e.boss).length') === 1 && B.E('enemies.filter(e => e.boss).length') === 1 && A.E('enemies.findIndex(e => e.boss)') === H.E('enemies.findIndex(e => e.boss)'), 'Commander: clients get the same boss enemy as the host');
  check(Math.abs(A.E('enemies.find(e => e.boss).g.scale.x') - 1.5) < 1e-9, 'Commander: the boss looks big on the clients too');
  H.E('dmg(enemies.find(e => e.boss), 600, true)'); await cycle(12);
  check(H.E('bossPct') < 100 && A.E('bossPct') === H.E('bossPct') && /Boss: \d+ %/.test(A.E("$('obj').textContent")), 'Commander: clients show the boss health (' + A.E('bossPct') + ' %)');
  check(A.E('barrels.length') === H.E('barrels.length') && A.E('barrels.length') > 0, 'barrels exist on every machine');
  H.E('barrelHit(barrels[0], 100)'); await cycle(12);
  check(A.E('barrels[0].dead') && B.E('barrels[0].dead'), 'a barrel destroyed on the host is destroyed for the clients');
  H.E('dmg(enemies.find(e => e.boss), 1e6, true)'); await cycle(60);
  check(H.E('over') && A.E('over') && B.E('over'), 'Commander: the mission ends for everybody when the boss dies');
  await backToLobby();

  await startMission('Armata');
  check(A.E('vehicles.filter(v => v.boss).length') === 1 && Math.abs(A.E('vehicles.find(v => v.boss).g.scale.x') - 1.25) < 1e-9, 'Armata: clients get the boss tank');
  await backToLobby();

  process.exit(check.done() ? 0 : 1);
})();
