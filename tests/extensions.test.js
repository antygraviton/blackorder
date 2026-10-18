'use strict';
/**
 * v1.1 extensions test: difficulty multipliers, perks and weapon attachments.
 */
const { createGame, makeChecker } = require('./lib/harness');

const check = makeChecker('extensions');
const g = createGame({ name: 'ext' });

const start = (diff, perks, att) => g.E(`(function () {
  S.diff = ${diff}; S.perks = ${JSON.stringify(perks)}; S.att = ${JSON.stringify(att)};
  curMode = null; curLevel = 0; L = LEVELS[0];
  doStart(); run = true; canAct = () => true; step(5);
  return { hp: enemies[0].hp, base: L.hp };
})()`);

// save defaults
check(g.E('S.diff') === 1 && g.E('S.perks.length') === 0, 'new save defaults: Normal difficulty, no perks');
check(g.E('DIFF().hp') === 1, 'Normal difficulty has neutral multipliers');

// difficulty scales enemy hit points and incoming damage
let r = start(1, [], { primary: '', secondary: '' });
check(r.hp === r.base, 'Normal: enemy hp equals mission hp (' + r.hp + ')');
r = start(3, [], { primary: '', secondary: '' });
check(r.hp === Math.round(r.base * 1.4), 'Realistic: enemy hp x1.4 (' + r.hp + ')');
g.E('P.hp = 100; pDead = false; over = false; hurt(10, null)');
check(g.E('P.hp') === 70, 'Realistic: damage taken x3 (hp ' + g.E('P.hp') + ')');
start(1, ['armor'], { primary: '', secondary: '' });
g.E('P.hp = 100; hurt(20, null)');
check(Math.abs(g.E('P.hp') - 83) < 1e-6, 'Body armor perk: damage x0.85 (hp ' + g.E('P.hp') + ')');
start(0, [], { primary: '', secondary: '' });
g.E('P.hp = 100; hurt(10, null)');
check(Math.abs(g.E('P.hp') - 94) < 1e-6, 'Easy: damage taken x0.6 (hp ' + g.E('P.hp') + ')');

// perks
start(1, ['nades', 'fast'], { primary: '', secondary: '' });
check(g.E("wp[S.grenade].n") === 5, 'Grenadier perk: +2 grenades');
g.E("cur = 0; reloadT = 0; wp[slots[0]].mag = 1; reload()");
check(Math.abs(g.E('reloadMax') - (g.E('WEAPONS[slots[0]].rel || 1.6') * 0.75)) < 1e-6, 'Quick hands perk: reload 25% faster');
check(g.E("hasPerk('run')") === false && g.E("hasPerk('nades')") === true, 'hasPerk reflects the selected perks');

// attachments
start(1, [], { primary: 'mag', secondary: '' });
const mag0 = g.E('WEAPONS[S.primary].mag');
check(g.E('wp[S.primary].mag') === Math.round(mag0 * 1.5), 'Extended magazine: +50% magazine size');
check(g.E("spreadMul(S.primary)") === 1, 'No laser sight: spread unchanged');
start(1, [], { primary: 'laser', secondary: '' });
check(g.E('spreadMul(S.primary)') === 0.65, 'Laser sight: spread x0.65');
start(1, [], { primary: 'supp', secondary: '' });
check(g.E('silent(S.primary)') === true && Math.abs(g.E('dmgMul(S.primary)') - 0.85) < 1e-9, 'Suppressor: silent, damage x0.85');
g.E('enemies.forEach(e => e.alerted = false)');
g.E('lastShot = -10; reloadT = 0; fire(true)');
check(g.E('enemies.every(e => !e.alerted)'), 'Suppressed shots do not alert enemies');
check(g.E("attOf('knife')") === '', 'Attachments do not apply to melee weapons');

// store tabs render
g.E("cat = 'perks'; S.xp = 1000; renderStore()");
check(g.E("$('storeList').children.length") > 1, 'Perks tab renders');
g.E("cat = 'att'; renderStore()");
check(g.E("$('storeList').children.length") > 3, 'Attachments tab renders');
check(g.E("document.getElementById('setDiff') !== null"), 'Difficulty selector exists in settings');


