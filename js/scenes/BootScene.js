// Loads the art pack, then hands over to the menu.
// Art: Kenney "Tower Defense (top-down)", game icons, board game icons and
// UI pack, all CC0 (public domain). https://kenney.nl

window.TD = window.TD || {};

TD.IMAGES = ['grass', 'grass2', 'dirt', 'stone', 'stone2', 'crater', 'crater2', 'crater3', 'flash',
  'tree_big', 'bush', 'plant', 'tree_round', 'shrub', 'rock_s', 'rock_l', 'rock_m',
  'plate', 'plate2', 'plate3', 'plate_diamond', 'wrench_frame', 'frame',
  'turret_226', 'turret_227', 'turret_228', 'turret_229', 'turret_203', 'turret_204', 'turret_205', 'turret_206',
  'soldier_grey', 'soldier_red', 'soldier_green', 'mini_tank_red', 'mini_tank_green',
  'tank_tan', 'tank_gun_tan', 'tank_green', 'tank_gun_green', 'plane_grey', 'plane_shadow', 'plane_green', 'plane_shadow2',
  'coin', 'bullet_small', 'bullet_orange', 'bullet_grey', 'missile_s', 'missile_l',
  'flame_295', 'flame_296', 'flame_297', 'flame_298'];
TD.UI_IMAGES = ['fastForward', 'audioOn', 'audioOff', 'wrench', 'trashcan', 'cross', 'star', 'trophy', 'home', 'pause',
  'checkmark', 'exclamation', 'target', 'next', 'information', 'shield', 'sword', 'hourglass', 'crown', 'flag', 'btn', 'btn_border', 'btn_sq'];

TD.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const { W, H } = TD.LAYOUT;
    const bar = this.add.rectangle(W / 2, H / 2, 10, 14, 0xffffff);
    this.add.text(W / 2, H / 2 - 30, 'Loading', { fontFamily: TD.FONT, fontSize: '22px', color: '#ffffff' }).setOrigin(0.5);
    this.load.on('progress', (p) => bar.setSize(300 * p, 14));
    for (const k of TD.IMAGES) this.load.image(k, 'assets/img/' + k + '.png');
    for (const k of TD.UI_IMAGES) this.load.image('ui_' + k, 'assets/ui/' + k + '.png');
  }
  create() {
    TD.buildTintedTextures(this);
    this.scene.start('Menu');
  }
};

TD.makeCanvas = function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// Make a recoloured copy of a texture (multiply tint, alpha preserved).
// Done once at load so the game never relies on per-sprite tinting.
TD.tintTexture = function (scene, srcKey, colour, newKey) {
  if (scene.textures.exists(newKey)) return;
  const src = scene.textures.get(srcKey).getSourceImage();
  const cv = TD.makeCanvas(src.width, src.height);
  const ctx = cv.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
  const r = (colour >> 16) & 255, g = (colour >> 8) & 255, b = colour & 255;
  for (let i = 0; i < d.length; i += 4) { d[i] = (d[i] * r) / 255; d[i + 1] = (d[i + 1] * g) / 255; d[i + 2] = (d[i + 2] * b) / 255; }
  ctx.putImageData(img, 0, 0);
  scene.textures.addCanvas(newKey, cv);
};

TD.buildTintedTextures = function (scene) {
  for (const id in TD.FACTIONS) {
    // lighten the faction colour so the turret shading survives the multiply
    const c = TD.FACTIONS[id].colour;
    const lift = (v) => Math.round(v + (255 - v) * 0.4);
    const col = (lift((c >> 16) & 255) << 16) | (lift((c >> 8) & 255) << 8) | lift(c & 255);
    for (const k of ['turret_226', 'turret_227', 'turret_203', 'turret_228', 'turret_204', 'turret_205', 'turret_206', 'turret_229']) TD.tintTexture(scene, k, col, k + '_' + id);
    TD.tintTexture(scene, 'ui_flag', col, 'flag_' + id);
  }
  TD.tintTexture(scene, 'wrench_frame', 0xf2c94c, 'site');
  TD.tintTexture(scene, 'grass', 0xd6e8cc, 'grass_a');
  TD.tintTexture(scene, 'grass2', 0xd6e8cc, 'grass_b');
  TD.tintTexture(scene, 'grass', 0xc4dbbd, 'grass_c');
  TD.tintTexture(scene, 'soldier_grey', 0xd9d2a6, 'e_inf');
  TD.tintTexture(scene, 'tank_tan', 0xc9bd92, 'e_tank');
  TD.tintTexture(scene, 'tank_gun_tan', 0xc9bd92, 'e_tank_gun');
  TD.tintTexture(scene, 'plane_grey', 0xd0d0d0, 'e_heli');
  TD.tintTexture(scene, 'tank_tan', 0xd47a6a, 'e_boss');
  TD.tintTexture(scene, 'tank_gun_tan', 0xd47a6a, 'e_boss_gun');
  TD.tintTexture(scene, 'ui_crown', 0xffd166, 'crown_gold');
};
