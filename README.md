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

## Live Data

The frontend reads normalized World Cup 2026 data from the same-origin Vercel Functions at
`/api/matches` and `/api/teams`. The functions proxy football-data.org without exposing the
provider key and use Vercel edge caching to stay within the free API tier.

Create `.env.local` (it is gitignored):

```text
FOOTBALL_DATA_API_KEY=your_football_data_org_key
```

## Run Locally

```powershell
npm.cmd install
npx vercel dev
```

Open:

```text
http://localhost:3000
```

## Build

```powershell
npm.cmd run build
```

## Deploy

1. Import `Evan1206/WorldCupMonitor` at Vercel and keep the detected Vite settings.
2. Add `FOOTBALL_DATA_API_KEY` under Project Settings > Environment Variables for Production
   and Preview.
3. Push `main`. Vercel's Git integration deploys production automatically and creates preview
   deployments for branches and pull requests. No GitHub Actions workflow is required.

The frontend keeps its last successful response visible if the provider is temporarily
unavailable. Venue metadata stays static; match and qualified-team data come from the API.
