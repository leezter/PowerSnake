# Agent / AI Assistant Instructions

## Running the Game

**PowerSnake is a fully offline, single-file HTML game. It does NOT require a server.**

To open the game, simply open `index.html` directly in a browser:

```
start c:\Users\leezt\source\repos\PowerSnake\index.html
```

Or double-click `index.html` in Explorer. No `npm install`, no `npm start`, no `http-server`.

> [!IMPORTANT]
> The automated browser testing tool used in this project (Playwright/Antigravity) **blocks `file://` URLs**. This means that when a browser subagent needs to take screenshots or interact with the game visually, it must be served over HTTP. This is a limitation of the testing environment only — the end user always opens the game directly as a file.
>
> **When spinning up a temporary test server**, use:
> ```powershell
> npx -y http-server . -p 8080 --cors
> ```
> Then access the game at `http://127.0.0.1:8080/index.html`. Kill the server when done.

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Entry point. All screens (menu, death, HUD) are defined here as `div` overlays |
| `style.css` | All styling, including responsive breakpoints |
| `game.js` | All game logic (snakes, AI, rendering, progression) |
| `fonts/` | Local font files (Orbitron, Rajdhani) for offline use |
| `GAME_MECHANICS.md` | Detailed documentation of gameplay systems and mechanics |

## Key CSS Architecture Notes

- Screens are controlled by toggling the `.hidden` class on overlay `div`s
- Responsive breakpoints: `max-width: 768px`, `max-width: 430px`, `max-height: 500px` + `orientation: landscape`, and `max-width: 768px` + `orientation: portrait`
- The landscape media query (`max-height: 500px and orientation: landscape`) is the only one that targets small-height landscape mobile — do not use `max-width` alone for landscape fixes
