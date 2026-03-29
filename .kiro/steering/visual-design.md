# Visual Design

Sprite rendering, animation systems, particle effects, and background parallax for Flappy Kiro.

---

## Ghosty Character Animations

Ghosty uses a single `assets/ghosty.png` sprite (32×32 px, rendered at 40×40 px). All animation is achieved through canvas transforms — no spritesheet required.

### Tilt (always active during PLAYING)

Maps vertical velocity to a rotation angle, clamped to prevent extreme angles:

```js
// angle = clamp(vy * tiltVelocityScale, maxTiltUp, maxTiltDown)
// CONFIG values: tiltVelocityScale=4, maxTiltUp=-25°, maxTiltDown=90°
const tiltDeg = clamp(ghosty.vy * CONFIG.tiltVelocityScale, CONFIG.maxTiltUp, CONFIG.maxTiltDown);
const tiltRad = tiltDeg * Math.PI / 180;
```

- Falling fast → nose-down (up to 90°)
- Rising → level or slightly nose-up (down to -25°)
- Feels natural without being disorienting

### Idle Bob (MENU state only)

Sine-wave vertical offset applied to the render position, never to physics state:

```js
const bobOffset = Math.sin(ghosty.animFrame * CONFIG.idleBobFrequency) * CONFIG.idleBobAmplitude;
// CONFIG: idleBobFrequency=0.05 rad/frame, idleBobAmplitude=2px
```

Apply as a Y offset in the `ctx.translate()` call, not by modifying `ghosty.y`.

### Flap Squash/Stretch (triggered on each flap)

Instant scale change on flap, lerped back to 1.0 over `flapSquashFrames`:

```js
// On flap:
ghosty.squashX    = CONFIG.flapSquashX;    // 0.75 — narrow
ghosty.squashY    = CONFIG.flapSquashY;    // 1.25 — tall
ghosty.squashTimer = CONFIG.flapSquashFrames; // 6 frames

// Each physics tick:
const t = 1 - ghosty.squashTimer / CONFIG.flapSquashFrames;
ghosty.squashX = lerp(CONFIG.flapSquashX, 1.0, t);
ghosty.squashY = lerp(CONFIG.flapSquashY, 1.0, t);
ghosty.squashTimer--;
```

Apply via `ctx.scale(ghosty.squashX, ghosty.squashY)` after translate and rotate.

### Death Spin (GAME_OVER transition)

Accumulated rotation added on top of tilt during the game over moment:

```js
// In physicsUpdate(), when gameState === 'GAME_OVER':
ghosty.deathAngle += CONFIG.deathSpinSpeed; // 15°/frame

// In renderGhosty():
let tiltDeg = computeRotation(ghosty.vy);
if (gameState === 'GAME_OVER') tiltDeg += ghosty.deathAngle;
```

### Invincibility Flash

Toggle `ghosty.flashVisible` every `flashIntervalMs` (80 ms) during the invincibility period. Skip the entire `drawImage` call when `!ghosty.flashVisible`:

```js
if (!ghosty.flashVisible) return; // skip draw entirely
```

### Full Render Call Order

```js
ctx.save();
ctx.translate(cx, renderY + ghosty.height/2 + bobOffset); // position + bob
ctx.rotate(tiltRad);                                        // tilt + death spin
ctx.scale(ghosty.squashX, ghosty.squashY);                 // squash/stretch
ctx.drawImage(assets.ghosty, -w/2, -h/2, w, h);           // sprite
ctx.restore();
```

---

## Wall (Pipe) Textures

Pipes are drawn with Canvas 2D primitives — no image assets. The retro look comes from a two-tone fill + stroke approach.

### Colours

```js
ctx.fillStyle   = '#2d8a2d';  // medium green body
ctx.strokeStyle = '#1a5c1a';  // darker green outline
ctx.lineWidth   = 2;
```

Set these ONCE before the pipe loop — never inside it.

### Pipe Structure

Each pipe pair has four draw calls:

```
Top pipe body:   fillRect(pipe.x, 0, pipeWidth, gapTop)
Top pipe cap:    fillRect(capX, gapTop - capHeight, capWidth, capHeight)
Bottom pipe cap: fillRect(capX, gapBottom, capWidth, capHeight)
Bottom pipe body: fillRect(pipe.x, gapBottom, pipeWidth, canvasHeight - gapBottom)
```

Cap x offset (centres the wider cap on the pipe body):
```js
const capX = pipe.x - (CONFIG.pipeCapWidth - CONFIG.pipeWidth) / 2;
// CONFIG: pipeWidth=60, pipeCapWidth=72 → capX = pipe.x - 6
```

Always follow each `fillRect` with a matching `strokeRect` for the outline.

### Retro Feel

The simple flat fill + dark outline is intentional. Do not add gradients, shadows, or textures to pipes — the sketchy background provides all the visual interest needed.

---

## Background Parallax

Two cloud layers scroll at different speeds and opacities to create depth. Clouds are drawn as white rounded rectangles.

### Layer Configuration

