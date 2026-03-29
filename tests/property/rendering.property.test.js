import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CONFIG,
  ghostyCircleFromState,
  circleRectOverlap,
  simulateInvincibilityExpiry
} from '../game-logic.js';

describe('Rendering property tests', () => {

  it('Property 10: Ghosty circle hitbox — ghostyCircleFromState returns correct cx, cy, r', () => {
    // Feature: flappy-kiro, Property 10: Ghosty circle hitbox radius is correct
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 480, noNaN: true }),
        fc.float({ min: 0, max: 640, noNaN: true }),
        fc.integer({ min: 10, max: 100 }),
        fc.integer({ min: 10, max: 100 }),
        (x, y, width, height) => {
          const ghosty = { x, y, width, height };
          const circle = ghostyCircleFromState(ghosty, CONFIG.hitboxRadius);

          const expectedCx = x + width  / 2;
          const expectedCy = y + height / 2;
          const expectedR  = CONFIG.hitboxRadius;

          return (
            Math.abs(circle.cx - expectedCx) < 1e-9 &&
            Math.abs(circle.cy - expectedCy) < 1e-9 &&
            circle.r === expectedR
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: Collision triggers game over — circleRectOverlap returns true for overlapping, false for non-overlapping; invincibility expires to GAME_OVER', () => {
    // Feature: flappy-kiro, Property 11: Collision triggers game over after invincibility

    // Part A: overlapping circle (centre inside rect) always detected
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 400 }),
        fc.integer({ min: 10, max: 600 }),
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: 50, max: 200 }),
        fc.integer({ min: 5, max: 20 }),
        (rx, ry, rw, rh, r) => {
          const cx = rx + rw / 2;
          const cy = ry + rh / 2;
          return circleRectOverlap(cx, cy, r, rx, ry, rw, rh) === true;
        }
      ),
      { numRuns: 100 }
    );

    // Part B: non-overlapping circle (far left of rect) never detected
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 400 }),
        fc.integer({ min: 10, max: 600 }),
        fc.integer({ min: 50, max: 100 }),
        fc.integer({ min: 50, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (rx, ry, rw, rh, r) => {
          const cx = rx - r - 50;
          const cy = ry + rh / 2;
          return circleRectOverlap(cx, cy, r, rx, ry, rw, rh) === false;
        }
      ),
      { numRuns: 100 }
    );

    // Part C: after a collision, invincibility is set for CONFIG.invincibilityMs (500 ms)
    // and once it expires the game state must become GAME_OVER
    fc.assert(
      fc.property(
        // vary the fixed step slightly around 1000/60 to cover rounding edge cases
        fc.double({ min: 14, max: 18, noNaN: true }),
        (fixedStep) => {
          const result = simulateInvincibilityExpiry(CONFIG.invincibilityMs, fixedStep);
          return result.isInvincible === false && result.gameState === 'GAME_OVER';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 18: Cloud layers distinct — speeds differ and opacities are distinct and in (0,1)', () => {
    // Feature: flappy-kiro, Property 18: Cloud layers have distinct speeds and opacities
    fc.assert(
      fc.property(
        fc.constant(CONFIG.cloudLayers),
        (cloudLayers) => {
          if (cloudLayers.length < 2) return false;

          const [far, near] = cloudLayers;

          // Speeds must differ
          if (far.speed === near.speed) return false;

          // Both opacities must be in (0, 1)
          if (far.opacity  <= 0 || far.opacity  >= 1) return false;
          if (near.opacity <= 0 || near.opacity >= 1) return false;

          // Opacities must be distinct
          if (far.opacity === near.opacity) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

});
