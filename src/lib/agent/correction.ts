import type { LiveRuleFinding, LiveVerification, RevisionPlan, CorrectionRun } from "./schemas";
import { RevisionPlanSchema } from "./schemas";

/** Metadata mismatches need investigation, not an image regeneration. */
export function actionableViolations(verification: LiveVerification): LiveRuleFinding[] {
  return verification.findings.filter((f) => f.status === "REVISE" &&
    f.verification_method !== "Human review required" && f.rule_id !== "system:dimensions" &&
    f.evidence.some((e) => e.trim().length > 0) && Boolean(f.suggested_correction?.trim()) &&
    !/cannot (verify|confirm|determine)|uncertain|insufficient|unverified|unsupported/i.test(`${f.explanation} ${f.evidence.join(" ")}`));
}

export function validateRevisionPlan(raw: unknown, verification: LiveVerification): RevisionPlan {
  const plan = RevisionPlanSchema.parse(raw);
  const eligible = actionableViolations(verification);
  const ids = new Set(plan.changes.map((c) => c.rule_id));
  const passing = verification.findings.filter((f) => f.status === "PASS");
  const preserved = new Set(plan.preserve.map((p) => p.rule_id));
  if (ids.size !== eligible.length || plan.changes.length !== eligible.length ||
    eligible.some((f) => !ids.has(f.rule_id)) || plan.changes.some((c) => !eligible.some((f) => f.rule_id === c.rule_id)) ||
    preserved.size !== plan.preserve.length || passing.some((f) => !preserved.has(f.rule_id)) ||
    plan.preserve.some((p) => !passing.some((f) => f.rule_id === p.rule_id))) throw new Error("Revision plan rule coverage is invalid");
  return plan;
}

/** A downgrade to uncertainty is not a correction; no new violation or lost PASS is improvement. */
export function compareVerifications(previous: LiveVerification, next: LiveVerification) {
  const before = actionableViolations(previous);
  const after = actionableViolations(next);
  const correctedRuleIds = before.filter((f) => next.findings.some((n) => n.rule_id === f.rule_id && n.status === "PASS")).map((f) => f.rule_id);
  const regression = previous.findings.some((f) => f.status === "PASS" && !next.findings.some((n) => n.rule_id === f.rule_id && n.status === "PASS"));
  const newViolation = next.findings.some((f) => f.status === "REVISE" && !previous.findings.some((p) => p.rule_id === f.rule_id && p.status === "REVISE"));
  return { correctedRuleIds, remainingRuleIds: after.map((f) => f.rule_id),
    improved: correctedRuleIds.length > 0 && after.length < before.length && !regression && !newViolation };
}

export function latestRunAsset(run: CorrectionRun) { return run.attempts.filter((a) => a.asset).at(-1)?.asset ?? run.original; }
export function latestRunVerification(run: CorrectionRun) {
  const last = run.attempts.filter((a) => a.asset).at(-1);
  return last ? last.verification : run.originalVerification;
}

/** Downloads exclude generator prompts; image bytes and evidence are preserved. */
export function correctionReport(run: CorrectionRun, humanApproval: "pending" | "approved" | "rejected") {
  const cleanAsset = (asset: CorrectionRun["original"]) => {
    if (!asset) return null;
    const { prompt: _prompt, ...safe } = asset;
    return safe;
  };
  return { ...run, original: cleanAsset(run.original), finalImage: cleanAsset(latestRunAsset(run)),
    brandRules: run.originalVerification?.analysis.verification_rules ?? run.original?.metadata.analysis?.verification_rules ?? [],
    attempts: run.attempts.map((a) => ({ ...a, asset: cleanAsset(a.asset) })),
    finalVerification: latestRunVerification(run), humanApproval, humanApprovalIsSeparateFromVerification: true };
}