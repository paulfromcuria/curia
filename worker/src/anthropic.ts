/**
 * Thin wrapper around the Anthropic Messages API for the pipeline's model
 * calls. Every stage goes through `callModel` so cost tracking (the
 * running `costUsd` accumulator, read by run-discovery.ts to populate
 * worker_runs.api_cost_usd and to enforce DAILY_USD_BUDGET) lives in one
 * place instead of being duplicated per stage.
 *
 * Pricing below is claude-sonnet-5's published per-token rate — update
 * this constant if pricing changes rather than hardcoding it per call
 * site. Web search tool calls bill their own small per-search fee on top
 * of token usage; not modeled here (Anthropic's usage dashboard is the
 * source of truth for exact cost), so `costUsd` is a close estimate for
 * budget-pacing purposes, not an invoice-accurate figure.
 */
import dns from 'node:dns';
import Anthropic from '@anthropic-ai/sdk';
import { config } from './config.js';

// Found 2026-09-22 diagnosing a real local dry-run failure: Node's default
// DNS result order tried api.anthropic.com's IPv6 address first and hung
// (curl/nslookup resolved fine immediately — this host's IPv6 route is the
// broken part, not DNS itself). `ipv4first` is the standard fix for this
// exact class of intermittent ENOTFOUND/hang on a dual-stack host with
// unreliable IPv6 — safe on Railway too, it only reorders Node's own
// preference, never disables IPv6 outright.
dns.setDefaultResultOrder('ipv4first');

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const PRICE_PER_MTOK_INPUT = 3;
const PRICE_PER_MTOK_OUTPUT = 15;

let costUsd = 0;
export function getAccumulatedCostUsd(): number {
  return costUsd;
}
export function resetAccumulatedCost(): void {
  costUsd = 0;
}

export interface ModelCallOptions {
  system: string;
  prompt: string;
  /** Enables the server-side web search tool — Discover needs this,
   * Verify/Copy/Voice QA/Gate check generally don't (they reason over
   * what Discover already found). */
  useWebSearch?: boolean;
  maxTokens?: number;
}

const WEB_SEARCH_TOOL: Anthropic.Messages.ToolUnion = {
  type: 'web_search_20250305',
  name: 'web_search',
};

export async function callModel(opts: ModelCallOptions): Promise<string> {
  const tools: Anthropic.Messages.ToolUnion[] | undefined = opts.useWebSearch
    ? [WEB_SEARCH_TOOL]
    : undefined;

  // Streaming, not a plain .create() call — found live 2026-09-22: once
  // maxTokens got raised (fixing a separate truncation bug), the SDK
  // started refusing the request outright ("Streaming is required for
  // operations that may take longer than 10 minutes"), since a real
  // 24576-token web-search-heavy response can legitimately run past that.
  // .stream().finalMessage() gives back the exact same Message shape
  // (.usage, .content) a plain .create() would, so nothing below this
  // needed to change — only how the response is fetched.
  const message = await anthropic.messages
    .stream({
      model: config.anthropicModel,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
      tools,
    })
    .finalMessage();

  const usage = message.usage;
  costUsd +=
    (usage.input_tokens / 1_000_000) * PRICE_PER_MTOK_INPUT +
    (usage.output_tokens / 1_000_000) * PRICE_PER_MTOK_OUTPUT;

  const textBlocks = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
  return textBlocks.map((b) => b.text).join('\n');
}

/** Parses a model response that was asked to reply with a single JSON
 * value, tolerating a ```json fenced block (models reliably add one even
 * when told not to) — throws with the raw text included so a bad
 * response is debuggable rather than a bare JSON.parse stack trace. */
export function parseJsonResponse<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  try {
    return JSON.parse(raw.trim()) as T;
  } catch (err) {
    throw new Error(`Failed to parse model JSON response: ${(err as Error).message}\n---\n${text}`);
  }
}
