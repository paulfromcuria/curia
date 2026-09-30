/**
 * Unit tests for src/lib/sports/fixtures.ts's pure logic
 * (`isWithinFixtureWindow`, `describeFixtureTiming`) — the parts of the
 * Sport & Spectating bump/show/hide (2026-09-30) that don't require a
 * network call. The actual TheSportsDB fetches are exercised live in the
 * running app, not here — same no-fetch-mocking-dependency reasoning as
 * forecast.test.mts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIG_EVENT_BUMP_LOOKAHEAD_HOURS,
  BIG_EVENT_DURATION_HOURS,
  BIG_EVENT_SHOW_LOOKAHEAD_HOURS,
  describeFixtureTiming,
  FOOTBALL_BUMP_LOOKAHEAD_HOURS,
  FOOTBALL_DURATION_HOURS,
  FOOTBALL_SHOW_LOOKAHEAD_HOURS,
  isWithinFixtureWindow,
  type Fixture,
} from './fixtures.ts';

// A fixed Saturday for deterministic "days ahead" math.
const NOW = new Date(2026, 9, 10, 12, 0, 0); // 2026-10-10 12:00, a Saturday

function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

function fixture(name: string, hours: number): Fixture {
  return { name, date: hoursFromNow(hours) };
}

test('isWithinFixtureWindow: no fetched fixture is never within the window', () => {
  assert.equal(isWithinFixtureWindow(null, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), false);
});

test('isWithinFixtureWindow (football bump): a match kicking off in 3 hours is already bumped', () => {
  const f = fixture('Arsenal vs Leeds United', 3);
  assert.equal(isWithinFixtureWindow(f, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), true);
});

test('isWithinFixtureWindow (football bump): a match in 2 days is not bumped yet, but still show-worthy', () => {
  const f = fixture('Arsenal vs Leeds United', 48);
  assert.equal(isWithinFixtureWindow(f, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), false);
  assert.equal(isWithinFixtureWindow(f, FOOTBALL_SHOW_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), true);
});

test('isWithinFixtureWindow (football show): nothing for 3 weeks means genuinely hidden', () => {
  const f = fixture('Arsenal vs Leeds United', 24 * 21);
  assert.equal(isWithinFixtureWindow(f, FOOTBALL_SHOW_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), false);
});

test('isWithinFixtureWindow: stays true until the estimated final whistle, not just kickoff', () => {
  const justKickedOff = fixture('Arsenal vs Leeds United', -1);
  assert.equal(isWithinFixtureWindow(justKickedOff, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), true);
  const longOver = fixture('Arsenal vs Leeds United', -3);
  assert.equal(isWithinFixtureWindow(longOver, FOOTBALL_BUMP_LOOKAHEAD_HOURS, FOOTBALL_DURATION_HOURS, NOW), false);
});

test('isWithinFixtureWindow (big event): the wider bump/show allowance the user asked for', () => {
  const f = fixture('Ben Whittaker vs Conor Wallace', 48);
  assert.equal(isWithinFixtureWindow(f, BIG_EVENT_BUMP_LOOKAHEAD_HOURS, BIG_EVENT_DURATION_HOURS, NOW), true);
  const farther = fixture('Ben Whittaker vs Conor Wallace', 24 * 13);
  assert.equal(isWithinFixtureWindow(farther, BIG_EVENT_SHOW_LOOKAHEAD_HOURS, BIG_EVENT_DURATION_HOURS, NOW), true);
  const tooFar = fixture('Ben Whittaker vs Conor Wallace', 24 * 15);
  assert.equal(isWithinFixtureWindow(tooFar, BIG_EVENT_SHOW_LOOKAHEAD_HOURS, BIG_EVENT_DURATION_HOURS, NOW), false);
});

test('describeFixtureTiming: a match in progress reads "live now"', () => {
  const f = fixture('Arsenal vs Leeds United', -1);
  assert.equal(describeFixtureTiming(f, FOOTBALL_DURATION_HOURS, NOW), 'Arsenal vs Leeds United · live now');
});

test('describeFixtureTiming: later today reads "today at <time>"', () => {
  const f = fixture('Arsenal vs Leeds United', 5); // 17:00 same day
  assert.equal(describeFixtureTiming(f, FOOTBALL_DURATION_HOURS, NOW), 'Arsenal vs Leeds United · today at 5pm');
});

test('describeFixtureTiming: tomorrow reads "tomorrow at <time>"', () => {
  const f = fixture('Arsenal vs Leeds United', 23); // ~11am the next day
  assert.equal(describeFixtureTiming(f, FOOTBALL_DURATION_HOURS, NOW), 'Arsenal vs Leeds United · tomorrow at 11am');
});

test('describeFixtureTiming: within a week reads "<Day> at <time>", matching the user\'s own example', () => {
  // 2026-10-10 12:00 is a Saturday; +4 days 11 hours lands Wednesday 23:00.
  const f = fixture('Ben Whittaker vs Conor Wallace', 24 * 4 + 11);
  assert.equal(
    describeFixtureTiming(f, BIG_EVENT_DURATION_HOURS, NOW),
    'Ben Whittaker vs Conor Wallace · Wednesday at 11pm'
  );
});

test('describeFixtureTiming: more than a week out adds the calendar date to avoid ambiguity', () => {
  const f = fixture('Ben Whittaker vs Conor Wallace', 24 * 10);
  assert.equal(
    describeFixtureTiming(f, BIG_EVENT_DURATION_HOURS, NOW),
    'Ben Whittaker vs Conor Wallace · Tuesday 20 Oct'
  );
});
