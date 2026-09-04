---
name: curia-suggestion-review
description: Daily scheduled review pass — independently re-verifies pending venue/district candidates, promotes confident ones straight to the real data, and queues anything genuinely uncertain (in git) for a human decision via Curia Command. Also applies decisions made there since the last run.
tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Bash, Artifact
model: inherit
---

**2026-09-03 rewrite, at explicit user report.** The original version of this job routed every promotion through a GitHub PR titled "Promote reviewed venues: YYYY-MM-DD," on the reasoning that a human merge was the one real safety checkpoint. In practice: it ran correctly every day from Sept 1–3, opened three real PRs, and every one of them sat unmerged — the user wasn't checking GitHub, so three days of fully-vetted work just piled up unseen until they asked "so what is my venue list at now?" and got told about a backlog they didn't know existed. The fix isn't more diligence from this job (it was already doing its job right); it's putting the human checkpoint somewhere the human actually looks. That's Curia Command (https://claude.ai/code/artifact/11c12924-6aad-4df1-8684-54f6920f6a7c), the admin dashboard built the same day. Read that context before assuming PRs are still how this works — they aren't.

**2026-09-04 correction, confirmed from a real run's session log.** The version of this job that wrote straight to Curia Command's database via the `Artifact` tool's `write_db` worked exactly once out of the times it mattered: `read_db` (checking for decisions) is fine unattended, but `write_db` triggers an interactive "Claude wants to edit this artifact's data" permission prompt that nobody is present to answer in this job's actual execution environment (a headless RemoteTrigger cloud session) — so every write silently never happened, including the day's own briefing. Confirmed directly from `get_run_log` on session_01KQaCpzGQfZsQASZNnSfDWK (2026-09-04), not guessed or assumed this time. **Fix: never call `Artifact({action: "write_db", ...})` from this job.** `read_db` is fine and still used (Step 1). New uncertain items and the daily briefing go to two git-tracked files instead (`docs/data/pending-review-queue.json`, `docs/data/daily-briefings.json`) — git writes have worked perfectly reliably every single day this job has run, so route through the mechanism that's actually proven, not the one that looked cleaner on paper. A human (or an interactive Claude Code session, which doesn't hit this wall) syncs new entries into Curia Command's real db during a normal check-in.

You run once a day, a couple of hours after `curia-research-daily`. Before anything else, read `CLAUDE.md` in full (What Curia is, Hard rules, Brand voice, Districts, Data model).

## Step 1 — apply decisions made since your last run

Curia Command has a `pending_review` collection for anything a prior run of this job sent for a human decision. Check it first, every run, even if you expect it to be empty:

```
Artifact({
  action: "read_db",
  url: "https://claude.ai/code/artifact/11c12924-6aad-4df1-8684-54f6920f6a7c",
  db_op: "query",
  collection: "pending_review",
  query: { where: [["status", "!=", "pending"]] }
})
```

For each **`approved`** item, apply its `payload` for real:
- `itemType: "add_venue"` → append `payload` (already shaped like a real `venues.json` entry) to `docs/data/venues.json`'s `venues` array. Re-check it against the current file first (duplicate names, valid `district`) — the approval was a green light on the *venue*, not a guarantee nothing else changed underneath it since it was proposed.
- `itemType: "remove_venue"` → remove the matching venue (by name) from `venues.json`, and check `moments`/`journeys` for any dangling reference the same way the closure audit below does.
- `itemType: "add_district"` → append `payload` to `docs/data/districts.json`'s `districts` array.

Don't try to delete the doc afterward (`write_db` is off-limits, see above) — leaving an applied `approved`/`denied` doc sitting in Curia Command's `pending_review` collection is harmless, the portal already renders decided items as dimmed/read-only rather than actionable. A human doing the periodic sync (below) can tidy those up if they want; it's not this job's problem to solve unattended.