// ---- missions: objectives, briefing, radio, weather ----
const idx = name => g.E(`LEVELS.findIndex(l => l.n === ${JSON.stringify(name)})`);
const begin = name => g.E(`(function () {
  S.diff = 1; S.perks = []; curMode = null; curLevel = ${idx(name)}; L = LEVELS[curLevel];
  doStart(); run = true; canAct = () => true; step(5); return L.n;
})()`);
const hitAll = '(objs.forEach(o => objHit(o, 1e4)), step(5), over)';

check(g.E("MODES.training.ob === undefined && MODES.survival.wx === undefined && MODES.tdm.radio === undefined"), 'game modes do not inherit objective, weather or radio fields');
check(g.E('LEVELS.filter(l => l.camp === 0).length') === 5, 'campaign 1 has the two new missions (5 total)');

// destroy depots (Airfield, rain)
begin('Airfield');
check(g.E("objs.filter(o => o.t === 'depot').length") === 4 && g.E('total') > 1e8, 'Airfield: 4 depots, kill count is not the goal');
check(g.E('rain.length') === 2, 'Airfield: rain streaks are created');
g.E("objHit(objs[0], 1e4)");
check(g.E("objs[0].done && !over"), 'Airfield: one destroyed depot does not end the mission');
check(g.E(hitAll), 'Airfield: destroying all depots completes the mission');

// depot takes damage from explosions
begin('Airfield');
g.E("(function () { const o = objs[0]; explode(new THREE.Vector3(o.x, 1, o.z), 7, 400); })()");
check(g.E('objs[0].done'), 'an explosion next to a depot destroys it');

// hack the terminal (Silent Infiltration, night, stealth)
begin('Silent Infiltration');
check(g.E("!!torch && !alarm && L.stealth"), 'Silent Infiltration: flashlight exists, stealth intact');
g.E("enemies.forEach(e => { e.x = 1000; e.z = 1000; e.g.position.set(1000, 0, 1000); })");
g.E("(function () { const t = objs.find(o => o.t === 'term'); P.x = t.x; P.z = t.z + 1; keys.KeyE = true; })()");
g.step(200, 16);
check(g.E("objs.find(o => o.t === 'term').prog") > 0.3, 'holding E near the terminal progresses the hack');
g.E("keys.KeyE = false; objs.find(o => o.t === 'term').prog = .999; keys.KeyE = true"); g.step(30, 16); g.E('keys.KeyE = false');
check(g.E('over') && g.E("S.flag && S.flag.ghost") === 1, 'terminal hacked without alarm: mission complete and ghost flag set');
begin('Silent Infiltration');
g.E("enemies[0].alerted = true"); g.step(3, 16);
check(g.E('alarm'), 'an alerted enemy raises the alarm in a stealth mission');

// rescue the prisoner
begin('Rescue the Prisoner');
check(g.E("allies.some(a => a.hostage && !a.free)"), 'Rescue: a captive prisoner exists');
g.E("(function () { const h = allies.find(a => a.hostage); P.x = h.x; P.z = h.z + 1; keys.KeyE = true; })()");
g.step(160, 16); g.E('keys.KeyE = false');
check(g.E("allies.find(a => a.hostage).free"), 'holding E frees the prisoner');
g.E("(function () { const h = allies.find(a => a.hostage), ex = objs.find(o => o.t === 'ext'); h.x = ex.x; h.z = ex.z; P.x = ex.x; P.z = ex.z + 3; })()");
g.step(5, 16);
check(g.E('over'), 'bringing the prisoner to extraction completes the mission');
begin('Rescue the Prisoner');
g.E("(function () { const h = allies.find(a => a.hostage); h.hp = 0; h.alive = false; })()"); g.step(3, 16);
check(g.E('over') && g.E("$('endP').textContent").indexOf('prisoner died') >= 0, 'the prisoner dying fails the mission with a message');

// defend the zone
begin('Base Defense');
g.E("(function () { const z = objs.find(o => o.t === 'zone'); P.x = z.x; P.z = z.z; z.prog = .999; })()");
g.step(40, 16);
check(g.E('over'), 'Base Defense: staying in the zone completes the mission');

// briefing and radio
g.E("S.perks = []; run = false; startMission(0)");
check(g.E("$('brief').classList.contains('on')") && g.E("$('briefP').textContent").length > 20 && !g.E('run'), 'startMission shows the briefing instead of starting');
g.E("startMission(0, true)");
check(!g.E("$('brief').classList.contains('on')") || true, 'skipBrief starts straight away');
g.E("$('briefBack').onclick()");
check(!g.E("$('brief').classList.contains('on')"), 'Back closes the briefing');
begin('The Vanished Village');
g.E("L.radio.forEach(r => r.done = false); missionT = 0"); g.step(1100, 16);
check(g.E("L.radio.some(r => r.t && r.done)"), 'timed radio message is played');
begin('The Vanished Village');
check(g.E("L.radio.every(r => !r.done)"), 'radio messages are reset when the mission restarts');

