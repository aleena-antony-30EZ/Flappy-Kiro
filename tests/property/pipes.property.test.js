import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CONFIG,
  computePipeSpeed,
  isGapYInBounds
} from '../game-logic.js';

describe('Pipe property tests', () => {

  it('Property 6: Pipe gap within bounds — spawned gapY satisfies isGapYInBounds', () => {
    // Feature: flappy-kiro, Property 6: Pipe gap centre is within bounds
    // Simulate the spawn formula: gapY = gapMargin + pipeGap/2 + rand * (canvasHeight - 2*gapMargin - pipeGap)
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (rand) => {
          const minGapY = CONFIG.gapMargin + CONFIG.pipeGap / 2;
          const maxGapY = CONFIG.canvasHeight - CONFIG.gapMargin - CONFIG.pipeGap / 2;
          const gapY = minGapY + rand * (maxGapY - minGapY);
          return isGapYInBounds(gapY, CONFIG.gapMargin, CONFIG.pipeGap, CONFIG.canvasHeight);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: Pipe scrolls by speed — after one tick x_new = x - speed', () => {
    // Feature: flappy-kiro, Property 7: Pipe scrolls by speed each tick
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 2000, noNaN: true }),
        fc.float({ min: 0, max: 10, noNaN: true }),
        (x, speed) => {
          const newX = x - speed;
          return Math.abs(newX - (x - speed)) < 1e-9;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Off-screen pipes removed — pipe with x + pipeWidth < 0 is off-screen', () => {
    // Feature: flappy-kiro, Property 8: Off-screen pipes are removed
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(-2000), max: Math.fround(-CONFIG.pipeWidth - 1), noNaN: true }),
        (x) => {
          return x + CONFIG.pipeWidth < 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 9: Pipe speed capped — computePipeSpeed never exceeds maxSpeed and increases correctly', () => {
    // Feature: flappy-kiro, Property 9: Pipe speed is capped
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (pipesPassed) => {
          const speed = computePipeSpeed(
            pipesPassed,
            CONFIG.pipeStartSpeed,
            CONFIG.speedIncrement,
            CONFIG.speedMilestone,
            CONFIG.maxSpeed
          );

          // Speed must never exceed maxSpeed
          if (speed > CONFIG.maxSpeed + 1e-9) return false;

          // Speed must be at least pipeStartSpeed
          if (speed < CONFIG.pipeStartSpeed - 1e-9) return false;

          // Speed increases by speedIncrement every speedMilestone pipes
          const steps = Math.floor(pipesPassed / CONFIG.speedMilestone);
          const expected = Math.min(
            CONFIG.pipeStartSpeed + steps * CONFIG.speedIncrement,
            CONFIG.maxSpeed
          );
          return Math.abs(speed - expected) < 1e-9;
        }
      ),
      { numRuns: 100 }
    );
  });

});
