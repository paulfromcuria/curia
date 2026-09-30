/**
 * Unit tests for src/lib/weather/forecast.ts's pure logic —
 * `resolveTargetDate` (2026-08) and `isExtremeWeather` (2026-09-30, the
 * Moments screen's weather-led category bump) — the parts of the real-
 * weather integration that don't require a network call. `fetchWeather`
 * itself (the actual Open-Meteo call) is exercised live in the running
 * app, not here — this project's test suite has no fetch-mocking
 * dependency and doesn't need one just for this. See rank-venues.test.mts's
 * own top comment for why `.test.mts` + `node --test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isExtremeWeather, resolveTargetDate } from './forecast.ts';

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

test('isExtremeWeather: a real storm/snow/downpour is extreme regardless of temperature', () => {
  assert.equal(isExtremeWeather('9° Thunderstorm'), true);
  assert.equal(isExtremeWeather('1° Heavy snow'), true);
  assert.equal(isExtremeWeather('14° Heavy rain'), true);
});

test('isExtremeWeather: a mild clear day is not extreme', () => {
  assert.equal(isExtremeWeather('18° Clear'), false);
  assert.equal(isExtremeWeather('16° Mostly clear'), false);
  assert.equal(isExtremeWeather('12° Overcast'), false);
});

test('isExtremeWeather: a properly hot, clear day is extreme', () => {
  assert.equal(isExtremeWeather('28° Clear'), true);
  assert.equal(isExtremeWeather('25° Clear'), true); // threshold is inclusive
});

test("isExtremeWeather: a hot day that isn't actually clear/sunny doesn't count", () => {
  // Overcast/fog at a high temperature isn't the "super sunny" case this exists for.
  assert.equal(isExtremeWeather('27° Overcast'), false);
  assert.equal(isExtremeWeather('26° Fog'), false);
});

test('isExtremeWeather: a genuinely cold but dry/clear day is not extreme (no temperature floor on the cold side)', () => {
  // Deliberate: cold-side "extreme" is defined by real precipitation/storm
  // keywords (matches rank-venues.ts's own EXTREME_WEATHER_KEYWORDS bar),
  // not a bare low temperature — see this function's own doc comment.
  assert.equal(isExtremeWeather('-2° Clear'), false);
});

test('isExtremeWeather: no weather data is never extreme', () => {
  assert.equal(isExtremeWeather(undefined), false);
  assert.equal(isExtremeWeather(null), false);
  assert.equal(isExtremeWeather(''), false);
});
