# WorldCupMonitor

Interactive Three.js / WebGL 3D globe for monitoring FIFA World Cup 2026 matches in real time.

## What It Does

- 3D globe with drag-to-rotate and scroll-to-zoom controls
- 48 qualified national teams plotted by capital city, color-coded by confederation (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC)
- 16 host-city stadium markers across USA, Canada, and Mexico
- Animated flow arcs connecting each match's two teams to its host stadium, with live/upcoming/finished visual states
- Confederation filter strip and free-text search by team or city
- Auto-tour mode that cycles through live → upcoming → finished matches every 5s
- Match list grouped by status (live / upcoming / finished), click-to-select on the globe or in the list
- Detail panel with scoreboard, venue, group, and confederation tags for the selected match

## Run Locally

```powershell
npm.cmd install
npm.cmd run dev -- --port 5173
```

Open:

```text
http://127.0.0.1:5173
```

## Build

```powershell
npm.cmd run build
```

## Data

Match, team, and venue data currently live as mock/demo datasets directly in `src/main.jsx` (`teams`, `hostCities`, `matches`). See `SPEC.md` for the target architecture if extracting this into a real-time data layer (e.g. football-data.org API integration).
