# WorldCupMonitor — Full-Stack Spec

Target: turn the current single-file demo (`src/main.jsx`, mock data) into a live system —
real match data via a backend proxy, and a deployed, continuously updated app.

Repo: https://github.com/Evan1206/WorldCupMonitor

## 0. Current State (already built, do not redo)

- `src/main.jsx` — React + Three.js globe. Renders 48 teams, 16 host stadiums, match arcs,
  confederation filter, search, auto-tour, match list, detail panel.
- `src/styles.css` — all styling.
- Data is hardcoded in `main.jsx`: `teams`, `hostCities`, `matches` arrays.
- Build tooling: Vite + React. `npm run dev` / `npm run build`.
- No backend, no persistence, no live data yet.

## 1. Goals

1. Replace the hardcoded `matches` (and team/venue metadata where the API provides it) with
   real FIFA World Cup 2026 data, refreshed automatically.
2. Never expose the data-provider API key to the browser.
3. Stay within the data provider's free-tier rate limit via server-side caching.
4. Ship a CI/CD pipeline that deploys both the frontend and the backend proxy on every push to `main`.

## 2. Data Provider

Use **football-data.org** (v4 API), competition code `WC` (FIFA World Cup), season 2026.

- `GET /v4/competitions/WC/matches` — full match list (group, status, teams, scores, utcDate, venue).
- `GET /v4/competitions/WC/teams` — team list with crest/flag, area.
- Auth: header `X-Auth-Token: <API_KEY>`. Free tier: 10 req/min.

If football-data.org does not yet expose World Cup 2026 fixtures at implementation time, fall
back to a second configurable provider via the same internal interface (see §3.2) — do not
hardcode provider-specific shapes into the frontend.

## 3. Backend Proxy Service

New directory: `server/`. Node.js (Express or Fastify), deployed separately from the static frontend.

### 3.1 Responsibilities

- Hold the `FOOTBALL_DATA_API_KEY` as a server-only env var — never sent to the client.
- Poll the provider on an interval (suggested: 60s while any match is live, 15min otherwise)
  and cache the normalized result in memory (or Redis if available) — never call the provider
  directly per client request.
- Expose two read-only endpoints to the frontend:
  - `GET /api/matches` → normalized match list (see §3.3 schema)
  - `GET /api/teams` → normalized team list
- Enforce CORS to allow only the deployed frontend origin.
- Return `304`/ETag or a `lastUpdated` timestamp so the frontend can show data freshness.

### 3.2 Provider Adapter Interface

```ts
interface MatchProviderAdapter {
  fetchMatches(): Promise<NormalizedMatch[]>;
  fetchTeams(): Promise<NormalizedTeam[]>;
}
```

Implement `FootballDataOrgAdapter` first. New providers plug in without touching the cache
layer or the frontend.

### 3.3 Normalized Schema (matches frontend's existing shape, extended)

```ts
interface NormalizedTeam {
  id: string;        // stable slug, e.g. "bra"
  name: string;
  flag: string;       // emoji or crest URL
  lat: number; lng: number;  // representative coordinate (capital city)
  conf: 'UEFA'|'CONMEBOL'|'CONCACAF'|'CAF'|'AFC'|'OFC';
}

interface NormalizedMatch {
  id: string;
  teamA: string; teamB: string;   // team ids
  venueId: string;
  group: string;
  status: 'live'|'upcoming'|'finished';
  minute: number|null;
  scoreA: number|null; scoreB: number|null;
  kickoffUtc: string;             // ISO8601, replaces the old local "time" string
}
```

Coordinates and confederation are not provided by football-data.org — keep the existing
static `teams`/`hostCities` lookup tables in the backend (move them from `src/main.jsx` into
`server/data/`) and merge them with live status/score data by team id at request time.

### 3.4 Config

`server/.env` (gitignored): `FOOTBALL_DATA_API_KEY`, `PORT`, `ALLOWED_ORIGIN`, `POLL_INTERVAL_LIVE_MS`, `POLL_INTERVAL_IDLE_MS`.

## 4. Frontend Changes

- Replace the hardcoded `matches` array in `main.jsx` with a `useMatches()` hook that:
  - Fetches `GET /api/matches` and `GET /api/teams` on mount.
  - Re-polls every 30s while the tab is visible (use `document.visibilityState`).
  - Exposes `{ matches, teams, hostCities, loading, error, lastUpdated }`.
- Add a loading state (skeleton or spinner over the globe) and an error state (toast/banner,
  keep last-known-good data visible rather than blanking the screen).
- Surface `lastUpdated` in the top bar (replace the hardcoded "JUN 17, 2026" label).
- Read the API base URL from `import.meta.env.VITE_API_BASE_URL` (set per environment).
- `hostCities` stays static (venues don't change) — keep it in the frontend, but switch
  `teams`' confederation/coords to come from `/api/teams` so the team list always matches
  whoever actually qualified.

## 5. Deployment

- **Frontend**: GitHub Pages via GitHub Actions (`.github/workflows/deploy-frontend.yml`):
  on push to `main`, `npm ci && npm run build`, publish `dist/` to `gh-pages` branch (or
  `actions/deploy-pages`).
- **Backend**: a small always-on host is required (GitHub Pages can't run Node). Use a
  free-tier-friendly target — Render or Fly.io — via `.github/workflows/deploy-backend.yml`,
  triggered on push to `main` when `server/**` changes. Store `FOOTBALL_DATA_API_KEY` as a
  GitHub Actions secret and as the host's runtime env var, never in the repo.
- Add `VITE_API_BASE_URL` as a build-time secret/variable pointing at the deployed backend URL.

## 6. Acceptance Criteria

- [ ] `npm run dev` shows the globe populated from `/api/matches`, not the hardcoded array.
- [ ] No API key string appears anywhere in `src/` or in the built `dist/` bundle.
- [ ] Killing the backend leaves the frontend showing last-known data + an error indicator,
      not a crash.
- [ ] A push to `main` results in an updated live deployment within a few minutes, with no
      manual steps.
- [ ] README is updated to describe the live-data setup (env vars, how to run backend + frontend
      together locally) once this work lands.

## 7. Suggested Build Order

1. `server/` scaffold + `FootballDataOrgAdapter` + `/api/matches`, `/api/teams`, manual testing
   against real API key.
2. Frontend `useMatches()` hook + loading/error states, point at local backend.
3. CI/CD for both deploy targets.
4. Update README with the new local-dev and deployment instructions.
