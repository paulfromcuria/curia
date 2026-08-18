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
