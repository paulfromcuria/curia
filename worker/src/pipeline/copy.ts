/**
 * Stage 4: Copy. Drafts or rewrites the candidate's description in
 * Curia's brand voice (CLAUDE.md's Brand voice section: "editorial,
 * confident, quietly luxurious... every match-reason string should feel
 * like a specific, earned observation, not a generic score justification").
 * Also the retry target when Voice QA (stage 5) rejects a draft for a
 * banned word — `rewrite` is called with the specific offending words so
 * the retry has a concrete instruction, not just "try again."
 */
import { callModel } from '../anthropic.js';
import type { VenueCandidateDraft } from '../types.js';

const BRAND_VOICE_EXAMPLES = [
  `"Unmarked entrance on Tib Street; speakeasy-style still weighted on."`,
  `"A mill floor big enough to work in, and nobody rushing the second cup."`,
  `"Natural wine and communal tables both on, and the kitchen runs to 11pm."`,
];

export async function draftCopy(candidate: VenueCandidateDraft): Promise<string> {
  const system = `You write Curia's venue copy. Editorial, confident, quietly
luxurious — like a guide written by someone with excellent taste, not a
listings directory. Avoid generic directory-speak ("Great spot for food!").
Never use: vibrant, hidden gem, nestled, boasts, must-try, foodie, delicious,
stunning, cosy. One or two sentences. Real examples of the register to match:
${BRAND_VOICE_EXAMPLES.join(' / ')}`;

  const prompt = `Write a description for "${candidate.name}" (${candidate.type},
${candidate.districtId}). What's known: ${candidate.description ?? candidate.ownershipEvidence?.note ?? 'a real, currently-trading, non-chain venue'}.`;

  return (await callModel({ system, prompt, maxTokens: 300 })).trim();
}

export async function rewriteCopy(candidate: VenueCandidateDraft, bannedWords: string[]): Promise<string> {
  const system = `You write Curia's venue copy — see the brand voice rules
below. Your previous draft used a banned word; rewrite it, same facts, same
register, without using ANY of: vibrant, hidden gem, nestled, boasts,
must-try, foodie, delicious, stunning, cosy. Real examples of the register:
${BRAND_VOICE_EXAMPLES.join(' / ')}`;

  const prompt = `Previous draft: "${candidate.description}". It used: ${bannedWords.join(', ')}. Rewrite it.`;

  return (await callModel({ system, prompt, maxTokens: 300 })).trim();
}
