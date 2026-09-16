/**
 * Stage 1: Plan. Picks which real districts to target this run, using
 * markets.yaml's phase order against live venue counts — the first phase
 * with any district under minVenueFloor wins; new-metro phases contribute
 * their newMetros entries directly (nothing to count venues against yet).
 * Pure selection logic, no model call — Discover is where the real
 * research spend happens.
 */
import { loadMarkets } from '../markets.js';
import { fetchDistrictVenueCounts } from '../content-read.js';

export interface PlannedTarget {
  districtId: string;
  metro: string;
  /** Set only for a target that doesn't exist as a real district yet —
   * Discover treats this as "propose a district_candidate first,"
   * Verify/Copy/Gate check don't run against it until it's a real id. */
  isNewMetro?: boolean;
  searchLanguageHint?: string;
}

/** How many districts to target in one run — deliberately small: the
 * real pacing comes from DAILY_USD_BUDGET/DAILY_CANDIDATE_TARGET in
 * run-discovery.ts, not from targeting everything under-floor at once. */
const TARGETS_PER_RUN = 5;

export async function planTargets(): Promise<{ market: string; targets: PlannedTarget[] }> {
  const markets = loadMarkets();

  for (const phase of markets.phases) {
    if (phase.metros?.length) {
      const counts = await fetchDistrictVenueCounts(phase.metros);
      const underFloor = counts.filter((c) => c.venueCount < markets.minVenueFloor);
      if (underFloor.length > 0) {
        return {
          market: phase.name,
          targets: underFloor
            .slice(0, TARGETS_PER_RUN)
            .map((c) => ({ districtId: c.districtId, metro: c.metro })),
        };
      }
    }
    if (phase.newMetros?.length) {
      return {
        market: phase.name,
        targets: phase.newMetros.slice(0, TARGETS_PER_RUN).map((m) => ({
          districtId: m.id,
          metro: m.id,
          isNewMetro: true,
          searchLanguageHint: m.searchLanguageHint,
        })),
      };
    }
  }

  return { market: 'none — every phase clear', targets: [] };
}
