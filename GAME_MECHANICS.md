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

### 2.6 Unlock System (Hardcore Progression)
The game features a high-stakes progression system where players unlock new snake styles sequentially.

*   **Dynamic Unlocks:** Players unlock the highest rarity snake they can afford with their score from a single run. For example, a single high score of 3000 unlocks a Mythic rarity snake directly, skipping the cheaper ones.
*   **Hardcore Rule:** Progress towards unlocks is **reset to 0** upon death. Players must earn the full cost of a snake in a **single life** to unlock it.
*   **Tiers & Costs:**
    *   **Common:** 500 pts
    *   **Rare:** 1000 pts
    *   **Epic:** 1500 pts
    *   **Legendary:** 2000 pts
    *   **Mythic:** 3000 pts
    *   **Ultimate:** 4000 pts

## 3. Visuals

- **Neon Glow:** Uses `ctx.shadowBlur` and `ctx.shadowColor`.
- **Dynamic Width:** Snake width grows with score (`MIN_SNAKE_WIDTH` to `MAX_SNAKE_WIDTH`).
- **Camera:** Leads ahead of the player's head using a triple-stage smoothing pipeline (see §3.2).
- **Screen Scaling:** Responsive scaling keeps the arena visible across all screen sizes (see §3.3).
- **Minimap:** Scaled rendering of all snakes relative to `ARENA_SIZE` (6000).

### 3.2 Camera System
The camera centers on a **lookahead point** in front of the snake's head, giving the player more visibility in their direction of travel. The transition between positions uses a **triple-stage cascaded exponential filter** (third-order) for ultra-smooth motion.

**Lookahead:**
*   **Target Point:** `player position + direction × (80 + speed × 25 + lagCompensation)`.
*   The offset scales with speed — when boosting, the camera leads further ahead.
*   **Feed-forward compensation:** The triple-stage filter introduces a steady-state tracking lag of `velocity × (1/r1 + 1/r2 + 1/r3)` when following a moving target. At base speed this lag is part of the natural feel. At higher speeds, 70% of the extra lag is compensated by increasing the lookahead distance by `(speed - BASE_SPEED) × 60 × filterDelay × 0.7`, keeping the effective camera lead consistent without pushing too far ahead.
*   The direction is taken directly from the snake's cardinal `DIR_VECTORS` (no angular interpolation), so turns produce straight-line camera transitions rather than circular sweeps.

**Triple-Stage Smoothing (Gaussian-like response):**

Each stage is a dt-independent exponential smoother: `lerp(current, target, 1 - exp(-dt × rate))`.

| Stage | Rate | Time Constant | State Fields | Purpose |
|---|---|---|---|---|
| **Stage 1** | 8.0 | ~0.12s | `camera.stX/stY` | Fast initial smoothing — absorbs the raw target jump |
| **Stage 2** | 5.5 | ~0.18s | `camera.st2X/st2Y` | Intermediate — softens onset/offset curves |
| **Stage 3** | 4.0 | ~0.25s | `camera.x/y` | Final position — gentle inertial tracking |

Three cascaded first-order filters approximate a **Gaussian impulse response**: the camera eases into turns, peaks smoothly, and eases out with no abrupt acceleration changes at any point.

**Initialization:**
*   On game start (`startGame`) and respawn (`respawnPlayer`), all three stages (`stX/stY`, `st2X/st2Y`, `x/y`) are set to the player's position plus the initial lookahead offset. This prevents a jarring camera sweep at spawn.

**Zoom:**
*   Zooms out based on snake length: `1.0 - segments × 0.0005`, clamped to `[0.45, 1.0]`.
*   Uses dt-independent smoothing (rate 2.0).

**To Change:**
- **Lookahead distance:** Edit the `80 + player.speed * 25` formula in `render()`.
- **Smoothness vs responsiveness:** Lower the stage rates for smoother but slower transitions; raise them for snappier tracking.
- **`gameDt`:** The frame delta is stored globally from `gameLoop` and consumed by `render()` for frame-rate independent smoothing.

### 3.3 Screen Scaling (`screenScale`)
The game uses a **responsive scaling system** to prevent the arena from being cropped on smaller screens. Instead of showing a fixed pixel area (which would crop the view on mobile), the entire canvas transform is multiplied by `screenScale`, so objects appear smaller on smaller screens while maintaining full arena visibility.

**Algorithm:**
1.  On every resize, the **larger dimension** of the screen (`max(width, height)`) is compared to a `REFERENCE_WIDTH` of 1920px.
2.  `rawScale = maxDimension / REFERENCE_WIDTH`.
3.  **Desktop+ (rawScale ≥ 1.0):** `screenScale = rawScale`. No change from the native experience.
4.  **Mobile (rawScale < 1.0):** `screenScale = (rawScale + 1.0) / 2`. This is the **midpoint** between full scaling (which would make things too small) and no scaling (which would crop the arena). This compromise keeps objects visible while preventing excessive cropping.

