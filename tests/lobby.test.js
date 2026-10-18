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

  process.exit(check.done() ? 0 : 1);
})();
