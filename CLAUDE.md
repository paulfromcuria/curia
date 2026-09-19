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
- `Venue` — name, category/tile, sub-preference tags, spend level, district FK, city FK, lat/long, pet-friendly flag, dietary options, photos, description, `status` (`'live' | 'coming-soon'`, defaults `'live'` — an editorial confidence marker set by curation, e.g. a new venue whose parent operator has stated expansion plans that could tip it into Hard rule 1 chain territory later; still appears in normal ranked results with a "New" badge, never literal "coming soon" copy since the venue may already be open — added 2026-09-08 for exactly this case, see docs/data/venues.json's own note), `openingHours` (real per-day hours, optional — added 2026-09-18 for Map's closed-now indicator, see src/types/models.ts's `OpeningHours` doc comment; `undefined` means not yet researched and must never render as closed, only a confirmed range does — a large, ongoing sourcing effort across the whole catalog, not a one-time backfill), plus internal-only `tier`, `source_confidence`, free-text `notes` (never surfaced in UI — see Hard rule 8)
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
| Text (disabled) | `#4A443B` | Unreachable/disabled state, dimmer than tertiary (e.g. an onboarding step not yet reachable) — found during M9 QA, omitted from the original extraction, not invented |
| Text (badge, inactive) | `#7C6E5E` | Inactive count-badge tone, distinct from tertiary — same provenance as above |
| Border/neutral readable | `#CDC3B6` | Dividers needing a solid tone, secondary readable text (e.g. spend level "££££") |
| Hairline divider | `rgba(240,233,223,.09–.14)` | Thin separators — cream at low opacity, not a solid border color |
| Weather/signal (cool note) | `#CFE3E6` | Reserved for a future weather glyph — the one pale, cool note in an otherwise warm palette. Never use decoratively. No longer the "me" location-pin fill (see below) — split out 2026-09 so this stays reserved for weather specifically |
| Location pin (amethyst) | `#B79FD6` | The "me" location-pin fill only (2026-09, at explicit user request — the plain white/pale-blue pin "wasn't classy"). Deliberately not gold: gold is already the venue-match-pin accent, so reusing it here would make "this is you" indistinguishable from "this is a recommendation" on the map |
| Closed-now red | `#C0524A` | A venue pin's outline when it's confirmed closed right now (2026-09-18, real `Venue.openingHours` data only — never shown for a venue with no hours researched yet). A warm brick-red, not a stop-sign red, to stay inside this palette's own warm register |
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

**Currently in open beta (2026-09, at explicit user request) — no subscription language is shown anywhere in the member-facing app.** The £19.99/14-day terms above are still the real, decided plan and still live in one place (`src/lib/config/subscription.ts`), but until Stripe is actually wired up (a genuine credential gap, see "Still genuinely open" below), showing a price or a trial countdown the app can't actually charge against was judged worse than showing nothing. `src/app/subscription.tsx` — still the real Hard rule 4 checkpoint between onboarding and Map/List, still keyed off the same `isSubscribed`/`subscriptionStatus` fields — now asks someone to "enter the open beta" instead of pitching a paywall; `session.enterOpenBeta()` sets `subscriptionStatus: 'active'` (not `'trialing'` — there's no real trial clock counting down to a real charge). When real billing lands, this reverts to a real paywall by changing what this one screen (and its signup-footer/profile-row copy) shows, not by changing any gating logic — the structural gate itself was never removed.

## Matchmaking contract (build against this shape even before the real engine exists)
Input: user preferences (tiles + sub-prefs + You data), current location, radius, context (day/time or "Now"), weather, active in-session quick filter ("mood" sheet, confirmed in prototype as "I'm in the mood to…").
Output: ranked list of venues, each with a match score and a short human-readable reason string (e.g. "Natural wine and communal tables both on, and the kitchen runs to 11pm" — real prototype copy, use this register).

