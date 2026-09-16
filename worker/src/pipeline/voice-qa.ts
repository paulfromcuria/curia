/**
 * Stage 5: Voice QA. Real string-match enforcement (banned-words.ts) —
 * not a vague "make sure it sounds right" instruction to a model. On a
 * failure, retries once via copy.ts's rewriteCopy with the specific
 * offending words; a second failure sends the candidate back with
 * status 'discovered' and a note, rather than looping indefinitely.
 */
import { findBannedWords } from '../banned-words.js';
import { rewriteCopy } from './copy.js';
import type { VenueCandidateDraft } from '../types.js';

export interface VoiceQaResult {
  passed: boolean;
  description: string;
  note?: string;
}

export async function runVoiceQa(candidate: VenueCandidateDraft): Promise<VoiceQaResult> {
  const description = candidate.description ?? '';
  const firstPass = findBannedWords(description);
  if (firstPass.length === 0) {
    return { passed: true, description };
  }

  const rewritten = await rewriteCopy(candidate, firstPass.map((h) => h.word));
  const secondPass = findBannedWords(rewritten);
  if (secondPass.length === 0) {
    return { passed: true, description: rewritten };
  }

  return {
    passed: false,
    description: rewritten,
    note: `Voice QA failed twice — still contains: ${secondPass.map((h) => h.word).join(', ')}`,
  };
}
