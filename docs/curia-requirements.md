# Curia — Requirements Document

**Version:** 1.0 (Draft)
**Product:** A curated, predictive lifestyle map for Cheshire & Manchester
**Positioning:** The Michelin Guide, not TripAdvisor — a high-value membership built on selectivity, not a comprehensive directory built on coverage

---

## 1. Purpose & Scope

This document defines what needs to be built for Curia v1 (the initial launch covering Northern Quarter, Ancoats, Altrincham, Hale, and Knutsford), and the reasoning behind each requirement. It supersedes the informal spec discussed earlier in favour of a structured, buildable reference — but the core model (taste graph → moment graph → context engine) carries over unchanged.

**In scope for v1:** iOS/web member experience, onboarding, predictive map, district guides, feedback loop, membership/waitlist flow, admin curation tooling.

**Out of scope for v1:** live booking/reservations integration, real-time venue availability, payments beyond a simple subscription charge, native Android app, geographic expansion beyond the five priority districts.

---

## 2. Positioning Requirements

| ID | Requirement |
|---|---|
| P1 | Curia must never be described or designed as a "search" or "directory" product internally or externally. All copy, UI language, and marketing frames it as curation and membership. |
| P2 | The venue dataset is a curated selection, not comprehensive coverage — Michelin's small inspector-curated list, not TripAdvisor's exhaustive crowdsourced one. Target ~40–80 signature-tier venues per priority district, not hundreds. |
| P3 | Every venue carries a `tier`: `signature` (recommend freely) or `texture` (accurate, but deprioritised outside protected moments — see FR-9). Texture venues exist for coverage of casual moments, not as filler. |
| P4 | Access is gated by subscription (£14.99/month) and UK residency only — no manual application, review, or approval step. Exclusivity comes from the curation itself (P2), not from vetting who's allowed to pay for it. |
| P5 | No advertising, no paid placement, no free tier. Revenue is membership fees only — see section 6. |

---

## 3. User Personas

- **The Entertainer** — uses Curia mainly for client dinners; cares about discretion, quiet, spend headroom, and never being caught out by a bad booking.
- **The Pair** — uses Curia for date nights; cares about atmosphere and novelty, moderate-to-high spend, wants to avoid repeating the same three restaurants.
- **The Host** — organises big-group nights out; cares about capacity, noise tolerance, and booking logistics for 6–12 people.
- **The Regular** — uses Curia solo or with a partner for wellness/wind-down (yoga, park walks, quiet wine bars); lower spend but high frequency.

Every functional requirement below should be checked against at least one persona's need.

---

## 4. Functional Requirements

### FR-1 — Onboarding
- **FR-1.1** Onboarding must capture, in order: home anchor location + travel radius, vibe-swipe signal (image/card pairs), category taste (weighted, not binary), moment library (from a fixed set: client dinner, date night, big group, solo wind-down, wellness reset, family/other — user can add custom moments), per-moment spend band, and two calibration anchors ("a place you love" / "a place that's not you," matched against the venue DB via autocomplete).
- **FR-1.2 (revised)** Onboarding is **not time-boxed**. The original "under 2 minutes" cap is replaced by a progressive-refinement model: a short minimum path (home anchor, travel radius, at least one moment, spend band) is enough to unlock real value on first use — sensible neutral defaults fill in anything skipped. Depth beyond that minimum (the taste-tile tree, calibration anchors) is encouraged, not rushed, and should feel inviting to go deep on rather than something to get through quickly. The product must let a person **return to onboarding's taste-tile tree at any time** (e.g. from a profile/settings surface) to keep refining after they've already seen the app work — refinement is continuous, not a one-time gate.
- **FR-1.3 (revised)** There is no "profile under review" moment — that framing is removed. Onboarding flows straight from the fast minimum path into the subscription/UK-residency check (FR-7) and then genuine access. Copy and pacing should still feel considered and premium — a beat of polish, not a rushed signup — but must not imply vetting or approval that isn't happening. Depth (the taste-tile tree) remains explicitly offered as something to come back to (FR-1.2), just without any "waiting to be let in" framing.
- **FR-1.4** Onboarding output is a structured taste profile per the data model in section 7, stored against the user record. Fields left at their neutral default (because the person skipped that depth) must be flagged as such internally, so the scoring engine and any "keep refining" prompts can distinguish a genuine preference from an unset default.

### FR-2 — Predictive Map (home surface)
- **FR-2.1** On open, the map/list must already be populated with a ranked shortlist for the user's current context (time, day, weather, last-used or inferred moment) — no empty search state, ever.
- **FR-2.2** A one-line context strip must explain the "why" behind the current ranking (e.g. "Friday, 7pm, light rain — your client-dinner picks tonight").
- **FR-2.3** Ranking is produced by the scoring function in section 8. Top 4–6 results shown by default, expandable.
- **FR-2.4** Weather and time-of-day context should update automatically (live clock, live weather API) without requiring user input, while remaining manually overridable (FR-3).

