import { describe, expect, it, vi } from "vitest";
import { demoBrief, demoProfile } from "@/lib/agent/demo-data";
import { buildControlledOriginal, ControlledOriginalError, isControlledOriginal, assetSourceLabel } from "@/lib/agent/controlled-original";
import { GeneratedCreativeSchema, type GeneratedCreative, type LiveVerification } from "@/lib/agent/schemas";
import { executeCorrectionLoop } from "@/lib/agent/correction.server";
import { correctionReport } from "@/lib/agent/correction";
import { inspectOriginalPng, validateVerificationInput } from "@/lib/agent/creative-verification";

// 256 × 256 solid-colour PNG fixture (no bottle; validation only).
const B64 = "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAACwElEQVR4nO3TIQEAIADAMCAImkz0D0IMxLcEN5/7ngFV63cA/GQA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQZgDQDkGYA0gxAmgFIMwBpBiDNAKQ96RICoOyVJk0AAAAASUVORK5CYII=";
const imageUrl = `data:image/png;base64,${B64}`;
const byteLength = atob(B64).length;
const analysis = { brand_name: demoProfile.name, brand_personality: demoProfile.personality, approved_colors: demoProfile.colors, prohibited_elements: demoProfile.forbiddenElements,
  verification_rules: [{ id: "a", criterion: "a", expected_result: "No fantasy scenery", verification_method: "Visual inspection", source_guideline: "Real landscapes, no fantasy scenery" }] };
const brief = { ...demoBrief, format: "instagram_post" as const };
const base = { imageUrl, byteLength, mimeType: "image/png", profile: demoProfile, brief, analysis };

describe("Controlled test original upload", () => {
  it("accepts a valid PNG and records user-supplied provenance, never Muse", () => {
    const a = buildControlledOriginal(base);
    expect(a.metadata.model).toBe("user-supplied-controlled-test");
    expect(a.metadata.endpoint).toBe("none:user-upload");
    expect(a.metadata.sourceLabel).toBe("User-supplied controlled test image");
    expect(a.prompt).toBe(""); expect(a.metadata.usage).toBeUndefined();
    expect(a.metadata.width).toBe(256); expect(a.metadata.analysis).toEqual(analysis);
    expect(isControlledOriginal(a)).toBe(true);
    expect(assetSourceLabel(a)).toContain("not Muse-generated");
  });
  it.each([
    ["non-PNG type", { mimeType: "image/jpeg" }],
    ["over 8 MB", { byteLength: 8 * 1024 * 1024 + 1 }],
    ["missing analysis", { analysis: undefined }],
    ["wrong aspect ratio", { brief: { ...brief, format: "display_banner" as const } }],
    ["invalid PNG bytes", { imageUrl: "data:image/png;base64,AAAA", byteLength: 3 }],
  ])("rejects %s", (_n, patch) => { expect(() => buildControlledOriginal({ ...base, ...patch })).toThrow(ControlledOriginalError); });
  it("rejects too-small images", () => {
    const tiny = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XsAAAAASUVORK5CYII=";
    expect(() => buildControlledOriginal({ ...base, imageUrl: `data:image/png;base64,${tiny}`, byteLength: atob(tiny).length })).toThrow(/between 256/);
  });
  it("schema rejects mixed or disguised provenance", () => {
    const a = buildControlledOriginal(base);
    expect(GeneratedCreativeSchema.safeParse({ ...a, metadata: { ...a.metadata, endpoint: "https://api.meta.ai/v1/images/generations" } }).success).toBe(false);
    expect(GeneratedCreativeSchema.safeParse({ ...a, metadata: { ...a.metadata, sourceLabel: undefined } }).success).toBe(false);
    expect(GeneratedCreativeSchema.safeParse({ ...a, prompt: "fake prompt" }).success).toBe(false);
    expect(GeneratedCreativeSchema.safeParse({ ...a, iteration: 2 }).success).toBe(false);
  });
  it("passes the same verification input checks as generated originals", () => {
    const a = buildControlledOriginal(base);
    expect(validateVerificationInput({ asset: a, analysis }).width).toBe(256);
  });
  it("correction loop keeps the upload as original and only accepts Muse revisions", async () => {
    const original = buildControlledOriginal(base);
    const hash = async (x: GeneratedCreative) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", inspectOriginalPng(x.imageUrl).bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
    const v = async (asset: GeneratedCreative, status: "REVISE" | "PASS"): Promise<LiveVerification> => ({ id: crypto.randomUUID(), assetId: asset.id, source: "live", overall: status,
      findings: [{ rule_id: "a", criterion: "a", status, evidence: ["Visible object at center"], verification_method: "Meta image understanding", suggested_correction: status === "REVISE" ? "Remove the object" : null, explanation: "Observed", source_guideline: "g" }],
      imageObservations: ["x"], observedText: [], verifiedAt: "t", model: "muse-spark-1.3", endpoint: "https://api.meta.ai/v1/responses", method: "Independent image understanding plus deterministic PNG checks", imageSha256: await hash(asset), responseId: "r", analysis });
    let n = 0;
    const revision = (): GeneratedCreative => ({ ...structuredClone(original), id: "rev-1", iteration: 2, prompt: "p", metadata: { ...original.metadata, model: "muse-image-1.0", endpoint: "https://api.meta.ai/v1/images/generations", sourceLabel: undefined } });
    const providers = { generate: vi.fn(async () => revision()), verify: vi.fn(async ({ asset }: { asset: GeneratedCreative }) => v(asset, n++ === 0 ? "REVISE" : "PASS")),
      plan: vi.fn(async () => ({ plan: { changes: [{ rule_id: "a", instruction: "Remove the object" }], preserve: [], rationale: "Remove" }, responseId: "p", plannedAt: "t" })) };
    const run = await executeCorrectionLoop({ original, analysis }, providers);
    expect(run.original?.metadata.model).toBe("user-supplied-controlled-test");
    expect(run.original?.imageUrl).toBe(imageUrl);
    expect(run.attempts[0]?.asset?.metadata.model).toBe("muse-image-1.0");
    expect(run.finalStatus).toBe("PASS");
    const report = correctionReport(run, "pending");
    expect(report.original?.metadata.sourceLabel).toBe("User-supplied controlled test image");
    expect(report.humanApproval).toBe("pending");

    // A "revision" that claims to be user-supplied is rejected as a provenance mismatch.
    n = 0; providers.generate.mockImplementation(async () => ({ ...structuredClone(original), id: "rev-x", iteration: 2 }));
    const bad = await executeCorrectionLoop({ original, analysis }, providers);
    expect(bad.stopReason).toBe("api_failure"); expect(bad.attempts[0]?.asset).toBeNull();
  });
});

