/* ============================================
   PowerSnake — Complete Game Engine
   ============================================ */

// ---- Constants ----
const ARENA_SIZE = 6000;
const GRID_SIZE = 40;
const BASE_SPEED = 3.2;
const BOOST_SPEED = 11.6;
const BOOST_PROXIMITY = 60;
const BOOST_RAMP_DURATION = 6.0; // seconds to reach full boost speed
const MAGNET_DISTANCE = 75;
const MAGNET_FORCE = 600; // pixels per second
const FOOD_COUNT = 300;
const BOT_COUNT = 29;
const SEGMENT_SPACING = 6;
const MIN_SNAKE_WIDTH = 4;
const MAX_SNAKE_WIDTH = 14;
const WIDTH_GROWTH_RATE = 2000; // score needed for max width
const CAMERA_LERP = 0.08;
const MINIMAP_SIZE = 180;

const NEON_COLORS = [
    '#00f0ff', '#ff00e5', '#00ff88', '#ffe600', '#ff6a00',
    '#a855f7', '#ff3355', '#00ffcc', '#ff9500', '#66ff33',
    '#ff66cc', '#33ccff', '#ffcc00', '#ff4488', '#00ddaa',
    '#cc77ff', '#ff8833', '#55ff99', '#ff5577', '#88ddff',
];

const BOT_NAMES = [
    'Voltage', 'Neon', 'Sparky', 'Circuit', 'Plasma',
    'Dynamo', 'Surge', 'Flux', 'Relay', 'Ohm',
    'Tesla', 'Watt', 'Edison', 'Ampere', 'Joule',
    'Photon', 'Neutron', 'Quark', 'Fusion', 'Ion',
    'Bolt', 'Zapper', 'Static', 'Thunder', 'Nova',
    'Pulse', 'Hertz', 'Farad', 'Gauss', 'Diode',
];

// Directions: 0=right, 1=down, 2=left, 3=up
const DIR_VECTORS = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
];

// ---- DOM Elements ----
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const deathScreen = document.getElementById('deathScreen');
const nicknameInput = document.getElementById('nicknameInput');
const playButton = document.getElementById('playButton');
const replayButton = document.getElementById('replayButton');
const hud = document.getElementById('hud');
const lbEntries = document.getElementById('lbEntries');
const scoreValue = document.getElementById('scoreValue');
const finalScore = document.getElementById('finalScore');
const finalLength = document.getElementById('finalLength');
const finalRank = document.getElementById('finalRank');
const boostIndicator = document.getElementById('boostIndicator');

// ---- Game State ----
let gameRunning = false;
let snakes = [];
let foods = [];
let particles = [];
let floatingTexts = [];
let screenShake = 0;
let player = null;
let camera = { x: 0, y: 0, zoom: 1 };
let lastTime = 0;
let animationId = null;
let deathTime = 0;
let currentKing = null;
let hudUpdateTimer = 0;

// ---- Resize ----
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ---- Utility Functions ----
function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// ---- Snake Class ----
class Snake {
    constructor(name, color, isPlayer = false) {
        this.name = name;
        this.color = color;
        this.isPlayer = isPlayer;
        this.alive = true;
        this.score = 0;
        this.foodEaten = 0;
        this.respawnTimer = 0;

        // Movement
        this.dir = randInt(0, 3);
        this.nextDir = this.dir;
        this.speed = BASE_SPEED;
        this.boosting = false;
        this.boostTimer = 0;
        this.boostIntensity = 0; // 0-1, ramps up/down over BOOST_RAMP_DURATION
        this.boostConnection = null;
        this.headScale = 1.0;

        // Position & segments
        const margin = 500;
        this.x = rand(margin, ARENA_SIZE - margin);
        this.y = rand(margin, ARENA_SIZE - margin);
        this.lastX = this.x;
        this.lastY = this.y;
        this.segments = [];
        this.moveAccumulator = 0;

        // Init segments
        const dv = DIR_VECTORS[(this.dir + 2) % 4]; // behind
        for (let i = 0; i < 15; i++) {
            this.segments.push({
                x: this.x + dv.x * i * SEGMENT_SPACING,
                y: this.y + dv.y * i * SEGMENT_SPACING,
            });
        }

        // AI
        if (!isPlayer) {
            this.aiTimer = rand(0.2, 1.0);
            this.aiTargetDir = this.dir;
            this.aiAggression = rand(0.6, 1.0); // Increased minimum aggression
        }
    }

    get width() {
        const t = clamp(this.score / WIDTH_GROWTH_RATE, 0, 1);
        return MIN_SNAKE_WIDTH + t * (MAX_SNAKE_WIDTH - MIN_SNAKE_WIDTH);
    }

    get length() {
        return this.segments.length;
    }

    get headX() { return this.x; }
    get headY() { return this.y; }

    turnTo(newDir) {
        // Prevent 180° reversal
        if ((newDir + 2) % 4 !== this.dir) {
            this.nextDir = newDir;
        }
    }

    update(dt) {
        if (!this.alive) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0 && !this.isPlayer) {
                this.respawn();
            }
            return;
        }

        // Apply direction change
        this.dir = this.nextDir;

        // Boost intensity ramp (3-second ramp up and down)
        if (this.boosting) {
            this.boostIntensity = Math.min(1, this.boostIntensity + dt / BOOST_RAMP_DURATION);
        } else {
            this.boostIntensity = Math.max(0, this.boostIntensity - dt / BOOST_RAMP_DURATION);
        }

        // Food speed decay (6-second time constant, 2x proximity boost duration)
        if (this.foodEaten > 0) {
            this.foodEaten = Math.max(0, this.foodEaten - (dt * this.foodEaten) / 6.0);
        }

        // Speed: base increases 2% per food unit (now temporary)
        const speedMultiplier = 1 + (this.foodEaten * 0.02);
        const currentBaseSpeed = BASE_SPEED * speedMultiplier;
        const currentBoostSpeed = BOOST_SPEED * speedMultiplier;

        // Speed: base + ramped boost
        const boostExtra = (currentBoostSpeed - currentBaseSpeed) * this.boostIntensity;
        const targetSpeed = currentBaseSpeed + boostExtra;

        // Longer snakes are slightly slower (length penalty still applies)
        const lengthPenalty = Math.max(0, (this.segments.length - 30) * 0.003);
        const actualSpeed = Math.max(targetSpeed - lengthPenalty, BASE_SPEED * 0.7);
        this.speed = lerp(this.speed, actualSpeed, 0.15);

        // Head scale decay
        this.headScale = lerp(this.headScale, 1.0, 0.15);

        // Move
        const dv = DIR_VECTORS[this.dir];
        const moveAmount = this.speed * dt * 60;

        this.lastX = this.x;
        this.lastY = this.y;

        this.x += dv.x * moveAmount;
        this.y += dv.y * moveAmount;

        // Track segments
        this.moveAccumulator += moveAmount;
        while (this.moveAccumulator >= SEGMENT_SPACING) {
            this.moveAccumulator -= SEGMENT_SPACING;

            // Interpolate position to prevent gaps during boosts
            const backX = this.x - (dv.x * this.moveAccumulator);
            const backY = this.y - (dv.y * this.moveAccumulator);

            this.segments.unshift({ x: backX, y: backY });

            // Maintain correct length
            const targetLen = 15 + Math.floor(this.score / 3);
            while (this.segments.length > targetLen) {
                this.segments.pop();
            }
        }

        // Boost decay
        if (this.boostTimer > 0) {
            this.boostTimer -= dt;
        } else {
            this.boosting = false;
        }

        // AI
        if (!this.isPlayer) {
            this.updateAI(dt);
        }
    }

    updateAI(dt) {
        this.aiTimer -= dt;

        // EMERGENCY: Check immediate path efficiently
        const speedFactor = this.speed / BASE_SPEED;
        const urgentLook = 100 * speedFactor;

        // If blocked ahead or timer expired, rethink
        if (this.isPathBlocked(this.dir, urgentLook) || this.aiTimer <= 0) {
            this.decideAI();
            this.aiTimer = rand(0.1, 0.25); // Fast reaction speed
        }

        if (this.nextDir !== this.aiTargetDir) {
            this.turnTo(this.aiTargetDir);
        }
    }

    decideAI() {
        const validDirs = [0, 1, 2, 3].filter(d => (d + 2) % 4 !== this.dir);
        let bestDir = this.dir;
        let bestScore = -Infinity;

        // Factors
        const FOOD_WEIGHT = 35;       // Increased to ensure they grow enough to fight
        const AGGRESSION_WEIGHT = 500; // MASSIVE increase: killing is the priority
        const BOOST_WEIGHT = 50;      // Lower priority than killing
        const CENTER_BIAS = 5;

        for (const testDir of validDirs) {
            let score = 0;
            const dv = DIR_VECTORS[testDir];
            const speedFactor = this.speed / BASE_SPEED;

            // --- 1. Safety (Raycasts) ---
            // Heavy penalties for blocked paths at different ranges
            if (this.isPathBlocked(testDir, 120 * speedFactor)) {
                score -= 100000; // Immediate death
            } else if (this.isPathBlocked(testDir, 250 * speedFactor)) {
                score -= 5000;   // Medium danger
            } else if (this.isPathBlocked(testDir, 450 * speedFactor)) {
                score -= 1000;   // Long term trap
            }

            // --- 2. Food & Clustering ---
            // Scan foods in an arc
            if (score > -5000) { // Only care about food if not about to die
                for (const f of foods) {
                    const dx = f.x - this.x;
                    const dy = f.y - this.y;

                    if (Math.abs(dx) > 1200 || Math.abs(dy) > 1200) continue;

                    // Dot product to check angle
                    const dot = (dx * dv.x) + (dy * dv.y);
                    if (dot > 0) { // Food is roughly in front
                        const preciseDist = Math.hypot(dx, dy);
                        // Check if within ~60 degree cone (dot > 0.5 * dist)
                        if (dot / (preciseDist + 1) > 0.5) {
                            // Score ~ Value / Dist (emphasize close food)
                            // Emphasize CLUSTERS by summing
                            score += (f.value * 220) / (preciseDist + 10);
                        }
                    }
                }
            }

            // --- 3. Interaction (Boost / Attack) ---
            if (score > -5000) {
                for (const other of snakes) {
                    if (other === this || !other.alive) continue;
                    const dx = other.x - this.x;
                    const dy = other.y - this.y;
                    const d = Math.hypot(dx, dy);

                    if (d > 600) continue;

                    // Parallel matching for BOOST
                    // We want to move in same direction as them if they are close
                    if (d < 250) {
                        const otherDv = DIR_VECTORS[other.dir];
                        const dotDir = dv.x * otherDv.x + dv.y * otherDv.y;
                        if (dotDir > 0.9) { // Parallel
                            score += BOOST_WEIGHT;
                        }
                    }

                    // Aggression: Cut off & Harass
                    // If we are aggressive or they are close and accessible
                    if (this.aiAggression > 0.4 && d < 450) {
                        const otherDv = DIR_VECTORS[other.dir];

                        // A. KILL MOVE: Cut off (Intercept)
                        // Predict their future pos based on current speed
                        const interceptDist = 180;
                        const futX = other.x + otherDv.x * interceptDist;
                        const futY = other.y + otherDv.y * interceptDist;

                        // Vector to their future
                        const toFutX = futX - this.x;
                        const toFutY = futY - this.y;
                        const distFut = Math.hypot(toFutX, toFutY);
                        const dotFut = (toFutX * dv.x + toFutY * dv.y) / (distFut + 1);

                        // If this direction takes us to their future intersection point
                        if (dotFut > 0.85) {
                            // Bonus if we are actually closer to the intersection point than they are
                            // (Simulated "Surround" risk calculation)
                            score += AGGRESSION_WEIGHT;
                        }

                        // B. HARASS: Bully smaller/equal snakes
                        // If they are somewhat close, try to stay near them / squeeze them
                        if (d < 300 && this.score > other.score * 0.5) {
                            const toHeadX = other.x - this.x;
                            const toHeadY = other.y - this.y;
                            const distHead = Math.hypot(toHeadX, toHeadY);
                            // If we can get in their face or general direction
                            const dotHead = (toHeadX * dv.x + toHeadY * dv.y) / (distHead + 1);
                            if (dotHead > 0.6) {
                                score += AGGRESSION_WEIGHT * 0.3; // Harassment bonus
                            }
                        }
                    }
                }
            }

            // --- 4. Center Bias ---
            // Avoid getting stuck in corners
            const centerX = ARENA_SIZE / 2;
            const centerY = ARENA_SIZE / 2;
            const distCenterCurrent = Math.hypot(centerX - this.x, centerY - this.y);
            const futureX = this.x + dv.x * 120;
            const futureY = this.y + dv.y * 120;
            const distCenterNext = Math.hypot(centerX - futureX, centerY - futureY);

            if (distCenterNext < distCenterCurrent) {
                score += CENTER_BIAS;
            }

            // Random Tie-breaker
            score += Math.random() * 10;

            if (score > bestScore) {
                bestScore = score;
                bestDir = testDir;
            }
        }

        this.aiTargetDir = bestDir;
    }

    isPathBlocked(dir, distCheck) {
        const dv = DIR_VECTORS[dir];
        const step = 40;
        const count = Math.ceil(distCheck / step);

        for (let i = 1; i <= count; i++) {
            const tx = this.x + dv.x * i * step;
            const ty = this.y + dv.y * i * step;

            // Map Bounds
            if (tx < 30 || tx > ARENA_SIZE - 30 || ty < 30 || ty > ARENA_SIZE - 30) return true;

            // Snake Collisions
            for (const s of snakes) {
                if (!s.alive) continue;
                // Basic bounding box check for the whole snake isn't easy without iterating segments,
                // so we just iterate efficiently.

                // Skip own head area
                const start = (s === this) ? 10 : 0;
                // Check every 4th segment for perf
                for (let k = start; k < s.segments.length; k += 4) {
                    const seg = s.segments[k];
                    // Fast Manhattan rejection
                    if (Math.abs(seg.x - tx) > 40 || Math.abs(seg.y - ty) > 40) continue;

                    // Precise check
                    if (dist({ x: tx, y: ty }, seg) < (this.width + s.width) * 0.7) return true;
                }
            }
        }
        return false;
    }

    die() {
        if (!this.alive) return;
        this.alive = false;
        if (this.isPlayer) {
            screenShake = 25; // Massive shake
            soundManager.playDie();
        }
        this.respawnTimer = rand(3, 6);

        // Spawn food from segments
        for (let i = 0; i < this.segments.length; i += 2) {
            const seg = this.segments[i];
            foods.push({
                x: seg.x + rand(-15, 15),
                y: seg.y + rand(-15, 15),
                value: 2 + Math.floor(this.score / this.segments.length),
                color: this.color,
                pulse: rand(0, Math.PI * 2),
                size: rand(3, 6),
            });
        }

        // Death particles
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(this.x, this.y, this.color, 'explosion'));
        }
    }

    respawn() {
        this.alive = true;
        this.score = 0;
        this.foodEaten = 0;
        this.dir = randInt(0, 3);
        this.nextDir = this.dir;
        this.speed = BASE_SPEED;
        this.boosting = false;
        this.boostTimer = 0;
        this.boostIntensity = 0;

        const margin = 500;
        this.x = rand(margin, ARENA_SIZE - margin);
        this.y = rand(margin, ARENA_SIZE - margin);
        this.lastX = this.x;
        this.lastY = this.y;
        this.segments = [];
        this.moveAccumulator = 0;

        const dv = DIR_VECTORS[(this.dir + 2) % 4];
        for (let i = 0; i < 15; i++) {
            this.segments.push({
                x: this.x + dv.x * i * SEGMENT_SPACING,
                y: this.y + dv.y * i * SEGMENT_SPACING,
            });
        }
    }
}

