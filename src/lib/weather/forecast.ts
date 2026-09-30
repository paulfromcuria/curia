/**
 * Real weather forecasting (2026-08, at explicit user request: "lets pull in
 * real weather data using an API. when a user changes their context...the
 * predicted weather should be pulled in too"). Replaces the static
 * per-band WEATHER_BY_BAND mock that previously lived in map.tsx/map.web.tsx.
 *
 * Uses Open-Meteo (open-meteo.com) — free forecast API, no API key or
 * account required, unlike Mapbox/Stripe. Picked specifically so this
 * feature doesn't need to block on a new credential.
 *
 * The output string format ("11° Light rain") deliberately matches the old
 * mock's register exactly, and the WMO-code descriptions below deliberately
 * reuse the same keywords (rain, snow, storm, freezing, clear) that
 * src/lib/scoring/rank-venues.ts's scoreWeather() keyword-matches against
 * (WET_OR_COLD / WARM_OR_CLEAR) — so real data drops in without touching the
 * scoring engine at all.
 */
import type { DayTimeBand } from '../../types/models';
import { EXTREME_WEATHER_KEYWORDS, WARM_OR_CLEAR } from '../scoring/rank-venues.ts';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** JS Date#getDay() order (0=Sunday), used to resolve a resolveContext()
 * day name like "friday" to the next real calendar date. */
const DAY_NAMES_BY_JS_INDEX = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

/** One representative hour per band, matching rank-venues.ts's own
 * bandForHour() bucket boundaries (morning 6-12, afternoon 12-17,
 * evening 17-23, late 23-6). */
const BAND_HOUR: Record<DayTimeBand, number> = {
  morning: 9,
  afternoon: 14,
  evening: 19,
  late: 23,
};

/**
 * WMO weather codes (Open-Meteo's `weather_code`) mapped to short,
 * brand-voice descriptions. Wherever a code genuinely means rain, snow,
 * storm, freezing conditions, or clear skies, the description keeps that
 * exact word so scoreWeather's keyword matching keeps working unchanged —
 * only the source of the string changed, not its shape. Codes with no
 * clear wet/cold-vs-warm/clear read (fog, overcast, light drizzle, partly
 * cloudy) fall to a neutral description, same as the old mock's own
 * "Bright spells" already did.
 */
const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Bright spells',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy rain showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
};

function describeWeatherCode(code: number): string {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? 'Overcast';
}

/**
 * The real-world Date a resolved day+band points at: the next occurrence of
 * that weekday (today, if today already is that weekday) at a fixed
 * representative hour for the band. Exported for tests.
 */
export function resolveTargetDate(day: string, band: DayTimeBand, now: Date = new Date()): Date {
  const targetDow = DAY_NAMES_BY_JS_INDEX.indexOf(day as (typeof DAY_NAMES_BY_JS_INDEX)[number]);
  const currentDow = now.getDay();
  const daysAhead = targetDow === -1 ? 0 : (targetDow - currentDow + 7) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() + daysAhead);
  target.setHours(BAND_HOUR[band], 0, 0, 0);
  return target;
}

interface OpenMeteoResponse {
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
  };
}

/**
 * Fetches a real forecast string ("11° Light rain") for `location` at the
 * real-world time `day`+`band` resolves to. Returns null on any failure
 * (network error, malformed response, or a date beyond Open-Meteo's free
 * forecast window) — callers fall back to the old static per-band mock,
 * the same null-means-fallback pattern already used for session.location
 * before geolocation resolves.
 */
