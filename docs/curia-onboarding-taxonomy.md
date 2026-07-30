# Curia — Onboarding Taxonomy (Drink / Eat / Do)

Reference for building onboarding in the new project. **Scope note: this
document covers taste capture only** (what someone likes) — it supersedes
just the category-slider portion of the original spec's FR-1.1. It does
**not** replace or touch the moment library (the *when/why* someone is
using Curia) — that's a separate, still-active part of FR-1.1, detailed in
its own section below so this doc is a complete onboarding reference on its
own, not just half of one.

## Part A — Moments (the existing, unchanged model)

This is **not** a tile-tree — it's a flat, simple list, deliberately kept
lightweight since it's asked once per session-context rather than drilled
into like taste. Per `curia-requirements.md` FR-1.1 / FR-3.1:

- Client dinner
- Date night
- Big group
- Solo wind-down
- Wellness reset
- User can add a custom moment (free text)

Each moment gets its own **spend band** (FR-1.1) captured separately —
someone's client-dinner budget is not their solo-coffee budget. Each
selected moment should map to the `moment_fit` scores already present on
every venue in `curia-venues-export.json` (a 0–1 score per moment, e.g.
`{"client": 0.3, "date": 0.7, "group": 0.8}`) — **use those real scores
directly, don't re-derive or invent new ones per venue.**

This is a single-select-at-a-time control in normal use (FR-3.1: "switch
from date night to big group"), but **can be genuinely unset** — per revised
FR-2.1/FR-9, when no moment is active, ranking falls back to taste vector
+ time-of-day + weather rather than defaulting to a hardcoded moment.

## Part B — Taste tiles (Drink / Eat / Do)

### Structure: 3 levels

**Top-level bucket → Sub-type → Refinement chips (multi-select at every level)**

```
Drink
 ├─ Wine bars        → Curated/classic, Natural/social, Quiet & tucked-away
 ├─ Cocktail bars     → Speakeasy/dim, Rooftop, Polished & dressed-up
 ├─ Nightclubs        → Bottle service, DJs & house music, Late/afterhours
 └─ Jazz & live music → Intimate, Big-room/loud

Eat
 ├─ Fine dining       → Quiet & discreet, Chef's tasting menu,
 │                       Classic & formal, Modern & relaxed, Statement setting
 ├─ Casual dining     → Sharing plates, Family-style, Quick & unpretentious
 └─ Markets & halls   → Daytime social, Browsing/people-watching

Do
 ├─ Culture           → Art, History, Talks/events
 ├─ Wellness          → Yoga/Pilates, Boutique HIIT/fitness classes
 └─ Outdoors          → Parks & walking, Gardens
```

## Design principles (decided, don't re-litigate these)

1. **Additive, not forced single-path.** A person can tap into as many
   branches as feel relevant (both "wine bars" and "nightclubs" under Drink,
   for instance). Always show a clear "done, continue" exit at every depth —
   nobody should feel trapped drilling into a category they don't care about.

2. **Not time-boxed.** No "must complete in under 2 minutes" constraint. A
   short minimum path (home anchor, travel radius, one moment, spend band)
   unlocks real value immediately with neutral defaults filling any taste
   gaps. Full tile-tree depth is optional at first run and must remain
   revisitable later from a profile/settings surface — refinement is
   continuous, not a one-time gate.

3. **Chips map to real vibe tags, not brand names or cuisines.** Capture the
   *style* ("boutique HIIT", "quiet & discreet") not a specific brand
   ("Barry's Bootcamp") or cuisine ("Italian") — cuisine/brand is already
   determined by which real venues exist in a district. Each chip should
   correspond to an existing or lightly-extended vibe tag in the venue
   dataset (see `curia-venues-export.json`) so tile selections translate
   directly into scoring weight, not a separate taxonomy that needs mapping.

4. **Categories are allowed to be cross-cutting.** A venue like The
   Fitzgerald (cocktail bar with live jazz) can and should score well from
   both the "Cocktail bars" and "Jazz & live music" branches — don't force
   every venue into exactly one bucket.

5. **The "dissolve" interaction is the flagged build-risk.** Tile-morph
   transitions look right in a static mockup and commonly misbehave on
   device — rapid double-taps, interrupted mid-animation transitions,
   tiles landing in the wrong position. Explicitly test interrupting the
   animation mid-transition, not just the happy path, before calling this
   screen done.

## Worked example: Fine dining refinement chips

Multi-select, 5 chips, chosen because they map to real distinctions already
visible in the curated data (not cuisine-based):

- **Quiet & discreet** — client dinners, sensitive conversations
- **Chef's tasting menu** — the foodie/moment experience
- **Classic & formal** — white-tablecloth, landmark-building energy
- **Modern & relaxed** — contemporary, less stuffy
- **Statement setting** — historic building, view, a "wow" room

Use this same pattern (4-5 chips, multi-select, mapped to existing-or-lightly-
extended vibe tags) as the template for every other sub-type rather than
reinventing the approach per branch.
