import { FootballDataOrgAdapter } from './providers/footballDataOrg.js';
import { allowGet, sendProviderError } from './lib/response.js';

export default async function handler(req, res) {
  if (!allowGet(req, res)) return;

  try {
    const adapter = new FootballDataOrgAdapter(process.env.FOOTBALL_DATA_API_KEY);
    const teams = await adapter.fetchTeams();
    const lastUpdated = new Date().toISOString();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(200).json({ teams, lastUpdated, source: 'football-data.org' });
  } catch (error) {
    sendProviderError(res, error);
  }
}
