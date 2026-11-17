// Lumen Drift — every pixel the player sees. Canvas 2D only, no images: the
// reef, the lantern, the wisps and the HUD are all drawn from the world state,
// so a screenshot is always a true frame of the game. Screens are drawn here
// too (title, pause, game over, victory), over the live world behind them.
// (game/src/render.js)
import { FIELD, PLAYER, PEARL, WISP, POWERUP, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif';
const DISPLAY = 'Georgia, "Times New Roman", serif';

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  g.addColorStop(0, PALETTE.deep);
  g.addColorStop(0.55, PALETTE.mid);
  g.addColorStop(1, PALETTE.teal);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  for (const n of world.nebulae) {
    ctx.globalAlpha = 0.16;
    glowCircle(ctx, n.x, n.y, n.r, `hsl(${n.hue} 80% 55%)`, 1);
  }
  ctx.globalAlpha = 1;

  for (const s of world.stars) {
    const tw = 0.45 + 0.55 * Math.sin(world.time * s.speed + s.phase);
    ctx.globalAlpha = 0.25 + 0.55 * tw * (0.5 + s.layer * 0.25);
    ctx.fillStyle = s.layer === 2 ? '#cfe8ff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPearls(ctx, world) {
  for (const pearl of world.pearls) {
    const bob = Math.sin(world.time * 2 + pearl.phase) * 3;
    const pulse = 0.75 + 0.25 * Math.sin(world.time * 3 + pearl.phase);
    const y = pearl.y + bob;
    glowCircle(ctx, pearl.x, y, PEARL.radius * 3.2, 'rgba(255,209,102,0.55)', 0.5 * pulse);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(pearl.x, y, PEARL.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.goldSoft;
    ctx.beginPath();
    ctx.arc(pearl.x - 2.5, y - 2.5, PEARL.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPowerups(ctx, world) {
  for (const u of world.powerups) {
    const bob = Math.sin(world.time * 2.4 + u.phase) * 3;
    const y = u.y + bob;
    const color = u.kind === 'shield' ? PALETTE.shield : u.kind === 'magnet' ? PALETTE.magnet : PALETTE.slow;
    glowCircle(ctx, u.x, y, POWERUP.radius * 3, color, 0.45);
    ctx.fillStyle = 'rgba(10,14,39,0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(u.x, y, POWERUP.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.kind === 'shield' ? 'S' : u.kind === 'magnet' ? 'M' : 'T', u.x, y + 0.5);
  }
}

function drawWisps(ctx, world) {
  for (const w of world.wisps) {
    const wob = Math.sin(w.wobble) * 2;
    glowCircle(ctx, w.x, w.y, WISP.radius * 3, 'rgba(182,120,240,0.4)', 0.55);
    ctx.fillStyle = PALETTE.ink;
    ctx.beginPath();
    for (let i = 0; i <= 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const r = WISP.radius + Math.sin(a * 3 + w.wobble) * 2.5 + wob * 0.4;
      const x = w.x + Math.cos(a) * r;
      const y = w.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.wisp;
    ctx.beginPath();
    ctx.arc(w.x, w.y, WISP.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    // Two pale eyes, always watching the lantern.
    const dx = world.player.x - w.x;
    const dy = world.player.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    const ex = (dx / d) * 3;
    const ey = (dy / d) * 3;
    ctx.fillStyle = '#f4eaff';
    ctx.beginPath();
    ctx.arc(w.x - 4.5 + ex, w.y - 2 + ey, 2.6, 0, Math.PI * 2);
    ctx.arc(w.x + 4.5 + ex, w.y - 2 + ey, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const blink = p.invulnT > 0 && Math.floor(world.time * 14) % 2 === 0 && p.dashT <= 0;
  // Trail.
  for (const t of p.trail) {
    const a = Math.max(0, t.life / 0.35) * 0.35;
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(t.x, t.y, PLAYER.radius * 0.45 * (t.life / 0.35), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (blink) return;
  glowCircle(ctx, p.x, p.y, PLAYER.radius * 4.4, 'rgba(110,243,255,0.5)', 0.75);
  glowCircle(ctx, p.x, p.y, PLAYER.radius * 2.2, 'rgba(255,243,196,0.85)', 0.9);
  // Lantern body.
  ctx.fillStyle = PALETTE.lantern;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8a33d';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Flame core, leaning with travel.
  const fx = Math.cos(p.angle) * 3;
  const fy = Math.sin(p.angle) * 3;
  ctx.fillStyle = '#ff9d2e';
  ctx.beginPath();
  ctx.arc(p.x + fx, p.y + fy, PLAYER.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff8dd';
  ctx.beginPath();
  ctx.arc(p.x + fx, p.y + fy, PLAYER.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // Shield bubble.
  if (p.shield) {
    ctx.strokeStyle = PALETTE.shield;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(world.time * 5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Dash streak.
  if (p.dashT > 0) {
    ctx.strokeStyle = 'rgba(110,243,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.angle) * 34, p.y - Math.sin(p.angle) * 34);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pop of world.popups) {
    ctx.globalAlpha = Math.max(0, Math.min(1, pop.life));
    ctx.font = `bold ${pop.size}px ${FONT}`;
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;
}

function drawHearts(ctx, x, y, lives) {
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < lives ? PALETTE.heart : 'rgba(255,93,143,0.22)';
    ctx.fillText('♥', x + i * 26, y);
  }
}

function drawHud(ctx, world, muted) {
  ctx.fillStyle = 'rgba(6,10,28,0.55)';
  ctx.fillRect(0, 0, FIELD.width, 36);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText(`SCORE  ${world.score}`, 14, 19);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.dim;
  ctx.fillText(`BEST  ${Math.max(world.best, world.score)}`, 208, 20);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText(`WAVE ${Math.min(world.wave, 10)} / 10`, FIELD.width / 2, 19);
  ctx.textAlign = 'right';
  drawHearts(ctx, FIELD.width - 92, 19, world.lives);
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = muted ? PALETTE.heart : PALETTE.dim;
  ctx.textAlign = 'right';
  ctx.fillText(muted ? 'MUTED (M)' : 'M — mute', FIELD.width - 100, 19);
  // Combo meter.
  if (world.combo > 1) {
    const w = 150;
    const frac = Math.max(0, world.comboTimer / 4);
    ctx.fillStyle = 'rgba(255,209,102,0.25)';
    roundRect(ctx, 14, 42, w, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, 14, 42, w * frac, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO x${world.combo}`, 172, 46);
  }
  // Dash cooldown.
  const p = world.player;
  const dashFrac = p.dashCool <= 0 ? 1 : 1 - p.dashCool / 1.5;
  ctx.fillStyle = 'rgba(110,243,255,0.22)';
  roundRect(ctx, 14, FIELD.height - 22, 110, 8, 4);
  ctx.fill();
  ctx.fillStyle = dashFrac >= 1 ? PALETTE.cyan : 'rgba(110,243,255,0.65)';
  roundRect(ctx, 14, FIELD.height - 22, 110 * dashFrac, 8, 4);
  ctx.fill();
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(dashFrac >= 1 ? 'DASH READY — SPACE' : 'DASH…', 130, FIELD.height - 18);
  // Active effects.
  let ey = FIELD.height - 22;
  ctx.textAlign = 'right';
  ctx.font = `bold 12px ${FONT}`;
  if (p.shield) { ctx.fillStyle = PALETTE.shield; ctx.fillText('◉ SHIELD', FIELD.width - 14, ey); ey -= 18; }
  if (p.magnetT > 0) { ctx.fillStyle = PALETTE.magnet; ctx.fillText(`◎ MAGNET ${Math.ceil(p.magnetT)}s`, FIELD.width - 14, ey); ey -= 18; }
  if (p.slowT > 0) { ctx.fillStyle = PALETTE.slow; ctx.fillText(`◷ SLOW ${Math.ceil(p.slowT)}s`, FIELD.width - 14, ey); ey -= 18; }
}

function drawBanner(ctx, world) {
  const b = world.banner;
  if (!b) return;
  const a = b.t < 0.25 ? b.t / 0.25 : b.t > b.dur - 0.4 ? Math.max(0, (b.dur - b.t) / 0.4) : 1;
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 44px ${DISPLAY}`;
  ctx.fillText(b.title, FIELD.width / 2, FIELD.height / 2 - 46);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `16px ${FONT}`;
  ctx.fillText(b.sub, FIELD.width / 2, FIELD.height / 2 - 8);
  ctx.globalAlpha = 1;
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(5,8,24,${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function centreText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, FIELD.width / 2, y);
}

function drawTitle(ctx, world) {
  overlay(ctx, 0.55);
  glowCircle(ctx, FIELD.width / 2, 150, 190, 'rgba(110,243,255,0.25)', 0.8);
  centreText(ctx, 'LUMEN DRIFT', 138, `bold 72px ${DISPLAY}`, PALETTE.lantern);
  centreText(ctx, 'a lantern-keeper arcade', 182, `italic 20px ${DISPLAY}`, PALETTE.cyan);
  centreText(ctx, 'Gather every star pearl. Outrun the ink wisps.', 248, `17px ${FONT}`, PALETTE.text);
  centreText(ctx, 'Dash THROUGH a wisp to burst it  •  Chain pearls for combos', 276, `15px ${FONT}`, PALETTE.dim);
  centreText(ctx, 'Steer: WASD / arrows / hold mouse   •   Dash: SPACE', 316, `15px ${FONT}`, PALETTE.text);
  centreText(ctx, 'S — shield   M — magnet   T — slow time   •   P pause   •   M mute', 342, `15px ${FONT}`, PALETTE.dim);
  centreText(ctx, 'Clear 10 waves to become Tide Master.', 380, `15px ${FONT}`, PALETTE.gold);
  if (promptVisible(world)) {
    centreText(ctx, '— press ENTER or click to play —', 448, `bold 19px ${FONT}`, PALETTE.text);
  }
  if (world.best > 0) centreText(ctx, `best score  ${world.best}`, 488, `15px ${FONT}`, PALETTE.dim);
}

function promptVisible(world) {
  // On for 2.1s of every 3s: gentle in live play, and on at each staged
  // screenshot time, so the call to action is never blinked away in a shot.
  return (world.time % 3) < 2.1;
}

function drawPause(ctx) {
  overlay(ctx, 0.6);
  centreText(ctx, 'PAUSED', FIELD.height / 2 - 20, `bold 54px ${DISPLAY}`, PALETTE.text);
  centreText(ctx, 'P or click to keep drifting', FIELD.height / 2 + 34, `16px ${FONT}`, PALETTE.dim);
}

function drawOver(ctx, world) {
  overlay(ctx, 0.68);
  centreText(ctx, 'THE LIGHT FADES', FIELD.height / 2 - 84, `bold 52px ${DISPLAY}`, PALETTE.wisp);
  centreText(ctx, `You reached wave ${world.wave} with ${world.score} points.`, FIELD.height / 2 - 30, `18px ${FONT}`, PALETTE.text);
  centreText(ctx, `Best score  ${Math.max(world.best, world.score)}`, FIELD.height / 2 + 2, `16px ${FONT}`, PALETTE.gold);
  centreText(ctx, 'The reef keeps its pearls for the next keeper.', FIELD.height / 2 + 36, `15px ${FONT}`, PALETTE.dim);
  if (promptVisible(world)) {
    centreText(ctx, '— press R or click to drift again —', FIELD.height / 2 + 84, `bold 18px ${FONT}`, PALETTE.text);
  }
}

function drawWin(ctx, world) {
  overlay(ctx, 0.55);
  centreText(ctx, 'TIDE MASTER', FIELD.height / 2 - 84, `bold 60px ${DISPLAY}`, PALETTE.gold);
  centreText(ctx, `All 10 waves cleared — ${world.score} points.`, FIELD.height / 2 - 28, `19px ${FONT}`, PALETTE.text);
  centreText(ctx, 'The reef glows for you now. Keep drifting — the waves never end.', FIELD.height / 2 + 6, `15px ${FONT}`, PALETTE.dim);
  if (promptVisible(world)) {
    centreText(ctx, '— press ENTER to keep playing, R to start over —', FIELD.height / 2 + 58, `bold 17px ${FONT}`, PALETTE.text);
  }
}

/** Draw one frame of `screen` over `world`. */
export function render(ctx, world, screen, muted) {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  drawPowerups(ctx, world);
  drawPearls(ctx, world);
  drawWisps(ctx, world);
  if (screen !== SCREEN_TITLE) drawPlayer(ctx, world);
  drawParticles(ctx, world);
  ctx.restore();
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,93,143,${world.flash * 0.5})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }
  drawHud(ctx, world, muted);
  drawBanner(ctx, world);
  if (screen === SCREEN_TITLE) drawTitle(ctx, world);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
  if (screen === SCREEN_OVER) drawOver(ctx, world);
  if (screen === SCREEN_WIN) drawWin(ctx, world);
}
