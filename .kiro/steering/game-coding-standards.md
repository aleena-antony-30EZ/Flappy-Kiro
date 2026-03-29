# Game Coding Standards

Standards for Flappy Kiro and any future browser-based canvas games in this workspace.

---

## JavaScript Patterns

### No Classes — Plain Objects and Functions

This project uses plain JS objects and functions, not ES6 classes. This keeps the single-file structure simple and avoids `this` binding issues in callbacks.

```js
// GOOD
const ghosty = { x: 0, y: 0, vy: 0 };
function applyFlap(ghosty) { ghosty.vy = CONFIG.flapVelocity; }

// AVOID
class Ghosty {
  constructor() { this.x = 0; }
  flap() { this.vy = CONFIG.flapVelocity; }
}
```

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Game objects | camelCase noun | `ghosty`, `pipeState`, `scoreState` |
| Functions | camelCase verb | `applyFlap()`, `triggerGameOver()` |
| Constants / CONFIG keys | camelCase | `CONFIG.flapVelocity` |
| Game states | UPPER_SNAKE string | `'MENU'`, `'PLAYING'`, `'GAME_OVER'` |
| Event handlers | `on` prefix | `onKeyDown()`, `onCanvasClick()` |
| Boolean flags | `is`/`has` prefix | `isInvincible`, `hasScored` |

### CONFIG Is the Single Source of Truth

Every numeric constant lives in `CONFIG`. No magic numbers anywhere else.

```js
// GOOD
ghosty.vy = CONFIG.flapVelocity;

// NEVER
ghosty.vy = -8;
```

---

## Game Loop Structure

Use the fixed-timestep accumulator pattern. Physics and rendering are always separate functions.

```js
const FIXED_STEP = 1000 / 60; // ms per physics tick
let accumulator = 0;
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min(timestamp - lastTime, 100); // cap at 100ms to avoid spiral
  lastTime = timestamp;
  accumulator += dt;

  while (accumulator >= FIXED_STEP) {
    physicsUpdate();
    accumulator -= FIXED_STEP;
  }

  const alpha = accumulator / FIXED_STEP;
  render(alpha);

  if (gameState === 'PLAYING' || gameState === 'PAUSED') {
    requestAnimationFrame(loop);
  }
}
```

Rules:
- `physicsUpdate()` never touches the canvas
- `render(alpha)` never mutates game state
- Cap `dt` to prevent the "spiral of death" on tab focus restore
- Store `rafId = requestAnimationFrame(loop)` so the loop can be cancelled cleanly

---

## Entity-Component Pattern (Lightweight)

For a single-file game, full ECS is overkill. Use **plain objects with update/render functions** grouped by concern:

```js
// Entity = plain data object
const ghosty = { x, y, vy, width, height, ... };

// "Components" = standalone functions that operate on the entity
function updateGhosty(ghosty) { ... }   // physics
function renderGhosty(ctx, ghosty, alpha) { ... }  // drawing
function ghostyCircle(ghosty) { ... }   // collision shape
```

Group related functions together with a comment header:
```js
// ─── GHOSTY ──────────────────────────────────────────────
function updateGhosty() { ... }
function renderGhosty() { ... }
function applyFlap() { ... }

// ─── PIPES ───────────────────────────────────────────────
function spawnPipe() { ... }
function updatePipes() { ... }
function renderPipes() { ... }
```

---

## Memory Management

### Object Pooling for Frequently Spawned Objects

Never use `new` or object literals inside the game loop for objects that are created and destroyed repeatedly.

```js
// GOOD — pool allocated at init, reused each spawn
function acquirePipe(x, gapY) {
  const p = pipeState.pool.find(p => !p.active);
  p.x = x; p.gapY = gapY; p.scored = false; p.active = true;
  return p;
}
function releasePipe(p) { p.active = false; }

// AVOID — allocates on every spawn, triggers GC
function spawnPipe(x, gapY) {
  pipeState.pipes.push({ x, gapY, scored: false });
}
```

Pool size formula: `Math.ceil(canvasWidth / pipeSpacing) + 2`

### Ring Buffer for Particles

Particles are short-lived and numerous. Use a fixed-size array with a write cursor instead of push/splice:

```js
const MAX_PARTICLES = CONFIG.particlesPerFrame * CONFIG.particleLife;
const particles = new Array(MAX_PARTICLES).fill(null).map(() => ({ active: false }));
let particleCursor = 0;

function emitParticle(x, y) {
  const p = particles[particleCursor % MAX_PARTICLES];
  p.x = x; p.y = y; p.life = CONFIG.particleLife; p.active = true;
  particleCursor++;
}
```

### Avoid Allocations in Hot Paths

In `physicsUpdate()` and `render()`, avoid:
- `new Array()`, `[]`, `{}` literals
- `.map()`, `.filter()`, `.reduce()` on game object arrays
- String concatenation (use template literals only in HUD render, not physics)
- `Math.random()` calls beyond what's needed (batch random values if possible)

---

## Canvas Performance

### Batch Draw Calls by Style

Group all draw calls that share the same `fillStyle`, `strokeStyle`, or `globalAlpha` to minimise state changes:

```js
// GOOD — set style once, draw all pipes
ctx.fillStyle = '#2d8a2d';
ctx.strokeStyle = '#1a5c1a';
ctx.lineWidth = 2;
for (const pipe of pipeState.pipes) {
  if (!pipe.active) continue;
  drawPipe(ctx, pipe);
}

// AVOID — setting style inside the loop
for (const pipe of pipeState.pipes) {
  ctx.fillStyle = '#2d8a2d'; // redundant state change every iteration
  drawPipe(ctx, pipe);
}
```

### Render Order (back to front)

Always render in this order to avoid overdraw issues:
1. Background fill
2. Far cloud layer
3. Near cloud layer
4. Pipes
5. Particles
6. Ghosty
7. HUD / overlays

### Minimise save/restore

Only call `ctx.save()` / `ctx.restore()` when you need to apply a transform (rotation, translation for shake/sprite). Direct property assignment is faster for everything else.

```js
// GOOD — direct assignment for simple alpha changes
ctx.globalAlpha = layer.opacity;
drawClouds(ctx, layer);
ctx.globalAlpha = 1.0;

// ONLY use save/restore when transforms are involved
ctx.save();
ctx.translate(cx, cy);
ctx.rotate(angle);
ctx.drawImage(assets.ghosty, -w/2, -h/2, w, h);
ctx.restore();
```

---

## State Machine Rules

- `gameState` is always one of: `'MENU'`, `'PLAYING'`, `'PAUSED'`, `'GAME_OVER'`
- All state transitions go through `setState(newState)` — never assign `gameState` directly
- Input handlers check `gameState` before acting — never let physics or rendering drive state changes
- `physicsUpdate()` early-returns if `gameState !== 'PLAYING'`

---

## Error Handling

Wrap all external APIs defensively:

```js
// Audio
try { audio.cloneNode().play().catch(() => {}); } catch (e) {}

// localStorage
function saveHighScore(score) {
  try { localStorage.setItem('flappyKiroHigh', score); } catch (e) {}
}
function loadHighScore() {
  try { return parseInt(localStorage.getItem('flappyKiroHigh') || '0'); } catch (e) { return 0; }
}

// Web Audio
try {
  const ctx = getAudioCtx();
  // ... synth code
} catch (e) { /* silence */ }
```

Never let a failed audio or storage call crash the game loop.
