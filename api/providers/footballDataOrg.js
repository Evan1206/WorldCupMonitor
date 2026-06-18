import { teamMetadata, venueMetadata } from '../data/metadata.js';

const API_BASE = 'https://api.football-data.org/v4';
const teamsByTla = new Map(teamMetadata.map((team) => [team.tla, team]));
const teamsByName = new Map(teamMetadata.map((team) => [team.name.toLowerCase(), team]));

function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function resolveTeam(team = {}) {
  return teamsByTla.get(team.tla)
    ?? teamsByName.get((team.name ?? '').toLowerCase())
    ?? { id: team.tla?.toLowerCase() || slugify(team.name ?? 'tbd'), name: team.name ?? 'TBD', lat: 0, lng: 0, conf: 'OFC' };
}

export function resolveVenue(match = {}) {
  const haystack = `${match.venue ?? ''} ${match.area?.name ?? ''}`.toLowerCase();
  return venueMetadata.find((venue) => venue.aliases.some((alias) => haystack.includes(alias)))?.id ?? 'v-tbd';
}

export function normalizeStatus(status) {
  if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(status)) return 'live';
  if (['FINISHED', 'AWARDED'].includes(status)) return 'finished';
  return 'upcoming';
}

export class FootballDataOrgAdapter {
  constructor(apiKey, fetchImpl = fetch) {
    if (!apiKey) throw new Error('FOOTBALL_DATA_API_KEY is not configured');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async request(path) {
    const response = await this.fetchImpl(`${API_BASE}${path}`, {
      headers: { 'X-Auth-Token': this.apiKey },
    });
    if (!response.ok) {
      throw new Error(`football-data.org returned ${response.status}`);
    }
    return response.json();
  }

  async fetchMatches() {
    const data = await this.request('/competitions/WC/matches?season=2026');
    return (data.matches ?? []).map((match) => ({
      id: String(match.id),
      teamA: resolveTeam(match.homeTeam).id,
      teamB: resolveTeam(match.awayTeam).id,
      venueId: resolveVenue(match),
      group: match.group?.replace('GROUP_', '') ?? match.stage ?? '',
      status: normalizeStatus(match.status),
      minute: match.minute ?? (normalizeStatus(match.status) === 'finished' ? 90 : null),
      scoreA: match.score?.fullTime?.home ?? null,
      scoreB: match.score?.fullTime?.away ?? null,
      kickoffUtc: match.utcDate,
    }));
  }

  async fetchTeams() {
    const data = await this.request('/competitions/WC/teams?season=2026');
    return (data.teams ?? []).map((team) => {
      const meta = resolveTeam(team);
      return {
        id: meta.id,
        name: team.shortName ?? team.name ?? meta.name,
        flag: team.crest ?? '',
        lat: meta.lat,
        lng: meta.lng,
        conf: meta.conf,
      };
    });
  }
}
