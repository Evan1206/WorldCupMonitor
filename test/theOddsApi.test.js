import assert from 'node:assert/strict';
import test from 'node:test';
import { TheOddsApiAdapter, normalizeOddsEvent } from '../api/providers/theOddsApi.js';

test('normalizes provider odds data into the frontend schema', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ([{
      id: 'evt-1',
      commence_time: '2026-06-17T19:00:00Z',
      home_team: 'Brazil',
      away_team: 'Argentina',
      bookmakers: [
        { key: 'pinnacle', markets: [{ key: 'h2h', outcomes: [
          { name: 'Brazil', price: 2.1 }, { name: 'Draw', price: 3.4 }, { name: 'Argentina', price: 3.2 },
        ] }] },
        { key: 'betfair_ex_eu', markets: [{ key: 'h2h', outcomes: [
          { name: 'Brazil', price: 1.9 }, { name: 'Draw', price: 3.6 }, { name: 'Argentina', price: 3.4 },
        ] }] },
      ],
    }]),
  });
  const [event] = await new TheOddsApiAdapter('secret', fetchImpl).fetchOdds();
  assert.deepEqual(event, {
    id: 'evt-1', teamA: 'bra', teamB: 'arg', kickoffUtc: '2026-06-17T19:00:00Z',
    bookmakerCount: 2,
    odds: { home: 2, draw: 3.5, away: 3.3 },
  });
});

test('handles events with no bookmakers', () => {
  const event = normalizeOddsEvent({
    id: 'evt-2', commence_time: '2026-06-18T19:00:00Z',
    home_team: 'Germany', away_team: 'France', bookmakers: [],
  });
  assert.deepEqual(event.odds, { home: null, draw: null, away: null });
});