### FR-3 — Moment & Context Switcher
- **FR-3.1** A persistent, one-tap control lets the user override the inferred moment (e.g. switch from "date night" to "big group") without leaving the map view.
- **FR-3.2** Manual overrides for time-of-day and weather must be available for planning ahead (e.g. "show me Saturday night, assume it's raining").
- **FR-3.3** Any override immediately re-ranks the visible list — no reload, no lag beyond normal API latency.

### FR-4 — District Guides
- **FR-4.1** Each priority district has an editorial guide combining its `personality_summary`, day/night character, and moment `fits`, personalised with the user's own taste overlay ("Northern Quarter, tuned for you").
- **FR-4.2** District guides must visually and textually communicate distinct personality — this is a hard requirement, not a nice-to-have, since the whole product's value depends on districts feeling genuinely different (see section 9, districts researched to date).

### FR-5 — Venue Detail
- **FR-5.1** Every venue card must explain *why* it's being suggested for this specific moment and context, not just show generic listing info (rating, hours, photos).
- **FR-5.2** Venue detail must display category, vibe tags, spend tier, and (if available) a booking link — but not expose internal scoring numbers, tier labels, or `source_confidence` to end users; those are internal-only fields.

### FR-6 — Feedback Loop
- **FR-6.1** Lightweight actions (save, dismiss, "not for [moment]") must be available from both the map view and venue detail.
- **FR-6.2** Feedback actions adjust the user's taste vector over time (see section 8 for how weighting should evolve — v1 can start with simple rule-based nudges rather than a learned model).
- **FR-6.3** This is the *implicit* half of profile refinement. The *explicit* half is FR-1.2's always-available taste-tile tree — a person can either let usage quietly sharpen their profile, or deliberately go refine it, and both should feed the same taste vector rather than being treated as separate systems.

### FR-7 — Access & Subscription (revised — no vetting)
- **FR-7.1** New users get immediate access on successful subscription payment — no waitlist, no application, no manual or automated "review" step of any kind.
- **FR-7.2** Subscription is a single tier at **£14.99/month**, billed directly (no free trial period assumed unless decided separately — flag as an open question, not a default).
- **FR-7.3** Access is restricted to UK-based users. Exact verification mechanism is still to be decided (candidates: App Store territory restriction if UK-only distribution, billing/payment country check, or both) — this needs its own implementation decision, not a default assumption.
- **FR-7.4** No account should be able to downgrade to a "free" degraded experience — access is binary (subscribed-and-verified-UK, or not).

### FR-8 — Admin / Curation Tooling
- **FR-8.1** Internal tooling (does not need to be public-facing) to add, edit, and tier venues, and to edit district editorial content, without a code deploy.
- **FR-8.2** Every venue record must retain `source_confidence` and free-text `notes` for internal curation review — these fields are essential given venue data starts LLM/research-assisted and needs human sign-off (see section 9).
- **FR-8.3** Tooling should support bulk review by district, since curation happens district-by-district (established working pattern — see section 9).

### FR-9 — Scoring & Tiering Logic
- **FR-9.1** Scoring combines moment fit, weather fit, time fit, and spend match, per the function in section 8.
- **FR-9.2** Texture-tier venues receive a deprioritisation penalty in ranking, except for moments in a configurable "protected" set (v1: `group` only).
- **FR-9.3** Weights must be configurable without a code change ideally (config file at minimum, admin UI at best) since they will need tuning per moment as real usage data comes in.

---

## 5. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Performance:** map/list re-ranking on context change must complete in under 300ms perceived latency (client-side scoring against a cached venue set is sufficient at this scale — no need for a heavy backend round-trip per toggle). |
| NFR-2 | **Privacy:** home anchor, taste profile, and history are sensitive personal data (spending habits, movement patterns of high-net-worth individuals). Data must be encrypted at rest, access-logged, and never sold or shared with venues/third parties. |
| NFR-3 | **Discretion:** given the target audience (P1 persona in particular — client entertaining, some users may be recognisable individuals), the product must never expose one member's activity to another, and should avoid any social/feed feature that could leak presence or booking information. |
| NFR-4 | **Reliability:** the predictive map is the core value proposition; it must degrade gracefully (cached last-good recommendations) rather than show an empty state if the scoring service or weather API is unavailable. |
| NFR-5 | **Accessibility:** standard mobile accessibility (dynamic type, screen reader labels, sufficient contrast) — a luxury product should not read as an accessibility afterthought. |
| NFR-6 | **Scalability:** v1 scale is small by design (curated membership, five districts) — architecture should be simple (see section 10) and not over-engineered for a scale the product may never reach. |

---

## 6. Business & Monetisation Requirements

