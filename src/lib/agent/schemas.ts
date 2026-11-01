import { z } from "zod";

/** Structured JSON schemas shared by the UI and the agent orchestration layer. */

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit HEX value like #1A2B3C");

export const BrandProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  industry: z.string(),
  targetAudience: z.string(),
  personality: z.array(z.string()),
  colors: z.array(hexColor),
  guidelines: z.array(z.string()),
  forbiddenElements: z.array(z.string()),
  logoUrl: z.string().nullable(),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const CreativeFormat = z.enum(["instagram_post", "instagram_story", "facebook_feed", "display_banner"]);
export type CreativeFormat = z.infer<typeof CreativeFormat>;

export const CreativeBriefSchema = z.object({
  id: z.string(),
  brandId: z.string(),
  objective: z.string().min(1),
  message: z.string().min(1),
  targetAudience: z.string(),
  format: CreativeFormat,
  visualDirection: z.string(),
});
export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;

export const CreativeAssetSchema = z.object({
  id: z.string(),
  briefId: z.string(),
  iteration: z.number().int().min(1),
  imageUrl: z.string().nullable(),
  prompt: z.string(),
  source: z.enum(["demo", "live"]),
});
export type CreativeAsset = z.infer<typeof CreativeAssetSchema>;

export const CriterionKey = z.enum(["color_consistency", "personality_alignment", "forbidden_elements", "brief_alignment"]);
export type CriterionKey = z.infer<typeof CriterionKey>;

export const VerificationStatus = z.enum(["PASS", "REVISE", "NEEDS_REVIEW"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const CriterionResultSchema = z.object({
  key: CriterionKey,
  status: VerificationStatus,
  evidence: z.array(z.string()),
  findings: z.array(z.string()),
  explanation: z.string(),
});
export type CriterionResult = z.infer<typeof CriterionResultSchema>;

export const VerificationResultSchema = z.object({
  id: z.string(),
  assetId: z.string(),
  overall: VerificationStatus,
  criteria: z.array(CriterionResultSchema),
  violations: z.array(z.string()),
  verifier: z.string(),
  source: z.enum(["demo", "live"]),
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

export const AgentEventSchema = z.object({
  id: z.string(),
  at: z.string(),
  stage: z.enum(["profile", "generate", "verify", "identify", "revise", "reverify", "report", "system"]),
  level: z.enum(["info", "success", "warning", "error"]),
  message: z.string(),
  source: z.enum(["demo", "live"]),
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const CRITERIA_LABELS: Record<CriterionKey, string> = {
  color_consistency: "Brand color consistency",
  personality_alignment: "Brand personality alignment",
  forbidden_elements: "Forbidden element detection",
  brief_alignment: "Campaign brief alignment",
};

/** Hard upper bound for the self-correction loop. */
export const MAX_CORRECTION_ITERATIONS = 3;
