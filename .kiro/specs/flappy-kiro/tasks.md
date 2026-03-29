# Implementation Plan: Flappy Kiro

## Overview

Implement the complete Flappy Kiro game as a single `index.html` file with vanilla JS and HTML5 Canvas. Tasks follow the architecture in the design document, building incrementally from scaffolding through physics, pipes, collision, scoring, visuals, and finally the test suite.

## Tasks

- [ ] 1. Scaffold `index.html` with canvas, CONFIG, and asset loader
  - Create `index.html` with a 480×640 `<canvas>` element, CSS viewport scaling, and a retro pixel-art font loaded via Google Fonts or `@font-face`
  - Declare the central `CONFIG` object with all constants from the design (physics, pipes, particles, shake, clouds, etc.)
  - Implement the `AssetLoader`: load `assets/ghosty.png`, `assets/jump.wav`, `assets/game_over.wav`; expose `assets` object; fall back to canvas-drawn ghost shape if image fails; wrap audio in try/catch
  - Implement `playSound(audio)` using `cloneNode().play()` with a caught Promise rejection
  - Wrap `localStorage` reads/writes in try/catch; default high score to 0 if unavailable
  - Halt with a visible error message if `canvas.getContext('2d')` returns null
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 2. Implement the state machine and game loop
  - [ ] 2.1 Implement `setState(newState)` and the `gameState` variable; validate transitions to `MENU`, `PLAYING`, `PAUSED`, `GAME_OVER`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  - [ ]* 2.2 Write property test for game state validity (Property 12)
    - **Property 12: Game state is always valid**
    - **Validates: Requirements 6.1**
  - [ ]* 2.3 Write property test for pause round-trip (Property 13)
    - **Property 13: Pause is a round-trip**
    - **Validates: Requirements 6.4, 6.5**
  - [ ] 2.4 Implement the fixed-timestep game loop using `requestAnimationFrame` and an accumulator; call `physicsUpdate()` and `render(alpha)` stubs
    - _Requirements: 3.5_
  - [ ] 2.5 Wire keyboard (`Space`, `Escape`) and canvas click/tap event listeners; route inputs through the state machine
    - _Requirements: 2.1, 2.2, 2.3, 6.3, 6.4, 6.5, 6.7, 8.3_

- [ ] 3. Implement Ghosty physics
  - [ ] 3.1 Implement `physicsUpdate()` for Ghosty: apply gravity, clamp to terminal velocity, update position, store `prevY`
    - _Requirements: 3.1, 3.3, 3.4_
  - [ ]* 3.2 Write property test for physics tick invariant (Property 3)
    - **Property 3: Physics tick invariant**
    - **Validates: Requirements 3.1, 3.3, 3.4**
  - [ ] 3.3 Implement `applyFlap()`: set `vy` to `CONFIG.flapVelocity` only when state is `PLAYING`; play `jump.wav`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2_
  - [ ]* 3.4 Write property test for flap sets velocity (Property 1)
    - **Property 1: Flap sets velocity**
    - **Validates: Requirements 2.1, 2.2, 3.2**
  - [ ]* 3.5 Write property test for flap ignored outside PLAYING (Property 2)
    - **Property 2: Flap is ignored outside PLAYING**
    - **Validates: Requirements 2.3**
  - [ ] 3.6 Implement interpolated render position: `renderY = prevY + alpha * (currentY - prevY)`
    - _Requirements: 3.5_
  - [ ]* 3.7 Write property test for interpolated render position (Property 4)
    - **Property 4: Interpolated render position**
    - **Validates: Requirements 3.5**
  - [ ] 3.8 Implement sprite rotation: `angle = clamp(vy * CONFIG.tiltVelocityScale, CONFIG.maxTiltUp, CONFIG.maxTiltDown)`
    - _Requirements: 3.6_
  - [ ]* 3.9 Write property test for sprite rotation clamped (Property 5)
    - **Property 5: Sprite rotation is clamped**
    - **Validates: Requirements 3.6**

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement the pipe system with object pooling
  - [ ] 5.1 Initialise the pipe pool at game start (`Math.ceil(canvasWidth / pipeSpacing) + 2` objects); implement `acquirePipe(x, gapY)` and `releasePipe(p)`
    - _Requirements: 4.1, 4.7_
  - [ ] 5.2 Implement pipe spawning: spawn at fixed `pipeSpacing` intervals off the right edge; randomise `gapY` within `[gapMargin + gapSize/2, canvasHeight - gapMargin - gapSize/2]`
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ]* 5.3 Write property test for pipe gap within bounds (Property 6)
    - **Property 6: Pipe gap centre is within bounds**
    - **Validates: Requirements 4.3, 4.4**
  - [ ] 5.4 Implement pipe scrolling: subtract `pipeState.speed` from each pipe's `x` each tick; release pipes whose right edge goes below 0
    - _Requirements: 4.2, 4.7_
  - [ ]* 5.5 Write property test for pipe scrolls by speed (Property 7)
    - **Property 7: Pipe scrolls by speed each tick**
    - **Validates: Requirements 4.2**
  - [ ]* 5.6 Write property test for off-screen pipes removed (Property 8)
    - **Property 8: Off-screen pipes are removed**
    - **Validates: Requirements 4.7**
  - [ ] 5.7 Implement progressive speed increase: after every `speedMilestone` pipes passed, add `speedIncrement` to `pipeState.speed`, capped at `maxSpeed`
    - _Requirements: 4.5_
  - [ ]* 5.8 Write property test for pipe speed capped (Property 9)
    - **Property 9: Pipe speed is capped**
    - **Validates: Requirements 4.5**

