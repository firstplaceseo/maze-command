// Game scene for Maze Command (v2, sprite based).
//
// Flow: build phase (countdown, enemies mass at the entrance) -> wave ->
// all enemies gone -> bonus -> next build phase. Repeats forever.
// Every 5th wave is a boss with its own health bar.

window.TD = window.TD || {};

// Unit looks. 'up' sprites point up in the source art, 'right' sprites point right.
const KIND = {
  inf:   { body: 'e_inf', face: 'up',    scale: 0.40, radius: 9 },
  buggy: { body: 'mini_tank_red', face: 'up',   scale: 0.36, radius: 11 },
  tank:  { body: 'e_tank', gun: 'e_tank_gun', face: 'right', scale: 0.38, radius: 12 },
  heli:  { body: 'e_heli', shadow: 'plane_shadow', face: 'up', scale: 0.44, radius: 11 },
  boss:  { body: 'e_boss', gun: 'e_boss_gun', face: 'right', scale: 0.62, radius: 20 },
};
const TILE = 45 / 128;               // art is 128px, a cell is 45px
const TURRET_SCALE = [0.34, 0.37, 0.40, 0.43];

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

    this.gold = TD.ECON.startGold;
    this.lives = this.difficulty.lives;
    this.cores = 0;
    this.wave = 0;
    this.phase = 'build';
    this.countdown = TD.ECON.firstWaveDelay;
    this.speedMult = 1;
    this.towers = [];
    this.mines = [];
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.currentWave = null;
    this.livesLostThisWave = 0;
    this.lines = TD.factionLines(this.factionId);
    this.buildMode = 'gunner';   // a line id, or 'mine'
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
        const isRoad = row === this.grid.spawn.r;
        const g = r();
        const key = isRoad ? (r() < 0.5 ? 'stone' : 'stone2') : (g < 0.2 ? 'grass_b' : g < 0.35 ? 'grass_c' : 'grass_a');
        const img = this.add.image(this.cellX(c), this.cellY(row), key).setScale(TILE * 1.02);
        img.setAngle(90 * Math.floor(r() * 4));
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
    const deco = [['tree_big', 0.4], ['tree_round', 0.42], ['bush', 0.36], ['shrub', 0.36], ['rock_l', 0.34], ['rock_m', 0.3], ['plant', 0.34]];
    for (let c = 0; c < L.COLS; c++) {
      if (c === e.c || c === e.c + 1) continue;
      const [key, sc] = deco[(c * 5) % deco.length];
      this.decoLayer.add(this.add.image(this.cellX(c) + ((c % 2) ? 5 : -5), this.cellY(e.r) + ((c % 3) ? 3 : -3), key).setScale(sc));
    }
    // HQ: two plates, a big turret and the faction flag
    const hx = this.cellX(e.c) + L.CELL / 2, hy = this.cellY(e.r);
    this.decoLayer.add(this.add.image(this.cellX(e.c), hy, 'plate').setScale(TILE));
    this.decoLayer.add(this.add.image(this.cellX(e.c + 1), hy, 'plate').setScale(TILE));
    this.decoLayer.add(this.add.image(hx, hy + 2, 'turret_229_' + this.factionId).setScale(0.5).setAngle(180));
    this.decoLayer.add(this.add.image(hx + 26, hy - 14, 'flag_' + this.factionId).setScale(0.22));
    // scattered detail in the field (towers build over it)
    let seed = 99; const rr = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const bits = [['plant', 0.26], ['bush', 0.22], ['rock_s', 0.24], ['shrub', 0.24], ['crater3', 0.24], ['rock_m', 0.22]];
    for (let i = 0; i < 16; i++) {
      const c = Math.floor(rr() * L.COLS), r = 1 + Math.floor(rr() * (L.ROWS - 2));
      if (c === s.c || c === s.c + 1 || c === s.c - 1) continue;
      const [key, sc] = bits[Math.floor(rr() * bits.length)];
      this.decoLayer.add(this.add.image(this.cellX(c) + (rr() - 0.5) * 20, this.cellY(r) + (rr() - 0.5) * 20, key).setScale(sc).setAlpha(0.85).setAngle(rr() * 360));
    }
    // craters and rocks on the entry road
    for (const [c, key] of [[1, 'crater'], [4, 'crater3'], [9, 'crater2'], [10, 'rock_s']]) this.decoLayer.add(this.add.image(this.cellX(c), this.cellY(s.r), key).setScale(0.32).setAlpha(0.8));
    this.add.text(6, this.cellY(s.r) - 20, 'ENEMY LINE', { fontFamily: TD.FONT, fontSize: '11px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 4, y: 1 } }).setDepth(2);
  }

  buildPathTiles() {
    this.pathGfx = this.add.graphics();
    this.pathLayer.add(this.pathGfx);
    this.redrawPath();
  }

  // The dirt trail follows the current route: a thick rounded line in the
  // art pack's dirt colour, with a darker edge.
  redrawPath() {
    const g = this.pathGfx;
    g.clear();
    const p = this.grid.path;
    if (!p || p.length < 2) return;
    const pts = p.map((c) => ({ x: this.cellX(c.c), y: this.cellY(c.r) }));
    const draw = (width, colour) => {
      g.lineStyle(width, colour, 1);
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.strokePath();
      g.fillStyle(colour, 1);
      for (const q of pts) g.fillCircle(q.x, q.y, width / 2);
    };
    draw(34, 0x9c7a4a);
    draw(28, 0xc09159);
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
      const k = KIND[next.kind];
      const spr = this.add.image(x, this.cellY(this.grid.spawn.r) - 4, k.body).setScale(k.scale * 0.9).setRotation(k.face === 'up' ? Math.PI : Math.PI / 2);
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
    this.add.image(30, 22, 'flag_' + this.factionId).setScale(0.2).setDepth(9);
    this.hudFaction = this.add.text(48, 10, this.faction.name, { fontFamily: TD.FONT, fontSize: '18px', color: this.faction.colourHex }).setDepth(9);
    this.hudWave = this.add.text(48, 36, '', { fontFamily: TD.FONT, fontSize: '15px', color: C.text }).setDepth(9);
    this.add.image(L.W - 118, 22, 'coin').setScale(0.24).setDepth(9);
    this.hudGold = this.add.text(L.W - 100, 10, '', { fontFamily: TD.FONT, fontSize: '22px', color: C.gold }).setOrigin(0, 0).setDepth(9);
    this.add.image(L.W - 118, 50, 'ui_shield').setScale(0.16).setDepth(9);
    this.hudLives = this.add.text(L.W - 100, 40, '', { fontFamily: TD.FONT, fontSize: '15px', color: C.text }).setOrigin(0, 0).setDepth(9);
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
    this.hudGold.setText(String(this.gold));
    this.hudLives.setText(String(this.lives));
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

  makeButton(x, y, w, h, label, onTap, depth, icon) {
    const rect = this.add.rectangle(x, y, w, h, 0x232b21).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive({ useHandCursor: true }).setDepth(depth || 9);
    const ix = icon ? x + 22 : x + w / 2;
    const txt = this.add.text(icon ? ix + 16 : ix, y + h / 2, label, { fontFamily: TD.FONT, fontSize: '13px', color: TD.COLOURS.text, align: icon ? 'left' : 'center' }).setOrigin(icon ? 0 : 0.5, 0.5).setDepth(depth || 9);
    const img = icon ? this.add.image(ix, y + h / 2, 'ui_' + icon).setScale(0.22).setDepth(depth || 9) : null;
    rect.on('pointerdown', (p, lx, ly, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); TD.SFX.unlock(); onTap(); });
    return { rect, txt, img, setLabel: (s) => txt.setText(s) };
  }

  buildBar() {
    const L = TD.LAYOUT;
    this.add.rectangle(0, L.BAR_Y, L.W, L.BAR_H, 0x10140f).setOrigin(0).setDepth(9);
    // Row 1: build choices
    const y1 = L.BAR_Y + 6, h1 = 58, bw = 72, gap = 4;
    this.buildBtns = {};
    const choices = this.lines.map((ln) => ({ id: ln.id, name: ln.name.toUpperCase(), tex: ln.turrets[0] + '_' + this.factionId })).concat([{ id: 'mine', name: 'MINES', tex: 'bullet_grey' }]);
    choices.forEach((ch, i) => {
      const x = 4 + i * (bw + gap);
      const rect = this.add.rectangle(x, y1, bw, h1, 0x232b21).setOrigin(0).setStrokeStyle(2, 0x3a4536).setInteractive({ useHandCursor: true }).setDepth(9);
      const plate = ch.id === 'mine' ? null : this.add.image(x + bw / 2, y1 + 22, 'plate').setScale(0.2).setDepth(9);
      const icon = this.add.image(x + bw / 2, y1 + 22, ch.tex).setScale(ch.id === 'mine' ? 0.5 : 0.24).setDepth(9);
      const name = this.add.text(x + bw / 2, y1 + 40, ch.name, { fontFamily: TD.FONT, fontSize: '8px', color: TD.COLOURS.text }).setOrigin(0.5, 0).setDepth(9);
      const cost = this.add.text(x + bw / 2, y1 + 50, '', { fontFamily: TD.FONT, fontSize: '9px', color: TD.COLOURS.gold }).setOrigin(0.5, 0).setDepth(9);
      rect.on('pointerdown', (p, lx, ly, ev) => { ev && ev.stopPropagation && ev.stopPropagation(); TD.SFX.unlock(); this.setBuildMode(ch.id); });
      this.buildBtns[ch.id] = { rect, icon, plate, name, cost };
    });
    // Row 2: hint, send wave, speed, sound
    const y2 = L.BAR_Y + 70, h2 = 48;
    this.hint = this.add.text(8, y2 + 2, '', { fontFamily: TD.FONT, fontSize: '10px', color: TD.COLOURS.muted, wordWrap: { width: 236 }, lineSpacing: 2 }).setDepth(9);
    this.btnStart = this.makeButton(250, y2, 166, h2, '', () => this.startWaveNow(), 9, 'next');
    this.btnSpeed = this.makeButton(422, y2, 54, h2, '', () => this.toggleSpeed(), 9, 'fastForward');
    this.btnSound = this.makeButton(480, y2, 52, h2, '', () => { const m = TD.SFX.toggle(); this.btnSound.img.setTexture(m ? 'ui_audioOff' : 'ui_audioOn'); }, 9, 'audioOn');
    this.btnSpeed.img.setPosition(449, y2 + 18); this.btnSpeed.txt.setPosition(449, y2 + 38).setOrigin(0.5).setFontSize(10);
    this.btnSound.img.setPosition(506, y2 + h2 / 2);
    this.setBuildMode('gunner');
    this.updateBar();
  }

  mineDamage() { return TD.MINE.baseDamage + TD.MINE.damagePerWave * Math.max(this.wave, 1); }

  buildCost(id) { return id === 'mine' ? this.faction.mineCost : this.lines.find((l) => l.id === id).tiers[0].cost; }

  updateBar() {
    if (!this.buildBtns) return;
    for (const id in this.buildBtns) {
      const b = this.buildBtns[id], cost = this.buildCost(id);
      b.cost.setText(cost + 'g');
      const ok = this.gold >= cost;
      b.name.setColor(ok ? TD.COLOURS.text : TD.COLOURS.muted);
      b.icon.setAlpha(ok ? 1 : 0.45);
      b.rect.setStrokeStyle(2, id === this.buildMode ? this.faction.colour : 0x3a4536);
      b.rect.setFillStyle(id === this.buildMode ? 0x2b362a : 0x232b21);
    }
    if (this.phase === 'build') {
      this.btnStart.setLabel('SEND WAVE ' + (this.wave + 1) + '\nor wait ' + Math.ceil(this.countdown) + 's');
      this.btnStart.rect.setFillStyle(0x2f4a2c);
    } else {
      this.btnStart.setLabel('WAVE ' + this.wave + '\n' + (this.enemies.length + this.spawnQueue) + ' remaining');
      this.btnStart.rect.setFillStyle(0x232b21);
    }
    this.btnSpeed.setLabel(this.speedMult + 'x');
  }

  setBuildMode(mode) {
    this.buildMode = mode;
    if (!this.buildBtns) return;
    if (mode === 'mine') this.hint.setText('Minefield: one-shot trap on any open square, even the route. Does not block. Explodes on the first ground enemy. ' + this.mineDamage() + ' splash damage now.');
    else { const ln = this.lines.find((l) => l.id === mode); const t0 = ln.tiers[0]; this.hint.setText(ln.name + ': ' + ln.role + (ln.id === 'beacon' ? ' +' + Math.round(t0.buffDmg * 100) + '% damage at tier 1.' : ' Dmg ' + t0.damage + ', range ' + t0.range.toFixed(1) + '.')); }
    this.updateBar();
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
    this.panelUpgrade = this.makeButton(290, 12, 234, 48, '', () => this.upgradeSelected(), 0, 'wrench');
    this.panelSell = this.makeButton(290, 70, 120, 44, '', () => this.sellSelected(), 0, 'trashcan');
    this.panelClose = this.makeButton(420, 70, 104, 44, 'CLOSE', () => this.closePanel(), 0, 'cross');
    this.panel.add([bg, this.panelTitle, this.panelStats,
      this.panelUpgrade.rect, this.panelUpgrade.txt, this.panelUpgrade.img, this.panelSell.rect, this.panelSell.txt, this.panelSell.img, this.panelClose.rect, this.panelClose.txt, this.panelClose.img]);
  }

  openPanel(t) { this.selected = t; this.panel.setVisible(true); this.refreshPanel(); this.redrawRange(); }
  closePanel() { this.selected = null; if (this.panel) this.panel.setVisible(false); if (this.rangeGfx) this.redrawRange(); }

  refreshPanel() {
    const t = this.selected;
    if (!t) return;
    if (t.line.id === 'beacon') {
      const d = t.line.tiers[t.tier - 1];
      this.panelTitle.setText(d.name + '  (Beacon ' + t.tier + ')');
      this.panelStats.setText(['Boosts the 8 squares around it. Does not stack.', '+' + Math.round(d.buffDmg * 100) + '% damage' + (d.buffRange ? '   +' + d.buffRange + ' range' : '') + (d.buffRate ? '   +' + Math.round(d.buffRate * 100) + '% fire rate' : ''), t.building > 0 ? 'Under construction' : 'Worth ' + t.value + ' gold'].join('\n'));
      this.panelUpgrade.rect.setVisible(true); this.panelUpgrade.txt.setVisible(true);
      const up = this.upgradeInfo(t);
      this.panelUpgrade.setLabel(up.label.replace(/  \(dmg 0\)/, ''));
      this.panelUpgrade.txt.setColor(up.affordable && !t.building ? TD.COLOURS.text : TD.COLOURS.muted);
    } else {
      const s = this.towerStats(t);
      const tierDef = t.line.tiers[t.tier - 1];
      this.panelTitle.setText(tierDef.name + '  (' + t.line.name + ' ' + t.tier + (t.overclock ? ', OC ' + t.overclock : '') + ')');
      const hits = t.line.ground && t.line.air ? 'Ground + air' : t.line.air ? 'Air only' : 'Ground only';
      const lines = [
        'Damage ' + Math.round(s.damage) + '   Range ' + s.range.toFixed(1) + '   Fire ' + (1 / s.cooldown).toFixed(1) + '/s' + (s.buffed ? '  (boosted)' : ''),
        hits + (s.splash ? '   Splash ' + s.splash.toFixed(1) : '') + (s.slow ? '   Slow ' + Math.round(s.slow * 100) + '%' : '') + (s.targets > 1 ? '   x' + s.targets + ' targets' : ''),
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

  bestBuff(t) {
    let best = null;
    for (const b of this.towers) {
      if (b.line.id !== 'beacon' || b.building > 0 || b === t) continue;
      if (Math.abs(b.c - t.c) > 1 || Math.abs(b.r - t.r) > 1) continue;
      const d = b.line.tiers[b.tier - 1];
      if (!best || d.buffDmg > best.buffDmg) best = d;
    }
    return best;
  }

  towerStats(t) {
    const def = t.line.tiers[t.tier - 1];
    const b = this.bestBuff(t) || { buffDmg: 0, buffRange: 0, buffRate: 0 };
    return {
      damage: def.damage * (1 + TD.OVERCLOCK_DAMAGE * (t.overclock || 0)) * (1 + b.buffDmg),
      range: def.range + b.buffRange, cooldown: def.cooldown / (1 + b.buffRate),
      splash: def.splash, slow: def.slow || 0, targets: def.targets || 1, air: t.line.air, ground: t.line.ground, buffed: !!this.bestBuff(t),
    };
  }

  upgradeInfo(t) {
    const tiers = t.line.tiers;
    if (t.tier < tiers.length) {
      const next = tiers[t.tier];
      const cost = next.cost - tiers[t.tier - 1].cost;
      const needsCore = !!next.core;
      const affordable = this.gold >= cost && (!needsCore || this.cores > 0);
      return { kind: 'tier', cost, needsCore, affordable, label: 'UPGRADE: ' + next.name + '\n' + cost + ' gold' + (needsCore ? ' + 1 Core' : '') + '  (dmg ' + next.damage + ')' };
    }
    const lvl = (t.overclock || 0) + 1;
    const cost = Math.round(TD.OVERCLOCK_BASE * Math.pow(TD.OVERCLOCK_GROWTH, lvl - 1));
    return { kind: 'overclock', cost, affordable: this.gold >= cost, label: 'Overclock ' + lvl + ' (+10% damage)\n' + cost + ' gold' };
  }

  upgradeSelected() {
    const t = this.selected;
    if (!t) return;
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
    TD.SFX.build();
  }

  finishConstruction(t) {
    t.building = 0;
    t.site.setVisible(false);
    t.turret.setTexture(t.line.turrets[t.tier - 1] + '_' + this.factionId).setScale(TURRET_SCALE[t.tier - 1]).setVisible(true);
    TD.SFX.done();
    if (this.selected === t) this.refreshPanel();
  }

  redrawRange() {
    const g = this.rangeGfx;
    g.clear();
    const t = this.selected;
    if (!t || t.line.id === 'beacon') { if (t) { const g2 = this.rangeGfx; g2.lineStyle(2, this.faction.colour, 0.7); g2.strokeRect(this.cellX(t.c) - TD.LAYOUT.CELL * 1.5, this.cellY(t.r) - TD.LAYOUT.CELL * 1.5, TD.LAYOUT.CELL * 3, TD.LAYOUT.CELL * 3); } return; }
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
    const fail = (m) => { this.announce(m, TD.COLOURS.bad); TD.SFX.deny(); };
    const cost = this.buildCost(this.buildMode);
    if (this.gold < cost) return fail('Not enough gold');
    if (this.buildMode === 'mine') {
      if (!this.grid.isWalkable(c, r)) return fail('Something is already there');
      if (this.mines.some((m) => m.c === c && m.r === r)) return fail('There is already a mine here');
      this.gold -= cost;
      const x = this.cellX(c), y = this.cellY(r);
      const img = this.add.image(x, y, 'bullet_grey').setScale(0.34).setAlpha(0.95);
      this.decoLayer.add(img);
      this.mines.push({ c, r, x, y, img });
      TD.SFX.build();
      this.updateHud();
      return;
    }
    const lineDef = this.lines.find((l) => l.id === this.buildMode);
    if (!this.grid.isBuildable(c, r)) return fail('Cannot build on the entry or exit rows');
    if (this.enemyOnCell(c, r)) return fail('An enemy is standing there');
    if (!this.grid.canPlace(c, r)) return fail('That would seal the route');
    this.gold -= cost;
    this.grid.place(c, r, 'tower');
    this.mines = this.mines.filter((m) => { if (m.c === c && m.r === r) { m.img.destroy(); this.gold += this.faction.mineCost; return false; } return true; });
    const x = this.cellX(c), y = this.cellY(r);
    const t = { c, r, type: 'tower', line: lineDef, tier: 1, overclock: 0, value: cost, cooldown: 0, building: 0, sprites: [] };
    t.site = this.add.image(x, y, 'site').setScale(TILE).setVisible(false);
    t.base = this.add.image(x, y, lineDef.id === 'beacon' ? 'plate_diamond' : 'plate').setScale(TILE);
    t.turret = this.add.image(x, y, lineDef.turrets[0] + '_' + this.factionId).setScale(TURRET_SCALE[0]);
    t.flash = this.add.image(x, y, 'flash').setScale(0.25).setVisible(false);
    t.sprites.push(t.base, t.turret, t.site, t.flash);
    this.towerLayer.add([t.base, t.turret, t.site]);
    this.fxLayer.add(t.flash);
    this.towers.push(t);
    this.startConstruction(t, TD.ECON.buildTime);
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
    const kind = w.kind, k = KIND[kind];
    const e = {
      def: w, kind, k, hp: w.hp, maxHp: w.hp, armour: w.armour, speed: w.speed, flying: w.flying, boss: !!w.boss,
      x: this.cellX(s.c) + (Math.random() - 0.5) * 14, y: this.cellY(s.r) - 20, slowUntil: 0, slowAmt: 0, dead: false,
      path: w.flying ? null : this.grid.path.slice(), pathIdx: 0, angle: Math.PI / 2, radius: k.radius, bob: Math.random() * 6,
    };
    const layer = e.flying ? this.airLayer : this.groundLayer;
    if (k.shadow) { e.shadow = this.add.image(e.x + 12, e.y + 16, k.shadow).setScale(k.scale); layer.add(e.shadow); }
    e.sprite = this.add.image(e.x, e.y, k.body).setScale(k.scale);
    layer.add(e.sprite);
    if (k.gun) { e.gun = this.add.image(e.x, e.y, k.gun).setScale(k.scale); layer.add(e.gun); }
    if (e.boss) { e.crown = this.add.image(e.x, e.y - 26, 'crown_gold').setScale(0.16); this.fxLayer.add(e.crown); }
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
        t.site.setAlpha(0.6 + 0.4 * Math.abs(Math.sin(this.animClock * 6)));
        if (t.building <= 0) this.finishConstruction(t);
      }
    }
    this.moveEnemies(dt);
    this.checkMines();
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

  checkMines() {
    if (!this.mines.length) return;
    for (const m of this.mines) {
      if (m.done) continue;
      for (const e of this.enemies) {
        if (e.dead || e.flying) continue;
        if (Math.hypot(e.x - m.x, e.y - m.y) < 14) {
          m.done = true;
          const dmg = this.mineDamage(), rad = TD.MINE.splash * TD.LAYOUT.CELL;
          for (const o of this.enemies) if (!o.dead && !o.flying && Math.hypot(o.x - m.x, o.y - m.y) <= rad) this.hit(o, { damage: dmg, slow: 0 });
          this.boom(m.x, m.y, 0.8, true);
          TD.SFX.explode();
          m.img.destroy();
          break;
        }
      }
    }
    this.mines = this.mines.filter((m) => !m.done);
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

  destroyEnemySprites(e) { e.sprite.destroy(); if (e.shadow) e.shadow.destroy(); if (e.gun) e.gun.destroy(); if (e.crown) e.crown.destroy(); }

  urgency(e) {
    if (e.flying) return -Math.hypot(this.cellX(this.grid.exit.c) - e.x, this.cellY(this.grid.exit.r) - e.y);
    return -(e.path.length - e.pathIdx) * TD.LAYOUT.CELL;
  }

  fireTowers(dt) {
    const L = TD.LAYOUT;
    for (const t of this.towers) {
      if (t.building > 0 || t.line.id === 'beacon') continue;
      t.cooldown -= dt;
      const s = this.towerStats(t);
      const tx = this.cellX(t.c), ty = this.cellY(t.r), rangePx = s.range * L.CELL + L.CELL * 0.4;
      const inRange = [];
      for (const e of this.enemies) {
        if (e.dead || (e.flying && !s.air) || (!e.flying && !s.ground)) continue;
        if (Math.hypot(e.x - tx, e.y - ty) > rangePx) continue;
        inRange.push(e);
      }
      if (!inRange.length) continue;
      inRange.sort((a, b) => this.urgency(b) - this.urgency(a));
      const best = inRange[0];
      const ang = Math.atan2(best.y - ty, best.x - tx);
      t.turret.setRotation(ang + Math.PI / 2);
      if (t.cooldown > 0) continue;
      t.cooldown = s.cooldown;
      const tex = t.line.id === 'flak' || t.line.id === 'swarm' ? 'missile_s' : t.line.id === 'artillery' ? 'bullet_orange' : t.line.id === 'sniper' || t.line.id === 'railgun' ? 'bullet_grey' : t.line.id === 'tesla' ? 'bullet_small' : 'bullet_small';
      const targets = inRange.slice(0, s.targets);
      for (const tgt of targets) {
        const a = Math.atan2(tgt.y - ty, tgt.x - tx);
        const bx = tx + Math.cos(a) * 16, by = ty + Math.sin(a) * 16;
        const img = this.add.image(bx, by, tex).setScale(t.line.id === 'railgun' ? 0.3 : 0.24).setRotation(a + Math.PI / 2);
        this.bulletLayer.add(img);
        this.bullets.push({ x: bx, y: by, target: tgt, damage: s.damage, splash: s.splash, slow: s.slow, speed: (t.line.id === 'artillery' ? 8 : 14) * L.CELL, img, flame: t.line.id === 'flame' });
      }
      t.flash.setPosition(tx + Math.cos(ang) * 16, ty + Math.sin(ang) * 16).setRotation(ang).setVisible(true).setAlpha(1);
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
    const img = this.add.image(x, y, 'flame_296').setScale(scale * 0.8);
    this.fxLayer.add(img);
    this.effects.push({ kind: 'boom', img, life: 0.4, total: 0.4, scale });
    if (leaveWreck) {
      const w = this.add.image(x, y, ['crater', 'crater2', 'crater3'][Math.floor(Math.random() * 3)]).setScale(0.28 * scale + 0.12).setRotation(Math.random() * 6.28).setAlpha(0.8);
      this.decoLayer.add(w);
      this.effects.push({ kind: 'wreck', img: w, life: 8, total: 8 });
    }
  }

  spark(x, y) {
    const img = this.add.image(x, y, 'flash').setScale(0.14).setAlpha(0.9);
    this.fxLayer.add(img);
    this.effects.push({ kind: 'spark', img, life: 0.12, total: 0.12 });
  }

  floatText(x, y, text) {
    const t = this.add.text(x, y, text, { fontFamily: TD.FONT, fontSize: '13px', fontStyle: '700', color: TD.COLOURS.gold, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(8);
    this.effects.push({ kind: 'text', img: t, life: 0.8, total: 0.8 });
  }

  updateEffects(dt) {
    for (const f of this.effects) {
      f.life -= dt;
      const p = 1 - f.life / f.total;
      if (f.kind === 'boom') { f.img.setTexture(['flame_296', 'flame_298', 'flame_295', 'flame_297'][Math.min(3, Math.floor(p * 4))]).setScale(f.scale * (0.6 + p * 0.8)).setAlpha(1 - p * 0.7); }
      else if (f.kind === 'spark') f.img.setRotation(p * 2);
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
    for (const e of this.enemies) {
      const k = e.k;
      const rot = e.angle + (k.face === 'up' ? Math.PI / 2 : 0);
      let bob = 0;
      if (e.kind === 'inf') bob = Math.sin(this.animClock * 14 + e.bob) * 1.5;
      e.sprite.setPosition(e.x, e.y + bob).setRotation(rot);
      if (e.gun) e.gun.setPosition(e.x, e.y).setRotation(rot);
      if (e.shadow) e.shadow.setPosition(e.x + 12, e.y + 16 + Math.sin(this.animClock * 3 + e.bob) * 2).setRotation(rot);
      if (e.crown) e.crown.setPosition(e.x, e.y - 30);
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
      m.y = this.cellY(this.grid.spawn.r) - 4 + Math.sin(this.animClock * 5 + i * 2) * 1.5;
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
