# PowerSnake Architecture & Mechanics Guide

This guide details the core systems of the PowerSnake game engine to assist AI agents and developers in modifying and extending the codebase.

## 1. Game Architecture (`game.js`)

The game runs on a single **HTML5 Canvas** loop (`requestAnimationFrame`) with no external dependencies.

*   **Main Loop:** `gameLoop(timestamp)` handles logic updates and rendering.
*   **State Management:** Global arrays `snakes`, `foods`, `particles` hold all game entities.
*   **Input Handling:** Listens for WASD/Arrow keys to update `player.nextDir`, which is applied on the next update frame.
*   **Rendering:** `render()` clears the canvas, updates the camera position, and draws all layers (grid, food, snakes, particles, UI).
*   **Time Step:** Logic uses variable `dt` (delta time) capped at 0.05s to prevent physics spiraling on lag spikes.

## 2. Core Mechanics

### 2.1 Snake Movement
*   **Coordinate System:** Uses continuous float coordinates but logic treats direction changes as 90-degree integer axis changes.
*   **Segments:** The snake body is an array of `{x, y}` points (history). New head position is unshifted; tail is popped based on target length.
*   **Smoothing:** `moveAccumulator` ensures segments are spaced exactly `SEGMENT_SPACING` (6px) apart, regardless of speed.

**To Change:**
- Modify `BASE_SPEED` (default 3.2) for base pace.
- Modify `SEGMENT_SPACING` (default 6) for tighter/looser body segments.

### 2.2 Speed System
The final movement speed is calculated in `Snake.update()`:

`Speed = (BaseSpeed * FoodMultiplier) + (BoostExtra * BoostIntensity) - LengthPenalty`

1.  **Food Boost (Temporary):**
    *   **Mechanic:** Eating food increases the `foodEaten` counter (float).
    *   **Multiplier:** `1 + (foodEaten * 0.02)` (2% speed increase per food unit).
    *   **Decay:** The `foodEaten` counter decays exponentially with a **6.0s time constant** (`dt * foodEaten / 6.0`).
    *   **To Change:** Edit lines calculating `speedMultiplier` or the decay formula divisor (6.0).

2.  **Proximity Boost (Ramp-up):**
    *   **Mechanic:** Driving parallel and close (<60px) to another snake triggers boosting state.
    *   **Intensity:** `boostIntensity` ramps 0→1 over `BOOST_RAMP_DURATION` (6.0s). Ramps down when away.
    *   **Effect:** Blends base speed towards `currentBoostSpeed`.
    *   **Visuals:** Triggers `boostIndicator` on HUD, electric spark particles, and a glowing lightning bolt connecting the snakes.
    *   **To Change:** Edit `BOOST_SPEED` (11.6) or `BOOST_RAMP_DURATION` (6.0).

3.  **Length Penalty:**
    *   Longer snakes move slightly slower: `(segments - 30) * 0.003`.
    *   **To Change:** Edit the penalty subtraction in `update()`.

### 2.3 AI Behavior (`updateAI`, `decideAI`)
Bots use a **Scoring-Based Heuristic System** rather than a simple decision tree. They evaluate three possible directions (Forward, Left, Right) and pick the one with the highest score.

**Decision Loop:**
- **Emergency Check:** Runs **every frame**. Checks `100 * speedFactor` ahead. If blocked by wall/snake, forces immediate recalculation.
- **Tactical Update:** Runs every ~0.15s. Evaluates all directions based on a weighted score.

**Scoring Factors:**
1.  **Safety (Critical):** Raycasts at Short (120), Medium (250), and Long (450) ranges.
    -   Blocked paths receive massive penalties (-10,000 to -100,000).
    -   Ensures bots avoid trapped corridors and head-on collisions.
2.  **Interaction (Priority):**
    -   **Kill Move (Cut Off):** Massive bonus (`AGGRESSION_WEIGHT = 500`) for trajectories that intercept a nearby opponent's future path.
    -   **Harassment:** Bonus for moving towards/bullying smaller or nearby snakes to force errors.
    -   **Drafting (Boost):** Bonus (`BOOST_WEIGHT = 50`) for moving parallel to another snake within 250px.
3.  **Food Clustering:**
    -   Scans for food within a 60-degree cone.
    -   Sum of `Value / Distance` allows bots to target **clusters** of food.
    -   Weight increased to `35` to ensure growth competitiveness.
4.  **Navigation:** Slight bias towards the map center to avoid hugging walls unnecessarily.

**To Change:**
- **Weights:** Modify consts in `decideAI` (`FOOD_WEIGHT`, `AGGRESSION_WEIGHT`, etc).
- **Reaction Time:** Adjust `aiTimer` reset range in `updateAI`.

### 2.4 Collision Detection (`checkCollisions`)
Checks head coordinates against:
1.  **Walls:** `0 < x < ARENA_SIZE`.
2.  **Other Snakes:** Iterates all segments (skips head area). Collision distance `(w1 + w2) * 0.4`.
3.  **Self:** Skips first 20 segments to avoid immediate self-collision on tight turns.
4.  **Food:** Distance check `snake.width + f.size + 8`.

**Result:**
- Calls `die()` → spawns food from body segments + explosion particles.
- If Player → `onPlayerDeath()` triggers HUD/Leaderboard lock and Death Screen.

### 2.5 Food Magnetism
Food items are attracted to snake heads when they come within range, creating a "suction" effect that makes collection smoother.

*   **Range:** `MAGNET_DISTANCE` (75px).
*   **Force:** `MAGNET_FORCE` (600 - 1200 px/s). The force increases as the food gets closer to the snake head.
*   **Logic:** Food moves towards the closest snake head within range.

