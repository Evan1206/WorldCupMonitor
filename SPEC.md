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
3. Stay within the data provider's free-tier rate limit via HTTP caching, with no always-on
   server to operate or pay for.
4. Deploy the whole thing as a single project that auto-deploys on every push to `main`,
   on a host with no credit card requirement.

## 2. Data Provider

Use **football-data.org** (v4 API), competition code `WC` (FIFA World Cup), season 2026.

- `GET /v4/competitions/WC/matches` — full match list (group, status, teams, scores, utcDate, venue).
- `GET /v4/competitions/WC/teams` — team list with crest/flag, area.
- Auth: header `X-Auth-Token: <API_KEY>`. Free tier: 10 req/min.

If football-data.org does not yet expose World Cup 2026 fixtures at implementation time, fall
back to a second configurable provider via the same internal interface (see §3.2) — do not
hardcode provider-specific shapes into the frontend.

## 3. Backend Proxy — Vercel Serverless Functions

No always-on server, no separate host, no credit card required. The "backend" is just
`api/` route handlers deployed as part of the same Vercel project as the frontend
(Vercel's free Hobby tier covers a static site + serverless functions together).

New directory: `api/` at repo root (Vercel's convention — each file becomes a route).

- `api/matches.js` → `GET /api/matches`
- `api/teams.js` → `GET /api/teams`

### 3.1 Responsibilities

- Hold `FOOTBALL_DATA_API_KEY` as a Vercel project environment variable (Encrypted) — never
  sent to the client, never committed.
- On each invocation, fetch from football-data.org and return the normalized result — there
  is no persistent in-memory cache across invocations on serverless, so **caching is done via
  HTTP response headers**, not application code:
  - `Cache-Control: s-maxage=60, stale-while-revalidate=300` while any match is live.
  - `Cache-Control: s-maxage=900, stale-while-revalidate=1800` otherwise.
  - Vercel's edge network serves cached responses directly during the `s-maxage` window, so
    the function (and the upstream API) is not re-invoked on every page load — this is what
    keeps usage inside football-data.org's 10 req/min free tier even under traffic.
- Include a `lastUpdated` (ISO8601) field in the JSON body, generated at fetch time, so the
  frontend can show data freshness even when served from edge cache.
- No CORS config needed — frontend and API share the same origin (one Vercel deployment).

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
static `teams`/`hostCities` lookup tables (move them from `src/main.jsx` into `api/data/`,
shared by the two route handlers) and merge them with live status/score data by team id at
request time.

### 3.4 Config

`.env.local` (gitignored, Vercel CLI convention): `FOOTBALL_DATA_API_KEY`. Mirror the same
key in the Vercel project's Environment Variables settings (Production + Preview) so deployed
builds have it — it is not read from any committed file.

## 4. Frontend Changes

- Replace the hardcoded `matches` array in `main.jsx` with a `useMatches()` hook that:
  - Fetches `GET /api/matches` and `GET /api/teams` on mount.
  - Re-polls every 30s while the tab is visible (use `document.visibilityState`).
  - Exposes `{ matches, teams, hostCities, loading, error, lastUpdated }`.
- Add a loading state (skeleton or spinner over the globe) and an error state (toast/banner,
  keep last-known-good data visible rather than blanking the screen).
- Surface `lastUpdated` in the top bar (replace the hardcoded "JUN 17, 2026" label).
- Fetch from relative paths `/api/matches` and `/api/teams` — frontend and API live on the
  same Vercel domain, so no base-URL env var is needed.
- `hostCities` stays static (venues don't change) — keep it in the frontend, but switch
  `teams`' confederation/coords to come from `/api/teams` so the team list always matches
  whoever actually qualified.

## 5. Deployment — Vercel, one project, no GitHub Actions needed

- Connect the GitHub repo to Vercel (vercel.com → New Project → import
  `Evan1206/WorldCupMonitor`). Vercel auto-detects the Vite app and the `api/` functions.
- Every push to `main` auto-deploys to production; every PR/branch gets its own preview URL —
  this is built into Vercel's Git integration, no custom CI/CD workflow file required.
- Set `FOOTBALL_DATA_API_KEY` once in the Vercel dashboard (Project → Settings →
  Environment Variables). Nothing else to configure.
- Free Hobby plan covers this entirely: static hosting + serverless functions + automatic
  HTTPS + the edge caching described in §3.1. No credit card required to start.

## 6. Acceptance Criteria

- [ ] `vercel dev` (or `npm run dev` with the Vercel CLI proxying `api/`) shows the globe
      populated from `/api/matches`, not the hardcoded array.
- [ ] No API key string appears anywhere in `src/`, `api/`, or the built output.
- [ ] If the upstream provider call fails, the API route still returns a response (last good
      cached data via `stale-while-revalidate`, or a clear error JSON) and the frontend shows
      last-known data + an error indicator, not a crash.
- [ ] A push to `main` results in an updated live deployment within a few minutes, with no
      manual steps, and no hosting cost.
- [ ] README is updated to describe the live-data setup (env var, `vercel dev` for local
      testing) once this work lands.

## 7. Suggested Build Order

1. `api/data/` (move static teams/hostCities here) + `FootballDataOrgAdapter` + `api/matches.js`,
   `api/teams.js`, tested locally with `vercel dev` and a real API key.
2. Frontend `useMatches()` hook + loading/error states, pointed at the local `vercel dev` server.
3. Connect the repo to Vercel, set the env var, confirm the first auto-deploy.
4. Update README with the new local-dev and deployment instructions.
