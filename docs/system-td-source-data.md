# System TD - extracted game data

Source: System_TD_v103_06_Beta_COVERFIX2.w3x (Warcraft III map by DerPlayer & GER000000). Pulled from the map's unit table and script. Use as the starting balance sheet for the Godot rebuild.

## Core rules

- 35 waves. One enemy type per wave. Every 5th wave is a flying wave (towers that cannot hit air are useless that round).
- Wave 35 is a boss (120,000 HP, 50 armour, fast, flying). Only one spawns.
- Lives: Easy 50, Normal 25, Hard 10, Perfect 1. Each enemy that reaches the exit costs 1 life.
- First wave starts after 60 seconds. Every wave after that starts 15 seconds after the previous wave is fully dead.
- Starting gold: 10 (script sets 10 at init; a later block gives 560 in a special mode, treat 10 as the true start).
- End of wave bonus: starts at 10 gold and rises by 2 every wave (wave 1 pays 12, wave 2 pays 14, and so on).
- Kill reward: see the wave table. It steps up at waves 5, 10, 15 and 20.
- Selling a tower refunds 75% of its price.
- A special resource ("lumber", 1 unit) is handed out at wave 25. Each tower family has one super tower that costs 750 gold plus that 1 lumber. So the player gets exactly one super tower.
- Maze rule: towers can be placed anywhere on the buildable area. Enemies always take the shortest open route from spawn to exit. Towers cannot fully block the path.
- Enemies have no attack. They only walk. All tower HP values can be ignored.

## Converting Warcraft numbers to a phone game

- Range is in Warcraft units. One tower footprint is about 128 units. The "cells" column below divides by 128 so you can think in grid squares.
- Speed is also Warcraft units per second. 320 is a normal walk (about 2.5 cells per second). The script overrides enemy speed per wave, that is the "speed" column in the wave table.
- Damage is shown as a min to max roll. Use the midpoint if you want a flat number.
- Cooldown is seconds between shots. Blank means the map's default (about 1.0 s).
- Armour reduces damage. Warcraft formula: damage taken = damage x (1 - (0.06 x armour) / (1 + 0.06 x armour)). So 10 armour cuts damage by about 37%.

## Tower families (8 families, 7 towers each)

Each family is a builder unit that unlocks a ladder of towers. In the rebuild these become 8 tabs in the build menu. The 7th tower in each family is the 750 gold + 1 lumber super tower (800 to 900 damage, huge range, single target).


### Computer Dudes


| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Mark Zuckerberg | 10 | 27 | 4.7 | 1.00 | +Cheap ~Medium range -Low damage |
| Steve Ballmer | 25 | 38 | 5.1 | 0.80 | +High damage +Fast attack speed ~Medium range |
| Steve Jobs | 75 | 65 to 85 | 5.5 | 0.90 | +High damage +Fast attack speed +Splash |
| Steve Wozniak | 150 | 94 to 106 | 7.4 | - | +High damage +Fast attack speed ~Medium range |
| Bill Gates | 200 | 127 to 183 | 7.4 | - |  |
| Jeff Bezos | 425 | 206 to 236 | 7.8 | 0.29 | +High damage +Very fast attack +Freezing attack +Little splash |
| Elon Musk | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 | +Most damage in System TD. +Very fast Speed -Hit only 1 unit at time |

### Antivirus
The door to the magical place named WORLD WIDE WEB. 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Chinese Noname Antivirus | 10 | 10 | 5.1 | 0.85 |  |
| Microsoft Defender | 52 | 36 to 60 | 5.1 | 0.40 | +OK damage +Splash attack -Decent attack speed |
| Avira Antivirus | 125 | 70 to 115 | - | 0.40 |  |
| avast! Antivirus | 150 | 144 to 172 | 10.9 | 1.30 | +High damage +High range +Splash -Slow attack speed |
| Norton Antivirus | 250 | 184 to 208 | 5.1 | 0.40 | +High damage +Fast attack speed +Splash -Weak range |
| McAfee Antivirus | 350 | 306 to 336 | 4.7 | 0.30 | +Very high damage +Very fast attack speed +Splash attack -Medium range |
| Kaspersky Antivirus | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 | +Most DMG in the game +Very fast attack speed -Single Target |

### Browser


| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Netscape | 10 | 14 | 4.7 | 0.75 | ~Medium range ~Medium speed -Low damage |
| Internet Explorer | 35 | 23 | 2.3 | 0.30 | ~Medium Damage ~Medium attack speed |
| Safari | 75 | 46 to 70 | 5.9 | - |  |
| Opera | 120 | 91 | 7.0 | 0.70 | +High damage +Very fast speed +Slow poison |
| Mozilla FIrefox | 250 | 131 to 179 | 8.6 | 0.50 | +Great range +High damage +Splash |
| Google Chrome | 400 | 402 to 450 | 3.5 | 0.25 | +Very fast speed +High damage |
| Self-made Browser | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 |  |