describe("Correction round limits (server-enforced from provenance)", () => {
  const hash = async (x: GeneratedCreative) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", inspectOriginalPng(x.imageUrl).bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
  const mk = async (asset: GeneratedCreative, statuses: ("REVISE" | "PASS")[]): Promise<LiveVerification> => ({ id: crypto.randomUUID(), assetId: asset.id, source: "live", overall: statuses.includes("REVISE") ? "REVISE" : "PASS",
    findings: statuses.map((status, i) => ({ rule_id: ["a", "b", "c", "d"][i]!, criterion: ["a", "b", "c", "d"][i]!, status, evidence: ["Visible object at center"], verification_method: "Meta image understanding" as const, suggested_correction: status === "REVISE" ? "Remove the object" : null, explanation: "Observed", source_guideline: "g" })),
    imageObservations: ["x"], observedText: [], verifiedAt: "t", model: "muse-spark-1.3", endpoint: "https://api.meta.ai/v1/responses", method: "Independent image understanding plus deterministic PNG checks", imageSha256: await hash(asset), responseId: "r", analysis: analysis4 });
  const analysis4 = { ...analysis, verification_rules: ["a", "b", "c", "d"].map((id) => ({ ...analysis.verification_rules[0]!, id, criterion: id })) };
  // Each round fixes exactly one rule: improvement continues, so only the round limit stops the loop.
  const seq: ("REVISE" | "PASS")[][] = [["REVISE", "REVISE", "REVISE", "REVISE"], ["PASS", "REVISE", "REVISE", "REVISE"], ["PASS", "PASS", "REVISE", "REVISE"], ["PASS", "PASS", "PASS", "REVISE"]];
  function providers(original: GeneratedCreative) {
    let i = 0;
    return { generate: vi.fn(async (_x: unknown, r?: { attempt: number }) => ({ ...structuredClone(original), id: `rev-${r?.attempt}`, iteration: (r?.attempt ?? 0) + 1, prompt: "p",
        metadata: { ...original.metadata, model: "muse-image-1.0" as const, endpoint: "https://api.meta.ai/v1/images/generations" as const, sourceLabel: undefined } })),
      verify: vi.fn(async ({ asset }: { asset: GeneratedCreative }) => mk(asset, seq[i++]!)),
      plan: vi.fn(async ({ verification }: { verification: LiveVerification }) => ({ plan: { changes: verification.findings.filter((f) => f.status === "REVISE").map((f) => ({ rule_id: f.rule_id, instruction: "Remove" })),
        preserve: verification.findings.filter((f) => f.status === "PASS").map((f) => ({ rule_id: f.rule_id, attribute: "Keep" })), rationale: "Fix" }, responseId: "p", plannedAt: "t" })) };
  }
  it("controlled test stops after exactly one round with violations preserved", async () => {
    const original = buildControlledOriginal({ ...base, analysis: analysis4 });
    const p = providers(original);
    const run = await executeCorrectionLoop({ original, analysis: analysis4 }, p);
    expect(run.maxAttempts).toBe(1);
    expect(run.attempts).toHaveLength(1);
    expect(p.generate).toHaveBeenCalledTimes(1);
    expect(p.verify).toHaveBeenCalledTimes(2);
    expect(run.stopReason).toBe("maximum_attempts");
    expect(run.finalStatus).toBe("REVISE");
    expect(run.attempts[0]?.remainingRuleIds).toEqual(["b", "c", "d"]);
    expect(run.events.some((e) => e.message.startsWith("Configured round limit: 1"))).toBe(true);
    expect(run.events.some((e) => e.message.startsWith("Round limit 1 reached; 3 actionable"))).toBe(true);
    const report = correctionReport(run, "pending");
    expect(report.maxAttempts).toBe(1); expect(report.stopReason).toBe("maximum_attempts"); expect(report.humanApproval).toBe("pending");
  });
  it("normal Muse-generated workflow keeps the three-round maximum", async () => {
    const controlled = buildControlledOriginal({ ...base, analysis: analysis4 });
    const original: GeneratedCreative = { ...controlled, prompt: "generator prompt", metadata: { ...controlled.metadata, model: "muse-image-1.0", endpoint: "https://api.meta.ai/v1/images/generations", sourceLabel: undefined } };
    const p = providers(original);
    const run = await executeCorrectionLoop({ original, analysis: analysis4 }, p);
    expect(run.maxAttempts).toBe(3);
    expect(run.attempts).toHaveLength(3);
    expect(p.generate).toHaveBeenCalledTimes(3);
    expect(run.stopReason).toBe("maximum_attempts");
    expect(run.events.some((e) => e.message.startsWith("Configured round limit: 3"))).toBe(true);
  });
});
