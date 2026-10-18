'use strict';
/**
 * PeerJS room adapter test (web/src/js/129-net-peerjs.js) against an in-memory fake of PeerJS.
 */
const fs = require('fs');
const path = require('path');
const { makeChecker, sleep } = require('./lib/harness');

const src = fs.readFileSync(path.join(__dirname, '..', 'web', 'src', 'js', '129-net-peerjs.js'), 'utf8');
const { makePeerRoomApi } = new Function(src + '; return { makePeerRoomApi };')();

/** Minimal PeerJS fake: a global registry of peer ids, asynchronous delivery. */
function makeFakePeer() {
  const reg = new Map();
  const later = f => setTimeout(f, 1);
  class Conn {
    constructor() { this.open = false; this.h = {}; this.other = null; }
    on(ev, f) { this.h[ev] = f; }
    send(m) { const o = this.other; const d = JSON.parse(JSON.stringify(m)); later(() => o.open && o.h.data && o.h.data(d)); }
    close() { if (!this.open) return; this.open = false; const o = this.other; later(() => { if (o.open) { o.open = false; o.h.close && o.h.close(); } }); }
  }
  return class Peer {
    constructor(id) {
      this.h = {}; this.id = id || 'anon-' + Math.random().toString(36).slice(2); this.conns = [];
      later(() => {
        if (reg.has(this.id)) return this.h.error && this.h.error({ type: 'unavailable-id' });
        reg.set(this.id, this); this.h.open && this.h.open(this.id);
      });
    }
    on(ev, f) { this.h[ev] = f; }
    connect(id) {
      const mine = new Conn(), theirs = new Conn(); mine.other = theirs; theirs.other = mine;
      later(() => {
        const t = reg.get(id);
        if (!t) return this.h.error && this.h.error({ type: 'peer-unavailable' });
        mine.open = theirs.open = true;
        t.h.connection && t.h.connection(theirs);
        mine.h.open && mine.h.open();
      });
      this.conns.push(mine); return mine;
    }
    destroy() { if (reg.get(this.id) === this) reg.delete(this.id); this.conns.forEach(c => c.close()); }
  };
}

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
  process.exit(check.done() ? 0 : 1);
})();
