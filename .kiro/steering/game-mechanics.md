# Game Mechanics

Physics constants, movement algorithms, and collision patterns for Flappy Kiro. All values reference `CONFIG` — see `game-config.json` for the source numbers.

---

## Physics Constants

All physics runs at a fixed 60 fps tick. Real-world units from `game-config.json` are converted at init:

| Constant | Source value | Per-frame value | Description |
|---|---|---|---|
| `CONFIG.gravity` | 800 px/s² | 0.222 px/frame² | Downward acceleration per tick |
| `CONFIG.flapVelocity` | -300 px/s | -5 px/frame | Upward velocity on flap |
| `CONFIG.terminalVelocity` | 720 px/s | 12 px/frame | Max downward speed |
| `CONFIG.pipeStartSpeed` | 120 px/s | 2.0 px/frame | Initial pipe scroll speed |
| `CONFIG.maxSpeed` | 360 px/s | 6.0 px/frame | Pipe speed hard cap |
| `CONFIG.speedIncrement` | 24 px/s | 0.4 px/frame | Speed added per milestone |
| `CONFIG.pipeGap` | — | 140 px | Vertical gap between pipes |
| `CONFIG.pipeSpacing` | — | 350 px | Horizontal distance between pipe pairs |
| `CONFIG.hitboxRadius` | — | 12 px | Ghosty collision circle radius |

---

## Movement Algorithms

### Ghosty Physics Tick

Runs once per fixed step (1000/60 ms). Always in this order:

```js
function updateGhosty() {
  ghosty.prevY = ghosty.y;                                      // 1. save previous position
  ghosty.vy = Math.min(ghosty.vy + CONFIG.gravity,             // 2. apply gravity, clamp
                        CONFIG.terminalVelocity);
  ghosty.y += ghosty.vy;                                        // 3. integrate position
  ghosty.animFrame++;                                           // 4. advance animation clock
  updateSquash();                                               // 5. lerp squash back to 1.0
  updateInvincibility();                                        // 6. tick invincibility timer
}
```

### Flap

Overrides current velocity unconditionally — no additive impulse:

```js
function applyFlap() {
  ghosty.vy = CONFIG.flapVelocity;   // always -5 px/frame, regardless of current vy
  ghosty.squashX = CONFIG.flapSquashX;
  ghosty.squashY = CONFIG.flapSquashY;
  ghosty.squashTimer = CONFIG.flapSquashFrames;
  playSound(assets.jumpSound);
}
```

### Pipe Scrolling

All active pipes move at the same speed each tick:

```js
function updatePipes() {
  for (const pipe of pipeState.pipes) {
    if (!pipe.active) continue;
    pipe.x -= pipeState.speed;
    if (pipe.x + CONFIG.pipeWidth < 0) releasePipe(pipe);
  }
  updatePipeSpawn();
  updatePipeSpeed();
}
```

### Progressive Speed Increase

Speed steps up every `speedMilestone` pipes, capped at `maxSpeed`:

```js
function updatePipeSpeed() {
  const steps = Math.floor(pipeState.pipesPassed / CONFIG.speedMilestone);
  pipeState.speed = Math.min(
    CONFIG.pipeStartSpeed + steps * CONFIG.speedIncrement,
    CONFIG.maxSpeed
  );
}
```

### Pipe Spawning

Spawn when the last pipe has scrolled far enough to maintain `pipeSpacing`:

```js
function updatePipeSpawn() {
  const lastPipe = pipeState.pipes.filter(p => p.active)
                                  .sort((a, b) => b.x - a.x)[0];
  const spawnX = CONFIG.canvasWidth + CONFIG.pipeWidth;

  if (!lastPipe || lastPipe.x <= CONFIG.canvasWidth - CONFIG.pipeSpacing) {
    const minGapY = CONFIG.gapMargin + CONFIG.pipeGap / 2;
    const maxGapY = CONFIG.canvasHeight - CONFIG.gapMargin - CONFIG.pipeGap / 2;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    const pipe = acquirePipe(spawnX, gapY);
    pipeState.pipes.push(pipe);
  }
}
```

---

## Collision Patterns

### Execution Order Each Physics Tick

Always check boundaries first — they bypass invincibility:

```js
function checkCollisions() {
  checkBoundaries();          // instant game over, no invincibility
  checkPipeCollisions();      // respects invincibility flag
}
```

### Ghosty Circle

```js
function ghostyCircle() {
  return {
    cx: ghosty.x + CONFIG.ghostWidth  / 2,
    cy: ghosty.y + CONFIG.ghostHeight / 2,
    r:  CONFIG.hitboxRadius
  };
}
```

### Pipe Rectangles

Two rects per pipe — top body and bottom body (caps included in height):

```js
function pipeRects(pipe) {
  const gapTop    = pipe.gapY - CONFIG.pipeGap / 2;
  const gapBottom = pipe.gapY + CONFIG.pipeGap / 2;
  return [
    { x: pipe.x, y: 0,        w: CONFIG.pipeWidth, h: gapTop },
    { x: pipe.x, y: gapBottom, w: CONFIG.pipeWidth, h: CONFIG.canvasHeight - gapBottom }
  ];
}
```

### Circle–Rect Test (squared distance, no sqrt)

```js
function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;
}
```

### Broad-Phase Culling

Skip pipes that can't possibly overlap Ghosty's x range:

```js
function isNearGhosty(pipe) {
  return pipe.x < CONFIG.ghostX + CONFIG.ghostWidth  + CONFIG.hitboxRadius
      && pipe.x + CONFIG.pipeWidth > CONFIG.ghostX   - CONFIG.hitboxRadius;
}
```

### Invincibility Timer

Ticked in `updateGhosty()`, not in the render loop:

```js
function updateInvincibility() {
  if (!ghosty.isInvincible) return;
  ghosty.invincibleTimer -= 1000 / 60;   // subtract one fixed step in ms
  if (ghosty.invincibleTimer <= 0) {
    ghosty.isInvincible = false;
    triggerGameOver();
  }
  // Flash: toggle visibility every flashIntervalMs
  const elapsed = CONFIG.invincibilityMs - ghosty.invincibleTimer;
  ghosty.flashVisible = Math.floor(elapsed / CONFIG.flashIntervalMs) % 2 === 0;
}
```

---

## Pseudo-Animation Algorithms

### Idle Bob

Applied as a Y offset in `renderGhosty()` — never modifies `ghosty.y`:

```js
const bobOffset = Math.sin(ghosty.animFrame * CONFIG.idleBobFrequency)
                  * CONFIG.idleBobAmplitude;
```

### Squash/Stretch Lerp

```js
function updateSquash() {
  if (ghosty.squashTimer <= 0) return;
  const t = 1 - ghosty.squashTimer / CONFIG.flapSquashFrames;
  ghosty.squashX = lerp(CONFIG.flapSquashX, 1.0, t);
  ghosty.squashY = lerp(CONFIG.flapSquashY, 1.0, t);
  ghosty.squashTimer--;
}
```

### Death Spin

Accumulated in `updateGhosty()` only after game over is triggered, before the loop stops:

```js
if (gameState === 'GAME_OVER') {
  ghosty.deathAngle += CONFIG.deathSpinSpeed;
}
```

In `renderGhosty()`, add `ghosty.deathAngle` to the tilt angle when in GAME_OVER state.
