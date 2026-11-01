import { afterEach, describe, expect, it, vi } from "vitest";
import { demoProfile, demoBrief } from "@/lib/agent/demo-data";
import { type VerifyCreativeInput, type VisualRuleFinding } from "@/lib/agent/schemas";
import { aggregateVerification, deterministicFindings, parseVisualVerification, inspectOriginalPng } from "@/lib/agent/creative-verification";
import { verifyCreativeWithMeta } from "@/lib/agent/providers.server";

const imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XsAAAAASUVORK5CYII=";
const rule = { id: "scene", criterion: "Scene", expected_result: "Realistic scenery", verification_method: "Visual inspection", source_guideline: "Real landscapes, no fantasy scenery" };
const analysis = { brand_name: demoProfile.name, brand_personality: demoProfile.personality, approved_colors: demoProfile.colors, prohibited_elements: demoProfile.forbiddenElements, verification_rules: [rule] };
const input: VerifyCreativeInput = { analysis, asset: { id: "original", briefId: demoBrief.id, iteration: 1, imageUrl, prompt: "GENERATOR PROMPT MUST NOT BE SENT", source: "live", metadata: { model: "muse-image-1.0", endpoint: "https://api.meta.ai/v1/images/generations", created: 1784584435, completedAt: "2026-11-01T21:00:00Z", requestedSize: "1024x1024", width: 1, height: 1, outputFormat: "png", profile: demoProfile, brief: demoBrief, analysis, verificationStatus: "NEEDS_REVIEW", logoStatus: "requires_verification_or_post_processing", textStatus: "requires_verification_or_post_processing" } } };
const finding: VisualRuleFinding = { rule_id: rule.id, criterion: rule.criterion, status: "PASS", evidence: ["Trees and a forest path visible in the center; no floating fantasy objects."], explanation: "The visible scene is realistic.", verification_method: "Meta image understanding", suggested_correction: null };
const body = (findings = [finding]) => ({ findings, observed_text: ["Weather-ready. City-ready."], image_observations: ["Forest scene occupies the center."] });
const envelope = (value: unknown) => ({ id: "verification-response", status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Independent visual verification (mocked contract, not live evidence)", () => {
  it("sends exact original PNG to an independent Muse Spark invocation, not generator prompt", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "verification-test-key"); const mock = vi.fn().mockResolvedValue(Response.json(envelope(body()))); vi.stubGlobal("fetch", mock);
    const result = await verifyCreativeWithMeta(input);
    const call = mock.mock.calls[0]; if (!call) throw new Error("Expected request");
    const sent = JSON.parse(call[1].body);
    expect(call[0]).toBe("https://api.meta.ai/v1/responses"); expect(sent.model).toBe("muse-spark-1.3");
    expect(sent.input[0].content[1]).toEqual({ type: "input_image", image_url: imageUrl });
    expect(call[1].body).not.toContain(input.asset.prompt);
    expect(result.assetId).toBe("original"); expect(result.imageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(result)).not.toContain("verification-test-key"); expect(result.overall).toBe("NEEDS_REVIEW");
  });
  it("accepts complete matching rule IDs", () => { expect(parseVisualVerification(body(),input).findings[0]?.rule_id).toBe("scene"); });
  it.each([[{ ...finding, rule_id: "unknown" }], [finding,finding], []])("rejects unknown, duplicate or missing rule IDs", (findings) => { expect(() => parseVisualVerification(body(findings),input)).toThrow(); });
  it("does not manufacture evidence for an empty PASS", () => {
    const f = parseVisualVerification(body([{ ...finding, evidence: [] }]),input).findings[0];
    expect(f?.status).toBe("NEEDS_REVIEW"); expect(f?.evidence).toEqual([]);
  });
  it("converts uncertain apparent passing evidence to review", () => { expect(parseVisualVerification(body([{ ...finding, evidence: ["Cannot verify scenery from the image"] }]),input).findings[0]?.status).toBe("NEEDS_REVIEW"); });
  it.each(["Logo position", "Exact HEX #1F3B2D", "Exact typography", "Factual product claims"])("never certifies unsupported %s from vision", (criterion) => {
    const changed = { ...input, analysis: { ...analysis, verification_rules: [{ ...rule, criterion }] } };
    expect(parseVisualVerification(body([{ ...finding, criterion }]),changed).findings[0]?.status).toBe("NEEDS_REVIEW");
  });
  it("requires actionable correction for REVISE", () => { expect(parseVisualVerification(body([{ ...finding, status: "REVISE" }]),input).findings[0]?.status).toBe("NEEDS_REVIEW"); });
  it("aggregates concrete PASS/REVISE/NEEDS_REVIEW without treating empty coverage as PASS", () => {
    expect(aggregateVerification([{ status: "PASS" }])).toBe("PASS");
    expect(aggregateVerification([{ status: "PASS" },{ status: "NEEDS_REVIEW" }])).toBe("NEEDS_REVIEW");
    expect(aggregateVerification([{ status: "NEEDS_REVIEW" },{ status: "REVISE" }])).toBe("REVISE");
    expect(aggregateVerification([])).toBe("NEEDS_REVIEW");
  });
  it("inspects bytes and dimensions rather than trusting metadata", () => {
    expect(inspectOriginalPng(imageUrl).width).toBe(1);
    expect(() => inspectOriginalPng("data:image/png;base64,bm90IGFuIGltYWdl")).toThrow();
    const changed = { ...input, asset: { ...input.asset, metadata: { ...input.asset.metadata, width: 2 } } };
    expect(deterministicFindings(changed).find((f) => f.rule_id === "system:dimensions")?.status).toBe("REVISE");
  });
  it("checks required aspect ratio from actual header", () => {
    const changed = { ...input, asset: { ...input.asset, metadata: { ...input.asset.metadata, brief: { ...demoBrief, format: "instagram_story" as const } } } };
    const bytes = inspectOriginalPng(imageUrl).bytes;
    new DataView(bytes.buffer).setUint32(16,1600); new DataView(bytes.buffer).setUint32(20,1600);
    changed.asset.imageUrl = "data:image/png;base64," + btoa(String.fromCharCode(...bytes));
    expect(deterministicFindings(changed).find((f) => f.rule_id === "system:aspect")?.status).toBe("REVISE");
  });
  it.each([401,403,429,500])("does not retry model failure HTTP %i", async (status) => {
    vi.stubEnv("META_MODEL_API_KEY", "verification-test-key"); const mock = vi.fn().mockResolvedValue(new Response("private",{status})); vi.stubGlobal("fetch",mock);
    await expect(verifyCreativeWithMeta(input)).rejects.toThrow(/Meta/); expect(mock).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed response and fabricated output fields", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "verification-test-key"); vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(envelope({ ...body(), fabricated: "claim" }))));
    await expect(verifyCreativeWithMeta(input)).rejects.toMatchObject({code:"invalid_response"});
  });
  it("requires configured credentials", async () => {
    vi.stubEnv("META_MODEL_API_KEY",undefined); const mock=vi.fn(); vi.stubGlobal("fetch",mock);
    await expect(verifyCreativeWithMeta(input)).rejects.toMatchObject({code:"not_configured"}); expect(mock).not.toHaveBeenCalled();
  });
});