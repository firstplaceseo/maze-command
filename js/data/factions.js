// Faction and tower data for Maze Command.
// Edit numbers here to rebalance. No game code needs to change.
//
// Every faction has the four shared tower lines below plus one special line.
// Each line has 4 tiers. Upgrading charges the price difference. The last
// tier of the special line needs a Core (awarded every 25 waves).
//
// Fields per tier:
//   name      shown in the panel
//   cost      total value of the tower at this tier (gold)
//   damage    damage per shot before armour
//   range     in grid cells
//   cooldown  seconds between shots
//   splash    radius in cells, 0 for single target
//   slow      0..1 fraction of speed removed for 2 seconds on hit
//   targets   how many enemies one volley hits (default 1)
// Line fields:
//   ground / air   what the line can shoot
//   turrets        art keys per tier (see BootScene)
//   role           short description shown in the build bar

window.TD = window.TD || {};

function line(id, name, role, ground, air, turrets, tiers) {
  return { id, name, role, ground, air, turrets, tiers };
}

// Shared lines. Faction modifiers are applied on top (see TD.factionLines).
TD.SHARED_LINES = [
  line('gunner', 'Gunner', 'Ground and air. Cheap all-rounder.', true, true,
    ['turret_226', 'turret_227', 'turret_203', 'turret_203'], [
      { name: 'Gun Post',      cost: 10,  damage: 16,  range: 2.4, cooldown: 0.8,  splash: 0,   slow: 0 },
      { name: 'Twin Gun',      cost: 30,  damage: 30,  range: 2.6, cooldown: 0.7,  splash: 0,   slow: 0 },
      { name: 'Autocannon',    cost: 80,  damage: 62,  range: 2.9, cooldown: 0.6,  splash: 0,   slow: 0 },
      { name: 'Gatling Nest',  cost: 190, damage: 110, range: 3.2, cooldown: 0.45, splash: 0,   slow: 0 },
    ]),
  line('flak', 'Flak', 'Air only. Long range, big hits on aircraft.', false, true,
    ['turret_204', 'turret_204', 'turret_205', 'turret_205'], [
      { name: 'Flak Gun',      cost: 14,  damage: 45,  range: 3.6, cooldown: 1.0,  splash: 0.5, slow: 0 },
      { name: 'Flak Battery',  cost: 40,  damage: 95,  range: 4.0, cooldown: 0.9,  splash: 0.6, slow: 0 },
      { name: 'SAM Site',      cost: 110, damage: 210, range: 4.6, cooldown: 0.9,  splash: 0.8, slow: 0 },
      { name: 'Skyfire Array', cost: 260, damage: 420, range: 5.2, cooldown: 0.8,  splash: 1.0, slow: 0 },
    ]),
  line('artillery', 'Artillery', 'Ground only. Slow, long range, wide splash.', true, false,
    ['turret_228', 'turret_228', 'turret_229', 'turret_229'], [
      { name: 'Mortar',        cost: 25,  damage: 40,  range: 3.4, cooldown: 1.6,  splash: 0.9, slow: 0 },
      { name: 'Howitzer',      cost: 70,  damage: 95,  range: 3.9, cooldown: 1.6,  splash: 1.0, slow: 0 },
      { name: 'Siege Gun',     cost: 170, damage: 210, range: 4.4, cooldown: 1.5,  splash: 1.2, slow: 0 },
      { name: 'Doom Cannon',   cost: 380, damage: 430, range: 4.9, cooldown: 1.4,  splash: 1.4, slow: 0 },
    ]),
  line('sniper', 'Sniper', 'Ground and air. Huge single hits, very long range.', true, true,
    ['turret_203', 'turret_203', 'turret_206', 'turret_206'], [
      { name: 'Marksman',      cost: 30,  damage: 80,  range: 4.5, cooldown: 2.0,  splash: 0,   slow: 0 },
      { name: 'Sharpshooter',  cost: 85,  damage: 190, range: 5.2, cooldown: 1.9,  splash: 0,   slow: 0 },
      { name: 'Anti-Materiel', cost: 200, damage: 420, range: 5.9, cooldown: 1.8,  splash: 0,   slow: 0 },
      { name: 'Longshot',      cost: 450, damage: 880, range: 6.8, cooldown: 1.7,  splash: 0,   slow: 0 },
    ]),
];

