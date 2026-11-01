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

export const BrandAnalysisInputSchema = BrandProfileSchema.extend({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1, "Enter a brand description").max(5000),
  industry: z.string().trim().min(1, "Enter an industry").max(200),
  targetAudience: z.string().trim().min(1, "Enter a target audience").max(1000),
  personality: z.array(z.string().trim().min(1).max(500)).min(1, "Enter brand personality").max(30),
  colors: z.array(hexColor).min(1, "Enter at least one brand color").max(30),
  guidelines: z.array(z.string().trim().min(1).max(2000)).min(1, "Enter at least one guideline").max(50),
  forbiddenElements: z.array(z.string().trim().min(1).max(1000)).max(50),
  logoUrl: z.string().max(2000).nullable(),
});

const analysisText = z.string().trim().min(1).max(4000);
export const BrandAnalysisSchema = z.object({
  brand_name: analysisText,
  brand_personality: z.array(analysisText).max(30),
  approved_colors: z.array(hexColor).max(30),
  prohibited_elements: z.array(analysisText).max(50),
  verification_rules: z.array(z.object({
    id: z.string().min(1).max(100),
    criterion: analysisText,
    expected_result: analysisText,
    verification_method: analysisText,
    source_guideline: analysisText,
  }).strict()).min(1).max(100),
}).strict();
export type BrandAnalysis = z.infer<typeof BrandAnalysisSchema>;

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

export const GenerateCreativeInputSchema = z.object({
  profile: BrandAnalysisInputSchema,
  brief: CreativeBriefSchema.extend({
    objective: z.string().trim().min(1).max(2000),
    message: z.string().trim().min(1).max(2000),
    targetAudience: z.string().trim().min(1).max(2000),
    visualDirection: z.string().trim().min(1).max(4000),
  }),
  analysis: BrandAnalysisSchema.optional(),
}).strict().refine((v) => v.brief.brandId === v.profile.id, "The brief must belong to the current brand.");
export type GenerateCreativeInput = z.infer<typeof GenerateCreativeInputSchema>;

export const GeneratedCreativeSchema = CreativeAssetSchema.extend({
  source: z.literal("live"),
  imageUrl: z.string().startsWith("data:image/png;base64,"),
  metadata: z.object({
    model: z.literal("muse-image-1.0"),
    endpoint: z.literal("https://api.meta.ai/v1/images/generations"),
    created: z.number().int().positive(),
    completedAt: z.string(),
    requestedSize: z.string(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    outputFormat: z.literal("png"),
    usage: z.object({ input_tokens: z.number(), output_tokens: z.number(), total_tokens: z.number() }).optional(),
    profile: BrandAnalysisInputSchema,
    brief: CreativeBriefSchema,
    analysis: BrandAnalysisSchema.optional(),
    verificationStatus: z.literal("NEEDS_REVIEW"),
    logoStatus: z.literal("requires_verification_or_post_processing"),
    textStatus: z.literal("requires_verification_or_post_processing"),
  }),
});
export type GeneratedCreative = z.infer<typeof GeneratedCreativeSchema>;

export const CriterionKey = z.enum(["color_consistency", "personality_alignment", "forbidden_elements", "brief_alignment"]);
export type CriterionKey = z.infer<typeof CriterionKey>;

export const VerificationStatus = z.enum(["PASS", "REVISE", "NEEDS_REVIEW"]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const VerifyCreativeInputSchema = z.object({
  asset: GeneratedCreativeSchema,
  analysis: BrandAnalysisSchema,
}).strict();
export type VerifyCreativeInput = z.infer<typeof VerifyCreativeInputSchema>;

export const VisualRuleFindingSchema = z.object({
  rule_id: z.string().min(1).max(100),
  criterion: analysisText,
  status: VerificationStatus,
  evidence: z.array(analysisText).max(20),
  verification_method: z.literal("Meta image understanding"),
  suggested_correction: analysisText.nullable(),
  explanation: analysisText,
}).strict();
export type VisualRuleFinding = z.infer<typeof VisualRuleFindingSchema>;
export const VisualVerificationResponseSchema = z.object({
  findings: z.array(VisualRuleFindingSchema).min(1).max(100),
  observed_text: z.array(analysisText).max(50),
  image_observations: z.array(analysisText).min(1).max(30),
}).strict();
export const LiveRuleFindingSchema = VisualRuleFindingSchema.extend({
  verification_method: z.enum(["Meta image understanding", "PNG header inspection", "Aspect ratio arithmetic", "Human review required"]),
  source_guideline: analysisText,
});
export type LiveRuleFinding = z.infer<typeof LiveRuleFindingSchema>;
export const LiveVerificationSchema = z.object({
  id: z.string(), assetId: z.string(), source: z.literal("live"), overall: VerificationStatus,
  findings: z.array(LiveRuleFindingSchema), imageObservations: z.array(analysisText), observedText: z.array(analysisText),
  verifiedAt: z.string(), model: z.literal("muse-spark-1.3"), endpoint: z.literal("https://api.meta.ai/v1/responses"),
  method: z.literal("Independent image understanding plus deterministic PNG checks"),
  imageSha256: z.string(), responseId: z.string(), analysis: BrandAnalysisSchema,
});
export type LiveVerification = z.infer<typeof LiveVerificationSchema>;

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
