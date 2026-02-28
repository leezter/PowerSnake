/* ============================================
   PowerSnake â€” Complete Game Engine
   ============================================ */

// ---- Constants ----
const ARENA_SIZE = 4500;
const GRID_SIZE = 40;
const BASE_SPEED = 3.2;
const BOOST_SPEED = 11.6;
const MAX_SPEED_CAP = 12.0; // Overall speed boost cap
const MAX_PROXIMITY_BOOST = 5.5; // Specific conservative cap on proximity boost
const BOOST_PROXIMITY = 60;
const BOOST_RAMP_DURATION = 6.0; // seconds to reach full boost speed
const MAGNET_DISTANCE = 75;
const MAGNET_FORCE = 600; // pixels per second
const FOOD_COUNT = 300;
const BOT_COUNT = 25;
const SEGMENT_SPACING = 6;
const MIN_SNAKE_WIDTH = 4;
const MAX_SNAKE_WIDTH = 14;
const WIDTH_GROWTH_RATE = 2000; // score needed for max width
const CAMERA_LERP = 0.08;
const MINIMAP_SIZE = 180;
const REFERENCE_WIDTH = 1920;

// ---- Snake Styles (Visuals & Personality) ----
const SNAKE_STYLES = [
    {
        id: 'neon_cyber',
        name: 'CYBER',
        colors: { primary: '#00f0ff', secondary: '#ff00e5', glow: '#00f0ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20 + snake.boostIntensity * 20;
            ctx.shadowColor = snake.style.colors.glow;
            ctx.strokeStyle = snake.style.colors.primary;
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = lowQuality ? 0 : 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = snake.width * 0.3;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = snake.style.colors.glow;
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(size * 0.2, -size * 0.3, size * 0.5, size * 0.6);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'inferno',
        name: 'INFERNO',
        colors: { primary: '#ff3300', secondary: '#ffaa00', glow: '#ff3300' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#ff5500';
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) {
                    const s = snake.segments[i];
                    const jitter = (Math.sin(i * 0.5 + performance.now() / 100) * 3);
                    ctx.lineTo(s.x + jitter, s.y + jitter);
                }
            }
            ctx.stroke();
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = snake.width * 0.4;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = lowQuality ? 0 : 40;
            ctx.beginPath();
            ctx.moveTo(size * 1.2, 0);
            ctx.lineTo(-size * 0.8, size);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size * 0.8, -size);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#ffaa00', 'collect'));
        }
    },
    {
        id: 'void',
        name: 'VOID',
        colors: { primary: '#a855f7', secondary: '#1a0b2e', glow: '#a855f7' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#a855f7';
            ctx.strokeStyle = 'rgba(20, 0, 40, 0.9)';
            ctx.lineWidth = snake.width * 1.4;
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'glitch',
        name: 'GLITCH',
        colors: { primary: '#00ff00', secondary: '#ffffff', glow: '#00ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#00ff00';
            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                const offset = (Math.random() - 0.5) * 6;
                ctx.fillStyle = Math.random() > 0.95 ? '#fff' : '#00ff00';
                ctx.fillRect(s.x - snake.width / 2 + offset, s.y - snake.width / 2, snake.width, snake.width);
            };
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            const shiftX = (Math.random() - 0.5) * 6;
            ctx.fillRect(-size + shiftX, -size, size * 2, size * 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(size * 0.2, -size * 0.4, size * 0.4, size * 0.2);
            ctx.fillRect(size * 0.2, size * 0.2, size * 0.4, size * 0.2);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'plasma',
        name: 'PLASMA',
        colors: { primary: '#ff00e5', secondary: '#00f0ff', glow: '#ff00e5' },
        renderBody: (ctx, snake) => {
            const time = performance.now() / 150;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ff00e5';
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.strokeStyle = '#ff00e5';
            ctx.lineWidth = snake.width + Math.sin(time) * 4;
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = snake.width * 0.3;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff00e5';
            ctx.shadowBlur = lowQuality ? 0 : 35;
            ctx.shadowColor = '#ff00e5';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'midas',
        name: 'MIDAS',
        colors: { primary: '#ffd700', secondary: '#ffffff', glow: '#ffa500' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffa500';
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'square';
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = snake.width * 0.4;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffa500';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.beginPath();
            ctx.moveTo(size * 1.3, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.8, 0);
            ctx.lineTo(0, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'toxic',
        name: 'TOXIN',
        colors: { primary: '#ccff00', secondary: '#00ff00', glow: '#ccff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ccff00';
            ctx.strokeStyle = '#ccff00';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.setLineDash([snake.width * 1.5, snake.width * 0.5]);
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ccff00';
            ctx.shadowColor = '#ccff00';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,50,0,0.5)';
            ctx.beginPath();
            ctx.arc(size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.arc(-size * 0.2, size * 0.2, size * 0.15, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'prism',
        name: 'PRISM',
        colors: { primary: '#ffffff', secondary: '#00ffff', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ffffff';
            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                const hue = (i * 15 + performance.now() / 5) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
                ctx.beginPath();
                const w = snake.width;
                ctx.moveTo(s.x, s.y - w);
                ctx.lineTo(s.x + w, s.y);
                ctx.lineTo(s.x, s.y + w);
                ctx.lineTo(s.x - w, s.y);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size * 0.5, size * 0.8);
            ctx.lineTo(-size * 0.5, -size * 0.8);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'stealth',
        name: 'GHOST',
        colors: { primary: '#666666', secondary: '#333333', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = 'rgba(255,255,255,0.3)';
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = snake.width;
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.1)';
            for (let i = 0; i < snake.segments.length; i += 4) {
                const s = snake.segments[i];
                const r = snake.width * (1 + Math.sin(i + performance.now() / 200) * 0.5);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'circuit',
        name: 'CIRCUIT',
        colors: { primary: '#00ccff', secondary: '#000033', glow: '#00ccff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00ccff';
            ctx.strokeStyle = '#00ccff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();
            ctx.fillStyle = '#003366';
            ctx.shadowBlur = lowQuality ? 0 : 0;
            for (let i = 0; i < snake.segments.length; i += 3) {
                const s = snake.segments[i];
                ctx.fillRect(s.x - snake.width / 2, s.y - snake.width / 2, snake.width, snake.width);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#00ccff';
            ctx.shadowColor = '#00ccff';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.fillRect(-size, -size, size * 2, size * 2);
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    // New Styles (11-25)
    {
        id: 'radium',
        name: 'RADIUM',
        colors: { primary: '#ccff00', secondary: '#000000', glow: '#66ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#66ff00';
            ctx.strokeStyle = '#33ff00';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                if (i === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();
            // Radiate rings
            const time = performance.now() / 200;
            for (let i = 0; i < len; i += 5) {
                const s = snake.segments[i];
                const r = snake.width * (1 + Math.sin(time + i) * 0.5);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(200, 255, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ccff00';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#66ff00';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Radioactive symbol
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(i * (Math.PI * 2 / 3));
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, size * 0.8, -0.5, 0.5);
                ctx.fill();
                ctx.restore();
            }
        },
        update: (dt, snake) => { }
    },
    {
        id: 'cosmos',
        name: 'COSMOS',
        colors: { primary: '#001133', secondary: '#ffffff', glow: '#0044ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#0044ff';
            ctx.lineWidth = snake.width * 1.5;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000022';
            ctx.beginPath();
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                if (i === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();
            // Stars
            ctx.fillStyle = '#fff';
            const time = performance.now() / 1000;
            for (let i = 0; i < len; i += 2) {
                if ((i * 1337) % 5 === 0) { // Random-ish seed
                    const s = snake.segments[i];
                    const flicker = Math.sin(time * 10 + i);
                    const alpha = flicker > 0 ? 1 : 0.2;
                    ctx.globalAlpha = alpha;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000022';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#0044ff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Galaxy spiral
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const spirals = 3;
            for (let i = 0; i < spirals; i++) {
                const offset = (Math.PI * 2 / spirals) * i;
                for (let r = 0; r < size; r += 2) {
                    const a = r * 0.5 + offset - performance.now() / 500;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (r === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
            }
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'vampire',
        name: 'VAMPIRE',
        colors: { primary: '#880000', secondary: '#000000', glow: '#ff0000' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff0000';
            ctx.fillStyle = '#550000';
            const w = snake.width;
            // Bat wings / cape effect
            const len = snake.segments.length;
            for (let i = 0; i < len - 1; i++) {
                const s = snake.segments[i];
                const next = snake.segments[i + 1];
                const dx = next.x - s.x;
                const dy = next.y - s.y;
                const angle = Math.atan2(dy, dx);
                const perpX = Math.cos(angle + Math.PI / 2);
                const perpY = Math.sin(angle + Math.PI / 2);

                const spread = w * (1 + Math.abs(Math.sin(i * 0.5)) / 2);
                ctx.beginPath();
                ctx.moveTo(s.x + perpX * spread, s.y + perpY * spread);
                ctx.lineTo(s.x - perpX * spread, s.y - perpY * spread);
                ctx.lineTo(next.x - perpX * spread, next.y - perpY * spread);
                ctx.lineTo(next.x + perpX * spread, next.y + perpY * spread);
                ctx.fill();
            }
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 1;
            ctx.stroke(); // Red outline
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, -size);
            ctx.fill();
            // Red eyes
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(size * 0.2, -size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.arc(size * 0.2, size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            // Drops of blood / dark embers
            if (Math.random() < 0.15) particles.push(new Particle(snake.x, snake.y, '#880000', 'ember'));
        }
    },
    {
        id: 'pixel',
        name: 'PIXEL',
        colors: { primary: '#00ff00', secondary: '#000000', glow: '#00ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 0; // No blur for crisp pixels
            ctx.fillStyle = '#00ff00';
            const w = snake.width;
            const blockSize = w * 1.2;
            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                ctx.fillRect(Math.floor(s.x - blockSize / 2), Math.floor(s.y - blockSize / 2), blockSize, blockSize);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.shadowBlur = lowQuality ? 0 : 0;
            ctx.fillStyle = '#00ff00';
            const s = size * 1.5;
            ctx.fillRect(-s / 2, -s / 2, s, s);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, -s * 0.2, s * 0.2, s * 0.2); // Eye
        },
        update: (dt, snake) => {
            // Glitchy pixels
            if (Math.random() < 0.15) particles.push(new Particle(snake.x, snake.y, '#00ff00', 'pixel'));
        }
    },
    {
        id: 'candy',
        name: 'CANDY',
        colors: { primary: '#ff66aa', secondary: '#00ccff', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';
            ctx.lineCap = 'round';
            ctx.lineWidth = snake.width;

            // Striped pattern
            for (let i = 0; i < snake.segments.length - 1; i++) {
                const s = snake.segments[i];
                const next = snake.segments[i + 1];
                ctx.strokeStyle = (i % 4 < 2) ? '#ff66aa' : '#00ccff';
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff66aa';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Swirl
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'magma',
        name: 'MAGMA',
        colors: { primary: '#ff4400', secondary: '#331100', glow: '#ff2200' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff2200';
            ctx.lineWidth = snake.width * 1.2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#441100'; // Dark crust
            ctx.beginPath();
            if (snake.segments.length > 0) {
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();

            // Lava Cracks
            ctx.strokeStyle = '#ff5500';
            ctx.lineWidth = snake.width * 0.4;
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#441100';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ff4400';
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size * 0.5, size);
            ctx.lineTo(-size * 0.5, -size);
            ctx.fill();
            // Glowing core
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(size * 0.5, 0);
            ctx.lineTo(-size * 0.2, size * 0.4);
            ctx.lineTo(-size * 0.2, -size * 0.4);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#ff4400', 'ember'));
        }
    },
    {
        id: 'frost',
        name: 'FROST',
        colors: { primary: '#00ffff', secondary: '#ffffff', glow: '#0088ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = 'rgba(200, 255, 255, 0.4)';

            // Spiky shards
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const w = snake.width;
                ctx.beginPath();
                ctx.moveTo(s.x + w, s.y);
                ctx.lineTo(s.x, s.y + w);
                ctx.lineTo(s.x - w, s.y);
                ctx.lineTo(s.x, s.y - w);
                ctx.fill();
            }
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(0, size * 0.8);
            ctx.lineTo(0, -size * 0.8);
            ctx.fill();
        },
        update: (dt, snake) => {
            // Ice sparkles
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#ffffff', 'sparkle'));
        }
    },
    {
        id: 'voltaic',
        name: 'VOLTAIC',
        colors: { primary: '#ffff00', secondary: '#ffffff', glow: '#ffffaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffff00';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'bevel';
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) {
                const s = snake.segments[i];
                const offset = (Math.random() - 0.5) * snake.width * 2;
                ctx.lineTo(s.x + offset, s.y + offset);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, size * 0.5);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, -size * 0.5);
            ctx.fill();
        },
        update: (dt, snake) => {
            // Electric sparks
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#ffff00', 'sparkle'));
        }
    },
    {
        id: 'azure',
        name: 'AZURE',
        colors: { primary: '#0066ff', secondary: '#00aaff', glow: '#0022ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00aaff';
            ctx.fillStyle = '#0066ff';
            // Flowing river
            const time = performance.now() / 200;
            const len = snake.segments.length;
            for (let i = 0; i < len - 1; i++) {
                const s = snake.segments[i];
                const w = snake.width * (0.8 + Math.sin(i * 0.3 - time) * 0.4);
                ctx.beginPath();
                ctx.arc(s.x, s.y, w, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#00aaff';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#0066ff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'verdant',
        name: 'VERDANT',
        colors: { primary: '#22aa22', secondary: '#55ff55', glow: '#00ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#22aa22';
            ctx.strokeStyle = '#006600';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                if (i === 0) ctx.moveTo(snake.segments[i].x, snake.segments[i].y);
                else ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();

            // Leaves
            ctx.fillStyle = '#55ff55';
            for (let i = 0; i < len; i += 4) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width * 0.8, 0, Math.PI * 2); // Simplified leaf
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#22aa22';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#22aa22';
            ctx.beginPath();
            ctx.moveTo(size * 1.2, 0);
            ctx.arc(0, 0, size, 0.5, -0.5, true);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'chrome',
        name: 'CHROME',
        colors: { primary: '#cccccc', secondary: '#ffffff', glow: '#888888' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ffffff';

            // Gradient metallic look
            const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); // Fixed gradient relative to screen for shine
            grad.addColorStop(0, '#555');
            grad.addColorStop(0.5, '#fff');
            grad.addColorStop(1, '#555');

            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = snake.width + 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let i = 0; i < snake.segments.length; i++) {
                if (i === 0) ctx.moveTo(snake.segments[i].x, snake.segments[i].y);
                else ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            }
            ctx.stroke();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = snake.width * 0.4;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#e0e0e0';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'sketch',
        name: 'SKETCH',
        colors: { primary: '#ffffff', secondary: '#000000', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.shadowColor = '#fff';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;

            // Scribble
            ctx.beginPath();
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const jx = (Math.random() - 0.5) * 4;
                const jy = (Math.random() - 0.5) * 4;
                if (i === 0) ctx.moveTo(s.x + jx, s.y + jy);
                else ctx.lineTo(s.x + jx, s.y + jy);
            }
            ctx.stroke();
            // Second pass
            ctx.beginPath();
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const jx = (Math.random() - 0.5) * 4;
                const jy = (Math.random() - 0.5) * 4;
                if (i === 0) ctx.moveTo(s.x + jx, s.y + jy);
                else ctx.lineTo(s.x + jx, s.y + jy);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();
            // X eyes
            ctx.beginPath();
            ctx.moveTo(size * 0.2, -size * 0.5); ctx.lineTo(size * 0.6, -size * 0.1);
            ctx.moveTo(size * 0.6, -size * 0.5); ctx.lineTo(size * 0.2, -size * 0.1);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'spectrum',
        name: 'SPECTRUM',
        colors: { primary: '#ff0000', secondary: '#00ff00', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            const time = performance.now() / 10;
            const len = snake.segments.length;

            for (let i = 0; i < len; i += 3) {
                const hue = (time + i * 5) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            const hue = (performance.now() / 10) % 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'matrix',
        name: 'MATRIX',
        colors: { primary: '#00ff33', secondary: '#003300', glow: '#00ff33' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#00ff33';
            ctx.fillStyle = '#00ff33';
            ctx.font = `${Math.floor(snake.width * 1.5)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const chars = "01";
            for (let i = 0; i < snake.segments.length; i += 3) {
                const s = snake.segments[i];
                const char = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(char, s.x, s.y);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.strokeStyle = '#00ff33';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.lineWidth = 2;
            ctx.strokeRect(-size * 0.8, -size * 0.8, size * 1.6, size * 1.6);
            ctx.fillStyle = '#00ff33';
            ctx.fillRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'samurai',
        name: 'SAMURAI',
        colors: { primary: '#aa0000', secondary: '#ddaa00', glow: '#aa0000' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#aa0000';

            // Armor plates
            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                // Calculate angle
                let angle = 0;
                if (i + 1 < len) {
                    angle = Math.atan2(snake.segments[i].y - snake.segments[i + 1].y, snake.segments[i].x - snake.segments[i + 1].x);
                }

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);

                ctx.fillStyle = '#aa0000';
                ctx.fillRect(-snake.width, -snake.width, snake.width * 2, snake.width * 2);
                ctx.strokeStyle = '#ddaa00'; // Gold trim
                ctx.lineWidth = 2;
                ctx.strokeRect(-snake.width, -snake.width, snake.width * 2, snake.width * 2);

                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#aa0000';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Gold crest
            ctx.fillStyle = '#ddaa00';
            ctx.beginPath();
            ctx.moveTo(size * 0.8, -size * 0.8);
            ctx.lineTo(0, -size * 0.2);
            ctx.lineTo(-size * 0.8, -size * 0.8);
            ctx.lineTo(0, size * 0.5);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    // ---- New Styles (20 More) ----
    {
        id: 'vaporwave',
        name: 'VAPOR',
        colors: { primary: '#ff71ce', secondary: '#01cdfe', glow: '#ff71ce' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ff71ce';
            ctx.strokeStyle = '#ff71ce';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'butt';
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
            // Grid lines
            ctx.strokeStyle = '#01cdfe';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < len; i += 3) {
                const s = snake.segments[i];
                const w = snake.width;
                ctx.moveTo(s.x - w, s.y - w);
                ctx.lineTo(s.x + w, s.y + w);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff71ce';
            ctx.shadowColor = '#01cdfe';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Sun gradient
            const g = ctx.createLinearGradient(0, -size, 0, size);
            g.addColorStop(0, '#ff71ce');
            g.addColorStop(1, '#01cdfe');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'gummy',
        name: 'GUMMY',
        colors: { primary: '#ff4444', secondary: '#ff8888', glow: '#ffaaaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = 'rgba(255, 100, 100, 0.5)';
            ctx.fillStyle = 'rgba(255, 50, 50, 0.6)';

            for (let i = 0; i < snake.segments.length; i++) {
                // Jelly wobble
                const s = snake.segments[i];
                const w = snake.width * (1 + Math.sin(i * 0.5 + performance.now() / 150) * 0.1);
                ctx.beginPath();
                ctx.arc(s.x, s.y, w, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = 'rgba(255, 30, 30, 0.8)';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ffaaaa';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'honeycomb',
        name: 'HIVE',
        colors: { primary: '#ffcc00', secondary: '#aa7700', glow: '#ffdd00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ffcc00';
            ctx.strokeStyle = '#aa7700';
            ctx.fillStyle = '#ffcc00';
            ctx.lineWidth = 1;

            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                const w = snake.width * 1.2;
                ctx.beginPath();
                // Hexagon
                for (let k = 0; k < 6; k++) {
                    const a = k * Math.PI / 3;
                    const px = s.x + Math.cos(a) * w;
                    const py = s.y + Math.sin(a) * w;
                    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffaa00';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffcc00';
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
                const a = k * Math.PI / 3;
                const px = Math.cos(a) * size * 1.2;
                const py = Math.sin(a) * size * 1.2;
                if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.fill();
            // Bee stripes
            ctx.fillStyle = '#000';
            ctx.fillRect(-size * 0.5, -size * 0.8, size, size * 0.4);
            ctx.fillRect(-size * 0.5, 0, size, size * 0.4);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'obsidian',
        name: 'OBSIDIAN',
        colors: { primary: '#111111', secondary: '#440044', glow: '#660066' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#660066';
            ctx.fillStyle = '#050505';

            for (let i = 0; i < snake.segments.length; i++) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();
            }

            // Glossy streak
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(100, 0, 100, 0.8)';
            ctx.beginPath();
            if (snake.segments.length > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y - snake.width * 0.5);
            for (let i = 1; i < snake.segments.length; i++) {
                ctx.lineTo(snake.segments[i].x, snake.segments[i].y - snake.width * 0.5);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#aa00aa';
            ctx.beginPath();
            ctx.moveTo(size * 1.3, 0);
            ctx.lineTo(-size * 0.5, size);
            ctx.lineTo(-size * 0.5, -size);
            ctx.fill();
            ctx.fillStyle = '#330033'; // Facet
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size * 0.5, size);
            ctx.lineTo(-size * 0.5, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'carbon',
        name: 'CARBON',
        colors: { primary: '#333333', secondary: '#111111', glow: '#555555' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#555';
            ctx.strokeStyle = '#222';
            ctx.lineWidth = snake.width * 2;
            ctx.lineCap = 'square';
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Weave pattern
            ctx.fillStyle = '#444';
            const w = snake.width;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                if (i % 4 === 0) ctx.fillRect(s.x - w, s.y - w, w, w);
                else ctx.fillRect(s.x, s.y, w, w);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#222';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#777';
            ctx.fillRect(-size, -size, size * 2, size * 2);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(-size, -size, size * 2, size * 2);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'runic',
        name: 'RUNE',
        colors: { primary: '#444444', secondary: '#00ffcc', glow: '#00ffcc' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00ffcc';
            ctx.fillStyle = '#333';

            for (let i = 0; i < snake.segments.length; i += 3) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width * 1.1, 0, Math.PI * 2);
                ctx.fill();

                // Rune
                ctx.strokeStyle = '#00ffcc';
                ctx.lineWidth = 2;
                ctx.beginPath();
                const type = i % 3;
                if (type === 0) {
                    ctx.moveTo(s.x - 5, s.y - 5); ctx.lineTo(s.x + 5, s.y + 5);
                    ctx.moveTo(s.x + 5, s.y - 5); ctx.lineTo(s.x - 5, s.y + 5);
                } else if (type === 1) {
                    ctx.moveTo(s.x, s.y - 6); ctx.lineTo(s.x, s.y + 6);
                    ctx.moveTo(s.x - 4, s.y); ctx.lineTo(s.x + 4, s.y);
                } else {
                    ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
                }
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#222';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#00ffcc';
            ctx.beginPath();
            ctx.moveTo(size * 1.2, 0);
            ctx.lineTo(-size * 0.6, size);
            ctx.lineTo(-size * 0.6, -size);
            ctx.fill();
            // Glowing sigil
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.moveTo(0, -size * 0.5); ctx.lineTo(0, size * 0.5);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'laser',
        name: 'LASER',
        colors: { primary: '#ff0055', secondary: '#ffffff', glow: '#ff0055' },
        renderBody: (ctx, snake) => {
            // Core
            ctx.lineCap = 'round';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#ff0055';
            ctx.strokeStyle = '#ff0055';
            ctx.lineWidth = snake.width * 2; // Wide glow
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // White hot center
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width * 0.5;
            ctx.shadowBlur = lowQuality ? 0 : 10; // Less blur for core
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 40;
            ctx.shadowColor = '#ff0055';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'oil',
        name: 'OIL',
        colors: { primary: '#000000', secondary: '#555555', glow: '#880088' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = 'rgba(100, 100, 100, 0.5)';
            const len = snake.segments.length;
            const time = performance.now() / 500;

            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();

                // Iridescent sheen
                const hue = (s.x * 0.1 + s.y * 0.1 + time * 100) % 360;
                ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.4)`;
                ctx.beginPath();
                ctx.arc(s.x - 2, s.y - 2, snake.width * 0.7, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            const hue = (performance.now() / 5) % 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.lineWidth = 2;
            ctx.stroke();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.05) particles.push(new Particle(snake.x, snake.y, '#333', 'boost'));
        }
    },
    {
        id: 'bone',
        name: 'BONE',
        colors: { primary: '#eeeeee', secondary: '#aaaaaa', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ffffff';
            ctx.fillStyle = '#f0f0f0';

            for (let i = 0; i < snake.segments.length; i += 3) {
                const s = snake.segments[i];
                ctx.beginPath();
                // Verma shape
                ctx.ellipse(s.x, s.y, snake.width * 1.2, snake.width * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Spine connection
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = snake.width * 0.3;
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#f5f5f5';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#fff';
            // Skull shape (simplified)
            ctx.beginPath();
            ctx.arc(0, -size * 0.2, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-size * 0.4, -size * 0.2, size * 0.25, 0, Math.PI * 2);
            ctx.arc(size * 0.4, -size * 0.2, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'hazard',
        name: 'HAZARD',
        colors: { primary: '#ffdd00', secondary: '#000000', glow: '#ffdd00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ffdd00';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'square';

            const len = snake.segments.length;
            for (let i = 0; i < len - 1; i++) {
                const s = snake.segments[i];
                const next = snake.segments[i + 1];
                ctx.strokeStyle = (i % 4 < 2) ? '#ffdd00' : '#000000';
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(next.x, next.y);
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffdd00';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffdd00';
            ctx.beginPath();
            ctx.moveTo(size * 1.2, 0);
            ctx.lineTo(-size * 0.8, size);
            ctx.lineTo(-size * 0.8, -size);
            ctx.fill();
            ctx.fillStyle = '#000'; // Warning symbol !
            ctx.font = `bold ${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('!', -size * 0.2, 0);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'zen',
        name: 'ZEN',
        colors: { primary: '#000000', secondary: '#ffffff', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.shadowColor = '#fff';
            ctx.fillStyle = '#000';

            // Ink blobs
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                // Variations in size for brush stroke effect
                const r = snake.width * (0.8 + Math.sin(i * 0.8) * 0.3);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff'; // Yin yang dot
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'disco',
        name: 'DISCO',
        colors: { primary: '#ffffff', secondary: '#888888', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';

            const len = snake.segments.length;
            const time = performance.now() / 100;

            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                // Flashing colors
                const hue = (time * 50 + i * 20) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ddd'; // Mirror ball
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Sparkles
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(rand(-size, size), rand(-size, size), 5, 5);
            }
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) {
                const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
                particles.push(new Particle(snake.x, snake.y, color, 'sparkle'));
            }
        }
    },
    {
        id: 'amethyst',
        name: 'AMETHYST',
        colors: { primary: '#9966cc', secondary: '#ccccff', glow: '#aa00ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#aa00ff';
            ctx.fillStyle = 'rgba(153, 102, 204, 0.8)';

            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(i); // Random rotation
                ctx.beginPath();
                const w = snake.width;
                ctx.moveTo(0, -w);
                ctx.lineTo(w, 0);
                ctx.lineTo(0, w);
                ctx.lineTo(-w, 0);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.stroke();
                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#9966cc';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#aa00ff';
            ctx.beginPath();
            ctx.moveTo(0, -size * 1.2);
            ctx.lineTo(size, 0);
            ctx.lineTo(0, size * 1.2);
            ctx.lineTo(-size, 0);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'bamboo',
        name: 'BAMBOO',
        colors: { primary: '#55aa55', secondary: '#338833', glow: '#55aa55' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#55aa55';
            ctx.lineWidth = snake.width * 1.5;
            ctx.strokeStyle = '#55aa55';
            ctx.lineCap = 'butt';

            const len = snake.segments.length;
            if (len > 0) {
                ctx.beginPath();
                ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
                ctx.stroke();
            }

            // Nodes
            ctx.fillStyle = '#225522';
            for (let i = 0; i < len; i += 5) {
                const s = snake.segments[i];
                ctx.fillRect(s.x - snake.width, s.y - 2, snake.width * 2, 4);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#66cc66';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#55aa55';
            ctx.beginPath();
            ctx.moveTo(size, 0);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'cheese',
        name: 'CHEESE',
        colors: { primary: '#ffcc00', secondary: '#ffaa00', glow: '#ffcc00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ffcc00';
            ctx.lineWidth = snake.width * 1.5;
            ctx.strokeStyle = '#ffcc00';
            ctx.lineCap = 'round';
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Holes
            ctx.fillStyle = 'rgba(100, 50, 0, 0.3)';
            for (let i = 0; i < len; i += 3) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffcc00';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'tjedye',
        name: 'TIEDYE',
        colors: { primary: '#ff00ff', secondary: '#00ffff', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';

            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                // Spiral color pattern
                const dist = i * 0.5;
                const hue = (dist * 20) % 360;
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Peace sign attempt or just swirl
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
            ctx.moveTo(0, -size * 0.6); ctx.lineTo(0, size * 0.6);
            ctx.moveTo(0, 0); ctx.lineTo(-size * 0.4, size * 0.4);
            ctx.moveTo(0, 0); ctx.lineTo(size * 0.4, size * 0.4);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'concrete',
        name: 'STONE',
        colors: { primary: '#888888', secondary: '#555555', glow: '#aaaaaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.shadowColor = '#aaa';
            ctx.lineWidth = snake.width * 1.2;
            ctx.strokeStyle = '#777';
            ctx.lineCap = 'butt';

            // Rough line
            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) {
                const s = snake.segments[i];
                // Jitter
                ctx.lineTo(s.x + (Math.random() - 0.5) * 2, s.y + (Math.random() - 0.5) * 2);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#888';
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#aaa';
            ctx.fillRect(-size, -size, size * 2, size * 2);
        },
        update: (dt, snake) => { }
    },
    {
        id: 'paper',
        name: 'PAPER',
        colors: { primary: '#ffffff', secondary: '#e0e0e0', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.shadowColor = '#000'; // Shadow for paper lift effect
            ctx.shadowOffsetY = 5;

            ctx.fillStyle = '#fff';
            const len = snake.segments.length;
            const w = snake.width;

            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                // Triangle
                ctx.beginPath();
                ctx.moveTo(s.x + w, s.y);
                ctx.lineTo(s.x - w, s.y + w);
                ctx.lineTo(s.x - w, s.y - w);
                ctx.fill();
            }
            ctx.shadowOffsetY = 0;
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#000';
            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(-size, size);
            ctx.lineTo(0, 0); // Origami fold
            ctx.lineTo(-size, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'jelly',
        name: 'JELLY',
        colors: { primary: '#00ffff', secondary: '#ffffff', glow: '#00ffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';

            // Tentacles trailing
            const time = performance.now() / 200;
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const wave = Math.sin(i * 0.5 - time) * 5;
                ctx.beginPath();
                ctx.arc(s.x, s.y + wave, snake.width * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, 0, Math.PI, true); // Semi circle top
            ctx.lineTo(-size, size);
            ctx.lineTo(size, size);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, 'rgba(0,255,255,0.5)', 'boost'));
        }
    },
    {
        id: 'retro',
        name: 'RETRO',
        colors: { primary: '#ffff00', secondary: '#000000', glow: '#ffff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 0;
            ctx.fillStyle = '#ffff00';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                ctx.fillRect(s.x - snake.width / 2, s.y - snake.width / 2, snake.width, snake.width);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = lowQuality ? 0 : 0;
            ctx.beginPath();
            // Pac shape
            const mouth = Math.abs(Math.sin(performance.now() / 100)) * 0.5;
            ctx.arc(0, 0, size * 1.2, mouth, Math.PI * 2 - mouth);
            ctx.lineTo(0, 0);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    // ---- 31 New Styles ----
    // COMMON (10)
    {
        id: 'wireframe',
        name: 'WIREFRAME',
        colors: { primary: '#00ff00', secondary: '#003300', glow: '#00ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00ff00';
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                if (i === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            }
            ctx.stroke();

            // Geometric mesh
            ctx.beginPath();
            const w = snake.width * 1.5;
            for (let i = 0; i < len; i += 3) {
                const s = snake.segments[i];
                ctx.moveTo(s.x - w, s.y);
                ctx.lineTo(s.x + w, s.y);
                ctx.moveTo(s.x, s.y - w);
                ctx.lineTo(s.x, s.y + w);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#00ff00';
            ctx.strokeRect(-size, -size, size * 2, size * 2);
            ctx.beginPath();
            ctx.moveTo(-size, -size); ctx.lineTo(size, size);
            ctx.moveTo(size, -size); ctx.lineTo(-size, size);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'bubble',
        name: 'BUBBLE',
        colors: { primary: '#00ffff', secondary: '#ffffff', glow: '#00aaff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#00ffff';
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1;

            const time = performance.now() / 200;
            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                const r = snake.width * (0.8 + Math.sin(time + i) * 0.3);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00ffff';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Highlight
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-size * 0.4, -size * 0.4, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'dust',
        name: 'DUST',
        colors: { primary: '#ddaa88', secondary: '#aa7755', glow: '#664433' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#aa7755';
            ctx.fillStyle = '#ddaa88';

            for (let i = 0; i < snake.segments.length; i++) {
                const s = snake.segments[i];
                ctx.globalAlpha = 1.0 - (i / snake.segments.length);
                const r = snake.width * (Math.random() * 0.5 + 0.5);
                const offsetX = (Math.random() - 0.5) * snake.width * 1.5;
                const offsetY = (Math.random() - 0.5) * snake.width * 1.5;
                ctx.beginPath();
                ctx.arc(s.x + offsetX, s.y + offsetY, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#aa7755';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ddaa88';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Swirling winds
            ctx.strokeStyle = '#eebb99';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, Math.PI);
            ctx.stroke();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.3) particles.push(new Particle(snake.x, snake.y, '#ddaa88', 'ember'));
        }
    },
    {
        id: 'slime',
        name: 'SLIME',
        colors: { primary: '#55ff00', secondary: '#22aa00', glow: '#55ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#55ff00';
            ctx.fillStyle = '#22aa00';

            const time = performance.now() / 150;
            for (let i = 0; i < snake.segments.length; i++) {
                const s = snake.segments[i];
                const r = snake.width * (0.9 + Math.sin(time - i * 0.5) * 0.2);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Drips
                if (i % 5 === 0 && Math.sin(time + i) > 0.5) {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y + snake.width, r * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.strokeStyle = '#55ff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (snake.segments.length > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#55ff00';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#22aa00';
            // Blob shape
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
            ctx.fill();
            // Inner dark spot
            ctx.fillStyle = '#115500';
            ctx.beginPath();
            ctx.arc(size * 0.2, -size * 0.2, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#55ff00', 'sparkle'));
        }
    },
    {
        id: 'ribbon',
        name: 'RIBBON',
        colors: { primary: '#ff55aa', secondary: '#aa00ff', glow: '#ffaaaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ff55aa';
            const time = performance.now() / 200;
            const w = snake.width * 1.2;
            const len = snake.segments.length;

            for (let i = 0; i < len - 1; i++) {
                const s1 = snake.segments[i];
                const s2 = snake.segments[i + 1];
                const wave1 = Math.sin(time + i * 0.2) * w;
                const wave2 = Math.sin(time + (i + 1) * 0.2) * w;

                ctx.fillStyle = i % 8 < 4 ? '#ff55aa' : '#aa00ff';
                ctx.beginPath();
                ctx.moveTo(s1.x + wave1, s1.y - wave1);
                ctx.lineTo(s2.x + wave2, s2.y - wave2);
                ctx.lineTo(s2.x - wave2, s2.y + wave2);
                ctx.lineTo(s1.x - wave1, s1.y + wave1);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff55aa';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#aa00ff';
            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, -size);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'echo',
        name: 'ECHO',
        colors: { primary: '#ffffff', secondary: '#aaaaaa', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#fff';
            ctx.lineCap = 'round';
            ctx.lineWidth = snake.width;

            for (let i = 0; i < snake.segments.length; i += 4) {
                const s = snake.segments[i];
                ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 - (i / snake.segments.length)})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#fff';
            // Concentric circles
            for (let i = 3; i > 0; i--) {
                ctx.fillStyle = `rgba(255,255,255, ${0.3 * i})`;
                ctx.beginPath();
                ctx.arc(0, 0, size * (i / 3), 0, Math.PI * 2);
                ctx.fill();
            }
        },
        update: (dt, snake) => { }
    },
    {
        id: 'neon_tube',
        name: 'NEON TUBE',
        colors: { primary: '#ff00ff', secondary: '#ffffff', glow: '#ff00ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff00ff';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer glass
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = snake.width * 1.5;
            ctx.beginPath();
            if (snake.segments.length > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < snake.segments.length; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Inner filament
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width * 0.4;
            ctx.stroke();

            // Core color
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = snake.width * 0.8;
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff00ff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'chalk',
        name: 'CHALK',
        colors: { primary: '#ffccaa', secondary: '#ffffff', glow: '#ffccaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.shadowColor = '#fff';
            ctx.strokeStyle = '#ffccaa';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';

            ctx.beginPath();
            for (let i = 0; i < snake.segments.length; i++) {
                const s = snake.segments[i];
                const jitterX = (Math.random() - 0.5) * 3;
                const jitterY = (Math.random() - 0.5) * 3;
                if (i === 0) ctx.moveTo(s.x + jitterX, s.y + jitterY);
                else ctx.lineTo(s.x + jitterX, s.y + jitterY);
            }
            ctx.stroke();

            // Multiple rough strokes
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = snake.width * 0.6;
            ctx.beginPath();
            for (let i = 0; i < snake.segments.length; i += 2) {
                const s = snake.segments[i];
                const jitterX = (Math.random() - 0.5) * 5;
                const jitterY = (Math.random() - 0.5) * 5;
                if (i === 0) ctx.moveTo(s.x + jitterX, s.y + jitterY);
                else ctx.lineTo(s.x + jitterX, s.y + jitterY);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffccaa';
            ctx.shadowBlur = lowQuality ? 0 : 5;
            ctx.beginPath();
            // Jittery circle
            for (let a = 0; a < Math.PI * 2; a += 0.5) {
                const r = size + (Math.random() - 0.5) * 3;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            // X mark
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-size * 0.3, -size * 0.3); ctx.lineTo(size * 0.3, size * 0.3);
            ctx.moveTo(size * 0.3, -size * 0.3); ctx.lineTo(-size * 0.3, size * 0.3);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'magnetic',
        name: 'MAGNETIC',
        colors: { primary: '#555555', secondary: '#00aaff', glow: '#00aaff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#00aaff';

            for (let i = 0; i < snake.segments.length; i += 3) {
                const s = snake.segments[i];
                // Nodes
                ctx.fillStyle = '#333';
                ctx.fillRect(s.x - snake.width * 0.8, s.y - snake.width * 0.8, snake.width * 1.6, snake.width * 1.6);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.strokeRect(s.x - snake.width * 0.8, s.y - snake.width * 0.8, snake.width * 1.6, snake.width * 1.6);

                // Arcs
                if (i > 0 && Math.random() < 0.5) {
                    const prev = snake.segments[i - 3];
                    ctx.strokeStyle = '#00aaff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.lineTo(prev.x + (Math.random() - 0.5) * 10, prev.y + (Math.random() - 0.5) * 10);
                    ctx.stroke();
                }
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#333';
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#00aaff';
            // U-shape magnet
            ctx.beginPath();
            ctx.arc(0, 0, size, Math.PI, 0);
            ctx.lineTo(size, size);
            ctx.lineTo(size * 0.5, size);
            ctx.lineTo(size * 0.5, 0);
            ctx.arc(0, 0, size * 0.5, 0, Math.PI, true);
            ctx.lineTo(-size * 0.5, size);
            ctx.lineTo(-size, size);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Red / Blue poles
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(size * 0.5, size * 0.5, size * 0.5, size * 0.5);
            ctx.fillStyle = '#00aaff';
            ctx.fillRect(-size, size * 0.5, size * 0.5, size * 0.5);
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#00aaff', 'sparkle'));
        }
    },
    {
        id: 'spore',
        name: 'SPORE',
        colors: { primary: '#884488', secondary: '#cc88ff', glow: '#cc88ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#cc88ff';
            ctx.fillStyle = '#662266';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width, 0, Math.PI * 2);
                ctx.fill();
                // Spore bumps
                ctx.fillStyle = i % 4 === 0 ? '#cc88ff' : '#aa55cc';
                const a = i * 2;
                ctx.beginPath();
                ctx.arc(s.x + Math.cos(a) * snake.width, s.y + Math.sin(a) * snake.width, snake.width * 0.3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#662266';
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#884488';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#cc88ff';
            ctx.beginPath();
            // Mushroom cap
            ctx.arc(0, 0, size * 1.5, Math.PI, 0);
            ctx.lineTo(size, size * 0.5);
            ctx.lineTo(-size, size * 0.5);
            ctx.closePath();
            ctx.fill();
            // Dots
            ctx.fillStyle = '#cc88ff';
            ctx.beginPath();
            ctx.arc(0, -size * 0.8, size * 0.3, 0, Math.PI * 2);
            ctx.arc(-size * 0.8, -size * 0.2, size * 0.2, 0, Math.PI * 2);
            ctx.arc(size * 0.8, -size * 0.2, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#cc88ff', 'collect'));
        }
    },
    // RARE (8)
    {
        id: 'fractal',
        name: 'FRACTAL',
        colors: { primary: '#4b0082', secondary: '#8a2be2', glow: '#6a5acd' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#8a2be2';
            ctx.strokeStyle = '#4b0082';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'miter';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 3) {
                const s = snake.segments[i];
                const w = snake.width + Math.sin(performance.now() / 300 + i) * 2;
                ctx.strokeRect(s.x - w, s.y - w, w * 2, w * 2);
                ctx.strokeRect(s.x - w / 2, s.y - w / 2, w, w);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#4b0082';
            ctx.strokeStyle = '#8a2be2';
            ctx.lineWidth = 2;
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#6a5acd';
            ctx.beginPath();
            ctx.moveTo(0, -size * 1.5);
            ctx.lineTo(size * 1.5, 0);
            ctx.lineTo(0, size * 1.5);
            ctx.lineTo(-size * 1.5, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Inner diamond
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size, 0);
            ctx.closePath();
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'hologram',
        name: 'HOLOGRAM',
        colors: { primary: '#00ffff', secondary: '#0088ff', glow: '#00ffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
            ctx.lineCap = 'butt';

            const flicker = Math.random() > 0.9 ? 0.2 : 0.8;
            ctx.strokeStyle = `rgba(0, 255, 255, ${flicker})`;
            ctx.lineWidth = snake.width * 1.5;

            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) {
                // Scanline gap effect
                if (i % 3 !== 0) {
                    ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
                } else {
                    ctx.moveTo(snake.segments[i].x, snake.segments[i].y);
                }
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            const flicker = Math.random() > 0.85 ? 0.3 : 0.9;
            ctx.fillStyle = `rgba(0, 255, 255, ${flicker})`;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#00ffff';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
            // Scanlines
            ctx.fillStyle = '#000';
            for (let y = -size; y < size; y += 4) {
                ctx.fillRect(-size, y, size * 2, 1);
            }
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#00ffff', 'pixel'));
        }
    },
    {
        id: 'nebula',
        name: 'NEBULA',
        colors: { primary: '#8800ff', secondary: '#ff00aa', glow: '#ff00ff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff00aa';

            const len = snake.segments.length;
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const r = snake.width * (1.5 - (i / len) * 0.5);
                ctx.fillStyle = i % 2 === 0 ? 'rgba(136, 0, 255, 0.4)' : 'rgba(255, 0, 170, 0.4)';
                ctx.beginPath();
                const offsetX = Math.sin(i * 0.3) * 5;
                const offsetY = Math.cos(i * 0.3) * 5;
                ctx.arc(s.x + offsetX, s.y + offsetY, r, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff00aa';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#8800ff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.3, 0, Math.PI * 2);
            ctx.fill();
            // Star center
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(0, -size); ctx.lineTo(size * 0.2, -size * 0.2);
            ctx.lineTo(size, 0); ctx.lineTo(size * 0.2, size * 0.2);
            ctx.lineTo(0, size); ctx.lineTo(-size * 0.2, size * 0.2);
            ctx.lineTo(-size, 0); ctx.lineTo(-size * 0.2, -size * 0.2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.25) particles.push(new Particle(snake.x, snake.y, '#ff00aa', 'sparkle'));
        }
    },
    {
        id: 'coral',
        name: 'CORAL',
        colors: { primary: '#ff7f50', secondary: '#ff69b4', glow: '#ff4500' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ff4500';
            ctx.strokeStyle = '#ff7f50';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            const len = snake.segments.length;
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Branches
            ctx.strokeStyle = '#ff69b4';
            ctx.lineWidth = snake.width * 0.6;
            ctx.beginPath();
            for (let i = 0; i < len; i += 4) {
                const s = snake.segments[i];
                const dir = (i % 8 === 0) ? 1 : -1;
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x + dir * snake.width * 2, s.y + (Math.random() - 0.5) * snake.width * 2);
            }
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff7f50';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ff69b4';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
            ctx.fill();
            // Coral holes
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.arc(size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.arc(-size * 0.2, -size * 0.4, size * 0.15, 0, Math.PI * 2);
            ctx.arc(-size * 0.3, size * 0.3, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.1) particles.push(new Particle(snake.x, snake.y, '#ff69b4', 'collect'));
        }
    },
    {
        id: 'magitech',
        name: 'MAGITECH',
        colors: { primary: '#0f3460', secondary: '#e94560', glow: '#e94560' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#0f3460';

            const len = snake.segments.length;
            // Metal core
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = snake.width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Runes orbiting
            ctx.fillStyle = '#e94560';
            ctx.shadowColor = '#e94560';
            ctx.shadowBlur = lowQuality ? 0 : 15;
            const time = performance.now() / 200;
            for (let i = 0; i < len; i += 4) {
                const s = snake.segments[i];
                const angle = time + i;
                const dist = snake.width * 1.5;
                ctx.fillRect(s.x + Math.cos(angle) * dist - 2, s.y + Math.sin(angle) * dist - 2, 4, 4);
                ctx.fillRect(s.x + Math.cos(angle + Math.PI) * dist - 2, s.y + Math.sin(angle + Math.PI) * dist - 2, 4, 4);
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#1a1a2e';
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 3;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#e94560';

            ctx.beginPath();
            ctx.moveTo(size * 1.2, 0);
            ctx.lineTo(-size * 0.5, size * 0.8);
            ctx.lineTo(-size * 0.5, -size * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Core eye
            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.arc(size * 0.2, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'liquid_metal',
        name: 'MERCURY',
        colors: { primary: '#c0c0c0', secondary: '#ffffff', glow: '#eeeeee' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#fff';

            const len = snake.segments.length;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Highlight
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width * 1.3;
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Core shadow
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = snake.width * 0.8;
            ctx.stroke();

            // Shine strip
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width * 0.3;
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y - snake.width * 0.3);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y - snake.width * 0.3);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#cccccc';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#fff';

            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.quadraticCurveTo(0, size * 1.5, -size, size * 0.5);
            ctx.quadraticCurveTo(-size * 1.5, 0, -size, -size * 0.5);
            ctx.quadraticCurveTo(0, -size * 1.5, size * 1.5, 0);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-size * 0.2, -size * 0.2, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'firework',
        name: 'FIREWORK',
        colors: { primary: '#ff0044', secondary: '#ffff00', glow: '#ffaa00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            const time = performance.now() / 150;

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                const hue = (time * 50 + i * 10) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;

                // Bursts
                if (i % 6 === 0) {
                    for (let k = 0; k < 4; k++) {
                        const angle = k * Math.PI / 2 + (time * 5);
                        ctx.fillRect(s.x + Math.cos(angle) * snake.width - 2, s.y + Math.sin(angle) * snake.width - 2, 4, 4);
                    }
                } else {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, snake.width * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffff00';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ff0044';

            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(size * 0.5, size * 0.5);
            ctx.lineTo(size * 0.5, -size * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ff0044';
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.3) {
                const colors = ['#ff0044', '#ffff00', '#00ffcc', '#ff00ff'];
                const c = colors[Math.floor(Math.random() * colors.length)];
                particles.push(new Particle(snake.x, snake.y, c, 'sparkle'));
            }
        }
    },
    {
        id: 'crystal',
        name: 'CRYSTAL',
        colors: { primary: '#e6e6fa', secondary: '#dda0dd', glow: '#ee82ee' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ee82ee';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 3) {
                const s = snake.segments[i];
                const angle = i * 0.5;
                const w = snake.width * 1.5;

                ctx.fillStyle = (i % 6 === 0) ? '#e6e6fa' : '#dda0dd';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(0, -w);
                ctx.lineTo(w / 2, 0);
                ctx.lineTo(0, w);
                ctx.lineTo(-w / 2, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#dda0dd';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ee82ee';

            ctx.beginPath();
            ctx.moveTo(size * 1.8, 0);
            ctx.lineTo(0, size * 1.2);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(0, -size * 1.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(size * 1.8, 0);
            ctx.lineTo(-size * 0.5, 0);
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    // EPIC (6)
    {
        id: 'dragon',
        name: 'DRAGON',
        colors: { primary: '#ff3300', secondary: '#ffaa00', glow: '#ff2200' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ff2200';
            const len = snake.segments.length;

            // Scales
            ctx.fillStyle = '#aa1100';
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1;

            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                let angle = 0;
                if (i + 1 < len) {
                    angle = Math.atan2(s.y - snake.segments[i + 1].y, s.x - snake.segments[i + 1].x);
                }

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);

                ctx.beginPath();
                ctx.moveTo(snake.width, 0);
                ctx.lineTo(0, snake.width);
                ctx.lineTo(-snake.width, 0);
                ctx.lineTo(0, -snake.width);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Dorsal spikes
                if (i % 4 === 0) {
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(snake.width * 1.5, 0); // Pointing backwards
                    ctx.lineTo(0, snake.width * 0.5);
                    ctx.fill();
                }
                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ff3300';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#ffaa00';
            // Dragon head shape
            ctx.beginPath();
            ctx.moveTo(size * 1.8, 0);
            ctx.lineTo(size * 0.5, size * 0.8);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size * 0.5, 0);
            ctx.lineTo(-size, -size);
            ctx.lineTo(size * 0.5, -size * 0.8);
            ctx.closePath();
            ctx.fill();
            // Horns
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, -size * 0.5); ctx.lineTo(-size * 1.5, -size * 1.2); ctx.lineTo(-size * 0.5, -size * 0.2);
            ctx.moveTo(-size * 0.2, size * 0.5); ctx.lineTo(-size * 1.5, size * 1.2); ctx.lineTo(-size * 0.5, size * 0.2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(size * 0.5, -size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.arc(size * 0.5, size * 0.4, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.3) {
                // Breath smoke
                const angle = Math.random() * Math.PI * 2;
                particles.push(new Particle(snake.x + Math.cos(angle) * 10, snake.y + Math.sin(angle) * 10, '#ffaa00', 'ember'));
            }
        }
    },
    {
        id: 'abyss',
        name: 'ABYSS',
        colors: { primary: '#000000', secondary: '#110033', glow: '#220044' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#330066';

            const len = snake.segments.length;
            const time = performance.now() / 200;

            // Outer aura
            ctx.strokeStyle = 'rgba(50, 0, 100, 0.4)';
            ctx.lineWidth = snake.width * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Vantablack core
            ctx.fillStyle = '#000000';
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const r = snake.width * (0.8 + Math.random() * 0.4);
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#440088';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 0, 200, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const offset = (performance.now() / 100) % (size * 1.5);
            ctx.arc(0, 0, offset, 0, Math.PI * 2);
            ctx.stroke();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#330066', 'sparkle'));
        }
    },
    {
        id: 'aurora',
        name: 'AURORA',
        colors: { primary: '#00ffaa', secondary: '#00aaff', glow: '#00ffaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            const len = snake.segments.length;
            const time = performance.now() / 300;

            ctx.lineCap = 'round';
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.lineWidth = snake.width * (1 - k * 0.2);

                if (k === 0) ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
                else if (k === 1) ctx.strokeStyle = 'rgba(0, 170, 255, 0.5)';
                else ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';

                ctx.shadowColor = ctx.strokeStyle;

                for (let i = 0; i < len; i++) {
                    const s = snake.segments[i];
                    const wave = Math.sin(time + i * 0.1 + k) * snake.width;
                    if (i === 0) ctx.moveTo(s.x, s.y + wave);
                    else ctx.lineTo(s.x, s.y + wave);
                }
                ctx.stroke();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#00ffaa';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#00aaff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'mecha',
        name: 'MECHA',
        colors: { primary: '#444455', secondary: '#ff9900', glow: '#ff9900' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 10;
            ctx.shadowColor = '#ff9900';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                let angle = 0;
                if (i + 1 < len) {
                    angle = Math.atan2(s.y - snake.segments[i + 1].y, s.x - snake.segments[i + 1].x);
                }

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);

                // Base armor
                ctx.fillStyle = '#555566';
                ctx.fillRect(-snake.width, -snake.width, snake.width * 2, snake.width * 2);

                // Panel lines
                ctx.strokeStyle = '#222233';
                ctx.lineWidth = 1;
                ctx.strokeRect(-snake.width, -snake.width, snake.width * 2, snake.width * 2);

                // Glowing vents
                ctx.fillStyle = '#ff9900';
                ctx.fillRect(-snake.width * 0.5, -snake.width * 0.8, snake.width, snake.width * 0.3);
                ctx.fillRect(-snake.width * 0.5, snake.width * 0.5, snake.width, snake.width * 0.3);

                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#444455';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff9900';
            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(size * 0.5, size);
            ctx.lineTo(-size, size);
            ctx.lineTo(-size, -size);
            ctx.lineTo(size * 0.5, -size);
            ctx.closePath();
            ctx.fill();

            // Visor
            ctx.fillStyle = '#ff9900';
            ctx.beginPath();
            ctx.rect(0, -size * 0.6, size, size * 1.2);
            ctx.fill();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'biohazard',
        name: 'MUTANT',
        colors: { primary: '#88ff00', secondary: '#225500', glow: '#88ff00' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#88ff00';

            const len = snake.segments.length;
            const time = performance.now() / 200;

            ctx.fillStyle = '#44aa00';
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const r = snake.width * (1 + Math.sin(time + i * 0.5) * 0.3); // Pulsing
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();

                // Toxic boils
                if (i % 3 === 0) {
                    ctx.fillStyle = '#88ff00';
                    ctx.beginPath();
                    ctx.arc(s.x + Math.sin(time * 2 + i) * r * 0.5, s.y + Math.cos(time * 2 + i) * r * 0.5, r * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#44aa00'; // Reset
                }
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#44aa00';
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#88ff00';

            // Lumpy head
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 2; a += 0.5) {
                const r = size * (1 + Math.random() * 0.3);
                if (a === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();

            // Multiple eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(size * 0.4, -size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.arc(size * 0.2, size * 0.4, size * 0.15, 0, Math.PI * 2);
            ctx.arc(-size * 0.1, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(size * 0.45, -size * 0.3, size * 0.05, 0, Math.PI * 2);
            ctx.arc(size * 0.25, size * 0.4, size * 0.05, 0, Math.PI * 2);
            ctx.arc(-size * 0.05, 0, size * 0.1, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#88ff00', 'collect'));
        }
    },
    {
        id: 'stardust',
        name: 'STARDUST',
        colors: { primary: '#ffeeaa', secondary: '#ffffff', glow: '#ffccaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffccaa';

            const len = snake.segments.length;
            for (let i = 0; i < len; i += 2) {
                const s = snake.segments[i];
                ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#ffeeaa';
                const r = snake.width * (Math.random() * 0.6 + 0.4);

                // Diamond stars
                const jx = (Math.random() - 0.5) * snake.width;
                const jy = (Math.random() - 0.5) * snake.width;

                ctx.beginPath();
                ctx.moveTo(s.x + jx, s.y + jy - r);
                ctx.lineTo(s.x + jx + r / 2, s.y + jy);
                ctx.lineTo(s.x + jx, s.y + jy + r);
                ctx.lineTo(s.x + jx - r / 2, s.y + jy);
                ctx.closePath();
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#ffccaa';

            ctx.beginPath();
            ctx.moveTo(size * 2, 0);
            ctx.lineTo(size * 0.5, size * 0.5);
            ctx.lineTo(0, size * 2);
            ctx.lineTo(-size * 0.5, size * 0.5);
            ctx.lineTo(-size * 2, 0);
            ctx.lineTo(-size * 0.5, -size * 0.5);
            ctx.lineTo(0, -size * 2);
            ctx.lineTo(size * 0.5, -size * 0.5);
            ctx.closePath();
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.3) particles.push(new Particle(snake.x, snake.y, '#ffffff', 'sparkle'));
        }
    },
    // LEGENDARY (4)
    {
        id: 'supernova',
        name: 'SUPERNOVA',
        colors: { primary: '#ffffff', secondary: '#ffdd00', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#ffffff';

            const len = snake.segments.length;
            const time = performance.now() / 150;

            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                const r = snake.width * (1 + Math.sin(time + i * 0.2) * 0.5);

                const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.5, '#ffdd00');
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width * 0.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = lowQuality ? 0 : 40;
            ctx.shadowColor = '#ffdd00';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Sun bursts
            for (let i = 0; i < 8; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                const angle = i * Math.PI / 4 + performance.now() / 500;
                ctx.lineTo(Math.cos(angle) * size * 2.5, Math.sin(angle) * size * 2.5);
                ctx.strokeStyle = 'rgba(255, 221, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        },
        update: (dt, snake) => {
            if (Math.random() < 0.4) particles.push(new Particle(snake.x, snake.y, '#ffffff', 'sparkle'));
        }
    },
    {
        id: 'phantom',
        name: 'PHANTOM',
        colors: { primary: '#111111', secondary: '#888888', glow: '#aaaaaa' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#aaaaaa';

            const len = snake.segments.length;
            const time = performance.now() / 300;

            ctx.fillStyle = '#000000';
            for (let i = 0; i < len; i++) {
                // Fade out periodically
                const alpha = (0.5 + Math.sin(time + i * 0.1) * 0.5) * (1 - i / len);
                ctx.globalAlpha = alpha;

                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width * (1 + Math.sin(time * 2 + i) * 0.2), 0, Math.PI * 2);
                ctx.fill();

                if (i % 4 === 0) {
                    ctx.strokeStyle = '#aaaaaa';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1.0;
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#111111';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#aaaaaa';

            // Ghost shape
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.2, Math.PI, 0);
            ctx.lineTo(size * 1.2, size * 1.5);
            ctx.lineTo(size * 0.6, size);
            ctx.lineTo(0, size * 1.5);
            ctx.lineTo(-size * 0.6, size);
            ctx.lineTo(-size * 1.2, size * 1.5);
            ctx.closePath();
            ctx.fill();

            // Glowing eyes
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(-size * 0.4, -size * 0.2, size * 0.1, size * 0.3, -0.2, 0, Math.PI * 2);
            ctx.ellipse(size * 0.4, -size * 0.2, size * 0.1, size * 0.3, 0.2, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.2) particles.push(new Particle(snake.x, snake.y, '#aaaaaa', 'sparkle'));
        }
    },
    {
        id: 'ouroboros',
        name: 'OUROBOROS',
        colors: { primary: '#ffd700', secondary: '#228b22', glow: '#ffd700' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 15;
            ctx.shadowColor = '#ffd700';

            const len = snake.segments.length;
            for (let i = len - 1; i >= 0; i--) { // Draw back to front for overlapping scales
                const s = snake.segments[i];
                let angle = 0;
                if (i > 0) {
                    angle = Math.atan2(snake.segments[i - 1].y - s.y, snake.segments[i - 1].x - s.x);
                }

                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);

                ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#228b22';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.moveTo(-snake.width, -snake.width * 1.2);
                ctx.lineTo(snake.width, 0);
                ctx.lineTo(-snake.width, snake.width * 1.2);
                ctx.quadraticCurveTo(-snake.width * 1.5, 0, -snake.width, -snake.width * 1.2);
                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffd700';
            ctx.shadowBlur = lowQuality ? 0 : 25;
            ctx.shadowColor = '#228b22';

            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(0, size * 1.2);
            ctx.lineTo(-size * 0.8, size * 0.8);
            ctx.lineTo(-size * 0.8, -size * 0.8);
            ctx.lineTo(0, -size * 1.2);
            ctx.closePath();
            ctx.fill();

            // Gem
            ctx.fillStyle = '#228b22';
            ctx.beginPath();
            ctx.moveTo(size * 0.5, 0);
            ctx.lineTo(0, size * 0.4);
            ctx.lineTo(-size * 0.3, 0);
            ctx.lineTo(0, -size * 0.4);
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.stroke();
        },
        update: (dt, snake) => { }
    },
    {
        id: 'cyber_demon',
        name: 'DEMON',
        colors: { primary: '#330000', secondary: '#ff0000', glow: '#ff0000' },
        renderBody: (ctx, snake) => {
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ff0000';
            ctx.strokeStyle = '#330000';
            ctx.lineWidth = snake.width * 1.5;
            ctx.lineCap = 'butt';

            const len = snake.segments.length;
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();

            // Core vein
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = snake.width * 0.4;
            ctx.setLineDash([15, 10]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Cyber spikes
            ctx.fillStyle = '#111';
            for (let i = 0; i < len; i += 4) {
                const s = snake.segments[i];
                let angle = 0;
                if (i + 1 < len) {
                    angle = Math.atan2(s.y - snake.segments[i + 1].y, s.x - snake.segments[i + 1].x);
                }
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);
                ctx.fillRect(0, -snake.width * 1.5, 4, snake.width * 3);
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, -snake.width * 1.5, 4, 3);
                ctx.fillRect(0, snake.width * 1.5 - 3, 4, 3);
                ctx.fillStyle = '#111';
                ctx.restore();
            }
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#111111';
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#ff0000';

            ctx.beginPath();
            ctx.moveTo(size * 1.5, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size, size * 0.5);
            ctx.lineTo(-size, -size * 0.5);
            ctx.lineTo(0, -size);
            ctx.closePath();
            ctx.fill();

            // Demon horns
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.moveTo(-size * 0.5, -size); ctx.lineTo(0, -size * 2); ctx.lineTo(size * 0.2, -size * 0.8);
            ctx.moveTo(-size * 0.5, size); ctx.lineTo(0, size * 2); ctx.lineTo(size * 0.2, size * 0.8);
            ctx.fill();

            // Glitched eye
            ctx.fillStyle = '#ff0000';
            const offset = (Math.random() - 0.5) * 4;
            ctx.fillRect(size * 0.2 + offset, -size * 0.2, size * 0.5, size * 0.4);
            ctx.fillStyle = '#fff';
            ctx.fillRect(size * 0.4, -size * 0.1, size * 0.2, size * 0.2);
        },
        update: (dt, snake) => {
            if (Math.random() < 0.25) particles.push(new Particle(snake.x, snake.y, '#ff0000', 'ember'));
        }
    },
    // MYTHIC (2)
    {
        id: 'black_hole',
        name: 'SINGULARITY',
        colors: { primary: '#000000', secondary: '#8800ff', glow: '#440088' },
        renderBody: (ctx, snake) => {
            const len = snake.segments.length;
            const time = performance.now() / 200;

            // Accretion disk
            ctx.shadowBlur = lowQuality ? 0 : 30;
            ctx.shadowColor = '#8800ff';
            ctx.strokeStyle = 'rgba(136, 0, 255, 0.5)';
            ctx.lineWidth = snake.width * 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) {
                const jx = Math.sin(time + i) * 5;
                const jy = Math.cos(time + i) * 5;
                ctx.lineTo(snake.segments[i].x + jx, snake.segments[i].y + jy);
            }
            ctx.stroke();

            // Event horizon (pure black)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            for (let i = 0; i < len; i++) {
                const s = snake.segments[i];
                ctx.beginPath();
                ctx.arc(s.x, s.y, snake.width * 0.9, 0, Math.PI * 2);
                ctx.fill();
            }
        },
        renderHead: (ctx, snake, size) => {
            const time = performance.now() / 100;
            // Photon ring
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = lowQuality ? 0 : 20;
            ctx.shadowColor = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 2, size, time, 0, Math.PI * 2);
            ctx.stroke();

            // Singularity
            ctx.fillStyle = '#000000';
            ctx.shadowBlur = lowQuality ? 0 : 50;
            ctx.shadowColor = '#8800ff';
            ctx.beginPath();
            ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                particles.push(new Particle(snake.x + Math.cos(angle) * 20, snake.y + Math.sin(angle) * 20, '#8800ff', 'sparkle'));
            }
        }
    },
    {
        id: 'god_ray',
        name: 'RADIANCE',
        colors: { primary: '#ffffff', secondary: '#ffffcc', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            const len = snake.segments.length;
            const time = performance.now() / 500;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Prismatic aura
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.lineWidth = snake.width * (3 - k);
                const colors = ['rgba(255,100,100,0.3)', 'rgba(100,255,100,0.3)', 'rgba(100,100,255,0.3)'];
                ctx.strokeStyle = colors[k];
                ctx.shadowBlur = lowQuality ? 0 : 20;
                ctx.shadowColor = colors[k].replace('0.3', '1');

                if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < len; i++) {
                    const offset = Math.sin(time * 2 + i * 0.1 + k * (Math.PI * 2 / 3)) * snake.width;
                    ctx.lineTo(snake.segments[i].x, snake.segments[i].y + offset);
                }
                ctx.stroke();
            }

            // Core
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = snake.width;
            ctx.shadowColor = '#ffffcc';
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = lowQuality ? 0 : 40;
            ctx.shadowColor = '#ffffcc';

            // Diamond head
            ctx.beginPath();
            ctx.moveTo(size * 2, 0);
            ctx.lineTo(0, size * 1.5);
            ctx.lineTo(-size, 0);
            ctx.lineTo(0, -size * 1.5);
            ctx.closePath();
            ctx.fill();

            // Cross flair
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(-size * 0.2, -size * 3, size * 0.4, size * 6);
            ctx.fillRect(-size * 3, -size * 0.2, size * 6, size * 0.4);
        },
        update: (dt, snake) => {
            if (Math.random() < 0.3) particles.push(new Particle(snake.x, snake.y, '#ffffff', 'sparkle'));
        }
    },
    // ULTIMATE (1)
    {
        id: 'omni',
        name: 'OMNI',
        colors: { primary: '#ffffff', secondary: '#ffffff', glow: '#ffffff' },
        renderBody: (ctx, snake) => {
            const time = performance.now() / 200;
            const len = snake.segments.length;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Overlapping mirages
            for (let k = -1; k <= 1; k++) {
                const hueOffset = (time * 50 + k * 120) % 360;
                ctx.strokeStyle = `hsla(${hueOffset}, 100%, 60%, 0.6)`;
                ctx.shadowBlur = lowQuality ? 0 : 15;
                ctx.shadowColor = `hsl(${hueOffset}, 100%, 60%)`;
                ctx.lineWidth = snake.width * 1.5;

                ctx.beginPath();
                if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
                for (let i = 1; i < len; i++) {
                    const wave = Math.sin(time + i * 0.2) * (snake.width * 2) * k;
                    ctx.lineTo(snake.segments[i].x, snake.segments[i].y + wave);
                }
                ctx.stroke();
            }

            // White hot core
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.lineWidth = snake.width * 0.8;
            ctx.beginPath();
            if (len > 0) ctx.moveTo(snake.segments[0].x, snake.segments[0].y);
            for (let i = 1; i < len; i++) ctx.lineTo(snake.segments[i].x, snake.segments[i].y);
            ctx.stroke();
        },
        renderHead: (ctx, snake, size) => {
            const time = performance.now() / 150;
            const hue = (time * 50) % 360;

            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = lowQuality ? 0 : 50;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;

            // Pulsing star polygon
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? size * 2 : size;
                const a = (i * Math.PI) / points + time;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();

            // Inner eye
            ctx.fillStyle = `hsl(${(hue + 180) % 360}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        },
        update: (dt, snake) => {
            if (Math.random() < 0.8) {
                const time = performance.now() / 150;
                const hue = (time * 50 + Math.random() * 100) % 360;
                particles.push(new Particle(snake.x, snake.y, `hsl(${hue}, 100%, 60%)`, 'sparkle'));
            }
        }
    }
];

const NEON_COLORS = SNAKE_STYLES.map(s => s.colors.primary);
const BOT_NAMES = SNAKE_STYLES.map(s => s.name);

// ---- Unlock Tiers (Gamification) ----
// Each tier has a fixed cost — every snake in a tier costs the same amount
const UNLOCK_TIERS = [
    { label: 'STARTER', cost: 0, color: '#ffffff' },
    { label: 'COMMON', cost: 500, color: '#55ff55' },
    { label: 'RARE', cost: 1000, color: '#00aaff' },
    { label: 'EPIC', cost: 1500, color: '#aa55ff' },
    { label: 'LEGENDARY', cost: 2000, color: '#ffaa00' },
    { label: 'MYTHIC', cost: 3000, color: '#ff3355' },
    { label: 'ULTIMATE', cost: 4000, color: '#ff00ff' },
];

// Map each snake index to its tier index
const SNAKE_TIER_MAP = [
    0, 0, 0,          // 0-2: STARTER (neon_cyber, inferno, void)
    1, 1, 1, 1,       // 3-6: COMMON (glitch, plasma, midas, toxic)
    1, 1, 1, 1,       // 7-10: COMMON (prism, stealth, circuit, radium)
    2, 2, 2, 2, 2,    // 11-15: RARE (cosmos, vampire, pixel, candy, magma)
    2, 2, 2, 2, 2,    // 16-20: RARE (frost, voltaic, azure, verdant, chrome)
    3, 3, 3, 3, 3,    // 21-25: EPIC (sketch, spectrum, matrix, samurai, vaporwave)
    3, 3, 3, 3, 3,    // 26-30: EPIC (gummy, honeycomb, obsidian, carbon, runic)
    4, 4, 4, 4,       // 31-34: LEGENDARY (laser, oil, bone, hazard)
    4, 4, 4, 4,       // 35-38: LEGENDARY (zen, disco, amethyst, bamboo)
    5, 5, 5, 5,       // 39-42: MYTHIC (cheese, tiedye, stone, paper)
    6, 6,             // 43-44: ULTIMATE (jelly, retro)
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 45-54: NEW COMMON (10 styles)
    2, 2, 2, 2, 2, 2, 2, 2,       // 55-62: NEW RARE (8 styles)
    3, 3, 3, 3, 3, 3,             // 63-68: NEW EPIC (6 styles)
    4, 4, 4, 4,                   // 69-72: NEW LEGENDARY (4 styles)
    5, 5,                         // 73-74: NEW MYTHIC (2 styles)
    6                             // 75:    NEW ULTIMATE (1 style)
];

// Sequential unlock order: snakes unlock ONE AT A TIME in this order
const UNLOCK_ORDER = [
    3, 4, 5, 6, 7, 8, 9, 10, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, // COMMON (18 total)
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 55, 56, 57, 58, 59, 60, 61, 62, // RARE (18 total)
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 63, 64, 65, 66, 67, 68, // EPIC (16 total)
    31, 32, 33, 34, 35, 36, 37, 38, 69, 70, 71, 72,                 // LEGENDARY (12 total)
    39, 40, 41, 42, 73, 74,                                         // MYTHIC (6 total)
    43, 44, 75                                                      // ULTIMATE (3 total)
];

function getSnakeTier(index) {
    return UNLOCK_TIERS[SNAKE_TIER_MAP[index] || 0];
}

function getSnakeCost(index) {
    return getSnakeTier(index).cost;
}

function isSnakeUnlocked(index) {
    return unlockedSnakes.has(index);
}

function getNextUnlock() {
    for (let pos = 0; pos < UNLOCK_ORDER.length; pos++) {
        const idx = UNLOCK_ORDER[pos];
        if (!unlockedSnakes.has(idx)) {
            const cost = getSnakeCost(idx);
            return { index: idx, cost, name: SNAKE_STYLES[idx].name, tier: getSnakeTier(idx) };
        }
    }
    return null;
}

function checkNewUnlocks() {
    const newlyUnlocked = [];

    // We will keep unlocking until we can't afford any more locked snakes.
    let canUnlockMore = true;
    while (canUnlockMore) {
        let bestUnlockIndex = -1;
        let maxCost = -1;

        // Find the most expensive locked snake we can afford
        for (let pos = 0; pos < UNLOCK_ORDER.length; pos++) {
            const idx = UNLOCK_ORDER[pos];
            if (!unlockedSnakes.has(idx)) {
                const cost = getSnakeCost(idx);
                if (currentUnlockProgress >= cost && cost > maxCost) {
                    maxCost = cost;
                    bestUnlockIndex = idx;
                }
            }
        }

        if (bestUnlockIndex !== -1) {
            // Deduct the cost and unlock it
            currentUnlockProgress -= maxCost;
            unlockedSnakes.add(bestUnlockIndex);
            newlyUnlocked.push(bestUnlockIndex);
        } else {
            // We can't afford any more locked snakes
            canUnlockMore = false;
        }
    }

    if (newlyUnlocked.length > 0) {
        saveUnlockData();
    }
    return newlyUnlocked;
}

function saveUnlockData() {
    try {
        localStorage.setItem('ps_lifetime_points', lifetimePoints);
        localStorage.setItem('ps_unlock_progress', currentUnlockProgress);
        localStorage.setItem('ps_unlocked_snakes', JSON.stringify([...unlockedSnakes]));
    } catch (e) { /* ignore */ }
}

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
const selectSnakeButton = document.getElementById('selectSnakeButton');
const deathSelectionButton = document.getElementById('deathSelectionButton');
const deathHomeButton = document.getElementById('deathHomeButton');
const snakeGrid = document.getElementById('snakeGrid');
const backButton = document.getElementById('backButton');
const highScoreValue = document.getElementById('highScoreValue');
const nextUnlockTeaser = document.getElementById('nextUnlockTeaser');
const unlockCelebration = document.getElementById('unlockCelebration');
const pointsEarnedEl = document.getElementById('pointsEarned');
const nextUnlockHint = document.getElementById('nextUnlockHint');

// ---- Game State ----
let gameRunning = false;
let lowQuality = true; // Default ON for better performance
let highScore = 0;
let snakes = [];
let foods = [];
let particles = [];
let floatingTexts = [];
let screenShake = 0;
let player = null;
let camera = { x: 0, y: 0, zoom: 1, stX: 0, stY: 0, st2X: 0, st2Y: 0 };
let gameDt = 1 / 60; // stored each frame for render()
let lastTime = 0;
let animationId = null;
let deathTime = 0;
let currentKing = null;
let hudUpdateTimer = 0;
let playerSnakeStyleIndex = 0;
let screenScale = 1.0;
let lifetimePoints = 0;
let currentUnlockProgress = 0;
let unlockedSnakes = new Set([0, 1, 2]); // 3 free starters
let pendingUnlocks = []; // Queue of newly unlocked snake indices

// ---- Resize ----
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Scale based on the larger dimension to maintain consistent visual size
    // regardless of orientation (landscape vs portrait).
    const maxDim = Math.max(canvas.width, canvas.height);
    const rawScale = maxDim / REFERENCE_WIDTH;
    // For smaller screens (mobile), use halfway between raw scale and 1.0
    // to keep things visible without full cropping. Desktop+ stays unchanged.
    screenScale = rawScale < 1.0 ? (rawScale + 1.0) / 2 : rawScale;
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
    constructor(name, style, isPlayer = false) {
        this.name = name;
        this.style = style;
        this.color = style.colors.primary; // Keep for compatibility with food spawning
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
        this.lastBoostSource = null;
        this.currentBoostStyle = 0;
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
        // Prevent 180Â° reversal
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
        let boostExtra = (currentBoostSpeed - currentBaseSpeed) * this.boostIntensity;

        // Slightly more conservative cap on the proximity boost specifically
        boostExtra = Math.min(boostExtra, MAX_PROXIMITY_BOOST);

        let targetSpeed = currentBaseSpeed + boostExtra;

        // Apply overall speed cap to prevent combined boosts going too fast
        targetSpeed = Math.min(targetSpeed, MAX_SPEED_CAP);

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

        // Custom Visual Update
        if (this.style && this.style.update) {
            this.style.update(dt, this);
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
                            score += (f.value * FOOD_WEIGHT * 80) / (preciseDist + 10);
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
        // Attempt to find a safe spawn location
        let safe = false;
        let attempts = 0;
        while (!safe && attempts < 10) {
            this.x = rand(margin, ARENA_SIZE - margin);
            this.y = rand(margin, ARENA_SIZE - margin);
            safe = true;
            for (const other of snakes) {
                if (other !== this && other.alive) {
                    const d = dist({ x: this.x, y: this.y }, { x: other.x, y: other.y });
                    if (d < 500) {
                        safe = false;
                        break;
                    }
                }
            }
            attempts++;
        }

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
        } else if (type === 'boost' || type === 'ember') {
            this.vx = rand(-2, 2);
            this.vy = rand(-2, 2);
            this.maxLife = rand(0.3, 0.6);
            this.life = this.maxLife;
            this.size = rand(2, 4);
            this.shape = 'circle';
            this.drag = 0.92;
        } else if (type === 'collect' || type === 'sparkle') {
            const speed = rand(3, 7);
            const dir = rand(0, Math.PI * 2);
            this.vx = Math.cos(dir) * speed;
            this.vy = Math.sin(dir) * speed;
            this.maxLife = rand(0.4, 0.8);
            this.life = this.maxLife;
            this.size = rand(3, 6);
            this.shape = 'star'; // Sparkles
            this.drag = 0.9;
        } else if (type === 'pixel') {
            this.vx = rand(-1, 1);
            this.vy = rand(-1, 1);
            this.maxLife = rand(0.3, 0.6);
            this.life = this.maxLife;
            this.size = rand(2, 5);
            this.shape = 'rect';
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
    // Safety Net: If food drops too low (due to high consumption vs 15s delay),
    // force immediate spawning to keep the game playable.
    // This acts as a floor (150 food) while the top 150 cycles on the 15s timer.
    const safetyThreshold = FOOD_COUNT * 0.5;
    if (foods.length < safetyThreshold) {
        spawnFood(1); // Heal slowly frame-by-frame or batch? 
        // Let's spawn enough to stay above threshold, but maybe just 1 per frame to be smooth
        // Actually, just fill it to threshold if it's very low, or spawn 1.
        // Given maintainFood runs every frame (or collision check?), let's check game loop.
        // It runs once per frame. Spawning 1 per frame is plenty fast (60/sec).
        spawnFood(1);
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

                // Replenish food after 15 seconds
                setTimeout(() => {
                    if (gameRunning && foods.length < FOOD_COUNT) {
                        spawnFood(1);
                    }
                }, 15000);
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

        let currentBoostSource = null;

        for (const other of snakes) {
            if (other === snake || !other.alive) continue;

            // Check close segments
            for (let i = 0; i < other.segments.length; i += 2) {
                const seg = other.segments[i];
                const d = dist({ x: hx, y: hy }, seg);

                if (d < BOOST_PROXIMITY && d > snake.width + other.width) {
                    nearParallel = true;
                    currentBoostSource = other;
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
            // SFX Logic
            if (snake.isPlayer) {
                const isNewSource = (currentBoostSource !== snake.lastBoostSource);
                // "New Session" if we weren't boosting (timer expired) OR new source
                const isNewSession = (!snake.boosting) || isNewSource;

                if (isNewSession) {
                    // Decide if we should change the style
                    // Change if: New Source OR We fully slowed down
                    let shouldChangeStyle = false;

                    if (isNewSource) {
                        shouldChangeStyle = true;
                    } else if (snake.boostIntensity <= 0.05) {
                        shouldChangeStyle = true;
                    }

                    if (shouldChangeStyle) {
                        snake.currentBoostStyle = Math.floor(Math.random() * 21);
                    }

                    // Play the sound (either new style or same as before)
                    soundManager.playBoost(snake.currentBoostStyle);

                    snake.lastBoostSource = currentBoostSource;
                }
            }

            snake.boosting = true;
            snake.boostTimer = 0.6;

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

// ---- Nebula Background System ----
let nebulaCanvas = null;
let nebulaCtx = null;
const NEBULA_SIZE = 1024; // Resolution of the nebula texture

function initNebulaCanvas() {
    nebulaCanvas = document.createElement('canvas');
    nebulaCanvas.width = NEBULA_SIZE;
    nebulaCanvas.height = NEBULA_SIZE;
    nebulaCtx = nebulaCanvas.getContext('2d');

    // Base fill
    nebulaCtx.fillStyle = '#0d1025';
    nebulaCtx.fillRect(0, 0, NEBULA_SIZE, NEBULA_SIZE);

    // Paint nebula blobs — soft colored clouds
    const blobs = [
        { x: 0.2, y: 0.3, r: 0.35, color: 'rgba(20, 60, 120, 0.35)' },
        { x: 0.7, y: 0.2, r: 0.3, color: 'rgba(80, 20, 100, 0.25)' },
        { x: 0.5, y: 0.7, r: 0.4, color: 'rgba(10, 80, 80, 0.25)' },
        { x: 0.8, y: 0.8, r: 0.25, color: 'rgba(60, 10, 60, 0.3)' },
        { x: 0.3, y: 0.85, r: 0.3, color: 'rgba(20, 40, 100, 0.2)' },
        { x: 0.15, y: 0.6, r: 0.2, color: 'rgba(100, 30, 60, 0.2)' },
        { x: 0.6, y: 0.45, r: 0.28, color: 'rgba(15, 50, 90, 0.3)' },
        { x: 0.9, y: 0.5, r: 0.22, color: 'rgba(50, 15, 80, 0.25)' },
    ];

    for (const b of blobs) {
        const cx = b.x * NEBULA_SIZE;
        const cy = b.y * NEBULA_SIZE;
        const radius = b.r * NEBULA_SIZE;
        const grad = nebulaCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, 'transparent');
        nebulaCtx.fillStyle = grad;
        nebulaCtx.fillRect(0, 0, NEBULA_SIZE, NEBULA_SIZE);
    }

    // Add subtle star dust
    nebulaCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 200; i++) {
        const sx = Math.random() * NEBULA_SIZE;
        const sy = Math.random() * NEBULA_SIZE;
        const sr = Math.random() * 1.2 + 0.3;
        nebulaCtx.beginPath();
        nebulaCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        nebulaCtx.fill();
    }

    // Brighter stars
    nebulaCtx.fillStyle = 'rgba(200, 220, 255, 0.4)';
    for (let i = 0; i < 30; i++) {
        const sx = Math.random() * NEBULA_SIZE;
        const sy = Math.random() * NEBULA_SIZE;
        const sr = Math.random() * 1.8 + 0.5;
        nebulaCtx.beginPath();
        nebulaCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        nebulaCtx.fill();
    }
}

// ---- Rendering ----
function render() {
    const w = canvas.width;
    const h = canvas.height;

    // Initialize nebula once
    if (!nebulaCanvas) initNebulaCanvas();

    // Rich deep background — brighter than pure black for dark snake visibility
    const maxDim = Math.max(w, h);
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, maxDim * 0.8);
    gradient.addColorStop(0, '#0f1428');
    gradient.addColorStop(0.5, '#0a0e1e');
    gradient.addColorStop(1, '#060810');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Camera — lead ahead with dual-stage position smoothing
    if (player && player.alive) {
        const dt = gameDt;
        const dv = DIR_VECTORS[player.dir];

        // --- Compute lookahead target directly from snake direction ---
        // Feed-forward compensation: the triple-stage filter lags behind a moving
        // target by velocity * sum(1/rate). We increase the lookahead to cancel
        // the extra lag above base speed so the camera stays ahead at any speed.
        const filterDelay = 1 / 8.0 + 1 / 5.5 + 1 / 4.0; // ~0.557s total group delay
        const velocity = player.speed * 60;          // px/s (moveAmount = speed * dt * 60)
        const baseLag = BASE_SPEED * 60 * filterDelay;
        const currentLag = velocity * filterDelay;
        const lagCompensation = (currentLag - baseLag) * 0.7; // 70% of extra lag above base speed

        const lookAhead = 80 + player.speed * 25 + lagCompensation;
        const rawTargetX = player.x + dv.x * lookAhead;
        const rawTargetY = player.y + dv.y * lookAhead;

        // --- Triple-stage position smoothing (third-order filter ≈ Gaussian response) ---
        // Three cascaded smoothers produce the smoothest possible transition:
        // no abrupt acceleration changes at start or end of camera moves.

        // Stage 1: Fast initial smoothing (~0.12s time constant)
        const t1 = 1 - Math.exp(-dt * 8.0);
        camera.stX = lerp(camera.stX, rawTargetX, t1);
        camera.stY = lerp(camera.stY, rawTargetY, t1);

        // Stage 2: Intermediate smoothing (~0.18s time constant)
        const t2 = 1 - Math.exp(-dt * 5.5);
        camera.st2X = lerp(camera.st2X, camera.stX, t2);
        camera.st2Y = lerp(camera.st2Y, camera.stY, t2);

        // Stage 3: Final camera position (~0.25s time constant)
        const t3 = 1 - Math.exp(-dt * 4.0);
        camera.x = lerp(camera.x, camera.st2X, t3);
        camera.y = lerp(camera.y, camera.st2Y, t3);

        // Zoom based on snake size (dt-independent)
        const targetZoom = clamp(1.0 - player.segments.length * 0.0005, 0.45, 1.0);
        camera.zoom = lerp(camera.zoom, targetZoom, 1 - Math.exp(-dt * 2.0));
    }

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // Screen Shake
    if (screenShake > 0) {
        const sx = rand(-screenShake, screenShake);
        const sy = rand(-screenShake, screenShake);
        ctx.translate(sx, sy);
    }

    ctx.scale(camera.zoom * screenScale, camera.zoom * screenScale);
    ctx.translate(-camera.x, -camera.y);

    // Draw nebula background (world-space, only visible tiles)
    // Skipped on low quality — the base gradient is already good enough
    if (nebulaCanvas && !lowQuality) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        // Calculate visible bounds
        const vHalfW = (w / 2) / (camera.zoom * screenScale);
        const vHalfH = (h / 2) / (camera.zoom * screenScale);
        const vLeft = Math.max(0, camera.x - vHalfW - NEBULA_SIZE);
        const vRight = Math.min(ARENA_SIZE, camera.x + vHalfW + NEBULA_SIZE);
        const vTop = Math.max(0, camera.y - vHalfH - NEBULA_SIZE);
        const vBottom = Math.min(ARENA_SIZE, camera.y + vHalfH + NEBULA_SIZE);

        const startTX = Math.floor(vLeft / NEBULA_SIZE);
        const endTX = Math.ceil(vRight / NEBULA_SIZE);
        const startTY = Math.floor(vTop / NEBULA_SIZE);
        const endTY = Math.ceil(vBottom / NEBULA_SIZE);

        for (let tx = startTX; tx < endTX; tx++) {
            for (let ty = startTY; ty < endTY; ty++) {
                ctx.drawImage(nebulaCanvas, tx * NEBULA_SIZE, ty * NEBULA_SIZE, NEBULA_SIZE, NEBULA_SIZE);
            }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Animated ambient glow pools — slow drifting color hotspots
    // Uses pre-cached gradients rendered via translate to avoid per-frame gradient creation
    if (!lowQuality) {
        const glowTime = performance.now() / 4000;
        const gHalfW = (w / 2) / (camera.zoom * screenScale);
        const gHalfH = (h / 2) / (camera.zoom * screenScale);

        // Initialize cached glow pool canvases once
        if (!render._glowPoolCache) {
            render._glowPoolCache = [
                { bx: 0.15, by: 0.25, r: 450, color: [0, 100, 180], speed: 0.7 },
                { bx: 0.65, by: 0.15, r: 400, color: [80, 30, 120], speed: 0.9 },
                { bx: 0.4, by: 0.55, r: 500, color: [10, 90, 90], speed: 0.5 },
                { bx: 0.85, by: 0.7, r: 380, color: [60, 20, 100], speed: 1.1 },
                { bx: 0.3, by: 0.8, r: 420, color: [20, 70, 130], speed: 0.6 },
                { bx: 0.75, by: 0.45, r: 360, color: [50, 10, 80], speed: 0.8 },
            ].map(gp => {
                // Pre-render each glow pool to an offscreen canvas
                const size = gp.r * 2;
                const c = document.createElement('canvas');
                c.width = size;
                c.height = size;
                const gc = c.getContext('2d');
                const grad = gc.createRadialGradient(gp.r, gp.r, 0, gp.r, gp.r, gp.r);
                grad.addColorStop(0, `rgba(${gp.color[0]}, ${gp.color[1]}, ${gp.color[2]}, 1)`);
                grad.addColorStop(1, 'transparent');
                gc.fillStyle = grad;
                gc.fillRect(0, 0, size, size);
                return { ...gp, canvas: c };
            });
        }

        for (const gp of render._glowPoolCache) {
            const cx = gp.bx * ARENA_SIZE + Math.sin(glowTime * gp.speed) * 200;
            const cy = gp.by * ARENA_SIZE + Math.cos(glowTime * gp.speed * 0.7 + 1) * 200;

            // Skip if off-screen
            if (cx + gp.r < camera.x - gHalfW || cx - gp.r > camera.x + gHalfW ||
                cy + gp.r < camera.y - gHalfH || cy - gp.r > camera.y + gHalfH) continue;

            const pulse = 0.08 + Math.sin(glowTime * gp.speed * 1.5) * 0.03;

            // Draw pre-rendered gradient with animated alpha — much cheaper than creating gradients per frame
            ctx.globalAlpha = pulse;
            ctx.drawImage(gp.canvas, cx - gp.r, cy - gp.r);
            ctx.globalAlpha = 1;
        }
    }

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
    const time = performance.now() / 1000;

    // Visible bounds
    const halfW = (w / 2) / (camera.zoom * screenScale);
    const halfH = (h / 2) / (camera.zoom * screenScale);
    const left = camera.x - halfW - GRID_SIZE;
    const right = camera.x + halfW + GRID_SIZE;
    const top = camera.y - halfH - GRID_SIZE;
    const bottom = camera.y + halfH + GRID_SIZE;

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

    // Draw grid lines
    for (let x = startX; x <= right; x += GRID_SIZE) {
        if (x < 0 || x > ARENA_SIZE) continue;

        ctx.beginPath();
        ctx.moveTo(x, Math.max(0, top));
        ctx.lineTo(x, Math.min(ARENA_SIZE, bottom));

        // Major lines every 5 cells — brighter cyan
        if (x % (GRID_SIZE * 5) === 0) {
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.12)';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(100, 140, 180, 0.06)';
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
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.12)';
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(100, 140, 180, 0.06)';
            ctx.lineWidth = 1;
        }
        ctx.stroke();
    }

    // Glowing dots at major grid intersections (every 5×5 cells)
    if (!lowQuality) {
        const majorStep = GRID_SIZE * 5;
        const majorStartX = Math.floor(left / majorStep) * majorStep;
        const majorStartY = Math.floor(top / majorStep) * majorStep;

        for (let x = majorStartX; x <= right; x += majorStep) {
            if (x < 0 || x > ARENA_SIZE) continue;
            for (let y = majorStartY; y <= bottom; y += majorStep) {
                if (y < 0 || y > ARENA_SIZE) continue;

                // Each dot pulses at a slightly different phase based on position
                const phase = ((x * 7 + y * 13) % 1000) / 1000;
                const pulse = 0.3 + Math.sin(time * 1.5 + phase * Math.PI * 2) * 0.2;

                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 200, 255, ${pulse})`;
                ctx.fill();
            }
        }
    }
}

function drawArenaBorder() {
    ctx.strokeStyle = '#ff3355';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = lowQuality ? 0 : 40;

    // Draw animated border glow
    const time = performance.now() / 500;
    const alpha = 0.5 + Math.sin(time) * 0.2;

    ctx.globalAlpha = alpha;
    ctx.strokeRect(0, 0, ARENA_SIZE, ARENA_SIZE);
    ctx.globalAlpha = 1;

    ctx.shadowBlur = lowQuality ? 0 : 0;
}

function drawFood() {
    const time = performance.now() / 1000;

    // Only draw food in visible range
    const halfW = (canvas.width / 2) / (camera.zoom * screenScale);
    const halfH = (canvas.height / 2) / (camera.zoom * screenScale);
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
        ctx.shadowBlur = lowQuality ? 0 : 10;
        ctx.globalAlpha = 0.6 + pulse * 0.2;
        ctx.stroke();

        // Inner Core
        ctx.beginPath();
        ctx.arc(f.x, f.y, size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = lowQuality ? 0 : 15;
        ctx.globalAlpha = 1;
        ctx.fill();

        // Tinted core
        ctx.beginPath();
        ctx.arc(f.x, f.y, size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.shadowBlur = lowQuality ? 0 : 0;
        ctx.fill();
    }
    ctx.shadowBlur = lowQuality ? 0 : 0;
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

    // Use style renderer
    if (snake.style && snake.style.renderBody) {
        snake.style.renderBody(ctx, snake);
    }

    // Head
    const w = snake.width;
    const headSize = w * 0.85 * snake.headScale;

    ctx.save();
    ctx.translate(snake.x, snake.y);
    const angle = Math.atan2(DIR_VECTORS[snake.dir].y, DIR_VECTORS[snake.dir].x);
    ctx.rotate(angle);

    if (snake.style && snake.style.renderHead) {
        snake.style.renderHead(ctx, snake, headSize);
    }

    ctx.restore();

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
    ctx.shadowBlur = lowQuality ? 0 : 15;

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
    // snake.isPlayer check removed to show player name

    const fontSize = clamp(12 / camera.zoom, 10, 18);
    ctx.font = `600 ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    ctx.shadowColor = '#000';
    ctx.shadowBlur = lowQuality ? 0 : 3;
    ctx.lineWidth = 3;
    ctx.strokeText(snake.name, snake.x, snake.y - snake.width - 16);

    ctx.fillStyle = '#fff';
    ctx.fillText(snake.name, snake.x, snake.y - snake.width - 16);
    ctx.shadowBlur = lowQuality ? 0 : 0;
}

function drawBoostEffect(snake) {
    // Electric crackle along the body
    const time = performance.now() / 1000;

    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.shadowBlur = lowQuality ? 0 : 10;
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
    ctx.shadowBlur = lowQuality ? 0 : 0;
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
    ctx.shadowBlur = lowQuality ? 0 : 20;
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

    ctx.shadowBlur = lowQuality ? 0 : 0;
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
            ctx.shadowBlur = lowQuality ? 0 : 8;
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
            ctx.shadowBlur = lowQuality ? 0 : 10;

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
            ctx.shadowBlur = lowQuality ? 0 : 6;
            ctx.fill();
        }

    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = lowQuality ? 0 : 0;
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
        const vw = (canvas.width / (camera.zoom * screenScale)) * scale;
        const vh = (canvas.height / (camera.zoom * screenScale)) * scale;
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

        const crown = isKing ? '<span class="lb-crown">&#128081;</span>' : '';
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
    // Push history state so the Back button works
    history.pushState({ page: 'game' }, 'In Game', '#game');

    if (nickname) localStorage.setItem('ps_nickname', nickname);
    snakes = [];
    foods = [];
    particles = [];
    floatingTexts = [];

    // Create player with selected style
    const playerStyle = SNAKE_STYLES[playerSnakeStyleIndex];
    player = new Snake(nickname || 'Player', playerStyle, true);
    snakes.push(player);

    // Camera to player (including smooth target buffer + direction angle)
    const spawnDv = DIR_VECTORS[player.dir];
    const spawnLookAhead = 80 + BASE_SPEED * 25;
    camera.x = player.x + spawnDv.x * spawnLookAhead;
    camera.y = player.y + spawnDv.y * spawnLookAhead;
    camera.stX = camera.x;
    camera.stY = camera.y;
    camera.st2X = camera.x;
    camera.st2Y = camera.y;
    camera.zoom = 1.0;

    // Create bots with random styles
    // Collect available style indices (exclude player's style)
    const availableIndices = [];
    for (let i = 0; i < SNAKE_STYLES.length; i++) {
        if (i !== playerSnakeStyleIndex) {
            availableIndices.push(i);
        }
    }

    // Shuffle indices
    for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }

    // Determine how many bots to create (capped by available styles)
    const botsToCreate = Math.min(BOT_COUNT, availableIndices.length);

    for (let i = 0; i < botsToCreate; i++) {
        const index = availableIndices[i];
        const style = SNAKE_STYLES[index];
        const name = style.name;

        const bot = new Snake(name, style, false);

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
    const earnedPoints = player ? player.score : 0;

    if (player && player.score > highScore) {
        highScore = player.score;
        localStorage.setItem('ps_highscore', highScore);
        if (highScoreValue) highScoreValue.textContent = highScore;
    }

    // Award points
    lifetimePoints += earnedPoints;
    currentUnlockProgress += earnedPoints;

    // Check for new unlocks
    pendingUnlocks = checkNewUnlocks();

    // Reset progress so players must earn the next unlock in a single life
    currentUnlockProgress = 0;
    saveUnlockData();

    // Calculate rank
    const allSorted = [...snakes].sort((a, b) => b.score - a.score);
    const rank = allSorted.findIndex(s => s === player) + 1;

    finalScore.textContent = player.score;
    finalLength.textContent = player.segments.length;
    finalRank.textContent = `#${rank}`;

    // Update death screen extras
    if (pointsEarnedEl) {
        pointsEarnedEl.textContent = `+${earnedPoints} PTS`;
        pointsEarnedEl.classList.add('points-pop');
        setTimeout(() => pointsEarnedEl.classList.remove('points-pop'), 600);
    }

    // Next unlock hint on death screen
    if (nextUnlockHint) {
        const next = getNextUnlock();
        if (next) {
            const remaining = next.cost - currentUnlockProgress;
            const pct = Math.min(100, (currentUnlockProgress / next.cost) * 100);
            if (pct >= 70) {
                nextUnlockHint.innerHTML = `<span class="almost-there">ALMOST THERE!</span> <span style="color:${next.tier.color}">${next.name}</span> in <span class="accent">${remaining}</span> pts`;
                nextUnlockHint.classList.remove('hidden');
            } else {
                nextUnlockHint.innerHTML = `Next: <span style="color:${next.tier.color}">${next.name}</span> — ${currentUnlockProgress}/${next.cost} pts`;
                nextUnlockHint.classList.remove('hidden');
            }
        } else {
            nextUnlockHint.textContent = 'ALL SNAKES UNLOCKED!';
            nextUnlockHint.classList.remove('hidden');
        }
    }

    // Short delay before showing death/celebration screen
    setTimeout(() => {
        hud.classList.add('hidden');

        if (pendingUnlocks.length > 0) {
            showUnlockCelebration(pendingUnlocks);
        } else {
            deathScreen.classList.remove('hidden');
        }
    }, 1200);
}

function showUnlockCelebration(unlockedIndices) {
    if (!unlockCelebration) {
        deathScreen.classList.remove('hidden');
        return;
    }

    const container = unlockCelebration.querySelector('.unlock-snakes-list');
    const countEl = unlockCelebration.querySelector('.unlock-count');
    if (container) container.innerHTML = '';
    if (countEl) countEl.textContent = `${unlockedIndices.length} NEW SNAKE${unlockedIndices.length > 1 ? 'S' : ''} UNLOCKED!`;

    unlockedIndices.forEach(idx => {
        const style = SNAKE_STYLES[idx];
        const tier = getSnakeTier(idx);
        const item = document.createElement('div');
        item.className = 'unlock-item';

        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        item.appendChild(canvas);

        const nameEl = document.createElement('div');
        nameEl.className = 'unlock-item-name';
        nameEl.textContent = style.name;
        item.appendChild(nameEl);

        const tierEl = document.createElement('div');
        tierEl.className = 'rarity-badge';
        tierEl.style.color = tier.color;
        tierEl.textContent = tier.label;
        item.appendChild(tierEl);

        if (container) container.appendChild(item);

        requestAnimationFrame(() => renderSnakePreview(canvas, style));
    });

    unlockCelebration.classList.remove('hidden');

    // Play celebration SFX
    if (soundManager && soundManager.ctx) {
        if (soundManager.ctx.state === 'suspended') soundManager.resume();
        // Ascending triumphant chord
        soundManager.playTone({ freq: 523, type: 'triangle', duration: 0.15, vol: 0.25, slide: 100, pan: -0.3 });
        setTimeout(() => soundManager.playTone({ freq: 659, type: 'triangle', duration: 0.15, vol: 0.25, slide: 100, pan: 0 }), 100);
        setTimeout(() => soundManager.playTone({ freq: 784, type: 'triangle', duration: 0.2, vol: 0.3, slide: 100, pan: 0.3 }), 200);
        setTimeout(() => soundManager.playTone({ freq: 1047, type: 'sine', duration: 0.4, vol: 0.2, slide: 50, pan: 0 }), 350);
    }

    const dismissCelebration = () => {
        unlockCelebration.classList.add('hidden');
        deathScreen.classList.remove('hidden');
        unlockCelebration.removeEventListener('click', dismissCelebration);
    };
    unlockCelebration.addEventListener('click', dismissCelebration);
}

function updateNextUnlockTeaser() {
    if (!nextUnlockTeaser) return;
    const next = getNextUnlock();
    if (next) {
        const pct = Math.min(100, (currentUnlockProgress / next.cost) * 100);
        nextUnlockTeaser.innerHTML = `
            <div class="teaser-label">NEXT UNLOCK: <span style="color:${next.tier.color}">${next.name}</span></div>
            <div class="teaser-bar">
                <div class="teaser-fill" style="width:${pct}%;background:${next.tier.color}"></div>
            </div>
            <div class="teaser-pts">${currentUnlockProgress} / ${next.cost} PTS</div>
        `;
        nextUnlockTeaser.classList.remove('hidden');
    } else {
        nextUnlockTeaser.innerHTML = '<div class="teaser-label" style="color:#ff00ff">✦ ALL SNAKES UNLOCKED ✦</div>';
        nextUnlockTeaser.classList.remove('hidden');
    }
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const now = timestamp || performance.now();
    let dt = (now - lastTime) / 1000;
    gameDt = dt;
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
            10: calcScale([1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 25 / 16], 261.63),
            // 11: Celestial (Major 9th - Heavenly)
            11: calcScale([1, 9 / 8, 5 / 4, 3 / 2, 15 / 8, 9 / 4], 329.63),
            // 12: Underworld (Phrygian - Sinister)
            12: calcScale([1, 16 / 15, 4 / 3, 3 / 2, 8 / 5], 164.81),
            // 13: Funky (Mixolydian - Groovy)
            13: calcScale([1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 16 / 9], 196.00),
            // 14: Mystic (Whole Tone - Floating)
            14: calcScale([1, 9 / 8, 81 / 64, 729 / 512, 6561 / 4096, 59049 / 32768], 261.63),
            // 15: Cybernetic (Octatonic - Robotic)
            15: calcScale([1, 9 / 8, 6 / 5, 27 / 20, 36 / 25, 81 / 50], 220.00),
            // 16: Dreamwave (Lydian 9 - Nostalgic)
            16: calcScale([1, 9 / 8, 5 / 4, 45 / 32, 3 / 2, 27 / 16, 15 / 8], 246.94),
            // 17: Frenzy (Chromatic Cluster - Chaos)
            17: calcScale([1, 17 / 16, 9 / 8, 19 / 16, 5 / 4, 21 / 16, 11 / 8], 261.63),
            // 18: Ancestral (Minor Pentatonic - Tribal)
            18: calcScale([1, 6 / 5, 4 / 3, 3 / 2, 9 / 5], 130.81),
            // 19: Hyperpop (Major Pentatonic - Sugary)
            19: calcScale([1, 9 / 8, 5 / 4, 3 / 2, 5 / 3], 523.25),
            // 20: Dissonance (Diminished - Tense)
            20: calcScale([1, 9 / 8, 6 / 5, 27 / 20, 36 / 25, 81 / 50, 216 / 125, 486 / 250], 196.00)
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
            // 11=Celestial, 12=Underworld, 13=Funky, 14=Mystic, 15=Cybernetic, 16=Dreamwave, 17=Frenzy, 18=Ancestral, 19=Hyperpop, 20=Dissonance
            this.comboStyle = Math.floor(Math.random() * 21);
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
        } else if (style === 11) {
            // Celestial
            this.playTone({ freq: freq, type: 'sine', duration: 0.4, vol: 0.3, attack: 0.1, pan: panVar });
            this.playTone({ freq: freq * 2, type: 'triangle', duration: 0.2, vol: 0.1, attack: 0.05, pan: -panVar });
            if (this.combo % 4 === 0) this.playTone({ freq: freq * 4, type: 'sine', duration: 0.5, vol: 0.05, attack: 0.2, pan: 0 });
        } else if (style === 12) {
            // Underworld
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.3, vol: 0.25, attack: 0.1, decay: 0.2, pan: panVar });
            this.playTone({ freq: freq * 0.5, type: 'sine', duration: 0.4, vol: 0.3, pan: 0 });
            if (Math.random() < 0.3) this.playNoise(0.1, 0.1);
        } else if (style === 13) {
            // Funky
            this.playTone({ freq: freq, type: 'square', duration: 0.08, vol: 0.2, pan: panVar });
            setTimeout(() => this.playTone({ freq: freq * 1.5, type: 'square', duration: 0.05, vol: 0.1, pan: -panVar }), 50);
            if (this.combo % 2 === 0) this.playTone({ freq: freq * 0.5, type: 'triangle', duration: 0.1, vol: 0.3, slide: 20, pan: 0 });
        } else if (style === 14) {
            // Mystic
            this.playTone({ freq: freq, type: 'sine', duration: 0.5, vol: 0.25, attack: 0.2, slide: 50, pan: panVar });
            this.playTone({ freq: freq * 1.05, type: 'sine', duration: 0.5, vol: 0.15, attack: 0.2, pan: -panVar });
        } else if (style === 15) {
            // Cybernetic
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.05, vol: 0.3, detune: this.rnd(-20, 20), pan: panVar });
            this.playNoise(0.02, 0.2);
            if (this.combo % 3 === 0) this.playTone({ freq: freq * 2, type: 'square', duration: 0.1, vol: 0.15, slide: -100, pan: 0 });
        } else if (style === 16) {
            // Dreamwave
            this.playTone({ freq: freq, type: 'triangle', duration: 0.3, vol: 0.2, attack: 0.05, pan: panVar });
            setTimeout(() => this.playTone({ freq: freq * 1.5, type: 'sine', duration: 0.6, vol: 0.1, attack: 0.1, pan: -panVar }), 100);
            this.playTone({ freq: freq * 0.5, type: 'sawtooth', duration: 0.3, vol: 0.1, attack: 0.05, pan: 0 });
        } else if (style === 17) {
            // Frenzy
            this.playTone({ freq: freq, type: 'square', duration: 0.1, vol: 0.25, slide: this.rnd(-300, 300), pan: panVar });
            this.playTone({ freq: freq * this.rnd(0.8, 1.2), type: 'sawtooth', duration: 0.1, vol: 0.2, pan: -panVar });
            this.playNoise(0.05, 0.15);
        } else if (style === 18) {
            // Ancestral
            this.playTone({ freq: freq, type: 'triangle', duration: 0.2, vol: 0.4, attack: 0.01, decay: 0.1, pan: 0 });
            if (this.combo % 2 === 0) this.playNoise(0.1, 0.2); // Drum hit
            this.playTone({ freq: freq * 2, type: 'sine', duration: 0.1, vol: 0.2, pan: panVar });
        } else if (style === 19) {
            // Hyperpop
            this.playTone({ freq: freq, type: 'square', duration: 0.1, vol: 0.2, slide: 500, pan: panVar });
            this.playTone({ freq: freq * 1.5, type: 'sine', duration: 0.15, vol: 0.15, pan: -panVar });
            this.playTone({ freq: 100, type: 'sawtooth', duration: 0.1, vol: 0.2, slide: -50, pan: 0 }); // Punchy bass
        } else if (style === 20) {
            // Dissonance
            this.playTone({ freq: freq, type: 'sawtooth', duration: 0.2, vol: 0.2, detune: -10, pan: -0.2 });
            this.playTone({ freq: freq * 1.06, type: 'sawtooth', duration: 0.2, vol: 0.2, detune: 10, pan: 0.2 });
            this.playTone({ freq: freq * 0.5, type: 'square', duration: 0.3, vol: 0.15, pan: 0 });
        }

        // Common Reward/Bass Logic for high combos (scaled by style)
        if (this.combo > 20 && style !== 3) { // Bubblegum doesn't get heavy bass
            this.playTone({ freq: 55, type: 'sine', duration: 0.3, vol: 0.3, attack: 0.05, pan: 0 });
        }
    }

    playBoost(forceStyle = -1) {
        if (!this.ctx) return;

        // Pick a style for this boost session (syncs with hum)
        // 0-5 Original, 6-10 New
        if (forceStyle !== -1) {
            this.currentBoostStyle = forceStyle;
        } else {
            this.currentBoostStyle = Math.floor(Math.random() * 21);
        }
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
        } else if (variant === 11) {
            // VORTEX (Swirling, phased)
            this.playTone({ freq: 200, type: 'sine', duration: 0.5, vol: 0.4, slide: -50, attack: 0.1, pan: panVar });
            this.playTone({ freq: 205, type: 'sine', duration: 0.5, vol: 0.4, slide: -45, attack: 0.1, pan: -panVar });
            this.playNoise(0.3, 0.2);
        } else if (variant === 12) {
            // LASER (Pew pew)
            this.playTone({ freq: 1500, type: 'sawtooth', duration: 0.2, vol: 0.3, slide: -1000, attack: 0.01, pan: panVar });
            setTimeout(() => this.playTone({ freq: 1200, type: 'square', duration: 0.2, vol: 0.2, slide: -800, pan: -panVar }), 50);
        } else if (variant === 13) {
            // METEOR (Deep impact with trail)
            this.playTone({ freq: 80, type: 'square', duration: 0.4, vol: 0.5, slide: -30, attack: 0.05, pan: 0 });
            this.playNoise(0.6, 0.3);
            this.playTone({ freq: 400, type: 'triangle', duration: 0.6, vol: 0.2, slide: -200, pan: panVar });
        } else if (variant === 14) {
            // PULSAR (Rhythmic beating)
            for (let i = 0; i < 4; i++) {
                setTimeout(() => this.playTone({ freq: 300, type: 'sawtooth', duration: 0.1, vol: 0.3, pan: panVar }), i * 100);
            }
            this.playTone({ freq: 100, type: 'sine', duration: 0.5, vol: 0.4, slide: 50, pan: 0 });
        } else if (variant === 15) {
            // GHOST RIDE (Eerie wail)
            this.playTone({ freq: 600, type: 'sine', duration: 0.8, vol: 0.3, slide: 200, attack: 0.3, pan: panVar });
            this.playTone({ freq: 610, type: 'triangle', duration: 0.8, vol: 0.2, slide: 190, attack: 0.3, pan: -panVar });
        } else if (variant === 16) {
            // STAMPEDE (Multiple low thuds)
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone({ freq: 60 + this.rnd(-10, 10), type: 'square', duration: 0.1, vol: 0.4, slide: -20, pan: this.rnd(-0.5, 0.5) }), i * 80);
            }
        } else if (variant === 17) {
            // SUB-ZERO (Glassy, icy)
            this.playTone({ freq: 2000, type: 'triangle', duration: 0.3, vol: 0.2, attack: 0.05, pan: panVar });
            this.playTone({ freq: 3000, type: 'sine', duration: 0.4, vol: 0.1, slide: 500, pan: -panVar });
            this.playNoise(0.2, 0.1);
        } else if (variant === 18) {
            // INFERNO (Roaring fire)
            this.playNoise(0.7, 0.4); // Fire roar
            this.playTone({ freq: 120, type: 'sawtooth', duration: 0.7, vol: 0.3, detune: 15, pan: panVar });
            this.playTone({ freq: 115, type: 'sawtooth', duration: 0.7, vol: 0.3, detune: -15, pan: -panVar });
        } else if (variant === 19) {
            // MECH (Metallic clanks)
            this.playTone({ freq: 400, type: 'square', duration: 0.15, vol: 0.4, detune: this.rnd(-50, 50), pan: panVar });
            setTimeout(() => this.playTone({ freq: 300, type: 'square', duration: 0.1, vol: 0.3, detune: this.rnd(-50, 50), pan: -panVar }), 100);
            this.playTone({ freq: 80, type: 'sawtooth', duration: 0.3, vol: 0.5, slide: -20, pan: 0 });
        } else if (variant === 20) {
            // SINGULARITY (Extreme suck)
            this.playTone({ freq: 50, type: 'sine', duration: 0.6, vol: 0.6, slide: 800, attack: 0.1, pan: 0 });
            this.playNoise(0.5, 0.2);
            for (let i = 0; i < 3; i++) {
                setTimeout(() => this.playTone({ freq: 1000 + i * 500, type: 'triangle', duration: 0.1, vol: 0.2, pan: panVar }), i * 150);
            }
        }
    }

    playKill() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 21);
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
        } else if (variant === 11) {
            // JUDGEMENT (Choir hit)
            this.playTone({ freq: 300, type: 'triangle', duration: 1.0, vol: 0.5, slide: -50, pan: 0 });
            this.playTone({ freq: 450, type: 'triangle', duration: 1.0, vol: 0.4, slide: -50, pan: -0.2 });
            this.playTone({ freq: 600, type: 'triangle', duration: 1.0, vol: 0.4, slide: -50, pan: 0.2 });
        } else if (variant === 12) {
            // SNIPER (Sharp crack)
            this.playNoise(0.05, 0.8);
            this.playTone({ freq: 2000, type: 'square', duration: 0.1, vol: 0.5, slide: -1500, pan: 0 });
            setTimeout(() => this.playTone({ freq: 60, type: 'sine', duration: 0.4, vol: 0.4, slide: -20, attack: 0.05 }), 100);
        } else if (variant === 13) {
            // VENOM (Acid sizzle)
            this.playNoise(0.8, 0.4);
            this.playTone({ freq: 800, type: 'sawtooth', duration: 0.8, vol: 0.3, slide: -400, detune: 20 });
            this.playTone({ freq: 805, type: 'sawtooth', duration: 0.8, vol: 0.3, slide: -400, detune: -20 });
        } else if (variant === 14) {
            // OBLITERATION (White noise explosion)
            this.playNoise(1.0, 0.7);
            for (let i = 0; i < 10; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(50, 200), type: 'square', duration: 0.1, vol: 0.3, pan: this.rnd(-0.5, 0.5) }), i * 50);
            }
        } else if (variant === 15) {
            // SOUL STEAL (Pitch bend up)
            this.playTone({ freq: 150, type: 'sine', duration: 0.8, vol: 0.5, slide: 800, attack: 0.1 });
            this.playTone({ freq: 300, type: 'sine', duration: 0.8, vol: 0.3, slide: 1600, attack: 0.1 });
        } else if (variant === 16) {
            // ANNIHILATION (Multiple bass bombs)
            [0, 150, 300].forEach((t, i) => {
                setTimeout(() => {
                    this.playTone({ freq: 100 - (i * 20), type: 'square', duration: 0.3, vol: 0.6, slide: -40 });
                    this.playNoise(0.1, 0.4);
                }, t);
            });
        } else if (variant === 17) {
            // EXECUTION (Guillotine snick)
            this.playTone({ freq: 4000, type: 'sawtooth', duration: 0.05, vol: 0.3, pan: 0 });
            setTimeout(() => this.playNoise(0.1, 0.8), 50);
            setTimeout(() => this.playTone({ freq: 40, type: 'sine', duration: 0.5, vol: 0.6, attack: 0.01 }), 100);
        } else if (variant === 18) {
            // BANISHMENT (Low drone fading)
            this.playTone({ freq: 60, type: 'sawtooth', duration: 2.0, vol: 0.6, slide: -30, attack: 0.01 });
            this.playNoise(2.0, 0.2);
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone({ freq: 1000, type: 'triangle', duration: 0.1, vol: 0.1 }), i * 300);
            }
        } else if (variant === 19) {
            // SHREDDER (Sawtooth rips)
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    this.playTone({ freq: 200, type: 'sawtooth', duration: 0.1, vol: 0.4, slide: 100, pan: (i % 2 ? 0.3 : -0.3) });
                }, i * 40);
            }
            setTimeout(() => this.playTone({ freq: 50, type: 'sine', duration: 0.5, vol: 0.5, slide: -20 }), 240);
        } else if (variant === 20) {
            // TRIUMPH (Major chord hit)
            [1, 1.25, 1.5].forEach(r => {
                this.playTone({ freq: 261.63 * r, type: 'sawtooth', duration: 0.8, vol: 0.3, attack: 0.05 });
            });
            this.playNoise(0.4, 0.3);
        }
    }

    playDie() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 21);
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
        } else if (variant === 11) {
            // DESPAIR (Minor fall)
            [800, 672, 600, 480].forEach((f, i) => {
                setTimeout(() => this.playTone({ freq: f, type: 'sine', duration: 0.4, vol: 0.4 }), i * 200);
            });
        } else if (variant === 12) {
            // MELTDOWN (Rising siren then stop)
            this.playTone({ freq: 400, type: 'square', duration: 1.0, vol: 0.3, slide: 800 });
            setTimeout(() => this.playTone({ freq: 50, type: 'sawtooth', duration: 0.4, vol: 0.5, slide: -20 }), 1000);
        } else if (variant === 13) {
            // EVAPORATE (High noise fade)
            this.playNoise(1.5, 0.5);
            this.playTone({ freq: 3000, type: 'sine', duration: 1.5, vol: 0.2, slide: 1000 });
        } else if (variant === 14) {
            // FRACTURE (Staggered breaks)
            [0, 150, 400, 700].forEach(t => {
                setTimeout(() => this.playNoise(0.05, 0.6), t);
            });
        } else if (variant === 15) {
            // SUFFOCATE (Muffled thuds)
            [0, 300, 600].forEach(t => {
                setTimeout(() => this.playTone({ freq: 100, type: 'sine', duration: 0.3, vol: 0.6, slide: -50 }), t);
            });
        } else if (variant === 16) {
            // WITHER (Slowly losing pitch)
            this.playTone({ freq: 440, type: 'sawtooth', duration: 2.5, vol: 0.3, slide: -400 });
            this.playTone({ freq: 445, type: 'sawtooth', duration: 2.5, vol: 0.3, slide: -405 });
        } else if (variant === 17) {
            // CORRUPT (Rapid random notes)
            for (let i = 0; i < 15; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(100, 1000), type: 'square', duration: 0.05, vol: 0.2 }), i * 40);
            }
        } else if (variant === 18) {
            // ECHOES (Delay taps fading)
            for (let i = 0; i < 5; i++) {
                setTimeout(() => this.playTone({ freq: 200, type: 'triangle', duration: 0.1, vol: 0.4 * (1 - i / 5) }), i * 250);
            }
        } else if (variant === 19) {
            // IMPALE (Sharp spike then groan)
            this.playTone({ freq: 2000, type: 'sawtooth', duration: 0.1, vol: 0.3, slide: -1500 });
            setTimeout(() => this.playTone({ freq: 60, type: 'sine', duration: 1.0, vol: 0.5, attack: 0.1 }), 100);
        } else if (variant === 20) {
            // ACCEPTANCE (Peaceful major fade)
            this.playTone({ freq: 261.63, type: 'sine', duration: 2.0, vol: 0.3, decay: 1.0 }); // C
            this.playTone({ freq: 329.63, type: 'sine', duration: 2.0, vol: 0.3, decay: 1.0 }); // E
            this.playTone({ freq: 392.00, type: 'sine', duration: 2.0, vol: 0.3, decay: 1.0 }); // G
        }
    }

    playStart() {
        if (!this.ctx) return;
        const variant = Math.floor(Math.random() * 21);

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
        } else if (variant === 11) {
            // ASCENSION (Major arpeggio up)
            [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
                setTimeout(() => this.playTone({ freq: f, type: 'triangle', duration: 0.4, vol: 0.2, attack: 0.05 }), i * 150);
            });
            setTimeout(() => this.playNoise(1.0, 0.1), 1000);
        } else if (variant === 12) {
            // WAKE UP (Alarm sequence)
            for (let i = 0; i < 4; i++) {
                setTimeout(() => this.playTone({ freq: 800, type: 'square', duration: 0.1, vol: 0.3, pan: (i % 2 ? 0.5 : -0.5) }), i * 200);
            }
            setTimeout(() => this.playTone({ freq: 400, type: 'sawtooth', duration: 1.0, vol: 0.4, slide: 400 }), 800);
        } else if (variant === 13) {
            // NEURAL LINK (Dial-upish rapid tones)
            for (let i = 0; i < 20; i++) {
                setTimeout(() => this.playTone({ freq: this.rnd(500, 3000), type: 'square', duration: 0.05, vol: 0.15, pan: this.rnd(-0.5, 0.5) }), i * 40);
            }
            setTimeout(() => this.playTone({ freq: 880, type: 'sine', duration: 1.0, vol: 0.3, attack: 0.1 }), 800);
        } else if (variant === 14) {
            // BEHEMOTH (Massive low groan evolving)
            this.playTone({ freq: 40, type: 'sawtooth', duration: 2.0, vol: 0.5, slide: 30, attack: 1.0 });
            this.playTone({ freq: 41, type: 'sawtooth', duration: 2.0, vol: 0.5, slide: 31, attack: 1.0 });
            setTimeout(() => this.playNoise(0.5, 0.4), 1800);
        } else if (variant === 15) {
            // VELOCITY (Fast wind up)
            this.playNoise(1.5, 0.3);
            this.playTone({ freq: 100, type: 'triangle', duration: 1.2, vol: 0.4, slide: 2000, attack: 0.2 });
            setTimeout(() => this.playTone({ freq: 2000, type: 'sine', duration: 0.5, vol: 0.2, decay: 0.2 }), 1200);
        } else if (variant === 16) {
            // HARMONY (Rich chords)
            this.playTone({ freq: 220, type: 'sawtooth', duration: 2.0, vol: 0.2, attack: 0.5 });
            this.playTone({ freq: 277.18, type: 'sawtooth', duration: 2.0, vol: 0.2, attack: 0.5 }); // C#
            this.playTone({ freq: 329.63, type: 'sawtooth', duration: 2.0, vol: 0.2, attack: 0.5 }); // E
            this.playTone({ freq: 440, type: 'sawtooth', duration: 2.0, vol: 0.2, attack: 0.5 }); // A
        } else if (variant === 17) {
            // GLITCH BOOT (Stuttering start)
            [0, 50, 150, 200, 350, 400, 600].forEach(t => {
                setTimeout(() => this.playTone({ freq: 150, type: 'square', duration: 0.05, vol: 0.4 }), t);
            });
            setTimeout(() => this.playTone({ freq: 150, type: 'sawtooth', duration: 1.0, vol: 0.4, slide: 150 }), 650);
        } else if (variant === 18) {
            // SONAR (Deep pings)
            this.playTone({ freq: 800, type: 'sine', duration: 0.5, vol: 0.4, attack: 0.01, decay: 0.3 });
            setTimeout(() => this.playTone({ freq: 800, type: 'sine', duration: 0.5, vol: 0.3, attack: 0.01, decay: 0.3, pan: 0.5 }), 600);
            setTimeout(() => this.playTone({ freq: 800, type: 'sine', duration: 0.5, vol: 0.2, attack: 0.01, decay: 0.3, pan: -0.5 }), 1200);
        } else if (variant === 19) {
            // OVERCHARGE (Rising noise and pitch)
            this.playNoise(2.0, 0.5); // Gets loud
            this.playTone({ freq: 50, type: 'square', duration: 2.0, vol: 0.4, slide: 400, attack: 0.5 });
            setTimeout(() => this.playTone({ freq: 450, type: 'sine', duration: 0.5, vol: 0.5, attack: 0.01 }), 2000); // Bloom
        } else if (variant === 20) {
            // EUPHORIA (Fast Lydian run)
            [261.63, 293.66, 329.63, 370.00, 392.00, 440.00, 493.88, 523.25].forEach((f, i) => {
                setTimeout(() => this.playTone({ freq: f, type: 'triangle', duration: 0.2, vol: 0.25 }), i * 100);
            });
            setTimeout(() => {
                this.playTone({ freq: 523.25, type: 'sine', duration: 1.5, vol: 0.3, attack: 0.1 });
                this.playTone({ freq: 659.25, type: 'sine', duration: 1.5, vol: 0.2, attack: 0.1 }); // E
                this.playTone({ freq: 783.99, type: 'sine', duration: 1.5, vol: 0.2, attack: 0.1 }); // G
            }, 800);
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
                if (style === 1 || style === 5 || style === 7 || style === 10 || style === 11 || style === 14 || style === 15 || style === 20) type = 'sine'; // Warp, Sonic, Nebula, Quantum, Vortex, Pulsar, Ghost, Singularity
                if (style === 4 || style === 6 || style === 9 || style === 12 || style === 13 || style === 16 || style === 19) type = 'square'; // Cyber, Plasma, Slipstream, Laser, Meteor, Stampede, Mech
                if (style === 8 || style === 17 || style === 18) type = 'sawtooth'; // Overdrive, Sub-Zero, Inferno

                this.boostNodes.humOsc1.type = type;
                this.boostNodes.humOsc2.type = type;

                // LFO Type
                const sawLFO = [4, 6, 8, 12, 18, 19];
                const squareLFO = [0, 2, 9, 13, 16];
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
            } else if (style === 11) {
                // VORTEX
                const strain = 150 + (intensity * 150);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.2);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.05, now, 0.2);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(800 + intensity * 800, now, 0.2);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(5, now, 0.1);
            } else if (style === 12) {
                // LASER
                const strain = 800 + (intensity * 800);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.05);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain + 10, now, 0.05);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(1500, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(20 + intensity * 40, now, 0.1);
            } else if (style === 13) {
                // METEOR
                const strain = 60 + (intensity * 40);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.5);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain + 5, now, 0.5);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(400, now, 0.5);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(10, now, 0.5);
            } else if (style === 14) {
                // PULSAR
                const strain = 100 + (intensity * 100);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.5, now, 0.1);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(1000 + intensity * 1000, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(8 + intensity * 8, now, 0.1);
            } else if (style === 15) {
                // GHOST
                const strain = 400 + (intensity * 200);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 1.0);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain + 2, now, 1.0);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(2000, now, 1.0);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(3, now, 1.0);
            } else if (style === 16) {
                // STAMPEDE
                const strain = 50 + (intensity * 30);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.1, now, 0.1);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(300, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(15 + intensity * 15, now, 0.1);
            } else if (style === 17) {
                // SUB-ZERO
                const strain = 2000 + (intensity * 1000);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.2);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 1.02, now, 0.2);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(3000, now, 0.2);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(30, now, 0.2);
            } else if (style === 18) {
                // INFERNO
                const strain = 80 + (intensity * 80);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.3);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain + 15, now, 0.3);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(800 + intensity * 800, now, 0.3);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(10 + intensity * 20, now, 0.3);
            } else if (style === 19) {
                // MECH
                const strain = 150 + (intensity * 250);
                this.boostNodes.humOsc1.frequency.setTargetAtTime(strain, now, 0.1);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(strain * 0.5, now, 0.1);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(1000, now, 0.1);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(50, now, 0.1);
            } else if (style === 20) {
                // SINGULARITY
                const strain = 100 - (intensity * 60); // Pitch goes DOWN as intensity increases
                this.boostNodes.humOsc1.frequency.setTargetAtTime(Math.max(20, strain), now, 0.5);
                this.boostNodes.humOsc2.frequency.setTargetAtTime(Math.max(21, strain + 1), now, 0.5);
                this.boostNodes.crackleFilter.frequency.setTargetAtTime(5000 - intensity * 4000, now, 0.5);
                this.boostNodes.crackleLFO.frequency.setTargetAtTime(1 + intensity * 9, now, 0.5);
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
    // soundManager.resume();
    // startGame(player ? player.name : 'Player');
    respawnPlayer();
});