For each **`denied`** item: find its origin entry in `venue-suggestions.json`/`district-suggestions.json` (if it came from one) and set `"status": "rejected"` with a note ("denied via Curia Command, DATE — see pending_review history"); if it has no origin entry (e.g. a closure candidate), just note the denial doesn't need any suggestions-queue bookkeeping. If it also has an entry in `docs/data/pending-review-queue.json` (this job's own git fallback, see Step 3), mark it there too (`status: "denied"`) so it isn't proposed again.

An empty result here is the normal, expected outcome on most days — it means nothing was waiting on the user, not that something went wrong. Move on to Step 2 either way.

If `read_db` itself isn't available in whatever environment this job actually runs in (distinct from `write_db`, which is confirmed unavailable — see the 2026-09-04 note above), say so plainly in your final message rather than silently skipping this step.

## Step 2 — read the new queue

- `docs/data/venue-suggestions.json` and `docs/data/district-suggestions.json` — your work queue. Only act on entries with `"status": "pending"` that you haven't already sent to `pending_review` (an entry can stay `pending` in the queue while also having a live `pending_review` doc — that's the "genuinely unsure, waiting on a human" state, not a bug; check whether a `pending_review` doc already exists for a candidate before creating a duplicate one).
- `docs/data/venues.json` and `docs/data/districts.json` — the real data you're promoting into. Read fully before touching anything.

**If there are zero actionable pending entries in either queue, skip straight to the closure audit below** — don't stop entirely just because the queue is empty.

## Independent re-verification (per pending entry, before deciding anything)

Don't just check that `researchNotes` sounds plausible — re-derive the important facts yourself:
1. **Hard rule 1, fresh eyes**: is this genuinely not a chain? If the footprint isn't obvious from the notes, do your own search rather than taking the prior agent's word for it.
2. **Duplicates, checked again**: against the real `venues.json`/`districts.json` array (by name), and against every other entry in the suggestions file regardless of status.
3. **Schema and reference integrity**: every required field present and well-typed (`district`/`metro` is a real existing id, `type` is a real uppercase venue-type string, `spend` is a valid `£`–`£££££` string, `bands` only contains `morning`/`afternoon`/`evening`/`late`).
4. **Coordinate sanity**: `lat`/`lon` actually fall within Manchester/Cheshire (roughly lat 53.0–53.6, lon -2.6–-2.0) — reject anything wildly outside that box as a likely research error.
5. **Brand voice**: does `reason` read like the app's actual copy (CLAUDE.md "Brand voice")? Light-touch rewrite if the substance is right but the phrasing is off; reject if you'd have to invent facts to fix it.

## Step 3 — decide each entry: three outcomes, not two

1. **Confident, real, passes everything above** → promote it directly: append to the real file (`venues.json`/`districts.json`), remove the entry from the suggestions queue. This re-verification *is* the safety check — the same rigor this job has always applied, still applied in full — so it no longer also needs a PR nobody was checking. Note it in today's briefing (Step 5).
2. **Confident it's bad** (clear chain, clear duplicate, can't independently confirm it exists at all) → set `"status": "rejected"` in the suggestions queue with `researchNotes` explaining why, specific enough that `curia-research-daily` won't re-suggest the same thing. Leave it in the file; don't delete rejected entries.
3. **Genuinely unsure** — ambiguous chain footprint after a real search, sourcing that's thin or conflicts, a borderline duplicate, anything you'd actually want a second opinion on rather than a coin flip — append it to `docs/data/pending-review-queue.json`'s `items` array instead of guessing either way (read the file first, preserve everything already there):

```json
{
  "itemType": "add_venue",                         // or "add_district" / "remove_venue"
  "status": "pending",
  "syncedToPortal": false,
  "proposedDate": "YYYY-MM-DD",
  "reason": "One real sentence: specifically why you're not confident enough to decide this yourself.",
  "researchNotes": "What you actually checked, and what stayed unclear after checking.",
  "payload": { "name": "...", "district": "...", "type": "...", "spend": "...", "lat": 0, "lon": 0, "base": 0, "bands": [], "reason": "..." }
}
```

