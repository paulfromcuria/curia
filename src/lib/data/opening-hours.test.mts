/**
 * Unit tests for src/lib/data/opening-hours.ts — the "is this venue open
 * right now" logic behind Map's closed indicator. Run with `node --test`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { currentClockTime, isOpenAt, isVenueOpenAt } from './opening-hours.ts';
import type { OpeningHours } from '../../types/models.ts';

test('isOpenAt: undefined hours (venue not yet researched) is undefined, never closed', () => {
  assert.equal(isOpenAt(undefined, 'monday', '12:00'), undefined);
});

test('isOpenAt: an object with no real ranges on any day is undefined, not closed', () => {
  const hours: OpeningHours = {};
  assert.equal(isOpenAt(hours, 'monday', '12:00'), undefined);
});

test('isOpenAt: a simple same-day range', () => {
  const hours: OpeningHours = { monday: [{ open: '09:00', close: '17:00' }] };
  assert.equal(isOpenAt(hours, 'monday', '10:00'), true);
  assert.equal(isOpenAt(hours, 'monday', '08:59'), false);
  assert.equal(isOpenAt(hours, 'monday', '17:00'), false, 'the close time itself is not open (exclusive end)');
});

test('isOpenAt: a day explicitly listed with an empty range is closed that day, not unknown', () => {
  const hours: OpeningHours = { monday: [{ open: '09:00', close: '17:00' }], tuesday: [] };
  assert.equal(isOpenAt(hours, 'tuesday', '12:00'), false);
});

test('isOpenAt: a day absent from the record is closed that day (real data exists elsewhere)', () => {
  const hours: OpeningHours = { monday: [{ open: '09:00', close: '17:00' }] };
  assert.equal(isOpenAt(hours, 'wednesday', '12:00'), false);
});

test('isOpenAt: multiple ranges on one day (lunch/dinner split)', () => {
  const hours: OpeningHours = {
    monday: [
      { open: '09:00', close: '15:00' },
      { open: '17:00', close: '23:00' },
    ],
  };
  assert.equal(isOpenAt(hours, 'monday', '12:00'), true);
  assert.equal(isOpenAt(hours, 'monday', '16:00'), false, 'the gap between lunch and dinner service');
  assert.equal(isOpenAt(hours, 'monday', '20:00'), true);
});

test('isOpenAt: an overnight range (open before midnight, close after) stays open past midnight', () => {
  const hours: OpeningHours = { friday: [{ open: '22:00', close: '02:00' }] };
  assert.equal(isOpenAt(hours, 'friday', '23:00'), true);
  assert.equal(isOpenAt(hours, 'saturday', '01:00'), true, 'still open into the small hours of Saturday');
  assert.equal(isOpenAt(hours, 'saturday', '03:00'), false, 'closed by 2am, an hour past close');
});

test('isOpenAt: a Saturday-night range correctly wraps across the week boundary into Sunday', () => {
  const hours: OpeningHours = { saturday: [{ open: '22:00', close: '02:00' }] };
  assert.equal(isOpenAt(hours, 'sunday', '01:00'), true, 'the week-boundary wraparound case');
  assert.equal(isOpenAt(hours, 'sunday', '03:00'), false);
});

test('isVenueOpenAt: reads openingHours off a venue-shaped object', () => {
  const venue = { openingHours: { monday: [{ open: '09:00', close: '17:00' }] } };
  assert.equal(isVenueOpenAt(venue, 'monday', '12:00'), true);
  assert.equal(isVenueOpenAt({ openingHours: undefined }, 'monday', '12:00'), undefined);
});

test('currentClockTime: with a live "now" context, reads the real clock', () => {
  const clock = () => new Date(2026, 0, 1, 14, 37);
  assert.equal(currentClockTime(true, 'thursday', 'afternoon', clock), '14:37');
});

test('currentClockTime: with a manual day/band plan, uses that band\'s representative hour', () => {
  const clock = () => new Date(2026, 0, 1, 14, 37);
  // 'evening' resolves to 19:00 per resolveTargetDate's own BAND_HOUR table
  // — the real live clock time (14:37) is irrelevant here, since the
  // member is planning for a different time, not asking about right now.
  assert.equal(currentClockTime(false, 'friday', 'evening', clock), '19:00');
});
