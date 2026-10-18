'use strict';
/**
 * Fun layer: speech-bubble barks (banter) and cinematic scenes (intro fly-over, boss kill-cam, bullet time).
 * The harness turns both off by default (S.cine = 0, banterRate = 0); this test switches them on.
 */
const { createGame, makeChecker } = require('./lib/harness');

const check = makeChecker('banter');
const g = createGame({ name: 'fun' });
const start = (name, mode) => g.E(`(function () {
  S.diff = 1; S.perks = []; curMode = ${mode ? JSON.stringify(mode) : 'null'}; curLevel = ${mode ? 0 : `LEVELS.findIndex(l => l.n === ${JSON.stringify(name)})`};
  L = ${mode ? `MODES[${JSON.stringify(mode)}]` : 'LEVELS[curLevel]'}; doStart(); run = true; locked = false; fallback = true; return L.n;
})()`);
const near = (i, dz) => g.E(`(function () { const e = enemies[${i}]; e.x = P.x + 2; e.z = P.z - ${dz}; e.g.position.set(e.x, H(e.x, e.z), e.z); e.alive = true; e.hp = 100; })()`);

// ---- text tables ----
check(g.E('BANTER_KEYS.length') >= 20 && g.E('BANTER_KEYS.every(k => Array.isArray(BANTER[k]) && BANTER[k].length > 0)'), 'every banter key has lines (' + g.E('BANTER_KEYS.length') + ' keys)');
check(g.E('LEVELS.every(l => typeof l.cap === "string" && l.cap.length > 5)'), 'every mission has a funny caption');
check(g.E("MODES.training.cap === undefined && MODES.tdm.cap === undefined") && g.E('DEF.cine') === 1 && g.E("!!document.getElementById('setCine')"), 'game modes have no caption; cinematics are on by default and can be switched in Settings');

// ---- barks ----
start('The Vanished Village'); g.E('S.cine = 0; banterRate = 100');
const sprites0 = g.E('scene.children.filter(c => c.isSprite).length');
g.E("bark(enemies[0], 'enemyHit', true)");
check(g.E('bubbles.length') === 1 && g.E('scene.children.filter(c => c.isSprite).length') === sprites0 + 1, 'a forced bark creates a speech bubble sprite');
check(g.E('bubbles[0].sp.material.sizeAttenuation === false && bubbles[0].sp.material.fog === false && bubbles[0].sp.material.toneMapped === false'), 'bubbles keep a constant screen size and are not dimmed by fog or tone mapping');
check(g.E('bubbles[0].sp.scale.y') > 0.01 && g.E('bubbles[0].sp.scale.y') < 0.4, 'bubble size is a sensible fraction of the screen');
g.E('banterRate = 0'); g.step(300, 16);
check(g.E('bubbles.length') === 0 && g.E('scene.children.filter(c => c.isSprite).length') === sprites0, 'the bubble disappears after a few seconds');
g.E('banterRate = 100');
g.E('banterT = 0; allies[0].barkT = 0; allies[1].barkT = 0'); const n0 = g.E('bubbles.length');
g.E("bark(allies[0], 'allyHit')");
g.E("bark(allies[1], 'allyHit')");
check(g.E('bubbles.length') === n0 + 1, 'the global cooldown allows one bark at a time');
g.step(100, 16);
g.E('banterT = 0');
g.E("bark(allies[0], 'allyHit')");
check(g.E('bubbles.length') === 0 || g.E('bubbles.every(b => b.ent !== allies[0] || b.t > 0)'), 'the same speaker is limited too');

