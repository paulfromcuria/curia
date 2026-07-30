/**
 * Matchmaking contract types. See CLAUDE.md "Matchmaking contract" — build
 * against this shape even before the real scoring engine exists, so Map and
 * List can share one implementation (Hard rule 5).
 */
import type { DayTimeBand, DietaryRequirement, PetPreference, UserPreference, YouProfile } from './models';

export interface MatchContext {
  /** "now" uses the live day/band; otherwise an explicit day+band selection. */
  now: boolean;
  day?: string;
  band?: DayTimeBand;
  weather?: string;
}

export interface MatchmakingInput {
  preferences: UserPreference[];
  you: Pick<YouProfile, 'spendLevel' | 'dietary' | 'pet'>;
  location: { lat: number; lon: number };
  /** Search radius in miles, 0.25-30 per the prototype's slider range. */
  radiusMiles: number;
  context: MatchContext;
  /** Active in-session "mood" quick filter, if any — restricts the candidate
   * pool before ranking runs (a hard filter, not a weight). */
  moodFilter?: {
    category: string;
    tileIds: string[];
    subPreferences: string[];
  };
}

export interface RankedVenue {
  venueId: string;
  /** 0-100 match score. */
  score: number;
  /** Short, specific, brand-voice observation — never a generic score
   * justification (see CLAUDE.md "Brand voice"). */
  reason: string;
}

export interface MatchmakingResult {
  ranked: RankedVenue[];
  /** True when hard filters eliminated the entire candidate pool. */
  empty: boolean;
}

/** Hard filters — a failing venue must never appear, regardless of score. */
export interface HardFilterContext {
  radiusMiles: number;
  userLocation: { lat: number; lon: number };
  dietary: DietaryRequirement[];
  travelingWithPet: PetPreference;
}