export async function fetchWeather(
  location: { lat: number; lon: number },
  day: string,
  band: DayTimeBand
): Promise<string | null> {
  try {
    const target = resolveTargetDate(day, band);
    const url =
      `${OPEN_METEO_URL}?latitude=${location.lat}&longitude=${location.lon}` +
      `&hourly=temperature_2m,weather_code&temperature_unit=celsius&forecast_days=10&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OpenMeteoResponse;
    const times = data.hourly?.time;
    const temps = data.hourly?.temperature_2m;
    const codes = data.hourly?.weather_code;
    if (!times || !temps || !codes || times.length === 0) return null;

    let closestIndex = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < times.length; i++) {
      const diff = Math.abs(new Date(times[i]).getTime() - target.getTime());
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    const temp = temps[closestIndex];
    const code = codes[closestIndex];
    if (temp === undefined || code === undefined) return null;
    return `${Math.round(temp)}° ${describeWeatherCode(code)}`;
  } catch {
    return null;
  }
}

/** A genuinely hot day in this app's real, live markets (UK/Cheshire/
 * Manchester weather, the only region real forecasts are wired up for) —
 * not just "a mild clear afternoon." Deliberately separate from
 * EXTREME_WEATHER_KEYWORDS, which only covers the wet/cold side (storm,
 * snow, etc.) — nothing in that list, or in WARM_OR_CLEAR's own "nice
 * weather" vocabulary, previously distinguished a pleasant 18° day from a
 * genuine 28° one, and "super sunny" needs that distinction to mean
 * anything. */
const EXTREME_HOT_THRESHOLD_C = 25;

/** The "super sunny" half of isExtremeWeather, split out (2026-09-30) so
 * Moments (First Sunny Evening vs Cosy Winter Warm-Up) can show/hide each
 * independently rather than as one combined Weather-Led toggle — showing
 * a "cosy fire" moment on a genuinely hot week, just because a storm is
 * also forecast, would be exactly the kind of irrelevant clutter the
 * category-level hide is meant to remove. */
export function isExtremeHotWeather(weather: string | null | undefined): boolean {
  if (!weather) return false;
  const w = weather.toLowerCase();
  const tempMatch = w.match(/^(-?\d+)°/);
  const temp = tempMatch ? Number(tempMatch[1]) : null;
  return temp !== null && temp >= EXTREME_HOT_THRESHOLD_C && WARM_OR_CLEAR.some((k) => w.includes(k));
}

/** The storm/snow/downpour half of isExtremeWeather, split out for the
 * same reason as isExtremeHotWeather above. */
export function isExtremeColdWetWeather(weather: string | null | undefined): boolean {
  if (!weather) return false;
  const w = weather.toLowerCase();
  return EXTREME_WEATHER_KEYWORDS.some((k) => w.includes(k));
}

/**
 * True for weather genuinely extreme enough to be worth surfacing, not
 * just "a bit off" — a real storm/snow/downpour (EXTREME_WEATHER_KEYWORDS,
 * the same bar rank-venues.ts's own weight boost and outdoor-venue
 * discount already use) or a properly hot, clear day (temperature parsed
 * straight out of this module's own "24° Clear" format, not a second
 * fetch). Built for src/app/(tabs)/moments.tsx's context-aware category
 * ordering (2026-09-30, at explicit user request: "during extremes aka
 * super sunny or snowing etc it should be bumped") — kept here, next to
 * the format it parses, rather than in moments.tsx, so a future change to
 * that format only needs updating in one place. Used for the "is it
 * extreme right now" bump-to-front-of-category signal; the per-moment
 * show/hide decision uses the two split predicates above plus
 * fetchExtremeWeatherOutlook below, since that needs to know *which*
 * extreme, not just whether one exists.
 */
export function isExtremeWeather(weather: string | null | undefined): boolean {
  return isExtremeHotWeather(weather) || isExtremeColdWetWeather(weather);
}

/**
 * Scans the next `days` days of real hourly forecast (not just one
 * resolved day+band point, unlike fetchWeather above) and reports whether
 * a genuine hot extreme or cold/wet extreme shows up anywhere in that
 * window — built for the Moments screen's "don't show Weather-Led at all
 * if nothing's actually coming" rule (2026-09-30, at explicit user
 * request: "dont show the weather one if its overcast for the next few
 * days"). Reuses the same Open-Meteo hourly endpoint fetchWeather already
 * calls and the same isExtremeHotWeather/isExtremeColdWetWeather
 * predicates — one data source and one definition of "extreme", not a
 * second one invented for the outlook case. A separate network call from
 * fetchWeather's own (both request overlapping hourly data but for
 * different purposes — one point-in-time string for scoring/copy, one
 * whole-window scan for a screen-level show/hide decision) — accepted as
 * a minor, deliberate duplication rather than restructuring session.tsx's
 * existing weather fetch to share raw hourly data it doesn't otherwise
 * need.
 */
export async function fetchExtremeWeatherOutlook(
  location: { lat: number; lon: number },
  days: number
): Promise<{ hotExtreme: boolean; coldWetExtreme: boolean }> {
  const none = { hotExtreme: false, coldWetExtreme: false };
  try {
    const url =
      `${OPEN_METEO_URL}?latitude=${location.lat}&longitude=${location.lon}` +
      `&hourly=temperature_2m,weather_code&temperature_unit=celsius` +
      `&forecast_days=${Math.min(Math.max(days, 1) + 1, 10)}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return none;
    const data = (await res.json()) as OpenMeteoResponse;
    const times = data.hourly?.time;
    const temps = data.hourly?.temperature_2m;
    const codes = data.hourly?.weather_code;
    if (!times || !temps || !codes) return none;

    const now = Date.now();
    const horizon = now + days * 24 * 60 * 60 * 1000;
    let hotExtreme = false;
    let coldWetExtreme = false;
    for (let i = 0; i < times.length && (!hotExtreme || !coldWetExtreme); i++) {
      const t = new Date(times[i]).getTime();
      if (t < now || t > horizon) continue;
      const temp = temps[i];
      const code = codes[i];
      if (temp === undefined || code === undefined) continue;
      const description = `${Math.round(temp)}° ${describeWeatherCode(code)}`;
      if (isExtremeHotWeather(description)) hotExtreme = true;
      if (isExtremeColdWetWeather(description)) coldWetExtreme = true;
    }
    return { hotExtreme, coldWetExtreme };
  } catch {
    return none;
  }
}