TD.FACTIONS = {
  federation: {
    id: 'federation', name: 'Federation',
    tagline: 'Precision and range. Pays more, shoots further.',
    colour: 0x3b78d6, colourHex: '#3b78d6', emblem: 'star', wallCost: 6,
    mods: { cost: 1.15, damage: 1.0, range: 1.15, cooldown: 1.0, slow: 0 },
    special: line('railgun', 'Railgun', 'Ground and air. One target, enormous damage.', true, true,
      ['turret_206', 'turret_206', 'turret_206', 'turret_206'], [
        { name: 'Coil Gun',      cost: 60,  damage: 150,  range: 4.0, cooldown: 1.2, splash: 0, slow: 0 },
        { name: 'Rail Cannon',   cost: 180, damage: 380,  range: 4.6, cooldown: 1.1, splash: 0, slow: 0 },
        { name: 'Mass Driver',   cost: 420, damage: 800,  range: 5.4, cooldown: 1.0, splash: 0, slow: 0 },
        { name: 'Orbital Lance', cost: 900, damage: 2200, range: 7.0, cooldown: 0.9, splash: 0, slow: 0, core: true },
      ]),
  },
  union: {
    id: 'union', name: 'Union',
    tagline: 'Control the field. Every tower slows, the Tesla stops them cold.',
    colour: 0xe0b83c, colourHex: '#e0b83c', emblem: 'ring', wallCost: 5,
    mods: { cost: 1.0, damage: 0.9, range: 1.0, cooldown: 1.0, slow: 0.15 },
    special: line('tesla', 'Tesla', 'Ground and air. Splash plus a heavy slow.', true, true,
      ['turret_229', 'turret_229', 'turret_205', 'turret_205'], [
        { name: 'Shock Coil',   cost: 45,  damage: 40,  range: 2.8, cooldown: 0.9,  splash: 1.0, slow: 0.45 },
        { name: 'Arc Tower',    cost: 140, damage: 110, range: 3.2, cooldown: 0.9,  splash: 1.2, slow: 0.5 },
        { name: 'Storm Pylon',  cost: 340, damage: 260, range: 3.6, cooldown: 0.85, splash: 1.4, slow: 0.55 },
        { name: 'Tesla Array',  cost: 800, damage: 700, range: 4.2, cooldown: 0.8,  splash: 1.8, slow: 0.65, core: true },
      ]),
  },
  motherland: {
    id: 'motherland', name: 'Motherland',
    tagline: 'Cheap and brutal. Pack the maze and burn them.',
    colour: 0xc9302c, colourHex: '#c9302c', emblem: 'bear', wallCost: 3,
    mods: { cost: 0.85, damage: 1.0, range: 0.95, cooldown: 1.0, slow: 0 },
    special: line('flame', 'Flame', 'Ground only. Short range, huge splash, very cheap.', true, false,
      ['turret_227', 'turret_227', 'turret_228', 'turret_228'], [
        { name: 'Flame Pit',    cost: 20,  damage: 18,  range: 1.6, cooldown: 0.25, splash: 1.0, slow: 0 },
        { name: 'Flame Trench', cost: 60,  damage: 40,  range: 1.8, cooldown: 0.25, splash: 1.2, slow: 0 },
        { name: 'Inferno',      cost: 160, damage: 95,  range: 2.0, cooldown: 0.22, splash: 1.4, slow: 0 },
        { name: 'Hellstorm',    cost: 420, damage: 240, range: 2.4, cooldown: 0.2,  splash: 1.8, slow: 0, core: true },
      ]),
  },
  dynasty: {
    id: 'dynasty', name: 'Dynasty',
    tagline: 'Numbers win. Faster fire, lighter hits, swarms of rockets.',
    colour: 0xd8462e, colourHex: '#d8462e', emblem: 'dragon', wallCost: 4,
    mods: { cost: 1.0, damage: 0.85, range: 1.0, cooldown: 0.8, slow: 0 },
    special: line('swarm', 'Swarm', 'Ground and air. Fires at three targets at once.', true, true,
      ['turret_204', 'turret_205', 'turret_205', 'turret_205'], [
        { name: 'Rocket Rack',  cost: 40,  damage: 22,  range: 3.0, cooldown: 0.9,  splash: 0.3, slow: 0, targets: 3 },
        { name: 'Hornet Nest',  cost: 120, damage: 55,  range: 3.3, cooldown: 0.85, splash: 0.3, slow: 0, targets: 3 },
        { name: 'Wasp Battery', cost: 300, damage: 130, range: 3.6, cooldown: 0.8,  splash: 0.4, slow: 0, targets: 3 },
        { name: 'Dragon Swarm', cost: 750, damage: 340, range: 4.2, cooldown: 0.7,  splash: 0.5, slow: 0, targets: 4, core: true },
      ]),
  },
};

TD.FACTION_ORDER = ['federation', 'union', 'motherland', 'dynasty'];

// The tower lines a faction can build: shared lines with modifiers, then its special.
TD.factionLines = function (factionId) {
  const f = TD.FACTIONS[factionId];
  if (f._lines) return f._lines;
  const m = f.mods;
  const apply = (ln) => Object.assign({}, ln, {
    tiers: ln.tiers.map((t) => Object.assign({}, t, {
      cost: Math.round(t.cost * m.cost),
      damage: Math.round(t.damage * m.damage),
      range: +(t.range * m.range).toFixed(2),
      cooldown: +(t.cooldown * m.cooldown).toFixed(2),
      slow: Math.min(0.8, (t.slow || 0) + m.slow),
    })),
  });
  f._lines = TD.SHARED_LINES.map(apply).concat([Object.assign({}, f.special, { special: true })]);
  return f._lines;
};

// Overclock: after the last tier the tower keeps improving forever.
TD.OVERCLOCK_DAMAGE = 0.10;
TD.OVERCLOCK_BASE = 300;
TD.OVERCLOCK_GROWTH = 1.15;
