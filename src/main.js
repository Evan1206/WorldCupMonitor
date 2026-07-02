import './style.css';
import { createToyotaGlobe, updateGlobeData } from './globe/createToyotaGlobe.js';
import { hostCities } from './data/hostCities.js';

const CONF_COLORS = {
  UEFA: '#4a9eff', CONMEBOL: '#2ecc71', CONCACAF: '#f2994a',
  CAF: '#f1c40f', AFC: '#e74c3c', OFC: '#9b59b6',
};
const FILTERS = ['All', ...Object.keys(CONF_COLORS)];
const app = document.querySelector('#app');

const state = {
  matches: [], teams: [], odds: [], selectedId: null, selectedVenueId: null, conf: 'All', query: '',
  lastUpdated: null, source: 'connecting', loading: true, error: null,
  oddsSource: null, oddsUnavailable: false,
};

app.innerHTML = `
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">26</div>
      <div><p class="eyebrow">FIFA World Cup 2026</p><h1>Live Match Globe</h1></div>
    </div>
    <div class="metrics">
      <div><strong id="live-count">0</strong><span>live now</span></div>
      <div><strong id="upcoming-count">0</strong><span>upcoming</span></div>
    </div>
    <details class="control-drawer">
      <summary><span><strong>Controls</strong><small id="control-summary">Connecting to live data</small></span><span class="drawer-icon">v</span></summary>
      <div class="control-content">
        <label class="search"><span>Search</span><input id="search" placeholder="team, city, stadium" /></label>
        <div class="filters">${FILTERS.map((filter) => `<button type="button" data-conf="${filter}" class="${filter === 'All' ? 'active' : ''}">${filter}</button>`).join('')}</div>
        <div class="guide"><span>Drag to rotate</span><span>Wheel or pinch to zoom</span><span>Click a venue or match row</span></div>
        <div class="map-legend">
          <span><i class="legend-pin"></i> Host venue</span>
          <span><i class="legend-odds">1X2</i> Sportsbook odds</span>
          <small>Team country markers appear only when odds include a local market.</small>
        </div>
      </div>
    </details>
    <div id="feed-status" class="feed-status">Connecting to football-data.org...</div>
    <div id="match-list" class="site-list"></div>
  </aside>
  <main class="stage">
    <div class="stage-title"><p class="eyebrow" id="freshness">Live visualization</p><h2>World Cup match network</h2></div>
    <div id="globe"></div>
    <section id="match-pulse" class="insights-panel"></section>
    <section id="details" class="details"></section>
  </main>
`;

const listEl = document.querySelector('#match-list');
const detailsEl = document.querySelector('#details');
const pulseEl = document.querySelector('#match-pulse');
const statusEl = document.querySelector('#feed-status');
const summaryEl = document.querySelector('#control-summary');
const freshnessEl = document.querySelector('#freshness');
const searchEl = document.querySelector('#search');
const filterButtons = [...document.querySelectorAll('.filters button')];
const globe = createToyotaGlobe(document.querySelector('#globe'), { onSelect: selectMarker });

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]));

function teamMap() {
  return Object.fromEntries(state.teams.map((team) => [team.id, team]));
}

function venueMap() {
  return Object.fromEntries(hostCities.map((venue) => [venue.id, venue]));
}

function visibleMatches() {
  const teams = teamMap();
  const venues = venueMap();
  const query = state.query.trim().toLowerCase();
  return state.matches.filter((match) => {
    const a = teams[match.teamA];
    const b = teams[match.teamB];
    const venue = venues[match.venueId];
    const confOk = state.conf === 'All' || a?.conf === state.conf || b?.conf === state.conf;
    const text = `${a?.name ?? ''} ${b?.name ?? ''} ${venue?.city ?? ''} ${venue?.stadium ?? ''}`.toLowerCase();
    return confOk && (!query || text.includes(query));
  });
}

function scoreText(match) {
  if (match.status === 'upcoming') return 'VS';
  return `${match.scoreA ?? '-'} - ${match.scoreB ?? '-'}`;
}

