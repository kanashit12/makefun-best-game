// Lumen Drift — the screenshot scenes behind ?shot=start|play|end|win. Each one
// plays the real rules forward from a fresh world for a fixed number of steps,
// steered by the autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame. The win scene plays carefully
// until wave 10 clears; the end scene plays recklessly until the light fades.
// (game/src/shots.js)
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { autopilot } from './autopilot.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 600;

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. Unknown names stage the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, autopilot(world, true));
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      if (world.step(STEP, autopilot(world, true)) & EVENT_OVER) break;
    }
    return { screen: world.over ? SCREEN_OVER : SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      if (world.step(STEP, autopilot(world, false)) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.score };
  }
  // Win: careful play until the tenth wave clears.
  for (let i = 0; i < WIN_LIMIT_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, autopilot(world, true));
    if (events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
  }
  return { screen: world.won ? SCREEN_WIN : SCREEN_PLAY, best: world.score };
}
