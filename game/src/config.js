// Lumen Drift — tuning and palette. One place holds every number that shapes
// how the game feels, so balancing is editing data, never logic.
// (game/src/config.js)
export const FIELD = { width: 960, height: 600 };

export const PLAYER = {
  radius: 14,
  accel: 1500,
  maxSpeed: 330,
  drag: 3.2,
  dashSpeed: 760,
  dashTime: 0.16,
  dashCooldown: 1.5,
  invulnTime: 1.8,
  trailLength: 14,
};

export const PEARL = {
  radius: 9,
  baseValue: 10,
  comboWindow: 4.0,
  comboStep: 1,
  maxCombo: 8,
};

export const WISP = {
  radius: 13,
  baseSpeed: 74,
  speedPerWave: 9,
  maxSpeed: 215,
  turnRate: 3.4,
  separation: 30,
};

export const POWERUP = {
  radius: 12,
  dropChance: 0.14,
  magnetSeconds: 8,
  slowSeconds: 6,
  kinds: ['shield', 'magnet', 'slow'],
};

export const WAVES = {
  pearlsPerWave: (wave) => Math.min(6 + wave * 2, 22),
  wispsPerWave: (wave) => Math.min(1 + wave, 12),
  wispSpeed: (wave) => Math.min(WISP.baseSpeed + wave * WISP.speedPerWave, WISP.maxSpeed),
  winWave: 10,
  startLives: 3,
};

export const PALETTE = {
  deep: '#0a0e27',
  mid: '#12224d',
  teal: '#0e3a4a',
  gold: '#ffd166',
  goldSoft: '#ffe29a',
  cyan: '#6ef3ff',
  lantern: '#fff3c4',
  wisp: '#b678f0',
  wispCore: '#7b2fbe',
  ink: '#2a1650',
  heart: '#ff5d8f',
  shield: '#7df9ff',
  magnet: '#ff7ad9',
  slow: '#8fb8ff',
  text: '#eaf6ff',
  dim: '#9db8d6',
};

export const STEP = 1 / 60;
