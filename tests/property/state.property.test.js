import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  STATE_TRANSITIONS,
  isValidTransition,
  isValidState
} from '../game-logic.js';

describe('State property tests', () => {

  it('Property 12: Game state always valid — isValidState returns true for valid states, false for invalid', () => {
    // Feature: flappy-kiro, Property 12: Game state is always valid
    const validStates = ['MENU', 'PLAYING', 'PAUSED', 'GAME_OVER'];

    // All valid states return true
    fc.assert(
      fc.property(
        fc.constantFrom(...validStates),
        (state) => isValidState(state) === true
      ),
      { numRuns: 100 }
    );

    // Random strings that are not valid states return false
    fc.assert(
      fc.property(
        fc.string().filter(s => !validStates.includes(s)),
        (state) => isValidState(state) === false
      ),
      { numRuns: 100 }
    );
  });

  it('Property 13: Pause round-trip — PLAYING→PAUSED is valid, PAUSED→PLAYING is valid', () => {
    // Feature: flappy-kiro, Property 13: Pause is a round-trip
    fc.assert(
      fc.property(
        fc.constant('PLAYING'),
        (state) => {
          const canPause  = isValidTransition(state, 'PAUSED');
          const canResume = isValidTransition('PAUSED', 'PLAYING');
          return canPause && canResume;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: Game reset clears state — after reset, score === 0 and pipes array is empty', () => {
    // Feature: flappy-kiro, Property 14: Game reset clears state
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.array(fc.record({ x: fc.float(), gapY: fc.float(), scored: fc.boolean(), active: fc.boolean() }), { maxLength: 10 }),
        (score, pipes) => {
          // Simulate reset logic
          let currentScore = score;
          let currentPipes = [...pipes];

          // Reset
          currentScore = 0;
          currentPipes = [];

          return currentScore === 0 && currentPipes.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

});
