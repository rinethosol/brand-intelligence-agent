import { BrandAnalysisSchema, type BrandProfile } from "./schemas";

export function analysisSources(profile: BrandProfile) {
  return [...profile.guidelines, ...profile.personality, ...profile.colors, ...profile.forbiddenElements,
    profile.description, profile.industry, profile.targetAudience];
}

export function parseBrandAnalysis(text: string, profile: BrandProfile) {
  const analysis = BrandAnalysisSchema.parse(JSON.parse(text));
  const sources = new Set(analysisSources(profile));
  if (analysis.brand_name !== profile.name ||
    analysis.approved_colors.some((c) => !profile.colors.some((p) => p.toUpperCase() === c.toUpperCase())) ||
    analysis.prohibited_elements.some((e) => !profile.forbiddenElements.includes(e)) ||
    analysis.brand_personality.some((p) => !profile.personality.includes(p)) ||
    analysis.verification_rules.some((r) => !sources.has(r.source_guideline)) ||
    new Set(analysis.verification_rules.map((r) => r.id)).size !== analysis.verification_rules.length) {
    throw new Error("Ungrounded analysis");
  }
  return analysis;
}