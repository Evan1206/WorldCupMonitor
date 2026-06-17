import { useCallback, useEffect, useState } from 'react';

export function useMatches({ fallbackMatches, fallbackTeams, hostCities }) {
  const [state, setState] = useState({
    matches: fallbackMatches,
    teams: fallbackTeams,
    hostCities,
    loading: true,
    error: null,
    lastUpdated: null,
    source: 'embedded-demo',
  });
  const fetchJson = useCallback(async (path) => {
    const response = await fetch(path);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? `API ${response.status}`);
    }
    return response.json();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [matchPayload, teamPayload] = await Promise.all([fetchJson('/api/matches'), fetchJson('/api/teams')]);
      setState((current) => ({
        ...current,
        matches: matchPayload?.matches?.length ? matchPayload.matches : current.matches,
        teams: teamPayload?.teams?.length ? teamPayload.teams : current.teams,
        loading: false,
        error: null,
        lastUpdated: matchPayload?.lastUpdated ?? teamPayload?.lastUpdated ?? current.lastUpdated,
        source: matchPayload?.source ?? teamPayload?.source ?? current.source,
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: `Live API unavailable: ${error.message}. Showing last known data.` }));
    }
  }, [fetchJson]);

  useEffect(() => {
    if (document.visibilityState === 'visible') refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 30000);
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { ...state, refresh };
}
