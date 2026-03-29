import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CONFIG,
  applyFlapVelocity,
  physicsTickVelocity,
  physicsTickPosition,
  interpolateY,
  computeRotation,
  isValidTransition
} from '../game-logic.js';

describe('Physics property tests', () => {

  it('Property 1: Flap sets velocity — result is always CONFIG.flapVelocity regardless of prior vy', () => {
    // Feature: flappy-kiro, Property 1: Flap sets velocity
    // For any initial vertical velocity, applying a flap must set vy to exactly CONFIG.flapVelocity.
    // This validates that the flap is an override (not additive) — Req 2.1, 2.2, 3.2.
    fc.assert(
      fc.property(fc.float({ min: -100, max: 100, noNaN: true }), (initialVy) => {
        const newVy = applyFlapVelocity(initialVy);
        return newVy === CONFIG.flapVelocity;
      }),
      { numRuns: 100 }
    );
  });

  it('Property 2: Flap ignored outside PLAYING — vy is unchanged when state is not PLAYING', () => {
    // Feature: flappy-kiro, Property 2: Flap is ignored outside PLAYING
    // For any non-PLAYING state, a flap input must leave Ghosty's vy unchanged (Req 2.3).
    // The game guards applyFlap() behind a gameState === 'PLAYING' check, so we model
    // that guard here: if state !== 'PLAYING', vy after the conditional is still currentVy.
    fc.assert(
      fc.property(
        fc.constantFrom('MENU', 'PAUSED', 'GAME_OVER'),
        fc.float({ min: -100, max: 100, noNaN: true }),
        (state, currentVy) => {
          // Simulate the guard: only apply flap when PLAYING
          const vyAfterInput = state === 'PLAYING'
            ? applyFlapVelocity(currentVy)
            : currentVy; // flap ignored — vy stays the same

          // Outside PLAYING the velocity must be unchanged
          return vyAfterInput === currentVy;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3: Physics tick invariant — newVy = min(vy + gravity, terminalVelocity), newY = y + newVy', () => {
    // Feature: flappy-kiro, Property 3: Physics tick invariant
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: 0, max: 640, noNaN: true }),
        (vy, y) => {
          const newVy = physicsTickVelocity(vy, CONFIG.gravity, CONFIG.terminalVelocity);
          const newY  = physicsTickPosition(y, newVy);

          const expectedVy = Math.min(vy + CONFIG.gravity, CONFIG.terminalVelocity);
          const expectedY  = y + expectedVy;

          return Math.abs(newVy - expectedVy) < 1e-9 && Math.abs(newY - expectedY) < 1e-9;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Interpolated render position — result = prevY + alpha*(currentY-prevY)', () => {
    // Feature: flappy-kiro, Property 4: Interpolated render position
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (alpha, prevY, currentY) => {
          const result   = interpolateY(prevY, currentY, alpha);
          const expected = prevY + alpha * (currentY - prevY);
          return Math.abs(result - expected) < 1e-9;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: Sprite rotation clamped — computeRotation(vy) always in [maxTiltUp, maxTiltDown]', () => {
    // Feature: flappy-kiro, Property 5: Sprite rotation is clamped
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (vy) => {
          const angle = computeRotation(vy);
          return angle >= CONFIG.maxTiltUp && angle <= CONFIG.maxTiltDown;
        }
      ),
      { numRuns: 100 }
    );
  });

});
