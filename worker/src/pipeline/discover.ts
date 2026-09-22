/**
 * Stage 2: Discover. One web-search-enabled model call per targeted
 * district, briefed with everything this session's own hand-curation
 * passes (London, Riyadh, Santorini — see docs/data/venues.json's
 * provenance notes) established as the real bar: district character,
 * existing venues for dedupe, the real live type vocabulary, Gate 1 in
 * full, the distinctiveness rubric with named anchors, and the recent
 * review-feedback learning loop so the worker stops repeating rejected
 * patterns instead of re-learning them cold every run.
 */
import { callModel, parseJsonResponse } from '../anthropic.js';
import { fetchDistrictBrief, fetchKnownVenueTypes } from '../content-read.js';
import { fetchExistingDedupeKeys, fetchRecentReviewFeedback } from '../supabase.js';
import type { PlannedTarget } from './plan.js';
import type { DistrictCandidateDraft, VenueCandidateDraft } from '../types.js';

const GATE1_TEXT = `Gate 1 (inclusion, never bent): "Would a Curia member — someone with
taste and money — be comfortable walking in?" Mass-market high-street brands
(McDonald's, Wetherspoons, Nando's, Greggs, Frankie & Benny's, Miller & Carter,
etc.) fail this by definition. A venue that fails Gate 1 must never be
proposed at all — don't even submit it as a rejected candidate, just skip it.`;

const DISTINCTIVENESS_RUBRIC = `Gate 2 (distinctiveness, 1-5, editorial): "Would
a local who knows the area tell a visiting friend about this specific place?"
5 = genuinely singular (anchors: The Stolen Lamb, Riddles — a one-of-a-kind
room nobody else has). 3 = a good, reliable mid-tier pick (anchor: a good
Piccolino — competent, pleasant, not remarkable). 1 = comfortable, competent,
ubiquitous (anchors: Gail's, Côte, Everyman — you know exactly what you're
getting because you've had it before, elsewhere). Ownership (independent /
small_group / group / high_street) is an INPUT to this score, not an
automatic exclusion — a small or even large premium group can score anywhere
1-5 depending on how distinctive it actually feels.`;

interface RawCandidate {
  name: string;
  type: string;
  spendLevel?: number;
  lat?: number;
  lon?: number;
  coordinateMethod?: string;
  petFriendly: boolean;
  dietaryOptions: string[];
  bands: string[];
  description: string;
  gate1Reasoning: string;
  distinctivenessProposed: number;
  distinctivenessReasoning: string;
  ownership: 'independent' | 'small_group' | 'group' | 'high_street';
  ownershipEvidence: string;
  sources: string[];
}

