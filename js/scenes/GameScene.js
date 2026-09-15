// Game scene for Maze Command (v2, sprite based).
//
// Flow: build phase (countdown, enemies mass at the entrance) -> wave ->
// all enemies gone -> bonus -> next build phase. Repeats forever.
// Every 5th wave is a boss with its own health bar.

window.TD = window.TD || {};

const KIND_TEX = { inf: ['inf0', 'inf1'], buggy: ['buggy'], tank: ['tank'], heli: ['heli0', 'heli1'], boss: ['boss'] };
const KIND_SCALE = { inf: 0.42, buggy: 0.5, tank: 0.5, heli: 0.5, boss: 0.62 };
const KIND_RADIUS = { inf: 9, buggy: 11, tank: 12, heli: 11, boss: 20 };

TD.GameScene = class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.factionId = data.faction || 'federation';
    this.faction = TD.FACTIONS[this.factionId];
    this.difficultyId = data.difficulty || 'normal';
    this.difficulty = TD.DIFFICULTY[this.difficultyId];
  }

  create() {
    const L = TD.LAYOUT;
    TD.ART.install(this, TD.FACTIONS);
    this.grid = new TD.Grid(L.COLS, L.ROWS);

    this.gold = TD.ECON.startGold;
    this.lives = this.difficulty.lives;
    this.cores = 0;
    this.wave = 0;
    this.phase = 'build';
    this.countdown = TD.ECON.firstWaveDelay;
    this.speedMult = 1;
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.currentWave = null;
    this.livesLostThisWave = 0;
    this.buildMode = 'tower';
    this.selected = null;
    this.gameOver = false;
    this.animClock = 0;

    this.buildMap();
    this.pathLayer = this.add.layer().setDepth(1);
    this.decoLayer = this.add.layer().setDepth(2);
    this.towerLayer = this.add.layer().setDepth(3);
    this.groundLayer = this.add.layer().setDepth(4);
    this.bulletLayer = this.add.layer().setDepth(5);
    this.airLayer = this.add.layer().setDepth(6);
    this.fxLayer = this.add.layer().setDepth(7);
    this.rangeGfx = this.add.graphics().setDepth(3);
    this.barGfx = this.add.graphics().setDepth(8);
    this.decorate();
    this.buildPathTiles();
    this.drawGridLines();

    this.buildHud();
    this.buildBar();
    this.buildPanel();
    this.massing = [];
    this.showMassing();

    this.input.on('pointerdown', (p) => { TD.SFX.unlock(); this.onPointerDown(p); });
    this.announce('Build your maze. Wave 1 is forming.');
  }

  cellX(c) { return c * TD.LAYOUT.CELL + TD.LAYOUT.CELL / 2; }
  cellY(r) { return TD.LAYOUT.GRID_Y + r * TD.LAYOUT.CELL + TD.LAYOUT.CELL / 2; }

  // ------------------------------------------------------------------ map

  buildMap() {
    const L = TD.LAYOUT;
    const ground = this.add.layer().setDepth(0);
    let seed = 7;
    const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let row = 0; row < L.ROWS; row++) {
      for (let c = 0; c < L.COLS; c++) {
        const key = row === this.grid.spawn.r ? 'road' + (c % 2) : 'grass' + Math.floor(r() * 4);
        const img = this.add.image(this.cellX(c), this.cellY(row), key).setScale(0.5);
        if (r() < 0.5) img.setFlipX(true);
        ground.add(img);
      }
    }
  }

  drawGridLines() {
    const L = TD.LAYOUT, g = this.add.graphics().setDepth(2);
    g.lineStyle(1, 0x000000, 0.12);
    for (let c = 1; c < L.COLS; c++) g.lineBetween(c * L.CELL, L.GRID_Y + L.CELL, c * L.CELL, L.BAR_Y - L.CELL);
    for (let r = 1; r < L.ROWS; r++) g.lineBetween(0, L.GRID_Y + r * L.CELL, L.W, L.GRID_Y + r * L.CELL);
  }

  decorate() {
    const L = TD.LAYOUT, s = this.grid.spawn, e = this.grid.exit;
    // trees and rocks along the exit row, bunker in the middle
    for (let c = 0; c < L.COLS; c++) {
      if (c === e.c || c === e.c + 1) continue;
      const key = c % 3 === 0 ? 'tree' + (c % 3) : c % 4 === 1 ? 'rock' + (c % 2) : 'bush' + (c % 2);
      this.decoLayer.add(this.add.image(this.cellX(c) + (c % 2 ? 6 : -4), this.cellY(e.r) + 2, key).setScale(0.5));
    }
    this.decoLayer.add(this.add.image(this.cellX(e.c) + L.CELL / 2, this.cellY(e.r), 'bunker_' + this.factionId).setScale(0.5));
    // wreckage and rocks on the road
    for (const c of [1, 4, 9]) this.decoLayer.add(this.add.image(this.cellX(c), this.cellY(s.r), c === 4 ? 'wreck' : 'rock1').setScale(0.45).setAlpha(0.9));
    this.add.text(6, this.cellY(s.r) - 20, 'Enemies enter', { fontFamily: TD.FONT, fontSize: '12px', color: '#f1d9a8', backgroundColor: '#00000066', padding: { x: 4, y: 1 } }).setDepth(2);
  }

  buildPathTiles() {
    const L = TD.LAYOUT;
    this.pathTiles = [];
    for (let row = 0; row < L.ROWS; row++) {
      for (let c = 0; c < L.COLS; c++) {
        const img = this.add.image(this.cellX(c), this.cellY(row), 'dirt' + ((row + c) % 4)).setScale(0.5).setVisible(false);
        this.pathLayer.add(img);
        this.pathTiles[row * L.COLS + c] = img;
      }
    }
    this.redrawPath();
  }

  redrawPath() {
    const L = TD.LAYOUT;
    for (const t of this.pathTiles) t.setVisible(false);
    const p = this.grid.path;
    if (!p) return;
    for (const cell of p) {
      if (cell.r === this.grid.spawn.r) continue;
      this.pathTiles[cell.r * L.COLS + cell.c].setVisible(true);
    }
  }

  // Enemies of the next wave gather at the entrance during the build phase
  showMassing() {
    for (const m of this.massing) m.destroy();
    this.massing = [];
    if (this.phase !== 'build') return;
    const next = TD.getWave(this.wave + 1);
    const n = next.kind === 'boss' ? 1 : 4;
    for (let i = 0; i < n; i++) {
      const x = this.cellX(this.grid.spawn.c) + (i - (n - 1) / 2) * 26;
      const spr = this.add.image(x, this.cellY(this.grid.spawn.r) - 4, KIND_TEX[next.kind][0]).setScale(KIND_SCALE[next.kind] * 0.9).setRotation(Math.PI);
      spr.baseX = x;
      (next.flying ? this.airLayer : this.groundLayer).add(spr);
      this.massing.push(spr);
    }
  }

  // ------------------------------------------------------------------ HUD

  buildHud() {
    const L = TD.LAYOUT, C = TD.COLOURS;
    this.add.rectangle(0, 0, L.W, L.HUD_H, 0x10140f).setOrigin(0).setDepth(9);
    this.add.rectangle(0, 0, 8, L.HUD_H, this.faction.colour).setOrigin(0).setDepth(9);
    this.hudFaction = this.add.text(22, 10, this.faction.name, { fontFamily: TD.FONT, fontSize: '18px', fontStyle: '700', color: this.faction.colourHex }).setDepth(9);
    this.hudWave = this.add.text(22, 36, '', { fontFamily: TD.FONT, fontSize: '16px', color: C.text }).setDepth(9);
    this.hudGold = this.add.text(L.W - 20, 10, '', { fontFamily: TD.FONT, fontSize: '22px', fontStyle: '700', color: C.gold }).setOrigin(1, 0).setDepth(9);
    this.hudLives = this.add.text(L.W - 20, 40, '', { fontFamily: TD.FONT, fontSize: '16px', color: C.text }).setOrigin(1, 0).setDepth(9);
    this.hudWaveName = this.add.text(L.W / 2, 10, '', { fontFamily: TD.FONT, fontSize: '15px', color: C.muted }).setOrigin(0.5, 0).setDepth(9);
    this.hudCore = this.add.text(L.W / 2, 38, '', { fontFamily: TD.FONT, fontSize: '13px', color: '#ffd166' }).setOrigin(0.5, 0).setDepth(9);
    this.banner = this.add.text(L.W / 2, L.GRID_Y + 140, '', { fontFamily: TD.FONT, fontSize: '22px', fontStyle: '700', color: C.text, backgroundColor: '#10140fd9', padding: { x: 14, y: 8 }, align: 'center' }).setOrigin(0.5).setAlpha(0).setDepth(20);
    // Boss bar
    this.bossBarBg = this.add.rectangle(L.W / 2, L.GRID_Y + 12, 400, 14, 0x000000, 0.7).setDepth(9).setVisible(false);
    this.bossBar = this.add.rectangle(L.W / 2 - 199, L.GRID_Y + 12, 398, 10, 0xe5533d).setOrigin(0, 0.5).setDepth(9).setVisible(false);
    this.bossName = this.add.text(L.W / 2, L.GRID_Y + 30, '', { fontFamily: TD.FONT, fontSize: '14px', fontStyle: '700', color: '#ffd7d0', backgroundColor: '#00000088', padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(9).setVisible(false);
    this.updateHud();
  }

  updateHud() {
    this.hudGold.setText(this.gold + ' gold');
    this.hudLives.setText(this.lives + (this.lives === 1 ? ' life' : ' lives'));
    const shown = this.phase === 'wave' ? this.wave : this.wave + 1;
    this.hudWave.setText('Wave ' + shown + (this.phase === 'build' ? ' in ' + Math.ceil(this.countdown) + 's' : ''));
    const next = TD.getWave(shown);
    this.hudWaveName.setText((this.phase === 'build' ? 'Next: ' : '') + next.name + (next.flying ? ' (air)' : '') + (next.boss ? ' (boss)' : ''));
    this.hudCore.setText(this.cores > 0 ? 'Core ready: unlocks tier 7' : '');
    this.updateBar();
  }

  announce(msg, colour) {
    this.banner.setText(msg).setColor(colour || TD.COLOURS.text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1800, duration: 500 });
  }

  // ---------------------------------------------------------------- bar

  makeButton(x, y, w, h, label, onTap, depth) {
    const rect = this.add.rectangle(x, y, w, h, 0x232b21).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive({ useHandCursor: true }).setDepth(depth || 9);
    const txt = this.add.text(x + w / 2, y + h / 2, label, { fontFamily: TD.FONT, fontSize: '15px', fontStyle: '700', color: TD.COLOURS.text, align: 'center' }).setOrigin(0.5).setDepth(depth || 9);
    rect.on('pointerdown', (p, lx, ly, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); TD.SFX.unlock(); onTap(); });
    return { rect, txt, setLabel: (s) => txt.setText(s) };
  }

  buildBar() {
    const L = TD.LAYOUT;
    this.add.rectangle(0, L.BAR_Y, L.W, L.BAR_H, 0x10140f).setOrigin(0).setDepth(9);
    const y = L.BAR_Y + 10, h = L.BAR_H - 20;
    this.btnTower = this.makeButton(10, y, 120, h, '', () => this.setBuildMode('tower'));
    this.btnWall = this.makeButton(140, y, 100, h, '', () => this.setBuildMode('wall'));
    this.btnStart = this.makeButton(250, y, 200, h, '', () => this.startWaveNow());
    this.btnSpeed = this.makeButton(460, y, 70, h, '1x', () => this.toggleSpeed());
    this.setBuildMode('tower');
    this.updateBar();
  }

  updateBar() {
    if (!this.btnTower) return;
    const tierCost = this.faction.tiers[0].cost;
    this.btnTower.setLabel('Tower\n' + tierCost + ' gold');
    this.btnWall.setLabel('Wall\n' + this.faction.wallCost + ' gold');
    this.btnTower.txt.setColor(this.gold >= tierCost ? TD.COLOURS.text : TD.COLOURS.muted);
    this.btnWall.txt.setColor(this.gold >= this.faction.wallCost ? TD.COLOURS.text : TD.COLOURS.muted);
    if (this.phase === 'build') {
      this.btnStart.setLabel('Send wave ' + (this.wave + 1) + ' now');
      this.btnStart.rect.setFillStyle(0x2f4a2c);
    } else {
      this.btnStart.setLabel('Wave ' + this.wave + '\n' + (this.enemies.length + this.spawnQueue) + ' remaining');
      this.btnStart.rect.setFillStyle(0x232b21);
    }
    this.btnSpeed.setLabel(this.speedMult + 'x');
  }

  setBuildMode(mode) {
    this.buildMode = mode;
    if (!this.btnTower) return;
    this.btnTower.rect.setStrokeStyle(2, mode === 'tower' ? this.faction.colour : 0x3a4536);
    this.btnWall.rect.setStrokeStyle(2, mode === 'wall' ? this.faction.colour : 0x3a4536);
    this.closePanel();
  }

  toggleSpeed() { this.speedMult = this.speedMult === 1 ? 2 : 1; this.updateBar(); }
  startWaveNow() { if (this.phase === 'build' && !this.gameOver) this.countdown = 0; }

  // -------------------------------------------------------------- panel

  buildPanel() {
    const L = TD.LAYOUT;
    const y = L.BAR_Y - 130;
    this.panel = this.add.container(0, y).setDepth(15).setVisible(false);
    const bg = this.add.rectangle(0, 0, L.W, 130, 0x10140f, 0.97).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive();
    this.panelTitle = this.add.text(16, 10, '', { fontFamily: TD.FONT, fontSize: '19px', fontStyle: '700', color: this.faction.colourHex });
    this.panelStats = this.add.text(16, 40, '', { fontFamily: TD.FONT, fontSize: '14px', color: TD.COLOURS.text, lineSpacing: 3 });
    this.panelUpgrade = this.makeButton(300, 12, 220, 48, '', () => this.upgradeSelected(), 0);
    this.panelSell = this.makeButton(300, 70, 105, 44, '', () => this.sellSelected(), 0);
    this.panelClose = this.makeButton(415, 70, 105, 44, 'Close', () => this.closePanel(), 0);
    this.panel.add([bg, this.panelTitle, this.panelStats,
      this.panelUpgrade.rect, this.panelUpgrade.txt, this.panelSell.rect, this.panelSell.txt, this.panelClose.rect, this.panelClose.txt]);
  }

  openPanel(t) { this.selected = t; this.panel.setVisible(true); this.refreshPanel(); this.redrawRange(); }
  closePanel() { this.selected = null; if (this.panel) this.panel.setVisible(false); if (this.rangeGfx) this.redrawRange(); }

  refreshPanel() {
    const t = this.selected;
    if (!t) return;
    if (t.type === 'wall') {
      this.panelTitle.setText('Sandbag wall');
      this.panelStats.setText('Blocks the path. No attack.\nSell for ' + this.sellValue(t) + ' gold.');
      this.panelUpgrade.rect.setVisible(false); this.panelUpgrade.txt.setVisible(false);
    } else {
      const s = this.towerStats(t);
      const tierDef = this.faction.tiers[t.tier - 1];
      this.panelTitle.setText(tierDef.name + '  (tier ' + t.tier + (t.overclock ? ', overclock ' + t.overclock : '') + ')');
      const lines = [
        'Damage ' + Math.round(s.damage) + '   Range ' + s.range.toFixed(1) + '   Fire ' + (1 / s.cooldown).toFixed(1) + '/s',
        (s.splash ? 'Splash ' + s.splash.toFixed(1) + '   ' : '') + (s.slow ? 'Slows ' + Math.round(s.slow * 100) + '%   ' : '') + (s.air ? 'Hits air' : 'Ground only'),
        t.building > 0 ? 'Under construction' : 'Worth ' + t.value + ' gold',
      ];
      this.panelStats.setText(lines.join('\n'));
      this.panelUpgrade.rect.setVisible(true); this.panelUpgrade.txt.setVisible(true);
      const up = this.upgradeInfo(t);
      this.panelUpgrade.setLabel(up.label);
      this.panelUpgrade.txt.setColor(up.affordable && !t.building ? TD.COLOURS.text : TD.COLOURS.muted);
    }
    this.panelSell.setLabel('Sell +' + this.sellValue(t));
  }

  // ------------------------------------------------------------- towers

  towerStats(t) {
    const def = this.faction.tiers[t.tier - 1];
    return { damage: def.damage * (1 + TD.OVERCLOCK_DAMAGE * (t.overclock || 0)), range: def.range, cooldown: def.cooldown, splash: def.splash, slow: def.slow, air: def.air };
  }

  upgradeInfo(t) {
    const tiers = this.faction.tiers;
    if (t.tier < tiers.length) {
      const next = tiers[t.tier];
      const cost = next.cost - tiers[t.tier - 1].cost;
      const needsCore = !!next.core;
      const affordable = this.gold >= cost && (!needsCore || this.cores > 0);
      return { kind: 'tier', cost, needsCore, affordable, label: 'Upgrade: ' + next.name + '\n' + cost + ' gold' + (needsCore ? ' + 1 Core' : '') };
    }
    const lvl = (t.overclock || 0) + 1;
    const cost = Math.round(TD.OVERCLOCK_BASE * Math.pow(TD.OVERCLOCK_GROWTH, lvl - 1));
    return { kind: 'overclock', cost, affordable: this.gold >= cost, label: 'Overclock ' + lvl + ' (+10% damage)\n' + cost + ' gold' };
  }

  upgradeSelected() {
    const t = this.selected;
    if (!t || t.type !== 'tower') return;
    if (t.building > 0) { this.announce('Still under construction', TD.COLOURS.bad); TD.SFX.deny(); return; }
    const up = this.upgradeInfo(t);
    if (!up.affordable) { this.announce(up.needsCore && this.cores === 0 ? 'Needs a Core (awarded every 25 waves)' : 'Not enough gold', TD.COLOURS.bad); TD.SFX.deny(); return; }
    this.gold -= up.cost;
    t.value += up.cost;
    if (up.kind === 'tier') { t.tier += 1; if (up.needsCore) this.cores -= 1; this.startConstruction(t, TD.ECON.upgradeTime); }
    else { t.overclock = (t.overclock || 0) + 1; this.startConstruction(t, TD.ECON.upgradeTime * 0.5); }
    this.refreshPanel();
    this.updateHud();
  }

  sellValue(t) { return Math.floor(t.value * TD.ECON.sellRefund); }

  sellSelected() {
    const t = this.selected;
    if (!t) return;
    this.gold += this.sellValue(t);
    this.grid.remove(t.c, t.r);
    t.sprites.forEach((s) => s.destroy());
    this.towers = this.towers.filter((o) => o !== t);
    this.closePanel();
    this.onMazeChanged();
    this.updateHud();
    TD.SFX.gold();
  }

  startConstruction(t, seconds) {
    t.building = seconds; t.buildTotal = seconds;
    t.site.setVisible(true);
    if (t.turret) t.turret.setVisible(false);
    if (t.wallImg) t.wallImg.setVisible(false);
    TD.SFX.build();
  }

  finishConstruction(t) {
    t.building = 0;
    t.site.setVisible(false);
    if (t.type === 'tower') { t.turret.setTexture('turret_' + this.factionId + '_' + t.tier).setVisible(true); }
    else t.wallImg.setVisible(true);
    TD.SFX.done();
    if (this.selected === t) this.refreshPanel();
  }

  redrawRange() {
    const g = this.rangeGfx;
    g.clear();
    const t = this.selected;
    if (!t || t.type !== 'tower') return;
    const s = this.towerStats(t);
    g.lineStyle(2, this.faction.colour, 0.7);
    g.fillStyle(this.faction.colour, 0.10);
    g.fillCircle(this.cellX(t.c), this.cellY(t.r), s.range * TD.LAYOUT.CELL);
    g.strokeCircle(this.cellX(t.c), this.cellY(t.r), s.range * TD.LAYOUT.CELL);
  }

  // ------------------------------------------------------------ building

  onPointerDown(pointer) {
    if (this.gameOver) return;
    const L = TD.LAYOUT;
    if (pointer.y < L.GRID_Y || pointer.y >= L.BAR_Y) return;
    if (this.panel.visible && pointer.y >= L.BAR_Y - 130) return;
    const c = Math.floor(pointer.x / L.CELL);
    const r = Math.floor((pointer.y - L.GRID_Y) / L.CELL);
    if (!this.grid.inBounds(c, r)) return;
    const existing = this.towers.find((t) => t.c === c && t.r === r);
    if (existing) { this.openPanel(existing); return; }
    this.closePanel();
    this.tryBuild(c, r);
  }

  tryBuild(c, r) {
    const isWall = this.buildMode === 'wall';
    const cost = isWall ? this.faction.wallCost : this.faction.tiers[0].cost;
    const fail = (m) => { this.announce(m, TD.COLOURS.bad); TD.SFX.deny(); };
    if (this.gold < cost) return fail('Not enough gold');
    if (!this.grid.isBuildable(c, r)) return fail('Cannot build on the entry or exit rows');
    if (this.enemyOnCell(c, r)) return fail('An enemy is standing there');
    if (!this.grid.canPlace(c, r)) return fail('That would seal the route');
    this.gold -= cost;
    this.grid.place(c, r, isWall ? 'wall' : 'tower');
    const x = this.cellX(c), y = this.cellY(r);
    const t = { c, r, type: isWall ? 'wall' : 'tower', tier: 1, overclock: 0, value: cost, cooldown: 0, building: 0, sprites: [] };
    t.site = this.add.image(x, y, 'construction0').setScale(0.5).setVisible(false);
    if (isWall) {
      t.wallImg = this.add.image(x, y, 'wall').setScale(0.5);
      t.sprites.push(t.wallImg, t.site);
      this.towerLayer.add([t.wallImg, t.site]);
    } else {
      t.base = this.add.image(x, y, 'base_' + this.factionId).setScale(0.5);
      t.turret = this.add.image(x, y, 'turret_' + this.factionId + '_1').setScale(0.5);
      t.flash = this.add.image(x, y, 'muzzle').setScale(0.6).setVisible(false);
      t.sprites.push(t.base, t.turret, t.site, t.flash);
      this.towerLayer.add([t.base, t.turret, t.site]);
      this.fxLayer.add(t.flash);
    }
    this.towers.push(t);
    this.startConstruction(t, isWall ? TD.ECON.wallTime : TD.ECON.buildTime);
    this.onMazeChanged();
    this.updateHud();
  }

  enemyOnCell(c, r) {
    return this.enemies.some((e) => {
      if (e.flying) return false;
      const cur = e.path[e.pathIdx], nxt = e.path[Math.min(e.pathIdx + 1, e.path.length - 1)];
      return (cur.c === c && cur.r === r) || (nxt.c === c && nxt.r === r);
    });
  }

  onMazeChanged() {
    this.redrawPath();
    for (const e of this.enemies) {
      if (e.flying) continue;
      const cur = e.path[e.pathIdx];
      const from = e.path[Math.min(e.pathIdx + 1, e.path.length - 1)];
      const p = this.grid.pathFrom(from.c, from.r);
      if (!p) continue;
      if (p.length > 1 && p[1].c === cur.c && p[1].r === cur.r) e.path = p.slice(1);
      else e.path = [cur].concat(p);
      e.pathIdx = 0;
    }
  }

  // --------------------------------------------------------------- waves

  beginWave() {
    this.wave += 1;
    this.phase = 'wave';
    this.currentWave = TD.getWave(this.wave);
    this.spawnQueue = this.currentWave.count;
    this.spawnTimer = 0;
    this.livesLostThisWave = 0;
    this.showMassing();
    const w = this.currentWave;
    this.announce((w.boss ? 'Boss: ' : 'Wave ' + this.wave + ': ') + w.name + (w.flying ? ' (air)' : ''), w.boss ? '#ffb4a8' : undefined);
    TD.SFX.horn();
    if (w.boss) { this.bossBarBg.setVisible(true); this.bossBar.setVisible(true).width = 398; this.bossName.setText(w.name).setVisible(true); }
    this.updateHud();
  }

  spawnEnemy() {
    const w = this.currentWave, s = this.grid.spawn;
    const kind = w.kind;
    const e = {
      def: w, kind, hp: w.hp, maxHp: w.hp, armour: w.armour, speed: w.speed, flying: w.flying, boss: !!w.boss,
      x: this.cellX(s.c) + (Math.random() - 0.5) * 14, y: this.cellY(s.r) - 20, slowUntil: 0, slowAmt: 0, dead: false,
      path: w.flying ? null : this.grid.path.slice(), pathIdx: 0, angle: Math.PI / 2, frame: 0, radius: KIND_RADIUS[kind],
    };
    e.sprite = this.add.image(e.x, e.y, KIND_TEX[kind][0]).setScale(KIND_SCALE[kind]);
    if (e.flying) {
      e.shadow = this.add.image(e.x + 10, e.y + 14, KIND_TEX[kind][0]).setScale(KIND_SCALE[kind]).setTint(0x000000).setAlpha(0.35);
      this.airLayer.add([e.shadow, e.sprite]);
    } else this.groundLayer.add(e.sprite);
    this.enemies.push(e);
  }

  endWave() {
    const bonus = TD.ECON.waveBonusBase + TD.ECON.waveBonusStep * (this.wave - 1) + (this.livesLostThisWave === 0 ? TD.ECON.perfectBonus : 0);
    this.gold += bonus;
    this.bossBarBg.setVisible(false); this.bossBar.setVisible(false); this.bossName.setVisible(false);
    if (this.wave % TD.ECON.coreWave === 0) { this.cores += 1; this.announce('Core acquired. Tier 7 unlocked.', '#ffd166'); }
    else this.announce('Wave ' + this.wave + ' cleared. +' + bonus + ' gold' + (this.livesLostThisWave === 0 ? ' (perfect)' : ''), TD.COLOURS.good);
    TD.save.setBest(this.factionId, this.wave);
    this.phase = 'build';
    this.countdown = TD.ECON.waveGap;
    this.showMassing();
    this.updateHud();
  }

  // ------------------------------------------------------------ main loop

  update(time, delta) {
    if (this.gameOver) return;
    const dt = Math.min(delta, 50) / 1000;
    for (let i = 0; i < this.speedMult; i++) this.step(dt);
    this.render();
  }

  step(dt) {
    this.animClock += dt;
    if (this.phase === 'build') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.beginWave();
      else if (Math.floor(this.countdown + dt) !== Math.floor(this.countdown)) this.updateHud();
    }
    if (this.phase === 'wave' && this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.spawnEnemy(); this.spawnQueue -= 1; this.spawnTimer = 0.75; this.updateBar(); }
    }
    // construction
    for (const t of this.towers) {
      if (t.building > 0) {
        t.building -= dt;
        t.site.setTexture('construction' + (Math.floor(this.animClock * 6) % 4));
        if (t.building <= 0) this.finishConstruction(t);
      }
    }
    this.moveEnemies(dt);
    this.fireTowers(dt);
    this.moveBullets(dt);
    this.updateEffects(dt);
    const before = this.enemies.length;
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (before !== this.enemies.length) this.updateBar();
    if (this.phase === 'wave' && this.spawnQueue === 0 && this.enemies.length === 0) this.endWave();
    if (this.lives <= 0) this.endGame();
  }

  moveEnemies(dt) {
    const L = TD.LAYOUT;
    const ex = this.cellX(this.grid.exit.c) + L.CELL / 2, ey = this.cellY(this.grid.exit.r);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const slow = this.time.now < e.slowUntil ? 1 - e.slowAmt : 1;
      let move = e.speed * L.CELL * slow * dt;
      if (e.flying) {
        const dx = ex - e.x, dy = ey - e.y, d = Math.hypot(dx, dy);
        e.angle = Math.atan2(dy, dx);
        if (d <= move) { this.leak(e); continue; }
        e.x += (dx / d) * move; e.y += (dy / d) * move;
        continue;
      }
      while (move > 0 && !e.dead) {
        if (e.pathIdx >= e.path.length - 1) { this.leak(e); break; }
        const nxt = e.path[e.pathIdx + 1];
        const tx = this.cellX(nxt.c), ty = this.cellY(nxt.r);
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        e.angle = Math.atan2(dy, dx);
        if (d <= move) { e.x = tx; e.y = ty; e.pathIdx += 1; move -= d; }
        else { e.x += (dx / d) * move; e.y += (dy / d) * move; move = 0; }
      }
    }
  }

  leak(e) {
    e.dead = true;
    this.destroyEnemySprites(e);
    this.lives -= 1;
    this.livesLostThisWave += 1;
    this.cameras.main.shake(140, 0.005);
    TD.SFX.leak();
    this.updateHud();
  }

  destroyEnemySprites(e) { e.sprite.destroy(); if (e.shadow) e.shadow.destroy(); }

  urgency(e) {
    if (e.flying) return -Math.hypot(this.cellX(this.grid.exit.c) - e.x, this.cellY(this.grid.exit.r) - e.y);
    return -(e.path.length - e.pathIdx) * TD.LAYOUT.CELL;
  }

  fireTowers(dt) {
    const L = TD.LAYOUT;
    for (const t of this.towers) {
      if (t.type !== 'tower' || t.building > 0) continue;
      t.cooldown -= dt;
      const s = this.towerStats(t);
      const tx = this.cellX(t.c), ty = this.cellY(t.r), rangePx = s.range * L.CELL + L.CELL * 0.4;
      let best = null, bestU = -Infinity;
      for (const e of this.enemies) {
        if (e.dead || (e.flying && !s.air)) continue;
        if (Math.hypot(e.x - tx, e.y - ty) > rangePx) continue;
        const u = this.urgency(e);
        if (u > bestU) { bestU = u; best = e; }
      }
      if (!best) continue;
      const ang = Math.atan2(best.y - ty, best.x - tx);
      t.turret.setRotation(ang + Math.PI / 2);
      if (t.cooldown > 0) continue;
      t.cooldown = s.cooldown;
      const tex = t.tier >= 7 ? 'bolt' : (t.tier === 3 || t.tier === 5 || t.tier === 6) ? 'shell' : 'bullet';
      const bx = tx + Math.cos(ang) * 16, by = ty + Math.sin(ang) * 16;
      const img = this.add.image(bx, by, tex).setRotation(ang + Math.PI / 2);
      this.bulletLayer.add(img);
      this.bullets.push({ x: bx, y: by, target: best, damage: s.damage, splash: s.splash, slow: s.slow, speed: 13 * L.CELL, img });
      t.flash.setPosition(bx, by).setRotation(ang).setVisible(true).setAlpha(1);
      t.flashUntil = this.animClock + 0.06;
      TD.SFX.shoot(t.tier);
    }
  }

  moveBullets(dt) {
    const L = TD.LAYOUT;
    for (const b of this.bullets) {
      const tgt = b.target;
      if (tgt.dead) { b.done = true; b.img.destroy(); continue; }
      const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy);
      const move = b.speed * dt;
      if (d <= move || d < tgt.radius) {
        b.done = true; b.img.destroy();
        this.hit(tgt, b);
        if (b.splash > 0) {
          const rad = b.splash * L.CELL;
          for (const e of this.enemies) {
            if (e === tgt || e.dead || e.flying !== tgt.flying) continue;
            if (Math.hypot(e.x - tgt.x, e.y - tgt.y) <= rad) this.hit(e, b, 0.6);
          }
          this.boom(tgt.x, tgt.y, 0.35 + b.splash * 0.3, false);
        } else this.spark(tgt.x, tgt.y);
      } else {
        b.x += (dx / d) * move; b.y += (dy / d) * move;
        b.img.setPosition(b.x, b.y).setRotation(Math.atan2(dy, dx) + Math.PI / 2);
      }
    }
    this.bullets = this.bullets.filter((b) => !b.done);
  }

  hit(e, b, scale) {
    const dmg = b.damage * (scale || 1) * TD.armourFactor(e.armour);
    e.hp -= dmg;
    if (b.slow > 0) { e.slowAmt = Math.max(e.slowAmt, b.slow); e.slowUntil = this.time.now + 2000; }
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      this.gold += e.def.gold;
      this.destroyEnemySprites(e);
      this.boom(e.x, e.y, e.boss ? 1.2 : 0.55, !e.flying);
      this.floatText(e.x, e.y - 10, '+' + e.def.gold);
      TD.SFX.explode();
      this.updateHud();
    }
  }

  // ------------------------------------------------------------ effects

  boom(x, y, scale, leaveWreck) {
    const img = this.add.image(x, y, 'boom0').setScale(scale);
    this.fxLayer.add(img);
    this.effects.push({ kind: 'boom', img, life: 0.36, total: 0.36 });
    if (leaveWreck) {
      const w = this.add.image(x, y, 'wreck').setScale(0.4 * scale + 0.2).setRotation(Math.random() * 6.28);
      this.decoLayer.add(w);
      this.effects.push({ kind: 'wreck', img: w, life: 6, total: 6 });
    }
  }

  spark(x, y) {
    const img = this.add.image(x, y, 'boom0').setScale(0.22);
    this.fxLayer.add(img);
    this.effects.push({ kind: 'boom', img, life: 0.14, total: 0.14 });
  }

  floatText(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: TD.FONT, fontSize: '13px', fontStyle: '700', color: TD.COLOURS.gold, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(8);
    this.effects.push({ kind: 'text', img: t, life: 0.8, total: 0.8 });
  }

  updateEffects(dt) {
    for (const f of this.effects) {
      f.life -= dt;
      const p = 1 - f.life / f.total;
      if (f.kind === 'boom') f.img.setTexture('boom' + Math.min(3, Math.floor(p * 4)));
      else if (f.kind === 'text') { f.img.y -= 30 * dt; f.img.setAlpha(Math.min(1, f.life * 2)); }
      else if (f.kind === 'wreck') f.img.setAlpha(Math.min(0.9, f.life));
      if (f.life <= 0) f.img.destroy();
    }
    this.effects = this.effects.filter((f) => f.life > 0);
    for (const t of this.towers) if (t.flash && t.flash.visible && this.animClock > t.flashUntil) t.flash.setVisible(false);
  }

  render() {
    const g = this.barGfx;
    g.clear();
    const frame = Math.floor(this.animClock * 8) % 2;
    for (const e of this.enemies) {
      const texs = KIND_TEX[e.kind];
      if (texs.length > 1) e.sprite.setTexture(texs[e.flying ? Math.floor(this.animClock * 20) % 2 : frame]);
      e.sprite.setPosition(e.x, e.y).setRotation(e.angle + Math.PI / 2);
      if (e.shadow) e.shadow.setPosition(e.x + 10, e.y + 16).setRotation(e.angle + Math.PI / 2).setTexture(e.sprite.texture.key);
      const w = e.boss ? 44 : 22, hpf = Math.max(0, e.hp / e.maxHp), by = e.y - e.radius - 8;
      g.fillStyle(0x000000, 0.6); g.fillRect(e.x - w / 2, by, w, 4);
      g.fillStyle(hpf > 0.5 ? 0x7fd08a : hpf > 0.25 ? 0xf0c85a : 0xe5533d, 1); g.fillRect(e.x - w / 2, by, w * hpf, 4);
      if (this.time.now < e.slowUntil) { g.lineStyle(2, 0x7fd8ff, 0.9); g.strokeCircle(e.x, e.y, e.radius + 3); }
      if (e.boss && this.bossBar.visible) this.bossBar.width = 398 * hpf;
    }
    // construction progress bars
    for (const t of this.towers) {
      if (t.building > 0) {
        const x = this.cellX(t.c), y = this.cellY(t.r) + 16, p = 1 - t.building / t.buildTotal;
        g.fillStyle(0x000000, 0.7); g.fillRect(x - 16, y, 32, 5);
        g.fillStyle(0xe2b93b, 1); g.fillRect(x - 16, y, 32 * p, 5);
      }
    }
    // massing enemies idle at the entrance
    for (let i = 0; i < this.massing.length; i++) {
      const m = this.massing[i];
      m.x = m.baseX + Math.sin(this.animClock * 2 + i) * 3;
      const texs = KIND_TEX[TD.getWave(this.wave + 1).kind];
      if (texs.length > 1) m.setTexture(texs[Math.floor(this.animClock * 6 + i) % 2]);
    }
  }

  // ---------------------------------------------------------- game over

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.closePanel();
    const L = TD.LAYOUT;
    const best = TD.save.getBest(this.factionId);
    const reached = this.wave;
    this.add.rectangle(0, 0, L.W, L.H, 0x000000, 0.75).setOrigin(0).setDepth(30).setInteractive();
    this.add.text(L.W / 2, 340, 'The line is broken', { fontFamily: TD.FONT, fontSize: '40px', fontStyle: '700', color: TD.COLOURS.bad }).setOrigin(0.5).setDepth(31);
    this.add.text(L.W / 2, 410, 'You held for ' + reached + (reached === 1 ? ' wave' : ' waves') + ' as ' + this.faction.name + '.', { fontFamily: TD.FONT, fontSize: '20px', color: TD.COLOURS.text }).setOrigin(0.5).setDepth(31);
    this.add.text(L.W / 2, 445, 'Best with this faction: wave ' + Math.max(best, reached - 1), { fontFamily: TD.FONT, fontSize: '16px', color: TD.COLOURS.muted }).setOrigin(0.5).setDepth(31);
    const again = this.add.rectangle(L.W / 2, 540, 280, 60, this.faction.colour).setDepth(31).setInteractive({ useHandCursor: true });
    this.add.text(L.W / 2, 540, 'Back to menu', { fontFamily: TD.FONT, fontSize: '24px', fontStyle: '700', color: '#ffffff' }).setOrigin(0.5).setDepth(32);
    again.on('pointerdown', () => this.scene.start('Menu'));
  }
};