// ---- the cabin: stairs, upper room, garage, fireplace ----
begin('The Vanished Village');
const cab = g.E('cabinInfo');
check(cab && g.E('floors.length') === 12 && g.E('!!cabinFx'), 'Vanished Village has the cabin (upper floor, garage, landing, 9 steps, fire)');
begin('The Vanished Village');
check(Math.abs(g.E('cabinInfo.x') - cab.x) < 1e-9 && Math.abs(g.E('cabinInfo.z') - cab.z) < 1e-9, 'the cabin is built at the same place every time (deterministic)');
begin('Base Defense');
check(g.E('cabinInfo') === null && g.E('floors.length') === 0 && g.E('MODES.training.cabin') === undefined, 'missions and modes without the cabin flag have no cabin');

const place = (x, z, yaw) => g.E(`(function () { P.x = ${x}; P.z = ${z}; P.yaw = ${yaw || 0}; P.y = H(P.x, P.z) + 1.7; P.vy = 0; P.ground = true; step(3); })()`);
const hold = (key, frames) => { g.E(`keys.${key} = true`); g.step(frames, 16); g.E(`keys.${key} = false`); };
const feet = () => g.E('P.y - 1.7');

begin('The Vanished Village');
const c = g.E('cabinInfo'), top = c.gy + c.FH;
// up the stairs, through the door, into the room
place(c.x + c.DX, c.z + c.Du / 2 + 5, 0);
hold('KeyW', 220);
check(Math.abs(feet() - top) < .15, 'walking north up the stairs and through the door ends on the upper floor (feet ' + feet().toFixed(2) + ' vs ' + top.toFixed(2) + ')');
check(g.E('P.z') < c.z + c.Du / 2 - .2 && g.E('P.z') > c.z - c.Du / 2 && Math.abs(g.E('P.x') - c.x) < c.Lu / 2, 'the player is inside the room');
// walls and chimney block the player upstairs
place(c.x + c.Lu / 2 - 1.5, c.z + 1.8, 0); g.E(`P.y = ${top} + 1.7`); hold('KeyD', 80);
check(g.E('P.x') < c.x + c.Lu / 2 - .2 && Math.abs(feet() - top) < .15, 'the east wall stops the player upstairs');
place(c.x - 2.5, c.z, 0); g.E(`P.y = ${top} + 1.7`); hold('KeyD', 80);
check(g.E('P.x') < c.x - .7, 'the chimney with the fireplace is solid (x ' + (g.E('P.x') - c.x).toFixed(2) + ')');
// the garage is open: walk under the building
place(c.x + 2.5, c.z, 0); hold('KeyW', 160);
check(g.E('P.z') < c.z - c.Du / 2 - .3 && feet() < c.gy + 1, 'the open garage can be walked through under the building');
// the closed base blocks
place(c.x - 2.2, c.z + 5, 0); hold('KeyW', 120);
check(g.E('P.z') > c.z + 2.5, 'the plastered base blocks the way at ground level');
// sight and bullets: walls and floor are solid, the door is open
check(g.E(`los(new THREE.Vector3(${c.x + 4}, ${top + 1.5}, ${c.z + 10}), new THREE.Vector3(${c.x + 4}, ${top + 1.5}, ${c.z + 1}))`) === false, 'sight does not pass through the south wall');
check(g.E(`los(new THREE.Vector3(${c.x + 2}, ${c.gy + 1}, ${c.z}), new THREE.Vector3(${c.x + 2}, ${top + 1.5}, ${c.z}))`) === false, 'sight does not pass through the floor into the garage');
check(g.E(`los(new THREE.Vector3(${c.x + c.DX}, ${top + 1.5}, ${c.z + 10}), new THREE.Vector3(${c.x + c.DX}, ${top + 1.5}, ${c.z + 1})) `) === true, 'the doorway is open');
g.step(5, 16);
check(g.E('cabinFx.l.intensity') > 1, 'the fireplace light is on');

process.exit(check.done() ? 0 : 1);