near(2, 8); g.E('banterT = 0; enemies[2].barkT = 0'); g.E('dmg(enemies[2], 1, false)');
check(g.E('bubbles.some(b => b.ent === enemies[2])'), 'a wounded enemy complains');
near(3, 8); g.E('banterT = 0; enemies[3].barkT = 0; enemies[3].alive = true'); g.E('dmg(enemies[3], 1e5, false)');
check(g.E('bubbles.length') >= 1, 'a dying enemy or his buddy says something');
g.E('banterT = 0; allies[0].barkT = 0; allies[0].alive = true; allies[0].hp = 100'); g.E('allyHit(allies[0], 1)');
check(g.E('bubbles.some(b => b.ent === allies[0])'), 'a hit ally yells');
g.E('banterT = 0; allyWarnT = 0; allies.forEach(a => { a.barkT = 0; })'); g.E('hurt(5, null)');
check(g.E('bubbles.some(b => b.ent.ally)'), 'an ally warns the player when he is hurt');
check(g.E('allies.filter(a => !a.remote).every(a => a.name)'), 'allies have names for their speech bubbles');
g.E('banterRate = 0; banterT = 0; allies.forEach(a => { a.barkT = 0; })'); const n1 = g.E('bubbles.length');
g.E("bark(allies[0], 'allyKill')");
check(g.E('bubbles.length') === n1, 'with banterRate 0 random barks are off');

// ---- boss lines ----
start('Commander of the Order'); g.E('S.cine = 0; banterRate = 0');
g.E('dmg(enemies.find(e => e.boss), 600, true)'); g.step(3, 16);
check(g.E('bossTier') >= 1 && g.E('bubbles.some(b => b.ent.boss)'), 'the Commander taunts at 75% health');
g.E('dmg(enemies.find(e => e.boss), 700, true)'); g.step(3, 16);
check(g.E('bossTier') >= 3, 'and again at lower health (tier ' + g.E('bossTier') + ')');

// ---- cinematics ----
start('The Vanished Village'); g.E('S.cine = 1; cineEnd(); cine.on = false'); start('The Vanished Village');
check(g.E('cine.on && cine.freeze && document.body.classList.contains("cine")'), 'the intro fly-over starts with the mission');
check(/Vanished Village/.test(g.E("$('cineTitle').textContent")) && /suspiciously low/.test(g.E("$('cineTitle').textContent")), 'the title card shows the mission name and its caption');
const ex = g.E('enemies[0].x'), pz = g.E('P.z'); g.E('keys.KeyW = true'); g.step(40, 16);
check(g.E('enemies[0].x') === ex && g.E('P.z') === pz && g.E('canAct()') === false, 'the world is frozen and the player cannot act during the intro');
g.E("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))"); g.E('keys.KeyW = false; keys.KeyA = false');
check(g.E('!cine.on && canAct() === true && !document.body.classList.contains("cine")'), 'any key skips the intro and gives control back');
start('The Vanished Village'); g.step(330, 16);
check(g.E('!cine.on'), 'the intro ends by itself after about 4.6 seconds');
start('The Vanished Village'); g.E("cineEnd()"); 
g.E("curMode = 'training'; L = MODES.training; doStart();");
check(g.E('!cine.on'), 'no intro in training');

start('Commander of the Order'); g.E('S.cine = 1; cineEnd()');
g.E('dmg(enemies.find(e => e.boss), 1e6, true)'); g.step(5, 16);
check(g.E('cine.on && !cine.freeze && !over && timeScale < 1') && /TARGET ELIMINATED/.test(g.E("$('cineTitle').textContent")), 'killing the boss starts the slow-motion kill-cam before the mission ends');
g.step(260, 16);
check(g.E('over') && !g.E('cine.on'), 'the mission completes when the kill-cam ends');
start('Armata'); g.E('S.cine = 1; cineEnd()');
g.E('vdmg(vehicles.find(v => v.boss), 1e7, true)'); g.step(5, 16);
check(/TANK DESTROYED/.test(g.E("$('cineTitle').textContent")) && !g.E('over'), 'the boss tank gets its own kill-cam');
g.step(260, 16);
check(g.E('over'), 'and the mission completes afterwards');

start('The Vanished Village'); g.E('S.cine = 1; cineEnd(); banterRate = 0; btCD = 0');
near(4, 8); g.E('dmg(enemies[4], 1e5, true)'); g.step(2, 16);
check(g.E('bt') > 0 && g.E('timeScale') < 1, 'a headshot kill triggers bullet time');
g.step(70, 16);
check(g.E('timeScale') === 1, 'bullet time ends after a moment');
near(5, 8); g.E('dmg(enemies[5], 1e5, true)'); g.step(2, 16);
check(g.E('timeScale') === 1, 'bullet time has a cooldown');
g.E('S.cine = 0');

check(g.errors.length === 0, 'no uncaught window errors');
process.exit(check.done() ? 0 : 1);
