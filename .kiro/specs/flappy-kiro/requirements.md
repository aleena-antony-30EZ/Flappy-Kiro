# Requirements Document

## Introduction

Flappy Kiro is a browser-based retro endless scroller game inspired by Flappy Bird. The player controls a ghost character (Ghosty) through an infinite series of pipe obstacles. The game features a sketchy/retro art style, sound effects, and a persistent high score. The game runs entirely in the browser with no server-side dependencies.

## Glossary

- **Game**: The browser-based Flappy Kiro application
- **Ghosty**: The ghost sprite character controlled by the player
- **Pipe**: A vertical obstacle consisting of a top pipe and a bottom pipe with a gap between them
- **Gap**: The vertical opening between the top and bottom pipe through which Ghosty must pass
- **Score**: The count of pipe pairs successfully passed by Ghosty in the current session
- **High_Score**: The highest Score achieved, persisted across sessions
- **Game_Loop**: The continuous update-and-render cycle that drives gameplay
- **Canvas**: The HTML5 canvas element on which the game is rendered
- **Gravity**: The constant downward acceleration applied to Ghosty each frame
- **Flap**: The upward velocity impulse applied to Ghosty on player input
- **Terminal_Velocity**: The maximum downward speed Ghosty can reach, used to clamp vertical velocity
- **Ascent_Velocity**: The fixed upward velocity applied to Ghosty when a Flap input is received
- **Pipe_Speed**: The current horizontal scroll speed of all active Pipe pairs, in pixels per frame
- **Pipe_Spacing**: The fixed horizontal distance between the leading edges of consecutive Pipe pairs
- **Gap_Size**: The vertical height of the opening between the top and bottom pipe of a pair
- **Cloud_Layer**: A set of background cloud decorations rendered at a given parallax depth, each with its own scroll speed and opacity
- **Hitbox**: The axis-aligned bounding rectangle used for collision detection, inset from the visible sprite boundary
- **Invincibility_Frame**: A brief period after a collision is detected during which further collisions are ignored, allowing a response animation to play
- **Game_State**: The current mode of the game — one of MENU, PLAYING, PAUSED, or GAME_OVER

## Requirements

### Requirement 1: Game Initialization

**User Story:** As a player, I want the game to load in my browser without installation, so that I can start playing immediately.

#### Acceptance Criteria

1. THE Game SHALL run entirely in the browser using HTML5, CSS, and JavaScript with no build step or server required.
2. THE Game SHALL load the `assets/ghosty.png` sprite and `assets/jump.wav` and `assets/game_over.wav` audio files on startup.
3. WHEN the Game page is opened, THE Game SHALL display a start screen prompting the player to begin.
4. THE Canvas SHALL render the game at a fixed resolution of 480x640 pixels.

---

### Requirement 2: Player Controls

**User Story:** As a player, I want to control Ghosty with a single input, so that the game is easy to pick up.

#### Acceptance Criteria

1. WHEN the player presses the Space key, THE Game SHALL apply a Flap impulse to Ghosty, moving Ghosty upward.
2. WHEN the player clicks or taps the Canvas, THE Game SHALL apply a Flap impulse to Ghosty, moving Ghosty upward.
3. WHILE the game is not in an active play state, THE Game SHALL ignore Flap inputs that would affect Ghosty's physics.
4. WHEN a Flap input is received during active play, THE Game SHALL play the `jump.wav` sound effect.

---

### Requirement 3: Ghosty Physics

**User Story:** As a player, I want Ghosty to feel responsive and have realistic gravity, so that the game is satisfying to play.

#### Acceptance Criteria

1. WHILE the game is in an active play state, THE Game SHALL apply a constant Gravity acceleration to Ghosty's vertical velocity each frame (recommended value: 0.5 px/frame²).
2. WHEN a Flap input is received, THE Game SHALL set Ghosty's vertical velocity to a fixed upward ascent value, overriding any current velocity (recommended value: -8 px/frame).
3. THE Game SHALL clamp Ghosty's vertical velocity to a maximum terminal velocity in the downward direction so that Ghosty cannot fall faster than a defined limit (recommended value: 12 px/frame downward).
4. THE Game SHALL update Ghosty's position by adding the current velocity to the previous position each frame, preserving momentum between frames.
5. THE Game SHALL interpolate Ghosty's rendered position between the previous and current physics positions using the frame's time delta, so that movement appears smooth regardless of frame rate.
6. THE Game SHALL render Ghosty's sprite rotated to reflect the current vertical velocity (tilting down when falling, level or slightly up when rising), with rotation clamped to a maximum angle in each direction.
7. IF Ghosty's vertical position exceeds the bottom boundary of the Canvas, THEN THE Game SHALL trigger a ground collision response and then a game over.
8. IF Ghosty's vertical position goes above the top boundary of the Canvas, THEN THE Game SHALL trigger a ceiling collision response and then a game over.

---

### Requirement 4: Pipe Obstacles

**User Story:** As a player, I want pipes to appear continuously as I fly, so that the game presents an ongoing challenge that grows over time.

#### Acceptance Criteria

