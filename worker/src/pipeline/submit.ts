/**
 * Stage 7: Submit. The only stage that actually writes — everything
 * before this is pure computation over in-memory drafts. A candidate
 * that reaches here has cleared Verify, Copy, Voice QA and Gate check;
 * `status` is set to 'pending_review' so it's exactly what /admin/review
 * queries for, or 'needs_new_type' if Discover already flagged it (see
 * discover.ts) — either way it's a real write to venue_candidates via
 * supabase.ts, never to `venues` directly.
 */
import { insertVenueCandidate } from '../supabase.js';
import type { VenueCandidateDraft } from '../types.js';

export async function submitCandidate(runId: string, candidate: VenueCandidateDraft): Promise<void> {
  const finalStatus = candidate.status === 'needs_new_type' ? 'needs_new_type' : 'pending_review';
  await insertVenueCandidate(runId, { ...candidate, status: finalStatus });
}
