import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  CONFIG,
  computePipeSpeed,
  isGapYInBounds,
  scrollPipeX,
  isPipeOffScreen,
  tickAndFilterPipes
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
        fc.float({ min: 0, max: CONFIG.maxSpeed * 2, noNaN: true }),
        (x, speed) => {
          const newX = scrollPipeX(x, speed);
          // After one tick the pipe must have moved exactly `speed` pixels to the left
          return newX === x - speed;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7b: Pipe scrolls by CONFIG speed — using pipeStartSpeed the displacement equals pipeStartSpeed', () => {
    // Feature: flappy-kiro, Property 7: Pipe scrolls by speed each tick (CONFIG values)
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 2000, noNaN: true }),
        (x) => {
          const newX = scrollPipeX(x, CONFIG.pipeStartSpeed);
          return newX === x - CONFIG.pipeStartSpeed;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7c: Multiple ticks — after N ticks pipe x equals x - N * speed', () => {
    // Feature: flappy-kiro, Property 7: Pipe scrolls by speed each tick (multi-tick)
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2000, noNaN: true }),
        fc.float({ min: Math.fround(0.1), max: CONFIG.maxSpeed, noNaN: true }),
        fc.integer({ min: 1, max: 60 }),
        (startX, speed, ticks) => {
          let x = startX;
          for (let i = 0; i < ticks; i++) {
            x = scrollPipeX(x, speed);
          }
          return Math.abs(x - (startX - ticks * speed)) < 1e-6;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: Off-screen pipes removed — any pipe whose right edge < 0 after a tick must not appear in active list', () => {
    // Feature: flappy-kiro, Property 8: Off-screen pipes are removed
    fc.assert(
      fc.property(
        // Generate a mix of pipes: some clearly off-screen, some on-screen
        fc.array(
          fc.record({
            x:    fc.float({ min: -2000, max: CONFIG.canvasWidth + 200, noNaN: true }),
            gapY: fc.float({ min: 100, max: 540, noNaN: true }),
            active: fc.constant(true)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.float({ min: Math.fround(0.1), max: Math.fround(CONFIG.maxSpeed), noNaN: true }),
        (pipes, speed) => {
          const remaining = tickAndFilterPipes(pipes, speed, CONFIG.pipeWidth);

          // Every pipe that remains must have its right edge >= 0
          const allOnScreen = remaining.every(p => p.x + CONFIG.pipeWidth >= 0);

          // Every pipe that was off-screen after the tick must NOT be in remaining
          const offScreenCount = pipes.filter(p => (p.x - speed) + CONFIG.pipeWidth < 0).length;
          const removedCorrectly = remaining.length === pipes.length - offScreenCount;

          return allOnScreen && removedCorrectly;
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