function respawnPlayer() {
    if (!player) return;
    soundManager.resume();

    // Remove old player from snakes array
    snakes = snakes.filter(s => s !== player);

    // Create new player
    const playerStyle = SNAKE_STYLES[playerSnakeStyleIndex];
    const name = (player && player.name) || 'Player';
    player = new Snake(name, playerStyle, true);

    snakes.push(player);

    // Reset Camera Immediately (including smooth target buffer + direction)
    const respawnDv = DIR_VECTORS[player.dir];
    const respawnLookAhead = 80 + BASE_SPEED * 25;
    camera.x = player.x + respawnDv.x * respawnLookAhead;
    camera.y = player.y + respawnDv.y * respawnLookAhead;
    camera.stX = camera.x;
    camera.stY = camera.y;
    camera.st2X = camera.x;
    camera.st2Y = camera.y;
    camera.zoom = 1.0;

    // UI Reset
    deathScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    deathTime = 0;

    // Reset scores/boosts/shake
    screenShake = 0;

    soundManager.playStart();
}

deathHomeButton.addEventListener('click', () => {
    // We used pushState, so going back will trigger the popstate event
    // which handles the cleanup and navigation to home.
    history.back();
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

// Handle Android Back Button (History API)
window.addEventListener('popstate', (event) => {
    // If we pop back to the initial state (null) or a non-game state
    // AND we are currently in a "game" context (running or dead)
    if (!event.state || event.state.page !== 'game') {
        goToHomeScreen();
    }
});

function goToHomeScreen() {
    gameRunning = false;
    soundManager.resume(); // Ensure context is active

    // Hide all in-game layers
    if (hud) hud.classList.add('hidden');
    if (deathScreen) deathScreen.classList.add('hidden');
    if (typeof snakeSelectionScreen !== 'undefined') {
        snakeSelectionScreen.classList.add('hidden');
    }

    // Show Start Screen
    if (startScreen) startScreen.classList.remove('hidden');
    updateNextUnlockTeaser();

    // Reset inputs
    if (nicknameInput) nicknameInput.focus();
}

// Focus nickname input on load
const lowQualityToggle = document.getElementById('lowQualityToggle');

window.addEventListener('load', () => {
    loadSettings();
    updateNextUnlockTeaser();
    nicknameInput.focus();
});

function loadSettings() {
    try {
        const savedName = localStorage.getItem('ps_nickname');
        if (savedName) nicknameInput.value = savedName;

        const savedScore = localStorage.getItem('ps_highscore');
        if (savedScore) {
            highScore = parseInt(savedScore, 10);
            if (highScoreValue) highScoreValue.textContent = highScore;
        }

        const savedStyle = localStorage.getItem('ps_style');
        if (savedStyle) playerSnakeStyleIndex = parseInt(savedStyle, 10);

        const savedQuality = localStorage.getItem('ps_quality');
        if (savedQuality !== null) {
            lowQuality = (savedQuality === 'true');
        } else {
            lowQuality = true; // Default
        }

        // Load unlock data
        const savedLP = localStorage.getItem('ps_lifetime_points');
        if (savedLP) lifetimePoints = parseInt(savedLP, 10) || 0;

        const savedProgress = localStorage.getItem('ps_unlock_progress');
        if (savedProgress) currentUnlockProgress = parseInt(savedProgress, 10) || 0;

        const savedUnlocks = localStorage.getItem('ps_unlocked_snakes');
        if (savedUnlocks) {
            try {
                const arr = JSON.parse(savedUnlocks);
                unlockedSnakes = new Set(arr);
            } catch (_) { }
        }
        // Ensure starters are always unlocked
        unlockedSnakes.add(0);
        unlockedSnakes.add(1);
        unlockedSnakes.add(2);

        // If selected snake is locked, reset to first unlocked
        if (!unlockedSnakes.has(playerSnakeStyleIndex)) {
            playerSnakeStyleIndex = 0;
        }

        if (lowQualityToggle) lowQualityToggle.checked = lowQuality;
    } catch (e) {
        console.warn('LocalStorage error:', e);
    }
}

if (lowQualityToggle) {
    lowQualityToggle.addEventListener('change', (e) => {
        lowQuality = e.target.checked;
        localStorage.setItem('ps_quality', lowQuality);
    });
}

// Handle visibility change to pause audio/logic
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (soundManager.ctx && soundManager.ctx.state === 'running') {
            soundManager.ctx.suspend();
        }
    } else {
        if (soundManager.ctx && soundManager.ctx.state === 'suspended') {
            soundManager.ctx.resume();
        }
    }
});