**Usage:** `screenScale` is applied alongside `camera.zoom` in the main canvas transform: `ctx.scale(camera.zoom * screenScale, camera.zoom * screenScale)`. It is also factored into all visibility culling calculations (grid, food, minimap viewport indicator) to ensure objects outside the scaled view are not drawn.

**Orientation:** Using `max(width, height)` ensures the scaling factor is the same in portrait and landscape orientations, so rotating the device does not change the apparent size of game objects — only the shape of the visible area changes.

**To Change:**
- **`REFERENCE_WIDTH` (1920):** The baseline screen width. Increase to zoom out on all screens; decrease to zoom in.
- **Mobile blend factor:** The `0.5` blend in `(rawScale + 1.0) / 2` can be adjusted. A value closer to `rawScale` zooms out more (more visibility, smaller objects); closer to `1.0` zooms in more (less visibility, larger objects).

### 3.1 Snake Styles (`SNAKE_STYLES`)
The game features **76 unique visual styles**, categorized heavily across rarity tiers (Common -> Ultimate). Each has distinct rendering logic (`renderBody`, `renderHead`) and behavioral updates (`update`) for customized particle physics and geometry.

**Rendering Architecture:**
- **Body:** Custom loop in `renderBody` handles diverse shapes (squares, jagged lines, flowing rivers) instead of standard circles.
- **Head:** Unique geometry per style (eyes, crests, glowing cores).
- **Particles:** Styles like *Inferno*, *Vampire*, and *Frost* spawn thematic particles (embers, sparkles) during the `update` loop.

**Rarity Distribution:**
To induce a steady sense of progression, the 76 snakes are grouped into distinct rarity tiers that must be sequentially unlocked. Advanced rarities feature increasingly complex WebGL/Canvas shading techniques, distinct line caps/joins, custom head geometries (e.g., star polygons, event horizons), and thematic particle emitters.
1. **Starter (3)**: e.g., Cyber, Inferno, Void
2. **Common (18)**: e.g., Glitch, Plasma, Echo, Wireframe, Spore
3. **Rare (18)**: e.g., Pixel, Cosmos, Liquid Metal, Hologram, Crystal
4. **Epic (16)**: e.g., Samurai, Vaporwave, Dragon, Abyss, Stardust
5. **Legendary (12)**: e.g., Laser, Bamboo, Supernova, Phantom, Demon
6. **Mythic (6)**: e.g., Cheese, Stone, Singularity, Radiance
7. **Ultimate (3)**: Jelly, Retro, Omni

**How to Add New Snakes (Save-safe approach):**
To ensure existing player save data is not broken when introducing new snakes, you must adhere to the following sequence in `game.js`:
1. **Append to `SNAKE_STYLES`**: Add the new snake objects to the *end* of the `SNAKE_STYLES` array. Do not insert them into the middle, as player save files strictly store integers representing array indices.
2. **Append to `SNAKE_TIER_MAP`**: Append the correct rarity tier index (e.g., `1` for Common, `5` for Mythic) to the *end* of the `SNAKE_TIER_MAP` array so the game knows how much the new snake costs.
3. **Insert into `UNLOCK_ORDER`**: Manually place the new snake indices into the `UNLOCK_ORDER` array, grouped within their appropriate rarity blocks. This ensures they show up correctly grouped by rarity in the UI and unlock sequentially as intended for both new and returning players.

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
| `REFERENCE_WIDTH` | 1920 | Baseline screen width for responsive scaling |

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

## 6. Tutorial System

The game includes an interactive tutorial that activates for first-time players and can be replayed from the main menu.

### 6.1 Architecture

The tutorial runs as a **state machine** (`tutorialStep` 0–6) on top of the normal game loop. When `tutorialActive` is true, `updateTutorial(dt)` is called each frame from `gameLoop`. A `switch(tutorialStep)` drives step-specific logic.

**Key Functions:**
| Function | Purpose |
|---|---|
| `startTutorial(isReplay)` | Initializes empty arena with only the player, sets up tutorial UI, starts step -1 |
| `advanceTutorialStep()` | Increments step (via `Math.floor + 1`), updates messages/dots, runs step-specific spawning |
| `updateTutorial(dt)` | Per-frame step logic — checks action triggers, timers, boost counts |
| `completeTutorial()` | Marks completion in localStorage, unlocks next Common snake (first time only) |
| `skipTutorial()` | Returns to main menu without marking completion |
| `spawnTutorialFood()` | Spawns 7 food pellets in a ring around the player (200–500px) |
| `spawnTutorialBoostBot()` | Spawns a frozen L-shaped bot for boost practice |
| `resetTutorialBoostScenario()` | Resets player + bot positions when bot dies during boost step |
| `spawnTutorialKillBot()` | Spawns a slow bot on a perpendicular path for kill practice |

