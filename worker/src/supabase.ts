/**
 * The worker's ONLY database access point. Deliberately exposes just five
 * narrow functions, each scoped to one of the growth-engine tables
 * (supabase/migrations/0010_growth_engine.sql) — there is no generic
 * `.from(table)` escape hatch exported from this module, so the rest of
 * the codebase structurally cannot reach `venues`/`districts` through
 * this client. run-promotion.ts (the only code path allowed to touch the
 * real content tables) uses its own separate client — see that file.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import type {
  CandidateStatus,
  DistrictCandidateDraft,
  ReviewFeedbackEntry,
  VenueCandidateDraft,
  WorkerRunSummary,
} from './types.js';

function client(): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function startWorkerRun(market: string, districtsTargeted: string[]): Promise<string> {
  const { data, error } = await client()
    .from('worker_runs')
    .insert({ market, districts_targeted: districtsTargeted })
    .select('id')
    .single();
  if (error) throw new Error(`startWorkerRun: ${error.message}`);
  return data.id as string;
}

export async function finishWorkerRun(runId: string, summary: WorkerRunSummary): Promise<void> {
  const { error } = await client()
    .from('worker_runs')
    .update({
      finished_at: new Date().toISOString(),
      candidates_discovered: summary.candidatesDiscovered,
      verified: summary.verified,
      copy_passed: summary.copyPassed,
      submitted_for_review: summary.submittedForReview,
      api_cost_usd: summary.apiCostUsd,
      notes: summary.notes ?? null,
    })
    .eq('id', runId);
  if (error) throw new Error(`finishWorkerRun: ${error.message}`);
}

export async function insertVenueCandidate(
  runId: string,
  draft: VenueCandidateDraft
): Promise<void> {
  const { error } = await client()
    .from('venue_candidates')
    .insert({
      name: draft.name,
      type: draft.type,
      sub_preference_tags: draft.subPreferenceTags,
      spend_level: draft.spendLevel ?? null,
      district_id: draft.districtId,
      metro: draft.metro,
      lat: draft.lat ?? null,
      lon: draft.lon ?? null,
      pet_friendly: draft.petFriendly,
      dietary_options: draft.dietaryOptions,
      description: draft.description ?? null,
      bands: draft.bands,
      base: draft.base ?? null,
      gate1_reasoning: draft.gate1Reasoning ?? null,
      distinctiveness_proposed: draft.distinctivenessProposed ?? null,
      distinctiveness_reasoning: draft.distinctivenessReasoning ?? null,
      ownership: draft.ownership ?? null,
      ownership_evidence: draft.ownershipEvidence ?? null,
      status: draft.status,
      sources: draft.sources,
      coordinate_method: draft.coordinateMethod ?? null,
      dedupe_key: draft.dedupeKey,
      worker_run_id: runId,
      reject_reason: draft.rejectReason ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`insertVenueCandidate(${draft.name}): ${error.message}`);
}

export async function insertDistrictCandidate(
  runId: string,
  draft: DistrictCandidateDraft
): Promise<void> {
  const { error } = await client()
    .from('district_candidates')
    .insert({
      name: draft.name,
      region: draft.region,
      bounds: draft.bounds ?? null,
      character: draft.character ?? null,
      rationale: draft.rationale ?? null,
      status: draft.status,
      sources: draft.sources,
      worker_run_id: runId,
      reject_reason: draft.rejectReason ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(`insertDistrictCandidate(${draft.name}): ${error.message}`);
}

/** Existing dedupe_key values across every non-rejected candidate, so
 * Discover never re-proposes the same real-world venue across runs. */
export async function fetchExistingDedupeKeys(): Promise<Set<string>> {
  const { data, error } = await client()
    .from('venue_candidates')
    .select('dedupe_key')
    .neq('status', 'rejected');
  if (error) throw new Error(`fetchExistingDedupeKeys: ${error.message}`);
  return new Set((data ?? []).map((r) => r.dedupe_key as string).filter(Boolean));
}

/** The last N review_feedback rows, in reverse-chronological order — the
 * learning-loop input to Discover's next-run prompt (see the worker plan's
 * own description of this feedback loop).
 *
 * `candidate_id` is deliberately not a real foreign key (0010_growth_engine.sql)
 * — a single review_feedback row can point at either venue_candidates or
 * district_candidates, disambiguated by `candidate_table`, and Postgres can't
 * FK one column to two tables. That means PostgREST has no relationship to
 * embed here, so names are joined in application code instead of via
 * `.select('*, venue_candidates(name)')` (which fails with "Could not find a
 * relationship" against a column with no real FK — found running the first
 * real dry run, 2026-09-18). */
export async function fetchRecentReviewFeedback(limit = 200): Promise<ReviewFeedbackEntry[]> {
  const { data, error } = await client()
    .from('review_feedback')
    .select('candidate_id, candidate_table, decision, reason')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchRecentReviewFeedback: ${error.message}`);
  const rows = data ?? [];

  const venueIds = rows.filter((r) => r.candidate_table === 'venue_candidates').map((r) => r.candidate_id);
  const districtIds = rows
    .filter((r) => r.candidate_table === 'district_candidates')
    .map((r) => r.candidate_id);

  const namesById = new Map<string, string>();
  if (venueIds.length > 0) {
    const { data: venues, error: venueErr } = await client()
      .from('venue_candidates')
      .select('id, name')
      .in('id', venueIds);
    if (venueErr) throw new Error(`fetchRecentReviewFeedback (venue names): ${venueErr.message}`);
    for (const v of venues ?? []) namesById.set(v.id as string, v.name as string);
  }
  if (districtIds.length > 0) {
    const { data: districts, error: districtErr } = await client()
      .from('district_candidates')
      .select('id, name')
      .in('id', districtIds);
    if (districtErr) throw new Error(`fetchRecentReviewFeedback (district names): ${districtErr.message}`);
    for (const d of districts ?? []) namesById.set(d.id as string, d.name as string);
  }

  return rows.map((r) => ({
    candidateName: namesById.get(r.candidate_id as string) ?? 'unknown',
    decision: r.decision as ReviewFeedbackEntry['decision'],
    reason: (r.reason as string | null) ?? undefined,
  }));
}

export async function updateCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await client()
    .from('venue_candidates')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', candidateId);
  if (error) throw new Error(`updateCandidateStatus(${candidateId}): ${error.message}`);
}
