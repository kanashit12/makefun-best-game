// Lumen Drift — a best-game-01 entry (Node 22, standard library only).
//
// The game lives in this directory's game/ folder: plain static files a
// desktop browser loads offline (game/index.html plus its ES modules, no
// library, no network request). This program hands the entry in: it checks
// the game folder is complete, copies game/ and screenshots/ beside this
// file into the output directory, and writes /output/dossier.json — the
// summary the judge reads — with the vendored make.fun library. The copy is
// byte for byte, so running it twice writes the same bytes both times.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += 1;
    if (statSync(path).isDirectory()) total += countEntries(path);
  }
  return total;
}

function handIn(): { gameEntries: number; shotCount: number } {
  const gameDir = join(repoRoot, 'game');
  const indexHtml = join(gameDir, 'index.html');
  if (!existsSync(indexHtml)) {
    throw new Error(`game/index.html is missing under ${gameDir}`);
  }
  const gameEntries = countEntries(gameDir);

  mkdirSync(outputDir, { recursive: true });
  cpSync(gameDir, join(outputDir, 'game'), { recursive: true });

  const shotsDir = join(repoRoot, 'screenshots');
  const outShots = join(outputDir, 'screenshots');
  mkdirSync(outShots, { recursive: true });
  let shotCount = 0;
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, outShots, { recursive: true });
    shotCount = readdirSync(shotsDir).filter((name) => statSync(join(shotsDir, name)).isFile()).length;
  }

  // The scorer's own caps: only text_max_bytes shapes the bytes; the other
  // caps refuse an entry the scorer would refuse (more than 4 screenshots
  // or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
  // files, in all, or a path under game/ over 1000 bytes: game/ counts
  // beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);

  return { gameEntries, shotCount };
}

const result = handIn();
console.log(
  `Lumen Drift handed in to ${outputDir}: ` +
    `${result.gameEntries} game entries, ${result.shotCount} screenshots, dossier.json written.`,
);
