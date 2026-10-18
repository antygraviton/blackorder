'use strict';
/**
 * Touch controls test (web/src/js/165-touch.js): touches on the overlay drive the same state as
 * the keyboard and mouse. jsdom has no Touch API, so plain events with changedTouches are used.
 */
const { createGame, makeChecker } = require('./lib/harness');

const check = makeChecker('touch');
const g = createGame({ name: 'touch' });

check(g.E("document.getElementById('touch')") === null, 'no overlay on a desktop (no coarse pointer)');
g.E('initTouch(true)');
check(g.E("document.body.classList.contains('touch') && !!document.getElementById('touch')"), 'initTouch(true) creates the overlay');
g.E('initTouch(true)');
check(g.E("document.querySelectorAll('#touch').length") === 1, 'initTouch is idempotent');

g.E("S.diff = 1; S.perks = []; curMode = null; curLevel = 0; L = LEVELS[0]; doStart(); run = true; canAct = () => true;");
g.step(5, 16);

// dispatch a touch event on an element of the overlay
let tid = 1;
const touch = (id, type, pts) => g.E(`(function () {
  const ev = new Event(${JSON.stringify(type)}, { bubbles: true, cancelable: true });
  ev.changedTouches = ${JSON.stringify(pts)}; ev.touches = ${JSON.stringify(pts)};
  document.getElementById(${JSON.stringify(id)}).dispatchEvent(ev); return ev.defaultPrevented;
})()`);
const pt = (x, y, id) => [{ identifier: id, clientX: x, clientY: y }];

// stick
const j = tid++;
check(touch('tJoy', 'touchstart', pt(100, 300, j)) === true, 'touchstart is default-prevented (no emulated mouse events)');
touch('tJoy', 'touchmove', pt(100, 250, j));
check(g.E('keys.KeyW') === true && !g.E('keys.KeyS'), 'pushing the stick up holds W');
touch('tJoy', 'touchmove', pt(160, 300, j));
check(g.E('keys.KeyD') === true && !g.E('keys.KeyW'), 'pushing the stick right holds D');
touch('tJoy', 'touchmove', pt(100, 190, j));
check(g.E('keys.ShiftLeft') === true, 'pushing the stick to the edge sprints');
touch('tJoy', 'touchend', pt(100, 190, j));
check(!g.E('keys.KeyW') && !g.E('keys.KeyD') && !g.E('keys.ShiftLeft'), 'releasing the stick releases the keys');

// look
const yaw0 = g.E('P.yaw'), pitch0 = g.E('P.pitch'), l = tid++;
touch('tLook', 'touchstart', pt(600, 200, l));
touch('tLook', 'touchmove', pt(640, 180, l));
touch('tLook', 'touchend', pt(640, 180, l));
check(g.E('P.yaw') < yaw0 && g.E('P.pitch') > pitch0, 'dragging right/up turns the camera right and up');

// fire (hold) and look from the fire button
const f = tid++;
g.E('lastShot = -10; reloadT = 0');
touch('tFire', 'touchstart', pt(700, 300, f));
check(g.E('mouseDown') === true && g.E('lastShot') > -10, 'fire button presses the trigger and shoots');
const yaw1 = g.E('P.yaw'); touch('tFire', 'touchmove', pt(730, 300, f));
check(g.E('P.yaw') < yaw1, 'dragging from the fire button also looks');
touch('tFire', 'touchend', pt(730, 300, f));
check(g.E('mouseDown') === false, 'releasing the fire button releases the trigger');

// aim toggles
touch('tAim', 'touchstart', pt(1, 1, tid++)); touch('tAim', 'touchend', pt(1, 1, tid - 1));
check(g.E('aim') === true, 'aim button toggles aiming on');
touch('tAim', 'touchstart', pt(1, 1, tid++)); touch('tAim', 'touchend', pt(1, 1, tid - 1));
check(g.E('aim') === false, 'aim button toggles aiming off');

// reload, jump, use, swap, grenade, pause
g.E('cur = 0; reloadT = 0; wp[slots[0]].mag = 1');
touch('tReload', 'touchstart', pt(1, 1, tid++)); touch('tReload', 'touchend', pt(1, 1, tid - 1));
check(g.E('reloadT') > 0, 'reload button reloads');
touch('tJump', 'touchstart', pt(1, 1, tid++));
check(g.E('keys.Space') === true, 'jump button holds Space'); touch('tJump', 'touchend', pt(1, 1, tid - 1));
check(!g.E('keys.Space'), 'jump button releases Space');
touch('tUse', 'touchstart', pt(1, 1, tid++));
check(g.E('keys.KeyE') === true, 'use button holds E (hack, free, board)'); touch('tUse', 'touchend', pt(1, 1, tid - 1));
check(!g.E('keys.KeyE'), 'use button releases E');
g.E('cur = 0; reloadT = 0');
touch('tSwap', 'touchstart', pt(1, 1, tid++)); touch('tSwap', 'touchend', pt(1, 1, tid - 1));
check(g.E('cur') === 1, 'swap button selects the next weapon');
g.step(60, 16);
const n0 = g.E('wp[slots[3]].n');
touch('tNade', 'touchstart', pt(1, 1, tid++)); touch('tNade', 'touchend', pt(1, 1, tid - 1));
check(g.E('wp[slots[3]].n') === n0 - 1, 'grenade button throws a grenade (' + n0 + ' -> ' + g.E('wp[slots[3]].n') + ')');
touch('tPause', 'touchstart', pt(1, 1, tid++)); touch('tPause', 'touchend', pt(1, 1, tid - 1));
check(g.E("document.getElementById('pause').classList.contains('on')"), 'pause button opens the pause menu');

// the drawing buffer follows the real size of #game, not a stale innerWidth
g.E("Object.defineProperty($('game'), 'clientWidth', { configurable: true, value: 800 }); Object.defineProperty($('game'), 'clientHeight', { configurable: true, value: 400 }); fitRenderer()");
check(Math.abs(g.E('cam.aspect') - 2) < 1e-9, 'fitRenderer takes the camera aspect from the #game element (2.0)');
g.E("Object.defineProperty($('game'), 'clientWidth', { configurable: true, value: 400 }); fitRenderer()");
check(Math.abs(g.E('cam.aspect') - 1) < 1e-9, 'fitRenderer follows later size changes');

process.exit(check.done() ? 0 : 1);
