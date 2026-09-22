/**
 * Entrypoint for the 02:00 UK discovery cron (railway.json). Runs the full
 * 8-stage pipeline: Plan -> Discover -> Verify -> Copy -> Voice QA ->
 * Gate check -> Submit -> Audit. Gated by two independent, both-default-off
 * flags (config.ts): CURATOR_ENABLED must be true for this to do anything
 * at all, and CURATOR_DRY_RUN (default true) caps it to one real district
 * and a handful of candidates for local testing before either flag is
 * ever seriously considered for Railway.
 */
import { config } from './config.js';
import { getAccumulatedCostUsd, resetAccumulatedCost } from './anthropic.js';
import { planTargets, type PlannedTarget } from './pipeline/plan.js';
import { discoverForTarget, discoverNewDistrict } from './pipeline/discover.js';
import { verifyCandidate } from './pipeline/verify.js';
import { draftCopy } from './pipeline/copy.js';
import { runVoiceQa } from './pipeline/voice-qa.js';
import { runGateCheck } from './pipeline/gate-check.js';
import { submitCandidate } from './pipeline/submit.js';
import { runClosureAudit } from './pipeline/audit.js';
import { startWorkerRun, finishWorkerRun, insertDistrictCandidate } from './supabase.js';
import type { VenueCandidateDraft } from './types.js';

const AUDIT_SLICE_SIZE = 5;

async function processCandidate(
  runId: string,
  draft: VenueCandidateDraft
): Promise<'submitted' | 'rejected' | 'needs_new_type'> {
  if (draft.status === 'needs_new_type') {
    await submitCandidate(runId, draft);
    return 'needs_new_type';
  }

  const verify = await verifyCandidate(draft);
  if (!verify.passed) {
    return 'rejected';
  }

  if (!draft.description) {
    draft.description = await draftCopy(draft);
  }

  const voiceQa = await runVoiceQa(draft);
  draft.description = voiceQa.description;
  if (!voiceQa.passed) {
    return 'rejected';
  }

  const gate = await runGateCheck(draft);
  if (!gate.passesGate1) {
    return 'rejected';
  }
  draft.gate1Reasoning = gate.gate1Reasoning;
  draft.distinctivenessProposed = gate.distinctiveness;
  draft.distinctivenessReasoning = gate.distinctivenessReasoning;

  await submitCandidate(runId, draft);
  return 'submitted';
}

async function runOnce(): Promise<void> {
  resetAccumulatedCost();

  const dryRun = config.dryRun;
  const maxCandidates = dryRun ? config.dryRunCandidateCount : config.dailyCandidateTarget;

  let targets: PlannedTarget[];
  let market: string;
  if (dryRun) {
    market = `dry run — ${config.dryRunDistrict}`;
    targets = [{ districtId: config.dryRunDistrict, metro: 'cheshire' }];
  } else {
    const planned = await planTargets();
    market = planned.market;
    targets = planned.targets;
  }

  console.log(`[Plan] market="${market}", targets=${targets.map((t) => t.districtId).join(', ') || '(none)'}`);
  if (targets.length === 0) {
    console.log('Nothing to target this run — every phase clear.');
    return;
  }

  const runId = await startWorkerRun(market, targets.map((t) => t.districtId));

  let discovered = 0;
  let verified = 0;
  let copyPassed = 0;
  let submitted = 0;
  const perTargetBudget = Math.ceil(maxCandidates / targets.length);
  // A single target's failure (a malformed model response, a transient
  // network error) must never crash the whole run — found live 2026-09-22:
  // one bad JSON response from a single district was an UNCAUGHT throw,
  // which per main()'s own catch handler kills the process immediately,
  // skipping finishWorkerRun entirely. On a real unattended daily cron
  // across many districts, that means one flaky response = zero worker_runs
  // row and zero visibility into what actually happened, not just one
  // district's loss. Each target's own body is isolated so the rest of the
  // run keeps going and a partial-failure summary still gets recorded.
  const failedTargets: string[] = [];

  for (const target of targets) {
    if (getAccumulatedCostUsd() >= config.dailyUsdBudget) {
      console.log(`[Budget] $${getAccumulatedCostUsd().toFixed(2)} reached — stopping early.`);
      break;
    }

    try {
      if (target.isNewMetro) {
        const districtCandidate = await discoverNewDistrict(target);
        if (districtCandidate) {
          await insertDistrictCandidate(runId, districtCandidate);
          console.log(`[Discover] proposed new district "${districtCandidate.name}" for ${target.metro}`);
        }
        continue;
      }

      const drafts = await discoverForTarget(target, perTargetBudget);
      discovered += drafts.length;
      console.log(`[Discover] ${target.districtId}: ${drafts.length} candidates found`);

      for (const draft of drafts) {
        if (getAccumulatedCostUsd() >= config.dailyUsdBudget) break;
        const outcome = await processCandidate(runId, draft);
        if (outcome === 'submitted' || outcome === 'needs_new_type') {
          verified += 1;
          copyPassed += 1;
          submitted += 1;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Error] ${target.districtId} failed, continuing to the next target: ${message}`);
      failedTargets.push(target.districtId);
    }
  }

  const flaggedClosures = dryRun ? 0 : await runClosureAudit(runId, AUDIT_SLICE_SIZE);
  console.log(`[Audit] ${flaggedClosures} closure signals flagged`);

  await finishWorkerRun(runId, {
    market,
    districtsTargeted: targets.map((t) => t.districtId),
    candidatesDiscovered: discovered,
    verified,
    copyPassed,
    submittedForReview: submitted,
    apiCostUsd: getAccumulatedCostUsd(),
    notes: [
      dryRun ? 'CURATOR_DRY_RUN=true — test run, not a real production pass.' : null,
      failedTargets.length ? `Failed targets (see logs for the real error): ${failedTargets.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
  });

  console.log(
    `[Done] discovered=${discovered} submitted=${submitted} cost=$${getAccumulatedCostUsd().toFixed(2)}` +
      (failedTargets.length ? ` failed=${failedTargets.join(',')}` : '')
  );
}

async function main() {
  if (!config.curatorEnabled && !config.dryRun) {
    console.log('CURATOR_ENABLED=false and CURATOR_DRY_RUN=false — nothing to do. Set one to true.');
    return;
  }
  if (!config.curatorEnabled) {
    console.log('CURATOR_ENABLED=false — running in dry-run mode only regardless of CURATOR_DRY_RUN.');
  }
  await runOnce();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
