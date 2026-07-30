/**
 * Core Curia data model. See CLAUDE.md "Data model" for the authoritative
 * shape and reasoning — refine there first if this changes, not ad hoc here.
 */

export type SpendLevel = 1 | 2 | 3 | 4 | 5; // £ .. £££££

export type DietaryRequirement =
  | 'none'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-allergy';

export type PetPreference = 'none' | 'small-dog' | 'large-dog';

export type ReligiousObservance =
  | 'none'
  | 'halal'
  | 'kosher'
  | 'alcohol-free'
  | 'prayer-space-nearby'
  | 'friday-observance';

export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';

export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';

export type RelationshipStatus =
  | 'single'
  | 'seeing-someone'
  | 'partnered'
  | 'married'
  | 'prefer-not-to-say';

/** The three tile-grid onboarding categories. "You" is a 4th step but isn't tile-gated. */
export type TileCategory = 'Do' | 'Drink' | 'Eat';

export interface Tile {
  id: string;
  category: TileCategory;
  name: string;
  /** Sub-preferences default ON ("I want this"). Never invert this. */
  subPreferences: string[];
}

export interface UserPreference {
  category: TileCategory;
  /** Selected tile ids — minimum 3 required per category (Hard rule 7). */
  selectedTileIds: string[];
  /** Sub-preference on/off state, keyed by sub-preference label. Default true. */
  subPreferenceState: Record<string, boolean>;
}

export interface YouProfile {
  spendLevel: SpendLevel;
  dietary: DietaryRequirement[];
  pet: PetPreference;
  religiousObservance: ReligiousObservance[];
  gender?: Gender;
  ageRange?: AgeRange;
  relationshipStatus?: RelationshipStatus;
}

export type SubscriptionStatus = 'none' | 'trialing' | 'active' | 'past_due' | 'canceled';

export interface User {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  onboardingComplete: boolean;
  preferences: UserPreference[];
  you: YouProfile;
}

export type MetroId = 'manchester' | 'cheshire';

export interface City {
  id: MetroId;
  name: string;
}

export type DistrictKind = 'city' | 'county';

export interface District {
  id: string;
  name: string;
  metro: MetroId;
  lat: number;
  lon: number;
  /** Base attractiveness/liveliness score the map render scales from. */
  base: number;
  kind: DistrictKind;
  /** Map-pin accent color, distinct per district (see theme/tokens.ts districtAccent). */
  accentColor: string;
  editorialDescription?: string;
  /** Day-of-week x time-of-day liveliness multipliers. */
  dayMultiplier?: Record<string, number>;
  bandMultiplier?: Record<string, number>;
  groupId?: string;
}

export interface DistrictGroup {
  name: string;
  /** Member district ids. Naming rule: a partial subset of a metro's districts
   * gets a subset label (e.g. "Hale & Altrincham"); only the complete set of a
   * metro's districts may carry the metro's own name (see CLAUDE.md). */
  districtIds: string[];
}

export type DayTimeBand = 'morning' | 'afternoon' | 'evening' | 'late';

export interface Venue {
  id: string;
  name: string;
  /** Category/tile this venue matches, e.g. "COCKTAIL BAR". */
  type: string;
  subPreferenceTags: string[];
  spendLevel: SpendLevel;
  districtId: string;
  metro: MetroId;
  lat: number;
  lon: number;
  petFriendly: boolean;
  dietaryOptions: DietaryRequirement[];
  photos: string[];
  description: string;
  bands: DayTimeBand[];
  /** Base attractiveness score before ranking weights are applied. */
  base: number;

  // Internal-only fields — Hard rule 8: must NEVER surface in user-facing UI,
  // API responses to the member app, or copy. Admin/back-office only.
  tier: 'signature' | 'texture';
  sourceConfidence: number;
  notes?: string;
}

/** Exactly 4 moment types per CLAUDE.md — do not add more without a product decision. */
export type MomentType =
  | 'date-night'
  | 'entertaining-a-client'
  | 'big-group-of-friends'
  | 'solo-reset';

export interface Moment {
  id: string;
  type: MomentType;
  title: string;
  curator: string;
  blurb: string;
  venueIds: string[];
}

export interface JourneyStop {
  venueId: string;
  order: number;
  walkTimeToNextMinutes?: number;
}

export interface Journey {
  id: string;
  momentType: MomentType;
  title: string;
  stops: JourneyStop[];
  /** Derived: the set of districts this journey's stops touch — not stored,
   * computed from stop venues' districtIds. */
}

export interface SavedCollection {
  id: string;
  userId: string;
  name: string;
  venueIds: string[];
}

export interface SavedJourney {
  userId: string;
  journeyId: string;
}

export type AdminRole = 'admin'; // single role at launch, no multi-role distinction yet

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}