## 3. Visuals

- **Neon Glow:** Uses `ctx.shadowBlur` and `ctx.shadowColor`.
- **Dynamic Width:** Snake width grows with score (`MIN_SNAKE_WIDTH` to `MAX_SNAKE_WIDTH`).
- **Camera:** Lerps to player position `(x, y)` and zooms out based on length.
- **Minimap:** Scaled rendering of all snakes relative to `ARENA_SIZE` (6000).

### 3.1 Snake Styles (`SNAKE_STYLES`)
The game features **25 unique visual styles**, each with distinct rendering logic (`renderBody`, `renderHead`) and behavioral updates (`update`) for particle effects.

**Rendering Architecture:**
- **Body:** Custom loop in `renderBody` handles diverse shapes (squares, jagged lines, flowing rivers) instead of standard circles.
- **Head:** Unique geometry per style (eyes, crests, glowing cores).
- **Particles:** Styles like *Inferno*, *Vampire*, and *Frost* spawn thematic particles (embers, sparkles) during the `update` loop.

**Style List:**
1.  **CYBER:** Standard neon blue/magenta.
2.  **INFERNO:** Fiery body with jitter and ember particles.
3.  **VOID:** Dark purple with event horizon glow.
4.  **GLITCH:** Digital artifacts and square segments.
5.  **PLASMA:** Pulsing energy width.
6.  **MIDAS:** Solid gold with metallic sheen.
7.  **TOXIN:** Bubbling dashed lines.
8.  **PRISM:** Cycling RGB spectrum.
9.  **GHOST:** Semi-transparent stealth.
10. **CIRCUIT:** Wireframe/microchip aesthetic.
11. **RADIUM:** Radioactive rings.
12. **COSMOS:** Deep blue with parallax stars.
13. **VAMPIRE:** Bat-wing segments and blood particles.
14. **PIXEL:** Retro raw pixels with debris.
15. **CANDY:** Pink/blue stripes.
16. **MAGMA:** Crusted lava with fire particles.
17. **FROST:** Ice shards with sparkles.
18. **VOLTAIC:** Lightning bolt with sparks.
19. **AZURE:** Flowing river effect.
20. **VERDANT:** Organic vine with leaves.
21. **CHROME:** Metallic reflection.
22. **SKETCH:** Hand-drawn white pencil.
23. **SPECTRUM:** Rainbow trail.
24. **MATRIX:** Falling binary code.
25. **SAMURAI:** Plated armor with crest.

## 4. Key Constants to Tune

| Constant | Default | Effect |
|---|---|---|
| `ARENA_SIZE` | 6000 | World size |
| `BASE_SPEED` | 3.2 | Starting movement speed |
| `BOOST_SPEED` | 11.6 | Max speed when boosting (before food multiplier) |
| `BOOST_RAMP_DURATION` | 3.0 | Seconds to reach max boost |
| `FOOD_COUNT` | 300 | Amount of food pellets |
| `BOT_COUNT` | 24 | Number of AI enemies (Total 25 snakes) |
| `WIDTH_GROWTH_RATE` | 2000 | Score needed to reach max thickness |

## 5. Sound System (`SoundManager`)

The game features a procedural audio engine using the **Web Audio API** to generate all sound effects (SFX) in real-time without external assets. The system is designed to maximize player satisfaction ("dopamine") through variety and musicality.

### 5.1 Dynamic SFX Varieties
Each major game event has **11 distinct varieties** (0-10) that are randomly selected to prevent auditory repetition.

*   **Collect (`playCollect`):** Plays notes from specific musical scales that ascend in pitch as the combo counter increases.
    *   **Styles:** Classic, Crystal, Cyber, Bubble, Void, Rave, Acid (New), Deep (New), Future (New), Industrial (New), Glitch (New).
    *   **Logic:** Resets combo if ~4s elapses between collects. High combos trigger special "reward" bass tones.

*   **Boost (`playBoost`):** A continuous engine hum combined with one-shot ignition and loop effects.
    *   **Variants:** Classic Nitro, Warp Drive, Thunder, Jet Engine, Cyber Dash, Sonic Boom, Plasma (New), Nebula (New), Overdrive (New), Slipstream (New), Quantum (New).
    *   **Engine:** `updateBoostHum` dynamically changes oscillator waveforms (Sawtooth, Square, Sine) and LFO modulation based on the active style.

*   **Kill (`playKill`):** High-impact sounds rewarding the player for eliminating an opponent.
    *   **Variants:** Basscannon, Glass Shatter, Implosion, 8-Bit, Glitch Tear, Ethereal, Black Hole (New), Fatality (New), Disintegrate (New), Vaporize (New), Shutdown (New).

*   **Die (`playDie`):** Thematic sounds for player death.
    *   **Variants:** System Failure, Flatline, Power Down, Bitcrush, Ghost, Crunch, Rewind (New), Glitch Out (New), Abyss (New), System Crash (New), Game Over (New).

*   **Start (`playStart`):** Introductory sounds when the game begins or restarts.
    *   **Variants:** Cinematic Riser, Orchestral, Cyberpunk, Retro, Ethereal, Industrial, Drop (New), Ignition (New), Portal (New), Ready (New), Zen (New).

### 5.2 Musical Logic
*   **Scales:** The `SoundManager` defines 11 musical scales/modes (e.g., Major Pentatonic, Lydian, Dorian, Phrygian Dominant) used primarily by the Collect SFX to ensure all notes sound harmonious within their style.
*   **Synthesis:** Sounds are synthesized using oscillator nodes (sine, square, sawtooth, triangle) and noise buffers, shaped with gain envelopes (ADSR) and filters.
