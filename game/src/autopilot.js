// Lumen Drift — the autopilot that plays the game for the screenshot scenes.
// It steers the real world with the real rules (no cheats, no teleports): chase
// the nearest pearl, keep clear of the nearest wisp, dash through a wisp that
// gets too close. A reckless pilot ignores the wisps entirely, which is how the
// game-over scene is earned honestly.
// (game/src/autopilot.js)
import { FIELD } from './config.js';

/** Steer toward (tx, ty) while dodging (ox, oy) when it is near. */
function steer(world, tx, ty, dodge) {
  const p = world.player;
  let dx = tx - p.x;
  let dy = ty - p.y;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d;
  dy /= d;
  if (dodge) {
    const { wisp, d: wd } = world.nearestWisp();
    if (wisp && wd < 150) {
      // Flee, blended with a sideways swerve so we do not back into a wall.
      const fx = (p.x - wisp.x) / wd;
      const fy = (p.y - wisp.y) / wd;
      const side = (p.x < FIELD.width / 2 ? 1 : -1) * 0.5;
      const w = Math.min(1, (150 - wd) / 90);
      dx = dx * (1 - w) + (fx + side * 0.4) * w;
      dy = dy * (1 - w) + fy * w;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
    }
  }
  return { x: dx, y: dy };
}

/**
 * One step of input for the world: {x, y, dash, pointer}.
 * `careful` pilots dodge wisps and dash to escape; reckless ones chase pearls
 * and never dash, and so get caught as the waves speed up.
 */
export function autopilot(world, careful) {
  const p = world.player;
  const pearl = world.nearestPearl();
  const tx = pearl ? pearl.x : FIELD.width / 2;
  const ty = pearl ? pearl.y : FIELD.height / 2;
  const dir = steer(world, tx, ty, careful);
  let dash = false;
  if (careful) {
    const { d: wd } = world.nearestWisp();
    if (wd < 62 && p.dashCool <= 0) dash = true;
    // Never dash into a wall: if we are cornered, dash along the wall instead.
    if (dash && (p.x < 70 || p.x > FIELD.width - 70 || p.y < 110 || p.y > FIELD.height - 70)) {
      dash = false;
    }
  }
  return {
    x: dir.x,
    y: dir.y,
    dash,
    pointer: { x: p.x, y: p.y, down: false, seen: false },
  };
}
