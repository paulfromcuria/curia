/**
 * Stage 6: Gate check. A final, independent judgment call on the
 * two-gate model — distinct from Discover's own gate1Reasoning (which
 * was produced by the same pass that found the venue in the first
 * place, and so shares its blind spots). Mirrors this session's own
 * real precedent of a genuine final-review pass overriding a research
 * pass's own findings (see docs/data/venues.json's _londonVenueSource
 * note: "Three post-research corrections made during final review,
 * tightening two of the six passes' own findings").
 */
import { callModel, parseJsonResponse } from '../anthropic.js';
import type { VenueCandidateDraft } from '../types.js';

interface GateCheckResult {
  passesGate1: boolean;
  gate1Reasoning: string;
  distinctiveness: number;
  distinctivenessReasoning: string;
}

export async function runGateCheck(
  candidate: VenueCandidateDraft
): Promise<GateCheckResult> {
  const system = `You are the final editorial check before a venue candidate
reaches a human reviewer. Be skeptical of the research that got it this far
— your job is to catch what an earlier pass, working fast, might have missed
or been too generous about.

Gate 1 (inclusion, never bent): "Would a Curia member — someone with taste
and money — be comfortable walking in?" Mass-market high-street brands fail
this by definition, full stop.

Gate 2 (distinctiveness, 1-5, editorial): "Would a local who knows the area
tell a visiting friend about this specific place?" 5 = genuinely singular
(anchors: The Stolen Lamb, Riddles). 3 = a good, reliable mid-tier pick
(anchor: a good Piccolino). 1 = comfortable, competent, ubiquitous (anchors:
Gail's, Côte, Everyman).

Respond with ONLY JSON: {passesGate1, gate1Reasoning, distinctiveness (1-5),
distinctivenessReasoning}.`;

  const prompt = `Candidate: "${candidate.name}" (${candidate.type}),
ownership: ${candidate.ownership ?? 'unknown'}. Earlier research's own
gate1Reasoning: "${candidate.gate1Reasoning ?? '(none given)'}". Earlier
research's own distinctiveness proposal: ${candidate.distinctivenessProposed ?? 'none'}
— "${candidate.distinctivenessReasoning ?? ''}". Give your own independent
judgment, not just a rubber stamp of the above.`;

  const response = await callModel({ system, prompt, maxTokens: 512 });
  return parseJsonResponse<GateCheckResult>(response);
}
