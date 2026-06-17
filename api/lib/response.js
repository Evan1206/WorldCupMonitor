export function cacheControl(matches = []) {
  return matches.some((match) => match.status === 'live')
    ? 's-maxage=60, stale-while-revalidate=300'
    : 's-maxage=900, stale-while-revalidate=1800';
}

export function allowGet(req, res) {
  if (req.method === 'GET') return true;
  res.setHeader('Allow', 'GET');
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}

export function sendProviderError(res, error) {
  const configurationError = error.message.includes('not configured');
  res.setHeader('Cache-Control', 'no-store');
  res.status(configurationError ? 503 : 502).json({
    error: configurationError ? error.message : 'Live match provider is temporarily unavailable',
  });
}