```js
cloudLayers = [
  { speed: 18/60, opacity: 0.25 },  // far layer — slow, faint
  { speed: 42/60, opacity: 0.55 }   // near layer — faster, more opaque
]
```

### Rendering Pattern

Set `globalAlpha` once per layer, draw all clouds in that layer, then reset:

```js
ctx.fillStyle = '#ffffff';
for (const layer of cloudLayers) {
  ctx.globalAlpha = layer.opacity;
  for (const cloud of layer.clouds) {
    cloud.x -= layer.speed;
    if (cloud.x + cloud.w < 0) cloud.x = CONFIG.canvasWidth + cloud.w;
    drawRoundRect(ctx, cloud.x, cloud.y, cloud.w, cloud.h, 12);
  }
}
ctx.globalAlpha = 1.0; // always reset after
```

Never set `globalAlpha` inside the cloud loop — one state change per layer.

### Cloud Sizing

Far layer clouds: smaller (60–110 px wide, 22–32 px tall), positioned higher (y: 60–140 px).
Near layer clouds: larger (80–140 px wide, 28–42 px tall), positioned lower (y: 110–240 px).

Pre-generate cloud positions at init using deterministic values — not `Math.random()` each frame.

### Sky Gradient

```js
const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.canvasHeight);
grad.addColorStop(0, '#87CEEB');  // light blue at top
grad.addColorStop(1, '#5BA3C9');  // slightly darker at bottom
ctx.fillStyle = grad;
ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
```

Create the gradient object once per frame (it's cheap). Do not cache it across frames.

### Sketchy Texture

15 pre-generated thin lines drawn over the gradient each frame:

```js
ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
ctx.lineWidth = 1;
// BG_TEXTURE_LINES is a fixed array generated at init with a seeded LCG
for (const l of BG_TEXTURE_LINES) {
  ctx.beginPath();
  ctx.moveTo(l.x1, l.y1);
  ctx.lineTo(l.x2, l.y2);
  ctx.stroke();
}
```

---

## Particle Effects

### Trail Particles

Emitted behind Ghosty every PLAYING frame using a ring buffer (no allocation mid-session).

```js
// Emit CONFIG.particlesPerFrame (2) particles per frame
// Position: x = ghosty.x, y = ghosty.y + ghosty.height/2
// Life: CONFIG.particleLife (20 frames)
// Radius: CONFIG.particleRadius (3 px)
// Colour: rgba(200, 220, 255, alpha) — pale blue-white
```

Alpha fades linearly: `alpha = (life / maxLife) * 0.6`

Set `globalAlpha` per particle inside the render loop (each has a different alpha). Reset to 1.0 after the loop.

### Score Popup

Spawned at Ghosty's position when a pipe is scored:

```js
scorePopups.push({ x: ghosty.x + ghosty.width, y: ghosty.y, life: CONFIG.popupLife });
```

Render as "+1" text floating upward:
- Font: `12px "Press Start 2P", monospace`
- Colour: `#ffe066` (gold)
- Alpha: `life / CONFIG.popupLife` (fades out)
- Y decrements by `CONFIG.popupRiseSpeed` (1 px/frame) each render

Remove when `life <= 0` (iterate backwards to splice safely).

### Screen Shake

Applied as a canvas-level translation wrapping all world rendering:

```js
ctx.save();
applyShake(ctx);   // translates by random delta, decrements shakeFrames
renderWorld();
ctx.restore();
// HUD and overlays drawn AFTER restore — they never shake
```

Shake magnitude decays linearly: `mag = CONFIG.shakeMagnitude * (shakeFrames / CONFIG.shakeFrames)`

---

## Render Order (back to front)

Always render in this exact order to avoid overdraw issues:

1. Sky gradient + texture lines
2. Far cloud layer (globalAlpha 0.25)
3. Near cloud layer (globalAlpha 0.55)
4. Pipes (batched, single style set)
5. Trail particles (ring buffer)
6. Ghosty sprite (with transforms)
7. `ctx.restore()` — end shake region
8. HUD bar (score, never shakes)
9. Score popups
10. State overlays (MENU / PAUSED / GAME_OVER)

---

## HUD and Overlays

### Score Bar

Fixed at the bottom of the canvas, always visible:

```js
// Dark semi-transparent bar
ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
ctx.fillRect(0, CONFIG.canvasHeight - 30, CONFIG.canvasWidth, 30);

// Centred text
ctx.font         = '10px "Press Start 2P", monospace';
ctx.textAlign    = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle    = '#ffffff';
ctx.fillText(formatHUD(score, highScore), CONFIG.canvasWidth/2, CONFIG.canvasHeight - 15);
```

### Overlay Boxes

All overlay screens use the same pattern: semi-transparent dark fill rect, then text on top. Set font and alignment once per overlay, not per text call.

Colour palette for overlays:
- Title text: `#ffffff`
- Prompt text: `#ffe066` (gold)
- Game over title: `#ff4444` (red)
- Secondary text: `#cccccc`
- New best: `#ffe066` with `★` prefix/suffix

### Font

Always `"Press Start 2P", monospace` — loaded from Google Fonts. Never fall back to a system font for game text; the retro pixel aesthetic depends on it.
