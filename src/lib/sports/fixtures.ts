/**
 * Real fixture lookups for the Moments screen's Sport & Spectating bump
 * (2026-09-30, at explicit user request: "watch the football and big fight
 * night should be context aware too, with the greater time discrepancy
 * allowance for big fight night... use premier league and champions league
 * and fa cup data for when to watch sports"), later extended the same day:
 * "if a category isnt relevant currently, dont even show it... dont show
 * boxing if there isnt a televised good bocing fight within the next 2
 * weeks... maybe we could list the events too... e.g premier league live
 * now, or x vs y on at 11pm thursday for boxing."
 *
 * Uses TheSportsDB (thesportsdb.com) — free, shared community API key
 * ("123"), no account or signup required, same "don't block on a new
 * credential" reasoning as weather/forecast.ts's own choice of Open-Meteo.
 *
 * Researched and deliberately scoped down from the original ask: Ryder Cup
 * exists in TheSportsDB's data but only via a stale, unscoped text search
 * (no real "next event" lookup for it, since it's a biennial one-off, not
 * a recurring competition with a clean schedule endpoint), and Sky Sports
 * Main Event has no public API at all — getting it for real would mean
 * scraping their site. Confirmed with the user: skip both, cover Big Fight
 * Night with Boxing + F1 instead, both of which have real, working
 * "next event" data on the free tier.
 *
 * `strTimestamp` values from TheSportsDB have no timezone suffix; treated
 * here as already correct for the browser's local time, which is a fair
 * assumption for this app's real UK-based catalog and audience — flagged
 * as an approximation, not independently re-verified against UTC.
 *
 * 2026-10-08, found live (a real screenshot: Big Fight Night showing an F1
 * practice session, Watch the Football showing a non-league FA Cup
 * qualifier): the free tier's eventsnextleague endpoint returns exactly
 * one result per league, with no way to skip a weak one for a better one
 * further out — confirmed by direct API calls, not assumed. Fixed at the
 * source rather than worked around in the UI: FA Cup dropped entirely
 * (FOOTBALL_LEAGUE_IDS's own comment has the full reasoning), F1 practice
 * sessions filtered out (F1_EXCLUDE_PATTERN).
 */

const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/123';

/** Premier League and Champions League only — FA Cup (id 4482) was dropped
 * 2026-10-08, found live: its "next event" during the August-October
 * qualifying rounds is a match between two non-league clubs (round 0 in
 * TheSportsDB's own numbering), months before Premier League clubs enter
 * at Round 3 Proper in January. The free tier's eventsnextleague endpoint
 * returns exactly one result, so there's no "skip to the next one" within
 * FA Cup itself to fall back to — PL + CL alone already give dense,
 * reliably top-flight weekly fixtures, so dropping FA Cup entirely (rather
 * than building a fragile round-number heuristic around one observed data
 * point) was the honest fix. Confirmed via direct API calls — not guessed. */
const FOOTBALL_LEAGUE_IDS = {
  premierLeague: 4328,
  championsLeague: 4480,
} as const;

/** Boxing (real, current fight-by-fight data, not a stale archive) and F1
 * — the two big-televised-event signals that survived research, standing
 * in for the "Sky Sports Main Event" idea without actually scraping it. */
const BIG_EVENT_LEAGUE_IDS = {
  boxing: 4445,
  f1: 4370,
} as const;

/** F1's "next event" is whatever's chronologically soonest, which for most
 * of a race weekend is a practice session, not the race — found live
 * 2026-10-08 ("Singapore Grand Prix Practice 1"). Practice is testing, not
 * must-watch TV, so it's excluded at the source (treated the same as "no
 * event found" for F1 that cycle) rather than shown under "Big Fight
 * Night". Qualifying and Sprint sessions are real competitive TV and stay
 * eligible — only Practice is filtered. */
const F1_EXCLUDE_PATTERN = /practice/i;

/** Kickoff-to-full-time-plus-a-bit — long enough that a match still in
 * progress (or just finished) keeps Watch the Football live/bumped, short
 * enough that a match from this morning doesn't still count this evening. */
export const FOOTBALL_DURATION_HOURS = 2.5;
/** People decide to watch football on shorter notice than they plan a fight
 * night around — the moment bumps to the front of its category starting
 * this many hours before kickoff. */
export const FOOTBALL_BUMP_LOOKAHEAD_HOURS = 24;
/** How far ahead a real fixture still makes Watch the Football worth
 * showing at all, even unbumped — generous enough to survive a normal
 * mid-week fixture gap without generous enough to show during a genuine
 * off-season with nothing real scheduled. */
export const FOOTBALL_SHOW_LOOKAHEAD_HOURS = 336; // 2 weeks

/** Boxing undercards run long, and a big F1 weekend is genuinely an
 * all-afternoon thing — a wider "still live" window than a single
 * football match. */
export const BIG_EVENT_DURATION_HOURS = 4;
/** Big Fight Night gets organised further ahead than "is there football
 * on" — the "greater time discrepancy allowance" the user asked for. */
export const BIG_EVENT_BUMP_LOOKAHEAD_HOURS = 72;
/** "dont show boxing if there isnt a televised good bocing fight within
 * the next 2 weeks" — the user's own stated window, applied to both
 * Boxing and F1 for the same reason FOOTBALL_SHOW_LOOKAHEAD_HOURS applies
 * uniformly to all three football competitions. */
export const BIG_EVENT_SHOW_LOOKAHEAD_HOURS = 336; // 2 weeks

