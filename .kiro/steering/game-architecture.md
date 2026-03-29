# Game Architecture Standards

Covers modular system organisation, event handling, and state management for Flappy Kiro.

---

## Modular System Organisation

The game is a single `index.html` file. Organise the inline script into clearly delimited sections using comment banners. Each section owns its data and functions — no cross-section mutation except through defined interfaces.

```
// ═══════════════════════════════════════════════
// 1. CONFIG
// ═══════════════════════════════════════════════
// 2. ASSET LOADER
// ═══════════════════════════════════════════════
// 3. STATE MACHINE
// ═══════════════════════════════════════════════
// 4. GHOSTY  (data + update + render)
// ═══════════════════════════════════════════════
// 5. PIPES   (data + pool + update + render)
// ═══════════════════════════════════════════════
// 6. CLOUDS  (data + update + render)
// ═══════════════════════════════════════════════
// 7. PARTICLES  (ring buffer + update + render)
// ═══════════════════════════════════════════════
// 8. COLLISION
// ═══════════════════════════════════════════════
// 9. SCORING
// ═══════════════════════════════════════════════
// 10. AUDIO
// ═══════════════════════════════════════════════
// 11. RENDERER  (orchestrates all render calls)
// ═══════════════════════════════════════════════
// 12. GAME LOOP
// ═══════════════════════════════════════════════
// 13. INPUT
// ═══════════════════════════════════════════════
// 14. INIT
// ═══════════════════════════════════════════════
```

### Section Ownership Rules

- Each section owns its own state object(s)
- Sections communicate by calling each other's functions — never by reaching into another section's data directly
- `RENDERER` is the only section allowed to call render functions from other sections
- `GAME LOOP` is the only section allowed to call `physicsUpdate` functions
- `INPUT` is the only section allowed to call `setState()`

---

## Event Handling Patterns

### Single Registration Point

All event listeners are registered in the `INIT` section, never scattered through the code:

```js
// ─── INIT ────────────────────────────────────────────────
function init() {
  setupCanvas();
  loadAssets().then(() => {
    registerInputHandlers();
    setState('MENU');
    startLoop();
  });
}

function registerInputHandlers() {
  document.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('click',    onCanvasClick);
  canvas.addEventListener('touchstart', onCanvasTouch, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
}
```

### Input Handler Pattern

Input handlers are thin — they only read `gameState` and call the appropriate action function. No game logic inside handlers:

```js
function onKeyDown(e) {
  if (e.code === 'Space') {
    e.preventDefault();
    onFlapInput();
  }
  if (e.code === 'Escape') {
    onPauseInput();
  }
}

function onCanvasClick()         { onFlapInput(); }
function onCanvasTouch(e)        { e.preventDefault(); onFlapInput(); }

// Action functions contain the actual logic
function onFlapInput() {
  if (gameState === 'PLAYING')   { applyFlap(); return; }
  if (gameState === 'MENU')      { setState('PLAYING'); return; }
  if (gameState === 'GAME_OVER') { resetGame(); return; }
}

function onPauseInput() {
  if (gameState === 'PLAYING')   { setState('PAUSED'); return; }
  if (gameState === 'PAUSED')    { setState('PLAYING'); return; }
}
```

### No Anonymous Listeners

Always use named functions for event listeners so they can be removed if needed:

```js
// GOOD
document.addEventListener('keydown', onKeyDown);
document.removeEventListener('keydown', onKeyDown);

// AVOID
document.addEventListener('keydown', (e) => { ... }); // can't remove
```

---

## State Management

### The State Machine

`gameState` is the single source of truth for game mode. All branching logic checks it.

```js
let gameState = 'MENU'; // 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'

const STATE_TRANSITIONS = {
  'MENU':      ['PLAYING'],
  'PLAYING':   ['PAUSED', 'GAME_OVER'],
  'PAUSED':    ['PLAYING'],
  'GAME_OVER': ['PLAYING']
};

function setState(newState) {
  const allowed = STATE_TRANSITIONS[gameState];
  if (!allowed || !allowed.includes(newState)) {
    console.warn(`Invalid transition: ${gameState} → ${newState}`);
    return;
  }
  gameState = newState;
  onStateEnter(newState);
}

function onStateEnter(state) {
  if (state === 'PLAYING')   { onEnterPlaying(); }
  if (state === 'GAME_OVER') { onEnterGameOver(); }
  if (state === 'PAUSED')    { onEnterPaused(); }
  if (state === 'MENU')      { onEnterMenu(); }
}
```

### State Entry Actions

Each state has a dedicated entry function that sets up what's needed:

```js
function onEnterPlaying() {
  // Called both from MENU→PLAYING and GAME_OVER→PLAYING (restart)
  resetGame();
  startLoop();
}

function onEnterGameOver() {
  stopLoop();
  updateHighScore();
  playSound(assets.gameOverSound);
  triggerShake();
  // Render one final frame to show the game over overlay
  render(1.0);
}

function onEnterPaused() {
  stopLoop();
}

function onEnterMenu() {
  stopLoop();
  resetGame();
}
```

### Reset Is Always Total

`resetGame()` resets every piece of mutable state. No partial resets:

```js
function resetGame() {
  // Ghosty
  ghosty.y = CONFIG.canvasHeight / 2;
  ghosty.prevY = ghosty.y;
  ghosty.vy = 0;
  ghosty.isInvincible = false;
  ghosty.invincibleTimer = 0;
  ghosty.flashVisible = true;
  ghosty.squashX = 1; ghosty.squashY = 1; ghosty.squashTimer = 0;
  ghosty.deathAngle = 0; ghosty.animFrame = 0;

  // Pipes
  for (const p of pipeState.pipes) releasePipe(p);
  pipeState.pipes.length = 0;
  pipeState.speed = CONFIG.pipeStartSpeed;
  pipeState.spawnTimer = 0;
  pipeState.pipesPassed = 0;

  // Score
  scoreState.score = 0;

  // Effects
  shakeFrames = 0;
  particleCursor = 0;
  for (const p of particles) p.active = false;
  scorePopups.length = 0;
}
```
