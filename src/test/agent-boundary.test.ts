import { afterEach, describe, expect, it, vi } from "vitest";
import { BrandProfileSchema } from "@/lib/agent/schemas";
import { demoProfile } from "@/lib/agent/demo-data";
import { getReasoningProvider, getImageProvider, getVerificationProvider, ProviderNotConfiguredError } from "@/lib/agent/providers.server";

afterEach(() => vi.unstubAllEnvs());

describe("Existing integration boundary (not live API verification)", () => {
  it("rejects missing Muse Spark credentials rather than returning fabricated analysis", () => {
    vi.stubEnv("META_MUSE_SPARK_API_KEY", undefined);
    expect(() => getReasoningProvider().planRevision({
      profile: demoProfile,
      brief: { id: "brief", brandId: demoProfile.id, objective: "Awareness", message: "Test", targetAudience: "", format: "instagram_post", visualDirection: "" },
      verification: { id: "verification", assetId: "asset", overall: "REVISE", criteria: [], violations: ["Wrong palette"], verifier: "test", source: "demo" },
    })).toThrow("Meta Muse Spark is not configured. Set META_MUSE_SPARK_API_KEY on the server to enable it.");
  });

  it("rejects a brand profile containing an invalid color", () => {
    const result = BrandProfileSchema.safeParse({ ...demoProfile, colors: ["not-a-color"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["colors", 0]);
  });

  it("does not claim image generation or independent verification is connected", () => {
    vi.stubEnv("META_IMAGE_API_KEY", undefined);
    vi.stubEnv("BRAND_VERIFIER_API_KEY", undefined);
    const brief = { id: "brief", brandId: demoProfile.id, objective: "Awareness", message: "Test", targetAudience: "", format: "instagram_post" as const, visualDirection: "" };
    expect(() => getImageProvider().generate({ prompt: "Test", brief, iteration: 1 })).toThrow(ProviderNotConfiguredError);
    expect(() => getVerificationProvider().verify({ profile: demoProfile, brief, asset: { id: "asset", briefId: brief.id, iteration: 1, imageUrl: null, prompt: "Test", source: "demo" } })).toThrow(ProviderNotConfiguredError);
  });
});