function statusText(match) {
  if (match.status === 'live') return match.minute == null ? 'LIVE' : `LIVE ${match.minute}'`;
  if (match.status === 'finished') return 'FT';
  if (!match.kickoffUtc) return 'TBD';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(match.kickoffUtc));
}

function oddsForMatch(match) {
  if (!match) return null;
  const event = state.odds.find((item) => {
    const sameOrder = item.teamA === match.teamA && item.teamB === match.teamB;
    const reverseOrder = item.teamA === match.teamB && item.teamB === match.teamA;
    const kickoffGap = Math.abs(new Date(item.kickoffUtc).getTime() - new Date(match.kickoffUtc).getTime());
    return (sameOrder || reverseOrder) && kickoffGap < 24 * 60 * 60 * 1000;
  });
  if (!event) return null;
  const reversed = event.teamA === match.teamB;
  return {
    home: reversed ? event.odds.away : event.odds.home,
    draw: event.odds.draw,
    away: reversed ? event.odds.home : event.odds.away,
    bookmakerCount: event.bookmakerCount,
  };
}

function oddsUsesLocalMarkets() {
  return state.odds.some((event) => (
    event.localMarket
    || event.marketCountry
    || event.marketRegion
    || event.region
    || event.country
    || (Array.isArray(event.regions) && event.regions.length > 0)
  ));
}

function oddsNumber(value) {
  return typeof value === 'number' ? value.toFixed(2) : '-';
}

