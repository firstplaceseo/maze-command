// Menu: pick a faction and a difficulty, then start.

window.TD = window.TD || {};

TD.MenuScene = class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const { W, H } = TD.LAYOUT;
    // grass backdrop with a few trees, darkened so the cards read
    for (let y = 0; y < H; y += 45) for (let x = 0; x < W; x += 45) this.add.image(x + 22, y + 22, ((x + y) / 45) % 5 === 0 ? 'grass_b' : 'grass_a').setScale(45 / 128 * 1.02);
    for (const [x, y, k, s] of [[40, 60, 'tree_big', 0.6], [500, 120, 'tree_round', 0.7], [70, 900, 'rock_l', 0.5], [480, 880, 'tree_big', 0.6], [510, 500, 'bush', 0.5], [30, 520, 'shrub', 0.5]]) this.add.image(x, y, k).setScale(s);
    this.add.rectangle(0, 0, W, H, 0x0d110c, 0.62).setOrigin(0);
    this.faction = 'federation';
    this.difficulty = 'normal';

    this.add.text(W / 2, 90, 'MAZE COMMAND', {
      fontFamily: TD.FONT, fontSize: '46px', color: TD.COLOURS.text, stroke: '#0d110c', strokeThickness: 6,
    }).setOrigin(0.5);
    this.add.text(W / 2, 140, 'Build the maze. Hold the line. No last wave.', {
      fontFamily: TD.FONT, fontSize: '18px', color: TD.COLOURS.muted,
    }).setOrigin(0.5);

    // Faction cards
    this.cards = {};
    const cardW = 240, cardH = 150, gap = 20;
    const startX = (W - (cardW * 2 + gap)) / 2;
    TD.FACTION_ORDER.forEach((id, i) => {
      const f = TD.FACTIONS[id];
      const x = startX + (i % 2) * (cardW + gap);
      const y = 190 + Math.floor(i / 2) * (cardH + gap);
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cardW, cardH, 0x232b21).setOrigin(0).setStrokeStyle(3, f.colour, 0.35);
      const stripe = this.add.rectangle(0, 0, 10, cardH, f.colour).setOrigin(0);
      const emblem = this.drawEmblem(f, 40, 36);
      const base = this.add.image(cardW - 34, cardH - 34, 'plate').setScale(0.36);
      const preview = this.add.image(cardW - 34, cardH - 34, TD.factionLines(id)[4].turrets[3] + '_' + id).setScale(0.38).setRotation(-0.5);
      const name = this.add.text(70, 22, f.name.toUpperCase(), { fontFamily: TD.FONT, fontSize: '20px', color: f.colourHex });
      const tag = this.add.text(20, 66, f.tagline, { fontFamily: TD.FONT, fontSize: '14px', color: TD.COLOURS.text, wordWrap: { width: cardW - 40 }, lineSpacing: 2 });
      const best = TD.save.getBest(id);
      const bestTxt = this.add.text(20, cardH - 26, best ? 'Best: wave ' + best : 'Not played yet', { fontFamily: TD.FONT, fontSize: '13px', color: TD.COLOURS.muted });
      card.add([bg, stripe, emblem, base, preview, name, tag, bestTxt]);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectFaction(id));
      this.cards[id] = { bg, f };
    });

    // Difficulty
    this.add.text(W / 2, 560, 'Lives', { fontFamily: TD.FONT, fontSize: '18px', color: TD.COLOURS.muted }).setOrigin(0.5);
    this.diffButtons = {};
    const keys = Object.keys(TD.DIFFICULTY);
    const bw = 115, bh = 52, bgap = 10;
    const bx0 = (W - (bw * keys.length + bgap * (keys.length - 1))) / 2;
    keys.forEach((k, i) => {
      const d = TD.DIFFICULTY[k];
      const x = bx0 + i * (bw + bgap);
      const rect = this.add.rectangle(x, 585, bw, bh, 0x232b21).setOrigin(0).setStrokeStyle(2, 0x3a4536);
      const label = this.add.text(x + bw / 2, 585 + 16, d.name, { fontFamily: TD.FONT, fontSize: '18px', fontStyle: '700', color: TD.COLOURS.text }).setOrigin(0.5, 0);
      const lives = this.add.text(x + bw / 2, 585 + 36, d.lives + (d.lives === 1 ? ' life' : ' lives'), { fontFamily: TD.FONT, fontSize: '12px', color: TD.COLOURS.muted }).setOrigin(0.5, 0);
      rect.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.selectDifficulty(k));
      this.diffButtons[k] = { rect, label, lives };
    });

    // Start button
    this.startBg = this.add.rectangle(W / 2, 700, 300, 66, 0x3b78d6).setInteractive({ useHandCursor: true });
    this.startTxt = this.add.text(W / 2, 700, 'DEPLOY', { fontFamily: TD.FONT, fontSize: '28px', fontStyle: '700', color: '#ffffff' }).setOrigin(0.5);
    this.startBg.on('pointerdown', () => this.scene.start('Game', { faction: this.faction, difficulty: this.difficulty }));

    this.add.text(W / 2, 770, 'How to play', { fontFamily: TD.FONT, fontSize: '18px', fontStyle: '700', color: TD.COLOURS.text }).setOrigin(0.5);
    this.add.text(W / 2, 850, [
      'Enemies enter at the top and run for the exit at the bottom.',
      'Tap a square to build. Towers force a longer path.',
      'You can never seal the route completely.',
      'Six builds per faction: gunner, flak, artillery, sniper, special, beacon.',
      'Mines go on any open square, even the route, and blow up the first enemy.',
      'Towers take a few seconds to build. Tap one to upgrade or sell it.',
      'Every 5th wave is a boss. Waves ending in 3 or 8 fly over the maze.',
      'Waves never stop. Reach the highest wave you can.',
    ].join('\n'), { fontFamily: TD.FONT, fontSize: '14px', color: TD.COLOURS.muted, align: 'center', lineSpacing: 4 }).setOrigin(0.5);

    this.selectFaction(this.faction);
    this.selectDifficulty(this.difficulty);
  }

  drawEmblem(f, x, y) {
    const g = this.add.graphics({ x, y });
    g.fillStyle(f.colour, 1);
    switch (f.emblem) {
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 18 : 8;
          const a = -Math.PI / 2 + i * Math.PI / 5;
          pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
        }
        g.fillPoints(pts, true);
        break;
      }
      case 'ring':
        g.lineStyle(5, f.colour, 1);
        g.strokeCircle(0, 0, 15);
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          g.fillCircle(Math.cos(a) * 15, Math.sin(a) * 15, 3.5);
        }
        break;
      case 'bear':
        g.fillCircle(0, 2, 15);
        g.fillCircle(-11, -10, 6);
        g.fillCircle(11, -10, 6);
        g.fillStyle(0x151a14, 1);
        g.fillCircle(-5, -1, 2.5);
        g.fillCircle(5, -1, 2.5);
        g.fillCircle(0, 6, 3);
        break;
      case 'dragon':
        g.fillTriangle(-18, 12, 0, -18, 18, 12);
        g.fillStyle(f.accent, 1);
        g.fillTriangle(-9, 10, 0, -6, 9, 10);
        break;
    }
    return g;
  }

  selectFaction(id) {
    this.faction = id;
    for (const k in this.cards) {
      const { bg, f } = this.cards[k];
      bg.setStrokeStyle(3, f.colour, k === id ? 1 : 0.35);
      bg.setFillStyle(k === id ? 0x2b362a : 0x232b21);
    }
    this.startBg.setFillStyle(TD.FACTIONS[id].colour);
  }

  selectDifficulty(k) {
    this.difficulty = k;
    for (const key in this.diffButtons) {
      const b = this.diffButtons[key];
      b.rect.setStrokeStyle(2, key === k ? 0xe8e6dc : 0x3a4536);
      b.rect.setFillStyle(key === k ? 0x2b362a : 0x232b21);
    }
  }
};