- [ ] 6. Implement collision detection and boundary checks
  - [ ] 6.1 Implement `ghostyCircle()` returning `{cx, cy, r}` using `CONFIG.hitboxInset`
    - _Requirements: 5.1_
  - [ ]* 6.2 Write property test for Ghosty hitbox radius (Property 10)
    - **Property 10: Ghosty circle hitbox radius is correct**
    - **Validates: Requirements 5.1**
  - [ ] 6.3 Implement `pipeRects(pipe)` returning the two axis-aligned rects (top and bottom pipe bodies including caps)
    - _Requirements: 4.6, 4.8_
  - [ ] 6.4 Implement `circleRectOverlap(c, r)` using the closest-point algorithm from the design
    - _Requirements: 5.2_
  - [ ] 6.5 Implement `checkBoundaries()`: trigger immediate game over when circle touches top or bottom canvas edge
    - _Requirements: 3.7, 3.8, 5.6, 5.7_
  - [ ] 6.6 Implement per-frame collision loop: skip if `ghosty.invincible`; on overlap call `triggerPipeCollision()` which sets invincibility timer, starts flash animation, and schedules game over after `invincibilityMs`
    - _Requirements: 5.3, 5.4, 5.5_
  - [ ]* 6.7 Write property test for collision triggers game over after invincibility (Property 11)
    - **Property 11: Collision triggers game over after invincibility**
    - **Validates: Requirements 5.3, 5.4, 5.5**

- [ ] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement scoring and high score persistence
  - [ ] 8.1 Implement score increment: when `ghosty.x > pipe.x + pipeWidth / 2` and `!pipe.scored`, increment score, mark pipe scored, and call `playScoreChime()`
    - _Requirements: 7.1_
  - [ ]* 8.2 Write property test for score increments on pipe pass (Property 16)
    - **Property 16: Score increments on pipe pass**
    - **Validates: Requirements 7.1**
  - [ ] 8.3 Implement `formatHUD(score, highScore)` returning `"Score: N | High: N"`; render it on canvas during PLAYING
    - _Requirements: 7.2_
  - [ ]* 8.4 Write property test for HUD format (Property 17)
    - **Property 17: HUD format is correct**
    - **Validates: Requirements 7.2**
  - [ ] 8.5 On game over, compare score to high score; update and persist to `localStorage` if higher
    - _Requirements: 7.3, 7.4, 6.8_
  - [ ]* 8.6 Write property test for high score persistence round-trip (Property 15)
    - **Property 15: High score persistence round-trip**
    - **Validates: Requirements 6.8, 7.3, 7.4**
  - [ ] 8.7 Implement `resetGame()`: set score to 0, release all active pipes back to pool, reset Ghosty position and velocity, transition to PLAYING
    - _Requirements: 6.7, 8.3, 8.4_
  - [ ]* 8.8 Write property test for game reset clears state (Property 14)
    - **Property 14: Game reset clears state**
    - **Validates: Requirements 6.7, 8.3, 8.4**