1. WHILE the game is in an active play state, THE Game SHALL spawn Pipe pairs at a fixed Pipe_Spacing horizontal interval off the right edge of the Canvas (recommended value: 220 px between leading edges).
2. WHILE the game is in an active play state, THE Game SHALL scroll all Pipes leftward at the current Pipe_Speed each frame (recommended starting value: 2.5 px/frame).
3. THE Game SHALL randomize the vertical centre of the Gap for each spawned Pipe pair, keeping the Gap fully within the Canvas with a minimum margin from the top and bottom edges (recommended margin: 60 px).
4. THE Game SHALL use a fixed Gap_Size for each Pipe pair (recommended value: 160 px), ensuring the gap is always passable.
5. THE Game SHALL increase Pipe_Speed progressively as the Score rises, adding a fixed increment every N pipes passed (recommended: +0.4 px/frame every 5 pipes), up to a defined maximum speed (recommended cap: 6 px/frame).
6. THE Game SHALL render each Pipe with a cap (wider rectangular header) at the end facing the Gap, consistent with the retro art style.
7. WHEN a Pipe pair scrolls fully off the left edge of the Canvas, THE Game SHALL remove it from the active obstacle list.
8. THE Game SHALL define each Pipe's collision boundary as the full rectangular extent of the pipe body and cap, with no inset.

---

### Requirement 5: Collision Detection

**User Story:** As a player, I want collisions to feel fair and responsive, so that I trust the game's feedback.

#### Acceptance Criteria

1. THE Game SHALL define Ghosty's Hitbox as a rectangle inset from the visible sprite boundary by a fixed margin on all sides (recommended: 4 px inset), so that near-misses are forgiven.
2. THE Game SHALL perform axis-aligned bounding box (AABB) overlap tests between Ghosty's Hitbox and each active Pipe's collision boundary every frame during active play.
3. WHEN Ghosty's Hitbox overlaps a Pipe collision boundary, THE Game SHALL trigger a pipe collision response.
4. WHEN a pipe collision response is triggered, THE Game SHALL begin an Invincibility_Frame period (recommended: 500 ms) during which further pipe collision tests are skipped.
5. WHEN a pipe collision response is triggered, THE Game SHALL play a visual flash animation on Ghosty (e.g. rapid opacity toggling) for the duration of the Invincibility_Frame period, then trigger a game over.
6. WHEN Ghosty's Hitbox reaches or exceeds the bottom Canvas boundary, THE Game SHALL immediately trigger a game over without an Invincibility_Frame.
7. WHEN Ghosty's Hitbox reaches or exceeds the top Canvas boundary, THE Game SHALL immediately trigger a game over without an Invincibility_Frame.

---

### Requirement 6: Game State Management

**User Story:** As a player, I want clear transitions between menu, gameplay, pause, and game over states, so that the game feels polished and easy to navigate.

#### Acceptance Criteria

1. THE Game SHALL maintain a Game_State variable that is always one of: MENU, PLAYING, PAUSED, or GAME_OVER.
2. WHEN the Game page is opened, THE Game SHALL enter the MENU state and display the main menu with the current High_Score.
3. WHEN the player initiates play from the MENU state, THE Game SHALL transition to the PLAYING state and begin the Game_Loop.
4. WHILE in the PLAYING state, WHEN the player presses the Escape key or a designated pause button, THE Game SHALL transition to the PAUSED state and freeze the Game_Loop.
5. WHILE in the PAUSED state, WHEN the player presses Escape or the pause button again, THE Game SHALL transition back to the PLAYING state and resume the Game_Loop.
6. WHEN a game over is triggered, THE Game SHALL transition to the GAME_OVER state, stop the Game_Loop, and display the final Score and High_Score.
7. WHEN the player presses Space or clicks the Canvas in the GAME_OVER state, THE Game SHALL reset all game state and transition to the PLAYING state for a new session.
8. THE Game SHALL persist the High_Score to browser localStorage whenever it is updated, and load it from localStorage on startup.

---

### Requirement 7: Scoring

**User Story:** As a player, I want to see my score increase as I pass pipes, so that I have a clear sense of progress.

#### Acceptance Criteria

1. WHEN Ghosty passes the horizontal midpoint of a Pipe pair, THE Game SHALL increment the Score by 1.
2. THE Game SHALL display the current Score and High_Score on screen during active play in the format "Score: N | High: N".
3. WHEN a game over is triggered and the current Score exceeds the stored High_Score, THE Game SHALL update the High_Score.
4. THE Game SHALL persist the High_Score using browser localStorage so that it survives page refreshes.

---

### Requirement 8: Game Over

**User Story:** As a player, I want clear feedback when I lose, so that I can quickly restart and try again.

#### Acceptance Criteria

1. WHEN a game over is triggered, THE Game SHALL stop the Game_Loop and play the `game_over.wav` sound effect.
2. WHEN a game over is triggered, THE Game SHALL display a game over screen showing the final Score and High_Score.
3. WHEN the player presses Space or clicks the Canvas on the game over screen, THE Game SHALL reset the game state and start a new session.
4. WHEN a new session starts, THE Game SHALL reset the Score to 0 and remove all active Pipes from the Canvas.

---

### Requirement 9: Visual Style

**User Story:** As a player, I want the game to have a retro/sketchy art style, so that it feels charming and cohesive.

#### Acceptance Criteria

1. THE Game SHALL render the background as a sky scene with a retro/sketchy aesthetic using CSS or Canvas drawing primitives.
2. THE Game SHALL render Pipes in green with a darker outline, consistent with the retro style shown in the example UI.
3. THE Game SHALL render floating cloud decorations in the background using at least two Cloud_Layers, each scrolling at a different speed to create a parallax depth effect.
4. THE Game SHALL render each Cloud_Layer with a distinct semi-transparent opacity, with clouds appearing more faded the further back their layer is, to reinforce the sense of depth.
5. THE Game SHALL use a pixel-art or retro-style font for all on-screen text including score and messages.