// ---- Snake Selection UI ----

function initSelectionScreen() {
    snakeGrid.innerHTML = '';
    const nextUp = getNextUnlock(); // The single next snake to unlock

    const baseOrder = [0, 1, 2, ...UNLOCK_ORDER];

    const displayOrder = [...baseOrder].sort((a, b) => {
        const aUnlocked = isSnakeUnlocked(a);
        const bUnlocked = isSnakeUnlocked(b);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
        return baseOrder.indexOf(a) - baseOrder.indexOf(b);
    });

    displayOrder.forEach((index) => {
        const style = SNAKE_STYLES[index];
        const card = document.createElement('div');
        const unlocked = isSnakeUnlocked(index);
        const tier = getSnakeTier(index);
        const cost = getSnakeCost(index);
        const isNextUnlock = nextUp && nextUp.index === index;

        card.className = `snake-card${index === playerSnakeStyleIndex ? ' selected' : ''}${!unlocked ? ' locked' : ''}${isNextUnlock ? ' next-unlock' : ''}`;
        card.onclick = () => selectSnake(index, card);

        // Canvas for preview
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        card.appendChild(canvas);

        // Name
        const name = document.createElement('div');
        name.className = 'snake-name';
        name.textContent = style.name;
        card.appendChild(name);

        // Rarity badge
        const badge = document.createElement('div');
        badge.className = 'rarity-badge';
        badge.style.color = tier.color;
        badge.style.borderColor = tier.color;
        badge.textContent = tier.label;
        card.appendChild(badge);

        // Lock overlay for locked snakes
        if (!unlocked) {
            const lockOverlay = document.createElement('div');
            lockOverlay.className = 'lock-overlay';

            const lockIcon = document.createElement('div');
            lockIcon.className = 'lock-icon';
            lockIcon.textContent = '\uD83D\uDD12';
            lockOverlay.appendChild(lockIcon);

            // Only show progress bar on the NEXT snake to unlock
            if (isNextUnlock) {
                const progressWrap = document.createElement('div');
                progressWrap.className = 'progress-bar';
                const progressFill = document.createElement('div');
                progressFill.className = 'progress-fill';
                const pct = Math.min(100, (currentUnlockProgress / cost) * 100);
                progressFill.style.width = `${pct}%`;
                progressFill.style.background = tier.color;
                progressWrap.appendChild(progressFill);
                lockOverlay.appendChild(progressWrap);

                const costLabel = document.createElement('div');
                costLabel.className = 'cost-label';
                costLabel.textContent = `${currentUnlockProgress}/${cost}`;
                lockOverlay.appendChild(costLabel);
            } else {
                const costLabel = document.createElement('div');
                costLabel.className = 'cost-label';
                costLabel.textContent = `${cost} PTS`;
                lockOverlay.appendChild(costLabel);
            }

            card.appendChild(lockOverlay);
        }

        snakeGrid.appendChild(card);

        // Render preview
        requestAnimationFrame(() => renderSnakePreview(canvas, style));
    });
}

