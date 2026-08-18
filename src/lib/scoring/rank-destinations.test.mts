/**
 * Unit tests for the Travel feature's destination matching
 * (src/lib/scoring/rank-destinations.ts). Fixtures are small and synthetic
 * rather than the real 20-destination seed, same reasoning as
 * rank-venues.test.mts: fast, deterministic, and independent of seed
 * content changing later. See that file's own top comment for why
 * `.test.mts` + `node --test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Destination, Tile, UserPreference } from '../../types/models.ts';
import {
  flattenSelectedTileIds,
  matchedTileNames,
  rankDestinations,
  reasonForDestination,
  scoreDestinationFit,
} from './rank-destinations.ts';

const TILES: Tile[] = [
  { id: 'Drink|Nightclubs', category: 'Drink', name: 'Nightclubs', subPreferences: ['House music'] },
  { id: 'Eat|Lively & loud', category: 'Eat', name: 'Lively & loud', subPreferences: [] },
  { id: 'Do|Culture', category: 'Do', name: 'Culture', subPreferences: ['History'] },
  { id: 'Do|Spectator sport', category: 'Do', name: 'Spectator sport', subPreferences: ['Polo/tennis'] },
];

const PARTY_ISLAND: Destination = {
  id: 'party-island',
  name: 'Party Island',
  region: 'Somewhere, Europe',
  lat: 0,
  lon: 0,
  bestMonths: [7, 8],
  bestSeasonLabel: 'July – August',
  tileIds: ['Drink|Nightclubs', 'Eat|Lively & loud'],
  curator: 'Test C.',
  editorialDescription: 'Loud, and proud of it.',
};

const HISTORY_TOWN: Destination = {
  id: 'history-town',
  name: 'History Town',
  region: 'Somewhere Else, Europe',
  lat: 0,
  lon: 0,
  bestMonths: [5, 9],
  bestSeasonLabel: 'May, September',
  tileIds: ['Do|Culture', 'Do|Spectator sport'],
  curator: 'Test C.',
  editorialDescription: 'Old stones, older stories.',
};

function preference(selectedTileIds: string[]): UserPreference[] {
  return [{ category: 'Drink', selectedTileIds, subPreferenceState: {} }];
}

test('flattenSelectedTileIds combines all categories into one list', () => {
  const prefs: UserPreference[] = [
    { category: 'Do', selectedTileIds: ['a', 'b'], subPreferenceState: {} },
    { category: 'Drink', selectedTileIds: ['c'], subPreferenceState: {} },
    { category: 'Eat', selectedTileIds: [], subPreferenceState: {} },
  ];
  assert.deepEqual(flattenSelectedTileIds(prefs), ['a', 'b', 'c']);
});

test('scoreDestinationFit is 0 with no overlap', () => {
  assert.equal(scoreDestinationFit(PARTY_ISLAND, ['Do|Culture']), 0);
});

test('scoreDestinationFit is a fraction of the destination\'s own tags matched', () => {
  assert.equal(scoreDestinationFit(PARTY_ISLAND, ['Drink|Nightclubs']), 0.5);
  assert.equal(scoreDestinationFit(PARTY_ISLAND, ['Drink|Nightclubs', 'Eat|Lively & loud']), 1);
});

test('scoreDestinationFit rewards proportion, not raw count — full match on fewer tags beats partial match on more', () => {
  const fullMatch = scoreDestinationFit(PARTY_ISLAND, ['Drink|Nightclubs', 'Eat|Lively & loud']);
  const partialMatch = scoreDestinationFit(HISTORY_TOWN, ['Do|Culture']);
  assert.ok(fullMatch > partialMatch);
});

test('matchedTileNames resolves real tile ids to their display names, in destination order', () => {
  const names = matchedTileNames(HISTORY_TOWN, ['Do|Spectator sport', 'Do|Culture'], TILES);
  assert.deepEqual(names, ['Culture', 'Spectator sport']);
});

test('reasonForDestination falls back to the editorial line when nothing matched', () => {
  assert.equal(reasonForDestination(PARTY_ISLAND, []), 'Loud, and proud of it.');
});

test('reasonForDestination names the single matched tile', () => {
  const reason = reasonForDestination(PARTY_ISLAND, ['Nightclubs']);
  assert.match(reason, /Nightclubs/);
  assert.match(reason, /Party Island/);
});

test('reasonForDestination lists multiple matched tiles naturally', () => {
  const reason = reasonForDestination(PARTY_ISLAND, ['Nightclubs', 'Lively & loud']);
  assert.equal(reason, 'Nightclubs and Lively & loud are all in your picks — Party Island is where they overlap.');
});

test('rankDestinations sorts best-fit first and never drops a destination', () => {
  const ranked = rankDestinations(preference(['Drink|Nightclubs', 'Eat|Lively & loud']), [HISTORY_TOWN, PARTY_ISLAND], TILES);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].destination.id, 'party-island');
  assert.equal(ranked[0].score, 1);
  assert.equal(ranked[1].destination.id, 'history-town');
  assert.equal(ranked[1].score, 0);
});

test('rankDestinations still includes zero-overlap destinations with their editorial line as the reason', () => {
  const ranked = rankDestinations(preference(['Drink|Nightclubs']), [HISTORY_TOWN], TILES);
  assert.equal(ranked[0].reason, HISTORY_TOWN.editorialDescription);
});
