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

process.exit(check.done() ? 0 : 1);