function selectSnake(index, cardEl) {
    if (index < 0 || index >= SNAKE_STYLES.length) return;

    // Deny if locked
    if (!isSnakeUnlocked(index)) {
        // Shake animation
        if (cardEl) {
            cardEl.classList.add('shake-deny');
            setTimeout(() => cardEl.classList.remove('shake-deny'), 400);
        }
        // Denied buzz SFX
        if (soundManager && soundManager.ctx) {
            if (soundManager.ctx.state === 'suspended') soundManager.resume();
            soundManager.playTone({ freq: 100, type: 'sawtooth', duration: 0.15, vol: 0.15, slide: -30, pan: 0 });
        }
        return;
    }

    playerSnakeStyleIndex = index;
    localStorage.setItem('ps_style', index);

    // Update UI
    const cards = snakeGrid.children;
    for (let i = 0; i < cards.length; i++) {
        cards[i].classList.remove('selected');
    }
    if (cardEl) {
        cardEl.classList.add('selected');
    }

    // Play selection sound
    if (soundManager && soundManager.ctx) {
        if (soundManager.ctx.state === 'suspended') soundManager.resume();
        const freq = 200 + (index * 20);
        soundManager.playTone({ freq: freq, type: 'triangle', duration: 0.1, vol: 0.2, slide: 50, pan: 0 });
    }
}

