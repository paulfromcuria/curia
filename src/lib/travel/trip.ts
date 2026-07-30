/**
 * Trip-to-venue estimator for the Walk and Ride handoff screens
 * (curia-moments-journeys, M6).
 *
 * Ported faithfully from the design source's own `trip()`/ride-tier logic
 * (Curia.dc.html, `trip(to)` and the `isRide` fare-tier block) rather than
 * invented fresh — the prototype's ride screen was never a real Uber
 * integration either: it computes a local fare estimate from straight-line
 * distance and simulates "REQUEST X" as a local state flip ("Handing you to
 * the Uber app..."), never actually calling out. That's why this stays a
 * pure function here too. A real ride provider (Uber or otherwise) needs a
 * real account/API key — a genuine credential gap (see CLAUDE.md "Still
 * genuinely open": Mapbox/Stripe are the named gaps for map/subscription;
 * this is the same category of gap for ride-hailing, just not yet named
 * there) — flagging it rather than guessing at an integration.
 *
 * Reuses `haversineMiles` from the M3 scoring engine (a pure, already-shared
 * utility — src/lib/scoring/rank-venues.ts, also imported this way by
 * map.tsx/list.tsx) rather than reimplementing great-circle distance.
 */
import { haversineMiles } from '../scoring/rank-venues';

export interface TripEstimate {
  /** Straight-line distance, miles. */
  straightMiles: number;
  /** Road distance, miles — the prototype's own straight-line * 1.28 fudge
   * factor for "roads wander, so the driving distance is longer than the
   * straight line". */
  roadMiles: number;
  walkMinutes: number;
  driveMinutes: number;
  /** Under half a mile (805m) it's a walk; past that, a car (prototype's own threshold). */
  walkable: boolean;
}

const ROAD_FACTOR = 1.28;
const WALKABLE_THRESHOLD_MILES = 805 / 1609;

export function estimateTrip(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): TripEstimate {
  const straightMiles = haversineMiles(from, to);
  const roadMiles = straightMiles * ROAD_FACTOR;
  return {
    straightMiles,
    roadMiles,
    walkMinutes: Math.max(2, Math.round((straightMiles * 1609) / 80)),
    driveMinutes: Math.max(4, Math.round((roadMiles * 1609) / 420)),
    walkable: straightMiles < WALKABLE_THRESHOLD_MILES,
  };
}

export interface RideTier {
  name: string;
  sub: string;
  waitMinutes: number;
  price: number;
}

const RIDE_TIER_DEFS = [
  { name: 'UberX', sub: 'Affordable, everyday rides', mult: 1, waitMinutes: 3 },
  { name: 'Uber Comfort', sub: 'Newer cars, extra legroom', mult: 1.32, waitMinutes: 5 },
  { name: 'Uber Black', sub: 'Premium saloon, professional driver', mult: 2.1, waitMinutes: 8 },
] as const;

/** Local fare estimate across 3 tiers — same formula as the prototype's own
 * (mocked) ride screen: a flat-ish call-out fee plus a per-mile rate. */
export function rideTiersFor(trip: TripEstimate): RideTier[] {
  const basePrice = 4.2 + trip.roadMiles * 2.35;
  return RIDE_TIER_DEFS.map((t) => ({
    name: t.name,
    sub: t.sub,
    waitMinutes: t.waitMinutes,
    price: basePrice * t.mult,
  }));
}

export function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`;
}