function flagMarkup(team) {
  if (!team?.flag) return '';
  if (/^https?:\/\//.test(team.flag)) return `<img class="team-crest" src="${escapeHtml(team.flag)}" alt="" />`;
  return `<span class="team-flag">${escapeHtml(team.flag)}</span>`;
}

function globeSites(matches) {
  const selected = state.matches.find((match) => match.id === state.selectedId);
  const venueSites = hostCities.filter((venue) => venue.plottable !== false).map((venue) => ({
    ...venue, region: venue.country, type: 'Host venue', signal: Math.round((venue.capacity / 87523) * 100),
    color: '#f6c85f', kind: 'venue', highGrowth: (state.selectedVenueId ?? selected?.venueId) === venue.id, models: [], note: '',
  }));
  if (!oddsUsesLocalMarkets()) return venueSites;

  const teams = teamMap();
  const liveTeamIds = new Set(state.matches.filter((match) => match.status === 'live').flatMap((match) => [match.teamA, match.teamB]));
  const involvedIds = new Set(matches.flatMap((match) => [match.teamA, match.teamB]));
  const teamSites = [...involvedIds].map((id) => teams[id]).filter((team) => team && (team.lat || team.lng)).map((team) => ({
    id: `team-${team.id}`, teamId: team.id, code: team.id, city: team.name, country: team.name,
    region: team.conf, lat: team.lat, lng: team.lng, type: 'Local odds market', signal: 72,
    color: CONF_COLORS[team.conf] ?? '#adb5bd', kind: 'market', growth: null, share: 34,
    highGrowth: liveTeamIds.has(team.id), models: [], note: '',
  }));
  return [...venueSites, ...teamSites];
}

function matchArcs(matches) {
  if (!oddsUsesLocalMarkets()) return [];

  const teams = teamMap();
  const venues = venueMap();
  return matches.flatMap((match) => {
    const venue = venues[match.venueId];
    if (!venue || venue.plottable === false) return [];
    return [match.teamA, match.teamB].flatMap((teamId) => {
      const team = teams[teamId];
      if (!team || (!team.lat && !team.lng)) return [];
      return [{
        id: `${match.id}-${teamId}`, startLat: team.lat, startLng: team.lng,
        endLat: venue.lat, endLng: venue.lng, color: [CONF_COLORS[team.conf] ?? '#adb5bd', match.status === 'live' ? '#ff4d5a' : '#f6c85f'],
        siteId: venue.id, recommended: match.id === state.selectedId,
      }];
    });
  });
}

function anchorFor(match, sites, venue) {
  if (venue) return sites.find((site) => site.id === venue.id) ?? sites[0];
  if (!match) return sites[0];
  return sites.find((site) => site.id === match.venueId)
    ?? sites[0];
}

function renderList(matches) {
  const teams = teamMap();
  const venues = venueMap();
  const groups = [['live', 'LIVE'], ['upcoming', 'UPCOMING'], ['finished', 'FINISHED']];
  listEl.innerHTML = groups.map(([status, label]) => {
    const rows = matches.filter((match) => match.status === status);
    if (!rows.length) return '';
    return `<div class="match-group"><p class="eyebrow">${label}</p>${rows.map((match) => {
      const a = teams[match.teamA];
      const b = teams[match.teamB];
      const venue = venues[match.venueId];
      const market = oddsForMatch(match);
      return `<button class="site-row match-row ${match.id === state.selectedId ? 'selected' : ''}" data-match-id="${escapeHtml(match.id)}" type="button">
        <span class="dot status-${match.status}"></span>
        <span><strong>${flagMarkup(a)}${escapeHtml(a?.name ?? 'TBD')} <b>${escapeHtml(scoreText(match))}</b> ${escapeHtml(b?.name ?? 'TBD')}${flagMarkup(b)}</strong>
        <small>${escapeHtml(venue?.city ?? 'Venue TBD')} &middot; Group ${escapeHtml(match.group || '-')}</small>
        ${market ? `<span class="odds-mini"><i>1</i> ${oddsNumber(market.home)} <i>X</i> ${oddsNumber(market.draw)} <i>2</i> ${oddsNumber(market.away)}</span>` : ''}
        <em>${escapeHtml(statusText(match))}</em></span>
      </button>`;
    }).join('')}</div>`;
  }).join('');
  listEl.querySelectorAll('[data-match-id]').forEach((button) => button.addEventListener('click', () => selectMatch(button.dataset.matchId)));
}

function venueMatches(venueId) {
  return state.matches.filter((match) => match.venueId === venueId);
}

function renderVenueDetails(venue) {
  const teams = teamMap();
  const matches = venueMatches(venue.id);
  const nextMatches = matches.slice(0, 3);
  detailsEl.innerHTML = `
    <div class="detail-heading"><span style="background:#f6c85f"></span><div><p class="eyebrow">Host venue</p><h2>${escapeHtml(venue.city)}</h2></div></div>
    <p>${escapeHtml(venue.stadium)} &middot; ${escapeHtml(venue.country)}</p>
    <div class="venue-stat-grid">
      <div><span>Capacity</span><strong>${venue.capacity ? venue.capacity.toLocaleString() : 'TBD'}</strong></div>
      <div><span>Matches assigned</span><strong>${matches.length}</strong></div>
    </div>
    ${nextMatches.length ? `<div class="venue-match-list">${nextMatches.map((match) => {
      const a = teams[match.teamA];
      const b = teams[match.teamB];
      return `<button type="button" data-venue-match-id="${escapeHtml(match.id)}"><strong>${flagMarkup(a)}${escapeHtml(a?.name ?? 'TBD')} vs ${escapeHtml(b?.name ?? 'TBD')}${flagMarkup(b)}</strong><small>${escapeHtml(statusText(match))} &middot; Group ${escapeHtml(match.group || '-')}</small></button>`;
    }).join('')}</div>` : '<p class="source-note">Match schedule has not assigned this venue yet. The pin still marks a confirmed 2026 host stadium.</p>'}
    <div class="tag-list"><span>${escapeHtml(venue.country)}</span><span>venue pin</span><span>${escapeHtml(state.source)}</span></div>`;
  detailsEl.querySelectorAll('[data-venue-match-id]').forEach((button) => button.addEventListener('click', () => selectMatch(button.dataset.venueMatchId)));
  detailsEl.classList.add('visible');
}

function renderDetails(match, selectedVenue) {
  if (selectedVenue) { renderVenueDetails(selectedVenue); return; }
  if (!match) { detailsEl.classList.remove('visible'); return; }
  const teams = teamMap();
  const venues = venueMap();
  const a = teams[match.teamA];
  const b = teams[match.teamB];
  const venue = venues[match.venueId];
  const market = oddsForMatch(match);
  detailsEl.innerHTML = `
    <div class="detail-heading"><span style="background:${match.status === 'live' ? '#f04438' : '#f6c85f'}"></span><div><p class="eyebrow">Group ${escapeHtml(match.group || '-')} &middot; ${escapeHtml(statusText(match))}</p><h2>${escapeHtml(a?.name ?? 'TBD')} vs ${escapeHtml(b?.name ?? 'TBD')}</h2></div></div>
    <div class="match-score-card"><span>${flagMarkup(a)}${escapeHtml(a?.name ?? 'TBD')}</span><strong>${escapeHtml(scoreText(match))}</strong><span>${escapeHtml(b?.name ?? 'TBD')}${flagMarkup(b)}</span></div>
    <p>${escapeHtml(venue?.city ?? 'Venue TBD')} &middot; ${escapeHtml(venue?.stadium ?? 'To be announced')}</p>
    ${market ? `<div class="odds-card"><div class="odds-heading"><strong>Sportsbook odds</strong><span>${market.bookmakerCount} books average</span></div><div class="odds-grid"><div><span>1 &middot; ${escapeHtml(a?.name ?? 'Home')}</span><strong>${oddsNumber(market.home)}</strong></div><div><span>X &middot; Draw</span><strong>${oddsNumber(market.draw)}</strong></div><div><span>2 &middot; ${escapeHtml(b?.name ?? 'Away')}</span><strong>${oddsNumber(market.away)}</strong></div></div></div>` : ''}
    <div class="tag-list"><span>${escapeHtml(a?.conf ?? '-')}</span><span>${escapeHtml(b?.conf ?? '-')}</span><span>${escapeHtml(state.source)}</span></div>
    <p class="source-note">Updated ${state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : 'pending'}</p>`;
  detailsEl.classList.add('visible');
}

function renderPulse() {
  const counts = Object.fromEntries(['live', 'upcoming', 'finished'].map((status) => [status, state.matches.filter((match) => match.status === status).length]));
  const oddsCovered = state.matches.filter((match) => oddsForMatch(match)).length;
  pulseEl.innerHTML = `<div class="insight-header"><span>Match pulse</span><small>${escapeHtml(state.source)}</small></div>
    <div class="pulse-grid"><div><strong>${counts.live}</strong><span>live</span></div><div><strong>${counts.upcoming}</strong><span>upcoming</span></div><div><strong>${counts.finished}</strong><span>finished</span></div></div>`;
  if (state.oddsSource) pulseEl.insertAdjacentHTML('beforeend', `<div class="odds-coverage"><span>Sportsbook odds</span><strong>${oddsCovered} matches</strong></div>`);
}

function render() {
  const matches = visibleMatches();
  if (!state.selectedId || !state.matches.some((match) => match.id === state.selectedId)) state.selectedId = state.matches[0]?.id ?? null;
  if (matches.length && !matches.some((match) => match.id === state.selectedId)) state.selectedId = matches[0].id;
  if (state.selectedVenueId && !hostCities.some((venue) => venue.id === state.selectedVenueId && venue.plottable !== false)) state.selectedVenueId = null;
  const selected = state.matches.find((match) => match.id === state.selectedId);
  const selectedVenue = hostCities.find((venue) => venue.id === state.selectedVenueId);
  const sites = globeSites(matches.length ? matches : state.matches);
  const activeArcs = state.matches.filter((match) => match.status === 'live' || match.id === state.selectedId);
  const anchor = anchorFor(selected, sites, selectedVenue);

  document.querySelector('#live-count').textContent = state.matches.filter((match) => match.status === 'live').length;
  document.querySelector('#upcoming-count').textContent = state.matches.filter((match) => match.status === 'upcoming').length;
  summaryEl.textContent = `${state.conf === 'All' ? 'All confederations' : state.conf} · ${matches.length} matches`;
  freshnessEl.textContent = state.lastUpdated ? `Live visualization · updated ${new Date(state.lastUpdated).toLocaleTimeString()}` : 'Live visualization';
  statusEl.textContent = state.error ?? (state.loading ? 'Connecting to football-data.org...' : `Live data · ${state.source}`);
  statusEl.classList.toggle('error', Boolean(state.error));
  renderList(matches);
  renderDetails(selected, selectedVenue);
  renderPulse();
  if (sites.length) updateGlobeData(globe, sites, matchArcs(activeArcs), anchor?.id);
}

function selectMatch(id) {
  state.selectedId = id;
  state.selectedVenueId = null;
  render();
}

function selectVenue(id) {
  state.selectedVenueId = id;
  render();
}

function selectMarker(id) {
  if (id.startsWith('v-')) { selectVenue(id); return; }
  if (!oddsUsesLocalMarkets() && id.startsWith('team-')) return;
  const teamId = id.startsWith('team-') ? id.slice(5) : null;
  const match = state.matches.find((item) => teamId ? item.teamA === teamId || item.teamB === teamId : item.venueId === id);
  if (match) selectMatch(match.id);
}

function positionDetails() {
  const selected = state.matches.find((match) => match.id === state.selectedId);
  const selectedVenue = hostCities.find((venue) => venue.id === state.selectedVenueId);
  if ((!selected && !selectedVenue) || !detailsEl.classList.contains('visible')) return;
  const sites = globeSites(visibleMatches().length ? visibleMatches() : state.matches);
  const anchor = anchorFor(selected, sites, selectedVenue);
  const projected = globe.projectSite(anchor);
  const stage = document.querySelector('.stage');
  const stageRect = stage.getBoundingClientRect();
  const cardRect = detailsEl.getBoundingClientRect();
  if (!projected?.visible) {
    detailsEl.style.left = `${Math.max(18, stageRect.width - cardRect.width - 18)}px`;
    detailsEl.style.top = '96px';
    detailsEl.dataset.anchor = 'right';
    detailsEl.classList.add('visible');
    return;
  }
  const right = projected.x < stageRect.width * 0.58;
  detailsEl.style.left = `${Math.min(Math.max(projected.x + (right ? 22 : -(cardRect.width + 22)), 18), stageRect.width - cardRect.width - 18)}px`;
  detailsEl.style.top = `${Math.min(Math.max(projected.y - Math.min(cardRect.height * 0.38, 112), 96), stageRect.height - cardRect.height - 18)}px`;
  detailsEl.dataset.anchor = right ? 'left' : 'right';
  detailsEl.classList.add('visible');
}

async function refresh() {
  if (document.visibilityState !== 'visible') return;
  try {
    const [matchResponse, teamResponse] = await Promise.all([fetch('/api/matches'), fetch('/api/teams')]);
    if (!matchResponse.ok || !teamResponse.ok) throw new Error(`Live API unavailable (${matchResponse.status}/${teamResponse.status})`);
    const [matchPayload, teamPayload] = await Promise.all([matchResponse.json(), teamResponse.json()]);
    state.matches = matchPayload.matches ?? state.matches;
    state.teams = teamPayload.teams ?? state.teams;
    state.lastUpdated = matchPayload.lastUpdated ?? teamPayload.lastUpdated;
    state.source = matchPayload.source ?? teamPayload.source ?? state.source;
    state.error = null;
    if (!state.oddsUnavailable) {
      try {
        const oddsResponse = await fetch('/api/odds');
        if (!oddsResponse.ok) throw new Error(`Odds API ${oddsResponse.status}`);
        const oddsPayload = await oddsResponse.json();
        state.odds = oddsPayload.odds ?? [];
        state.oddsSource = oddsPayload.source ?? 'sportsbook';
      } catch {
        state.oddsUnavailable = true;
      }
    }
  } catch (error) {
    state.error = state.matches.length ? `${error.message} · showing last known data` : error.message;
  } finally {
    state.loading = false;
    render();
  }
}

searchEl.addEventListener('input', (event) => { state.query = event.target.value; render(); });
filterButtons.forEach((button) => button.addEventListener('click', () => {
  state.conf = button.dataset.conf;
  filterButtons.forEach((item) => item.classList.toggle('active', item === button));
  render();
}));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
window.addEventListener('resize', () => globe.width(document.querySelector('#globe').clientWidth));

function followSelectedPin() { positionDetails(); requestAnimationFrame(followSelectedPin); }
render();
refresh();
setInterval(refresh, 30000);
requestAnimationFrame(followSelectedPin);