### Security Essentials
The Swiss army knifes for every computer user. 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Websites Filter | 10 | 14 | 7.8 | 0.90 | ~Medium damage ~Medium range |
| Firewall | 40 | 27 | 10.9 | 1.00 | +Good damage +Long range +Slow enemy |
| VPN | 90 | 80 to 110 | 11.7 | 0.90 | +Very high damage +High range ~Medium attack speed |
| RAID | 135 | 78 to 150 | 3.5 | 0.20 | +Very fast attack speed +High damage -Short range |
| DMZ | 200 | 111 to 125 | 10.9 | 0.70 | +Good range +Good damage +Splash |
| Tor Browser | 350 | 301 to 400 | 9.4 | - | +Fast attack speed +Splash ~Medium range |
| Two-Factor Authentication | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 | +Most damage in System TD. +Very fast Speed -Hit only 1 unit at time |

### IT Team
Have you tried turning it off and on again? 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Indian Support Hotline | 7 | 9 to 10 | 4.3 | 1.00 | +Cheap for maze -Little range -Low damage |
| Sales Dude | 40 | 65 to 85 | 10.9 | 1.20 |  |
| Developer | 75 | 80 to 115 | 3.9 | 0.45 |  |
| Administrator | 120 | 89 to 113 | 7.8 | 0.50 |  |
| Scrum Master | 250 | 158 to 230 | 9.4 | 1.20 | +Very high damage +Very fast speed -Decent range. |
| Dev-Ops | 400 | 308 to 380 | 5.5 | 0.50 |  |
| CEO | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 |  |

### Hacker Team
3..2..1... and your Bitcoins are gone! 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Script Kiddie | 14 | 16 to 24 | - | 0.70 | +High attack speed +Best first tower ~Medium range |
| DDoS Dude | 55 | 32 to 48 | 7.8 | 0.40 | +Long range +Fast speed -Low damage |
| Bug Hunter | 135 | 105 to 125 | 5.3 | 0.50 | +Good damage +Splash ~Medium range |
| Social Engineer | 200 | 109 to 137 | 11.7 | 0.50 | +Long range +High damage +Medium attack speed |
| Malware Developer | 265 | 236 to 266 | 7.4 | 0.85 | +High damage ~medium range |
| Backdoor Finder | 450 | 356 to 410 | - | 0.45 | +Splash damage +Fast attack speed -Very low range |
| Goverment | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 | +Most damage in System TD. +Very fast Speed -Hit only 1 unit at time |

### Software Developer
I swear my code compiled on first try; 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| Java Developer | 10 | 24 to 36 | 5.1 | 1.40 | +High damage -Slow attack speed -Low range |
| HTML Developer | 45 | 64 to 76 | 5.1 | 1.20 | +Very fast speed -Light damage -Little range |
| Old Delphi Developer | 85 | 97 to 139 | 5.5 | 1.20 | +Splash +High attack speed ~Medium range |
| Python Developer | 160 | 147 to 189 | 5.9 | 0.90 | +Siege +High attack speed +High range |
| C# Developer | 225 | 207 to 263 | 7.8 | 0.80 | +Very fast +Great range +Pierce damage |
| C++ Developer | 500 | 510 to 600 | 7.8 | 0.40 | +Insane Damage +Fast speed |
| Assembler Guru | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 | +Most damage in System TD +Very fast speed -Hits only 1 unit at time |

### Websites
Thank you CERN for the WORLD WIDE WEB 

| Tower | Gold | Damage | Range (cells) | Cooldown (s) | Notes |
|---|---|---|---|---|---|
| www.yahoo.com | 10 | 22 | 4.3 | 1.00 | +Splash ~Medium damage -Low range |
| www.bing.com | 30 | 34 to 46 | 7.8 | 0.80 | +Slow poison ~Medium damage ~Medium range ~Mediumattack speed |
| www.youtube.com | 75 | 96 to 138 | 4.7 | - | +Most damage in System TD. +Very fast Speed -Hit only 1 unit at time |
| www.pornhub.com | 200 | 120 to 155 | 9.4 | 0.45 | +Strong damage +Very fast attack -Decent range |
| www.amazon.com | 265 | 256 to 286 | 3.9 | 0.90 | +Very high damage ~Medium attack speed -Low range |
| www.google.com | 400 | 388 to 452 | 15.6 | 0.50 | +Very high range +High damage ~Medium attack speed |
| www.wikipedia.org | 750 +1 lumber | 801 to 900 | 23.4 | 0.00 |  |

