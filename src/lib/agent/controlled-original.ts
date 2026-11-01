import { CONTROLLED_ORIGINAL_ENDPOINT, CONTROLLED_ORIGINAL_LABEL, CONTROLLED_ORIGINAL_MODEL, GeneratedCreativeSchema,
  type BrandAnalysis, type CreativeBrief, type GeneratedCreative } from "./schemas";
import { CREATIVE_SIZES } from "./creative-generation";
import { inspectOriginalPng } from "./creative-verification";
import { parseBrandAnalysis } from "./brand-analysis";

/** Fits the image request limit (base64 expansion + metadata) with margin. */
export const CONTROLLED_MAX_BYTES = 8 * 1024 * 1024;
export const CONTROLLED_MIN_SIDE = 256;
export const CONTROLLED_MAX_SIDE = 4096;

export class ControlledOriginalError extends Error {}

export function isControlledOriginal(asset: GeneratedCreative) { return asset.metadata.model === CONTROLLED_ORIGINAL_MODEL; }
export function assetSourceLabel(asset: GeneratedCreative) {
  return isControlledOriginal(asset) ? `${CONTROLLED_ORIGINAL_LABEL} · not Muse-generated` : "AI-generated · Meta Muse Image 1.0";
}

/**
 * Wraps a user-supplied PNG as an original bound to the strict profile, brief and validated rules.
 * Performs no model call and makes no compliance claim; verification must inspect it independently.
 */
export function buildControlledOriginal(input: { imageUrl: string; byteLength: number; mimeType: string; profile: GeneratedCreative["metadata"]["profile"]; brief: CreativeBrief; analysis: BrandAnalysis | undefined }): GeneratedCreative {
  if (input.mimeType !== "image/png") throw new ControlledOriginalError("Only PNG files are accepted.");
  if (input.byteLength > CONTROLLED_MAX_BYTES) throw new ControlledOriginalError("The PNG must be 8 MB or smaller.");
  if (!input.analysis) throw new ControlledOriginalError("Analyze the current brand profile first so the image is bound to validated rules.");
  parseBrandAnalysis(JSON.stringify(input.analysis), input.profile);
  if (input.brief.brandId !== input.profile.id) throw new ControlledOriginalError("The brief must belong to the current brand.");
  let png;
  try { png = inspectOriginalPng(input.imageUrl); } catch { throw new ControlledOriginalError("The file is not a complete, valid PNG."); }
  if (png.bytes.length !== input.byteLength) throw new ControlledOriginalError("The PNG bytes changed while reading. Try again.");
  const { width, height } = png;
  if (Math.min(width, height) < CONTROLLED_MIN_SIDE || Math.max(width, height) > CONTROLLED_MAX_SIDE)
    throw new ControlledOriginalError(`Each side must be between ${CONTROLLED_MIN_SIDE} and ${CONTROLLED_MAX_SIDE} pixels.`);
  const [w, h] = CREATIVE_SIZES[input.brief.format].split("x").map(Number);
  if (!w || !h || Math.abs(width / height - w / h) > 1 / height + 1 / width)
    throw new ControlledOriginalError(`The image is ${width} × ${height}; the selected format needs a ${w}:${h} aspect ratio.`);
  return GeneratedCreativeSchema.parse({
    id: crypto.randomUUID(), briefId: input.brief.id, iteration: 1, source: "live", imageUrl: input.imageUrl, prompt: "",
    metadata: { model: CONTROLLED_ORIGINAL_MODEL, endpoint: CONTROLLED_ORIGINAL_ENDPOINT, sourceLabel: CONTROLLED_ORIGINAL_LABEL,
      created: Math.floor(Date.now() / 1000), completedAt: new Date().toISOString(), requestedSize: CREATIVE_SIZES[input.brief.format],
      width, height, outputFormat: "png", profile: input.profile, brief: input.brief, analysis: input.analysis,
      verificationStatus: "NEEDS_REVIEW", logoStatus: "requires_verification_or_post_processing", textStatus: "requires_verification_or_post_processing" },
  });
}
