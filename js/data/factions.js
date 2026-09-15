// Faction and tower data for Maze Command.
// Edit numbers here to rebalance. No game code needs to change.
//
// Each faction has one tower line with 7 tiers. Upgrading a tower moves it to
// the next tier and charges the price difference. Tier 7 needs 1 Core, which
// the player receives once at wave 25.
//
// Fields per tier:
//   name      shown in the upgrade panel
//   cost      total value of the tower at this tier (gold)
//   damage    damage per shot before armour
//   range     in grid cells
//   cooldown  seconds between shots
//   splash    radius in cells, 0 for single target
//   slow      0..1 fraction of speed removed for 2 seconds on hit (0 = none)
//   air       true if the tower can hit flying enemies
//   core      true if this tier needs the Core resource
// Stats were derived from the System TD Warcraft III map, scaled for one player.

window.TD = window.TD || {};

TD.FACTIONS = {
  federation: {
    id: 'federation',
    name: 'Federation',
    tagline: 'Precision and range. Expensive, but every shot counts.',
    colour: 0x3b78d6,
    colourHex: '#3b78d6',
    accent: 0xeaf1ff,
    emblem: 'star',
    wallCost: 6,
    tiers: [
      { name: 'Rifle Post',     cost: 10,  damage: 27,  range: 2.4, cooldown: 1.0,  splash: 0,   slow: 0, air: true },
      { name: 'Marksman Nest',  cost: 25,  damage: 38,  range: 2.6, cooldown: 0.8,  splash: 0,   slow: 0, air: true },
      { name: 'Grenadier',      cost: 75,  damage: 75,  range: 2.8, cooldown: 0.9,  splash: 0.8, slow: 0, air: true },
      { name: 'Autocannon',     cost: 150, damage: 100, range: 3.7, cooldown: 1.0,  splash: 0,   slow: 0, air: true },
      { name: 'Howitzer',       cost: 200, damage: 155, range: 3.7, cooldown: 1.0,  splash: 1.0, slow: 0, air: true },
      { name: 'Drone Hive',     cost: 425, damage: 220, range: 3.9, cooldown: 0.29, splash: 0.5, slow: 0.3, air: true },
      { name: 'Railgun',        cost: 750, damage: 850, range: 9.0, cooldown: 0.2,  splash: 0,   slow: 0, air: true, core: true },
    ],
  },

  union: {
    id: 'union',
    name: 'Union',
    tagline: 'Long range and slows. Controls the field rather than brute force.',
    colour: 0xe0b83c,
    colourHex: '#e0b83c',
    accent: 0x1f2a5c,
    emblem: 'ring',
    wallCost: 5,
    tiers: [
      { name: 'Checkpoint',      cost: 10,  damage: 15,  range: 3.9, cooldown: 0.9,  splash: 0,   slow: 0.2, air: true },
      { name: 'Border Wall Gun', cost: 40,  damage: 28,  range: 5.0, cooldown: 1.0,  splash: 0,   slow: 0.3, air: true },
      { name: 'Signal Jammer',   cost: 90,  damage: 93,  range: 5.3, cooldown: 0.9,  splash: 0,   slow: 0.3, air: true },
      { name: 'Gatling Battery', cost: 135, damage: 114, range: 1.8, cooldown: 0.2,  splash: 0,   slow: 0, air: true },
      { name: 'Radar Cannon',    cost: 200, damage: 118, range: 5.0, cooldown: 0.7,  splash: 0,   slow: 0.4, air: true },
      { name: 'Tesla Array',     cost: 350, damage: 350, range: 4.3, cooldown: 1.0,  splash: 1.2, slow: 0.5, air: true },
      { name: 'Orbital Lance',   cost: 750, damage: 850, range: 9.0, cooldown: 0.2,  splash: 0,   slow: 0, air: true, core: true },
    ],
  },

  motherland: {
    id: 'motherland',
    name: 'Motherland',
    tagline: 'Cheap walls and heavy splash. Bunch them up and burn them.',
    colour: 0xc9302c,
    colourHex: '#c9302c',
    accent: 0xd9dde3,
    emblem: 'bear',
    wallCost: 4,
    tiers: [
      { name: 'Conscript Pit',   cost: 10,  damage: 10,  range: 2.6, cooldown: 0.85, splash: 0,   slow: 0, air: true },
      { name: 'Mortar Pit',      cost: 52,  damage: 48,  range: 2.6, cooldown: 0.4,  splash: 0.8, slow: 0, air: false },
      { name: 'Flame Trench',    cost: 125, damage: 92,  range: 2.3, cooldown: 0.4,  splash: 0.9, slow: 0, air: false },
      { name: 'Katyusha Rack',   cost: 150, damage: 158, range: 5.5, cooldown: 1.3,  splash: 1.3, slow: 0, air: true },
      { name: 'Heavy Artillery', cost: 250, damage: 196, range: 2.6, cooldown: 0.4,  splash: 1.0, slow: 0, air: true },
      { name: 'Thermobaric Gun', cost: 350, damage: 321, range: 2.4, cooldown: 0.3,  splash: 1.4, slow: 0, air: true },
      { name: 'Tsar Cannon',     cost: 750, damage: 850, range: 9.0, cooldown: 0.2,  splash: 0,   slow: 0, air: true, core: true },
    ],
  },

  dynasty: {
    id: 'dynasty',
    name: 'Dynasty',
    tagline: 'Fast fire and numbers. Many small hits add up quickly.',
    colour: 0xd8462e,
    colourHex: '#d8462e',
    accent: 0xffd166,
    emblem: 'dragon',
    wallCost: 4,
    tiers: [
      { name: 'Militia Tower',   cost: 10,  damage: 14,  range: 2.4, cooldown: 0.75, splash: 0,   slow: 0, air: true },
      { name: 'Crossbow Line',   cost: 35,  damage: 23,  range: 1.2, cooldown: 0.3,  splash: 0,   slow: 0, air: true },
      { name: 'Rocket Cart',     cost: 75,  damage: 58,  range: 2.9, cooldown: 1.0,  splash: 0.7, slow: 0, air: true },
      { name: 'Fire Lance',      cost: 120, damage: 91,  range: 3.5, cooldown: 0.7,  splash: 0,   slow: 0.2, air: true },
      { name: 'Repeater Cannon', cost: 250, damage: 155, range: 4.3, cooldown: 0.5,  splash: 0.6, slow: 0, air: true },
      { name: 'Hornet Swarm',    cost: 400, damage: 428, range: 1.8, cooldown: 0.25, splash: 0,   slow: 0, air: true },
      { name: 'Jade Emperor',    cost: 750, damage: 850, range: 9.0, cooldown: 0.2,  splash: 0,   slow: 0, air: true, core: true },
    ],
  },
};

TD.FACTION_ORDER = ['federation', 'union', 'motherland', 'dynasty'];

// Overclock: after tier 7 the tower keeps improving forever.
// Each level adds OVERCLOCK_DAMAGE to damage (as a fraction of tier 7 damage)
// and costs OVERCLOCK_BASE * OVERCLOCK_GROWTH ^ level.
TD.OVERCLOCK_DAMAGE = 0.10;
TD.OVERCLOCK_BASE = 400;
TD.OVERCLOCK_GROWTH = 1.15;
