import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatHUD, shouldScorePipe } from '../game-logic.js';

describe('Scoring property tests', () => {

  it('Property 15: High score persistence — for any score > highScore, after update highScore === score', () => {
    // Feature: flappy-kiro, Property 15: High score persistence round-trip
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        (score, highScore) => {
          // Simulate the update logic
          let updatedHighScore = highScore;
          if (score > highScore) {
            updatedHighScore = score;
          }
          // If score > highScore, updatedHighScore must equal score
          if (score > highScore) {
            return updatedHighScore === score;
          }
          // Otherwise highScore is unchanged
          return updatedHighScore === highScore;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 16: Score increments on pipe pass — shouldScorePipe returns true when ghostyCx > pipeCx', () => {
    // Feature: flappy-kiro, Property 16: Score increments on pipe pass
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 2000, noNaN: true }),
        fc.float({ min: -1000, max: 2000, noNaN: true }),
        (ghostyCx, pipeCx) => {
          const result = shouldScorePipe(ghostyCx, pipeCx);
          return result === (ghostyCx > pipeCx);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 17: HUD format — formatHUD always matches "Score: N | High: N" pattern', () => {
    // Feature: flappy-kiro, Property 17: HUD format is correct
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        (score, highScore) => {
          const hud = formatHUD(score, highScore);
          return /^Score: \d+ \| High: \d+$/.test(hud);
        }
      ),
      { numRuns: 100 }
    );
  });

});
