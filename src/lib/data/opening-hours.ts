/**
 * "Is this venue open right now" — the real logic behind Map's closed
 * indicator (2026-09-18, at explicit user request: a red ring/cross on a
 * venue's icon, zoomed in to a local level, when it's genuinely closed
 * right now). Pure and seed-free by design (same reasoning as
 * rank-venues.ts's own top comment) so it's directly unit-testable.
 *
 * Deliberately NOT a ranking signal — this never touches score or
 * ordering (rank-venues.ts is untouched), only what Map draws on top of a
 * pin that's already there. A closed venue can still be a great match; the
 * member just needs to be told, honestly, that it's shut right now.
 */
import type { DayName, DayTimeBand, OpeningHours, Venue } from '../../types/models';
import { resolveTargetDate } from '../weather/forecast.ts';

const DAY_ORDER: DayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Absolute minutes since Sunday 00:00 for a given day+time — the common
 * timeline every range below is measured against, so a range that spans
 * midnight (or, for a Saturday-night venue, spans the week boundary back
 * into Sunday) is just a normal interval on this line, not a special case
 * the caller has to think about.
 */
function absoluteMinutes(day: DayName, hhmm: string): number {
  return DAY_ORDER.indexOf(day) * MINUTES_PER_DAY + timeToMinutes(hhmm);
}

/**
 * Determines whether `hours` says a venue is open at `day`+`time` (24h
 * "HH:MM"). Returns `undefined` — never `false` — when there's no real
 * data to answer from, matching this codebase's established
 * no-signal-no-penalty convention (scorePetFit/scoreDayOfWeek/etc. in
 * rank-venues.ts): an unresearched venue must never render as closed.
 */
export function isOpenAt(hours: OpeningHours | undefined, day: DayName, time: string): boolean | undefined {
  if (!hours) return undefined;
  const hasAnyRealData = DAY_ORDER.some((d) => (hours[d]?.length ?? 0) > 0);
  if (!hasAnyRealData) return undefined;

  const nowAbs = absoluteMinutes(day, time);

  for (const d of DAY_ORDER) {
    const ranges = hours[d];
    if (!ranges) continue;
    for (const range of ranges) {
      const startAbs = absoluteMinutes(d, range.open);
      let endAbs = absoluteMinutes(d, range.close);
      if (endAbs <= startAbs) endAbs += MINUTES_PER_DAY; // spans midnight into the next day
      if (nowAbs >= startAbs && nowAbs < endAbs) return true;
      // A Saturday-night range can spill past the week boundary back into
      // Sunday morning in absolute terms — check "now, one week forward"
      // too, so that wraparound reads as open without a separate branch.
      if (nowAbs + MINUTES_PER_WEEK >= startAbs && nowAbs + MINUTES_PER_WEEK < endAbs) return true;
    }
  }
  return false;
}

/** Convenience wrapper over isOpenAt for a real Venue + resolved
 * day/time — what Map actually calls per pin. */
export function isVenueOpenAt(venue: Pick<Venue, 'openingHours'>, day: DayName, time: string): boolean | undefined {
  return isOpenAt(venue.openingHours, day, time);
}

/**
 * The real clock time to check "is this venue open" against, given the
 * currently-resolved context — the real current time when `contextIsNow`
 * is true, or a representative hour for the band otherwise (planning for
 * a future day/band has no real "now" to check a venue's hours against).
 * Shares resolveTargetDate's own representative-hour table
 * (src/lib/weather/forecast.ts) so this and the weather forecast always
 * agree on what "Friday evening" concretely means.
 */
export function currentClockTime(
  contextIsNow: boolean,
  day: DayName,
  band: DayTimeBand,
  clock: () => Date = () => new Date()
): string {
  const date = contextIsNow ? clock() : resolveTargetDate(day, band, clock());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
