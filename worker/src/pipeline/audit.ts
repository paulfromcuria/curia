/**
 * Stage 8: Audit. Checks a rotating slice of already-live venues for
 * closure signals — not new discovery, a health check on the existing
 * catalogue. A flagged venue is submitted as a venue_candidates row with
 * a "CLOSURE?"-prefixed reject_reason (see /admin/review's second tab,
 * Step 5 of the growth-engine plan) rather than anything auto-removed —
 * the promotion cron only ever soft-deletes on an explicit human approval
 * of one of these flags, never automatically.
 */
import { callModel, parseJsonResponse } from '../anthropic.js';
import { fetchVenueAuditSlice, type VenueSliceEntry } from '../content-read.js';
import { insertVenueCandidate } from '../supabase.js';
import type { VenueCandidateDraft } from '../types.js';

interface ClosureCheckResult {
  likelyClosed: boolean;
  reasoning: string;
}

async function checkClosure(venue: VenueSliceEntry): Promise<ClosureCheckResult> {
  const system = `You are auditing whether a venue already in Curia's
catalogue has closed down. Only flag likelyClosed=true on a real, current
signal (an explicit "permanently closed" listing, a dead website with no
replacement, credible recent local coverage of closure) — a quiet or
outdated-looking listing alone is not enough; when genuinely unsure, say
likelyClosed=false rather than guess. Respond with ONLY JSON:
{likelyClosed, reasoning}.`;

  const prompt = `Venue: "${venue.name}" (${venue.type}), district ${venue.districtId}. Is it still open and trading?`;

  const response = await callModel({ system, prompt, useWebSearch: true, maxTokens: 512 });
  return parseJsonResponse<ClosureCheckResult>(response);
}

export async function runClosureAudit(runId: string, sliceSize: number): Promise<number> {
  const slice = await fetchVenueAuditSlice(sliceSize);
  let flagged = 0;

  for (const venue of slice) {
    const result = await checkClosure(venue);
    if (!result.likelyClosed) continue;

    const draft: VenueCandidateDraft = {
      name: venue.name,
      type: venue.type,
      subPreferenceTags: [],
      districtId: venue.districtId,
      metro: venue.metro,
      petFriendly: false,
      dietaryOptions: ['none'],
      bands: [],
      status: 'pending_review',
      sources: [],
      dedupeKey: `closure-audit::${venue.id}::${new Date().toISOString().slice(0, 10)}`,
      rejectReason: `CLOSURE? ${result.reasoning}`,
    };
    await insertVenueCandidate(runId, draft);
    flagged += 1;
  }

  return flagged;
}
