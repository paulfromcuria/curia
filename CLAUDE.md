# Curia — Project Context

Read this file in full before doing any work on this project. It is the single source of truth for the product, the data model, and the rules that must never be broken. If anything in a prompt conflicts with this file, ask before proceeding rather than guessing.

**This is an independent build attempt** (a second, separate implementation of the same product brief — a prior attempt exists elsewhere on disk but is out of scope; nothing here is copied from it). This file is a reconciliation of the original manually-extracted brief against the real Claude Design handoff bundle for `Curia.dc.html` ("Curia Mobile App Prototype", plus its imports `ios-frame.jsx` and `support.js`), fetched directly from the design project on 2026-07-30.

**Warning:** the design project also contains a folder `_ds/uinsure-design-system-*` (purple/green ProximaNova insurance-brand tokens/fonts). That is an unrelated leftover from a different project and must be ignored entirely — it is not part of Curia's brand.

## What Curia is
A predictive map engine and curated recommendation app for people with medium-to-very-high disposable income. Positioning: **"more Raya than Tinder, more Michelin Guide than TripAdvisor."** Exclusive on three levels: curated venue database (no chains, ever), £19.99/month subscription (confirmed by the prototype's own copy — see Subscription below), and curated high-end districts only.

Supplementary background docs live in `/docs` (`curia-product-spec.md`, `curia-requirements.md`, `curia-onboarding-taxonomy.md`, `curia-DESIGN.md`) — these are earlier, partially-superseded drafts, useful for texture and FR numbering, but **the real prototype (`Curia.dc.html`) and this file override them wherever they conflict.** Specific overrides are called out below; don't silently resolve any conflict not already called out here — ask first.

## Tech stack
- React Native via Expo (SDK 54, `expo-router` file-based navigation)
- Supabase (Postgres + Auth + Storage)
- Mapbox GL (React Native SDK) — the prototype's map is an abstract SVG line-and-dot render, not a real basemap; Mapbox integration still needs a real API key (flag as a credential gap when M5/map work starts)
- Stripe (subscription billing) — needs a real account/API key (flag as a credential gap when subscription-gate work starts)

## Data model (draft — refine here first if it changes, not ad hoc in code)
- `User` — auth info (name, email), subscription status, "You" preferences: spend level (5-tier £–£££££), dietary requirements (multi-select: none/vegetarian/vegan/pescatarian/gluten-free/dairy-free/nut allergy), pet (none/small dog/large dog), religious observance (multi-select: none/halal/kosher/alcohol-free/prayer space nearby/Friday observance — handled quietly, ranking-only, never a visible account label), gender (optional), age range (optional), relationship status (optional — shapes table-for-two and group-friendly weighting)
- `UserPreference` — per category (Do/Drink/Eat): selected tiles + sub-preference on/off states. Minimum 3 tiles per category to proceed (see Onboarding below)
- `Tile` — category, name, list of possible sub-preferences (sub-preferences default **on**, see Hard rule 2)
- `Venue` — name, category/tile, sub-preference tags, spend level, district FK, city FK, lat/long, pet-friendly flag, dietary options, photos, description, plus internal-only `tier`, `source_confidence`, free-text `notes` (never surfaced in UI — see Hard rule 8)
- `District` — name, city/metro FK, boundary geometry, editorial description, liveliness curve (day-of-week × time-of-day — the prototype's `DAY_MULT`/`BAND_MULT` tables are a real, working implementation of this), group/cluster FK (for zoom-level grouping), a distinct accent color per district (see Design tokens)
- `DistrictGroup` — cluster label (e.g. "The Golden Triangle"), member district FKs, applicable zoom range. Naming rule confirmed by the prototype: a cluster takes a group's own name only when *every* member district is visible; a partial subset of a metro's districts is labelled for the subset (e.g. "Hale & Altrincham"), not the metro name — only the complete set of a metro's districts may carry the metro's own name (e.g. "Central Manchester")
- `City`/metro — name, region/launch-phase, boundary geometry (for the "unexplored territory"/"BEYOND THE EDGE" boundary — confirmed real feature, copy: *"Curia hasn't arrived here yet... We open a place only once we know it well enough to recommend it."*)
- `Moment` — exactly **4** types, confirmed by the prototype's own moments data (see Moments below): Date Night, Entertaining a Client, Big Group of Friends, Solo Reset. Each has a curated venue list and an admin curator byline (prototype shows real curator initials, e.g. "ELENA M.", "JAMES O.", "PRIYA N.")
- `Journey` — moment type, ordered list of `JourneyStop` (venue FK, order, walk-time-to-next); can span multiple districts — a Journey's displayed location is the set of districts its stops touch. Prototype confirms real journeys exist, e.g. "Date Night in Altrincham" (3 stops, 4 hours), "A Client, Well Handled" (Spinningfields, 2 stops, 3 hours)
- `SavedCollection` — user FK, name (user-defined, e.g. "My Fave Places in Manchester"), list of venue FKs — a venue can be in multiple collections
- `SavedJourney` — user FK, journey FK
- `AdminUser` — single role at launch, no multi-role distinction needed yet

## Design tokens — confirmed, extracted directly from the Claude Design handoff bundle (`Curia.dc.html`)
Fetched and read directly (not transcribed from a moodboard) on 2026-07-30. The product is **dark-mode-only end to end** — there is no light "Paper" surface anywhere. Do not invent alternatives or introduce colours/fonts outside what's below.

### Typography — two families only, no mono/third typeface
- **Cormorant Garamond** (serif, weights 300/400/500/600 loaded, 300 dominant) — headlines, venue names, big numbers/scores, editorial copy (district/venue descriptions), modal titles.
- **Jost** (sans-serif, weights 300/400/500) — all body text, buttons, meta lines, and the uppercase letter-spaced "kicker" labels (e.g. "RANKED FOR YOU", "SEARCH RADIUS", the "CURIA" wordmark, context-strip text). That kicker texture is Jost + `letter-spacing` (commonly `.14em`–`.34em`, up to `.4em` on the wordmark) + uppercase — **not** a monospace font. No third family (no Fraunces, Inter, or IBM Plex Mono) appears anywhere in the prototype.

### Color palette
| Token | Hex | Use |
|---|---|---|
| Base (background) | `#0B0A09` | Canonical near-black app background |
| Base variants | `#0C0B09`, `#12100E`, `#131110`, `#141110`, `#121010` | Per-screen near-black variants (map screen `#12100E`, device/app screen `#131110`) — treat `#0B0A09` as the one to reach for in new UI |
| Surface (card/panel) | `#1B1714` | Card/panel surface — warm dark-brown, one shade lighter than base, not a light "paper" tone |
| Surface variants | `#171412`, `#1A1613`, `#1D1811`, `#17130F`, `#15100D`, `#241C15` | Modal/sheet surfaces (`#17130F` for bottom sheets), expanded-tile detail (`#1A1613`), other per-screen card variants |
| Gold (primary accent) | `#C0A062` | Kickers, active states, numerals/scores, primary CTA background (paired with `#1A1410` text on top of it) |
| Gold (light) | `#E7D6B0` | Accent on the darkest surfaces — rank badges, active nav label, glow states |
| Gold (hover) | `#DCC392` | Link hover only |
| Text (primary) | `#F0E9DF` | Primary text on dark surfaces |
| Text (primary, bright) | `#F4EEE5` | Brighter variant, used sparingly |
| Text (secondary) | `#8B8175` | Meta lines, subtitles, secondary labels |
| Text (secondary, sibling) | `#9A8F82` | Close sibling to secondary, used interchangeably in places |
| Text (tertiary/dimmest) | `#6F6558` | Dimmest labels/hints (slider endpoints, smallest captions, inactive nav) |
| Border/neutral readable | `#CDC3B6` | Dividers needing a solid tone, secondary readable text (e.g. spend level "££££") |
| Hairline divider | `rgba(240,233,223,.09–.14)` | Thin separators — cream at low opacity, not a solid border color |
| Weather/signal (cool note) | `#CFE3E6` | Reserved for the weather glyph and "me" location-pin fill — the one pale, cool note in an otherwise warm palette. Never use decoratively |
| Muted secondary bg | `#4F483E` | Rare secondary muted surface/divider tone |
| Gold text-on-CTA | `#1A1410` | Text color used on top of gold CTA backgrounds |

**Map-render-only colors** (only inside the abstract map visualisation, not general UI tokens): water paths `#16262B` region, green space fills from the `GREEN` dataset, night/weather veil overlay layered over the `#0B0A09`-based veil.

**District/region map-pin accent family** — a distinct warm tone per district so clusters read apart on the map, confirmed 1:1 in the prototype's own `DISTRICTS` data: Northern Quarter `#C0A062`, Ancoats `#C9884E`, Spinningfields `#A8A06A`, Deansgate `#B98F72`, Chinatown `#BE7A5A` (reused for Wilmslow too), Altrincham `#C0A062`, Hale `#A8A06A`, Mobberley `#8E8A66`. Treat as extensible — assign a new tone per new district as the roadmap expands, not a fixed set.

General aesthetic: Soho House-inspired — dark, warm neutral palette, editorial typography, generous whitespace. Avoid bright primary colors, gamification, cluttered directory-style UI.

## Navigation shell — confirmed from the prototype's own state machine
- **Bottom tab bar has exactly 3 tabs: MAP, LIST, MOMENTS.** (`nav: [['map','MAP'],['list','LIST'],['moments','MOMENTS']]` in the prototype's own render logic.) Do not add a 4th tab for Profile — profile is reached via a circular avatar "emblem" button (user initials, gold border) top-right on Map/List, not a tab.
- Screens reached by push (not tabs), each with its own back button via a `stack` array in prototype state: Login/Signup (auth), Onboarding, Venue detail, District guide, Journey detail, Walk directions, Ride-to-venue, Profile, Saved places, Subscription/Membership, Notifications.
- New members: Login → Signup → Onboarding (Do → Drink → Eat → You) → Map. Returning members land directly on Map.
- Map and List are peers reachable via the tab bar at any time once past onboarding + subscription gate; both always render the same ranked result set (hard rule 5) — confirmed in the prototype's own description text: *"Map and List share one radius and one context, so switching tabs never changes the answer."*

## Onboarding model — resolved (was a conflict between docs; the prototype is a real, working implementation, not a text spec — it governs)
Do → Drink → Eat → You, each gated on **3-tile minimum per category** (`counts[cat] >= 3`), tabs shown as a 4-step progress strip. Sub-preferences within a tile default **on** and can be toggled off (see Hard rule 2). "You" is the 4th step, not tile-gated — it captures spend level, dietary, pet, religious observance, gender, age, relationship (see Data model). **Do not build the taxonomy doc's 3-level chip-tree model** (`curia-onboarding-taxonomy.md`) — the real prototype implements the tile-grid model from `curia-product-spec.md` §3 instead, and that's what ships.

## Moments — resolved to exactly 4 (confirmed in the prototype's own `MOMENTS` data, not the 6+ list in `curia-requirements.md`/the taxonomy doc)
1. **Date Night**
2. **Entertaining a Client**
3. **Big Group of Friends**
4. **Solo Reset**

Each Moment is a curated venue list with a named curator byline and a short editorial blurb (brand-voice examples straight from the prototype: *"Rooms that can take eight at short notice without a sigh from the host."* / *"Counter seats, a book, and nobody asking whether you're waiting for someone."*). Do not add wellness/family/custom moment types without a product decision.

## Districts — resolved to the prototype's real 10, across two metros
**Manchester:** Northern Quarter, Ancoats, Spinningfields, Deansgate, Chinatown.
**Cheshire:** Altrincham, Hale, Wilmslow, Alderley Edge, Mobberley.

Confirmed `DistrictGroup` clusters from the prototype: "The Golden Triangle" (Alderley Edge, Wilmslow, Mobberley, Hale), "Hale & Altrincham", "Ancoats & the NQ", "The Deansgate Spine" (Deansgate, Spinningfields, Chinatown). Real venue seed data (10 sample venues) and district lat/long/base-score/zoom-radius values are transcribed into `/docs/data/districts.json` and `/docs/data/venues.json` — use them as the seed shape, don't invent a different one.

## Subscription — resolved to £19.99/month with a 14-day free trial (confirmed by the prototype's own copy: *"Membership is £19.99 a month after your first fortnight."*)
This overrides the £14.99 figure that appears in `curia-requirements.md` BR-1/FR-7.2 — the real, built prototype is stronger evidence of the shipped decision than a requirements draft. Never hardcode either figure directly in code; use a single config value so it can move without a copy sweep.

## Matchmaking contract (build against this shape even before the real engine exists)
Input: user preferences (tiles + sub-prefs + You data), current location, radius, context (day/time or "Now"), weather, active in-session quick filter ("mood" sheet, confirmed in prototype as "I'm in the mood to…").
Output: ranked list of venues, each with a match score and a short human-readable reason string (e.g. "Natural wine and communal tables both on, and the kitchen runs to 11pm" — real prototype copy, use this register).

**Hard filters (a failing venue must never appear at all, regardless of match quality elsewhere):**
- Distance/radius — outside current radius = excluded, not just deprioritized. Prototype's radius control spans ¼ mi to 30 mi.
- Dietary requirement — no suitable option = excluded.
- Pet-friendliness — venue flagged pet-unfriendly is excluded/deprioritised if user travels with a pet (this is a venue-side flag, not a user filter).
- Active in-session "mood" quick filter restricts the candidate pool before ranking runs.

**Ranking weights (affect score, never exclude):**
- Tile match, sub-preference match, spend level, time of day (`BAND_MULT`), day of week (`DAY_MULT`), weather.

## Hard rules — never violate these in generated code, copy, or seed data
1. Chain/fast-food venues (McDonald's, Wetherspoons, etc.) must never be seeded, imported, or hardcoded anywhere, ever.
2. Sub-preferences default **on** = "I want this." Off = "I don't want this." Never invert this in logic or copy.
3. Distance, dietary requirement, and pet-friendliness are **hard filters**, never soft ranking weights.
4. The subscription gate sits **after** onboarding, before Map/List access. Completing onboarding alone must never grant access to recommendations.
5. Map/List always reflect the **same underlying ranked result set** — never let them drift out of sync.
6. Grouped map labels (e.g. "The Golden Triangle," "Central Manchester") are navigation-only zoom aids — they are not districts, have no detail page, and tapping one only reframes the zoom.
7. The onboarding tile-selection UI must never show a counter that implies a cap (e.g. never "6/3") — gate the Continue button on the 3-tile minimum with a clear message instead. Confirmed in the prototype: the badge shows a plain count, never "N/3".
8. Internal-only fields (`tier`, `source_confidence`, `notes`, raw scores) must never appear in user-facing UI or copy.
9. Bottom tab bar is Map/List/Moments only — never add Profile or Saved as a 4th tab (see Navigation shell above).

## Brand voice
Editorial, confident, quietly luxurious — like a guide written by someone with excellent taste, not a listings directory. Prototype examples: *"Unmarked entrance on Tib Street; speakeasy-style still weighted on."* / *"A mill floor big enough to work in, and nobody rushing the second cup."* Avoid generic directory-speak ("Great spot for food!"). Every match-reason string should feel like a specific, earned observation, not a generic score justification.

## Still genuinely open (do not guess — ask before building against these)
- **UK-residency verification mechanism** for signup — not specified anywhere seen so far.
- **Referral/invite mechanic** — mentioned as a possibility in background docs, not designed in the prototype.
- **Whether onboarding "review"/vetting is a real manual step or removed entirely** — background docs disagree with each other; the prototype shows no vetting UI, but that doesn't confirm the backend behavior.
- **Mapbox and Stripe API keys** — genuine credential gaps, not guessable. Flag to the user when map-rendering or subscription-billing work actually starts; everything up to that point can be built against mock/local data.

## How to work in this repo
- Keep commits small and scoped to one feature/fix at a time.
- Never commit real API keys — use `.env`, reference `process.env.*`.
- Before implementing ranking/filtering logic, re-read the Matchmaking contract section above.
- Before writing user-facing copy, re-read the Brand voice section above.
- Re-read this file at the start of every task, not just once per session — it is the arbiter of any conflict with `/docs`.
