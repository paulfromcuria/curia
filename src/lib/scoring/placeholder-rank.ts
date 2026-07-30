import { VENUES } from '../data/seed';
import type { RankedVenue } from '../../types/matchmaking';

/**
 * TEMPORARY stand-in for the real scoring engine (M3, owned by
 * `curia-matchmaking` — see docs/curia-build-execution-plan.md). Sorts seed
 * venues by their static base score only; implements none of the
 * matchmaking contract's hard filters or ranking weights yet.
 *
 * Map and List both call this ONE function so they can never drift out of
 * sync (Hard rule 5) — when the real engine lands, it replaces the body of
 * this function, not its call sites.
 */
export function placeholderRankedVenues(): RankedVenue[] {
  return [...VENUES]
    .sort((a, b) => b.base - a.base)
    .map((v) => ({ venueId: v.id, score: v.base, reason: v.description }));
}
