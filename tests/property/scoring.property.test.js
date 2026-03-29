import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { formatHUD, shouldScorePipe, saveHighScore, loadHighScore, updateHighScore } from '../game-logic.js';

// Minimal in-memory localStorage stub for property tests
function makeStorage() {
  const store = {};
  return {
    getItem:    (k)    => Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
  };
}

describe('Scoring property tests', () => {

  it('Property 15: High score persistence round-trip — save then load returns the same value', () => {
    // Feature: flappy-kiro, Property 15: High score persistence round-trip
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        fc.integer({ min: 0, max: 100000 }),
        (score, existingHigh) => {
          const storage = makeStorage();
          // Pre-seed an existing high score
          saveHighScore(existingHigh, storage);

          // Simulate game-over update: only persist if score beats existing high
          const newHigh = updateHighScore(score, existingHigh, storage);

          // Round-trip: what we read back must equal what was persisted
          const persisted = loadHighScore(storage);

          if (score > existingHigh) {
            // New high score was saved — read-back must equal score
            return persisted === score && newHigh === score;
          } else {
            // High score unchanged — read-back must equal existingHigh
            return persisted === existingHigh && newHigh === existingHigh;
          }
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
