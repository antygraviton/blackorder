'use strict';
/** Shared helpers: an in-memory fake of PeerJS and a room "bus" built from the real PeerJS adapter. */
const fs = require('fs');
const path = require('path');

const adapterSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'src', 'js', '129-net-peerjs.js'), 'utf8');
const { makePeerRoomApi } = new Function(adapterSrc + '; return { makePeerRoomApi };')();

/** Minimal PeerJS fake: a global registry of peer ids, asynchronous delivery. */
function makeFakePeer() {
  const reg = new Map();
  const later = f => setTimeout(f, 1);
  class Conn {
    constructor(owner) { this.owner = owner; this.open = false; this.h = {}; this.other = null; }
    on(ev, f) { this.h[ev] = f; }
    send(m) { if (this.owner && this.owner.muted) return; const o = this.other; const d = JSON.parse(JSON.stringify(m)); later(() => o.open && o.h.data && o.h.data(d)); }
    close() { if (!this.open) return; this.open = false; const o = this.other; later(() => { if (o.open) { o.open = false; o.h.close && o.h.close(); } }); }
  }
  return class Peer {
    static instances = [];
    constructor(id) {
      Peer.instances.push(this);
      this.h = {}; this.id = id || 'anon-' + Math.random().toString(36).slice(2); this.conns = [];
      later(() => {
        if (reg.has(this.id)) return this.h.error && this.h.error({ type: 'unavailable-id' });
        reg.set(this.id, this); this.h.open && this.h.open(this.id);
      });
    }
    on(ev, f) { this.h[ev] = f; }
    connect(id) {
      const mine = new Conn(this), theirs = new Conn(null); mine.other = theirs; theirs.other = mine;
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

/** Like makeRoomBus() in harness.js, but every room goes through makePeerRoomApi over the fake PeerJS. */
function makePeerBus() {
  const api = makePeerRoomApi(makeFakePeer());
  return { capabilityFor: () => ({ join: name => api.join(name) }) };
}

module.exports = { makePeerRoomApi, makeFakePeer, makePeerBus };
