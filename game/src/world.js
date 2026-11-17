// Lumen Drift — the simulation. A lantern-keeper drifts a reef of star pearls,
// gathering them in chains while ink wisps hunt it. The world is pure data and
// fixed-step logic: no DOM, no audio, no canvas here, so the same seed and the
// same inputs always play the same game. Sounds are callbacks the caller wires
// up; the world never touches the network or the page.
// (game/src/world.js)
import { FIELD, PLAYER, PEARL, WISP, POWERUP, WAVES, STEP } from './config.js';
import { makeRng } from './random.js';

export const EVENT_OVER = 1;
export const EVENT_WAVE = 2;
export const EVENT_WIN = 4;
export const EVENT_HURT = 8;

const NO_SFX = {
  collect() {},
  dash() {},
  wispPop() {},
  hurt() {},
  powerup() {},
  waveClear() {},
  gameOver() {},
  victory() {},
};

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.reset();
  }

  reset() {
    this.rng = makeRng(this.seed);
    this.time = 0;
    this.score = 0;
    this.best = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lives = WAVES.startLives;
    this.wave = 1;
    this.over = false;
    this.won = false;
    this.paused = false;
    this.shake = 0;
    this.flash = 0;
    this.banner = null;
    this.waveClearT = 0;
    this.player = {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      dashT: 0,
      dashCool: 0,
      invulnT: 0,
      shield: false,
      magnetT: 0,
      slowT: 0,
      trail: [],
    };
    this.pearls = [];
    this.wisps = [];
    this.powerups = [];
    this.particles = [];
    this.popups = [];
    this.stars = this.makeStars();
    this.nebulae = this.makeNebulae();
    this.spawnWave(this.wave);
  }

  makeStars() {
    const stars = [];
    for (let layer = 0; layer < 3; layer += 1) {
      const count = 46 - layer * 10;
      for (let i = 0; i < count; i += 1) {
        stars.push({
          x: this.rng.range(0, FIELD.width),
          y: this.rng.range(0, FIELD.height),
          r: this.rng.range(0.6, 1.4 + layer * 0.5),
          phase: this.rng.range(0, Math.PI * 2),
          speed: this.rng.range(0.4, 1.1),
          layer,
        });
      }
    }
    return stars;
  }

  makeNebulae() {
    const hues = [265, 190, 320, 210, 280];
    return hues.map((hue) => ({
      x: this.rng.range(80, FIELD.width - 80),
      y: this.rng.range(60, FIELD.height - 60),
      r: this.rng.range(120, 220),
      hue,
    }));
  }

  farFromPlayer(margin) {
    for (let tries = 0; tries < 24; tries += 1) {
      const x = this.rng.range(margin, FIELD.width - margin);
      const y = this.rng.range(margin + 40, FIELD.height - margin);
      if (dist(x, y, this.player.x, this.player.y) > 130) return { x, y };
    }
    return { x: this.rng.range(margin, FIELD.width - margin), y: this.rng.range(margin + 40, FIELD.height - margin) };
  }

  spawnWave(wave) {
    const pearlCount = WAVES.pearlsPerWave(wave);
    for (let i = 0; i < pearlCount; i += 1) {
      const p = this.farFromPlayer(46);
      this.pearls.push({ x: p.x, y: p.y, phase: this.rng.range(0, Math.PI * 2), taken: false });
    }
    const wispCount = WAVES.wispsPerWave(wave);
    for (let i = 0; i < wispCount; i += 1) {
      const edge = this.rng.int(0, 3);
      const m = 30;
      let x = m;
      let y = m;
      if (edge === 0) { x = this.rng.range(m, FIELD.width - m); y = m; }
      if (edge === 1) { x = this.rng.range(m, FIELD.width - m); y = FIELD.height - m; }
      if (edge === 2) { x = m; y = this.rng.range(m, FIELD.height - m); }
      if (edge === 3) { x = FIELD.width - m; y = this.rng.range(m, FIELD.height - m); }
      this.wisps.push({ x, y, vx: 0, vy: 0, wobble: this.rng.range(0, Math.PI * 2) });
    }
  }

  burst(x, y, color, count, speed = 160) {
    for (let i = 0; i < count; i += 1) {
      const a = this.rng.range(0, Math.PI * 2);
      const v = this.rng.range(speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: this.rng.range(0.35, 0.8),
        maxLife: 0.8,
        size: this.rng.range(1.5, 3.5),
        color,
      });
    }
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  }

  popup(x, y, text, color, size = 15) {
    this.popups.push({ x, y, text, color, size, life: 1.0 });
    if (this.popups.length > 24) this.popups.shift();
  }

  setBanner(title, sub, dur = 1.6) {
    this.banner = { title, sub, t: 0, dur };
  }

  nearestPearl() {
    let best = null;
    let bestD = Infinity;
    for (const p of this.pearls) {
      const d = dist(p.x, p.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  nearestWisp() {
    let best = null;
    let bestD = Infinity;
    for (const w of this.wisps) {
      const d = dist(w.x, w.y, this.player.x, this.player.y);
      if (d < bestD) { bestD = d; best = w; }
    }
    return { wisp: best, d: bestD };
  }

  collectPearl(pearl, sfx) {
    pearl.taken = true;
    this.combo = Math.min(this.combo + 1, PEARL.maxCombo);
    this.comboTimer = PEARL.comboWindow;
    const value = PEARL.baseValue + 5 * (this.combo - 1);
    this.score += value;
    this.popup(pearl.x, pearl.y - 14, `+${value}`, '#ffd166', this.combo >= 4 ? 19 : 15);
    if (this.combo > 1 && this.combo % 4 === 0) {
      this.popup(this.player.x, this.player.y - 56, `COMBO x${this.combo}`, '#6ef3ff', 18);
    }
    this.burst(pearl.x, pearl.y, '#ffd166', 12, 130);
    sfx.collect(this.combo);
    if (this.rng.chance(POWERUP.dropChance)) {
      this.powerups.push({
        x: pearl.x, y: pearl.y,
        kind: this.rng.pick(POWERUP.kinds),
        phase: this.rng.range(0, Math.PI * 2),
      });
    }
  }

  applyPowerup(kind, sfx) {
    if (kind === 'shield') this.player.shield = true;
    if (kind === 'magnet') this.player.magnetT = POWERUP.magnetSeconds;
    if (kind === 'slow') this.player.slowT = POWERUP.slowSeconds;
    this.popup(this.player.x, this.player.y - 34, kind.toUpperCase() + '!', '#7df9ff', 17);
    sfx.powerup();
  }

  hurtPlayer(wisp, sfx) {
    this.lives -= 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.player.invulnT = PLAYER.invulnTime;
    const a = Math.atan2(this.player.y - wisp.y, this.player.x - wisp.x);
    this.player.vx = Math.cos(a) * 420;
    this.player.vy = Math.sin(a) * 420;
    this.shake = 16;
    this.flash = 0.45;
    this.burst(this.player.x, this.player.y, '#ff5d8f', 22, 220);
    sfx.hurt();
    if (this.lives <= 0) {
      this.over = true;
      this.burst(this.player.x, this.player.y, '#fff3c4', 40, 260);
      sfx.gameOver();
      return EVENT_OVER | EVENT_HURT;
    }
    return EVENT_HURT;
  }

  destroyWisp(index, sfx, award) {
    const w = this.wisps[index];
    this.burst(w.x, w.y, '#b678f0', 18, 190);
    this.wisps.splice(index, 1);
    if (award) {
      this.score += 25;
      this.popup(w.x, w.y - 12, '+25', '#b678f0', 15);
    }
    sfx.wispPop();
  }

  step(dt, input, sfx = NO_SFX) {
    this.time += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) this.banner = null;
    }
    this.shake = Math.max(0, this.shake - dt * 34);
    this.flash = Math.max(0, this.flash - dt * 1.4);
    if (this.over || this.won || this.paused) {
      this.updateParticles(dt);
      return this.over ? EVENT_OVER : 0;
    }

    let events = 0;
    const p = this.player;

    // Timers.
    p.dashCool = Math.max(0, p.dashCool - dt);
    p.invulnT = Math.max(0, p.invulnT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.slowT = Math.max(0, p.slowT - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Steering: keys first, else the held pointer.
    let ax = input.x;
    let ay = input.y;
    if (ax === 0 && ay === 0 && input.pointer.down) {
      const dx = input.pointer.x - p.x;
      const dy = input.pointer.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 10) {
        ax = dx / d;
        ay = dy / d;
      }
    }
    const len = Math.hypot(ax, ay);
    if (len > 1) { ax /= len; ay /= len; }

    // Dash: a burst toward the steering direction (or the way we face).
    if (input.dash && p.dashCool <= 0 && p.dashT <= 0) {
      let dx = ax;
      let dy = ay;
      if (dx === 0 && dy === 0) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
      const dl = Math.hypot(dx, dy) || 1;
      p.vx = (dx / dl) * PLAYER.dashSpeed;
      p.vy = (dy / dl) * PLAYER.dashSpeed;
      p.dashT = PLAYER.dashTime;
      p.dashCool = PLAYER.dashCooldown;
      p.invulnT = Math.max(p.invulnT, PLAYER.dashTime + 0.08);
      this.burst(p.x, p.y, '#6ef3ff', 10, 120);
      sfx.dash();
    }

    if (p.dashT > 0) {
      p.dashT -= dt;
    } else {
      p.vx += ax * PLAYER.accel * dt;
      p.vy += ay * PLAYER.accel * dt;
      const damp = Math.exp(-PLAYER.drag * dt);
      p.vx *= damp;
      p.vy *= damp;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > PLAYER.maxSpeed) {
        p.vx = (p.vx / speed) * PLAYER.maxSpeed;
        p.vy = (p.vy / speed) * PLAYER.maxSpeed;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const m = PLAYER.radius + 6;
    if (p.x < m) { p.x = m; p.vx = Math.abs(p.vx) * 0.4; }
    if (p.x > FIELD.width - m) { p.x = FIELD.width - m; p.vx = -Math.abs(p.vx) * 0.4; }
    if (p.y < m + 34) { p.y = m + 34; p.vy = Math.abs(p.vy) * 0.4; }
    if (p.y > FIELD.height - m) { p.y = FIELD.height - m; p.vy = -Math.abs(p.vy) * 0.4; }
    if (Math.hypot(p.vx, p.vy) > 24) p.angle = Math.atan2(p.vy, p.vx);

    // Lantern trail.
    p.trail.push({ x: p.x, y: p.y, life: 0.35 });
    if (p.trail.length > PLAYER.trailLength) p.trail.shift();

    // Pearls: magnet pull, then collection.
    for (const pearl of this.pearls) {
      if (pearl.taken) continue;
      if (p.magnetT > 0) {
        const d = dist(pearl.x, pearl.y, p.x, p.y);
        if (d < 240 && d > 1) {
          const pull = 620 * (1 - d / 260);
          pearl.x += ((p.x - pearl.x) / d) * pull * dt;
          pearl.y += ((p.y - pearl.y) / d) * pull * dt;
        }
      }
      if (dist(pearl.x, pearl.y, p.x, p.y) < PLAYER.radius + PEARL.radius + 4) {
        this.collectPearl(pearl, sfx);
      }
    }
    this.pearls = this.pearls.filter((pearl) => !pearl.taken);

    // Power-ups.
    for (let i = this.powerups.length - 1; i >= 0; i -= 1) {
      const u = this.powerups[i];
      if (dist(u.x, u.y, p.x, p.y) < PLAYER.radius + POWERUP.radius + 4) {
        this.applyPowerup(u.kind, sfx);
        this.burst(u.x, u.y, '#7df9ff', 12, 140);
        this.powerups.splice(i, 1);
      }
    }

    // Wisps hunt the lantern.
    const wispSpeed = WAVES.wispSpeed(this.wave) * (p.slowT > 0 ? 0.45 : 1);
    for (let i = 0; i < this.wisps.length; i += 1) {
      const w = this.wisps[i];
      w.wobble += dt * 3;
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(w.wobble) * 0.35;
      const tx = (dx / d) * wispSpeed + -dy / d * wob * wispSpeed * 0.4;
      const ty = (dy / d) * wispSpeed + dx / d * wob * wispSpeed * 0.4;
      w.vx += (tx - w.vx) * Math.min(1, WISP.turnRate * dt);
      w.vy += (ty - w.vy) * Math.min(1, WISP.turnRate * dt);
      w.x += w.vx * dt;
      w.y += w.vy * dt;
      // Wisps keep each other apart.
      for (let j = i + 1; j < this.wisps.length; j += 1) {
        const o = this.wisps[j];
        const ox = w.x - o.x;
        const oy = w.y - o.y;
        const od = Math.hypot(ox, oy);
        if (od > 0.01 && od < WISP.separation) {
          const push = ((WISP.separation - od) / od) * 30 * dt;
          w.x += ox * push;
          w.y += oy * push;
          o.x -= ox * push;
          o.y -= oy * push;
        }
      }
    }

    // Wisp contact.
    for (let i = this.wisps.length - 1; i >= 0; i -= 1) {
      const w = this.wisps[i];
      if (dist(w.x, w.y, p.x, p.y) < PLAYER.radius + WISP.radius - 2) {
        if (p.dashT > 0) {
          this.destroyWisp(i, sfx, true);
        } else if (p.shield) {
          p.shield = false;
          p.invulnT = Math.max(p.invulnT, 1.0);
          this.destroyWisp(i, sfx, false);
          this.popup(p.x, p.y - 30, 'SHIELD!', '#7df9ff', 17);
        } else if (p.invulnT <= 0) {
          events |= this.hurtPlayer(w, sfx);
          if (this.over) {
            this.updateParticles(dt);
            return events;
          }
        }
      }
    }

    // Wave cleared: the reef is empty, on to the next one.
    if (this.pearls.length === 0 && this.waveClearT <= 0 && !this.over) {
      if (this.wave >= WAVES.winWave && !this.won) {
        this.won = true;
        this.setBanner('TIDE MASTER', `You cleared all ${WAVES.winWave} waves — score ${this.score}`, 3.2);
        sfx.victory();
        events |= EVENT_WIN;
      } else {
        for (let i = this.wisps.length - 1; i >= 0; i -= 1) {
          this.burst(this.wisps[i].x, this.wisps[i].y, '#b678f0', 10, 150);
        }
        this.wisps = [];
        this.setBanner(`WAVE ${this.wave} CLEAR`, `The reef refills — wave ${this.wave + 1} approaches`, 1.6);
        sfx.waveClear();
        events |= EVENT_WAVE;
        this.waveClearT = 1.5;
      }
    }
    if (this.waveClearT > 0) {
      this.waveClearT -= dt;
      if (this.waveClearT <= 0 && !this.over && !this.won) {
        this.wave += 1;
        this.spawnWave(this.wave);
      }
    }

    this.updateParticles(dt);
    return events;
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const pt = this.particles[i];
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= Math.exp(-2.4 * dt);
      pt.vy *= Math.exp(-2.4 * dt);
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i -= 1) {
      const pop = this.popups[i];
      pop.life -= dt * 0.9;
      pop.y -= 34 * dt;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }
    for (const t of this.player.trail) t.life -= dt;
    this.player.trail = this.player.trail.filter((t) => t.life > 0);
  }
}

export { STEP };
