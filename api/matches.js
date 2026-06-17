import { FootballDataOrgAdapter } from './providers/footballDataOrg.js';
import { allowGet, cacheControl, sendProviderError } from './lib/response.js';

export default async function handler(req, res) {
  if (!allowGet(req, res)) return;

  try {
    const adapter = new FootballDataOrgAdapter(process.env.FOOTBALL_DATA_API_KEY);
    const matches = await adapter.fetchMatches();
    const lastUpdated = new Date().toISOString();
    res.setHeader('Cache-Control', cacheControl(matches));
    res.status(200).json({ matches, lastUpdated, source: 'football-data.org' });
  } catch (error) {
    sendProviderError(res, error);
  }
}