- **BR-1 (revised)** Single subscription tier, **£14.99/month, UK-only**. This is a deliberately accessible price, not a wealth filter — it's low enough that anyone genuinely interested in the curation will subscribe without hesitation, high enough (and gated, with no free tier) to screen out idle downloaders who'd never engage with it. Exclusivity is carried entirely by the curation itself (P2, FR-9) — marketing and product copy should never imply the *price* signals status or wealth, since that claim doesn't hold up at this price point and would read as hollow to a discerning audience.
- **BR-2** No in-app advertising or sponsored placement, ever (P5). This is a hard constraint on future monetisation ideas, not just a v1 decision.
- **BR-3** Venue partnerships (e.g. priority booking for members) are permitted and encouraged as a member benefit, but must never influence ranking or inclusion — curation integrity is the product's core asset.
- **BR-4** Consider whether a referral mechanic (member-invites-member, in the spirit of a private members' club nomination) is part of the growth model — if so, it needs its own requirements pass before build; flagged here as a decision, not yet specified.

---

## 7. Data Model

Carried over from the original spec (unchanged) — see Appendix A for full schema detail. Summary:

- **User**: home anchor, travel radius, taste vector, per-moment sub-profiles (taste override, spend band, party size, time windows), calibration anchors, history.
- **Venue**: name, location, district, category, vibe tags, moment fit scores, spend tier, best time windows, weather fit, capacity type, `tier` (signature/texture), `source_confidence`, free-text `notes`.
- **District**: name, personality summary, day/night character, moment `fits`.

---

## 8. Scoring Function (Reference)

```
score(venue, context) =
    w1 * moment_fit
  + w2 * weather_fit
  + w3 * time_fit
  − w4 * spend_mismatch_penalty
  − w5 * texture_penalty (unless moment is in the protected set)
```

Default weights and full implementation: see `scoring.js` in the server scaffold. Weights are intentionally hand-tuned for v1; do not attempt a learned ranking model until there is real usage/feedback data (FR-6) to train against.

---

## 9. Content & Curation Status

Curation is being done district-by-district: research real venues, tag against the schema, human sense-check, lock in. Status as of this document:

| District | Signature venues | Texture venues | Status |
|---|---|---|---|
| Northern Quarter | 13 | 0 | Confirmed |
| Altrincham | 10 | 1 (Jardim Rodizio Grill*) | Confirmed |
| Hale | 8 | 1 (Piccolino Hale) | Confirmed |
| Knutsford | 5 | 2 (Piccolino Knutsford, King Street Kitchen) | Confirmed |
| Ancoats | 3 | 0 | Placeholder — needs full research pass |

*Jardim Rodizio Grill is tagged Altrincham in the current dataset — verify district assignment during the next data review, as it may be more accurately placed elsewhere.

Wellness-category venues (gyms, yoga/pilates, galleries, cinemas, parks) have an initial pass across all five districts but haven't yet had the same district-by-district depth as the restaurant/bar categories — recommended next step before wider build-out.

---

## 10. Technical Requirements (v1 Architecture)

- **Backend:** Node/Express (see `curia-server` scaffold), serving venue/district data and the scoring endpoint. Simple enough to run on Replit for v1; re-evaluate hosting once member numbers or admin tooling complexity grow.
- **Frontend:** React, consuming the backend API. Prototype exists as a standalone artifact; next step is wiring it to the live API (`/api/recommendations`, `/api/districts`) rather than scoring client-side.
- **Weather:** live weather API (e.g. Open-Meteo — free, no key required) rather than the manual toggle used in the prototype.
- **Auth/membership:** not yet built — needs a design pass covering subscription billing + UK-residency verification (FR-7). No waitlist/application flow to build — that's now explicitly out of scope.
- **Admin tooling (FR-8):** not yet built. Could be a minimal internal-only screen (even a simple authenticated form over the same Express backend) rather than a separate system, given v1 scale.

---

## 11. Assumptions & Open Decisions

- ~~Exact subscription price point~~ — **decided: £14.99/month** (BR-1).
- ~~Whether onboarding "review" is cosmetic or real vetting~~ — **decided: no review of any kind** (FR-7.1). Access is subscription + UK residency only.
- **New:** exact UK-residency verification mechanism (FR-7.3) — App Store territory lock, payment/billing country check, or both — not yet decided.
- Referral/growth mechanic (BR-4) — undecided, needs its own requirements pass.
- Whether Ancoats gets folded more tightly into the Northern Quarter's "after-dark" personality or treated as fully distinct — current data (fine dining–leaning) suggests distinct, but worth confirming before finishing its curation pass.
- Geographic expansion beyond the five priority districts is explicitly out of scope for v1 (section 1) but will need its own prioritisation exercise later (candidates raised informally: Didsbury, Wilmslow, Alderley Edge, Prestbury).
