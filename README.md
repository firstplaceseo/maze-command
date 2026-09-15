# Maze Command

An endless maze tower defence game for the phone. Enemies enter at the top and run for the exit at the bottom. You build towers and walls to force a long path, then upgrade towers to hold the line. Four factions, waves that never stop.

## Put it on your iPhone (no computer needed)

You will use the GitHub website in Safari. It works on a phone, it is just a bit fiddly. Turn your phone sideways for the upload step.

1. Go to github.com and sign in (or create a free account).
2. Tap the + in the top right, then "New repository".
3. Name it `maze-command`, leave it Public, tick "Add a README file", tap "Create repository".
4. On the repository page tap "Add file" then "Upload files". If you do not see it, tap the "aA" icon in Safari's address bar and choose "Request Desktop Website".
5. Upload every file from this zip. Keep the folder structure: `index.html`, `manifest.json`, `icon.png`, `README.md`, and the whole `js` folder. On iPhone you may have to upload folder contents one folder at a time. When you upload files from inside `js/data`, GitHub will put them at the top level, so instead use the "Create new file" trick: type `js/data/factions.js` as the filename and paste the contents. Typing a slash in the filename makes the folder.
6. Tap "Commit changes".
7. Tap "Settings" (the cog tab), then "Pages" in the left menu. Under "Build and deployment" set Source to "Deploy from a branch", branch `main`, folder `/ (root)`. Tap Save.
8. Wait about a minute, then open `https://YOUR-USERNAME.github.io/maze-command/` in Safari.
9. Tap the Share button, then "Add to Home Screen". The game now opens full screen from its own icon.

If step 5 is painful on the phone, the alternative is to give me a GitHub personal access token (Settings, Developer settings, Personal access tokens, with "repo" permission) and I will upload the files for you.

## How the project is laid out

```
index.html            loads Phaser and the game files
manifest.json         makes "Add to Home Screen" work like an app
icon.png              home screen icon
js/main.js            screen size, colours, saved best waves, starts Phaser
js/data/factions.js   the four factions and their 7 tower tiers (edit to rebalance)
js/data/waves.js      waves 1 to 35, the endless wave generator, economy, difficulty
js/core/grid.js       the grid and pathfinding (no Phaser, plain logic)
js/core/sfx.js        synthesised sound effects (no audio files)
js/art/sprites.js     every sprite, drawn in code at load time (no image files)
js/scenes/MenuScene.js   faction and difficulty picker
js/scenes/GameScene.js   the game itself
docs/                 the data extracted from the original System TD map
```

Balance lives in the two data files. You do not need to touch the scenes to change costs, damage, wave sizes or how fast endless mode ramps up.

## How endless mode stays fair

Waves 1 to 35 are hand made (converted from the System TD map). After that, waves are generated: hp grows 7% per wave, armour rises slowly, count varies, every 5th wave flies, every 10th is a boss. A check compares each generated wave's "toughness per gold the player could have earned" with the hardest hand made wave. If a wave would be tougher than that, its hp is scaled down. So the difficulty keeps rising with your income rather than running away from it. Towers past tier 7 can be overclocked forever, so there is always something to buy.

## Roadmap ideas

- Second tower line per faction (support and specialist towers)

- Sound and music
- More than one tower line per faction (support towers, walls with abilities)
- Multiple maps with different spawn and exit positions
- Achievements and a global leaderboard
- Wrap with Capacitor for an App Store release (same code)
