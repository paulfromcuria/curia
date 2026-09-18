/**
 * Unit tests for src/lib/map/projection.ts — the pin-collision math behind
 * Map's zoom-dependent "match" pin count (2026-09-18, at explicit user
 * request: "our number of recommendations aka glowing pulses on the map
 * view really should be dependant on zoom level... but with a maximum
 * amount as to not overcrowd the map"). Run with `node --test`; see
 * rank-venues.test.mts's own top comment for why this lives in a
 * seed-free leaf module rather than geo.ts directly.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MATCH_PINS,
  MIN_MATCH_PIN_GAP_PX,
  metersPerPixelAt,
  projectToPixels,
  selectCollisionFreePins,
  type GeoPoint,
} from './projection.ts';

const MANCHESTER = { lat: 53.4808, lon: -2.2426 };

// ---------------------------------------------------------------------------
// metersPerPixelAt
// ---------------------------------------------------------------------------

test('metersPerPixelAt: zooming in halves the ground resolution per zoom level', () => {
  const z10 = metersPerPixelAt(10, MANCHESTER.lat);
  const z11 = metersPerPixelAt(11, MANCHESTER.lat);
  assert.ok(Math.abs(z10 / z11 - 2) < 1e-9, `expected exactly 2x, got ${z10 / z11}`);
});

test('metersPerPixelAt: tile scale narrows away from the equator', () => {
  const equator = metersPerPixelAt(12, 0);
  const manchester = metersPerPixelAt(12, MANCHESTER.lat);
  assert.ok(manchester < equator, `expected higher-latitude resolution (${manchester}) < equator (${equator})`);
});

// ---------------------------------------------------------------------------
// projectToPixels
// ---------------------------------------------------------------------------

test('projectToPixels: a point at the center projects to the origin', () => {
  // Math.abs rather than exact equality: the formula's own arithmetic can
  // land on -0 for a zero offset (e.g. -(0 * k)), which is numerically
  // identical to 0 but fails Node's strict-equal (Object.is) semantics.
  const p = projectToPixels(MANCHESTER, MANCHESTER, 14);
  assert.ok(Math.abs(p.x) < 1e-9, `expected x ~0, got ${p.x}`);
  assert.ok(Math.abs(p.y) < 1e-9, `expected y ~0, got ${p.y}`);
});

test('projectToPixels: east of center is positive x, west is negative x', () => {
  const east = projectToPixels({ lat: MANCHESTER.lat, lon: MANCHESTER.lon + 0.01 }, MANCHESTER, 14);
  const west = projectToPixels({ lat: MANCHESTER.lat, lon: MANCHESTER.lon - 0.01 }, MANCHESTER, 14);
  assert.ok(east.x > 0, `expected positive x, got ${east.x}`);
  assert.ok(west.x < 0, `expected negative x, got ${west.x}`);
  assert.ok(Math.abs(east.x + west.x) < 1e-6, 'expected symmetric magnitude either side of center');
});

test('projectToPixels: north of center is negative y (screen y grows downward), south is positive y', () => {
  const north = projectToPixels({ lat: MANCHESTER.lat + 0.01, lon: MANCHESTER.lon }, MANCHESTER, 14);
  const south = projectToPixels({ lat: MANCHESTER.lat - 0.01, lon: MANCHESTER.lon }, MANCHESTER, 14);
  assert.ok(north.y < 0, `expected negative y, got ${north.y}`);
  assert.ok(south.y > 0, `expected positive y, got ${south.y}`);
});

test('projectToPixels: the same real-world offset projects to more pixels at a higher zoom', () => {
  const point: GeoPoint = { lat: MANCHESTER.lat, lon: MANCHESTER.lon + 0.01 };
  const zoomedOut = projectToPixels(point, MANCHESTER, 10);
  const zoomedIn = projectToPixels(point, MANCHESTER, 15);
  assert.ok(
    Math.abs(zoomedIn.x) > Math.abs(zoomedOut.x),
    `expected zooming in to spread points further apart in pixel space (out=${zoomedOut.x}, in=${zoomedIn.x})`
  );
});

// ---------------------------------------------------------------------------
// selectCollisionFreePins
// ---------------------------------------------------------------------------

interface Fixture {
  id: string;
  lat: number;
  lon: number;
}

function fixture(id: string, offsetDeg: number): Fixture {
  // ~0.0007deg of longitude at this latitude is roughly 50m — close enough
  // to collide at typical neighborhood zoom levels, far enough apart to
  // separate cleanly once zoomed in.
  return { id, lat: MANCHESTER.lat, lon: MANCHESTER.lon + offsetDeg };
}

const getPoint = (f: Fixture): GeoPoint => f;

test('selectCollisionFreePins: the best-ranked candidate is always kept, even alone', () => {
  const only = [fixture('a', 0)];
  const kept = selectCollisionFreePins(only, getPoint, MANCHESTER, 10);
  assert.deepEqual(kept.map((f) => f.id), ['a']);
});

test('selectCollisionFreePins: two venues a few metres apart collide at a wide, zoomed-out view', () => {
  const candidates = [fixture('best', 0), fixture('second', 0.0007)];
  const kept = selectCollisionFreePins(candidates, getPoint, MANCHESTER, 10);
  assert.deepEqual(
    kept.map((f) => f.id),
    ['best'],
    'expected the lower-ranked, colliding venue to be dropped, not the better-ranked one'
  );
});

test('selectCollisionFreePins: the same two venues both fit once zoomed in enough', () => {
  const candidates = [fixture('best', 0), fixture('second', 0.0007)];
  const kept = selectCollisionFreePins(candidates, getPoint, MANCHESTER, 17);
  assert.deepEqual(kept.map((f) => f.id), ['best', 'second']);
});

test('selectCollisionFreePins: never exceeds maxCount, however much room is on screen', () => {
  // 12 well-separated candidates (0.05deg apart, real neighborhoods apart)
  // at a tight zoom where nothing should collide.
  const candidates = Array.from({ length: 12 }, (_, i) => fixture(`v${i}`, i * 0.05));
  const kept = selectCollisionFreePins(candidates, getPoint, MANCHESTER, 17, 5);
  assert.equal(kept.length, 5);
  assert.deepEqual(kept.map((f) => f.id), candidates.slice(0, 5).map((f) => f.id));
});

test('selectCollisionFreePins: default maxCount matches the exported MAX_MATCH_PINS ceiling', () => {
  const candidates = Array.from({ length: MAX_MATCH_PINS + 5 }, (_, i) => fixture(`v${i}`, i * 0.05));
  const kept = selectCollisionFreePins(candidates, getPoint, MANCHESTER, 17);
  assert.equal(kept.length, MAX_MATCH_PINS);
});

test('selectCollisionFreePins: an empty candidate list returns empty, not an error', () => {
  assert.deepEqual(selectCollisionFreePins([], getPoint, MANCHESTER, 12), []);
});

test('MIN_MATCH_PIN_GAP_PX is a sane positive pixel value', () => {
  assert.ok(MIN_MATCH_PIN_GAP_PX > 0 && MIN_MATCH_PIN_GAP_PX < 200);
});
