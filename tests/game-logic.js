// tests/game-logic.js
// Pure/testable functions extracted from index.html for use in unit and property tests.
// This module does NOT import index.html — it re-implements the pure logic only.

const TARGET_FPS = 60;

export const CONFIG = {
  // Canvas
  canvasWidth:        480,
  canvasHeight:       640,

  // Sky
  skyColor:           '#87ceeb',

  // Physics
  gravity:            800  / (TARGET_FPS ** 2),
  flapVelocity:      -300  / TARGET_FPS,
  terminalVelocity:   720  / TARGET_FPS,
  maxTiltUp:         -25,
  maxTiltDown:        90,
  tiltVelocityScale:  4,

  // Ghosty
  ghostWidth:         40,
  ghostHeight:        40,
  ghostX:             120,
  hitboxRadius:       12,
  hitboxInset:        4,

  // Pipes
  pipeStartSpeed:     120 / TARGET_FPS,
  pipeSpacing:        350,
  pipeGap:            140,
  pipeWidth:          60,
  pipeCapWidth:       72,
  pipeCapHeight:      20,
  gapMargin:          60,
  speedIncrement:     24  / TARGET_FPS,
  speedMilestone:     5,
  maxSpeed:           360 / TARGET_FPS,

  // Collision
  invincibilityMs:    500,
  flashIntervalMs:    80,

  // Particles
  particlesPerFrame:  2,
  particleLife:       20,
  particleRadius:     3,

  // Screen shake
  shakeFrames:        18,
  shakeMagnitude:     6,

  // Score popup
  popupLife:          40,
  popupRiseSpeed:     1,

  // Pseudo-animation
  idleBobAmplitude:   2,
  idleBobFrequency:   0.05,
  flapSquashX:        0.75,
  flapSquashY:        1.25,
  flapSquashFrames:   6,
  deathSpinSpeed:     15,

  // Clouds
  cloudLayers: [
    { speed: 18 / TARGET_FPS, opacity: 0.25 },
    { speed: 42 / TARGET_FPS, opacity: 0.55 }
  ],

  debug: false
};

// ─── Pure math helpers ────────────────────────────────────────

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function interpolateY(prevY, currentY, alpha) {
  return prevY + alpha * (currentY - prevY);
}

export function computeRotation(vy) {
  return clamp(vy * CONFIG.tiltVelocityScale, CONFIG.maxTiltUp, CONFIG.maxTiltDown);
}

export function formatHUD(score, highScore) {
  return `Score: ${score} | High: ${highScore}`;
}

// ─── Physics ─────────────────────────────────────────────────

export function physicsTickVelocity(vy, gravity, terminalVelocity) {
  return Math.min(vy + gravity, terminalVelocity);
}

export function physicsTickPosition(y, vy) {
  return y + vy;
}

// Returns CONFIG.flapVelocity unconditionally — flap overrides any prior vy.
export function applyFlapVelocity(_currentVy) {
  return CONFIG.flapVelocity;
}

// ─── Collision ───────────────────────────────────────────────

export function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}

export function ghostyCircleFromState(ghosty, hitboxRadius) {
  return {
    cx: ghosty.x + ghosty.width  / 2,
    cy: ghosty.y + ghosty.height / 2,
    r:  hitboxRadius
  };
}

export function pipeRectsFromState(pipe, pipeGap, pipeWidth, canvasHeight) {
  const gapTop    = pipe.gapY - pipeGap / 2;
  const gapBottom = pipe.gapY + pipeGap / 2;
  return [
    { x: pipe.x, y: 0,        w: pipeWidth, h: gapTop },
    { x: pipe.x, y: gapBottom, w: pipeWidth, h: canvasHeight - gapBottom }
  ];
}

// ─── Pipes ───────────────────────────────────────────────────

export function computePipeSpeed(pipesPassed, pipeStartSpeed, speedIncrement, speedMilestone, maxSpeed) {
  const steps = Math.floor(pipesPassed / speedMilestone);
  return Math.min(pipeStartSpeed + steps * speedIncrement, maxSpeed);
}

export function isGapYInBounds(gapY, gapMargin, pipeGap, canvasHeight) {
  const minGapY = gapMargin + pipeGap / 2;
  const maxGapY = canvasHeight - gapMargin - pipeGap / 2;
  return gapY >= minGapY && gapY <= maxGapY;
}

// Advance a pipe's x position by one physics tick at the given speed.
export function scrollPipeX(x, speed) {
  return x - speed;
}

// Returns true when a pipe's right edge has scrolled fully off the left of the canvas.
export function isPipeOffScreen(pipeX, pipeWidth) {
  return pipeX + pipeWidth < 0;
}

// Simulate one tick of pipe scrolling and return only the pipes that remain on-screen.
export function tickAndFilterPipes(pipes, speed, pipeWidth) {
  return pipes
    .map(p => ({ ...p, x: p.x - speed }))
    .filter(p => !isPipeOffScreen(p.x, pipeWidth));
}

export function shouldScorePipe(ghostyCx, pipeCx) {
  return ghostyCx > pipeCx;
}

// ─── High score persistence ───────────────────────────────────

const HIGH_SCORE_KEY = 'flappyKiroHigh';

export function saveHighScore(score, storage = localStorage) {
  try { storage.setItem(HIGH_SCORE_KEY, String(score)); } catch (e) {}
}

export function loadHighScore(storage = localStorage) {
  try { return parseInt(storage.getItem(HIGH_SCORE_KEY) || '0', 10); } catch (e) { return 0; }
}

export function updateHighScore(currentScore, currentHigh, storage = localStorage) {
  if (currentScore > currentHigh) {
    saveHighScore(currentScore, storage);
    return currentScore;
  }
  return currentHigh;
}

// ─── Collision / invincibility simulation ────────────────────

/**
 * Simulates the invincibility countdown after a pipe collision.
 * Returns the game state after the invincibility period expires.
 *
 * @param {number} invincibilityMs - Total invincibility duration in ms
 * @param {number} fixedStep       - ms per physics tick (1000/60)
 * @returns {{ isInvincible: boolean, gameState: string }}
 */
export function simulateInvincibilityExpiry(invincibilityMs, fixedStep) {
  let timer = invincibilityMs;
  let isInvincible = true;
  let gameState = 'PLAYING';

  // Tick until the timer expires (mirrors updateInvincibility in the game)
  while (isInvincible) {
    timer -= fixedStep;
    if (timer <= 0) {
      isInvincible = false;
      gameState = 'GAME_OVER';
    }
  }

  return { isInvincible, gameState };
}

// ─── State machine ───────────────────────────────────────────

export const STATE_TRANSITIONS = {
  'MENU':      ['PLAYING'],
  'PLAYING':   ['PAUSED', 'GAME_OVER'],
  'PAUSED':    ['PLAYING'],
  'GAME_OVER': ['PLAYING']
};

export function isValidTransition(from, to) {
  const allowed = STATE_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

export function isValidState(state) {
  return Object.prototype.hasOwnProperty.call(STATE_TRANSITIONS, state);
}
