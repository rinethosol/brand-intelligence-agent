import { MAX_CORRECTION_ITERATIONS, type CorrectionLoopInput, type CorrectionRun, type GeneratedCreative, type GenerateCreativeInput, type LiveVerification, type RevisionPlan } from "./schemas";
import { actionableViolations, compareVerifications, validateRevisionPlan } from "./correction";
import { validateVerificationInput, inspectOriginalPng } from "./creative-verification";

export type CorrectionProviders = {
  generate: (input: GenerateCreativeInput, revision?: { plan: RevisionPlan; previous: GeneratedCreative; attempt: number }) => Promise<GeneratedCreative>;
  verify: (input: { asset: GeneratedCreative; analysis: CorrectionLoopInput["analysis"] }) => Promise<LiveVerification>;
  plan: (input: { asset: GeneratedCreative; verification: LiveVerification }) => Promise<{ plan: RevisionPlan; responseId: string; plannedAt: string }>;
};

async function confirmProvenance(asset: GeneratedCreative, verification: LiveVerification) {
  const png = inspectOriginalPng(asset.imageUrl);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", png.bytes)), (b) => b.toString(16).padStart(2,"0")).join("");
  if (verification.assetId !== asset.id || verification.imageSha256 !== hash || verification.model !== "muse-spark-1.3") throw new Error("Verification provenance mismatch");
}

/** Sequential calls reuse the same adapters as generateCreative / verifyCreative, never RPC stubs. */
export async function executeCorrectionLoop(input: CorrectionLoopInput, providers: CorrectionProviders): Promise<CorrectionRun> {
  const run: CorrectionRun = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), completedAt: "", original: null,
    originalVerification: null, attempts: [], events: [], finalStatus: "NEEDS_REVIEW", stopReason: "api_failure", error: null,
    label: "original" in input ? input.original.metadata.profile.name : input.generation.profile.name };
  const event = (stage: CorrectionRun["events"][number]["stage"], message: string, attempt = 0, model: string | null = null, ruleIds: string[] = []) =>
    run.events.push({ id: crypto.randomUUID(), at: new Date().toISOString(), stage, message, attempt, model, ruleIds });
  let stage = "Initial generation";
  try {
    run.original = "original" in input ? structuredClone(input.original) : await providers.generate({ ...input.generation, analysis: input.analysis });
    event("generate", "Original retained without modification", 0, run.original.metadata.model);
    validateVerificationInput({ asset: run.original, analysis: input.analysis });
    stage = "Original verification";
    let currentAsset = run.original;
    let current = await providers.verify({ asset: currentAsset, analysis: input.analysis });
    await confirmProvenance(currentAsset, current);
    run.originalVerification = current;
    run.finalStatus = current.overall;
    event("verify", `Original: ${current.overall}`, 0, current.model);
    for (let attempt = 1; attempt <= MAX_CORRECTION_ITERATIONS; attempt++) {
      const violations = actionableViolations(current);
      event("identify", `${violations.length} actionable violations`, attempt - 1, null, violations.map((f) => f.rule_id));
      if (!violations.length) { run.stopReason = "no_actionable_violations"; break; }
      stage = "Revision planning";
      const planned = await providers.plan({ asset: currentAsset, verification: current });
      const plan = validateRevisionPlan(planned.plan, current);
      event("revise", plan.rationale, attempt, "muse-spark-1.3", plan.changes.map((c) => c.rule_id));
      const record: CorrectionRun["attempts"][number] = { number: attempt, plan, planResponseId: planned.responseId, plannedAt: planned.plannedAt,
        previousAssetId: currentAsset.id, mode: "regeneration", asset: null, verification: null, correctedRuleIds: [], remainingRuleIds: violations.map((f) => f.rule_id), improved: false, error: null };
      run.attempts.push(record);
      stage = "Corrected image generation";
      const generated = await providers.generate({ profile: run.original.metadata.profile, brief: run.original.metadata.brief, analysis: input.analysis }, { plan, previous: currentAsset, attempt });
      if (generated.id === run.original.id || run.attempts.some((a) => a.asset?.id === generated.id) || generated.metadata.model !== "muse-image-1.0") throw new Error("Image provenance mismatch");
      record.asset = generated;
      run.finalStatus = "NEEDS_REVIEW"; // A generated but uninspected image can never inherit a verdict.
      event("generate", "Targeted regeneration completed (not direct image editing)", attempt, generated.metadata.model, plan.changes.map((c) => c.rule_id));
      stage = "Independent reverification";
      const verified = await providers.verify({ asset: generated, analysis: input.analysis });
      await confirmProvenance(generated, verified);
      record.verification = verified;
      Object.assign(record, compareVerifications(current, verified));
      run.finalStatus = verified.overall;
      event("reverify", `${verified.overall} · ${record.correctedRuleIds.length} violations resolved to PASS`, attempt, verified.model, record.remainingRuleIds);
      current = verified; currentAsset = generated;
      if (!record.improved) { run.stopReason = "no_improvement"; break; }
      if (!actionableViolations(current).length) { run.stopReason = "no_actionable_violations"; break; }
      run.stopReason = "maximum_attempts";
    }
  } catch {
    // Never serialize provider bodies, exception messages or keys into history.
    run.error = `${stage} failed. The run stopped safely; preserved images and completed findings remain available.`;
    const last = run.attempts.at(-1); if (last) last.error = run.error;
    run.stopReason = "api_failure";
  }
  run.completedAt = new Date().toISOString();
  event("report", `${run.finalStatus} · ${run.stopReason}${run.error ? " · " + run.error : ""}`, run.attempts.length);
  return run;
}