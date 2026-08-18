import demoUsersRaw from '../../../docs/data/demo-users.json';
import type { SpendLevel, SubscriptionStatus } from '../../types/models';

/**
 * Demo member data for the admin Users screen (2026-08, admin
 * growth-dashboard expansion). See docs/data/demo-users.json's own
 * `_source` note: this is entirely fabricated placeholder content, not
 * real signups — there is no Supabase user table yet, and
 * src/lib/state/session.tsx only ever tracks one ephemeral member per
 * browser session, so there's no real "all members" data source to show
 * here. Same "flag the gap, don't silently fake it" discipline this
 * project already applies to Stripe/Mapbox, applied to data instead of a
 * missing API — the fabrication is loud in the code and the UI (see
 * demo-data-banner.tsx), never hidden.
 *
 * `DemoMember` is deliberately NOT added to src/types/models.ts — that
 * file is the CLAUDE.md-governed canonical data model, and this explicitly
 * isn't part of it.
 */
export interface DemoMember {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  spendLevel: SpendLevel;
  onboardingComplete: boolean;
  /** Real onboarding Tile catalog ids (src/lib/data/seed.ts TILES,
   * `${category}|${name}`) — same vocabulary real UserPreference data
   * would use, not a parallel invented one. */
  selectedTileIds: string[];
  /** ISO date string, e.g. "2026-03-14". */
  joinDate: string;
}

export const DEMO_MEMBERS: DemoMember[] = demoUsersRaw.members as DemoMember[];