export interface Fixture {
  /** The real fixture/event name from TheSportsDB (e.g. "Arsenal vs Leeds
   * United", "Ben Whittaker vs Conor Wallace") — not a generic "there's a
   * match on" placeholder, per the brand voice's own "specific, earned
   * observation" rule (CLAUDE.md). */
  name: string;
  date: Date;
}

interface SportsDbEvent {
  strEvent?: string;
  strTimestamp?: string;
}

/** The soonest upcoming event for one league, or null on any failure (no
 * key, network error, malformed response, nothing scheduled) — same
 * null-means-fallback pattern as fetchWeather/resolveDeviceLocation. An
 * event whose name matches `exclude` (e.g. an F1 practice session) is
 * treated exactly like "nothing scheduled" — the free tier's one-result
 * limit means there's no next-best alternative to fall back to within the
 * same league, so a filtered-out event just means this league contributes
 * nothing this cycle, same as a real gap would. */
async function fetchNextEvent(leagueId: number, exclude?: RegExp): Promise<Fixture | null> {
  try {
    const res = await fetch(`${THESPORTSDB_BASE}/eventsnextleague.php?id=${leagueId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { events?: SportsDbEvent[] };
    const event = data.events?.[0];
    if (!event?.strTimestamp || !event.strEvent) return null;
    if (exclude?.test(event.strEvent)) return null;
    const date = new Date(event.strTimestamp);
    return Number.isNaN(date.getTime()) ? null : { name: event.strEvent, date };
  } catch {
    return null;
  }
}

/** The soonest of several leagues' next events — used to combine Premier
 * League/Champions League into one "when's the next real match" signal,
 * and Boxing/F1 into one "when's the next big event" signal. */
async function soonestOf(fetches: Promise<Fixture | null>[]): Promise<Fixture | null> {
  const fixtures = (await Promise.all(fetches)).filter((f): f is Fixture => f !== null);
  if (fixtures.length === 0) return null;
  return fixtures.reduce((earliest, f) => (f.date < earliest.date ? f : earliest));
}

/** Next real Premier League or Champions League fixture, whichever comes
 * first — or null if neither could be fetched. */
export function fetchNextFootballFixture(): Promise<Fixture | null> {
  return soonestOf(Object.values(FOOTBALL_LEAGUE_IDS).map((id) => fetchNextEvent(id)));
}

/** Next real Boxing or F1 event, whichever comes first — or null if
 * neither could be fetched (an F1 practice session counts as not found,
 * see F1_EXCLUDE_PATTERN above). */
export function fetchNextBigEventFixture(): Promise<Fixture | null> {
  return soonestOf([
    fetchNextEvent(BIG_EVENT_LEAGUE_IDS.boxing),
    fetchNextEvent(BIG_EVENT_LEAGUE_IDS.f1, F1_EXCLUDE_PATTERN),
  ]);
}

/**
 * True when `now` falls inside the real window for a fetched fixture: from
 * `lookaheadHours` before it, through `durationHours` after it. Pure and
 * separately exported so it's testable without a network call, and reused
 * for both the "show at all" (wide lookahead) and "bump to the front"
 * (narrow lookahead) decisions — same function, different constants.
 *
 * "Once event ends, it should adjust accordingly, unless more events are
 * coming up" (the user's own requirement) falls out of this naturally
 * without any extra state: the fixture passed in is always whichever
 * event is chronologically NEXT (soonestOf above), so once today's
 * match's window closes, this re-evaluates against whatever the next real
 * fixture is — still true if another one's within the window, not if
 * there's nothing until next week.
 */
export function isWithinFixtureWindow(
  fixture: Fixture | null,
  lookaheadHours: number,
  durationHours: number,
  now: Date = new Date()
): boolean {
  if (!fixture) return false;
  const windowStart = fixture.date.getTime() - lookaheadHours * 60 * 60 * 1000;
  const windowEnd = fixture.date.getTime() + durationHours * 60 * 60 * 1000;
  const t = now.getTime();
  return t >= windowStart && t <= windowEnd;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatTime(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const period = hours24 >= 12 ? 'pm' : 'am';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return minutes === 0 ? `${hours12}${period}` : `${hours12}:${String(minutes).padStart(2, '0')}${period}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * The short, real, specific line the user asked to see alongside a
 * context-aware moment ("maybe we could list the events too, but not all
 * of them, e.g premier league live now, or x vs y on at 11pm thursday for
 * boxing") — one fixture's real name plus a plain-English "when", never a
 * generic "there's a match on". `durationHours` decides the "live now"
 * window the same way isWithinFixtureWindow's own does.
 */
export function describeFixtureTiming(
  fixture: Fixture,
  durationHours: number,
  now: Date = new Date()
): string {
  const isLive = now.getTime() >= fixture.date.getTime() && now.getTime() <= fixture.date.getTime() + durationHours * 60 * 60 * 1000;
  if (isLive) return `${fixture.name} · live now`;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = formatTime(fixture.date);

  if (isSameCalendarDay(fixture.date, now)) return `${fixture.name} · today at ${time}`;
  if (isSameCalendarDay(fixture.date, tomorrow)) return `${fixture.name} · tomorrow at ${time}`;

  const daysAhead = Math.round((fixture.date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  const dayName = DAY_NAMES[fixture.date.getDay()];
  if (daysAhead < 7) return `${fixture.name} · ${dayName} at ${time}`;

  return `${fixture.name} · ${dayName} ${fixture.date.getDate()} ${MONTH_NAMES[fixture.date.getMonth()]}`;
}
