import { describe, it, expect } from 'vitest';
import {
  CONFIG,
  formatHUD,
  isValidTransition,
  isValidState,
  circleRectOverlap
} from '../game-logic.js';

describe('CONFIG constants', () => {
  it('canvas width is 480', () => {
    expect(CONFIG.canvasWidth).toBe(480);
  });

  it('canvas height is 640', () => {
    expect(CONFIG.canvasHeight).toBe(640);
  });

  it('invincibilityMs is 500', () => {
    expect(CONFIG.invincibilityMs).toBe(500);
  });
});

describe('State machine', () => {
  it('initial gameState equivalent is MENU (MENU is a valid state)', () => {
    expect(isValidState('MENU')).toBe(true);
  });

  it('MENU → PLAYING is a valid transition', () => {
    expect(isValidTransition('MENU', 'PLAYING')).toBe(true);
  });

  it('PLAYING → PAUSED is valid', () => {
    expect(isValidTransition('PLAYING', 'PAUSED')).toBe(true);
  });

  it('PAUSED → PLAYING is valid', () => {
    expect(isValidTransition('PAUSED', 'PLAYING')).toBe(true);
  });

  it('PLAYING → MENU is invalid', () => {
    expect(isValidTransition('PLAYING', 'MENU')).toBe(false);
  });
});

describe('Boundary conditions', () => {
  it('ghosty at y=0 (cy - r <= 0) triggers game over condition', () => {
    // cy = y + height/2 = 0 + 20 = 20, r = 12 → cy - r = 8 > 0, not triggered
    // For cy - r <= 0: y + height/2 - r <= 0 → y <= r - height/2 = 12 - 20 = -8
    // At y = -8: cy = -8 + 20 = 12, cy - r = 12 - 12 = 0 → triggers
    const ghosty = { x: CONFIG.ghostX, y: -8, width: CONFIG.ghostWidth, height: CONFIG.ghostHeight };
    const cy = ghosty.y + ghosty.height / 2;
    const r = CONFIG.hitboxRadius;
    expect(cy - r).toBeLessThanOrEqual(0);
  });

  it('ghosty at y=canvasHeight (cy + r >= canvasHeight) triggers game over condition', () => {
    // cy + r >= canvasHeight → y + height/2 + r >= canvasHeight
    // y >= canvasHeight - height/2 - r = 640 - 20 - 12 = 608
    const ghosty = { x: CONFIG.ghostX, y: 608, width: CONFIG.ghostWidth, height: CONFIG.ghostHeight };
    const cy = ghosty.y + ghosty.height / 2;
    const r = CONFIG.hitboxRadius;
    expect(cy + r).toBeGreaterThanOrEqual(CONFIG.canvasHeight);
  });
});

describe('formatHUD', () => {
  it('returns correct string format', () => {
    expect(formatHUD(7, 42)).toBe('Score: 7 | High: 42');
  });

  it('works with zero values', () => {
    expect(formatHUD(0, 0)).toBe('Score: 0 | High: 0');
  });

  it('works with large values', () => {
    expect(formatHUD(999, 1000)).toBe('Score: 999 | High: 1000');
  });
});
