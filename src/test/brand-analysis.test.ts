import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandAnalysisInputSchema } from "@/lib/agent/schemas";
import { demoProfile } from "@/lib/agent/demo-data";
import { analyzeBrandWithMeta } from "@/lib/agent/providers.server";
import { parseBrandAnalysis } from "@/lib/agent/brand-analysis";

const analysis = {
  brand_name: "Halden Outdoor", brand_personality: demoProfile.personality,
  approved_colors: demoProfile.colors, prohibited_elements: demoProfile.forbiddenElements,
  verification_rules: [{ id: "natural-light", criterion: "Lighting", expected_result: "Natural light only", verification_method: "Independent image inspection", source_guideline: "Natural light only" }],
};
const envelope = (text: string) => ({ id: "test-response", status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text }] }] });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Meta brand analysis (mocked contract tests, not live evidence)", () => {
  it("requires current brand fields and valid HEX colors", () => {
    expect(BrandAnalysisInputSchema.safeParse(demoProfile).success).toBe(true);
    for (const field of ["name", "description", "industry", "targetAudience"]) {
      expect(BrandAnalysisInputSchema.safeParse({ ...demoProfile, [field]: "" }).success).toBe(false);
    }
    expect(BrandAnalysisInputSchema.safeParse({ ...demoProfile, colors: ["#GG0000"] }).success).toBe(false);
  });
  it("rejects invented source guidelines and extra analysis fields", () => {
    expect(() => parseBrandAnalysis(JSON.stringify({ ...analysis, verification_rules: [{ ...analysis.verification_rules[0], source_guideline: "Invented" }] }), demoProfile)).toThrow();
    expect(() => parseBrandAnalysis(JSON.stringify({ ...analysis, fabricated: true }), demoProfile)).toThrow();
  });
  it("rejects invented colors and prohibited elements", () => {
    expect(() => parseBrandAnalysis(JSON.stringify({ ...analysis, approved_colors: ["#FFFFFF"] }), demoProfile)).toThrow();
    expect(() => parseBrandAnalysis(JSON.stringify({ ...analysis, prohibited_elements: ["Invented"] }), demoProfile)).toThrow();
  });
  it("does not send a request without Meta credentials", async () => {
    vi.stubEnv("META_MODEL_API_KEY", undefined); vi.stubEnv("META_MUSE_SPARK_API_KEY", undefined);
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(analyzeBrandWithMeta(demoProfile)).rejects.toMatchObject({ code: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("uses Responses input and parses completed output_text rather than chat completions", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "unit-test-placeholder");
    const fetchMock = vi.fn().mockResolvedValue(Response.json(envelope(JSON.stringify(analysis))));
    vi.stubGlobal("fetch", fetchMock);
    const result = await analyzeBrandWithMeta(demoProfile);
    expect(result.analysis).toEqual(analysis);
    expect(result).not.toHaveProperty("raw");
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("Expected Meta request");
    const [url, init] = call;
    expect(url).toBe("https://api.meta.ai/v1/responses");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("muse-spark-1.3");
    expect(JSON.parse(body.input).brand_profile.name).toBe("Halden Outdoor");
    expect(body).not.toHaveProperty("messages");
    expect(body).not.toHaveProperty("previous_response_id");
  });
  it.each([[429, "rate_limited"], [401, "access_denied"], [500, "api_error"]])("handles HTTP %i without returning provider bodies", async (status, code) => {
    vi.stubEnv("META_MODEL_API_KEY", "unit-test-placeholder");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unsafe provider body", { status })));
    await expect(analyzeBrandWithMeta(demoProfile)).rejects.toMatchObject({ code });
  });
  it("rejects malformed model JSON", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "unit-test-placeholder");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(envelope("not JSON"))));
    await expect(analyzeBrandWithMeta(demoProfile)).rejects.toMatchObject({ code: "invalid_analysis" });
  });
  it("rejects incomplete Meta responses", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "unit-test-placeholder");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ...envelope("{}"), status: "incomplete" })));
    await expect(analyzeBrandWithMeta(demoProfile)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("aborts a stalled request after 45 seconds", async () => {
    vi.useFakeTimers(); vi.stubEnv("META_MODEL_API_KEY", "unit-test-placeholder");
    vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))))));
    const pending = expect(analyzeBrandWithMeta(demoProfile)).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(45000); await pending;
  });
});