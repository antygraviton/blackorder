'use strict';
/** Menu rendering, Training, Survival and solo Team Match. */
const { createGame, makeChecker } = require('./lib/harness');

(function main() {
  const check = makeChecker('modes');
  const g = createGame({ name: 'solo' });
  const q = s => g.w.document.querySelectorAll(s).length;

  // ---- menu ----
  g.E("playTab='quick';renderPlay();");
  check(q('#playBody .card button') >= 4, 'Quick Games tab renders mode cards (' + q('#playBody .card button') + ' buttons)');
  g.E("playTab='camp';renderPlay();");
  check(q('#playBody .card button') >= 3, 'Campaign tab renders mission cards');
  check(g.$('multi') !== null && g.$('store') !== null && g.$('settings') !== null, 'all menu screens exist');

  // ---- Training ----
  g.E("startMode('training');doStart();run=true;canAct=()=>true;S.wp=5000;");
  check(g.E('enemies.length') === 8 && g.E('vehicles.length') === 2 && g.E('allies.length') === 0, 'Training: 8 targets, 2 vehicle targets, no allies');
  const kills0 = g.E('S.kills');
  g.step(30);
  g.E(`for (let i = 0; i < 30; i++) { trainCycle(); lastShot = -10; fire(true); step(3, 100); }
       for (let s = 0; s < 4; s++) { sw(s); for (let i = 0; i < 6; i++) { trainCycle(); lastShot = -10; fire(true); step(3, 100); } }`);
  const hp0 = g.E('P.hp'); g.E('hurt(500)');
  check(g.E('P.hp') === hp0 && !g.E('over'), 'Training: the player is invincible');
  g.E('dmg(enemies[0],9999,true)'); g.step(5);
  check(g.E('enemies[0].alive') === false, 'Training: a target can be destroyed');
  g.step(250);
  check(g.E('enemies[0].alive') === true, 'Training: the target respawns');
  check(g.E('S.kills') === kills0, 'Training kills do not count toward lifetime stats');
  g.E('{const v=vehicles[0];vdmg(v,400,true);vdmg(v,400,false);}');
  check(g.E('vehicles[0].alive'), 'Training: vehicle targets cannot be destroyed');
  g.step(400);

  // ---- Survival ----
  g.E("startMode('survival');doStart();run=true;canAct=()=>true;");
  check(g.E('mines.length') === 6 && g.E('kits.length') === 2 && g.E('allies.length') === 2, 'Survival: 6 mines, 2 medkits, 2 allies');
  const wpBefore = g.E('S.wp');
  const vehicleTypes = {};
  for (let w = 1; w <= 10; w++) {
    g.step(700);
    check(g.E('wave') === w, `Survival: wave ${w} started`);
    g.E('vehicles.forEach(v=>{})');
    (g.E('vehicles.map(v=>v.type)')).forEach(t => { vehicleTypes[t] = (vehicleTypes[t] || 0) + 1; });
    g.E(`P.hp=100;enemies.forEach(e=>{if(e.alive)dmg(e,99999,false);});
         vehicles.forEach(v=>{if(v.alive&&v.type!=='jet')vdmg(v,99999,true);});`);
    g.step(30); g.E('over=false');
  }
  check(vehicleTypes.apc >= 3 && vehicleTypes.heli >= 1 && vehicleTypes.tank >= 1, 'Survival: APCs, helicopters and tanks appear in later waves ' + JSON.stringify(vehicleTypes));
  g.E('P.hp=100;over=false'); g.step(800);
  g.E('hurt(5000,{x:0,z:0})');
  check(g.E('over'), 'Survival: dying ends the run');
  check(g.E('S.wp') > wpBefore && g.E('S.bestWave') >= 9, 'Survival: reward paid and record stored (' + wpBefore + ' -> ' + g.E('S.wp') + ' WP)');

  // ---- Team Match (solo) ----
  g.E("startMode('tdm');doStart();run=true;canAct=()=>true;");
  check(g.E('enemies.length') === 6 && g.E('allies.length') === 2 && !!g.E('tdm'), 'Team Match: 6 bots, 2 allies');
  g.step(50);
  g.E('dmg(enemies[0],9999,false)'); g.step(300);
  check(g.E('enemies[0].alive'), 'Team Match: bots respawn');
  g.E('hurt(1000,{x:0,z:0})');
  check(g.E('pDead') && g.E('tdm.red') === 1 && !g.E('over'), 'Team Match: dying gives the bots a point and respawns, it does not end the match');
  g.step(500);
  check(!g.E('pDead') && g.E('P.hp') === 100, 'Team Match: the player respawns');
  g.E('killed=24;dmg(enemies[1],9999,false)'); g.step(80);
  check(g.E('over'), 'Team Match: reaching the kill limit ends the match');
  check(g.errors.length === 0, 'no uncaught window errors');
  process.exit(check.done() ? 0 : 1);
})();