- [ ] 9. Implement the renderer
  - [ ] 9.1 Implement background fill and sky gradient using Canvas 2D primitives
    - _Requirements: 9.1_
  - [ ] 9.2 Implement two parallax cloud layers: each cloud is a rounded rectangle; scroll each layer at its configured speed and opacity; wrap clouds when they scroll off-screen
    - _Requirements: 9.3, 9.4_
  - [ ]* 9.3 Write property test for cloud layer distinctness (Property 18)
    - **Property 18: Cloud layers have distinct speeds and opacities**
    - **Validates: Requirements 9.3, 9.4**
  - [ ] 9.4 Implement pipe renderer: draw pipe body and cap (wider rect at gap-facing end) in green with darker outline; batch all pipes in a single fill/stroke style block
    - _Requirements: 4.6, 9.2_
  - [ ] 9.5 Implement Ghosty renderer: `ctx.save()`, translate to interpolated position, apply squash/stretch scale and idle bob offset, rotate by computed tilt angle, `drawImage` (or fallback ghost shape), `ctx.restore()`; toggle visibility during flash; apply death spin rotation during GAME_OVER transition
    - _Requirements: 3.5, 3.6, 5.5_
  - [ ] 9.6 Implement screen shake: on collision, offset canvas transform by a random delta for `CONFIG.shakeFrames` frames with magnitude `CONFIG.shakeMagnitude`
    - _Requirements: 9.1_ (visual feedback)
  - [ ] 9.7 Implement ring-buffer particle trail: emit `particlesPerFrame` particles behind Ghosty each PLAYING frame; overwrite expired slots; render with fading alpha
    - _Requirements: 9.1_ (visual feedback)
  - [ ] 9.8 Implement score popup: on score increment, push a `ScorePopup` object; render "+1" floating upward and fading over `popupLife` frames
    - _Requirements: 7.1_ (visual feedback)
  - [ ] 9.9 Implement MENU, PAUSED, and GAME_OVER overlay screens with retro-style text showing score, high score, and appropriate prompts; use pixel-art font
    - _Requirements: 1.3, 6.2, 6.6, 8.1, 8.2, 9.5_

- [ ] 10. Implement the test suite
  - [ ] 10.1 Set up Vitest and fast-check: create `package.json` with `vitest` and `fast-check` as dev dependencies; create `vitest.config.js`; create the `tests/unit/` and `tests/property/` directory structure
    - _Requirements: (testing infrastructure)_
  - [ ] 10.2 Extract pure functions from `index.html` into a testable module or use inline exports guarded by `typeof module !== 'undefined'`; ensure `physicsUpdate`, `applyFlap`, `circleRectOverlap`, `pipeRects`, `ghostyCircle`, `formatHUD`, `setState`, `resetGame`, `computeRotation`, `interpolateY`, `updatePipeSpeed` are importable
    - _Requirements: (testing infrastructure)_
  - [ ] 10.3 Write unit tests in `tests/unit/`: asset loader resolves three assets; canvas is 480×640; initial state is MENU; MENU→PLAYING transition; game over plays sound and stops loop; invincibility timer set to 500 ms; boundary edge cases at y=0 and y=CANVAS_HEIGHT
    - _Requirements: 1.2, 1.4, 6.2, 6.3, 8.1, 5.4, 3.7, 3.8_
  - [ ] 10.4 Write property tests in `tests/property/physics.property.test.js`: Properties 1, 2, 3, 4, 5 (flap velocity, flap ignored, physics tick, interpolation, rotation clamp)
    - _Requirements: 2.1, 2.2, 2.3, 3.1–3.6_
  - [ ] 10.5 Write property tests in `tests/property/pipes.property.test.js`: Properties 6, 7, 8, 9 (gap bounds, scroll speed, off-screen removal, speed cap)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7_
  - [ ] 10.6 Write property tests in `tests/property/scoring.property.test.js`: Properties 15, 16, 17 (high score persistence, score increment, HUD format)
    - _Requirements: 6.8, 7.1, 7.2, 7.3, 7.4_
  - [ ] 10.7 Write property tests in `tests/property/state.property.test.js`: Properties 12, 13, 14 (state validity, pause round-trip, reset clears state)
    - _Requirements: 6.1, 6.4, 6.5, 6.7, 8.3, 8.4_
  - [ ] 10.8 Write property tests in `tests/property/rendering.property.test.js`: Properties 10, 11, 18 (hitbox radius, collision→game over, cloud layer distinctness)
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 9.3, 9.4_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all unit and property tests pass. Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests each include a `// Feature: flappy-kiro, Property N: <text>` comment tag per the design
- All property tests run a minimum of 100 fast-check iterations
- The game ships as a single `index.html` — no build step, no bundler
