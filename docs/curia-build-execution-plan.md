# Curia — Build Execution Plan (v2 attempt)

**Status:** drafted 2026-07-30 by the orchestrating agent, from `CLAUDE.md` and the Claude Design handoff bundle, in the absence of a pre-existing plan. Treat the milestone sequence as a working plan — adjust it as we learn things, not a fixed contract.

## 1. Purpose & scope

Take the Curia Expo app from an empty scaffold to a working v1 covering onboarding, the predictive map/list, district guides, venue detail, moments & journeys, profile/saved, and the subscription gate. Admin curation tooling is sequenced last — it's a separate surface and can slip without blocking the member-facing app, since curation can happen by hand-editing `/docs/data/*.json` until it exists.

## 2. Governing documents

Read in this order before any work: `CLAUDE.md` (rules, resolved decisions, open gaps — the arbiter of any conflict) → `docs/curia-product-spec.md` and `docs/curia-requirements.md` (background detail, partially superseded per `CLAUDE.md`) → `docs/curia-onboarding-taxonomy.md` (superseded onboarding model — kept for reference only, do not build against it) → `docs/curia-DESIGN.md` (superseded design tokens — `CLAUDE.md`'s tokens section governs) → `docs/data/*.json` (real seed data transcribed from the prototype — use it, don't invent fixtures).

## 3. Sequencing principles

- Design system and data/schema come before any screen work — screens consume real types and real tokens from day one.
- The scoring engine is a pure, unit-tested module built before any screen renders ranked results, so Map and List can share one implementation (Hard rule 5).
- If a later milestone reveals the schema or design system was wrong, stop and fix it there — don't patch around it in the screen.
- Every milestone ends with a typecheck pass and a scoped commit before the next milestone starts.
- Nothing in `CLAUDE.md`'s "Still genuinely open" list gets silently resolved by a subagent — flag back to the orchestrator instead.

## 4. Subagent roster

Defined in `.claude/agents/`. Each owns a surface and enforces `CLAUDE.md` within it; none make product decisions — anything not already specified gets flagged back to the orchestrator, not guessed.

| Subagent | Owns | Key constraints it must enforce |
|---|---|---|
| `curia-onboarding` | Auth screens, onboarding flow (Do/Drink/Eat/You), subscription gate | Tile-grid model only, 3-tile minimum with no "N/3" counter (Hard rule 7); gate sits after onboarding, before Map/List (Hard rule 4) |
| `curia-matchmaking` | Scoring/ranking pure module + tests, matchmaking contract types | Hard filters never become soft weights (Hard rule 3); Map/List consume one shared result set (Hard rule 5) |
| `curia-map` | expo-router Map tab, abstract line/dot map render, context strip, mood quick-filter sheet, district zoom/grouping | Grouped labels are zoom-only, never a detail page (Hard rule 6); 3-tab bar only (Hard rule 9) |
| `curia-list` | List tab, radius control, ranked rows | Must render the exact same ranked set as Map, same session |
| `curia-moments-journeys` | Moments tab, Journey detail, district guide, venue detail | No internal fields (`tier`, `source_confidence`, raw scores) ever rendered (Hard rule 8); brand voice in every string |
| `curia-profile` | Profile, Saved places, Notifications, avatar emblem entry point | Profile/Saved reached via avatar, never added as a 4th tab (Hard rule 9) |
| `curia-admin` | Minimal authenticated CRUD over venues/districts/moments/journeys, seeded from `/docs/data/*.json` | Never seed chain/fast-food venues (Hard rule 1); internal fields editable here but never exposed to the member app |
| `curia-qa` | Adversarial review of every other subagent's output before it's considered done | Checks against every Hard rule in `CLAUDE.md`, not just "does it typecheck" |

## 5. Cross-cutting rules for every subagent

- Re-read `CLAUDE.md` at the start of every task, not just once per session.
- Never touch the "Still genuinely open" list's items — build around them and flag if a task can't proceed without a decision (Mapbox/Stripe keys, UK-residency check, referral mechanic, onboarding vetting).
- Small, scoped commits per `CLAUDE.md`'s "How to work in this repo."

## 6. Milestone sequence

| # | Milestone | Primary subagent | Depends on | Exit criteria |
|---|---|---|---|---|
| M0 | Project scaffold, docs, CLAUDE.md, design import | *(done — orchestrator)* | — | Expo project builds; docs + CLAUDE.md committed |
| M1 | Design system: tokens + primitives + nav shell | *(done — orchestrator)* | M0 | Theme module + Card/Button/ContextStrip/Tag/EmblemButton render; 3-tab + stack nav shell wired |
| M2 | Data layer: types, seed data loader | *(done — orchestrator)* | M0 | Typed models for User/Venue/District/DistrictGroup/Moment/Journey; `/docs/data/*.json` loads through a typed client/mock |
| M3 | Scoring engine | `curia-matchmaking` | M2 | Pure module passes unit tests covering every hard filter + weighted signal |
| M4 | Onboarding + subscription gate | `curia-onboarding` | M1, M2 | Do/Drink/Eat/You capture, gated correctly; subscription gate blocks Map/List until subscribed |
| M5 | Map + List | `curia-map`, `curia-list` | M1, M3, M4 | Both render the same ranked set from M3; context strip + mood sheet live; toggle instant |
| M6 | Moments, Journeys, district guide, venue detail | `curia-moments-journeys` | M5 | Editorial content distinct per district; no internal fields leaked |
| M7 | Profile, Saved, Notifications | `curia-profile` | M4 | Reachable via avatar emblem; edit-preferences loop back into onboarding screens |
| M8 | Admin curation tooling | `curia-admin` | M2 | Minimal authenticated CRUD over venues/districts/moments/journeys |
| M9 | QA pass | `curia-qa` | all above | Every Hard rule spot-checked against the running app, not just the code |

Status updates go to the user after each milestone completes, not after every sub-step within one.
