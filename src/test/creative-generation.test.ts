import { afterEach, describe, expect, it, vi } from "vitest";
import { demoBrief, demoProfile } from "@/lib/agent/demo-data";
import { GenerateCreativeInputSchema } from "@/lib/agent/schemas";
import { buildCreativePrompt, CREATIVE_SIZES, profileFingerprint } from "@/lib/agent/creative-generation";
import { generateCreativeWithMeta } from "@/lib/agent/providers.server";

const input = { profile: demoProfile, brief: demoBrief };
const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8XsAAAAASUVORK5CYII=";
const envelope = { created: 1784584435, data: [{ b64_json: png }], output_format: "png" };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Muse Image generation (mocked contract, not live evidence)", () => {
  it("requires a brief belonging to the submitted brand", () => {
    expect(GenerateCreativeInputSchema.safeParse({ ...input, brief: { ...demoBrief, brandId: "other" } }).success).toBe(false);
  });
  it("uses actual brand colors, exclusions and all campaign fields", () => {
    const prompt = buildCreativePrompt(input);
    for (const value of [...demoProfile.colors, ...demoProfile.forbiddenElements, ...demoProfile.guidelines, demoBrief.objective, demoBrief.message, demoBrief.targetAudience, demoBrief.visualDirection, demoBrief.format]) expect(prompt).toContain(value);
  });
  it("rejects ungrounded analysis rather than using invented guidelines", () => {
    expect(() => buildCreativePrompt({ ...input, analysis: { brand_name: demoProfile.name, brand_personality: [], approved_colors: ["#FFFFFF"], prohibited_elements: [], verification_rules: [{ id: "one", criterion: "color", expected_result: "white", verification_method: "review", source_guideline: demoProfile.guidelines[0] ?? "" }] } })).toThrow("Ungrounded analysis");
  });
  it("ignores random profile IDs but invalidates analysis after content changes", () => {
    expect(profileFingerprint({ ...demoProfile, id: "new" })).toBe(profileFingerprint(demoProfile));
    expect(profileFingerprint({ ...demoProfile, colors: ["#FFFFFF"] })).not.toBe(profileFingerprint(demoProfile));
  });
  it("maps the four creative formats to their requested aspect ratios", () => {
    expect(CREATIVE_SIZES).toEqual({ instagram_post: "1024x1024", instagram_story: "1080x1920", facebook_feed: "1080x1350", display_banner: "1920x1080" });
  });
  it("does not call Meta without the existing key", async () => {
    vi.stubEnv("META_MODEL_API_KEY", undefined); const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(generateCreativeWithMeta(input)).rejects.toMatchObject({ code: "not_configured" }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves original bytes, snapshots and unverified logo/text statuses", async () => {
    vi.stubEnv("META_MODEL_API_KEY", "test-key"); const fetchMock = vi.fn().mockResolvedValue(Response.json(envelope)); vi.stubGlobal("fetch", fetchMock);
    const result = await generateCreativeWithMeta(input);
    expect(result.imageUrl).toBe(`data:image/png;base64,${png}`);
    expect(result.source).toBe("live"); expect(result.metadata.profile).toEqual(demoProfile); expect(result.metadata.brief).toEqual(demoBrief);
    expect(result.metadata.verificationStatus).toBe("NEEDS_REVIEW");
    expect(result.metadata.logoStatus).toBe("requires_verification_or_post_processing"); expect(result.metadata.textStatus).toBe("requires_verification_or_post_processing");
    expect(result.metadata.width).toBe(1); expect(result.metadata.height).toBe(1);
    const call = fetchMock.mock.calls[0]; if (!call) throw new Error("Expected request");
    expect(call[0]).toBe("https://api.meta.ai/v1/images/generations");
    expect(JSON.parse(call[1].body)).toMatchObject({ model: "muse-image-1.0", n: 1, response_format: "b64_json", output_format: "png", size: "1024x1024" });
    expect(JSON.stringify(result)).not.toContain("test-key");
  });
  it.each([401, 403, 429, 500])("handles HTTP %i without retrying or leaking provider bodies", async (status) => {
    vi.stubEnv("META_MODEL_API_KEY", "test-key"); const mock = vi.fn().mockResolvedValue(new Response("private provider body", { status })); vi.stubGlobal("fetch", mock);
    await expect(generateCreativeWithMeta(input)).rejects.toThrow(/Meta/); expect(mock).toHaveBeenCalledTimes(1);
  });
  it.each([{ ...envelope, data: [] }, { ...envelope, data: [{ b64_json: btoa("not a PNG") }] }, { ...envelope, output_format: "jpeg" }])("rejects an invalid image response", async (body) => {
    vi.stubEnv("META_MODEL_API_KEY", "test-key"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(generateCreativeWithMeta(input)).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("clears a stalled generation after the documented local timeout", async () => {
    vi.useFakeTimers(); vi.stubEnv("META_MODEL_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))))));
    const pending = expect(generateCreativeWithMeta(input)).rejects.toMatchObject({ code: "timeout" });
    await vi.advanceTimersByTimeAsync(180000); await pending;
  });
});