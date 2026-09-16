/**
 * Single source of truth for the membership price and trial length — see
 * CLAUDE.md "Subscription": confirmed £19.99/month with a 14-day free trial
 * by the prototype's own copy ("Membership is £19.99 a month after your
 * first fortnight."). Never hardcode either figure elsewhere; import from
 * here so the number can move without a copy sweep.
 *
 * Real billing is a genuine credential gap (CLAUDE.md "Still genuinely
 * open"): there is no Stripe account/API key yet. `isMockBilling` marks
 * every place that stands in for real Stripe wiring — grep for it when a
 * real key exists and the mock gate needs to become a real paywall.
 *
 * 2026-09, at explicit user request: the app is in open beta and shows no
 * subscription language anywhere (`src/app/subscription.tsx` is now an
 * open-beta gate, not a paywall) — so `formatMonthlyPrice`/`trialCopy`
 * below are currently unused. Left in place, not deleted: the price/trial
 * terms are already decided and this file is exactly where the real
 * paywall copy comes back from once Stripe is wired up, not a hypothetical.
 */
export const SUBSCRIPTION_CONFIG = {
  priceGBP: 19.99,
  trialDays: 14,
  isMockBilling: true as const,
} as const;

export function formatMonthlyPrice(): string {
  return `£${SUBSCRIPTION_CONFIG.priceGBP.toFixed(2)}`;
}

export function trialCopy(): string {
  return `Membership is ${formatMonthlyPrice()} a month after your first fortnight.`;
}
