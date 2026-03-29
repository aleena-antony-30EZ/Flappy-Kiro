# Canvas API & Collision Patterns

Companion to `game-coding-standards.md`. Covers Canvas 2D rendering patterns, animation frame handling, and collision detection algorithms used in this project.

---

## Canvas API Patterns

### Context Setup

Always grab the context once at init and reuse it. Never call `getContext` inside the game loop.

```js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
if (!ctx) { showFatalError('Canvas not supported'); }
```

### Pixel-Perfect Scaling

Scale the canvas CSS size to fill the viewport while keeping the internal resolution fixed at 480×640:

```js
function resizeCanvas() {
  const scale = Math.min(
    window.innerWidth  / CONFIG.canvasWidth,
    window.innerHeight / CONFIG.canvasHeight
  );
  canvas.style.width  = `${CONFIG.canvasWidth  * scale}px`;
  canvas.style.height = `${CONFIG.canvasHeight * scale}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

Never change `canvas.width` / `canvas.height` after init — that clears the canvas and resets all context state.

### Clear Strategy

Clear the full canvas at the start of each render call with a background fill (not `clearRect`) so the sky colour is always painted:

```js
function render(alpha) {
  ctx.fillStyle = CONFIG.skyColor;
  ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  // ... draw everything else on top
}
```

### Drawing Rounded Rectangles (Clouds)

Use `roundRect` where available, fall back to manual arc path:

```js
function drawRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
    ctx.fill();
  }
}
```

### Text Rendering

Set font once per overlay screen, not per character. Use `textAlign` and `textBaseline` to avoid manual offset math:

```js
ctx.font = '24px "Press Start 2P", monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = '#ffffff';
ctx.fillText('GAME OVER', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
```

For the HUD score bar, set font once at the start of `renderHUD()` and reuse it for all text in that call.

---

## Animation Frame Handling

### Starting and Stopping the Loop

Store the RAF id so the loop can be cancelled cleanly on game over:

```js
let rafId = null;

function startLoop() {
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}
```

### Handling Visibility Changes

Pause the accumulator when the tab is hidden to prevent a large `dt` spike on return:

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
  } else if (gameState === 'PLAYING') {
    lastTime = performance.now(); // reset clock before resuming
    startLoop();
  }
});
```

### Interpolation Helper

Always use this pattern for render-side interpolation — never lerp physics state directly:

```js
// Pure function — safe to call from render()
function lerp(a, b, t) { return a + (b - a) * t; }

// Usage in renderGhosty:
const renderY = lerp(ghosty.prevY, ghosty.y, alpha);
```

### Screen Shake Implementation

Apply shake as a canvas-level translation, not by offsetting individual draw calls:

```js
let shakeFrames = 0;

function triggerShake() { shakeFrames = CONFIG.shakeFrames; }

function applyShake(ctx) {
  if (shakeFrames <= 0) return;
  const mag = CONFIG.shakeMagnitude * (shakeFrames / CONFIG.shakeFrames);
  ctx.translate(
    (Math.random() * 2 - 1) * mag,
    (Math.random() * 2 - 1) * mag
  );
  shakeFrames--;
}

// In render(), wrap all world drawing:
ctx.save();
applyShake(ctx);
renderWorld(ctx, alpha);
ctx.restore();
// HUD is drawn after restore — it never shakes
renderHUD(ctx);
```

---

## Collision Detection Algorithms

### Circle–Rectangle (Ghosty vs Pipe)

The primary collision test. Finds the closest point on the rect to the circle centre, then checks distance:

```js
function circleRectOverlap(cx, cy, r, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy < r * r;  // avoid sqrt — compare squared distances
}
```

Usage:
```js
function checkPipeCollisions() {
  if (ghosty.isInvincible) return;
  const { cx, cy, r } = ghostyCircle();
  for (const pipe of pipeState.pipes) {
    if (!pipe.active) continue;
    const rects = pipeRects(pipe);
    for (const rect of rects) {
      if (circleRectOverlap(cx, cy, r, rect.x, rect.y, rect.w, rect.h)) {
        triggerPipeCollision();
        return; // only trigger once per frame
      }
    }
  }
}
```

### Boundary Detection (Ground / Ceiling)

Simple Y-axis check — runs before pipe collision tests each tick:

```js
function checkBoundaries() {
  const { cy, r } = ghostyCircle();
  if (cy + r >= CONFIG.canvasHeight) { triggerGameOver(); return; }
  if (cy - r <= 0)                   { triggerGameOver(); return; }
}
```

### Broad-Phase Culling

Skip collision tests for pipes that are entirely off-screen or haven't reached Ghosty's x yet. Cheap x-range check before the circle-rect test:

```js
function isNearGhosty(pipe) {
  return pipe.x < CONFIG.ghostX + CONFIG.ghostWidth + CONFIG.hitboxRadius
      && pipe.x + CONFIG.pipeWidth > CONFIG.ghostX - CONFIG.hitboxRadius;
}

// In checkPipeCollisions():
if (!pipe.active || !isNearGhosty(pipe)) continue;
```

This reduces collision tests to at most 1–2 pipes per frame regardless of how many are active.

### Scoring Trigger (Line Crossing)

Score when Ghosty's centre crosses the pipe's centre x — not the leading edge. Prevents double-counting:

```js
function checkScoring() {
  const ghostCx = CONFIG.ghostX + CONFIG.ghostWidth / 2;
  for (const pipe of pipeState.pipes) {
    if (!pipe.active || pipe.hasScored) continue;
    const pipeCx = pipe.x + CONFIG.pipeWidth / 2;
    if (ghostCx > pipeCx) {
      pipe.hasScored = true;
      scoreState.score++;
      playScoreChime();
      spawnScorePopup();
    }
  }
}
```

---

## Debugging Helpers

Keep these behind a `CONFIG.debug` flag — never ship with them active:

```js
// In CONFIG:
debug: false,

// Draw hitboxes
function debugDraw(ctx) {
  if (!CONFIG.debug) return;
  const { cx, cy, r } = ghostyCircle();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,0,0,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const pipe of pipeState.pipes) {
    if (!pipe.active) continue;
    for (const rect of pipeRects(pipe)) {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
  }
  ctx.restore();
}
```
