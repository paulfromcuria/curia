/**
 * Unit tests for src/lib/weather/forecast.ts's pure date-resolution logic
 * (`resolveTargetDate`) — the part of the real-weather integration
 * (2026-08) that doesn't require a network call. `fetchWeather` itself
 * (the actual Open-Meteo call) is exercised live in the running app, not
 * here — this project's test suite has no fetch-mocking dependency and
 * doesn't need one just for this. See rank-venues.test.mts's own top
 * comment for why `.test.mts` + `node --test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargetDate } from './forecast.ts';

// A fixed Wednesday for deterministic "days ahead" math.
const WEDNESDAY = new Date(2026, 7, 12, 15, 0, 0); // 2026-08-12 is a Wednesday

test('resolveTargetDate: same weekday as today resolves to today, at the band hour', () => {
  const target = resolveTargetDate('wednesday', 'evening', WEDNESDAY);
  assert.equal(target.getFullYear(), 2026);
  assert.equal(target.getMonth(), 7);
  assert.equal(target.getDate(), 12);
  assert.equal(target.getHours(), 19);
});

test('resolveTargetDate: a future weekday resolves to the next real occurrence', () => {
  // Wednesday -> next Friday is 2 days ahead.
  const target = resolveTargetDate('friday', 'evening', WEDNESDAY);
  assert.equal(target.getDate(), 14);
  assert.equal(target.getHours(), 19);
});

test('resolveTargetDate: a weekday earlier in the week wraps to next week, not last', () => {
  // Wednesday -> Monday must resolve forward (5 days ahead), never backward.
  const target = resolveTargetDate('monday', 'morning', WEDNESDAY);
  assert.equal(target.getDate(), 17);
  assert.ok(target.getTime() > WEDNESDAY.getTime());
});

test('resolveTargetDate: each band maps to its own representative hour', () => {
  assert.equal(resolveTargetDate('wednesday', 'morning', WEDNESDAY).getHours(), 9);
  assert.equal(resolveTargetDate('wednesday', 'afternoon', WEDNESDAY).getHours(), 14);
  assert.equal(resolveTargetDate('wednesday', 'evening', WEDNESDAY).getHours(), 19);
  assert.equal(resolveTargetDate('wednesday', 'late', WEDNESDAY).getHours(), 23);
});
