/**
 * Stage 3: Verify. A SEPARATE, independent web-search pass per
 * candidate — not just trusting Discover's own find — re-confirming it's
 * real, currently trading, and non-chain. This mirrors exactly how this
 * project's own daily suggestion-review pipeline already works by hand
 * (see docs/data/venues.json's many `_dailyReviewPromotionSource*`
 * notes: "each re-confirmed real, currently-trading and non-chain via
 * fresh independent web search, not the original researcher's notes").
 */
import { callModel, parseJsonResponse } from '../anthropic.js';
import type { VenueCandidateDraft } from '../types.js';

interface VerifyResult {
  isReal: boolean;
  isCurrentlyTrading: boolean;
  isNonChain: boolean;
  reasoning: string;
}

export async function verifyCandidate(
  candidate: VenueCandidateDraft
): Promise<{ passed: boolean; reasoning: string }> {
  const system = `You are independently fact-checking a venue candidate
someone else researched — you did NOT find this venue yourself, so don't
trust their notes, re-search it from scratch. Confirm three things: (1) it
genuinely exists, (2) it is currently open and trading (not permanently
closed), (3) it is not part of a mass-market chain (a small 2-4-site
independent group is fine — that's not what "chain" means here). If you
can't confirm all three with real search results, say so honestly rather
than assuming. Respond with ONLY JSON: {isReal, isCurrentlyTrading,
isNonChain, reasoning}.`;

  const prompt = `Candidate: "${candidate.name}", type ${candidate.type}, in
${candidate.districtId} (${candidate.metro}). Originally proposed sources:
${candidate.sources.map((s) => s.url).join(', ') || '(none given)'}. Verify independently.`;

  const response = await callModel({ system, prompt, useWebSearch: true, maxTokens: 1024 });
  const result = parseJsonResponse<VerifyResult>(response);

  return {
    passed: result.isReal && result.isCurrentlyTrading && result.isNonChain,
    reasoning: result.reasoning,
  };
}
