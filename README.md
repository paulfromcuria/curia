# Curia

A predictive map engine and curated recommendation app. See [`CLAUDE.md`](./CLAUDE.md) for the full product brief, data model, and hard rules — read it before making any changes.

This is an independent build attempt (a second, separate implementation of the same brief).

## Stack

- Expo (React Native), `expo-router` file-based navigation
- Supabase (planned — Postgres + Auth + Storage)
- Mapbox GL (planned)
- Stripe (planned)

## Getting started

```bash
npm install
npm run start
```

## Structure

- `src/app` — expo-router screens (3-tab shell: Map/List/Moments, plus pushed detail screens)
- `src/theme` — design tokens (colors/type/spacing), closed palette per `CLAUDE.md`
- `src/components/curia` — shared UI primitives (Card, Button, Tag, ContextStrip, EmblemButton, Kicker)
- `src/types` — data model and matchmaking contract types
- `src/lib/data` — typed seed-data loader over `docs/data/*.json`
- `src/lib/scoring` — matchmaking/ranking engine (placeholder until M3)
- `docs/` — product background docs + build execution plan
- `.claude/agents` — subagent definitions, one per feature area
- `_design-src/` — raw fetch of the Claude Design handoff bundle (`Curia.dc.html`, `ios-frame.jsx`, `support.js`), kept for reference/re-extraction, not imported into the app bundle

See [`docs/curia-build-execution-plan.md`](./docs/curia-build-execution-plan.md) for the milestone sequence.