### 6.2 Step Sequence

| Step | Type | Trigger | Arena Changes |
|---|---|---|---|
| 0 — Welcome | Auto (3s) | Timer | Empty arena, player only |
| 1 — Move | Action | Player changes direction | No changes |
| 2 — Eat Food | Action | `player.score >= 5` | `spawnTutorialFood()` — 7 scattered pellets |
| 3 — Speed Boost | Action | 3 separate boosts (rising-edge detected) | `spawnTutorialBoostBot()` — frozen L-shaped bot |
| 4 — Eliminate | Action | Any bot killed | `spawnTutorialKillBot()` — slow perpendicular bot |
| 5 — Stay Alive | Auto (4s) | Timer | No changes |
| 6 — Ready | Auto (3.5s) | Timer → `completeTutorial()` | No changes |

### 6.3 Progressive Arena Population

The arena starts **completely empty** — no food, no bots. Elements are spawned only when the relevant step begins. The `maintainFood()` function is suppressed during steps 0–1 to prevent random food from appearing.

### 6.4 Boost Bot Geometry

The boost bot is spawned as a **frozen** (`tutorialFrozen = true`) L-shaped snake. Frozen bots skip both AI (`updateAI`) and movement in `Snake.update()`, staying exactly where placed.

**L-Shape Layout (player faces RIGHT):**
```
Player --->..............corner==============================> Bot Head
             384px        |   (parallel section, 40px offset below)
            (2 seconds)   |   (player is 40px away = within BOOST_PROXIMITY 60px)
                          (perpendicular tail, extends AWAY from player)
```

**Math:**
- `BASE_SPEED × 60 = 192 px/s` → 2 seconds = **384px** ahead
- Corner position: `player + playerDir × 384 + perpDir × 40`
- Parallel section: 200 segments (1200px) extending forward from corner
- Perpendicular section: 30 segments extending in `perpDir` (AWAY from player path)
- Side offset: 40px (within `BOOST_PROXIMITY` of 60px, won't trigger collision)

**Boost Detection:** Rising-edge detection via `tutorialWasBoosting` flag — only counts a new boost when `boostIntensity` crosses above 0.1 after being below. Requires 3 boosts to advance. Count is preserved across deaths.

### 6.5 Death During Tutorial

When the player dies during the tutorial, `onPlayerDeath()` respawns them after 800ms instead of showing the death screen. For the boost step specifically, `resetTutorialBoostScenario()` also repositions the player to center and respawns the boost bot after 1500ms, preserving the `tutorialBoostCount`.

### 6.6 Tutorial Completion & Unlock Reward

On first completion (`tutorialIsReplay === false`):
1. Sets `ps_tutorial_completed = true` in `localStorage`
2. Finds the next Common snake (tier index 1) in `UNLOCK_ORDER` that isn't unlocked
3. If found, unlocks it and shows the unlock celebration (`showUnlockCelebration`)

The `📖 TUTORIAL` button on the main menu calls `startTutorial(true)` (replay mode) — no unlock reward is given on replays.

### 6.7 State Variables

| Variable | Purpose |
|---|---|
| `tutorialActive` | Master flag — enables tutorial logic in game loop |
| `tutorialStep` | Current step index (-1 to 6) |
| `tutorialStepTimer` | Accumulated time in current step |
| `tutorialCompleted` | Loaded from `localStorage` on init |
| `tutorialIsReplay` | True when replaying from menu button |
| `tutorialStepAdvancePending` | Prevents re-triggering during delayed `setTimeout` advances |
| `tutorialBoostCount` | Boosts completed in step 3 (0–3), preserved on death |
| `tutorialBoostBot` | Reference to the frozen boost bot snake |
| `tutorialWasBoosting` | Previous frame's boost state for rising-edge detection |
| `tutorialDummyBot` | Reference to the kill-step target bot |

### 6.8 HTML & CSS

- `#tutorialOverlay` — Full-screen overlay containing message box and skip button
- `#tutorialMessageBox` — Glassmorphism panel with step message, subtext, and progress dots
- `#skipTutorialButton` — Fixed bottom-right, low-opacity, returns to main menu
- `#tutorialButton` — Main menu top-right, opens tutorial replay
- Animations: `tutorial-slide-in`, `step-transition` (pulse on step change)
