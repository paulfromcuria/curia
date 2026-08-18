/**
 * Destination matching for the Travel feature (2026-08, at explicit user
 * request: a subtle, Profile-only "which cities/island suit YOU, and when"
 * recommendation). Deliberately much lighter than rank-venues.ts's full
 * Matchmaking contract — no hard filters (distance/dietary/pet make no
 * sense for a holiday destination), no day/band/weather. It's closer to how
 * Moments work: a curated list plus a real, specific reason, not a scored
 * pipeline with excluded candidates.
 *
 * The match signal is real onboarding tile overlap — a destination's
 * `tileIds` (docs/data/destinations.json) are drawn from the exact same
 * Tile catalog (src/lib/data/seed.ts TILES) a member's own
 * `UserPreference.selectedTileIds` are stored in, so "this destination
 * suits you" means literally "you picked tiles this place is genuinely
 * known for" — not a parallel taste vocabulary invented for this feature.
 */
import type { Destination, Tile, UserPreference } from '../../types/models';

/** Flattens a member's selected tile ids across all three onboarding
 * categories into one set — destinations aren't scoped to Do/Drink/Eat
 * individually, so the match should draw from all of it at once. */
export function flattenSelectedTileIds(preferences: UserPreference[]): string[] {
  return preferences.flatMap((p) => p.selectedTileIds);
}

/**
 * Fraction (0-1) of `destination.tileIds` the member's own selections cover
 * — proportion of what makes this place distinctive, not a raw count, so a
 * destination fully matched on 3 tags outranks one matched on 2 of 6.
 */
export function scoreDestinationFit(destination: Destination, selectedTileIds: string[]): number {
  if (destination.tileIds.length === 0) return 0;
  const selected = new Set(selectedTileIds);
  const matched = destination.tileIds.filter((id) => selected.has(id));
  return matched.length / destination.tileIds.length;
}

/** Real tile names (not ids) the member matched on this destination, in the
 * destination's own tileIds order — used to build the reason string and to
 * render matched-tile chips in the UI. */
export function matchedTileNames(destination: Destination, selectedTileIds: string[], tiles: Tile[]): string[] {
  const selected = new Set(selectedTileIds);
  return destination.tileIds
    .filter((id) => selected.has(id))
    .map((id) => tiles.find((t) => t.id === id)?.name)
    .filter((name): name is string => !!name);
}

/** A specific, earned-feeling reason (CLAUDE.md Brand voice) rather than a
 * generic score justification — built from the member's own real matched
 * tiles when there are any, falling back to the destination's own editorial
 * line when there's no overlap yet (e.g. a fresh account). */
export function reasonForDestination(destination: Destination, matched: string[]): string {
  if (matched.length === 0) return destination.editorialDescription;
  if (matched.length === 1) {
    return `${matched[0]} is one of your picks — ${destination.name} leans hard into it.`;
  }
  const last = matched[matched.length - 1];
  const rest = matched.slice(0, -1).join(', ');
  return `${rest} and ${last} are all in your picks — ${destination.name} is where they overlap.`;
}

export interface RankedDestination {
  destination: Destination;
  /** 0-1 — internal ranking only, never surfaced as a raw number in UI
   * (same spirit as Hard rule 8 for venues: the reason carries the meaning,
   * not a score). */
  score: number;
  matchedTileNames: string[];
  reason: string;
}

/** Ranks every destination by real taste overlap, best first. Doesn't
 * filter anything out (unlike rankVenues) — a destination with zero overlap
 * still appears, just last, with its own editorial line standing in for a
 * personalized reason. Callers decide how many to actually show. */
export function rankDestinations(
  preferences: UserPreference[],
  destinations: Destination[],
  tiles: Tile[]
): RankedDestination[] {
  const selectedTileIds = flattenSelectedTileIds(preferences);
  return destinations
    .map((destination) => {
      const matched = matchedTileNames(destination, selectedTileIds, tiles);
      return {
        destination,
        score: scoreDestinationFit(destination, selectedTileIds),
        matchedTileNames: matched,
        reason: reasonForDestination(destination, matched),
      };
    })
    .sort((a, b) => b.score - a.score);
}
