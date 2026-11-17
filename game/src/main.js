// Lumen Drift — bootstrap and the game loop. Owns the screen state machine
// (title → play ⇄ pause → over / win), the fixed-step loop, the best score in
// localStorage, and the ?shot= staging used for screenshots. The rules live in
// world.js, the pixels in render.js; this file only wires them together.
// (game/src/main.js)
import { FIELD, STEP } from './config.js';
import { World, EVENT_OVER, EVENT_WIN } from './world.js';
import { render, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER, SCREEN_WIN } from './render.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;

const world = new World(seed);
const input = makeInput(canvas);
const audio = makeAudio();
let screen = SCREEN_TITLE;
let muted = false;

const BEST_KEY = 'lumen-drift-best';
function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* private mode: the score just lives for this visit */
  }
}
world.best = loadBest();

function startGame() {
  audio.unlock();
  world.reset();
  world.best = loadBest();
  world.setBanner('WAVE 1', 'Gather every pearl — mind the wisps', 1.8);
  screen = SCREEN_PLAY;
}

function endGame() {
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
  screen = SCREEN_OVER;
}

function winGame() {
  if (world.score > world.best) {
    world.best = world.score;
    saveBest(world.best);
  }
  screen = SCREEN_WIN;
}

function continueEndless() {
  world.won = false;
  world.setBanner('ENDLESS DRIFT', 'The waves never end — how far can you go?', 2.0);
  screen = SCREEN_PLAY;
}

// Screenshot mode: stage one fixed scene, draw it once, and stop. The frame
// is a real frame of the game, and the same seed always stages the same one.
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, world);
  screen = staged.screen;
  world.best = staged.best;
  render(ctx, world, screen, false);
} else {
  let last = performance.now();
  let acc = 0;
  let prevPause = false;
  let prevMute = false;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    const sampled = input.sample();

    if (sampled.mute && !prevMute) muted = audio.toggleMute();
    prevMute = sampled.mute;
    if (sampled.pause && !prevPause && screen === SCREEN_PLAY) screen = SCREEN_PAUSE;
    else if (sampled.pause && !prevPause && screen === SCREEN_PAUSE) screen = SCREEN_PLAY;
    prevPause = sampled.pause;

    if (screen === SCREEN_TITLE) {
      // The reef stays alive behind the title: stars twinkle, pearls bob.
      world.time += dt;
      world.updateParticles(dt);
      if (sampled.any) startGame();
    } else if (screen === SCREEN_PLAY) {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard < 5) {
        const events = world.step(STEP, sampled, audio);
        acc -= STEP;
        guard += 1;
        if (events & EVENT_OVER) { endGame(); break; }
        if (events & EVENT_WIN) { winGame(); break; }
      }
      if (guard >= 5) acc = 0;
    } else if (screen === SCREEN_PAUSE) {
      if (sampled.any) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER) {
      if (sampled.restart || sampled.any) startGame();
    } else if (screen === SCREEN_WIN) {
      if (sampled.restart) startGame();
      else if (sampled.any) continueEndless();
    }

    render(ctx, world, screen, muted);
  }

  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  render(ctx, world, screen, muted);
  requestAnimationFrame(frame);
}

// A handle for the console-curious; the game needs nothing from it.
window.__lumen = { world, get screen() { return screen; } };
