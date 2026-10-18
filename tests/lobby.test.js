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

  process.exit(check.done() ? 0 : 1);
})();