function renderSnakePreview(canvas, style) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Check if style has renderBody/renderHead
    if (!style.renderBody) return;

    // Create a dummy snake object for rendering
    // We create a "S" shape or a circle
    const dummySnake = {
        x: w / 2,
        y: h / 2,
        width: 6,
        segments: [],
        style: style,
        boostIntensity: 0,
        headScale: 1.0,
        alive: true
    };

    // Create points
    const points = 10;
    // Spiral
    for (let i = 0; i < points; i++) {
        const angle = (i * 0.5) - 1.0;
        const radius = 25 - (i * 1.5);
        dummySnake.segments.push({
            x: w / 2 + Math.cos(angle) * radius - (i * 2) + 10,
            y: h / 2 + Math.sin(angle) * (radius * 0.8) + (i * 2) - 5
        });
    }

    dummySnake.x = dummySnake.segments[0].x;
    dummySnake.y = dummySnake.segments[0].y;

    // Draw Body
    ctx.save();
    // Scale up for better visibility
    ctx.translate(w / 2, h / 2);
    ctx.scale(1.2, 1.2);
    ctx.translate(-w / 2, -h / 2);

    style.renderBody(ctx, dummySnake);

    // Head
    const headSize = dummySnake.width * 0.9;
    ctx.translate(dummySnake.x, dummySnake.y);
    // Rotate head slightly to match the "movement"
    ctx.rotate(-0.5);
    style.renderHead(ctx, dummySnake, headSize);

    ctx.restore();
}

// ---- State ----
let selectionSource = 'start';

// ---- Additional Event Listeners ----
selectSnakeButton.addEventListener('click', () => {
    selectionSource = 'start';
    soundManager.init(); // Ensure audio context is ready
    soundManager.resume();

    initSelectionScreen();
    startScreen.classList.add('hidden');
    snakeSelectionScreen.classList.remove('hidden');
});

deathSelectionButton.addEventListener('click', () => {
    soundManager.resume();
    selectionSource = 'death';
    initSelectionScreen();
    deathScreen.classList.add('hidden');
    snakeSelectionScreen.classList.remove('hidden');
});

backButton.addEventListener('click', () => {
    soundManager.resume();
    snakeSelectionScreen.classList.add('hidden');

    if (selectionSource === 'death') {
        deathScreen.classList.remove('hidden');
    } else {
        startScreen.classList.remove('hidden');
    }
});


