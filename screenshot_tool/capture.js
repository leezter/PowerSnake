const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log("Starting Puppeteer...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set 16:9 viewport
    await page.setViewport({ width: 1920, height: 1080 });

    const targetUrl = 'file:///C:/Users/leezt/source/repos/PowerSnake/index.html';
    console.log(`Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    console.log("Waiting for game to load...");
    await page.waitForSelector('#playButton', { visible: true });

    // 0. Ensure fresh state so unlocks will trigger properly at the end
    await page.evaluate(() => {
        localStorage.clear();
        const toggle = document.getElementById('lowQualityToggle');
        if (toggle && toggle.checked) toggle.click(); // Best graphics!
    });

    const imagesDir = path.join(__dirname, '..', 'store_images');
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir);
    }

    // 1. Start Menu
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(imagesDir, '1_start_menu.png') });
    console.log(`Saved 1_start_menu.png`);

    // 2. Snake Selection Screen
    console.log("Going to Snake Selection Screen...");
    await page.click('#selectSnakeButton');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(imagesDir, '2_snake_selection.png') });
    console.log(`Saved 2_snake_selection.png`);

    await page.click('#backButton');
    await new Promise(r => setTimeout(r, 1000));

    // Start Game
    console.log("Starting game...");
    await page.click('#playButton');
    await new Promise(r => setTimeout(r, 1000));

    // Arena Shots (4 shots with variations)
    for (let i = 1; i <= 4; i++) {
        await page.evaluate((seed) => {
            if (typeof player !== 'undefined' && player && typeof snakes !== 'undefined' && typeof SNAKE_STYLES !== 'undefined') {
                // Randomize player style and give variable length
                player.style = SNAKE_STYLES[Math.floor(Math.random() * SNAKE_STYLES.length)];
                player.score = 500 + Math.random() * 8000;
                let pLength = 20 + Math.floor(Math.random() * 60);
                player.segments = [];
                for (let j = 0; j < pLength; j++) player.segments.push({ x: player.x, y: player.y });

                // Randomize bots and bunch them around the player
                for (let bot of snakes) {
                    if (bot !== player && bot.alive) {
                        bot.style = SNAKE_STYLES[Math.floor(Math.random() * SNAKE_STYLES.length)];
                        bot.score = 100 + Math.random() * 5000;
                        let bLength = 10 + Math.floor(Math.random() * 50);
                        bot.segments = [];

                        let dx = (Math.random() - 0.5) * 1600;
                        let dy = (Math.random() - 0.5) * 900;
                        bot.x = player.x + dx;
                        bot.y = player.y + dy;
                        for (let j = 0; j < bLength; j++) bot.segments.push({ x: bot.x, y: bot.y });
                    }
                }
            }
        }, i);

        // Issue a random direction and wait for them to spread naturally
        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        await page.keyboard.press(keys[i % 4]);
        await new Promise(r => setTimeout(r, 1500));

        const shotPath = path.join(imagesDir, `3_arena_action_${i}.png`);
        await page.screenshot({ path: shotPath });
        console.log(`Saved 3_arena_action_${i}.png`);
    }

    // 7. Unlock Celebration & 8. Eliminated Screen
    console.log("Triggering death and unlock sequence...");
    await page.evaluate(() => {
        if (typeof player !== 'undefined' && player) {
            player.score = 5000; // Will definitely trigger at least one new unlock on fresh save
            player.x = -1000;     // Force out-of-bounds immediate death
        }
    });

    // Wait 2000ms. Death is triggered instantly, wait for 1200ms delay + DOM pop
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(imagesDir, '7_unlock_celebration.png') });
    console.log(`Saved 7_unlock_celebration.png`);

    // Dismiss Celebration / Force transition to Eliminated Screen
    await page.evaluate(() => {
        document.getElementById('unlockCelebration').classList.add('hidden');
        document.getElementById('deathScreen').classList.remove('hidden');
    });

    await new Promise(r => setTimeout(r, 500));

    await page.screenshot({ path: path.join(imagesDir, '8_eliminated_screen.png') });
    console.log(`Saved 8_eliminated_screen.png`);

    console.log("Done!");
    await browser.close();
})();
