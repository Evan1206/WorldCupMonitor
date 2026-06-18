import { TheOddsApiAdapter } from './providers/theOddsApi.js';
import { allowGet, sendProviderError } from './lib/response.js';

export default async function handler(req, res) {
  if (!allowGet(req, res)) return;

  try {
    const adapter = new TheOddsApiAdapter(process.env.ODDS_API_KEY);
    const odds = await adapter.fetchOdds();
    const lastUpdated = new Date().toISOString();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json({ odds, lastUpdated, source: 'the-odds-api.com' });
  } catch (error) {
    sendProviderError(res, error);
  }
}
