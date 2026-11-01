import { createServerFn } from "@tanstack/react-start";
import { BrandProfileSchema, CreativeBriefSchema, BrandAnalysisInputSchema, GenerateCreativeInputSchema } from "./schemas";
import { z } from "zod";

export const analyzeBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => BrandAnalysisInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { analyzeBrandWithMeta, BrandAnalysisError } = await import("./providers.server");
    try {
      return { ok: true as const, ...await analyzeBrandWithMeta(data) };
    } catch (error) {
      if (error instanceof BrandAnalysisError) return { ok: false as const, code: error.code, error: error.message };
      return { ok: false as const, code: "unexpected_error", error: "Brand analysis failed. No analysis was saved." };
    }
  });

export const getProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { providerStatus } = await import("./providers.server");
  return providerStatus();
});

export const generateCreative = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => GenerateCreativeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { generateCreativeWithMeta, CreativeGenerationError } = await import("./providers.server");
    try { return { ok: true as const, asset: await generateCreativeWithMeta(data) }; }
    catch (error) {
      if (error instanceof CreativeGenerationError) return { ok: false as const, code: error.code, error: error.message };
      return { ok: false as const, code: "invalid_input", error: "Generation could not be completed. Check the brand guidelines and campaign brief." };
    }
  });

/**
 * Bounded self-correction loop entry point. Returns an honest error when any
 * provider is unconfigured — never a fabricated success.
 */
export const runCreativeAgent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ profile: BrandProfileSchema, brief: CreativeBriefSchema }).parse(d))
  .handler(async ({ data }) => {
    const { getImageProvider, getVerificationProvider, getReasoningProvider, ProviderNotConfiguredError } = await import("./providers.server");
    const { MAX_CORRECTION_ITERATIONS } = await import("./schemas");
    try {
      const image = getImageProvider();
      const verifier = getVerificationProvider();
      const reasoner = getReasoningProvider();
      let prompt = `${data.brief.message} — ${data.brief.visualDirection}`;
      const history = [];
      for (let i = 1; i <= MAX_CORRECTION_ITERATIONS; i++) {
        const asset = await image.generate({ prompt, brief: data.brief, iteration: i });
        const verification = await verifier.verify({ profile: data.profile, brief: data.brief, asset });
        history.push({ asset, verification });
        if (verification.overall !== "REVISE") break;
        prompt = (await reasoner.planRevision({ profile: data.profile, brief: data.brief, verification })).revisedPrompt;
      }
      return { ok: true as const, history };
    } catch (e) {
      if (e instanceof ProviderNotConfiguredError) return { ok: false as const, error: e.message, provider: e.provider };
      return { ok: false as const, error: "Agent run failed unexpectedly.", provider: null };
    }
  });
