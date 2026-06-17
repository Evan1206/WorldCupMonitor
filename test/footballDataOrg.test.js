import assert from 'node:assert/strict';
import test from 'node:test';
import { FootballDataOrgAdapter, normalizeStatus, resolveVenue } from '../api/providers/footballDataOrg.js';
import { cacheControl } from '../api/lib/response.js';

test('normalizes provider match data into the frontend schema', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ matches: [{
      id: 42,
      homeTeam: { tla: 'BRA', name: 'Brazil' },
      awayTeam: { tla: 'ARG', name: 'Argentina' },
      venue: 'MetLife Stadium',
      group: 'GROUP_A',
      status: 'IN_PLAY',
      minute: 67,
      score: { fullTime: { home: 2, away: 1 } },
      utcDate: '2026-06-17T19:00:00Z',
    }] }),
  });
  const [match] = await new FootballDataOrgAdapter('secret', fetchImpl).fetchMatches();
  assert.deepEqual(match, {
    id: '42', teamA: 'bra', teamB: 'arg', venueId: 'v-nyc', group: 'A',
    status: 'live', minute: 67, scoreA: 2, scoreB: 1,
    kickoffUtc: '2026-06-17T19:00:00Z',
  });
});

test('maps statuses, venues, and cache windows', () => {
  assert.equal(normalizeStatus('FINISHED'), 'finished');
  assert.equal(resolveVenue({ venue: 'BC Place' }), 'v-van');
  assert.equal(cacheControl([{ status: 'live' }]), 's-maxage=60, stale-while-revalidate=300');
  assert.equal(cacheControl([{ status: 'upcoming' }]), 's-maxage=900, stale-while-revalidate=1800');
});
