/**
 * Server-only provider adapters. Credentials are read from process.env inside
 * handlers and never reach the browser. No adapter is wired to a real API yet:
 * each one reports "not_configured" instead of fabricating output.
 */
import type { BrandProfile, CreativeAsset, CreativeBrief, VerificationResult } from "./schemas";

export class ProviderNotConfiguredError extends Error {
  constructor(public provider: string, public envVar: string) {
    super(`${provider} is not configured. Set ${envVar} on the server to enable it.`);
  }
}

export interface ReasoningProvider {
  /** Meta Muse Spark — reasoning & orchestration. */
  planRevision(input: { profile: BrandProfile; brief: CreativeBrief; verification: VerificationResult }): Promise<{ revisedPrompt: string; rationale: string }>;
}
export interface ImageProvider {
  /** Meta-compatible image generation endpoint. */
  generate(input: { prompt: string; brief: CreativeBrief; iteration: number }): Promise<CreativeAsset>;
}
export interface VerificationProvider {
  /** Independent brand verification service (must not be the generator). */
  verify(input: { profile: BrandProfile; brief: CreativeBrief; asset: CreativeAsset }): Promise<VerificationResult>;
}

function unconfigured(provider: string, envVar: string): never {
  throw new ProviderNotConfiguredError(provider, envVar);
}

export function getReasoningProvider(): ReasoningProvider {
  if (!process.env.META_MUSE_SPARK_API_KEY) return { planRevision: () => unconfigured("Meta Muse Spark", "META_MUSE_SPARK_API_KEY") };
  return { planRevision: () => unconfigured("Meta Muse Spark adapter (not implemented)", "META_MUSE_SPARK_API_KEY") };
}
export function getImageProvider(): ImageProvider {
  if (!process.env.META_IMAGE_API_KEY) return { generate: () => unconfigured("Meta image generation", "META_IMAGE_API_KEY") };
  return { generate: () => unconfigured("Meta image adapter (not implemented)", "META_IMAGE_API_KEY") };
}
export function getVerificationProvider(): VerificationProvider {
  if (!process.env.BRAND_VERIFIER_API_KEY) return { verify: () => unconfigured("Brand verification service", "BRAND_VERIFIER_API_KEY") };
  return { verify: () => unconfigured("Verifier adapter (not implemented)", "BRAND_VERIFIER_API_KEY") };
}

export function providerStatus() {
  return [
    { name: "Meta Muse Spark", role: "Reasoning & orchestration", envVar: "META_MUSE_SPARK_API_KEY", keyPresent: !!process.env.META_MUSE_SPARK_API_KEY },
    { name: "Meta Image Generation", role: "Creative generation", envVar: "META_IMAGE_API_KEY", keyPresent: !!process.env.META_IMAGE_API_KEY },
    { name: "Brand Verification Service", role: "Independent verification", envVar: "BRAND_VERIFIER_API_KEY", keyPresent: !!process.env.BRAND_VERIFIER_API_KEY },
  ];
}
