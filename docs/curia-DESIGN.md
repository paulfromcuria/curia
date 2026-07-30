# Curia — DESIGN.md

Brand and design-system context for Claude Design. Attach this file when
setting up (or updating) Curia's design system so future prompts inherit
these tokens automatically instead of defaulting to generic styling.

## Product in one line
A curated, predictive lifestyle map for Cheshire & Manchester — positioned as
**the Michelin Guide, not TripAdvisor**: a small, selective membership product,
not a comprehensive directory. See `curia-requirements.pdf` for full detail.

## Color palette
| Token | Hex | Use |
|---|---|---|
| Ink | `#101513` | Primary text |
| Bottle (deep) | `#0E211D` | Cover/hero backgrounds, dark surfaces |
| Bottle | `#16302A` | Primary brand surface, headers, buttons |
| Brass | `#B98F4A` | Primary accent — numerals, active states, key data |
| Brass (light) | `#D8B679` | Accent on dark backgrounds |
| Stone | `#EDE8DD` | Light text-on-dark, secondary surface |
| Stone (deep) | `#DCD5C4` | Borders, dividers, alternating rows |
| Slate | `#3E5C76` | Secondary accent — reserved for context/data signals (weather, time), not decoration |
| Paper | `#FBF9F4` | Page/app background |

Do not introduce a warm terracotta/clay accent or near-black + acid-green
scheme — both read as generic AI-design defaults and clash with the
bottle-green/brass identity already established.

## Typography
- **Display / headings:** Fraunces (serif, used at weight 600–700). Reserve
  for venue names, section titles, and moments that should feel editorial
  rather than utilitarian.
- **Body:** Inter (400–600). All UI copy, descriptions, buttons.
- **Data / labels / mono moments:** IBM Plex Mono (400–500), small size,
  often uppercase with letter-spacing — used for context strips, vibe tags,
  requirement-style IDs, coordinates. This is a signature texture across
  every Curia surface, not an occasional flourish.

## Layout & signature elements
- Predictive map screens use a dark (bottle) hero zone with a stylised,
  abstract line-and-dot "map" motif (not a literal map render) — brass lines
  at low opacity, brass-light dots for pins.
- Context is always surfaced as a short mono-font strip (e.g. "FRI · 7:00PM ·
  LIGHT RAIN"), never buried in settings.
- Venue and district cards: white/paper surface, thin stone-deep border,
  Fraunces name, Inter meta line, brass mono tags line.
- Tier distinction (signature vs. texture venues) should stay invisible to
  end users — never expose internal scoring or tier labels in UI copy.
- Membership/application screens use the full dark bottle-deep surface
  (not paper) — this is the one context where the product should feel most
  like a private members' club rather than an app.

## Reference files to attach alongside this brief
- `curia-requirements.pdf` — full functional/non-functional requirements
- `curia-mockups.jsx` — existing high-fidelity screen mockups (home, venue
  detail, district guide, membership application) in this exact visual
  language — the strongest single reference for "match this style"
- `curia-prototype.jsx` — working onboarding + predictive map interaction
  logic, useful if Claude Design needs to understand flow/state, not just look

## What's still undecided (don't over-design these yet)
- Exact subscription price / paywall copy
- Whether onboarding "review" is cosmetic or real vetting
- Referral/invite mechanic
Flag rather than silently deciding if a prompt touches these.
