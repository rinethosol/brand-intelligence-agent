import { VisualVerificationResponseSchema, type VerifyCreativeInput, type LiveRuleFinding, type VerificationStatus } from "./schemas";
import { parseBrandAnalysis } from "./brand-analysis";
import { CREATIVE_SIZES } from "./creative-generation";

/** Meta Responses text.format schema; all properties required, no fabricated confidence field. */
export const VISUAL_VERIFICATION_JSON_SCHEMA = {
  type: "object", additionalProperties: false, required: ["findings", "observed_text", "image_observations"],
  properties: {
    findings: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["rule_id", "criterion", "status", "evidence", "verification_method", "suggested_correction", "explanation"],
      properties: {
        rule_id: { type: "string" }, criterion: { type: "string" },
        status: { type: "string", enum: ["PASS", "REVISE", "NEEDS_REVIEW"] },
        evidence: { type: "array", items: { type: "string" } },
        verification_method: { type: "string", enum: ["Meta image understanding"] },
        suggested_correction: { type: ["string", "null"] }, explanation: { type: "string" },
      },
    } },
    observed_text: { type: "array", items: { type: "string" } },
    image_observations: { type: "array", items: { type: "string" } },
  },
};

export function inspectOriginalPng(url: string) {
  const base64 = url.split(",")[1];
  if (!url.startsWith("data:image/png;base64,") || !base64 || base64.length > 28000000 || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("Invalid original PNG");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (bytes.length < 45 || ![137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b) || binary.slice(12,16) !== "IHDR" || binary.slice(-8,-4) !== "IEND") throw new Error("Invalid original PNG");
  const view = new DataView(bytes.buffer);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (!width || !height || width > 16384 || height > 16384) throw new Error("Invalid PNG dimensions");
  return { bytes, width, height };
}

export function validateVerificationInput(input: VerifyCreativeInput) {
  parseBrandAnalysis(JSON.stringify(input.analysis), input.asset.metadata.profile);
  if (input.asset.briefId !== input.asset.metadata.brief.id || input.asset.metadata.brief.brandId !== input.asset.metadata.profile.id) throw new Error("Mismatched generation record");
  if (input.analysis.verification_rules.some((r) => r.id.startsWith("system:"))) throw new Error("Reserved rule ID");
  return inspectOriginalPng(input.asset.imageUrl);
}

export function aggregateVerification(findings: { status: VerificationStatus }[]): VerificationStatus {
  if (findings.some((f) => f.status === "REVISE")) return "REVISE";
  if (!findings.length || findings.some((f) => f.status === "NEEDS_REVIEW")) return "NEEDS_REVIEW";
  return "PASS";
}

function reviewFinding(rule_id: string, criterion: string, source_guideline: string, evidence: string[], explanation: string): LiveRuleFinding {
  return { rule_id, criterion, source_guideline, evidence, explanation, status: "NEEDS_REVIEW", verification_method: "Human review required", suggested_correction: "Have a reviewer confirm this requirement against the original assets and supporting records." };
}

export function deterministicFindings(input: VerifyCreativeInput): LiveRuleFinding[] {
  const { width, height } = validateVerificationInput(input);
  const { metadata } = input.asset;
  const [w,h] = CREATIVE_SIZES[metadata.brief.format].split("x").map(Number);
  if (!w || !h) throw new Error("Unsupported format");
  const match = Math.abs(width / height - w / h) <= (1 / height + 1 / width);
  const dimensionsMatch = width === metadata.width && height === metadata.height;
  return [
    { rule_id: "system:format", criterion: "Original file format", source_guideline: "Generation record: PNG output", status: "PASS", evidence: ["Original bytes have PNG signature, IHDR dimensions and IEND terminator."], explanation: "File identity is checked from bytes, not the filename.", verification_method: "PNG header inspection", suggested_correction: null },
    { rule_id: "system:dimensions", criterion: "Image dimensions", source_guideline: "Generation record: measured original dimensions", status: dimensionsMatch ? "PASS" : "REVISE", evidence: [`PNG header: ${width} × ${height}; generation record: ${metadata.width} × ${metadata.height}.`], explanation: "Requested size is an aspect ratio, not a fixed output resolution.", verification_method: "PNG header inspection", suggested_correction: dimensionsMatch ? null : "Resolve the image/record mismatch before approving this original." },
    { rule_id: "system:aspect", criterion: "Required aspect ratio", source_guideline: `Campaign format: ${metadata.brief.format}`, status: match ? "PASS" : "REVISE", evidence: [`Original ${width}:${height}; required ${w}:${h}. One-pixel rounding tolerance.`], explanation: "Compares decoded dimensions with the campaign format.", verification_method: "Aspect ratio arithmetic", suggested_correction: match ? null : "Recompose or regenerate at the campaign's required aspect ratio; preserve this original." },
    reviewFinding("system:palette", "Exact brand palette", "Approved colors in brand profile", [], "No deterministic brand-element layer exists. Visual color resemblance cannot establish exact HEX compliance."),
    reviewFinding("system:logo", "Logo identity and placement", "Brand logo and positioning guidelines", [], "No attached logo reference or deterministic composition record exists; logo identity and positioning need review."),
    reviewFinding("system:typography", "Exact campaign typography", "Campaign message and typography", [], "Image-model transcription is not an exact typography or OCR certification."),
    reviewFinding("system:claims", "Factual product claims", "User-supplied brand facts and campaign brief", [], "An image cannot establish product facts. Review visible claims against substantiation; no product evidence was supplied."),
    reviewFinding("system:overlays", "Deterministic overlays", "Composition layer evidence", [], "No deterministic overlay layer was used; overlay presence and geometry cannot be certified from a composition record."),
  ];
}

export function parseVisualVerification(raw: unknown, input: VerifyCreativeInput) {
  const result = VisualVerificationResponseSchema.parse(raw);
  const rules = input.analysis.verification_rules;
  const ids = new Set(result.findings.map((f) => f.rule_id));
  if (ids.size !== result.findings.length || result.findings.length !== rules.length || result.findings.some((f) => !rules.some((r) => r.id === f.rule_id))) throw new Error("Invalid verification rule IDs");
  const findings = rules.map((rule): LiveRuleFinding => {
    const finding = result.findings.find((f) => f.rule_id === rule.id);
    if (!finding || finding.criterion !== rule.criterion) throw new Error("Mismatched verification criterion");
    const context = `${rule.criterion} ${rule.expected_result} ${rule.source_guideline}`;
    if (/logo|typograph|font|hex|#[0-9a-f]{6}|factual|product claim|certif|manufactur|production record|document|human review|ambig|conflict/i.test(context)) {
      return reviewFinding(rule.id, rule.criterion, rule.source_guideline, finding.evidence, `${finding.explanation} This requirement cannot be reliably established from this image alone.`);
    }
    if (!finding.evidence.length || /cannot (verify|determine|confirm)|unable to|not (visible|verifiable)|insufficient|uncertain|unsupported|not possible/i.test(`${finding.explanation} ${finding.evidence.join(" ")}`) || (finding.status === "REVISE" && !finding.suggested_correction)) {
      return reviewFinding(rule.id, rule.criterion, rule.source_guideline, finding.evidence, "The visual response lacks sufficient supporting evidence or an actionable correction.");
    }
    return { ...finding, source_guideline: rule.source_guideline };
  });
  return { ...result, findings };
}