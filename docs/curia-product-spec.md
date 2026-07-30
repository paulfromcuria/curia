# Curia — Product Spec (v2, rebuild from scratch)

## 1. Vision & Positioning

Curia is a predictive map engine for people who enjoy a refined lifestyle and have medium-to-very-high disposable income. It is not a discovery app for "anything nearby" — it is a **curated recommendation engine** that only ever shows venues that fit a high-end, considered standard.

- **Positioning line:** *"More Raya than Tinder. More Michelin Guide than TripAdvisor."*
- **Exclusivity has two layers:**
  1. **Supply-side exclusivity** — the venue database is hand-curated. No chains, no mass-market venues (McDonald's, Wetherspoons, etc. are permanently excluded — this is a hard rule, not a preference toggle).
  2. **Demand-side exclusivity** — access is gated by a £19.99/month subscription, reinforcing that this is a tool for people who take their leisure time seriously.
- **Aesthetic direction:** Soho House-esque. High-end, editorial, understated luxury — not flashy or gamified. Think dark neutral palettes, warm brass/gold accents, serif or refined sans typography, generous whitespace, quiet confidence rather than loud UI.

## 2. Target User

Someone with medium-to-very-high disposable income who wants curated suggestions for how to spend their evening/day without wading through generic listings — values discretion, taste, and time saved over sheer volume of choice.

## 3. Onboarding

User signs up and, before ever seeing the map, sets preferences across three categories: **Do, Drink, Eat**. Within each category:

- The user is shown a grid of **venue-type tiles** (~15 per category).
- Selecting a tile turns it "on" and reveals a set of **sub-preferences** beneath it, **all toggled on by default**.
- The user can deselect any sub-preference to refine the tile further (e.g. under Drink → Nightclubs, they might turn off "no trainers allowed" if that's not a dealbreaker for them).
- This means the default state (tile selected, no sub-prefs touched) represents the "purest" version of that venue type; deselecting sub-prefs broadens or narrows what qualifies.

### 3.1 General Preferences (apply across all categories)
- **Spend level:** £ / ££ / £££ / ££££ / £££££
- (Room here for others later — e.g. group size, accessibility, dietary needs — flagged as open questions, see §8)

### 3.2 Category: DRINK — ~15 tile types

| Tile | Example sub-preferences (default ON) |
|---|---|
| Nightclubs | House music, Hip-hop/R&B, Table service, No trainers allowed, Late license (past 3am), Dress code enforced |
| Cocktail bars | Speakeasy-style, Award-winning bar list, Live mixology/theatrics, Booth seating |
| Wine bars | Natural wine, Sommelier on site, Small plates available, Vinyl/curated music |
| Jazz bars | Live music, Late night sets, Intimate seating, No cover charge |
| Rooftop & scenic | Skyline view, Heated outdoor seating, Sunset hours, DJ sets |
| Pubs (upmarket/gastro only) | Fireplace, Sunday roast, Dog-friendly, Beer garden |
| Members' clubs | Guest-list only, Dress code, Live entertainment |
| Whisky/spirits bars | Rare/aged selection, Tasting flights, Cigar terrace |
| Hotel bars | Live pianist, Afternoon-to-late service, Views |
| Juice/wellness bars | Cold-pressed, Alcohol-free cocktails, Morning hours |
| Cafés (evening/late) | Specialty coffee, Natural wine by the glass, Late opening |
| Champagne bars | Vintage list, Oyster pairing, Booth service |
| Beer gardens | Craft/independent brewers, Outdoor heaters, Live sport (optional off) |
| Riverside/waterside bars | Outdoor terrace, Boat/dock views, Sunset hours |
| Late-night lounges | DJ sets, Bottle service, Smoking terrace |

### 3.3 Category: EAT — ~15 tile types
*(Deliberately not organized by cuisine — organized by experience/occasion, per your brief.)*

| Tile | Example sub-preferences (default ON) |
|---|---|
| Tasting menu | Wine pairing, Chef's table, 5+ courses |
| Scenic | Skyline/waterside view, Outdoor terrace |
| Romantic | Low lighting, Candlelit, Tables for two, Quiet music |
| Lively & loud | Open kitchen buzz, Group-friendly, Late sittings |
| Fine dining | Michelin-recognised, Formal service, Dress code |
| Brunch | Bottomless option, Weekend only, Outdoor seating |
| Small plates/sharing | Natural wine list, Communal tables |
| Late-night eats | Open past midnight, Walk-ins only |
| Business lunch | Quiet enough to talk, Quick service, Private booths |
| Hidden gem | Unmarked/discreet entrance, No booking required |
| Chef's counter | Open kitchen, Interactive service |
| Al fresco/garden | Heated terrace, Greenery, Daytime hours |
| Private dining | Bookable rooms, Bespoke menus, Minimum spend |
| Wine-led dining | Sommelier pairing, Extensive by-the-glass list |
| Celebratory/special occasion | Set menus, Champagne on arrival, Dessert theatrics |

### 3.4 Category: DO — ~15 tile types

| Tile | Example sub-preferences (default ON) |
|---|---|
| Culture | Art, History, Libraries, Museums, Photography exhibitions |
| Parks & green space | Scenic walks, Botanical gardens, Riverside paths |
| Independent cinema | Director's cuts, Q&A screenings, Bar on site |
| Theatre | West End-style productions, Fringe/independent, Matinees |
| Ballet & opera | Classical programme, Contemporary programme |
| Clothes shopping | Designer boutiques, Vintage/curated, Personal styling |
| Live music (non-bar venues) | Jazz, Classical, Intimate gig spaces |
| Art galleries | Contemporary, Private viewings, Independent artists |
| Spa & wellness | Day spa, Thermal suite, Treatments |
| Comedy | Intimate venues, Headline acts |
| Markets | Artisan/independent stalls, Food markets |
| Sport (spectator, upmarket) | Racecourse, Members' enclosures, Polo/tennis |
| Architecture & walking tours | Guided, Self-directed, Historic district focus |
| Antiques & design shopping | Curated dealers, Design showrooms |
| Cookery/craft experiences | Small group, Hands-on, Expert-led |

## 4. Discovery Experience (post-onboarding)

### 4.1 Two views
- **Map view** — geographic, visual, district-driven.
- **List view** — ranked list of best matches nearby.
- Toggle between the two at any time; same underlying result set.

### 4.2 Matchmaking inputs
The recommendation engine ranks venues using:
1. **User preferences** (tiles + sub-preferences + spend level)
2. **Distance** from current (or planned) location
3. **Time of day**
4. **Day of week**
5. **Current weather** (or forecast weather, if planning ahead)

### 4.3 Context planning (forward-looking mode)
Users aren't limited to "right now." They can change context — e.g. set it to **"Friday, late night"** — and the whole result set (map + list) updates to show what would be recommended in that context, including a weather forecast substitution where relevant.

### 4.4 Districts — live, dynamic map layer
Rather than a static map, Curia visualises **districts as living entities**:
- Districts **pulse/glow** based on how "alive" they are right now (or at the selected context) — e.g. Northern Quarter pulses brighter on a Saturday evening than on a Tuesday afternoon.
- Pulse intensity is driven by a composite "liveliness" signal (could be modeled from venue density, typical footfall patterns by day/time, and — later — real usage data).
- **Tapping a district name** opens a district profile: a short editorial description of its character, plus the top-ranked venues in that district for the user, right now (or at their selected context).

### 4.5 District curation (exclusivity extends to place, not just venue)
Only "classy"/high-end districts are included — no rough or non-aspirational areas. Example approved district list (Manchester/Cheshire-led, expandable):

> Hale, Altrincham, Wilmslow, Alderley Edge, Mobberley, Deansgate, Northern Quarter, Ancoats, Spinningfields, Chinatown

*(This list should be treated as a living, manually-curated allowlist — the same editorial standard applied to venues applies to districts.)*

## 5. Brand & Business Model
- **Subscription:** £19.99/month, single tier at launch.
- **Curation model:** Every venue is manually reviewed/approved before appearing in the database — no open self-listing, no algorithmic scraping of generic listings (e.g. Google Places) without human curation/approval.
- **Hard exclusion list:** Fast food chains and value-tier chains (McDonald's, Wetherspoons, etc.) — never shown, not even as an edge case.

## 6. Design/Aesthetic Direction
- Soho House-inspired: dark, warm neutral palette (charcoal, cream, brass/gold accent), editorial typography, generous negative space.
- Avoid: bright primary colors, gamified badges/streaks, cluttered card-heavy UI typical of Tripadvisor/Yelp-style apps.
- Tone of voice: quiet, confident, editorial — like a guide written by someone with excellent taste, not a listings directory.

## 7. Build Plan
1. **Prototype in Claude Design** — focus on: onboarding tile/sub-preference flow, map view with pulsing districts, list view, district detail panel, context-switcher (time/day/weather).
2. **Rebuild in a fresh Replit project** once the prototype validates the interaction model.

## 8. Matchmaking Model — Confirmed

- **Sub-preferences affect ranking weight**, not just inclusion/exclusion. A venue can still surface with a sub-preference "off," it just ranks lower than a venue matching the fuller preference set. This means the engine needs a weighted scoring model (not a binary filter pipeline) — each signal (tile match, sub-pref match, spend, distance, time/day, weather) contributes a score rather than a pass/fail.
- **Spend level (£–£££££) is a ranking factor, not a hard filter.** A user set to £££ will still see £££££ venues, just ranked lower unless other signals strongly favour it (or vice versa) — never fully hidden.

## 9. Admin Dashboard

A core piece of the platform, separate from the consumer-facing app. This is where Curia's curation actually happens.

**Core functions:**
- **Venue management** — add, edit, remove venues; assign tile category (Do/Drink/Eat), tile type, sub-preference tags, spend level, district.
- **District management** — add, edit, remove districts; each district has:
  - Editorial description/profile (shown when a user taps the district)
  - **Manually-authored liveliness curve** — an admin sets/edits how "alive" a district is expected to be across day-of-week × time-of-day (and potentially weather condition), rather than the system inferring this from real usage data. This is what drives the pulsing map layer at launch, before real behavioural data exists to refine it.
- **Bulk import/export** — CSV/spreadsheet-based bulk upload and export for both venues and districts, so the curation team can work at scale rather than one-by-one (important given the multi-city expansion roadmap below).
- Likely needs basic **audit/versioning** (who added/edited what, when) given how central manual curation is to the brand promise — worth deciding early whether this is in scope for the prototype or a v2 addition.

## 10. Geographic Rollout

- **Phase 1 (proof of concept):** Restricted to **Cheshire and Greater Manchester** only. All district curation, venue curation, and testing happens within this footprint first.
- **Phase 2:** International expansion into **Dubai, Monaco, and Singapore** — high-disposable-income, lifestyle-driven markets that suit the brand positioning.
- **Phase 3:** **London, Paris, New York, LA**, and other major global cities.
- Implication for the data model: districts and venues should be structured as belonging to a **city**, and cities as belonging to a **region/launch phase**, from day one — even though only one city is live at first — so expansion doesn't require a schema rework later.

## 11. Open Questions (remaining)
- Does the admin dashboard need multi-user roles at prototype stage (e.g. curator vs. admin), or is a single-admin model fine for now?
- For bulk import/export — is a simple CSV schema sufficient, or does the curation team need richer validation (e.g. preventing a McDonald's-type venue from being imported at all)?
