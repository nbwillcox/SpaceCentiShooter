# SpaceCentiShooter

A free, retro-flavored space shooter with modern neon graphics and a head nod to classic centipede-style arcade games. Hold the bottom of the screen, crack the Hive Serpent as it zigzags down through a field of crystals, and take down giant armored Serpent Mothers.

**Play it in your browser:** https://nbwillcox.github.io/SpaceCentiShooter/

Everything is generated in code: sprites are vector-drawn on the fly, and all sound effects and music are synthesized with the Web Audio API. There are no image or audio files and no build step. A sibling of [SpaceGalaShooter](https://github.com/nbwillcox/SpaceGalaShooter), with the same look and feel.

## Controls

| Action | Keys |
| --- | --- |
| Move (free 2D in the bottom zone) | Arrow keys or `W` `A` `S` `D`, or just move the mouse |
| Fire (hold to auto-fire) | `Space` or left mouse button |
| Smart bomb | `B`, `X` or right mouse button |
| Pause | `P` or `Esc` |

## Gameplay

- The **Hive Serpent** is a chain of segments that zigzags down through the crystal field, turning at every crystal and dropping a row. Shoot a segment and it leaves a crystal behind and the chain splits: the piece behind becomes a new head. Heads are worth more.
- Every level brings **more centipedes**: extra full chains entering from both sides, a growing swarm of solo heads, and more speed.
- Once the chain reaches your zone it bounces up and down inside it, and extra solo heads sneak in from the sides. Touching anything dangerous costs a life.
- **Crystals** crack over 4 hits. The field fully resets every level: your zone is cleared, damaged crystals repair themselves for bonus points, and destroyed ones regrow, with a denser field each level.
- **Pests** (more of them, more often, as levels climb):
  - **Skitter:** zigzags through your zone eating crystals. Worth more the closer you shoot it.
  - **Dropper:** falls straight down, seeding new crystals.
  - **Venom drone:** crosses sideways poisoning crystals. A chain that bumps poison plunges straight to the bottom.
  - **Thief:** steals a power-up on contact and flees. Shoot it down to get the loot back.
- **Power-ups** drop from glowing carrier segments and bosses:
  - **W** weapon tier: single → double → spread → piercing lances (a hit drops you one tier)
  - **D** wingman drone (up to 2)
  - **S** shield bubble
  - **B** smart bomb
- Chain kills for a score multiplier (up to x8) and clear a level without being hit for a Perfect bonus.
- Every 5th level is a **Serpent Mother**: a giant armored chain weaving across the field. Shoot its armor plates off one at a time, then destroy the head's exposed core. Five unique bosses, scaling up each loop.
- Local top-10 high scores with arcade-style 3-letter initials (stored in your browser).

## Run locally

It is plain HTML/CSS/JS. Either open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
```

then visit http://localhost:8000. Desktop browsers with keyboard/mouse only for now.

## License and attribution

Licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): free to play, share and remix **non-commercially**, as long as you give credit and **link back to this repository**: https://github.com/nbwillcox/SpaceCentiShooter

This is an original game inspired by classic arcade shooters. It uses no assets, names or code from any existing game.