## Wave table (35 waves)

Spawn count is per lane for one player. For a solo phone game use column A as the number of enemies in the wave.

| Wave | Enemy | HP | Armour | Speed | Flying | Count (A) | Gold per kill |
|---|---|---|---|---|---|---|---|
| 1 | Windows 95 | 30 | 1 | 350 |  | 6 | 1 |
| 2 | System Freezing Malware | 110 | 1 | 350 |  | 6 | 1 |
| 3 | Simple Virus | 150 | 2 | 350 |  | 6 | 1 |
| 4 | Doom Floppy | 210 | 3 | 350 |  | 6 | 1 |
| 5 | Windows 98 | 250 | 3 | 300 | yes | 10 | 2 |
| 6 | Intel Pentium | 340 | 8 | 500 |  | 11 | 2 |
| 7 | Pirated Software | 350 | 5 | 500 |  | 11 | 2 |
| 8 | Playstation 2 | 400 | 8 | 500 |  | 11 | 2 |
| 9 | Nvidia Geforce | 425 | 6 | 500 |  | 11 | 2 |
| 10 | Windows XP | 650 | 5 | 325 | yes | 12 | 3 |
| 11 | AMD Athlon | 565 | 6 | 650 |  | 11 | 3 |
| 12 | Spam Mail | 700 | 7 | 650 |  | 11 | 3 |
| 13 | BonziBuddy | 670 | 7 | 650 |  | 11 | 3 |
| 14 | AMD Radeon | 800 | 8 | 650 |  | 11 | 3 |
| 15 | Mac OS X | 890 | 6 | 350 | yes | 13 | 4 |
| 16 | Intel Core Duo | 925 | 9 | 750 |  | 13 | 4 |
| 17 | Nintendo Gamecube | 1,150 | 9 | 750 |  | 13 | 4 |
| 18 | RAM | 1,250 | 10 | 750 |  | 13 | 4 |
| 19 | Warcraft III | 1,360 | 10 | 750 |  | 13 | 4 |
| 20 | Windows 7 | 1,075 | 8 | 400 | yes | 14 | 5 |
| 21 | Steam | 1,900 | 11 | 850 |  | 14 | 5 |
| 22 | Trojan Horse | 2,100 | 12 | 850 |  | 14 | 5 |
| 23 | Bluescreen of Death (BsoD) | 2,370 | 12 | 850 |  | 14 | 5 |
| 24 | Computer Worm | 2,855 | 12 | 850 |  | 14 | 5 |
| 25 | Windows 10 | 2,500 | 14 | 450 | yes | 15 | 5 |
| 26 | Intel i7 CPU | 3,500 | 14 | 950 |  | 14 | 5 |
| 27 | RAR Archive | 3,835 | 16 | 950 |  | 14 | 5 |
| 28 | beat_it.mp3.exe | 4,200 | 17 | 950 |  | 14 | 5 |
| 29 | AMD FX CPU | 5,800 | 20 | 950 |  | 14 | 5 |
| 30 | GNU/Linux | 5,400 | 15 | 500 | yes | 15 | 5 |
| 31 | AMD Ryzen CPU | 5,900 | 23 | 1000 |  | 14 | 5 |
| 32 | Ramsonware | 6,900 | 24 | 1000 |  | 14 | 5 |
| 33 | Nvidia Geforce RTX | 8,200 | 24 | 1000 |  | 14 | 5 |
| 34 | Temple OS | 9,400 | 24 | 1000 |  | 14 | 5 |
| 35 | Your mom | 120,000 | 50 | 250 | yes | 1 | 0 |

## What to keep, change or drop for iPhone

Keep:
- The 35 wave curve, the every-5th-wave air rule, the boss finale, the 15 second wave gap, 75% sell back.
- The economy (kill gold + rising wave bonus). It is tight early which forces good mazing.
- 7 tower ladder per family with a single one-off super tower.

Change:
- 8 families x 7 towers is 56 towers. Too many for a first version and too many for a thumb. Start with 2 families (Antivirus and Hacker Team give a nice mix) and add more as updates.
- Warcraft had 9 players and 12 spawn lanes. Use one spawn, one exit, one grid.
- The map has separate "buy a new tower" rather than "upgrade in place". You asked for upgrades, so make each family a single tower that upgrades through its 7 tiers, paying the price difference each time.

Drop:
- The tower names and jokes are the map author's, and several are rude or use real people and brands. Rename everything for the App Store.
- All 3D models and sounds are copyrighted (Warcraft and custom). None can be reused.
