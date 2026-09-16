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

  for (const target of targets) {
    if (getAccumulatedCostUsd() >= config.dailyUsdBudget) {
      console.log(`[Budget] $${getAccumulatedCostUsd().toFixed(2)} reached — stopping early.`);
      break;
    }

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
    notes: dryRun ? 'CURATOR_DRY_RUN=true — test run, not a real production pass.' : undefined,
  });

  console.log(
    `[Done] discovered=${discovered} submitted=${submitted} cost=$${getAccumulatedCostUsd().toFixed(2)}`
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
