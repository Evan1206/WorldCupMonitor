import { resolveTeam } from './footballDataOrg.js';

const API_BASE = 'https://api.the-odds-api.com/v4';

function averageOutcome(bookmakers, outcomeName) {
  const prices = bookmakers
    .map((bookmaker) => bookmaker.markets
      .find((market) => market.key === 'h2h')?.outcomes
      .find((outcome) => outcome.name === outcomeName)?.price)
    .filter((price) => typeof price === 'number');
  if (prices.length === 0) return null;
  return Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100;
}

export function normalizeOddsEvent(event) {
  const teamA = resolveTeam({ name: event.home_team });
  const teamB = resolveTeam({ name: event.away_team });
  const bookmakers = event.bookmakers ?? [];
  return {
    id: String(event.id),
    teamA: teamA.id,
    teamB: teamB.id,
    kickoffUtc: event.commence_time,
    bookmakerCount: bookmakers.length,
    odds: {
      home: averageOutcome(bookmakers, event.home_team),
      draw: averageOutcome(bookmakers, 'Draw'),
      away: averageOutcome(bookmakers, event.away_team),
    },
  };
}

export class TheOddsApiAdapter {
  constructor(apiKey, fetchImpl = fetch) {
    if (!apiKey) throw new Error('ODDS_API_KEY is not configured');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async request(path, params = {}) {
    const query = new URLSearchParams({ apiKey: this.apiKey, ...params });
    const response = await this.fetchImpl(`${API_BASE}${path}?${query}`);
    if (!response.ok) {
      throw new Error(`the-odds-api returned ${response.status}`);
    }
    return response.json();
  }

  async fetchOdds(sportKey = 'soccer_fifa_world_cup') {
    const data = await this.request(`/sports/${sportKey}/odds`, {
      regions: 'eu',
      markets: 'h2h',
      oddsFormat: 'decimal',
    });
    return (data ?? []).map(normalizeOddsEvent);
  }
}
