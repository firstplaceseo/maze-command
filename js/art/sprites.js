// Procedural art for Maze Command.
// Every sprite is drawn with the canvas 2D API at load time, so the game
// needs no image files. Works in the browser and in node-canvas for previews.

window.TD = window.TD || {};

TD.ART = (function () {
  const S = 90;               // sprites are drawn at 90px and shown at 45px (crisp on retina)
  let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // Small seeded random so tiles look the same every load
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function hex(n) { return '#' + n.toString(16).padStart(6, '0'); }
  function shade(n, f) {
    const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f)), g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f)), b = Math.min(255, Math.max(0, (n & 255) * f));
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  function sheet(w, h, fn) { const c = makeCanvas(w, h); const ctx = c.getContext('2d'); fn(ctx); return c; }

  // ------------------------------------------------------------ terrain

  function grass(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      ctx.fillStyle = '#4f7a2e'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 140; i++) {
        const x = r() * S, y = r() * S, k = r();
        ctx.fillStyle = k < 0.5 ? '#5a8a36' : k < 0.8 ? '#476e29' : '#6a9a3e';
        ctx.fillRect(x, y, 3 + r() * 4, 2 + r() * 3);
      }
      for (let i = 0; i < 26; i++) {
        const x = r() * S, y = r() * S;
        ctx.strokeStyle = r() < 0.5 ? '#6fa043' : '#3f6424'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 6, y - 5 - r() * 6); ctx.stroke();
      }
    });
  }

  function dirt(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      ctx.fillStyle = '#8a6a42'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 110; i++) {
        const k = r();
        ctx.fillStyle = k < 0.4 ? '#7a5b36' : k < 0.75 ? '#9a7a50' : '#6e5232';
        ctx.fillRect(r() * S, r() * S, 3 + r() * 6, 2 + r() * 4);
      }
      for (let i = 0; i < 12; i++) { ctx.fillStyle = '#a89070'; ctx.beginPath(); ctx.arc(r() * S, r() * S, 1.5 + r() * 2, 0, 7); ctx.fill(); }
      // faint tyre ruts
      ctx.strokeStyle = 'rgba(70,50,30,0.35)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(30, S); ctx.moveTo(60, 0); ctx.lineTo(60, S); ctx.stroke();
    });
  }

  function tree(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(50, 52, 30, 26, 0, 0, 7); ctx.fill();
      const blobs = 7;
      for (let i = 0; i < blobs; i++) {
        const a = (i / blobs) * Math.PI * 2, d = 14 + r() * 6;
        ctx.fillStyle = '#2f5a22'; ctx.beginPath(); ctx.arc(45 + Math.cos(a) * d, 45 + Math.sin(a) * d, 16 + r() * 5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = '#3d7a2c'; ctx.beginPath(); ctx.arc(43, 43, 19, 0, 7); ctx.fill();
      ctx.fillStyle = '#56a03a'; ctx.beginPath(); ctx.arc(38, 37, 10, 0, 7); ctx.fill();
    });
  }

  function rock(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(48, 58, 26, 14, 0, 0, 7); ctx.fill();
      ctx.beginPath();
      const n = 7; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, d = 18 + r() * 10; ctx.lineTo(45 + Math.cos(a) * d, 48 + Math.sin(a) * d * 0.8); }
      ctx.closePath(); ctx.fillStyle = '#7c7f78'; ctx.fill();
      ctx.fillStyle = '#9a9d95'; ctx.beginPath(); ctx.ellipse(40, 42, 12, 8, -0.4, 0, 7); ctx.fill();
      ctx.strokeStyle = '#55584f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(35, 52); ctx.lineTo(50, 60); ctx.stroke();
    });
  }

  function bush(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#3e7a2b' : '#4e9236'; ctx.beginPath(); ctx.arc(35 + r() * 22, 40 + r() * 18, 10 + r() * 6, 0, 7); ctx.fill(); }
    });
  }

  // Ruined road for the entry row
  function road(seed) {
    return sheet(S, S, (ctx) => {
      const r = rng(seed);
      ctx.fillStyle = '#5d5b57'; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = r() < 0.5 ? '#54524e' : '#68665f'; ctx.fillRect(r() * S, r() * S, 4 + r() * 8, 3 + r() * 5); }
      ctx.fillStyle = '#c9b25a'; ctx.fillRect(0, 42, 34, 6); ctx.fillRect(56, 42, 34, 6);
      ctx.strokeStyle = '#3b3a37'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(30, 30); ctx.lineTo(28, 50); ctx.stroke();
    });
  }

  // Bunker for the exit row, flag in faction colour
  function bunker(colour) {
    return sheet(S * 2, S, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(14, 22, 156, 62);
      ctx.fillStyle = '#6f7268'; ctx.fillRect(10, 14, 156, 62);
      ctx.fillStyle = '#8b8e83'; ctx.fillRect(16, 20, 144, 22);
      ctx.fillStyle = '#2b2d29'; for (let i = 0; i < 4; i++) ctx.fillRect(26 + i * 36, 48, 20, 12);
      ctx.fillStyle = '#4b4e46'; ctx.fillRect(10, 70, 156, 6);
      // sandbags
      ctx.fillStyle = '#b8a36e'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(14 + i * 18, 10, 10, 6, 0, 0, 7); ctx.fill(); }
      // flag
      ctx.fillStyle = '#2b2d29'; ctx.fillRect(150, 4, 4, 40);
      ctx.fillStyle = hex(colour); ctx.beginPath(); ctx.moveTo(154, 6); ctx.lineTo(178, 14); ctx.lineTo(154, 22); ctx.closePath(); ctx.fill();
    });
  }

  // ------------------------------------------------------------- towers

  function towerBase(colour) {
    return sheet(S, S, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(10, 12, 74, 74);
      ctx.fillStyle = '#6a6e66'; ctx.fillRect(7, 7, 76, 76);
      ctx.fillStyle = '#82877e'; ctx.fillRect(12, 12, 66, 66);
      ctx.fillStyle = '#5a5e56'; ctx.fillRect(18, 18, 54, 54);
      ctx.fillStyle = hex(colour); ctx.fillRect(12, 12, 66, 6); ctx.fillRect(12, 72, 66, 6);
      ctx.fillStyle = '#3a3d37'; for (const [x, y] of [[15, 15], [72, 15], [15, 72], [72, 72]]) { ctx.beginPath(); ctx.arc(x + 1.5, y + 1.5, 2.5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#4a4e46'; ctx.beginPath(); ctx.arc(45, 45, 22, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a3d37'; ctx.beginPath(); ctx.arc(45, 45, 18, 0, 7); ctx.fill();
    });
  }

  // Turrets point up (negative y). Tier changes the silhouette.
  function turret(colour, tier) {
    const c = hex(colour), dark = shade(colour, 0.6), light = shade(colour, 1.35);
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      const barrel = (x, len, w) => { ctx.fillStyle = '#2f3230'; ctx.fillRect(x - w / 2, -len, w, len); ctx.fillStyle = '#6c706c'; ctx.fillRect(x - w / 2 + 1, -len, w - 2, 4); };
      const body = (rad) => { ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(2, 2, rad, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill(); ctx.fillStyle = light; ctx.beginPath(); ctx.arc(-rad * 0.3, -rad * 0.3, rad * 0.35, 0, 7); ctx.fill(); };
      const box = (w, h) => { ctx.fillStyle = dark; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w, h); ctx.fillStyle = c; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.fillStyle = light; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 5); };
      switch (tier) {
        case 1: barrel(0, 34, 6); body(12); break;
        case 2: barrel(0, 40, 6); box(28, 24); break;
        case 3: barrel(0, 26, 12); body(15); ctx.fillStyle = '#2f3230'; ctx.beginPath(); ctx.arc(0, -26, 7, 0, 7); ctx.fill(); break;
        case 4: barrel(-6, 36, 5); barrel(6, 36, 5); box(30, 26); break;
        case 5: barrel(0, 42, 9); box(26, 32); ctx.fillStyle = '#2f3230'; ctx.fillRect(-13, 6, 26, 8); break;
        case 6: // missile pod
          box(34, 30); ctx.fillStyle = '#2f3230'; for (let i = 0; i < 3; i++) { ctx.fillRect(-12 + i * 10, -34, 6, 30); } ctx.fillStyle = '#e8563a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-9 + i * 10, -36); ctx.lineTo(-13 + i * 10, -30); ctx.lineTo(-5 + i * 10, -30); ctx.fill(); }
          break;
        default: // rail
          ctx.fillStyle = '#2f3230'; ctx.fillRect(-8, -44, 16, 44); ctx.fillStyle = light; ctx.fillRect(-2, -44, 4, 44);
          box(30, 28); ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(0, -44, 5, 0, 7); ctx.fill();
      }
    });
  }

  function wall() {
    return sheet(S, S, (ctx) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(8, 14, 78, 74);
      const rows = [[10, 72], [22, 72], [16, 60], [28, 60], [10, 48], [22, 48], [16, 36], [28, 36], [10, 24], [22, 24]];
      for (let i = 0; i < 3; i++) for (const [ox, y] of [[8, 20], [8, 44], [8, 68]]) {
        const x = ox + i * 26 + (y === 44 ? 13 : 0);
        if (x > 70) continue;
        ctx.fillStyle = '#9c8a5c'; ctx.beginPath(); ctx.ellipse(x + 13, y, 14, 9, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#b9a56e'; ctx.beginPath(); ctx.ellipse(x + 11, y - 3, 10, 5, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#6f6040'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x + 13, y, 14, 9, 0, 0, 7); ctx.stroke();
      }
    });
  }

  function construction(frame) {
    return sheet(S, S, (ctx) => {
      ctx.fillStyle = '#4d5049'; ctx.fillRect(7, 7, 76, 76);
      // hazard border
      ctx.save(); ctx.beginPath(); ctx.rect(7, 7, 76, 76); ctx.clip();
      for (let i = -10; i < 12; i++) { ctx.fillStyle = i % 2 ? '#e2b93b' : '#2a2a2a'; ctx.beginPath(); ctx.moveTo(i * 12, 0); ctx.lineTo(i * 12 + 8, 0); ctx.lineTo(i * 12 + 8 + 90, 90); ctx.lineTo(i * 12 + 90, 90); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = '#4d5049'; ctx.fillRect(14, 14, 62, 62);
      // scaffold beams
      ctx.strokeStyle = '#9aa08f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(18, 18); ctx.lineTo(72, 72); ctx.moveTo(72, 18); ctx.lineTo(18, 72); ctx.stroke();
      ctx.strokeRect(20, 20, 50, 50);
      // crane arm swings with frame
      ctx.save(); ctx.translate(45, 45); ctx.rotate(frame * 0.5);
      ctx.fillStyle = '#e2b93b'; ctx.fillRect(-3, -40, 6, 40); ctx.fillRect(-10, -42, 20, 6);
      ctx.restore();
      ctx.fillStyle = '#e2b93b'; ctx.beginPath(); ctx.arc(45, 45, 6, 0, 7); ctx.fill();
    });
  }

  // ------------------------------------------------------------ enemies
  // Units face up (negative y). Drawn in olive with a red marking.

  const E_BODY = '#6e6d4c', E_DARK = '#4a4933', E_LIGHT = '#8a8961', E_RED = '#b83a2c';

  function infantry(frame) {
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      const legOff = frame ? 7 : -7;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 5, 18, 15, 0, 0, 7); ctx.fill();
      ctx.fillStyle = E_DARK; ctx.fillRect(-12, -2 + legOff, 8, 16); ctx.fillRect(4, -2 - legOff, 8, 16);
      ctx.fillStyle = E_BODY; ctx.beginPath(); ctx.ellipse(0, 0, 18, 14, 0, 0, 7); ctx.fill();
      ctx.fillStyle = E_LIGHT; ctx.beginPath(); ctx.arc(0, -2, 9, 0, 7); ctx.fill();
      ctx.fillStyle = E_DARK; ctx.beginPath(); ctx.arc(0, -2, 5, 0, 7); ctx.fill();
      ctx.fillStyle = E_RED; ctx.fillRect(-18, -4, 5, 8);
      ctx.fillStyle = '#2f3230'; ctx.fillRect(8, -32, 5, 30);
      ctx.fillStyle = E_DARK; ctx.fillRect(4, -16, 13, 7);
    });
  }

  function buggy() {
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-16, -24, 34, 52);
      ctx.fillStyle = '#222'; for (const [x, y] of [[-20, -18], [10, -18], [-20, 10], [10, 10]]) ctx.fillRect(x, y, 10, 14);
      ctx.fillStyle = E_BODY; ctx.fillRect(-13, -26, 26, 50);
      ctx.fillStyle = E_LIGHT; ctx.fillRect(-9, -22, 18, 12);
      ctx.fillStyle = '#7fb3d9'; ctx.fillRect(-9, -8, 18, 8);
      ctx.strokeStyle = E_DARK; ctx.lineWidth = 3; ctx.strokeRect(-10, 2, 20, 18);
      ctx.fillStyle = E_RED; ctx.fillRect(-13, 12, 26, 4);
      ctx.fillStyle = '#2f3230'; ctx.fillRect(-2, -34, 4, 12);
    });
  }

  function tank(big) {
    const k = big ? 1.55 : 1;
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45); ctx.scale(k, k);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-20, -22, 44, 50);
      ctx.fillStyle = '#2a2a26'; ctx.fillRect(-22, -24, 10, 48); ctx.fillRect(12, -24, 10, 48);
      ctx.fillStyle = '#4a4a44'; for (let y = -22; y < 24; y += 6) { ctx.fillRect(-21, y, 8, 3); ctx.fillRect(13, y, 8, 3); }
      ctx.fillStyle = E_BODY; ctx.fillRect(-13, -24, 26, 48);
      ctx.fillStyle = E_LIGHT; ctx.fillRect(-10, -21, 20, 8);
      ctx.fillStyle = E_DARK; ctx.beginPath(); ctx.arc(0, 2, 11, 0, 7); ctx.fill();
      ctx.fillStyle = E_BODY; ctx.beginPath(); ctx.arc(-1, 1, 9, 0, 7); ctx.fill();
      ctx.fillStyle = E_RED; ctx.fillRect(-4, 8, 8, 4);
      ctx.fillStyle = '#2f3230'; if (big) { ctx.fillRect(-7, -34, 4, 36); ctx.fillRect(3, -34, 4, 36); } else ctx.fillRect(-2, -32, 5, 34);
    });
  }

  function heli(frame) {
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      ctx.fillStyle = E_BODY; ctx.beginPath(); ctx.ellipse(0, -2, 10, 20, 0, 0, 7); ctx.fill();
      ctx.fillStyle = E_DARK; ctx.fillRect(-3, 12, 6, 24); ctx.fillRect(-10, 30, 20, 4);
      ctx.fillStyle = '#7fb3d9'; ctx.beginPath(); ctx.ellipse(0, -12, 6, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = E_RED; ctx.fillRect(-9, 0, 18, 4);
      ctx.fillStyle = '#2f3230'; ctx.fillRect(-14, -10, 3, 18); ctx.fillRect(11, -10, 3, 18);
      ctx.save(); ctx.rotate(frame * Math.PI / 4);
      ctx.strokeStyle = 'rgba(30,30,30,0.85)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.moveTo(0, -40); ctx.lineTo(0, 40); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#2f3230'; ctx.beginPath(); ctx.arc(0, -2, 4, 0, 7); ctx.fill();
    });
  }

  function wreck() {
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      ctx.fillStyle = '#3a3835'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 14, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#26241f'; ctx.fillRect(-14, -6, 12, 8); ctx.fillRect(2, 2, 14, 6);
      ctx.fillStyle = '#5a5651'; ctx.fillRect(-4, -12, 6, 10);
    });
  }

  // ------------------------------------------------------------- effects

  function explosion(frame) {
    return sheet(S, S, (ctx) => {
      ctx.translate(45, 45);
      const t = frame / 3;
      const r = 10 + t * 30;
      ctx.fillStyle = `rgba(90,90,90,${0.5 - t * 0.4})`; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, 7); ctx.fill();
      ctx.fillStyle = t < 0.7 ? '#f0862c' : '#8a5a2a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      if (t < 0.8) { ctx.fillStyle = '#ffd35c'; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, 7); ctx.fill(); }
      if (t < 0.4) { ctx.fillStyle = '#fff5c0'; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fill(); }
    });
  }

  function bullet() { return sheet(20, 20, (ctx) => { ctx.fillStyle = '#ffe28a'; ctx.beginPath(); ctx.ellipse(10, 10, 3, 6, 0, 0, 7); ctx.fill(); }); }
  function shell() { return sheet(20, 20, (ctx) => { ctx.fillStyle = '#2f3230'; ctx.beginPath(); ctx.arc(10, 10, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#f0862c'; ctx.beginPath(); ctx.arc(10, 10, 2.5, 0, 7); ctx.fill(); }); }
  function bolt() { return sheet(20, 20, (ctx) => { ctx.fillStyle = '#7fd8ff'; ctx.beginPath(); ctx.arc(10, 10, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(10, 10, 2, 0, 7); ctx.fill(); }); }
  function muzzle() { return sheet(30, 30, (ctx) => { ctx.fillStyle = '#ffd35c'; ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(22, 12); ctx.lineTo(30, 15); ctx.lineTo(22, 18); ctx.lineTo(15, 30); ctx.lineTo(8, 18); ctx.lineTo(0, 15); ctx.lineTo(8, 12); ctx.fill(); }); }

  // Generic tint: recolour an enemy sprite for boss variants
  function tinted(src, colour) {
    return sheet(src.width, src.height, (ctx) => {
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = colour; ctx.fillRect(0, 0, src.width, src.height);
    });
  }

  // --------------------------------------------------------------- build

  // Draw every sprite into a table: { key: canvas }
  function buildAll(factions) {
    const out = {};
    for (let i = 0; i < 4; i++) { out['grass' + i] = grass(11 + i * 7); out['dirt' + i] = dirt(101 + i * 13); }
    out.road0 = road(5); out.road1 = road(9);
    out.tree0 = tree(3); out.tree1 = tree(8); out.tree2 = tree(21);
    out.rock0 = rock(4); out.rock1 = rock(15);
    out.bush0 = bush(6); out.bush1 = bush(17);
    out.wall = wall();
    for (let f = 0; f < 4; f++) out['construction' + f] = construction(f);
    for (const id in factions) {
      const col = factions[id].colour;
      out['base_' + id] = towerBase(col);
      out['bunker_' + id] = bunker(col);
      for (let t = 1; t <= 7; t++) out['turret_' + id + '_' + t] = turret(col, t);
    }
    out.inf0 = infantry(0); out.inf1 = infantry(1);
    out.buggy = buggy(); out.tank = tank(false); out.boss = tank(true);
    out.heli0 = heli(0); out.heli1 = heli(1);
    out.wreck = wreck();
    for (let f = 0; f < 4; f++) out['boom' + f] = explosion(f);
    out.bullet = bullet(); out.shell = shell(); out.bolt = bolt(); out.muzzle = muzzle();
    return out;
  }

  // Register with a Phaser scene
  function install(scene, factions) {
    const all = buildAll(factions);
    for (const k in all) { if (!scene.textures.exists(k)) scene.textures.addCanvas(k, all[k]); }
    return all;
  }

  return { S, buildAll, install, tinted, setCanvasFactory(fn) { makeCanvas = fn; } };
})();
