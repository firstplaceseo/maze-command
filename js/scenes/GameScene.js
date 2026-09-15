// Game scene for Maze Command.
//
// Flow: build phase (countdown) -> wave spawns -> all enemies gone -> bonus ->
// next build phase. Repeats forever. Lives at 0 ends the run.

window.TD = window.TD || {};

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
    this.grid = new TD.Grid(L.COLS, L.ROWS);

    // Run state
    this.gold = TD.ECON.startGold;
    this.lives = this.difficulty.lives;
    this.cores = 0;
    this.wave = 0;                 // wave number currently running or last finished
    this.phase = 'build';          // 'build' or 'wave'
    this.countdown = TD.ECON.firstWaveDelay;
    this.speedMult = 1;
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.currentWave = null;
    this.livesLostThisWave = 0;
    this.buildMode = 'tower';      // 'tower' or 'wall'
    this.selected = null;
    this.gameOver = false;

    this.drawBoard();
    this.towerGfx = this.add.graphics();
    this.rangeGfx = this.add.graphics();
    this.enemyGfx = this.add.graphics();
    this.bulletGfx = this.add.graphics();
    this.fxGfx = this.add.graphics();
    this.floaters = [];

    this.buildHud();
    this.buildBar();
    this.buildPanel();
    this.redrawTowers();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.announce('Wave 1 incoming. Build your maze.');
  }

  // ---------------------------------------------------------------- drawing

  cellX(c) { return c * TD.LAYOUT.CELL + TD.LAYOUT.CELL / 2; }
  cellY(r) { return TD.LAYOUT.GRID_Y + r * TD.LAYOUT.CELL + TD.LAYOUT.CELL / 2; }

  drawBoard() {
    const L = TD.LAYOUT, C = TD.COLOURS;
    const g = this.add.graphics();
    g.fillStyle(C.board, 1);
    g.fillRect(0, L.GRID_Y, L.W, L.GRID_H);
    // Spawn and exit rows
    g.fillStyle(C.spawn, 1);
    g.fillRect(0, L.GRID_Y, L.W, L.CELL);
    g.fillStyle(C.exit, 1);
    g.fillRect(0, L.GRID_Y + (L.ROWS - 1) * L.CELL, L.W, L.CELL);
    // Grid lines
    g.lineStyle(1, C.gridLine, 1);
    for (let c = 0; c <= L.COLS; c++) g.lineBetween(c * L.CELL, L.GRID_Y, c * L.CELL, L.GRID_Y + L.GRID_H);
    for (let r = 0; r <= L.ROWS; r++) g.lineBetween(0, L.GRID_Y + r * L.CELL, L.W, L.GRID_Y + r * L.CELL);
    // Spawn and exit markers
    const sx = this.cellX(this.grid.spawn.c), sy = this.cellY(this.grid.spawn.r);
    const ex = this.cellX(this.grid.exit.c), ey = this.cellY(this.grid.exit.r);
    g.fillStyle(0xd48a3c, 1);
    g.fillTriangle(sx - 12, sy - 12, sx + 12, sy - 12, sx, sy + 12);
    g.fillStyle(0x4fd3a2, 1);
    g.fillRect(ex - 12, ey - 12, 24, 24);
    this.add.text(20, sy, 'Enemies enter', { fontFamily: TD.FONT, fontSize: '13px', color: '#d4b48a' }).setOrigin(0, 0.5);
    this.add.text(20, ey, 'Exit to defend', { fontFamily: TD.FONT, fontSize: '13px', color: '#8ad4b8' }).setOrigin(0, 0.5);
    this.pathGfx = this.add.graphics();
    this.redrawPath();
  }

  redrawPath() {
    const g = this.pathGfx;
    g.clear();
    const p = this.grid.path;
    if (!p) return;
    g.lineStyle(3, 0xd48a3c, 0.25);
    g.beginPath();
    g.moveTo(this.cellX(p[0].c), this.cellY(p[0].r));
    for (let i = 1; i < p.length; i++) g.lineTo(this.cellX(p[i].c), this.cellY(p[i].r));
    g.strokePath();
  }

  redrawTowers() {
    const g = this.towerGfx, L = TD.LAYOUT;
    g.clear();
    for (const t of this.towers) {
      const x = t.c * L.CELL, y = L.GRID_Y + t.r * L.CELL;
      if (t.type === 'wall') {
        g.fillStyle(TD.COLOURS.wall, 1);
        g.fillRect(x + 3, y + 3, L.CELL - 6, L.CELL - 6);
        g.fillStyle(0x4d514a, 1);
        g.fillRect(x + 3, y + L.CELL / 2 - 1, L.CELL - 6, 2);
        g.fillRect(x + L.CELL / 2 - 1, y + 3, 2, L.CELL / 2 - 4);
        g.fillRect(x + L.CELL / 4 - 1, y + L.CELL / 2 + 1, 2, L.CELL / 2 - 4);
        g.fillRect(x + (3 * L.CELL) / 4 - 1, y + L.CELL / 2 + 1, 2, L.CELL / 2 - 4);
        continue;
      }
      // Tower body
      g.fillStyle(0x2c3430, 1);
      g.fillRect(x + 2, y + 2, L.CELL - 4, L.CELL - 4);
      g.fillStyle(this.faction.colour, 1);
      g.fillRect(x + 6, y + 6, L.CELL - 12, L.CELL - 12);
      g.fillStyle(this.faction.accent, 1);
      g.fillCircle(x + L.CELL / 2, y + L.CELL / 2, 6 + t.tier);
      g.fillStyle(this.faction.colour, 1);
      g.fillCircle(x + L.CELL / 2, y + L.CELL / 2, 3 + t.tier * 0.5);
      // Tier pips along the bottom
      g.fillStyle(0xffffff, 0.85);
      for (let i = 0; i < t.tier; i++) g.fillRect(x + 6 + i * 5, y + L.CELL - 7, 3, 3);
      if (t.overclock > 0) {
        g.fillStyle(0xffd166, 1);
        g.fillRect(x + L.CELL - 12, y + 5, 7, 7);
      }
    }
    this.redrawRange();
  }

  redrawRange() {
    const g = this.rangeGfx;
    g.clear();
    const t = this.selected;
    if (!t || t.type !== 'tower') return;
    const s = this.towerStats(t);
    g.lineStyle(2, this.faction.colour, 0.6);
    g.fillStyle(this.faction.colour, 0.08);
    g.fillCircle(this.cellX(t.c), this.cellY(t.r), s.range * TD.LAYOUT.CELL);
    g.strokeCircle(this.cellX(t.c), this.cellY(t.r), s.range * TD.LAYOUT.CELL);
  }

  // -------------------------------------------------------------------- HUD

  buildHud() {
    const L = TD.LAYOUT, C = TD.COLOURS;
    this.add.rectangle(0, 0, L.W, L.HUD_H, 0x10140f).setOrigin(0);
    this.add.rectangle(0, 0, 8, L.HUD_H, this.faction.colour).setOrigin(0);
    this.hudFaction = this.add.text(22, 12, this.faction.name, { fontFamily: TD.FONT, fontSize: '18px', fontStyle: '700', color: this.faction.colourHex });
    this.hudWave = this.add.text(22, 38, '', { fontFamily: TD.FONT, fontSize: '16px', color: C.text });
    this.hudGold = this.add.text(L.W - 20, 12, '', { fontFamily: TD.FONT, fontSize: '22px', fontStyle: '700', color: C.gold }).setOrigin(1, 0);
    this.hudLives = this.add.text(L.W - 20, 40, '', { fontFamily: TD.FONT, fontSize: '16px', color: C.text }).setOrigin(1, 0);
    this.hudCore = this.add.text(L.W / 2, 40, '', { fontFamily: TD.FONT, fontSize: '14px', color: '#ffd166' }).setOrigin(0.5, 0);
    this.hudWaveName = this.add.text(L.W / 2, 12, '', { fontFamily: TD.FONT, fontSize: '16px', color: C.muted }).setOrigin(0.5, 0);
    this.banner = this.add.text(L.W / 2, L.GRID_Y + 120, '', { fontFamily: TD.FONT, fontSize: '24px', fontStyle: '700', color: C.text, backgroundColor: '#10140fcc', padding: { x: 14, y: 8 } }).setOrigin(0.5).setAlpha(0).setDepth(20);
    this.updateHud();
  }

  updateHud() {
    this.hudGold.setText(this.gold + ' gold');
    this.hudLives.setText(this.lives + (this.lives === 1 ? ' life' : ' lives'));
    const shown = this.phase === 'wave' ? this.wave : this.wave + 1;
    this.hudWave.setText('Wave ' + shown + (this.phase === 'build' ? ' in ' + Math.ceil(this.countdown) + 's' : ''));
    const next = TD.getWave(shown);
    this.hudWaveName.setText(next.name + (next.flying ? ' (air)' : '') + (next.boss ? ' (boss)' : ''));
    this.hudCore.setText(this.cores > 0 ? 'Core ready: unlocks tier 7' : '');
    this.updateBar();
  }

  announce(msg, colour) {
    this.banner.setText(msg).setColor(colour || TD.COLOURS.text).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1800, duration: 500 });
  }

  // ----------------------------------------------------------- bottom bar

  makeButton(x, y, w, h, label, onTap) {
    const rect = this.add.rectangle(x, y, w, h, 0x232b21).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x + w / 2, y + h / 2, label, { fontFamily: TD.FONT, fontSize: '15px', fontStyle: '700', color: TD.COLOURS.text, align: 'center' }).setOrigin(0.5);
    rect.on('pointerdown', (p, lx, ly, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); onTap(); });
    return { rect, txt, setLabel: (s) => txt.setText(s) };
  }

  buildBar() {
    const L = TD.LAYOUT;
    this.add.rectangle(0, L.BAR_Y, L.W, L.BAR_H, 0x10140f).setOrigin(0);
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
      this.btnStart.setLabel('Wave ' + this.wave + ' running\n' + this.enemies.length + ' left');
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

  toggleSpeed() {
    this.speedMult = this.speedMult === 1 ? 2 : 1;
    this.updateBar();
  }

  startWaveNow() {
    if (this.phase !== 'build' || this.gameOver) return;
    this.countdown = 0;
  }

  // ------------------------------------------------------- selection panel

  buildPanel() {
    const L = TD.LAYOUT;
    const y = L.BAR_Y - 130;
    this.panel = this.add.container(0, y).setDepth(15).setVisible(false);
    const bg = this.add.rectangle(0, 0, L.W, 130, 0x10140f, 0.97).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive();
    this.panelTitle = this.add.text(16, 10, '', { fontFamily: TD.FONT, fontSize: '20px', fontStyle: '700', color: this.faction.colourHex });
    this.panelStats = this.add.text(16, 40, '', { fontFamily: TD.FONT, fontSize: '14px', color: TD.COLOURS.text, lineSpacing: 3 });
    this.panelUpgrade = this.makeButton(300, 12, 220, 48, '', () => this.upgradeSelected());
    this.panelSell = this.makeButton(300, 70, 105, 44, '', () => this.sellSelected());
    this.panelClose = this.makeButton(415, 70, 105, 44, 'Close', () => this.closePanel());
    this.panel.add([bg, this.panelTitle, this.panelStats,
      this.panelUpgrade.rect, this.panelUpgrade.txt,
      this.panelSell.rect, this.panelSell.txt,
      this.panelClose.rect, this.panelClose.txt]);
  }

  openPanel(t) {
    this.selected = t;
    this.panel.setVisible(true);
    this.refreshPanel();
    this.redrawRange();
  }

  closePanel() {
    this.selected = null;
    if (this.panel) this.panel.setVisible(false);
    if (this.rangeGfx) this.redrawRange();
  }

  refreshPanel() {
    const t = this.selected;
    if (!t) return;
    if (t.type === 'wall') {
      this.panelTitle.setText('Wall');
      this.panelStats.setText('Blocks the path. No attack.\nSell for ' + this.sellValue(t) + ' gold.');
      this.panelUpgrade.rect.setVisible(false); this.panelUpgrade.txt.setVisible(false);
    } else {
      const s = this.towerStats(t);
      const tierDef = this.faction.tiers[t.tier - 1];
      this.panelTitle.setText(tierDef.name + '  (tier ' + t.tier + (t.overclock ? ', overclock ' + t.overclock : '') + ')');
      const lines = [
        'Damage ' + Math.round(s.damage) + '   Range ' + s.range.toFixed(1) + '   Fire ' + (1 / s.cooldown).toFixed(1) + '/s',
        (s.splash ? 'Splash ' + s.splash.toFixed(1) + '   ' : '') + (s.slow ? 'Slows ' + Math.round(s.slow * 100) + '%   ' : '') + (s.air ? 'Hits air' : 'Ground only'),
        'Worth ' + t.value + ' gold',
      ];
      this.panelStats.setText(lines.join('\n'));
      this.panelUpgrade.rect.setVisible(true); this.panelUpgrade.txt.setVisible(true);
      const up = this.upgradeInfo(t);
      this.panelUpgrade.setLabel(up.label);
      this.panelUpgrade.txt.setColor(up.affordable ? TD.COLOURS.text : TD.COLOURS.muted);
    }
    this.panelSell.setLabel('Sell +' + this.sellValue(t));
  }

  // --------------------------------------------------------------- towers

  towerStats(t) {
    const def = this.faction.tiers[t.tier - 1];
    const dmg = def.damage * (1 + TD.OVERCLOCK_DAMAGE * (t.overclock || 0));
    return { damage: dmg, range: def.range, cooldown: def.cooldown, splash: def.splash, slow: def.slow, air: def.air };
  }

  upgradeInfo(t) {
    const tiers = this.faction.tiers;
    if (t.tier < tiers.length) {
      const next = tiers[t.tier];
      const cost = next.cost - tiers[t.tier - 1].cost;
      const needsCore = !!next.core;
      const affordable = this.gold >= cost && (!needsCore || this.cores > 0);
      return {
        kind: 'tier', cost, needsCore, affordable,
        label: 'Upgrade to ' + next.name + '\n' + cost + ' gold' + (needsCore ? ' + 1 Core' : ''),
      };
    }
    const lvl = (t.overclock || 0) + 1;
    const cost = Math.round(TD.OVERCLOCK_BASE * Math.pow(TD.OVERCLOCK_GROWTH, lvl - 1));
    return { kind: 'overclock', cost, affordable: this.gold >= cost, label: 'Overclock ' + lvl + ' (+10% damage)\n' + cost + ' gold' };
  }

  upgradeSelected() {
    const t = this.selected;
    if (!t || t.type !== 'tower') return;
    const up = this.upgradeInfo(t);
    if (!up.affordable) { this.announce(up.needsCore && this.cores === 0 ? 'Needs a Core (awarded after wave 25)' : 'Not enough gold', TD.COLOURS.bad); return; }
    this.gold -= up.cost;
    t.value += up.cost;
    if (up.kind === 'tier') { t.tier += 1; if (up.needsCore) this.cores -= 1; }
    else t.overclock = (t.overclock || 0) + 1;
    this.redrawTowers();
    this.refreshPanel();
    this.updateHud();
  }

  sellValue(t) { return Math.floor(t.value * TD.ECON.sellRefund); }

  sellSelected() {
    const t = this.selected;
    if (!t) return;
    this.gold += this.sellValue(t);
    this.grid.remove(t.c, t.r);
    this.towers = this.towers.filter((o) => o !== t);
    this.closePanel();
    this.onMazeChanged();
    this.redrawTowers();
    this.updateHud();
  }

  // ------------------------------------------------------------- building

  onPointerDown(pointer) {
    if (this.gameOver) return;
    const L = TD.LAYOUT;
    if (pointer.y < L.GRID_Y || pointer.y >= L.BAR_Y) return;
    if (this.panel.visible && pointer.y >= L.BAR_Y - 130) return; // tapped the panel
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
    if (this.gold < cost) { this.announce('Not enough gold', TD.COLOURS.bad); return; }
    if (!this.grid.isBuildable(c, r)) { this.announce('Cannot build on the entry or exit rows', TD.COLOURS.bad); return; }
    if (this.enemyOnCell(c, r)) { this.announce('An enemy is standing there', TD.COLOURS.bad); return; }
    if (!this.grid.canPlace(c, r)) { this.announce('That would seal the route', TD.COLOURS.bad); return; }
    this.gold -= cost;
    this.grid.place(c, r, isWall ? 'wall' : 'tower');
    this.towers.push({ c, r, type: isWall ? 'wall' : 'tower', tier: 1, overclock: 0, value: cost, cooldown: 0 });
    this.onMazeChanged();
    this.redrawTowers();
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
    // Ground enemies re-plan from the cell they are heading to
    for (const e of this.enemies) {
      if (e.flying) continue;
      const cur = e.path[e.pathIdx];
      const from = e.path[Math.min(e.pathIdx + 1, e.path.length - 1)];
      const p = this.grid.pathFrom(from.c, from.r);
      if (!p) continue;
      // Keep the cell the enemy is leaving at the front so it never cuts a corner
      if (p.length > 1 && p[1].c === cur.c && p[1].r === cur.r) e.path = p.slice(1);
      else e.path = [cur].concat(p);
      e.pathIdx = 0;
    }
  }

  // ---------------------------------------------------------------- waves

  beginWave() {
    this.wave += 1;
    this.phase = 'wave';
    this.currentWave = TD.getWave(this.wave);
    this.spawnQueue = this.currentWave.count;
    this.spawnTimer = 0;
    this.livesLostThisWave = 0;
    this.announce('Wave ' + this.wave + ': ' + this.currentWave.name + (this.currentWave.flying ? ' (air)' : ''));
    this.updateHud();
  }

  spawnEnemy() {
    const w = this.currentWave;
    const s = this.grid.spawn;
    const e = {
      def: w, hp: w.hp, maxHp: w.hp, armour: w.armour, speed: w.speed, flying: w.flying, boss: !!w.boss,
      x: this.cellX(s.c) + (Math.random() - 0.5) * 16, y: this.cellY(s.r), slowUntil: 0, slowAmt: 0, dead: false,
      path: w.flying ? null : this.grid.path.slice(), pathIdx: 0,
    };
    this.enemies.push(e);
  }

  endWave() {
    const bonus = TD.ECON.waveBonusBase + TD.ECON.waveBonusStep * (this.wave - 1) + (this.livesLostThisWave === 0 ? TD.ECON.perfectBonus : 0);
    this.gold += bonus;
    if (this.wave % TD.ECON.coreWave === 0) { this.cores += 1; this.announce('Core acquired. Tier 7 unlocked.', '#ffd166'); }
    else this.announce('Wave ' + this.wave + ' cleared. +' + bonus + ' gold', TD.COLOURS.good);
    TD.save.setBest(this.factionId, this.wave);
    this.phase = 'build';
    this.countdown = TD.ECON.waveGap;
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
    if (this.phase === 'build') {
      this.countdown -= dt;
      if (this.countdown <= 0) this.beginWave();
      else if (Math.floor(this.countdown + dt) !== Math.floor(this.countdown)) this.updateHud();
    }
    if (this.phase === 'wave' && this.spawnQueue > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnQueue -= 1;
        this.spawnTimer = this.currentWave.boss ? 0 : 0.7;
      }
    }
    this.moveEnemies(dt);
    this.fireTowers(dt);
    this.moveBullets(dt);
    this.updateFloaters(dt);

    const before = this.enemies.length;
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (before !== this.enemies.length) this.updateBar();

    if (this.phase === 'wave' && this.spawnQueue === 0 && this.enemies.length === 0) this.endWave();
    if (this.lives <= 0) this.endGame();
  }

  moveEnemies(dt) {
    const L = TD.LAYOUT;
    const ex = this.cellX(this.grid.exit.c), ey = this.cellY(this.grid.exit.r);
    for (const e of this.enemies) {
      if (e.dead) continue;
      const slow = this.time.now < e.slowUntil ? 1 - e.slowAmt : 1;
      let move = e.speed * L.CELL * slow * dt;
      if (e.flying) {
        const dx = ex - e.x, dy = ey - e.y, d = Math.hypot(dx, dy);
        if (d <= move) { this.leak(e); continue; }
        e.x += (dx / d) * move; e.y += (dy / d) * move;
        continue;
      }
      while (move > 0 && !e.dead) {
        if (e.pathIdx >= e.path.length - 1) { this.leak(e); break; }
        const nxt = e.path[e.pathIdx + 1];
        const tx = this.cellX(nxt.c), ty = this.cellY(nxt.r);
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d <= move) { e.x = tx; e.y = ty; e.pathIdx += 1; move -= d; }
        else { e.x += (dx / d) * move; e.y += (dy / d) * move; move = 0; }
      }
    }
  }

  leak(e) {
    e.dead = true;
    this.lives -= 1;
    this.livesLostThisWave += 1;
    this.cameras.main.shake(120, 0.004);
    this.updateHud();
  }

  // How close an enemy is to escaping, higher = more urgent
  urgency(e) {
    if (e.flying) {
      return -Math.hypot(this.cellX(this.grid.exit.c) - e.x, this.cellY(this.grid.exit.r) - e.y);
    }
    return -(e.path.length - e.pathIdx) * TD.LAYOUT.CELL;
  }

  fireTowers(dt) {
    const L = TD.LAYOUT;
    for (const t of this.towers) {
      if (t.type !== 'tower') continue;
      t.cooldown -= dt;
      if (t.cooldown > 0) continue;
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
      t.cooldown = s.cooldown;
      this.bullets.push({ x: tx, y: ty, target: best, damage: s.damage, splash: s.splash, slow: s.slow, speed: 14 * L.CELL });
    }
  }

  moveBullets(dt) {
    const L = TD.LAYOUT;
    for (const b of this.bullets) {
      const tgt = b.target;
      if (tgt.dead) { b.done = true; continue; }
      const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy);
      const move = b.speed * dt;
      if (d <= move || d < 6) {
        b.done = true;
        this.hit(tgt, b);
        if (b.splash > 0) {
          const rad = b.splash * L.CELL;
          for (const e of this.enemies) {
            if (e === tgt || e.dead) continue;
            if (Math.hypot(e.x - tgt.x, e.y - tgt.y) <= rad) this.hit(e, b, 0.6);
          }
          this.puff(tgt.x, tgt.y, rad);
        }
      } else {
        b.x += (dx / d) * move; b.y += (dy / d) * move;
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
      this.floaters.push({ x: e.x, y: e.y, text: '+' + e.def.gold, life: 0.8 });
      this.updateHud();
    }
  }

  puff(x, y, r) { this.floaters.push({ x, y, ring: r, life: 0.25 }); }

  updateFloaters(dt) {
    for (const f of this.floaters) { f.life -= dt; if (f.text) f.y -= 30 * dt; }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  render() {
    const g = this.enemyGfx;
    g.clear();
    for (const e of this.enemies) {
      const size = e.boss ? 18 : 9;
      const col = e.flying ? 0xb9c8ff : 0xe2a15b;
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(e.x + 2, e.y + 3, size);
      g.fillStyle(col, 1);
      if (e.flying) g.fillTriangle(e.x, e.y - size, e.x - size, e.y + size * 0.7, e.x + size, e.y + size * 0.7);
      else g.fillCircle(e.x, e.y, size);
      if (this.time.now < e.slowUntil) { g.lineStyle(2, 0x7fd8ff, 1); g.strokeCircle(e.x, e.y, size + 2); }
      // Health bar
      const w = e.boss ? 40 : 22, hpf = Math.max(0, e.hp / e.maxHp);
      g.fillStyle(0x000000, 0.6); g.fillRect(e.x - w / 2, e.y - size - 8, w, 4);
      g.fillStyle(hpf > 0.5 ? 0x7fd08a : hpf > 0.25 ? 0xf0c85a : 0xe5533d, 1);
      g.fillRect(e.x - w / 2, e.y - size - 8, w * hpf, 4);
    }
    const bg = this.bulletGfx;
    bg.clear();
    bg.fillStyle(this.faction.accent, 1);
    for (const b of this.bullets) bg.fillCircle(b.x, b.y, 3);

    const fx = this.fxGfx;
    fx.clear();
    for (const f of this.floaters) {
      if (f.ring) { fx.lineStyle(2, this.faction.colour, f.life * 4); fx.strokeCircle(f.x, f.y, f.ring); }
    }
    // Floating gold text is drawn with pooled text objects
    this.renderFloatText();
  }

  renderFloatText() {
    if (!this.floatPool) this.floatPool = [];
    let i = 0;
    for (const f of this.floaters) {
      if (!f.text) continue;
      let t = this.floatPool[i];
      if (!t) { t = this.add.text(0, 0, '', { fontFamily: TD.FONT, fontSize: '13px', fontStyle: '700', color: TD.COLOURS.gold }).setOrigin(0.5).setDepth(10); this.floatPool.push(t); }
      t.setPosition(f.x, f.y).setText(f.text).setAlpha(Math.min(1, f.life * 2)).setVisible(true);
      i++;
    }
    for (; i < this.floatPool.length; i++) this.floatPool[i].setVisible(false);
  }

  // ------------------------------------------------------------- game over

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