**Hard filters (a failing venue must never appear at all, regardless of match quality elsewhere):**
- Distance/radius — outside current radius = excluded, not just deprioritized. Prototype's radius control spans ¼ mi to 30 mi.
- Dietary requirement — no suitable option = excluded.
- Active in-session "mood" quick filter restricts the candidate pool before ranking runs.
- Confirmed closed right now (`passesOpenNowFilter`, 2026-09-19) — a venue with real, researched `Venue.openingHours` (src/lib/data/opening-hours.ts) data showing it's shut at the current day/time is excluded, the same "genuine impossibility" logic as distance/dietary. `undefined` (no hours researched yet — true for most of the catalog) always passes; only an explicit, confirmed `false` excludes. Found the same day as the scoreBandFitFactor fix below, once real opening-hours data existed but had only ever been wired into Map's decorative pin ring, never into what actually gets recommended.

**Ranking weights (affect score, never exclude):**
- Tile match, sub-preference match, spend level, day of week (`DAY_MULT`), district liveliness (`bandMultiplier` — the district's real-time "how alive is it here" curve, distinct from a venue's own opening hours), weather, pet fit (see note below), proximity (added 2026-09 — a light "closer wins, all else equal" tiebreaker *inside* the hard radius; the radius cutoff itself is unchanged), distinctiveness (added 2026-09-16, alongside the Hard rule 1 two-gate amendment above — a discount-only multiplier on the venue's editorial 1–5 Gate 2 score, never a zero-out; a distinctiveness-1 venue can still win a narrow filter when it's the only real match).
- Time of day (`BAND_MULT`) is **not** in that additive list — it moved to its own discount multiplier, `scoreBandFitFactor` (2026-09-19, at direct user report: a padel club with no late-night hours was recommended at Saturday late night in central Manchester over real open bars, because as an additive term it could only ever cost a venue a few points out of 100, never enough to outweigh a strong base score). Same "discount, never exclude" shape as distinctiveness above — a venue outside its own operating bands is multiplied down hard (×0.35), not zeroed out, so a genuine late-night specialist still wins cleanly and a real mismatch can still surface as the only option in a narrow filter.

**Pet-friendliness is a ranking weight, not a hard filter** (changed 2026-09, at explicit user request, superseding the original hard-filter treatment below — a venue flagged pet-unfriendly is deprioritised, not excluded, when the user travels with a pet; a non-pet-friendly venue is never scored worse than "no signal," since going somewhere without the pet is always a normal option, unlike a genuine dietary restriction). Real-world trigger: Santorini has zero confirmed pet-friendly venues, so the old hard filter silently zeroed every result there for any traveling-with-a-pet user.

