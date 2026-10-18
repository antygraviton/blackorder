'use strict';
/**
 * PeerJS room adapter test (web/src/js/129-net-peerjs.js) against an in-memory fake of PeerJS.
 */
const { makeChecker, sleep } = require('./lib/harness');
const { makePeerRoomApi, makeFakePeer } = require('./lib/fakepeer');

(async () => {
  const check = makeChecker('net-peerjs');
  const api = makePeerRoomApi(makeFakePeer());
  const a = await api.join('cr-abc');        // first joiner becomes the hub
  const b = await api.join('cr-abc');
  const c = await api.join('cr-abc');
  const other = await api.join('cr-zzz');    // a different room stays separate
  await sleep(30);

  const ids = r => r.peers().map(p => p.peer).sort().join();
  check(a.peers().length === 3 && b.peers().length === 3 && c.peers().length === 3, 'three members see each other');
  check(ids(a) === ids(b) && ids(b) === ids(c), 'all members agree on the peer ids');
  check(other.peers().length === 1, 'rooms are isolated');
  check(a.peers().filter(p => p.isMe && p.sameTab).length === 1, 'exactly one own peer per member');

  let seen = 0; const un = c.onPeers(() => seen++);
  await b.presence({ n: 'Bob', p: [1, 2, 3] });
  await a.presence({ n: 'Host', r: 'h' });
  await sleep(30);
  const pr = (r, who) => r.peers().find(p => p.presence.n === who);
  check(pr(a, 'Bob') && pr(a, 'Bob').presence.p[2] === 3, 'client presence reaches the hub');
  check(pr(c, 'Bob') && pr(c, 'Host'), 'presence is relayed to the other client');
  check(pr(b, 'Host') && pr(b, 'Host').presence.r === 'h', 'hub presence reaches clients');
  check(seen > 0, 'onPeers handlers fire');

  await b.presence({ p: null });
  await sleep(30);
  check(!('p' in pr(a, 'Bob').presence) && pr(a, 'Bob').presence.n === 'Bob', 'null deletes a key and keeps the others');

  un(); const before = seen; await a.presence({ x: 1 }); await sleep(30);
  check(seen === before, 'unsubscribe stops notifications');

  await b.leave(); await sleep(30);
  check(a.peers().length === 2 && c.peers().length === 2, 'leaving member is removed for everyone');

  // a late joiner receives the current state
  const d = await api.join('cr-abc'); await sleep(30);
  check(d.peers().length === 3 && d.peers().some(p => p.presence.n === 'Host'), 'late joiner gets the existing presence');

  await a.leave(); await sleep(30);
  check(c.peers().length === 1 && d.peers().length === 1, 'when the hub leaves, guests are left alone');
  // a member that stops talking (closed laptop, dead tab) is dropped by the hub; live members stay
  const FP = makeFakePeer();
  const fast = makePeerRoomApi(FP, { pingMs: 30, timeoutMs: 150 });
  const h1 = await fast.join('cr-ping'), g1 = await fast.join('cr-ping'), g2 = await fast.join('cr-ping');
  await sleep(100);
  check(h1.peers().length === 3, 'ping: three members before the silence');
  FP.instances.filter(p => p.conns.length)[0].muted = true;   // g1 stops sending (including its pings)
  await sleep(500);
  check(h1.peers().length === 2 && g2.peers().length === 2, 'ping: the silent member is dropped, the live one stays');
  check(g1.peers().length === 1, 'ping: the dropped member is told it is alone');
  process.exit(check.done() ? 0 : 1);
})();
