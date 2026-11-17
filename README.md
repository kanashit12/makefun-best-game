[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/kanashit12/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/kanashit12/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# Lumen Drift — a lantern-keeper arcade

**An entry for [Make the best game](https://make.fun/bounty/best-game-01) on make.fun.**

You are a little lantern adrift on a glowing reef. Gather every star pearl,
chain them into combos, and outrun the ink wisps that hunt your light. Dash
*through* a wisp to burst it. Clear all 10 waves to become **Tide Master** —
then keep drifting, because the waves never end.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open
http://localhost:8080). No build step, no network request, no install — the
game is static files and plays offline.

| Control | What it does |
| --- | --- |
| WASD / arrow keys, or hold the mouse | Steer the lantern |
| SPACE (or Shift) | Dash — brief burst, brief invulnerability, bursts any wisp you pass through |
| P | Pause |
| M | Mute / unmute |
| R | Restart after game over |
| ENTER / click | Start, and keep playing after victory |

## The game

- **Goal:** clear every pearl on the reef to advance the wave; clear wave 10
  to win. Lose all 3 hearts to the wisps and the light fades.
- **Combos:** pearls gathered within 4 seconds of each other chain up to x8,
  each worth more than the last.
- **Power-ups:** pearls sometimes drop a charm — **Shield** (one free hit),
  **Magnet** (pearls fly to you, 8s), **Slow** (wisps crawl, 6s).
- **Escalation:** each wave adds pearls and faster, more numerous wisps.
- **Feedback:** particles, screen shake, floating score popups, wave banners,
  a live HUD (score, best, wave, hearts, combo meter, dash cooldown), and
  fully synthesised WebAudio sound — chimes, whooshes, and a soft ambient pad.
  No audio files, no images: every pixel and every note is drawn and played
  from code.
- **Original:** the lantern, the reef, the wisps, the names and the music are
  all our own — nothing copied from any commercial game.

## Source outline

`main.ts` (root) hands the entry in: it verifies `game/`, copies `game/` and
`screenshots/` to the output directory, and writes `dossier.json` with the
vendored `vendor/makefun-game.ts`. Run it with
`MAKEFUN_OUTPUT_DIR=out node main.ts` — two runs write identical bytes.

`game/` — the playable game, one job per file:

- `index.html` — the page: canvas, styling, and the module entry point.
- `src/main.js` — bootstrap and the fixed-step loop; the screen state machine
  (title → play ⇄ pause → over / win) and the best score in localStorage.
- `src/world.js` — the simulation: lantern physics, pearls, wisps, power-ups,
  waves, scoring, combos, collisions. Pure data and logic, no DOM or audio.
- `src/render.js` — every pixel: reef background, entities, particles, HUD,
  banners, and the title / pause / game-over / victory screens.
- `src/config.js` — all tuning numbers and the palette, in one place.
- `src/random.js` — the seeded RNG (mulberry32) behind every spawn, so a
  seed replays the same reef.
- `src/input.js` — keyboard, mouse and touch, normalised into one object.
- `src/audio.js` — WebAudio synthesis: sound effects and the ambient pad.
- `src/autopilot.js` — the pilot that plays the game for the screenshots.
- `src/shots.js` — the four screenshot scenes (`?shot=start|play|end|win`),
  each played forward under the real rules from a fixed seed.

`screenshots/` holds four real renders of the game's own code: the title
screen, mid-game play, game over, and the victory screen.

## License

MIT — see [LICENSE](LICENSE).