**Ranking weights flex by context, not just by value** (2026-09, matchmaking-smartness pass, at explicit user request — "pet weighting is more important in the day time than late night" generalized into a real rule: a signal's *importance* changes with context, not only the score it produces). `src/lib/scoring/rank-venues.ts`'s `weightsFor(band, weather)` computes the actual weight set per call rather than using one fixed set: pet fit is weighted up in the morning/afternoon and down late at night; weather is weighted up only when conditions are genuinely extreme (a mild afternoon shouldn't swing indoor-vs-outdoor as hard as an actual storm); spend fit is weighted up for an evening/late decision, the usual "main event" of the day, vs. a casual daytime stop. Every rule is independent and the result is renormalized to sum to 1 afterward, so the score still lands in 0..100 no matter which rules fire together — adding a new contextual rule never requires manually rebalancing the rest.

## Hard rules — never violate these in generated code, copy, or seed data
1. **Two-gate model (replaces the original single "no chains, ever" veto — 2026-09-16, at explicit user request).** The original rule was doing double duty as both a quality bar and a chain-detection proxy, and it caught the wrong things: a small, well-run premium group (three or four sites, one real owner, no franchise ambition) could fail it even when a Curia member would be perfectly happy walking in. Split into two separate checks:
   - **Gate 1 — inclusion, never bent.** "Would a Curia member — someone with taste and money — be comfortable walking in?" Mass-market high-street brands (McDonald's, Wetherspoons, Nando's, Greggs, Frankie & Benny's, Miller & Carter, etc.) fail this by definition. A venue that fails Gate 1 never enters the catalogue, full stop — this is the part of the old rule that doesn't change.
   - **Gate 2 — distinctiveness, 1–5, editorial, not a veto.** "Would a local who knows the area tell a visiting friend about this specific place?" 5 = genuinely singular (The Stolen Lamb, Riddles). 3 = a good, reliable mid-tier pick (a good Piccolino). 1 = comfortable, competent, ubiquitous (Gail's, Côte, Everyman). Ownership research is now an *input* to this score, not an automatic exclusion — a small or even large premium group can score anywhere from 1 to 5 depending on how distinctive it actually feels, rather than being barred from the catalogue outright. This is a ranking signal (`rank-venues.ts`), not a presentation-layer concept — see the Matchmaking contract below.
   - Public-facing copy stays "no high-street chains" everywhere it already appears — that claim is still true under the new model, since Gate 1 still excludes exactly that.
2. Sub-preferences default **on** = "I want this." Off = "I don't want this." Never invert this in logic or copy.
3. Distance and dietary requirement are **hard filters**, never soft ranking weights. Pet-friendliness is deliberately *not* on this list (see "Matchmaking contract" above) — it's a ranking weight, changed 2026-09 from an original hard-filter treatment.
4. The subscription gate sits **after** onboarding, before Map/List access. Completing onboarding alone must never grant access to recommendations.
5. Map/List always reflect the **same underlying ranked result set** — never let them drift out of sync.
6. Grouped map labels (e.g. "The Golden Triangle," "Central Manchester") are navigation-only zoom aids — they are not districts, have no detail page, and tapping one only reframes the zoom.
7. The onboarding tile-selection UI must never show a counter that implies a cap (e.g. never "6/3") — gate the Continue button on the 3-tile minimum with a clear message instead. Confirmed in the prototype: the badge shows a plain count, never "N/3".
8. Internal-only fields (`tier`, `source_confidence`, `notes`, raw scores) must never appear in user-facing UI or copy.
9. Bottom tab bar is Map/List/Moments only — never add Profile or Saved as a 4th tab (see Navigation shell above).

## Brand voice
Editorial, confident, quietly luxurious — like a guide written by someone with excellent taste, not a listings directory. Prototype examples: *"Unmarked entrance on Tib Street; speakeasy-style still weighted on."* / *"A mill floor big enough to work in, and nobody rushing the second cup."* Avoid generic directory-speak ("Great spot for food!"). Every match-reason string should feel like a specific, earned observation, not a generic score justification.

## Presentation layer — concierge, not calculator (resolved 2026-08, at explicit user request)
Positioning target: a private members'-club "concierge" feel — Raya's air (a knowing, discreet, personal recommender), pitched slightly above Raya, **without** a membership vetting/application process. Soho House is a useful visual reference (dark, serif, restrained) but Curia does not gate entry by social exclusivity — it should feel personally curated for you, not exclusive to join. The filter is **quality**, not price or fame (see Hard rule 1) — a great local pub or a family-run café belongs; a chain never does, regardless of price point.

A real concierge never quantifies their taste or shows their working. This is a **presentation-layer rule only** — it constrains what user-facing screens render, never the underlying logic:

- **Never show a raw numeric match score, anywhere in user-facing UI** — no "69", no "71 MATCH" badges on venue cards, list rows, map pins, or sheets. Replace with nothing by default; a qualitative label ("Strong match") is allowed but must be used sparingly — don't replace one score system with another.
- **"Why it's ranked here" reads as one person's judgment, not a scoring breakdown.** No labelled YOUR PREFERENCES/TIMING/SPEND fields — one or two sentences of prose, same register as venue description copy (see Brand voice). In practice this is usually already covered by the venue's own curated `description`/`reason` text (`reasonFor()` in `rank-venues.ts` returns `venue.description` verbatim when set) — don't add a second, separate reasoning block that just repeats it. **Carve-out (2026-09, at explicit user request):** the venue detail screen's "GOOD TO KNOW" row of plain fact tags (`src/app/venue/[id].tsx`) is not this rule — it states concrete, actionable yes/no facts the member can act on (can I bring the dog? is there a vegan option?) against their own real profile, including genuine mismatches, not just matches. Still never a weight, a percentage, or a labelled score category — the line is "a fact the member can act on" vs. "the mechanism that produced this ranking."
- **Travel handoffs offer to sort the journey, don't print the logistics.** No "X.X mi, about NN minutes by road" readout on a ride CTA — "Request a car" (or similar) is enough. This does not apply to a screen whose actual job is showing live progress (e.g. the Walk screen's remaining-distance/ETA) — that's real navigation state, not a recommendation's working.
- **Utility chrome (weather, live "how alive is a district right now" stats, zoom/search-radius controls) stays quiet and secondary** — present and functional, but not competing with curated content for primary visual weight. Weather still drives real ranking (`scoreWeather`) and is still one tap away (the day/time sheet's forecast note); it just isn't a persistent pill on the primary view.
- **One real "where you are" source of truth — but two different truths, not one** (corrected 2026-09-18, at explicit user report: the walking-directions feature was found using the wrong one). `session.location` is real device GPS — the ground truth for real physical distance (Walk, Ride, venue detail's "FROM YOU"). `session.searchOrigin` starts equal to it but follows wherever Map's camera has been panned to — the "what am I browsing" point, correct for List/Map ranking and radius filtering, not for navigation. This file previously said `searchOrigin` covered all of these, which was wrong and caused a real bug: walk/ride/venue-detail distance could silently be measured from a browsed-to map position instead of the member's actual location. Never a screen-local fallback constant either way (`DEMO_LOCATION` is the last-resort default both fields fall back to, not something individual screens should reach for directly) — two screens computing distance to the same venue from two different assumed origins is exactly the kind of disagreement this rule exists to prevent, which is why Walk/Ride/venue-detail must all three agree on `location`, never a mix.

**Backend/data-layer scoring, filtering, and ranking (`rank-venues.ts`, Hard rules 1–5) are entirely unaffected** — this section governs what's rendered, not what's computed. Do not build a membership application, waitlist, or vetting-gate flow against this section — that would be social exclusivity, the thing this positioning explicitly avoids.

## Still genuinely open (do not guess — ask before building against these)
- **UK-residency verification mechanism** for signup — not specified anywhere seen so far.
- **Referral/invite mechanic** — mentioned as a possibility in background docs, not designed in the prototype.
- **Whether onboarding "review"/vetting is a real manual step or removed entirely** — background docs disagree with each other; the prototype shows no vetting UI, but that doesn't confirm the backend behavior.
- **Mapbox and Stripe API keys** — genuine credential gaps, not guessable. Flag to the user when map-rendering or subscription-billing work actually starts; everything up to that point can be built against mock/local data.

## Known implementation gaps (not product ambiguity — just unfinished wiring, tracked so no one re-discovers them from scratch)
- **Map and List share `radiusMiles` (`session.radiusMiles`) but not `context` (day/time) or the mood quick-filter.** Each screen still owns those two independently, so CLAUDE.md's "share one radius and one context" promise is only half-implemented today. Found and left open by the M9 QA pass — needs a decision on whether context/mood belong in shared session state too (the same pattern used for radius) before it's built, since unlike radius this wasn't a bug so much as M5 explicitly deferring it.
- **Turn-by-turn walking directions and real ride-hailing (Uber or otherwise) are mocked.** Distance/ETA and fare-tier math are real (`src/lib/travel/trip.ts`), but there's no real routing or ride-hailing provider account/API key — same category of gap as Mapbox/Stripe above.

## How to work in this repo
- Keep commits small and scoped to one feature/fix at a time.
- Never commit real API keys — use `.env`, reference `process.env.*`.
- Before implementing ranking/filtering logic, re-read the Matchmaking contract section above.
- Before writing user-facing copy, re-read the Brand voice section above.
- Re-read this file at the start of every task, not just once per session — it is the arbiter of any conflict with `/docs`.
