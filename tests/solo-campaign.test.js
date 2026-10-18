'use strict';
/**
 * Solo campaign test: for every mission, build the world, exercise every
 * weapon, run enemy/vehicle AI, test the player helicopter (campaign 2 only)
 * and verify the mission can be completed.
 */
const { createGame, makeChecker } = require('./lib/harness');

const MISSION_DRIVER = `(function (lv) {
  const out = { lv, notes: [], ok: true };
  const bad = m => { out.ok = false; out.notes.push(m); };
  curMode = null; curLevel = lv; L = LEVELS[lv];
  doStart(); run = true; canAct = () => true;
  out.name = L.n; out.camp = L.camp; out.enemies = enemies.length;
  out.vehicles = vehicles.map(v => v.type); out.total = total;
  step(40); keys.KeyW = true; step(30); keys.KeyW = false;
  // every weapon: fire, reload, switch
  for (const id in WEAPONS) {
    slots[0] = id; const w2 = WEAPONS[id];
    wp[id] = w2.mag ? { mag: w2.mag, res: w2.res } : (w2.cat === 'grenade' ? { n: 3 } : {});
    cur = 0; buildView(); lastShot = -10; reloadT = 0;
    fire(true); step(8, 100);
    if (w2.mag) { fire(true); step(5, 100); reload(); step(20, 200); }
    step(40, 100);
  }
  for (let i = 0; i < slots.length; i++) sw(i);
  enemies.forEach(e => e.alerted = true); step(200);
  vehicles.forEach(v => { if (v.type === 'jet') v.jwait = 0; }); step(400);
  over = false; P.hp = 100; pDead = false; run = true;
  const nAllies = allies.filter(a => !a.hostage).length;
  if (nAllies !== 2) bad('expected 2 AI allies, got ' + nAllies);
  if ((L.camp === 1) !== !!pheli) bad('the player helicopter must exist only in campaign 2');
  if (pheli) {
    P.x = pheli.g.position.x + 2; P.z = pheli.g.position.z; P.y = H(P.x, P.z) + 1.7;
    step(5); toggleHeli();
    if (!mounted) bad('boarding the helicopter failed');
    const p0 = pheli.g.position.clone();
    keys.KeyW = true; step(70); keys.KeyW = false;                // climb
    P.pitch = -.45; step(90);                                     // nose down = forward flight
    const moved = Math.hypot(pheli.g.position.x - p0.x, pheli.g.position.z - p0.z);
    P.pitch = 0; step(60); P.yaw += 1.2; step(60);
    const camDist = cam.position.distanceTo(pheli.g.position);   // chase camera
    for (let wI = 0; wI < 3; wI++) { heliWeapon = wI; lastShot = -10; lastRocket = -10; for (let q = 0; q < 12; q++) { heliFire(true); step(3, 200); } }
    out.heli = { moved: +moved.toFixed(1), camDist: +camDist.toFixed(1) };
    if (moved < 5) bad('helicopter did not move forward when pitched down');
    if (camDist < 8) bad('chase camera too close');
    P.pitch = 0; keys.KeyS = true; step(400); keys.KeyS = false;
    toggleHeli();
    if (mounted) bad('exiting the helicopter failed after landing');
    P.x = pheli.g.position.x + 2; P.z = pheli.g.position.z; toggleHeli();
    hurt(2000, { x: 0, z: 0 });
    if (pheli.alive || mounted) bad('helicopter should be destroyed and the player ejected');
  }
  P.hp = 100; pDead = false; over = false;
  enemies.forEach(e => e.alerted = true); step(200);
  // kill everything
  for (const v of vehicles) {
    if (v.type !== 'jet' && v.alive) { P.x = v.g.position.x; P.z = v.g.position.z - 30; vdmg(v, 50, false); vdmg(v, 9999, true); }
  }
  step(60);
  enemies.forEach(e => { if (e.alive) dmg(e, 9999, false); });
  step(100);
  out.killed = killed; out.finalTotal = total;
  // objective missions (L.ob) are completed through their objective; see extensions.test.js
  if (!(L.ob && L.ob !== 'kill') && killed < total) bad('mission cannot be completed: ' + killed + '/' + total);
  return out;
})`;

(function main() {
  const check = makeChecker('solo-campaign');
  const g = createGame({ name: 'solo' });
  const n = g.E('LEVELS.length');
  check(n >= 6, `at least 6 missions defined (${n})`);
  for (let lv = 0; lv < n; lv++) {
    const r = g.E(MISSION_DRIVER + `(${lv})`);
    check(r.ok, `mission ${lv + 1}/${n} "${r.name}" (campaign ${r.camp + 1}): ${r.enemies} infantry, vehicles [${r.vehicles}]` +
      (r.heli ? `, heli moved ${r.heli.moved} m` : '') + (r.ok ? '' : ' -> ' + r.notes.join('; ')));
  }
  check(g.errors.length === 0, 'no uncaught window errors');
  process.exit(check.done() ? 0 : 1);
})();
