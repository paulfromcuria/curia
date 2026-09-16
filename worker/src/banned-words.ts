/**
 * Real string-match enforcement for Voice QA — not a vague "avoid cliché
 * copy" instruction left to the model's own judgment. The model is still
 * asked to avoid these in its system prompt (cheaper than relying on this
 * check alone to catch everything), but this is the actual gate: any
 * banned word/phrase found in a candidate's description fails Voice QA
 * and sends it back to the Copy stage rather than forward to Gate check.
 */
import { BANNED_REASON_WORDS } from './config.js';

export interface BannedWordHit {
  word: string;
  index: number;
}

export function findBannedWords(text: string): BannedWordHit[] {
  const lower = text.toLowerCase();
  const hits: BannedWordHit[] = [];
  for (const word of BANNED_REASON_WORDS) {
    const index = lower.indexOf(word.toLowerCase());
    if (index !== -1) hits.push({ word, index });
  }
  return hits;
}

export function passesVoiceQa(text: string): boolean {
  return findBannedWords(text).length === 0;
}
