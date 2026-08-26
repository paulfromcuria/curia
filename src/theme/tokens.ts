/**
 * Curia design tokens.
 *
 * Transcribed directly from the Claude Design handoff bundle (Curia.dc.html,
 * fetched 2026-07-30) — see CLAUDE.md "Design tokens" for provenance and the
 * full extraction notes. This palette and type scale are closed: do not add
 * colors or fonts outside of what's here without updating CLAUDE.md first.
 */

export const color = {
  // Backgrounds — near-black, warm. #0B0A09 is the canonical one for new UI;
  // the others are real per-screen variants seen in the prototype.
  base: '#0B0A09',
  baseVariants: {
    a: '#0C0B09',
    b: '#12100E', // map screen
    c: '#131110', // device/app screen
    d: '#141110',
    e: '#121010',
  },

  // Surfaces — warm dark-brown, one shade up from base. Never a light "paper" tone.
  surface: '#1B1714',
  surfaceVariants: {
    a: '#171412',
    b: '#1A1613', // expanded onboarding tile detail
    c: '#1D1811',
    d: '#17130F', // bottom sheets / modals
    e: '#15100D',
    f: '#241C15',
  },

  // Gold accent family
  gold: '#C0A062',
  goldLight: '#E7D6B0',
  goldHover: '#DCC392',
  goldText: '#1A1410', // text color used on top of gold CTA backgrounds

  // Text
  textPrimary: '#F0E9DF',
  textPrimaryBright: '#F4EEE5',
  textSecondary: '#8B8175',
  textSecondaryAlt: '#9A8F82',
  textTertiary: '#6F6558',
  /** Unreachable/disabled state, dimmer than textTertiary (e.g. an onboarding
   * step not yet reachable) — verbatim from the prototype's own onboarding
   * tab logic; omitted from CLAUDE.md's original palette table extraction,
   * added here once found (M9 QA pass), not invented. */
  textDisabled: '#4A443B',
  /** Inactive tile-count badge tone, distinct from textTertiary — same
   * provenance as textDisabled above. */
  textBadgeInactive: '#7C6E5E',

  // Neutral / borders
  borderNeutral: '#CDC3B6',
  hairline: 'rgba(240,233,223,.12)',
  hairlineMin: 'rgba(240,233,223,.09)',
  hairlineMax: 'rgba(240,233,223,.14)',
  mutedSurface: '#4F483E',

  // The one cool, pale note in an otherwise warm palette. Weather glyph and
  // "me" location-pin fill only — never decorative (per CLAUDE.md).
  weather: '#CFE3E6',

  // Map-render-only
  mapWater: '#16262B',
} as const;

/** Per-district accent colors — confirmed 1:1 from the prototype's DISTRICTS
 * data, except the five Cheshire entries and the five Manchester entries
 * (both widened for real visual distinctiveness as glows, 2026-08 — see
 * docs/data/districts.json's own _accentColorSource note for why). */
export const districtAccent: Record<string, string> = {
  'northern-quarter': '#8B6FA8',
  ancoats: '#9C5030',
  spinningfields: '#6E8FA6',
  deansgate: '#D68A3F',
  chinatown: '#A73F52',
  altrincham: '#D4A72C',
  hale: '#C97F3D',
  wilmslow: '#B85C3E',
  'alderley-edge': '#A66B4F',
  mobberley: '#7A7048',
};

export const font = {
  serif: 'CormorantGaramond_300Light',
  serifRegular: 'CormorantGaramond_400Regular',
  serifMedium: 'CormorantGaramond_500Medium',
  serifSemiBold: 'CormorantGaramond_600SemiBold',
  sans: 'Jost_300Light',
  sansRegular: 'Jost_400Regular',
  sansMedium: 'Jost_500Medium',
} as const;

/**
 * Spacing and radii are NOT specified in CLAUDE.md or the prototype's design
 * tokens section — these are this milestone's own pick, not a documented
 * value. Flagging per CLAUDE.md's rule not to silently invent things: this is
 * a low-stakes layout default, not a product decision, so it proceeds without
 * a stop-and-ask.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Uppercase, letter-spaced "kicker" label texture — Jost + tracking, not a mono font. */
export const kicker = {
  fontFamily: font.sansMedium,
  textTransform: 'uppercase' as const,
  letterSpacing: 2.2, // ~.14em at 15px UI scale; tune per usage between .14em-.4em
};