Leave the suggestions-queue entry as `pending` (don't reject it — it's not rejected, it's waiting on a person) and don't promote it. `reason` is what the user reads to decide, so make it a real, specific reason — not "not sure," but the actual thing that's ambiguous. This gets synced into Curia Command's live Pending Review tab by a human or an interactive session (see "Syncing," below) — you're not writing directly to the portal, and that's fine.

Bias toward outcome 1 or 2 when you can honestly reach one — Pending Review exists for real uncertainty, not as a way to avoid making calls you're actually equipped to make.

## Closure audit (part of every run, even if the queue is empty)

Each run, spot-check a small rotating slice of the real, already-promoted venues in `docs/data/venues.json` — indices `[(dayOfYear * 5) % N .. +5)` (wrapping), where `N` is the array length, cycling through the whole database roughly every couple of weeks. For each venue in the slice, a quick web search for "[venue name] [district] closed OR permanently closed OR reviews 2026" is enough.

**Closures always go to Pending Review — never auto-remove, regardless of how confident you are.** Removing something real from live data is a different risk shape from adding a candidate (reversible-but-annoying vs. actually losing a real recommendation), so it always gets a human glance. Append to `docs/data/pending-review-queue.json` the same way as Step 3's outcome 3:

```json
{
  "itemType": "remove_venue",
  "status": "pending",
  "syncedToPortal": false,
  "proposedDate": "YYYY-MM-DD",
  "reason": "The specific signal you found (a closure announcement, a dead site, reviews saying it shut).",
  "researchNotes": "Sources checked, what each one showed.",
  "payload": { "name": "...", "district": "..." }
}
```

If nothing in the slice shows signs of closure, don't write anything just to have said something — silence here is the normal, healthy outcome.

## Step 4 — commit and push

If you promoted or rejected anything in Step 1 or Step 3 (i.e. there's a real diff to `venues.json`/`districts.json`/the suggestions files), commit it and push **straight to `master`** as one commit — no branch, no PR, no waiting. The human checkpoint now happens either implicitly (this job's own re-verification, for the confident calls) or explicitly (Curia Command, for the genuinely uncertain ones) — a PR that nobody was checking added a multi-day delay without adding any real safety on top of that.

## Step 5 — write today's briefing

This is the visibility mechanism now, replacing what a PR description used to do. Always write one, even on a quiet day. Append to `docs/data/daily-briefings.json`'s `entries` array (read first, preserve everything already there):

```json
{
  "agentType": "review",
  "date": "YYYY-MM-DD",
  "synced": false,
  "title": "One-line summary of today's run",
  "summary": "2-3 sentences: what you promoted, rejected, sent for review, and applied from prior decisions.",
  "items": [{ "label": "Venue or district name", "detail": "promoted / rejected — why / sent for review — why" }],
  "createdAt": "<ISO timestamp>"
}
```

## Step 6 — commit the git-tracked queue/briefing files too

If Step 3 or the closure audit added anything to `pending-review-queue.json`, or Step 5 added a briefing entry, include those files in the same commit as Step 4 (or a follow-up one if Step 4 had nothing to commit) and push straight to master, same as everything else this job writes.

## Syncing into Curia Command (not this job's problem — noted so nobody re-discovers this from scratch)

`pending-review-queue.json` and `daily-briefings.json` are the reliable source of truth; Curia Command's live `pending_review`/`briefings` collections are a display copy, kept current by a human or an interactive Claude Code session reading the two files and writing (`Artifact` `write_db`, which works fine from an interactive context — the permission prompt just needs an actual person present to answer it once) any entry still marked `syncedToPortal: false` / `synced: false`, then flipping that flag. This job should never attempt that sync itself.

## When you're done

Don't message the user proactively beyond the briefing you just wrote — that's the point of it existing. If you genuinely did nothing at all (empty queue, clean closure audit, nothing to apply from Pending Review), still write a short briefing saying so — an empty day should be visible as "checked, nothing to do," not silence that looks identical to "didn't run."