// ---- Particle Class ----
// ---- Particle Class ----
class Particle {
    constructor(x, y, color, type) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = type;
        this.life = 1;
        this.maxLife = 1;
        this.angle = rand(0, Math.PI * 2);
        this.angVel = rand(-0.2, 0.2);

        if (type === 'explosion') {
            const speed = rand(2, 8);
            const dir = rand(0, Math.PI * 2);
            this.vx = Math.cos(dir) * speed;
            this.vy = Math.sin(dir) * speed;
            this.maxLife = rand(0.5, 0.9);
            this.life = this.maxLife;
            this.size = rand(3, 8);
            this.shape = 'rect'; // Digital debris
            this.drag = 0.94;
        } else if (type === 'boost') {
            this.vx = rand(-2, 2);
            this.vy = rand(-2, 2);
            this.maxLife = rand(0.3, 0.6);
            this.life = this.maxLife;
            this.size = rand(2, 4);
            this.shape = 'circle';
            this.drag = 0.92;
        } else if (type === 'collect') {
            const speed = rand(3, 7);
            const dir = rand(0, Math.PI * 2);
            this.vx = Math.cos(dir) * speed;
            this.vy = Math.sin(dir) * speed;
            this.maxLife = rand(0.4, 0.8);
            this.life = this.maxLife;
            this.size = rand(3, 6);
            this.shape = 'star'; // Sparkles
            this.drag = 0.9;
        } else if (type === 'shockwave') {
            this.vx = 0;
            this.vy = 0;
            this.life = 0.5;
            this.maxLife = 0.5;
            this.size = 10;
            this.shape = 'ring';
            this.drag = 1;
        }
    }

    update(dt) {
        this.life -= dt;
        this.x += this.vx;
        this.y += this.vy;

        if (this.drag) {
            this.vx *= this.drag;
            this.vy *= this.drag;
        }

        this.angle += this.angVel;

        if (this.type === 'shockwave') {
            this.size += 150 * dt; // Expand faster
        }
    }

    get alpha() {
        // Curve the alpha for smoother fade
        const t = clamp(this.life / this.maxLife, 0, 1);
        return t * t;
    }

    get dead() {
        return this.life <= 0;
    }
}

// ---- Floating Text Class ----
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -50;
    }

    update(dt) {
        this.life -= dt * 1.5;
        this.y += this.vy * dt;
        this.vy *= 0.9;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;

        ctx.font = '700 16px Orbitron';
        ctx.textAlign = 'center';

        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);

        ctx.fillText(this.text, this.x, this.y);
        ctx.globalAlpha = 1;
    }
}

// ---- Food Functions ----
function spawnFood(count) {
    const margin = 100;
    for (let i = 0; i < count; i++) {
        foods.push({
            x: rand(margin, ARENA_SIZE - margin),
            y: rand(margin, ARENA_SIZE - margin),
            value: randInt(1, 3),
            color: pick(NEON_COLORS),
            pulse: rand(0, Math.PI * 2),
            size: rand(2.5, 5),
        });
    }
}

function maintainFood() {
    if (foods.length < FOOD_COUNT * 0.6) {
        spawnFood(FOOD_COUNT - foods.length);
    }
}

function updateMagnetism(dt) {
    for (const f of foods) {
        let closestSnake = null;
        let closestDistSq = MAGNET_DISTANCE * MAGNET_DISTANCE;

        for (const snake of snakes) {
            if (!snake.alive) continue;

            const dx = snake.x - f.x;
            const dy = snake.y - f.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < closestDistSq) {
                closestDistSq = distSq;
                closestSnake = snake;
            }
        }

        if (closestSnake) {
            const d = Math.sqrt(closestDistSq);
            if (d < 1) continue;

            // Stronger pull as it gets closer
            const pullFactor = 1.0 - (d / MAGNET_DISTANCE);
            // Speed ranging from 0.5x to 2.0x base force
            const speed = MAGNET_FORCE * (0.5 + pullFactor * 1.5);

            const dx = closestSnake.x - f.x;
            const dy = closestSnake.y - f.y;

            f.x += (dx / d) * speed * dt;
            f.y += (dy / d) * speed * dt;
        }
    }
}

// ---- Collision Detection ----
function checkCollisions() {
    for (const snake of snakes) {
        if (!snake.alive) continue;

        const hx = snake.x;
        const hy = snake.y;
        const lastX = snake.lastX || hx;
        const lastY = snake.lastY || hy;

        // Bounding box for the head's movement this frame (optimization)
        const minX = Math.min(hx, lastX) - 60;
        const maxX = Math.max(hx, lastX) + 60;
        const minY = Math.min(hy, lastY) - 60;
        const maxY = Math.max(hy, lastY) + 60;

        // Wall collision (simple check)
        if (hx < 0 || hx > ARENA_SIZE || hy < 0 || hy > ARENA_SIZE) {
            snake.die();
            if (snake.isPlayer) onPlayerDeath();
            continue;
        }

        // Collision with other snakes
        for (const other of snakes) {
            if (other === snake || !other.alive) continue;

            // Check enemy HEAD first
            if (Math.abs(other.x - hx) <= 60 && Math.abs(other.y - hy) <= 60) {
                const distSq = distToSegmentSquared({ x: other.x, y: other.y }, { x: lastX, y: lastY }, { x: hx, y: hy });
                const hitDist = (snake.width + other.width) * 0.4;
                if (distSq < hitDist * hitDist) {
                    snake.die();
                    // Play kill success sound if player killed someone
                    if (other.isPlayer) {
                        soundManager.playKill();
                        screenShake = 20; // Massive impact
                    } else if (snake.isPlayer) {
                        onPlayerDeath();
                    }
                    // Give score to killer
                    if (other.alive) {
                        other.score += Math.floor(snake.score * 0.3);
                    }
                    break;
                }
            }
            if (!snake.alive) break;

            // Check all segments (start from 0, don't skip neck!)
            for (let i = 0; i < other.segments.length; i++) {
                const seg = other.segments[i];
                if (seg.x < minX || seg.x > maxX || seg.y < minY || seg.y > maxY) continue;

                // Check distance from EnemySegment (Point) to HeadPath (Line Segment)
                const distSq = distToSegmentSquared({ x: seg.x, y: seg.y }, { x: lastX, y: lastY }, { x: hx, y: hy });
                const hitDist = (snake.width + other.width) * 0.4;

                if (distSq < hitDist * hitDist) {
                    snake.die();
                    if (other.isPlayer) {
                        soundManager.playKill();
                        screenShake = 15; // Rewarding shake
                    } else if (snake.isPlayer) {
                        onPlayerDeath();
                    }
                    if (other.alive) {
                        other.score += Math.floor(snake.score * 0.3);
                    }
                    break;
                }
            }
            if (!snake.alive) break;
        }
        if (!snake.alive) continue;

        // Self-collision
        for (let i = 20; i < snake.segments.length; i++) {
            const seg = snake.segments[i];
            if (seg.x < minX || seg.x > maxX || seg.y < minY || seg.y > maxY) continue;

            const distSq = distToSegmentSquared({ x: seg.x, y: seg.y }, { x: lastX, y: lastY }, { x: hx, y: hy });
            const hitDist = snake.width * 0.5;

            if (distSq < hitDist * hitDist) {
                snake.die();
                if (snake.isPlayer) onPlayerDeath();
                break;
            }
        }
        if (!snake.alive) continue;

        // Food collection
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            if (f.x < minX || f.x > maxX || f.y < minY || f.y > maxY) continue;

            const distSq = distToSegmentSquared({ x: f.x, y: f.y }, { x: lastX, y: lastY }, { x: hx, y: hy });
            const hitRadius = snake.width + f.size + 8;

            if (distSq < hitRadius * hitRadius) {
                snake.score += f.value;
                snake.foodEaten++;

                // Satisfying Logic
                snake.headScale = 1.6; // Bigger Gulp
                if (snake.isPlayer) {
                    screenShake = 5 + f.value; // Crunchier
                    soundManager.playCollect();
                }

                // Floating Text
                floatingTexts.push(new FloatingText(f.x, f.y, `+${f.value}`, f.color));

                // Particles
                for (let p = 0; p < 8; p++) {
                    particles.push(new Particle(f.x, f.y, f.color, 'collect'));
                }
                particles.push(new Particle(f.x, f.y, f.color, 'shockwave'));

                foods.splice(i, 1);
            }
        }
    }
}

