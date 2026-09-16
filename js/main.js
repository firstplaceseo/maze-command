// Maze Command entry point.
// Portrait layout: a 540 x 960 canvas scaled to fit the phone screen.

window.TD = window.TD || {};

TD.LAYOUT = {
  W: 540,
  H: 960,
  HUD_H: 62,
  COLS: 12,
  ROWS: 16,
  CELL: 45,
  BAR_H: 158,
};
TD.LAYOUT.GRID_Y = TD.LAYOUT.HUD_H;
TD.LAYOUT.GRID_H = TD.LAYOUT.ROWS * TD.LAYOUT.CELL;
TD.LAYOUT.BAR_Y = TD.LAYOUT.GRID_Y + TD.LAYOUT.GRID_H;

TD.FONT = '"Kenney Future", "Helvetica Neue", Arial, sans-serif';

TD.COLOURS = {
  bg: 0x2b8a4a,
  board: 0x1f261d,
  gridLine: 0x2a3327,
  spawn: 0x5a3b1e,
  exit: 0x1e4a3a,
  wall: 0x6b6f66,
  text: '#e8e6dc',
  muted: '#9a9d93',
  gold: '#f0c85a',
  bad: '#e5533d',
  good: '#7fd08a',
};

TD.save = {
  bestKey(faction) { return 'mazecommand_best_' + faction; },
  getBest(faction) {
    try { return parseInt(localStorage.getItem(this.bestKey(faction)) || '0', 10); } catch (e) { return 0; }
  },
  setBest(faction, wave) {
    try {
      if (wave > this.getBest(faction)) localStorage.setItem(this.bestKey(faction), String(wave));
    } catch (e) { /* private mode, ignore */ }
  },
};

function startGame() {
  const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: TD.LAYOUT.W,
    height: TD.LAYOUT.H,
    backgroundColor: TD.COLOURS.bg,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 2 },
    scene: [TD.BootScene, TD.MenuScene, TD.GameScene],
  };
  TD.game = new Phaser.Game(config);
}

if (document.fonts && document.fonts.load) {
  document.fonts.load('20px "Kenney Future"').then(startGame, startGame);
} else {
  startGame();
}
