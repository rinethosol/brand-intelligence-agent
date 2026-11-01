import type { AgentEvent, BrandProfile, CreativeAsset, CreativeBrief, VerificationResult } from "./schemas";

/**
 * ILLUSTRATIVE DEMO DATA. Hand-written to show the UI states. None of this
 * was produced by a model, generator, or verifier.
 */
export const demoProfile: BrandProfile = {
  id: "demo-brand",
  name: "Halden Outdoor",
  description: "Sustainable outdoor gear for people who hike close to home and travel light.",
  industry: "Outdoor apparel",
  targetAudience: "Urban professionals, 25–40, weekend hikers",
  personality: ["Grounded", "Optimistic", "Quietly confident"],
  colors: ["#1F3B2D", "#E8DCC4", "#D9622B"],
  guidelines: ["Natural light only", "Real landscapes, no fantasy scenery", "Logo bottom-left, never rotated"],
  forbiddenElements: ["Neon colors", "Stock-photo handshakes", "Plastic bottles"],
  logoUrl: null,
};

export const demoBrief: CreativeBrief = {
  id: "demo-brief",
  brandId: "demo-brand",
  objective: "Launch the autumn trail jacket",
  message: "Weather-ready. City-ready.",
  targetAudience: "Weekend hikers in northern cities",
  format: "instagram_post",
  visualDirection: "Misty forest trail at dawn, single hiker, warm rust accent",
};

export const demoAssets: CreativeAsset[] = [
  { id: "demo-a1", briefId: "demo-brief", iteration: 1, imageUrl: null, prompt: "Hiker on trail, vibrant, energetic", source: "demo" },
  { id: "demo-a2", briefId: "demo-brief", iteration: 2, imageUrl: null, prompt: "Hiker on misty trail at dawn, forest green + rust palette, natural light", source: "demo" },
];

export const demoVerifications: VerificationResult[] = [
  {
    id: "demo-v1", assetId: "demo-a1", overall: "REVISE", verifier: "Demo (no verifier connected)", source: "demo",
    violations: ["Neon green highlight appears in jacket trim", "Tone reads energetic rather than grounded"],
    criteria: [
      { key: "color_consistency", status: "REVISE", evidence: ["Dominant hues do not include #1F3B2D"], findings: ["Neon accent present"], explanation: "Palette drifts away from the forest green and sand foundation." },
      { key: "personality_alignment", status: "REVISE", evidence: ["High-saturation, motion-blur composition"], findings: ["Energetic, not grounded"], explanation: "Visual energy conflicts with the 'quietly confident' personality." },
      { key: "forbidden_elements", status: "REVISE", evidence: ["Neon trim region"], findings: ["Neon colors detected"], explanation: "Neon colors are listed as forbidden." },
      { key: "brief_alignment", status: "PASS", evidence: ["Trail and hiker present"], findings: ["Subject matches brief"], explanation: "Subject matter matches the campaign brief." },
    ],
  },
  {
    id: "demo-v2", assetId: "demo-a2", overall: "PASS", verifier: "Demo (no verifier connected)", source: "demo",
    violations: [],
    criteria: [
      { key: "color_consistency", status: "PASS", evidence: ["Forest green and sand dominate; rust used as accent"], findings: ["Palette aligned"], explanation: "All three brand colors present in intended roles." },
      { key: "personality_alignment", status: "PASS", evidence: ["Calm composition, soft dawn light"], findings: ["Grounded tone"], explanation: "Mood matches the brand personality." },
      { key: "forbidden_elements", status: "PASS", evidence: ["No neon, no bottles, no handshakes"], findings: ["None detected"], explanation: "No forbidden elements found." },
      { key: "brief_alignment", status: "NEEDS_REVIEW", evidence: ["Jacket partially obscured by mist"], findings: ["Product visibility low"], explanation: "A human should confirm the product is visible enough for a launch." },
    ],
  },
];

export const demoEvents: AgentEvent[] = [
  { id: "e1", at: "00:00", stage: "profile", level: "info", message: "Brand Identity Profile loaded", source: "demo" },
  { id: "e2", at: "00:02", stage: "generate", level: "info", message: "Creative v1 generated", source: "demo" },
  { id: "e3", at: "00:05", stage: "verify", level: "warning", message: "Verification returned REVISE (3 of 4 criteria failed)", source: "demo" },
  { id: "e4", at: "00:06", stage: "identify", level: "warning", message: "Violations: neon trim, off-personality tone", source: "demo" },
  { id: "e5", at: "00:08", stage: "revise", level: "info", message: "Prompt revised: enforce palette, natural light, calmer composition", source: "demo" },
  { id: "e6", at: "00:11", stage: "reverify", level: "success", message: "Creative v2 verified — no violations, 1 item flagged for human review", source: "demo" },
  { id: "e7", at: "00:12", stage: "report", level: "info", message: "Report compiled — awaiting human approval", source: "demo" },
];