function distToSegmentSquared(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.y - v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const finalX = v.x + t * (w.x - v.x);
    const finalY = v.y + t * (w.y - v.y);
    return (p.x - finalX) ** 2 + (p.y - finalY) ** 2;
}

// ---- Boost Detection ----
function checkBoosts() {
    for (const snake of snakes) {
        if (!snake.alive) continue;

        let nearParallel = false;
        snake.boostConnection = null;
        const hx = snake.x;
        const hy = snake.y;
        const snakeDir = snake.dir;

        for (const other of snakes) {
            if (other === snake || !other.alive) continue;

            // Check close segments
            for (let i = 0; i < other.segments.length; i += 2) {
                const seg = other.segments[i];
                const d = dist({ x: hx, y: hy }, seg);

                if (d < BOOST_PROXIMITY && d > snake.width + other.width) {
                    nearParallel = true;
                    snake.boostConnection = {
                        x: seg.x,
                        y: seg.y,
                        color: other.color // Use other snake's color for the bolt
                    };
                    break;
                }
            }
            if (nearParallel) break;
        }

        if (nearParallel) {
            if (!snake.boosting && snake.isPlayer) {
                soundManager.playBoost();
            }
            snake.boosting = true;
            snake.boostTimer = 0.3;
            // Boost particles
            if (Math.random() < 0.3) {
                particles.push(new Particle(
                    hx + rand(-15, 15),
                    hy + rand(-15, 15),
                    '#ffe600',
                    'boost'
                ));
            }
        }
    }
}

// ---- Rendering ----
function render() {
    const w = canvas.width;
    const h = canvas.height;

    // Dark background with subtle gradient
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h / 2, w / 2, h / 2, w);
    gradient.addColorStop(0, '#0a0a14');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Camera
    if (player && player.alive) {
        camera.x = lerp(camera.x, player.x, CAMERA_LERP);
        camera.y = lerp(camera.y, player.y, CAMERA_LERP);

        // Zoom based on snake size
        const targetZoom = clamp(1.0 - player.segments.length * 0.0005, 0.45, 1.0);
        camera.zoom = lerp(camera.zoom, targetZoom, 0.02);
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Screen Shake
    if (screenShake > 0) {
        const sx = rand(-screenShake, screenShake);
        const sy = rand(-screenShake, screenShake);
        ctx.translate(sx, sy);
    }

    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // Draw grid
    drawGrid();

    // Draw arena border
    drawArenaBorder();

    // Draw boosts under everything
    drawAllBoostLightnings();

    // Draw food
    drawFood();

    // Draw snakes
    drawSnakes();

    // Draw particles
    drawParticles();

    // Draw floating text
    drawFloatingTexts();

    ctx.restore();
}

function drawGrid() {
    const w = canvas.width;
    const h = canvas.height;

    // Visible bounds
    const halfW = (w / 2) / camera.zoom;
    const halfH = (h / 2) / camera.zoom;
    const left = camera.x - halfW - GRID_SIZE;
    const right = camera.x + halfW + GRID_SIZE;
    const top = camera.y - halfH - GRID_SIZE;
    const bottom = camera.y + halfH + GRID_SIZE;

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

    ctx.lineWidth = 1;

    for (let x = startX; x <= right; x += GRID_SIZE) {
        if (x < 0 || x > ARENA_SIZE) continue;

        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, top));
        ctx.lineTo(x, Math.min(ARENA_SIZE, bottom));

        // Major lines every 5 cells
        if (x % (GRID_SIZE * 5) === 0) {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    }

    for (let y = startY; y <= bottom; y += GRID_SIZE) {
        if (y < 0 || y > ARENA_SIZE) continue;

        ctx.beginPath();
        ctx.moveTo(Math.max(0, left), y);
        ctx.lineTo(Math.min(ARENA_SIZE, right), y);

        if (y % (GRID_SIZE * 5) === 0) {
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    }
}

function drawArenaBorder() {
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 40;

    // Draw animated border glow
    const time = performance.now() / 500;
    const alpha = 0.5 + Math.sin(time) * 0.2;

    ctx.globalAlpha = alpha;
    ctx.strokeRect(0, 0, ARENA_SIZE, ARENA_SIZE);
    ctx.globalAlpha = 1;

    ctx.shadowBlur = 0;
}

