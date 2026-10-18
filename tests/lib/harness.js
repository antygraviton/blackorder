'use strict';
/**
 * Headless test harness for the browser game.
 *
 * Loads web/dist/black-order.html into jsdom with stubs for WebGL, canvas and
 * pointer lock, and exposes:
 *   game.E(code)    evaluate code inside the game's script scope (direct eval)
 *   game.step(n,ms) run n main-loop frames of ms milliseconds each
 *   game.$(id)      document.getElementById
 *
 * A mock "room" capability (see makeRoomBus) connects several games in one
 * process so multiplayer can be tested without a server.
 *
 * Nothing is rendered: tests verify game LOGIC only, never visuals or speed.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(ROOT, 'web', 'dist', 'black-order.html');
const THREE_SRC = fs.readFileSync(require.resolve('three/build/three.min.js'), 'utf8');

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** In-memory replacement for the claude.ai artifact `room` capability. */
function makeRoomBus() {
  const rooms = {};
  let maxPresenceBytes = 0;
  function capabilityFor(peerId) {
    return {
      async join(roomName) {
        const R = rooms[roomName] || (rooms[roomName] = { members: [] });
        const me = { peer: peerId, presence: {}, updatedAt: 0, handlers: [], cache: [], maxSize: 0 };
        R.members.push(me);
        const notify = () => {
          for (const mm of R.members) {
            const snap = R.members.map(x => Object.freeze({
              peer: x.peer, by: null, isMe: x === mm, sameTab: x === mm,
              kind: 'viewer', guest: false, presence: x.presence, updatedAt: x.updatedAt,
            }));
            mm.cache = snap;
            mm.handlers.forEach(h => h({ peers: snap, joined: [], left: [], updated: [] }));
          }
        };
        const handle = {
          name: roomName,
          emit: async () => {},
          on: () => () => {},
          presence: async patch => {
            const c = JSON.parse(JSON.stringify(patch));
            const merged = Object.assign({}, me.presence, c);
            for (const k in c) if (c[k] === null) delete merged[k];
            const size = JSON.stringify(merged).length;
            if (size > 4096) throw new Error('presence too big: ' + size + ' bytes (limit 4096)');
            me.maxSize = Math.max(me.maxSize, size);
            maxPresenceBytes = Math.max(maxPresenceBytes, size);
            me.presence = merged;
            me.updatedAt++;
            notify();
          },
          peers: () => me.cache,
          onPeers: h => { me.handlers.push(h); return () => { me.handlers = me.handlers.filter(x => x !== h); }; },
          connected: () => true,
          onConnection: h => { h(true); return () => {}; },
          leave: async () => { R.members = R.members.filter(x => x !== me); notify(); },
        };
        me.handle = handle;
        notify();
        return handle;
      },
    };
  }
  return {
    rooms,
    capabilityFor,
    get maxPresenceBytes() { return maxPresenceBytes; },
  };
}

/** Create one game instance (one browser tab). */
function createGame(opts = {}) {
  const html = fs.readFileSync(opts.file || DIST, 'utf8');
  const i0 = html.lastIndexOf('<script>') + 8;
  const j0 = html.lastIndexOf('</script>');
  // Test-only transform: let tests override canAct (normally a const).
  const script = html.slice(i0, j0).replace('const canAct=', 'let canAct=');
  const body = html.slice(0, html.indexOf('<script src')).replace(/<link[^>]*>/g, '');
  const dom = new JSDOM(body + '</body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://localhost/' });
  const w = dom.window;
  const gradient = { addColorStop() {} };
  w.HTMLCanvasElement.prototype.getContext = function () {
    return new Proxy({}, {
      get(t, p) {
        if (p === 'createImageData') return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4), width: a, height: b });
        if (p === 'canvas') return this;
        if (p === 'measureText') return () => ({ width: 10 });
        return () => gradient;
      },
      set() { return true; },
    });
  };
  w.HTMLElement.prototype.requestPointerLock = function () {};
  w.eval(THREE_SRC);
  w.__tt = 0;
  w.performance.now = () => w.__tt;
  w.requestAnimationFrame = () => 1;
  w.cancelAnimationFrame = () => {};
  const errors = [];
  w.addEventListener('error', e => { errors.push(e.message); console.log('[' + (opts.name || 'game') + '] WINDOW ERROR', e.message); });
  if (opts.bus) w.claude = { use: async name => (name === 'room' ? opts.bus.capabilityFor('peer-' + (opts.id || 1)) : null) };
  w.eval(script + `
THREE.WebGLRenderer = class { constructor() { this.shadowMap = {}; this.info = {}; } setSize() {} setPixelRatio() {} render() {} };
window.step = function (n, ms) { for (let k = 0; k < n; k++) { window.__tt += ms || 16; loop(); scene.updateMatrixWorld(true); } };
window.E = function (c) { return eval(c); };
S.name = ${JSON.stringify(opts.name || 'PLAYER')}; S.cine = 0; banterRate = 0;`);
  return {
    w, errors,
    E: c => w.E(c),
    step: (n, ms) => w.step(n, ms),
    $: id => w.document.getElementById(id),
    click: id => w.document.getElementById(id).click(),
  };
}

/** Tiny assertion helper that records failures instead of throwing. */
function makeChecker(label) {
  let failures = 0, passes = 0;
  const check = (cond, msg) => {
    if (cond) { passes++; console.log('  ok:', msg); }
    else { failures++; console.log('  FAIL:', msg); }
    return !!cond;
  };
  check.done = () => {
    console.log(failures ? `${label}: ${failures} FAILED, ${passes} passed` : `${label}: all ${passes} checks passed`);
    return failures === 0;
  };
  return check;
}

module.exports = { createGame, makeRoomBus, makeChecker, sleep, DIST, ROOT };