function dedupeKeyFor(name: string, districtId: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}::${districtId}`;
}

export async function discoverForTarget(
  target: PlannedTarget,
  maxCandidates: number
): Promise<VenueCandidateDraft[]> {
  if (target.isNewMetro) {
    // A brand-new metro has no district brief yet — Discover's job here
    // is proposing the district_candidate itself (handled by the caller,
    // run-discovery.ts), not venue candidates against a district that
    // doesn't exist in the real schema yet.
    return [];
  }

  console.log(`[Discover] ${target.districtId}: fetching district brief...`);
  const brief = await fetchDistrictBrief(target.districtId);
  if (!brief) return [];
  console.log(`[Discover] ${target.districtId}: brief fetched, loading known types/dedupe keys/feedback...`);

  const [knownTypes, existingKeys, feedback] = await Promise.all([
    fetchKnownVenueTypes(),
    fetchExistingDedupeKeys(),
    fetchRecentReviewFeedback(200),
  ]);
  console.log(`[Discover] ${target.districtId}: prefetch done (${knownTypes.size} types, ${existingKeys.size} dedupe keys, ${feedback.length} feedback rows)`);

  const feedbackSummary = feedback.length
    ? feedback
        .slice(0, 40)
        .map((f) => `- ${f.decision.toUpperCase()} "${f.candidateName}"${f.reason ? `: ${f.reason}` : ''}`)
        .join('\n')
    : '(no prior review feedback yet)';

  const languageNote = target.searchLanguageHint
    ? `Search primarily in this district's local language (hint: "${target.searchLanguageHint}"), not just English — English-only search has previously undercounted real yield by roughly half in comparable non-English markets (see the Riyadh second-pass lesson).`
    : 'Search in English.';

  const system = `You are Curia's venue researcher. Curia is a curated
recommendation app for people with real taste and money — "more Raya than
Tinder, more Michelin Guide than TripAdvisor." You find REAL, currently
operating, non-chain venues, never invent or guess. When unsure whether a
venue is real, currently trading, or passes Gate 1, drop it rather than
include it. ${GATE1_TEXT} ${DISTINCTIVENESS_RUBRIC}

Real venue types already in use (reuse one of these where a genuine fit
exists, don't invent a near-duplicate): ${[...knownTypes].sort().join(', ')}.
If nothing fits, propose a new all-caps type name anyway and it will be
flagged for editorial review rather than silently dropped.

Recent review-feedback learning loop — do not repeat these patterns:
${feedbackSummary}

Respond with ONLY a JSON array of candidate objects, no prose before or
after. Each object: {name, type, spendLevel (1-5), lat, lon,
coordinateMethod, petFriendly, dietaryOptions (array), bands (array of
morning/afternoon/evening/late), description (one or two sentences, Curia's
editorial brand voice — specific and earned, never generic directory-speak,
never the banned words vibrant/hidden gem/nestled/boasts/must-try/foodie/
delicious/stunning/cosy), gate1Reasoning, distinctivenessProposed (1-5),
distinctivenessReasoning, ownership, ownershipEvidence (a short string
citing what you found), sources (array of URLs)}.`;

  const prompt = `District: ${brief.name} (${brief.metro}), centred roughly
at ${brief.lat}, ${brief.lon}. Character: ${brief.character ?? '(no editorial description yet — this is a fresh district)'}.
Existing venues here already (never propose these again, or an obvious
rename/relocation of one of them): ${brief.existingVenueNames.join(', ') || '(none yet)'}.
${languageNote}

Find up to ${maxCandidates} real, currently-operating, non-chain venues in
this district that would genuinely fit Curia's catalogue.`;

  console.log(`[Discover] ${target.districtId}: calling model (web search enabled)...`);
  const callStart = Date.now();
  const response = await callModel({ system, prompt, useWebSearch: true, maxTokens: 8192 });
  console.log(`[Discover] ${target.districtId}: model call returned after ${Math.round((Date.now() - callStart) / 1000)}s`);
  const raw = parseJsonResponse<RawCandidate[]>(response);

  const drafts: VenueCandidateDraft[] = [];
  for (const c of raw) {
    const dedupeKey = dedupeKeyFor(c.name, target.districtId);
    if (existingKeys.has(dedupeKey)) continue;
    drafts.push({
      name: c.name,
      type: c.type,
      subPreferenceTags: [],
      spendLevel: c.spendLevel,
      districtId: target.districtId,
      metro: target.metro,
      lat: c.lat,
      lon: c.lon,
      petFriendly: c.petFriendly,
      dietaryOptions: c.dietaryOptions?.length ? c.dietaryOptions : ['none'],
      description: c.description,
      bands: c.bands ?? [],
      gate1Reasoning: c.gate1Reasoning,
      distinctivenessProposed: c.distinctivenessProposed,
      distinctivenessReasoning: c.distinctivenessReasoning,
      ownership: c.ownership,
      ownershipEvidence: { note: c.ownershipEvidence },
      status: knownTypes.has(c.type) ? 'discovered' : 'needs_new_type',
      sources: (c.sources ?? []).map((url) => ({ url, note: 'Discover stage' })),
      coordinateMethod: c.coordinateMethod,
      dedupeKey,
    });
  }
  return drafts.slice(0, maxCandidates);
}

interface RawDistrictProposal {
  name: string;
  character: string;
  rationale: string;
  sources: string[];
}

/** For a target flagged isNewMetro (markets.yaml's newMetros entries) —
 * proposes real, distinct districts within that metro, same bar this
 * session's own hand-curation passes applied (see docs/data/districts.json's
 * many `_xSource` notes: a genuine, distinct area, not an undifferentiated
 * blob, with independently verified coordinates and character). Districts
 * are proposed, never auto-created — a human confirms via /admin/review
 * before the promotion cron creates the real row. */
export async function discoverNewDistrict(target: PlannedTarget): Promise<DistrictCandidateDraft | null> {
  const system = `You propose real, distinct districts/neighbourhoods for
Curia, a curated recommendation app for people with taste and money. A
district must be a genuine, well-known, distinct area — not an
undifferentiated blob of an entire city — with its own real character
(a local would recognize it by name). Respond with ONLY JSON:
{name, character, rationale, sources (array of URLs)}, or {} if you can't
confidently identify one real candidate.`;

  const prompt = `Propose one real district/neighbourhood for a new Curia
market in "${target.metro}" that doesn't obviously overlap a huge swathe of
the city — something with its own real, independent-leaning food/drink/
culture scene, the kind of place a local would name without hesitation.`;

  const response = await callModel({ system, prompt, useWebSearch: true, maxTokens: 1024 });
  const raw = parseJsonResponse<Partial<RawDistrictProposal>>(response);
  if (!raw.name) return null;

  return {
    name: raw.name,
    region: target.metro,
    character: raw.character,
    rationale: raw.rationale,
    status: 'pending_review',
    sources: (raw.sources ?? []).map((url) => ({ url, note: 'Discover stage — new metro' })),
  };
}