function drawFood() {
    const time = performance.now() / 1000;

    // Only draw food in visible range
    const halfW = (canvas.width / 2) / camera.zoom;
    const halfH = (canvas.height / 2) / camera.zoom;
    const viewLeft = camera.x - halfW - 50;
    const viewRight = camera.x + halfW + 50;
    const viewTop = camera.y - halfH - 50;
    const viewBottom = camera.y + halfH + 50;

    for (const f of foods) {
        if (f.x < viewLeft || f.x > viewRight || f.y < viewTop || f.y > viewBottom) continue;

        const pulse = Math.sin(time * 4 + f.pulse);
        const size = f.size + pulse * 1.5;

        // Outer Glow Ring
        ctx.beginPath();
        ctx.arc(f.x, f.y, size + 4, 0, Math.PI * 2);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 0.6 + pulse * 0.2;
        ctx.stroke();

        // Inner Core
        ctx.beginPath();
        ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.globalAlpha = 1;
        ctx.fill();

        // Tinted core
        ctx.beginPath();
        ctx.arc(f.x, f.y, size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.shadowBlur = 0;
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawSnakes() {
    const sorted = [...snakes].filter(s => s.alive).sort((a, b) => {
        if (a.isPlayer) return 1;
        if (b.isPlayer) return -1;
        // Draw boosting snakes behind non-boosting to hide artifacts
        return (a.boosting ? 0 : 1) - (b.boosting ? 0 : 1);
    });

    for (const snake of sorted) {
        drawSnake(snake);
    }
}

function drawSnake(snake) {
    if (snake.segments.length < 2) return;

    const w = snake.width;
    const time = performance.now() / 1000;

    // --- 1. Outer Glow (The Neon Halo) ---
    ctx.shadowColor = snake.color;
    ctx.shadowBlur = 20 + snake.boostIntensity * 25; // Massive glow when boosting
    ctx.strokeStyle = snake.color;
    ctx.lineWidth = w * 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.4;

    ctx.beginPath();
    ctx.moveTo(snake.x, snake.y);
    for (let i = 0; i < snake.segments.length; i++) {
        ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
    }
    ctx.stroke();

    // --- 2. Main Body Color ---
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = snake.color;
    ctx.lineWidth = w;

    ctx.beginPath();
    ctx.moveTo(snake.x, snake.y);
    for (let i = 0; i < snake.segments.length; i++) {
        ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
    }
    ctx.stroke();

    // --- 3. Inner White Core (The Energy) ---
    ctx.strokeStyle = '#ffffff'; // Pure energy center
    ctx.lineWidth = w * 0.3;
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    ctx.moveTo(snake.x, snake.y);
    for (let i = 0; i < snake.segments.length; i++) {
        ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // --- Head ---
    const headSize = w * 0.85 * snake.headScale;
    ctx.translate(snake.x, snake.y);
    // Rotating head based on direction? No, just use direction
    const angle = Math.atan2(DIR_VECTORS[snake.dir].y, DIR_VECTORS[snake.dir].x);
    ctx.rotate(angle);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = snake.color;
    ctx.shadowBlur = 20;

    // Simplify head shape to circle for smoothness, but add eyes
    ctx.beginPath();
    ctx.arc(0, 0, headSize, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000000';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(headSize * 0.3, -headSize * 0.4, headSize * 0.25, 0, Math.PI * 2); // Right eye
    ctx.arc(headSize * 0.3, headSize * 0.4, headSize * 0.25, 0, Math.PI * 2);  // Left eye
    ctx.fill();

    ctx.rotate(-angle);
    ctx.translate(-snake.x, -snake.y);

    // King crown
    if (currentKing === snake) {
        drawCrown(snake.x, snake.y - w - 15);
    }

    // Name tag
    drawNameTag(snake);
}

function drawCrown(x, y) {
    const bounce = Math.sin(performance.now() / 200) * 3;
    ctx.save();
    ctx.translate(x, y + bounce);
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-5, 0);
    ctx.lineTo(0, -10);
    ctx.lineTo(5, 0);
    ctx.lineTo(10, -5);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawNameTag(snake) {
    if (snake.isPlayer) return; // Hide own name to reduce clutter or use UI

    const fontSize = clamp(12 / camera.zoom, 10, 18);
    ctx.font = `600 ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 3;
    ctx.lineWidth = 3;
    ctx.strokeText(snake.name, snake.x, snake.y - snake.width - 16);

    ctx.fillStyle = '#fff';
    ctx.fillText(snake.name, snake.x, snake.y - snake.width - 16);
    ctx.shadowBlur = 0;
}

function drawBoostEffect(snake) {
    // Electric crackle along the body
    const time = performance.now() / 1000;

    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffe600';

    ctx.beginPath();

    // Draw some random arcs along the body
    for (let i = 0; i < snake.segments.length - 1; i += 3) {
        if (Math.random() > 0.3) continue;

        const s1 = snake.segments[i];
        const s2 = snake.segments[i + 1];

        if (!s2) continue;

        const midX = (s1.x + s2.x) / 2;
        const midY = (s1.y + s2.y) / 2;

        // Offset
        const offX = rand(-10, 10);
        const offY = rand(-10, 10);

        ctx.moveTo(midX, midY);
        ctx.lineTo(midX + offX, midY + offY);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function drawAllBoostLightnings() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const snake of snakes) {
        if (!snake.alive || !snake.boostConnection) continue;

        const start = { x: snake.x, y: snake.y };
        const end = snake.boostConnection;
        drawLightning(start.x, start.y, end.x, end.y, end.color);
    }
}

function drawLightning(x1, y1, x2, y2, color) {
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 5) return;

    const steps = Math.max(2, Math.floor(d / 20));

    // Glowy path
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x1, y1);

    let px = x1;
    let py = y1;

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const tx = x1 + (x2 - x1) * t;
        const ty = y1 + (y2 - y1) * t;

        // Jagged offset
        const off = (Math.random() - 0.5) * 15;
        const perpX = -(y2 - y1) / d;
        const perpY = (x2 - x1) / d;

        px = tx + perpX * off;
        py = ty + perpY * off;

        ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

function drawParticles() {
    for (const p of particles) {
        if (p.dead) continue;

        ctx.globalAlpha = p.alpha;

        if (p.type === 'shockwave') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.lineWidth = 4 * p.alpha;
            ctx.strokeStyle = p.color;
            ctx.stroke();
        } else if (p.shape === 'rect') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            const s = p.size * p.alpha;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.restore();
        } else if (p.shape === 'star') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);

            const s = p.size * p.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;

            // Draw simple diamond/star
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.3, -s * 0.3);
            ctx.lineTo(s, 0);
            ctx.lineTo(s * 0.3, s * 0.3);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.3, s * 0.3);
            ctx.lineTo(-s, 0);
            ctx.lineTo(-s * 0.3, -s * 0.3);
            ctx.fill();

            ctx.restore();
        } else {
            // Circle default
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.fill();
        }

    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function drawFloatingTexts() {
    for (const ft of floatingTexts) {
        ft.draw(ctx);
    }
}

function lightenColor(hex, amount) {
    // Utility preserved
    try {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.min(255, r + amount);
        g = Math.min(255, g + amount);
        b = Math.min(255, b + amount);
        return `rgb(${r},${g},${b})`;
    } catch (e) { return hex; }
}

// ---- Minimap ----
function drawMinimap() {
    const mw = MINIMAP_SIZE;
    const mh = MINIMAP_SIZE;
    const scale = mw / ARENA_SIZE;

    minimapCtx.clearRect(0, 0, mw, mh);

    // Background
    minimapCtx.fillStyle = 'rgba(6, 6, 12, 0.8)';
    minimapCtx.fillRect(0, 0, mw, mh);

    // Border
    minimapCtx.strokeStyle = 'rgba(255, 51, 85, 0.3)';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(0, 0, mw, mh);

    // Draw snakes as dots
    for (const snake of snakes) {
        if (!snake.alive) continue;
        const mx = snake.x * scale;
        const my = snake.y * scale;
        const dotSize = snake.isPlayer ? 4 : 2;

        minimapCtx.beginPath();
        minimapCtx.arc(mx, my, dotSize, 0, Math.PI * 2);
        minimapCtx.fillStyle = snake.isPlayer ? '#ffffff' : snake.color;
        minimapCtx.fill();
    }

    // Camera viewport indicator
    if (player) {
        const vw = (canvas.width / camera.zoom) * scale;
        const vh = (canvas.height / camera.zoom) * scale;
        const vx = camera.x * scale - vw / 2;
        const vy = camera.y * scale - vh / 2;

        minimapCtx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        minimapCtx.lineWidth = 1;
        minimapCtx.strokeRect(vx, vy, vw, vh);
    }
}

// ---- Leaderboard ----
function updateLeaderboard() {
    const alive = snakes.filter(s => s.alive);
    alive.sort((a, b) => b.score - a.score);
    const top10 = alive.slice(0, 10);

    const king = top10[0] || null;

    let html = '';
    for (let i = 0; i < top10.length; i++) {
        const s = top10[i];
        const isPlayerEntry = s.isPlayer;
        const isKing = s === king;
        let classes = 'lb-entry';
        if (isPlayerEntry) classes += ' is-player';
        if (isKing) classes += ' is-king';

        const crown = isKing ? '<span class="lb-crown">👑</span>' : '';
        html += `
            <div class="${classes}" style="color: ${isPlayerEntry ? s.color : ''}">
                <span class="lb-rank">${i + 1}</span>
                <span class="lb-name">${crown}${escapeHtml(s.name)}</span>
                <span class="lb-score">${s.score}</span>
            </div>
        `;
    }
    lbEntries.innerHTML = html;

    // Update player score
    if (player && player.alive) {
        scoreValue.textContent = player.score;
    }

    // Boost indicator
    if (player && player.boostIntensity > 0.05) {
        boostIndicator.classList.remove('hidden');
    } else {
        boostIndicator.classList.add('hidden');
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getKing() {
    const alive = snakes.filter(s => s.alive);
    if (alive.length === 0) return null;
    alive.sort((a, b) => b.score - a.score);
    return alive[0];
}

// ---- Input Handling ----
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // Don't process game controls if typing in an input
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (!player || !player.alive) return;

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            e.preventDefault();
            player.turnTo(3);
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            e.preventDefault();
            player.turnTo(1);
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            e.preventDefault();
            player.turnTo(2);
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            e.preventDefault();
            player.turnTo(0);
            break;
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// ---- Touch Controls (Mobile) ----
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
let joystickActive = false;
let joystickTouchId = null;
let joyStartX = 0;
let joyStartY = 0;

window.addEventListener('touchstart', (e) => {
    if (!gameRunning || !player || !player.alive) return;

    // Use loop to find a suitable touch if multiple land at once (rare but possible)
    // or just take the first changed touch if we aren't already active.
    if (joystickActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        // Check if touching UI elements
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') continue;

        e.preventDefault();

        joystickActive = true;
        joystickTouchId = touch.identifier;
        joyStartX = touch.clientX;
        joyStartY = touch.clientY;

        // Show Joystick
        joystickBase.style.display = 'block';
        joystickStick.style.display = 'block';

        // Position Base
        joystickBase.style.left = `${joyStartX}px`;
        joystickBase.style.top = `${joyStartY}px`;

        // Position Stick
        joystickStick.style.left = `${joyStartX}px`;
        joystickStick.style.top = `${joyStartY}px`;

        // Only handle one joystick touch
        break;
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickTouchId) {
            e.preventDefault();

            const dx = touch.clientX - joyStartX;
            const dy = touch.clientY - joyStartY;

            const distance = Math.min(Math.hypot(dx, dy), 60); // Clamp radius to 60px (matches new UI size)
            const angle = Math.atan2(dy, dx);

            // Update Stick Visual Position
            const stickX = joyStartX + Math.cos(angle) * distance;
            const stickY = joyStartY + Math.sin(angle) * distance;

            joystickStick.style.left = `${stickX}px`;
            joystickStick.style.top = `${stickY}px`;

            // Determine Direction (only if moved slightly to avoid jitter)
            if (distance > 10) {
                // Map angle to 4-way direction
                // Right: -45 to 45
                // Down: 45 to 135
                // Left: 135 to 180 OR -180 to -135
                // Up: -135 to -45

                const deg = angle * (180 / Math.PI);
                let dir = 0;

                if (deg >= -45 && deg < 45) {
                    dir = 0; // Right
                } else if (deg >= 45 && deg < 135) {
                    dir = 1; // Down
                } else if (deg >= 135 || deg < -135) {
                    dir = 2; // Left
                } else if (deg >= -135 && deg < -45) {
                    dir = 3; // Up
                }

                player.turnTo(dir);
            }
            break;
        }
    }
}, { passive: false });

const handleTouchEnd = (e) => {
    if (!joystickActive) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
            joystickActive = false;
            joystickTouchId = null;
            joystickBase.style.display = 'none';
            joystickStick.style.display = 'none';
            break;
        }
    }
};

window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

// ---- Game Flow ----
function startGame(nickname) {
    snakes = [];
    foods = [];
    particles = [];

    // Create player
    const playerColor = pick(NEON_COLORS);
    player = new Snake(nickname || 'Player', playerColor, true);
    snakes.push(player);

    // Camera to player
    camera.x = player.x;
    camera.y = player.y;
    camera.zoom = 1.0;

    // Create bots
    const usedNames = new Set([player.name]);
    const shuffledColors = [...NEON_COLORS].sort(() => Math.random() - 0.5);
    for (let i = 0; i < BOT_COUNT; i++) {
        let name;
        do {
            name = pick(BOT_NAMES);
        } while (usedNames.has(name));
        usedNames.add(name);

        const color = shuffledColors[i % shuffledColors.length];
        const bot = new Snake(name, color);
        // Give bots some starting score
        bot.score = randInt(10, 150);
        // Add segments matching their score
        const extra = Math.floor(bot.score / 3);
        const dv = DIR_VECTORS[(bot.dir + 2) % 4];
        for (let j = 0; j < extra; j++) {
            const lastSeg = bot.segments[bot.segments.length - 1];
            bot.segments.push({
                x: lastSeg.x + dv.x * SEGMENT_SPACING,
                y: lastSeg.y + dv.y * SEGMENT_SPACING,
            });
        }
        snakes.push(bot);
    }

    // Spawn food
    spawnFood(FOOD_COUNT);

    // UI
    startScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    soundManager.playStart();

    gameRunning = true;
    deathTime = 0;
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
}

function onPlayerDeath() {
    deathTime = performance.now();

    // Calculate rank
    const allSorted = [...snakes].sort((a, b) => b.score - a.score);
    const rank = allSorted.findIndex(s => s === player) + 1;

    finalScore.textContent = player.score;
    finalLength.textContent = player.segments.length;
    finalRank.textContent = `#${rank}`;

    // Short delay before showing death screen
    setTimeout(() => {
        gameRunning = false;
        hud.classList.add('hidden');
        deathScreen.classList.remove('hidden');
    }, 1200);
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const now = timestamp || performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    // Cap dt to avoid huge jumps
    dt = Math.min(dt, 0.05);

    // Update snakes
    for (const snake of snakes) {
        snake.update(dt);
    }

    // Apply food magnetism (suck food towards heads)
    updateMagnetism(dt);

    // Check collisions
    checkCollisions();

    // Check boosts
    checkBoosts();

    // UPDATE BOOST SOUND LOOP
    if (player && player.alive) {
        // Pass intensity (0-1) to drive the sound engine
        soundManager.updateBoostHum(player.boostIntensity);
    } else {
        soundManager.updateBoostHum(0);
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].dead) {
            particles.splice(i, 1);
        }
    }

    // Update Floating Texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(dt);
        if (floatingTexts[i].life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }

    // Decay screenshake
    if (screenShake > 0) {
        screenShake = Math.max(0, screenShake - dt * 30);
    }

    // Maintain food
    maintainFood();

    // Cache king for rendering
    currentKing = getKing();

    // Render
    render();

    // Minimap & leaderboard (every ~200ms)
    hudUpdateTimer += dt;
    if (hudUpdateTimer >= 0.2) {
        hudUpdateTimer = 0;
        drawMinimap();
        updateLeaderboard();
    }

    animationId = requestAnimationFrame(gameLoop);
}

// ---- Sound Manager (Dopamine Edition) ----
class SoundManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.limiter = null;

        // Boost Sound Nodes
        this.boostNodes = null; // Container for nodes
        this.boostMasterGain = null;

        // Combo System
        this.combo = 0;
        this.comboTimer = 0;
        this.comboStyle = 0; // 0=Classic, 1=Crystal, 2=Cyber, 3=Bubble, 4=Void, 5=Rave
        this.currentBoostStyle = 0; // 0=Classic, 1=Warp, 2=Thunder, 3=Jet, 4=Cyber, 5=Sonic
        this.lastBoostStyle = -1;

        // ---- MUSICAL SCALES (calculated in Hz) ----
        const calcScale = (intervals, root) => {
            const result = [];
            for (let oct = 0; oct < 4; oct++) {
                const base = root * Math.pow(2, oct);
                intervals.forEach(ratio => result.push(base * ratio));
            }
            return result;
        };

        this.scales = {
            // 0: Classic (Major Pentatonic)
            0: calcScale([1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], 261.63),
            // 1: Crystal (Lydian - Dreamy)
            1: calcScale([1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 5 / 3, 15 / 8], 261.63),
            // 2: Cyber (Minor Pentatonic + Blue Note)
            2: calcScale([1, 6 / 5, 4 / 3, 45 / 32, 3 / 2, 9 / 5], 261.63),
            // 3: Bubble (Major - Happy)
            3: calcScale([1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8], 261.63),
            // 4: Void (Hirajoshi - Exotic/Dark)
            4: calcScale([1, 9 / 8, 6 / 5, 3 / 2, 8 / 5], 220.00), // A2/A3 base
            // 5: Rave (Phrygian Dominant - Aggressive)
            5: calcScale([1, 16 / 15, 5 / 4, 4 / 3, 3 / 2, 8 / 5, 9 / 5], 220.00),
            // 6: Acid (Dorian - Groovy)
            6: calcScale([1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 5 / 3, 9 / 5], 146.83), // D3
            // 7: Deep (Minor 9th - Hypnotic)
            7: calcScale([1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5], 196.00), // G3
            // 8: Future (Lydian Dominant - Uplifting)
            8: calcScale([1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 5 / 3, 9 / 5], 261.63),
            // 9: Industrial (Locrian - Dissonant)
            9: calcScale([1, 17 / 16, 6 / 5, 4 / 3, 64 / 45, 8 / 5, 9 / 5], 110.00), // A2
            // 10: Glitch (Chromatic/Whole Tone - Chaos)
            10: calcScale([1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 25 / 16], 261.63)
        };

        // Backward compatibility for existing code references if any (though we'll update playCollect)
        this.scale = this.scales[0];
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Chain: Limiter to prevent clipping and add punch
        this.limiter = this.ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -12;
        this.limiter.knee.value = 30;
        this.limiter.ratio.value = 12;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.25;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;

        this.masterGain.connect(this.limiter);
        this.limiter.connect(this.ctx.destination);
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Helper: Random number generator
    rnd(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Helper: Play a tone with advanced controls
    playTone({ freq, type, duration, vol, detune = 0, slide = 0, pan = 0, attack = 0.01, decay = null }) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.value = detune + this.rnd(-5, 5); // Organic variance

        if (slide !== 0) {
            // Prevent going to 0 Hz for exponential ramp
            const target = Math.max(10, freq + slide);
            osc.frequency.exponentialRampToValueAtTime(target, t + duration);
        }

        // ADSR Envelope
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + attack);

        if (decay) {
            gain.gain.exponentialRampToValueAtTime(decay, t + attack + (duration * 0.4));
        }
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration + attack);

        panner.pan.value = pan + this.rnd(-0.1, 0.1);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + duration + attack + 0.1);
    }

    // Helper: Play noise burst for texture
    playNoise(duration, vol) {
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(vol, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }

    playCollect() {
        if (!this.ctx) return;

        // Logic: Reset combo if time gap is too large
        const now = performance.now();
        const resetCombo = (now - this.comboTimer >= 4000);

        if (resetCombo) {
            this.combo = 0;
            // NEW: Pick a new Combo Style for this run!
            // 0=Classic, 1=Crystal, 2=Cyber, 3=Bubble, 4=Void, 5=Rave
            // 6=Acid, 7=Deep, 8=Future, 9=Industrial, 10=Glitch
            this.comboStyle = Math.floor(Math.random() * 11);
        } else {
            // Cap combo at scale length - 1
            const currentScale = this.scales[this.comboStyle] || this.scales[0];
            this.combo = Math.min(this.combo + 1, currentScale.length - 1);
        }
        this.comboTimer = now;

        const style = this.comboStyle;
        const currentScale = this.scales[style] || this.scales[0];
        const baseFreq = currentScale[this.combo % currentScale.length];
        // Octave jump for high combos
        const pitchMult = 1 + Math.floor(this.combo / currentScale.length);
        const freq = baseFreq * pitchMult;

        const panVar = this.rnd(-0.4, 0.4);

        // --- STYLE 0: CLASSIC (The Original Dopamine Mix) ---
        if (style === 0) {
            const SEQUENCE = [0, 0, 2, 0, 1, 0, 3, 0, 0, 2, 0, 4, 3, 1, 5, 2];
            const step = this.combo % SEQUENCE.length;
            const flavor = SEQUENCE[step];

            // Kick/Base
            const isDownbeat = (step % 4 === 0);
            this.playTone({ freq: isDownbeat ? 90 : 110, type: 'sine', duration: 0.1, vol: isDownbeat ? 0.7 : 0.5, slide: -40, attack: 0.002, pan: panVar * 0.1 });

            // Variation logic from original code (compressed for brevity but keeping essence)
            if (flavor === 0) { // Pluck
                this.playTone({ freq: freq, type: 'triangle', duration: 0.15, vol: 0.25, pan: panVar });
                this.playTone({ freq: freq * 2, type: 'sine', duration: 0.05, vol: 0.15, decay: 0.02, pan: panVar });
            } else if (flavor === 1) { // 8-Bit
                this.playTone({ freq: freq, type: 'square', duration: 0.12, vol: 0.18, detune: this.rnd(-6, 6), pan: panVar });
                this.playTone({ freq: freq * 0.5, type: 'square', duration: 0.1, vol: 0.1, pan: panVar });
            } else if (flavor === 2) { // Zap
                this.playTone({ freq: freq, type: 'sawtooth', duration: 0.12, vol: 0.18, slide: 500, attack: 0.005, pan: panVar });
            } else if (flavor === 3) { // Crunch
                this.playTone({ freq: freq, type: 'sawtooth', duration: 0.08, vol: 0.2, slide: -freq * 0.8, pan: panVar });
                this.playNoise(0.06, 0.2);
            } else if (flavor === 4) { // Shimmer
                this.playTone({ freq: freq, type: 'sine', duration: 0.25, vol: 0.25, pan: panVar });
                this.playTone({ freq: freq * 3, type: 'triangle', duration: 0.3, vol: 0.1, detune: this.rnd(5, 15), pan: -panVar });
            } else if (flavor === 5) { // Pulse
                this.playTone({ freq: freq, type: 'square', duration: 0.15, vol: 0.22, detune: 10, pan: panVar - 0.2 });
                this.playTone({ freq: freq * 1.01, type: 'sawtooth', duration: 0.15, vol: 0.22, detune: -10, pan: panVar + 0.2 });
            }
            // Chord stabs on milestones
            if (step === 12 || step === 15 || this.combo > 15) {
                this.playTone({ freq: freq * 1.25, type: 'sine', duration: 0.25, vol: 0.12, pan: -panVar });
                this.playTone({ freq: freq * 1.5, type: 'triangle', duration: 0.25, vol: 0.1, pan: panVar * 0.5 });
            }

            // --- STYLE 1: CRYSTAL CAVE (Dreamy, Glassy, Lydian) ---
        } else if (style === 1) {
            // High frequency emphasis, long tails, bell tones
            // Layer 1: The Bell
            this.playTone({ freq: freq, type: 'sine', duration: 0.3, vol: 0.3, attack: 0.001, decay: 0.5, pan: panVar });
            this.playTone({ freq: freq * 4.2, type: 'sine', duration: 0.1, vol: 0.05, pan: -panVar }); // Metallic partial

            // Layer 2: The Shimmer
            this.playTone({ freq: freq * 2, type: 'triangle', duration: 0.4, vol: 0.1, detune: this.rnd(5, 10), attack: 0.05, pan: panVar + 0.2 });

            // Sparkles on high combos
            if (this.combo % 3 === 0) {
                this.playTone({ freq: freq * 3, type: 'sine', duration: 0.5, vol: 0.1, attack: 0.1, pan: -panVar });
            }

            // --- STYLE 2: CYBER PUNK (Aggressive, Glitchy, Minor Blues) ---
        } else if (style === 2) {
            // Distorted, bitcrushed feel. Short decays.
            const isBlueNote = (this.combo % 6 === 3); // Emphasize the tritone

            this.playTone({
                freq: freq,
                type: 'sawtooth',
                duration: 0.1,
                vol: 0.2,
                slide: isBlueNote ? 200 : 0,
                detune: this.rnd(-15, 15),
                pan: panVar
            });

            // Sub Square
            this.playTone({ freq: freq * 0.5, type: 'square', duration: 0.08, vol: 0.2, pan: 0 });

            // Glitch noise
            if (Math.random() > 0.5) {
                this.playNoise(0.05, 0.1);
            }

            // --- STYLE 3: BUBBLEGUM (Bouncy, Happy, Major) ---
        } else if (style === 3) {
            // Round envelopes, pitch bends up (bloop)
            this.playTone({
                freq: freq,
                type: 'sine',
                duration: 0.15,
                vol: 0.35,
                slide: 150, // The "Bloop" up
                attack: 0.01,
                pan: panVar
            });

            // Plastic texture
            this.playTone({ freq: freq * 2, type: 'triangle', duration: 0.05, vol: 0.1, slide: 300, pan: -panVar });

            // --- STYLE 4: VOID RUNNER (Exotic, Dark, Reverb-ish) ---
        } else if (style === 4) {
            // Slow attack pads/plucks, filtered
            this.playTone({
                freq: freq,
                type: 'triangle',
                duration: 0.4,
                vol: 0.25,
                attack: 0.05,
                pan: panVar
            });

            // Delay effect simulation (quiet repeat)
            setTimeout(() => {
                this.playTone({ freq: freq, type: 'sine', duration: 0.3, vol: 0.1, pan: -panVar });
            }, 100);

            // Deep undertone
            this.playTone({ freq: freq * 0.5, type: 'sine', duration: 0.3, vol: 0.2, pan: 0 });

            // --- STYLE 5: RAVE (Techno, Phrygian, Supersaw) ---
        } else if (style === 5) {
            // Supersaw emulation (3 detuned saws)
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.15, vol: 0.12, detune: 0, pan: 0 });
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.15, vol: 0.12, detune: -15, pan: -0.2 });
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.15, vol: 0.12, detune: 15, pan: 0.2 });

            // Percussive hit on every 4th
            if (this.combo % 4 === 0) {
                this.playNoise(0.05, 0.2); // Hi-hatish
            }

            // --- STYLE 6: ACID HOUSE (Dorian, Resonant Sweeps) ---
        } else if (style === 6) {
            // Emulate TB-303 squelch
            // Sawtooth with sharp envelope filter sweep
            this.playTone({
                freq: freq,
                type: 'sawtooth',
                duration: 0.2,
                vol: 0.2,
                slide: 400 * (0.5 + Math.random()), // Filter sweep emulation
                attack: 0.01,
                pan: panVar
            });
            // Sub square for body
            this.playTone({ freq: freq * 0.5, type: 'square', duration: 0.1, vol: 0.15, pan: 0 });

            // Accent notes
            if (this.combo % 3 === 0) {
                this.playTone({ freq: freq * 2, type: 'sawtooth', duration: 0.1, vol: 0.1, slide: -200, pan: -panVar });
            }

            // --- STYLE 7: DEEP TECH (Minor 9th, Plucks) ---
        } else if (style === 7) {
            // Short, punchy sine plucks with "delay"
            this.playTone({ freq: freq, type: 'sine', duration: 0.1, vol: 0.4, attack: 0.005, decay: 0.05, pan: panVar });

            // Delay lines
            setTimeout(() => this.playTone({ freq: freq, type: 'sine', duration: 0.1, vol: 0.15, pan: -panVar * 0.5 }), 120);
            setTimeout(() => this.playTone({ freq: freq, type: 'sine', duration: 0.1, vol: 0.08, pan: panVar * 0.5 }), 240);

            // Techy click
            this.playNoise(0.02, 0.1);

            // --- STYLE 8: FUTURE BASS (Super Major 7th, Wubs) ---
        } else if (style === 8) {
            // Detuned saws with volume ducking (sidechain feel)
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.25, vol: 0.15, detune: -8, attack: 0.05, pan: -0.2 });
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.25, vol: 0.15, detune: 8, attack: 0.05, pan: 0.2 });

            // Third and Seventh (Chord stack)
            if (this.combo % 2 === 0) {
                this.playTone({ freq: freq * 1.25, type: 'sawtooth', duration: 0.2, vol: 0.08, detune: 5, attack: 0.05, pan: 0 }); // Major 3rd
            }

            // --- STYLE 9: INDUSTRIAL (Locrian, Metallic) ---
        } else if (style === 9) {
            // Metallic ring modulation-ish
            this.playTone({ freq: freq, type: 'square', duration: 0.15, vol: 0.2, detune: this.rnd(-100, 100), pan: panVar });
            this.playTone({ freq: freq * 2.53, type: 'square', duration: 0.1, vol: 0.15, detune: 0, pan: -panVar }); // Non-integer harmonic

            // Clank noise
            this.playNoise(0.08, 0.15);

            // Gritty osc
            this.playTone({ freq: 80, type: 'sawtooth', duration: 0.1, vol: 0.2, pan: 0 });

            // --- STYLE 10: GLITCH HOP (Chromatic, Random) ---
        } else if (style === 10) {
            // Random pitch quantization effect
            const glitchFreq = freq * (1 + (Math.floor(Math.random() * 4) * 0.25));
            this.playTone({ freq: glitchFreq, type: 'triangle', duration: 0.08, vol: 0.3, pan: panVar });

            // Artifacts
            setTimeout(() => this.playTone({ freq: glitchFreq * 2, type: 'square', duration: 0.02, vol: 0.1 }), 40);

            // Bitcrush noise
            this.playNoise(0.04, 0.2);
        }

        // Common Reward/Bass Logic for high combos (scaled by style)
        if (this.combo > 20 && style !== 3) { // Bubblegum doesn't get heavy bass
            this.playTone({ freq: 55, type: 'sine', duration: 0.3, vol: 0.3, attack: 0.05, pan: 0 });
        }
    }

    playBoost() {
        if (!this.ctx) return;

        // Pick a style for this boost session (syncs with hum)
        // 0-5 Original, 6-10 New
        this.currentBoostStyle = Math.floor(Math.random() * 11);
        const variant = this.currentBoostStyle;

        const t = this.ctx.currentTime;
        const panVar = this.rnd(-0.3, 0.3);

        // --- VARIANT 0: CLASSIC NITRO ---
        if (variant === 0) {
            // Ignition
            this.playTone({ freq: 150, type: 'triangle', duration: 0.15, vol: 0.5, slide: -100, attack: 0.005, pan: 0 });
            // Scream
            this.playTone({ freq: 200, type: 'sawtooth', duration: 0.4, vol: 0.2, slide: 800, attack: 0.05, pan: panVar - 0.3 });
            this.playTone({ freq: 205, type: 'square', duration: 0.4, vol: 0.15, slide: 850, attack: 0.05, pan: panVar + 0.3 });
            // Crackle
            this.playNoise(0.2, 0.15);
            // Sub
            this.playTone({ freq: 60, type: 'sine', duration: 0.5, vol: 0.3, slide: 20, attack: 0.1 });

            // --- VARIANT 1: WARP DRIVE (Sci-Fi, Phasey) ---
        } else if (variant === 1) {
            // Pure sine sweep, very clean
            this.playTone({ freq: 100, type: 'sine', duration: 0.6, vol: 0.4, slide: 1200, attack: 0.1, pan: panVar });
            // Harmonic overtone
            this.playTone({ freq: 200, type: 'triangle', duration: 0.6, vol: 0.1, slide: 2400, attack: 0.1, pan: -panVar });

            // --- VARIANT 2: THUNDER STRIKE (Heavy, Rumble) ---
        } else if (variant === 2) {
            // Impact
            this.playNoise(0.3, 0.4);
            // Rumble
            this.playTone({ freq: 80, type: 'sawtooth', duration: 0.5, vol: 0.5, slide: -40, attack: 0.01, pan: 0 });
            // Crackle finish
            setTimeout(() => this.playNoise(0.1, 0.2), 200);

            // --- VARIANT 3: JET ENGINE (Airy, Hiss) ---
        } else if (variant === 3) {
            // White noise filter sweep simulation (using gain env)
            const jetGain = this.ctx.createGain();
            const jetNoise = this.ctx.createBufferSource();
            // ...Simplified using playNoise for brevity, but tailored
            this.playNoise(0.5, 0.1);
            // Rising air tone
            this.playTone({ freq: 400, type: 'triangle', duration: 0.5, vol: 0.1, slide: 600, pan: panVar });

            // --- VARIANT 4: CYBER DASH (Digital, Glitchy) ---
        } else if (variant === 4) {
            // Stepped freq rise ? Can't easily do steps with simple ramp, simulates with fast slide
            this.playTone({ freq: 300, type: 'square', duration: 0.1, vol: 0.2, slide: 0, pan: panVar });
            setTimeout(() => this.playTone({ freq: 600, type: 'square', duration: 0.1, vol: 0.2, pan: panVar }), 100);
            setTimeout(() => this.playTone({ freq: 1200, type: 'square', duration: 0.2, vol: 0.2, pan: panVar }), 200);

            // --- VARIANT 5: SONIC BOOM (Punchy, Quick) ---
        } else if (variant === 5) {
            // Quick thump
            this.playTone({ freq: 100, type: 'sine', duration: 0.1, vol: 0.8, slide: -50, attack: 0.001, pan: 0 });
            // High frequency snap
            this.playTone({ freq: 3000, type: 'triangle', duration: 0.05, vol: 0.1, pan: 0 });

            // --- VARIANT 6: PLASMA (Electrical, Zipping) ---
        } else if (variant === 6) {
            // High pitched fizz
            this.playTone({ freq: 800, type: 'sawtooth', duration: 0.3, vol: 0.15, slide: 1500, pan: panVar });
            // Zap
            this.playTone({ freq: 400, type: 'square', duration: 0.1, vol: 0.2, slide: 800, pan: -panVar });
            // Electrical hum
            this.playTone({ freq: 50, type: 'sawtooth', duration: 0.4, vol: 0.3, detune: 20 });

            // --- VARIANT 7: NEBULA (Washy, Reverb-like) ---
        } else if (variant === 7) {
            // Soft attack wash
            this.playTone({ freq: 200, type: 'sine', duration: 1.0, vol: 0.3, attack: 0.2, slide: 200, pan: panVar });
            this.playTone({ freq: 300, type: 'sine', duration: 1.0, vol: 0.2, attack: 0.25, slide: 300, pan: -panVar });
            this.playNoise(0.8, 0.05);

            // --- VARIANT 8: OVERDRIVE (Distorted, Aggressive) ---
        } else if (variant === 8) {
            // Power chord feel
            this.playTone({ freq: 110, type: 'sawtooth', duration: 0.4, vol: 0.3, detune: -5, pan: -0.2 });
            this.playTone({ freq: 165, type: 'sawtooth', duration: 0.4, vol: 0.3, detune: 5, pan: 0.2 });
            this.playNoise(0.3, 0.2);

            // --- VARIANT 9: SLIPSTREAM (Wind, Flow) ---
        } else if (variant === 9) {
            // High pass filter sweep simulation via tone slide
            this.playTone({ freq: 2000, type: 'triangle', duration: 0.6, vol: 0.1, slide: -1000, attack: 0.1 });
            this.playNoise(0.6, 0.2); // Wind

            // --- VARIANT 10: QUANTUM (Granular, Particles) ---
        } else if (variant === 10) {
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    this.playTone({ freq: this.rnd(800, 2500), type: 'sine', duration: 0.05, vol: 0.2, pan: this.rnd(-1, 1) });
                }, i * 30);
            }
            this.playTone({ freq: 100, type: 'sine', duration: 0.5, vol: 0.4, slide: 100 });
        }
    }

    playKill() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 11);
        const t = this.ctx.currentTime;

        // --- VARIANT 0: BASSCANNON (Classic Dubstep Drop) ---
        if (variant === 0) {
            this.playTone({ freq: 180, type: 'sine', duration: 0.6, vol: 0.8, slide: -140, attack: 0.001, pan: 0 }); // Sub
            this.playTone({ freq: 80, type: 'sawtooth', duration: 0.3, vol: 0.4, slide: -50, attack: 0.01, pan: this.rnd(-0.5, 0.5) }); // Crunch
            this.playNoise(0.2, 0.4);
            // Glory Stabs
            const root = 523.25;
            [1, 1.25, 1.5].forEach((ratio, i) => {
                setTimeout(() => this.playTone({ freq: root * ratio, type: 'square', duration: 0.15, vol: 0.2, pan: (i - 1) * 0.5 }), i * 30);
            });
            // Reward Glitter
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(1200, 2000), type: 'sine', duration: 0.1, vol: 0.1, pan: this.rnd(-0.8, 0.8) }), 100 + i * 40);
            }

            // --- VARIANT 1: GLASS SHATTER (High Freq Burst) ---
        } else if (variant === 1) {
            // Smash
            this.playNoise(0.1, 0.6);
            // Shards falling
            for (let i = 0; i < 8; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(2000, 5000), type: 'triangle', duration: 0.05, vol: 0.1, pan: this.rnd(-0.8, 0.8) }), i * 20);
            }
            // Sharp high tone
            this.playTone({ freq: 1500, type: 'sine', duration: 0.2, vol: 0.3, decay: 0.1, pan: 0 });

            // --- VARIANT 2: IMPLOSION (Reverse Suction + Pop) ---
        } else if (variant === 2) {
            // In-suck
            this.playTone({ freq: 100, type: 'sine', duration: 0.2, vol: 0.4, slide: 300, attack: 0.01, pan: 0 });
            // Pop
            setTimeout(() => {
                this.playTone({ freq: 50, type: 'square', duration: 0.1, vol: 0.6, slide: -20, pan: 0 });
                this.playNoise(0.15, 0.3);
            }, 200);

            // --- VARIANT 3: 8-BIT EXPLOSION (Retro) ---
        } else if (variant === 3) {
            // White noise decay
            this.playNoise(0.4, 0.5);
            // Downsampling sweep effect
            this.playTone({ freq: 400, type: 'square', duration: 0.3, vol: 0.3, slide: -350, attack: 0.01, pan: 0 });

            // --- VARIANT 4: GLITCH TEAR (Digital Destruction) ---
        } else if (variant === 4) {
            this.playTone({ freq: 1000, type: 'sawtooth', duration: 0.05, vol: 0.4, pan: -0.5 });
            setTimeout(() => this.playTone({ freq: 200, type: 'sawtooth', duration: 0.05, vol: 0.4, pan: 0.5 }), 50);
            setTimeout(() => this.playTone({ freq: 5000, type: 'sawtooth', duration: 0.05, vol: 0.4, pan: -0.2 }), 100);
            setTimeout(() => this.playNoise(0.2, 0.3), 150);

            // --- VARIANT 5: ETHEREAL RELEASE (Holy, Reverb) ---
        } else if (variant === 5) {
            // Minor chord pad
            this.playTone({ freq: 440, type: 'sine', duration: 0.8, vol: 0.2, attack: 0.1, pan: -0.3 });
            this.playTone({ freq: 523, type: 'sine', duration: 0.8, vol: 0.2, attack: 0.1, pan: 0.3 });
            this.playTone({ freq: 659, type: 'sine', duration: 0.8, vol: 0.2, attack: 0.1, pan: 0 });
            // Low thud
            this.playTone({ freq: 60, type: 'sine', duration: 0.4, vol: 0.4, attack: 0.01, pan: 0 });

            // --- VARIANT 6: BLACK HOLE (Deep sub suck + silence) ---
        } else if (variant === 6) {
            // Deep low slide down
            this.playTone({ freq: 100, type: 'sine', duration: 0.8, vol: 0.8, slide: -90, attack: 0.01 });
            // Silence/Vacuum noise
            this.playNoise(0.5, 0.1);
            // Final pop
            setTimeout(() => this.playTone({ freq: 2000, type: 'sine', duration: 0.05, vol: 0.2 }), 800);

            // --- VARIANT 7: FATALITY (Digital impact + Drone) ---
        } else if (variant === 7) {
            this.playTone({ freq: 50, type: 'square', duration: 0.3, vol: 0.8, slide: -20 });
            this.playNoise(0.1, 0.5);
            // Low menacing drone
            this.playTone({ freq: 40, type: 'sawtooth', duration: 1.5, vol: 0.3, attack: 0.5 });

            // --- VARIANT 8: DISINTEGRATE (Noise dissolving) ---
        } else if (variant === 8) {
            // Granular bits
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    this.playTone({ freq: this.rnd(500, 3000), type: 'square', duration: 0.02, vol: 0.15, pan: this.rnd(-0.8, 0.8) });
                }, i * 30);
            }
            this.playNoise(0.5, 0.3);

            // --- VARIANT 9: VAPORIZE (Quick hiss + high sine fade) ---
        } else if (variant === 9) {
            this.playNoise(0.1, 0.6); // Psst
            this.playTone({ freq: 4000, type: 'sine', duration: 0.5, vol: 0.2, decay: 0.2 }); // Steam

            // --- VARIANT 10: SHUTDOWN (Melodic fragment) ---
        } else if (variant === 10) {
            const notes = [880, 783, 659, 523];
            notes.forEach((f, i) => {
                setTimeout(() => this.playTone({ freq: f, type: 'sine', duration: 0.3, vol: 0.3, decay: 0.1 }), i * 150);
            });
            setTimeout(() => this.playTone({ freq: 100, type: 'square', duration: 0.5, vol: 0.4, slide: -80 }), 600);
        }
    }

    playDie() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 11);
        const t = this.ctx.currentTime;

        // --- VARIANT 0: SYSTEM FAILURE (Original) ---
        if (variant === 0) {
            // Whine
            this.playTone({ freq: 880, type: 'sine', duration: 0.8, vol: 0.4, slide: -800, attack: 0.01 });
            // Grit
            this.playTone({ freq: 400, type: 'square', duration: 0.8, vol: 0.3, slide: -350, attack: 0.05, pan: this.rnd(-0.5, 0.5) });
            // Stutter
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(100, 300), type: 'sawtooth', duration: 0.05, vol: 0.2 * (1 - i / 5), pan: this.rnd(-0.8, 0.8) }), i * 100);
            }
            // Final Thud
            setTimeout(() => {
                this.playTone({ freq: 50, type: 'square', duration: 0.4, vol: 0.5, slide: -30, attack: 0.01 });
                this.playNoise(0.3, 0.3);
            }, 600);

            // --- VARIANT 1: FLATLINE (Medical monitor) ---
        } else if (variant === 1) {
            // High beep
            this.playTone({ freq: 1000, type: 'sine', duration: 2.0, vol: 0.3, pan: 0 });
            // Heart stop thud
            this.playTone({ freq: 60, type: 'square', duration: 0.2, vol: 0.5, slide: -20, pan: 0 });

            // --- VARIANT 2: POWER DOWN (Machines stopping) ---
        } else if (variant === 2) {
            // Turbine winding down
            this.playTone({ freq: 400, type: 'sawtooth', duration: 1.5, vol: 0.4, slide: -380, attack: 0.1 });
            this.playTone({ freq: 405, type: 'sawtooth', duration: 1.5, vol: 0.4, slide: -385, attack: 0.1, pan: 0.5 });

            // --- VARIANT 3: BITCRUSH (Digital death) ---
        } else if (variant === 3) {
            // Fast random arpeggio down
            for (let i = 0; i < 8; i++) {
                setTimeout(() => this.playTone({ freq: 880 / (i + 1), type: 'square', duration: 0.1, vol: 0.3, pan: (i % 2 === 0 ? 0.5 : -0.5) }), i * 50);
            }
            this.playNoise(0.5, 0.4);

            // --- VARIANT 4: GHOST (Ethereal fade) ---
        } else if (variant === 4) {
            // Spooky chord
            this.playTone({ freq: 220, type: 'triangle', duration: 2.0, vol: 0.3, attack: 0.5, decay: 1.0 });
            this.playTone({ freq: 261, type: 'triangle', duration: 2.0, vol: 0.3, attack: 0.5, decay: 1.0 });
            this.playTone({ freq: 311, type: 'triangle', duration: 2.0, vol: 0.3, attack: 0.5, decay: 1.0 }); // Eb (Minor)
            // Wind noise
            this.playNoise(2.0, 0.1);

            // --- VARIANT 5: CRUNCH (Physical break) ---
        } else if (variant === 5) {
            // Snap
            this.playNoise(0.05, 0.8);
            // Debris
            this.playNoise(0.5, 0.2);
            // Low impact
            this.playTone({ freq: 40, type: 'sine', duration: 0.4, vol: 0.6, attack: 0.001 });

            // --- VARIANT 6: REWIND (Tape stop) ---
        } else if (variant === 6) {
            this.playTone({ freq: 1000, type: 'sawtooth', duration: 0.6, vol: 0.3, slide: -950 });
            this.playNoise(0.4, 0.2); // Tape friction

            // --- VARIANT 7: GLITCH OUT (Stutter) ---
        } else if (variant === 7) {
            const stutter = [440, 440, 220, 110, 55, 0];
            stutter.forEach((f, i) => {
                setTimeout(() => {
                    if (f > 0) this.playTone({ freq: f, type: 'square', duration: 0.05, vol: 0.3 });
                    else this.playNoise(0.1, 0.4);
                }, i * 60);
            });

            // --- VARIANT 8: ABYSS (Deep Reverb Fall) ---
        } else if (variant === 8) {
            this.playTone({ freq: 80, type: 'sine', duration: 2.5, vol: 0.5, slide: -60, attack: 0.1 });
            this.playNoise(1.5, 0.1);

            // --- VARIANT 9: SYSTEM CRASH (BSOD) ---
        } else if (variant === 9) {
            this.playTone({ freq: 150, type: 'square', duration: 1.0, vol: 0.5 }); // Static buz
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.playNoise(0.05, 0.3), Math.random() * 800);
            }

            // --- VARIANT 10: GAME OVER (Arcade) ---
        } else if (variant === 10) {
            [800, 700, 600, 500, 400, 300, 200].forEach((f, i) => {
                setTimeout(() => this.playTone({ freq: f, type: 'triangle', duration: 0.1, vol: 0.3 }), i * 100);
            });
        }
    }

    playStart() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 11);

        // --- VARIANT 0: CINEMATIC RISER ---
        if (variant === 0) {
            const swellDuration = 1.0;
            this.playNoise(swellDuration, 0.1);
            this.playTone({ freq: 100, type: 'sawtooth', duration: swellDuration, vol: 0.1, slide: 400, attack: 0.5 });
            // Drop
            setTimeout(() => {
                this.playTone({ freq: 261.63, type: 'square', duration: 0.8, vol: 0.2, pan: 0 }); // C
                this.playTone({ freq: 392.00, type: 'square', duration: 0.8, vol: 0.15, pan: -0.3 }); // G
                this.playTone({ freq: 523.25, type: 'square', duration: 0.8, vol: 0.15, pan: 0.3 }); // C
                this.playTone({ freq: 65.41, type: 'sine', duration: 1.0, vol: 0.3, pan: 0 }); // Bass
                this.playTone({ freq: 1046.50, type: 'triangle', duration: 0.4, vol: 0.1, pan: 0 }); // Sparkle
            }, swellDuration * 1000);

            // --- VARIANT 1: ORCHESTRAL (Brass Swell) ---
        } else if (variant === 1) {
            const d = 1.5;
            // Low brass
            this.playTone({ freq: 130, type: 'sawtooth', duration: d, vol: 0.3, attack: 0.5 });
            this.playTone({ freq: 196, type: 'sawtooth', duration: d, vol: 0.3, attack: 0.5 }); // G
            // Timpani roll
            this.playNoise(d, 0.2);
            // Hit
            setTimeout(() => {
                this.playTone({ freq: 65, type: 'sawtooth', duration: 1.0, vol: 0.5, attack: 0.05 }); // C2
                this.playTone({ freq: 261, type: 'sine', duration: 1.0, vol: 0.3, attack: 0.05 }); // C4
            }, d * 1000);

            // --- VARIANT 2: CYBERPUNK (Neon Sweep) ---
        } else if (variant === 2) {
            this.playTone({ freq: 50, type: 'sine', duration: 1.0, vol: 0.4, slide: 1000, attack: 0.1 });
            setTimeout(() => {
                // Laser chord
                this.playTone({ freq: 440, type: 'square', duration: 0.5, vol: 0.1, pan: -0.5 });
                this.playTone({ freq: 554, type: 'square', duration: 0.5, vol: 0.1, pan: 0.5 });
            }, 1000);

            // --- VARIANT 3: RETRO (Fast Arp) ---
        } else if (variant === 3) {
            const notes = [261, 329, 392, 523, 659, 783];
            notes.forEach((freq, i) => {
                setTimeout(() => this.playTone({ freq: freq, type: 'square', duration: 0.1, vol: 0.2 }), i * 100);
            });
            setTimeout(() => this.playTone({ freq: 1046, type: 'square', duration: 0.5, vol: 0.2 }), 600);

            // --- VARIANT 4: ETHEREAL (Choir) ---
        } else if (variant === 4) {
            const d = 2.0;
            this.playTone({ freq: 261, type: 'triangle', duration: d, vol: 0.2, attack: 1.0 });
            this.playTone({ freq: 329, type: 'triangle', duration: d, vol: 0.2, attack: 1.0, pan: -0.3 }); // E
            this.playTone({ freq: 392, type: 'triangle', duration: d, vol: 0.2, attack: 1.0, pan: 0.3 }); // G
            this.playTone({ freq: 523, type: 'sine', duration: d, vol: 0.2, attack: 1.0 }); // C

            // --- VARIANT 5: INDUSTRIAL (Metal hit) ---
        } else if (variant === 5) {
            // Clang
            this.playTone({ freq: 200, type: 'square', duration: 0.3, vol: 0.3, detune: 50 });
            this.playTone({ freq: 800, type: 'square', duration: 0.1, vol: 0.2, detune: -100 });
            this.playNoise(0.2, 0.4);
            // Steam hiss finish
            setTimeout(() => this.playNoise(1.0, 0.1), 300);

            // --- VARIANT 6: DROP (Techno Cymbal) ---
        } else if (variant === 6) {
            const d = 1.0;
            this.playNoise(d, 0.3); // Reverse cymbal approximation? fading in?
            this.playTone({ freq: 50, type: 'sine', duration: d, vol: 0.4, slide: 50 }); // Low hum build
            setTimeout(() => {
                this.playTone({ freq: 60, type: 'square', duration: 0.2, vol: 0.6 }); // Kick
                this.playTone({ freq: 150, type: 'sawtooth', duration: 0.6, vol: 0.2, slide: -100 }); // Bass pluck
            }, d * 1000);

            // --- VARIANT 7: IGNITION (Engine) ---
        } else if (variant === 7) {
            this.playTone({ freq: 40, type: 'sawtooth', duration: 1.5, vol: 0.4, slide: 200, attack: 0.1 });
            setTimeout(() => this.playTone({ freq: 80, type: 'sawtooth', duration: 0.5, vol: 0.3, slide: 100 }), 1200);

            // --- VARIANT 8: PORTAL (Warp) ---
        } else if (variant === 8) {
            this.playTone({ freq: 100, type: 'sine', duration: 2.0, vol: 0.3, slide: 1000, attack: 0.5 });
            this.playTone({ freq: 2000, type: 'triangle', duration: 2.0, vol: 0.1, slide: -1800, attack: 0.5 });

            // --- VARIANT 9: READY (Trance Pluck) ---
        } else if (variant === 9) {
            [0, 0.25, 0.5, 0.75].forEach((t, i) => {
                setTimeout(() => this.playTone({ freq: 440, type: 'sawtooth', duration: 0.15, vol: 0.3, pan: (i % 2 ? 0.3 : -0.3) }), t * 1000);
            });
            setTimeout(() => this.playTone({ freq: 880, type: 'sawtooth', duration: 0.5, vol: 0.4 }), 1000);

            // --- VARIANT 10: ZEN (Gong) ---
        } else if (variant === 10) {
            this.playTone({ freq: 180, type: 'sine', duration: 3.0, vol: 0.5, attack: 0.05, decay: 2.0, detune: 10 }); // Pseudo gong
            this.playNoise(1.0, 0.1);
        }
    }

    updateBoostHum(intensity) {
        if (!this.ctx) return;

        // Lazy Initialization
        if (!this.boostNodes) {
            this.initBoostEngine();
        }

        const now = this.ctx.currentTime;
        const style = this.currentBoostStyle || 0;

        // Update Oscillator Types if style changed
        if (this.lastBoostStyle !== style) {
            if (this.boostNodes.humOsc1) {
                // Default: Sawtooth
                let type = 'sawtooth';
                if (style === 1 || style === 5 || style === 7 || style === 10) type = 'sine'; // Warp, Sonic, Nebula, Quantum
                if (style === 4 || style === 6 || style === 9) type = 'square'; // Cyber, Plasma, Slipstream
                if (style === 8) type = 'sawtooth'; // Overdrive

                this.boostNodes.humOsc1.type = type;
                this.boostNodes.humOsc2.type = type;

                // LFO Type
                const sawLFO = [4, 6, 8];
                const squareLFO = [0, 2, 9];
                if (sawLFO.includes(style)) {
                    this.boostNodes.crackleLFO.type = 'sawtooth';
                } else if (squareLFO.includes(style)) {
                    this.boostNodes.crackleLFO.type = 'square';
                } else {
                    this.boostNodes.crackleLFO.type = 'sine';
                }
            }
            this.lastBoostStyle = style;
        }

        // Map intensity (0-1) to volume
        let baseVol = clamp(intensity, 0, 1) * 0.45;
        if (style === 5 || style === 7) baseVol *= 0.6; // Sonic/Nebula is cleaner/louder

        this.boostMasterGain.gain.setTargetAtTime(baseVol, now, 0.1);

        if (intensity > 0.01) {
            // --- DYNAMIC SYNTHESIS BY STYLE ---

            // 0: CLASSIC (Hum + Crackle)
            if (style === 0) {
                const strain = 50 + (intensity * 20);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.02, now, 0.1);

                const crackleFreq = 1500 + (intensity * 3500);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(crackleFreq, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(10 + (intensity * 30), now, 0.2);

                // 1: WARP DRIVE (Pure Sine Rise)
            } else if (style === 1) {
                const strain = 100 + (intensity * 400); // Higher pitch rise
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.01, now, 0.1); // Tight phasing

                // Lowpass the crackle to make it a subtle wind
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(400, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(2, now, 0.5); // Slow pulse

                // 2: THUNDER (Deep Rumble)
            } else if (style === 2) {
                const strain = 30 + (intensity * 10); // Very low
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain + 2, now, 0.1); // Beating

                // Heavy noise
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(200, now, 0.1); // Low rumble noise
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(50, now, 0.1); // Fast flutter

                // 3: JET ENGINE (Airy)
            } else if (style === 3) {
                // Suppress hum, boost noise
                this.boostNodes.humOsc1.frequency.setValueAtTime(0, now); // Ideally gain 0, but frequency 0 helps

                const airFreq = 500 + (intensity * 2000);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(airFreq, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(100, now, 0.1);

                // 4: CYBER DASH (Glitchy Square)
            } else if (style === 4) {
                // Stepped frequency effect?
                const step = Math.floor(intensity * 10) * 50;
                const strain = 100 + step;
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.05);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 0.5, now, 0.05); // Octave

                this.boostNodes.crackleFilter.frequency.setTargetAtTime(2000, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(15 + (intensity * 50), now, 0.1);

                // 5: SONIC (Clean)
            } else if (style === 5) {
                const strain = 60 + (intensity * 60);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain, now, 0.1); // No detune, pure

                // Silence the noise
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(0, now, 0.1);

                // 6: PLASMA (Electrical)
            } else if (style === 6) {
                const strain = 200 + (intensity * 600);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.05);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.1, now, 0.05); // heavy detune
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(1000 + intensity * 2000, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(60, now, 0.2); // Buzz

                // 7: NEBULA (Wash)
            } else if (style === 7) {
                const strain = 100 + (intensity * 100);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.5);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.5, now, 0.5); // 5th interval
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(600, now, 0.5);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(1, now, 1.0); // Slow breathing

                // 8: OVERDRIVE (Distortion)
            } else if (style === 8) {
                const strain = 80 + (intensity * 80);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.01, now, 0.1);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(100, now, 0.1); // Sub grit
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(120, now, 0.1); // Motorboat

                // 9: SLIPSTREAM (Wind)
            } else if (style === 9) {
                this.boostNodes.humOsc1.frequency.setValueAtTime(0, now);
                const windFreq = 800 + (intensity * 1200);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(windFreq, now, 0.2);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(intensity * 10, now, 0.2);

                // 10: QUANTUM (Particles)
            } else if (style === 10) {
                const strain = 400 + (Math.random() * 200);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.05);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 2, now, 0.05);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(2000, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(Math.random() * 50, now, 0.1);
            }
        }
    }

    initBoostEngine() {
        this.boostNodes = {};

        // Master Gain for Boost Channel
        this.boostMasterGain = this.ctx.createGain();
        this.boostMasterGain.gain.value = 0;
        this.boostMasterGain.connect(this.masterGain);

        // --- LAYER 1: THE POWER HUM (Sustain/Body) ---
        // Two detuned sawtooth waves create a "chorus" effect, feeling like heavy current.
        this.boostNodes.humOsc1 = this.ctx.createOscillator();
        this.boostNodes.humOsc1.type = 'sawtooth';
        this.boostNodes.humOsc1.frequency.value = 50;

        this.boostNodes.humOsc2 = this.ctx.createOscillator();
        this.boostNodes.humOsc2.type = 'sawtooth';
        this.boostNodes.humOsc2.frequency.value = 51; // 1Hz beat frequency

        const humFilter = this.ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.value = 350; // Cut off buzziness, keep the weight

        const humGain = this.ctx.createGain();
        humGain.gain.value = 0.6; // Base volume of hum layer

        this.boostNodes.humOsc1.connect(humFilter);
        this.boostNodes.humOsc2.connect(humFilter);
        humFilter.connect(humGain);
        humGain.connect(this.boostMasterGain);

        this.boostNodes.humOsc1.start();
        this.boostNodes.humOsc2.start();

        // --- LAYER 2: THE ARCING CRACKLE (Texture/Highs) ---
        // Filtered pink noise modulated by a square wave LFO creates the "zzzt-zzzt" effect.

        // 1. Create Pink Noise Buffer
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            // Pink noise approximation (Paul Kellett)
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; // Compensation to ~1.0
            b6 = white * 0.115926;
        }

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = buffer;
        noiseSrc.loop = true;

        // 2. Dynamic Bandpass Filter (The "Spark" tone)
        this.boostNodes.crackleFilter = this.ctx.createBiquadFilter();
        this.boostNodes.crackleFilter.type = 'bandpass';
        this.boostNodes.crackleFilter.Q.value = 4; // Resonant enough to sing slightly
        this.boostNodes.crackleFilter.frequency.value = 2000;

        // 3. LFO for amplitude chopping (The "Gap" in the arc)
        // Square wave turns volume on/off rapidly
        this.boostNodes.crackleLFO = this.ctx.createOscillator();
        this.boostNodes.crackleLFO.type = 'square';
        this.boostNodes.crackleLFO.frequency.value = 15; // 15Hz flicker default

        const lfoGain = this.ctx.createGain();
        // We use the LFO to modulate a Gain Node's gain parameter
        // But simpler: Connect LFO to a Gain Node that the noise passes through?
        // Actually, let's use the LFO to modulate the Filter Frequency for "Speaking" sparks

        // Revised Plan for Layer 2:
        // Noise -> Filter (Freq modulated by LFO) -> Gain -> Master

        const lfoModGain = this.ctx.createGain();
        lfoModGain.gain.value = 1500; // Sweep filter by +-1500Hz

        this.boostNodes.crackleLFO.connect(lfoModGain);
        lfoModGain.connect(this.boostNodes.crackleFilter.frequency);

        const crackleGain = this.ctx.createGain();
        crackleGain.gain.value = 0.3;

        noiseSrc.connect(this.boostNodes.crackleFilter);
        this.boostNodes.crackleFilter.connect(crackleGain);
        crackleGain.connect(this.boostMasterGain);

        noiseSrc.start();
        this.boostNodes.crackleLFO.start();
    }
}

const soundManager = new SoundManager();

// ---- Event Listeners ----
playButton.addEventListener('click', () => {
    soundManager.init();
    soundManager.resume();
    startGame(nicknameInput.value.trim());
});

replayButton.addEventListener('click', () => {
    soundManager.resume();
    startGame(player ? player.name : 'Player');
});

nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        soundManager.init();
        soundManager.resume();
        startGame(nicknameInput.value.trim());
    }
});

// Focus nickname input on load
window.addEventListener('load', () => {
    nicknameInput.focus();
});
