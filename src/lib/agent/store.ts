import { useSyncExternalStore } from "react";
import type { BrandProfile, CreativeBrief, BrandAnalysis, GeneratedCreative, LiveVerification, CorrectionRun } from "./schemas";
import { demoBrief, demoProfile } from "./demo-data";

type State = { profile: BrandProfile; brief: CreativeBrief; profileIsDemo: boolean; briefIsDemo: boolean; approval: "pending" | "approved" | "rejected"; analyzedBrand: { analysis: BrandAnalysis; fingerprint: string } | null; generatedCreatives: GeneratedCreative[]; verifications: LiveVerification[]; correctionRuns: CorrectionRun[]; runApprovals: Record<string, "pending" | "approved" | "rejected"> };

let state: State = { profile: demoProfile, brief: demoBrief, profileIsDemo: true, briefIsDemo: true, approval: "pending", analyzedBrand: null, generatedCreatives: [], verifications: [], correctionRuns: [], runApprovals: {} };
const listeners = new Set<() => void>();

export function setWorkspace(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function retainGeneratedCreative(asset: GeneratedCreative) {
  setWorkspace({ generatedCreatives: [...state.generatedCreatives, asset], approval: "pending" });
}

export function retainVerification(verification: LiveVerification) {
  if (!state.generatedCreatives.some((a) => a.id === verification.assetId)) throw new Error("Unknown original image");
  setWorkspace({ verifications: [...state.verifications, verification], approval: "pending" });
}

export function useWorkspace() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export function retainCorrectionRun(run: CorrectionRun) {
  const assets = [run.original, ...run.attempts.map((a) => a.asset)].filter((a): a is GeneratedCreative => a !== null);
  const results = [run.originalVerification, ...run.attempts.map((a) => a.verification)].filter((v): v is LiveVerification => v !== null);
  setWorkspace({ correctionRuns: [...state.correctionRuns, run],
    generatedCreatives: [...state.generatedCreatives, ...assets.filter((a) => !state.generatedCreatives.some((old) => old.id === a.id))],
    verifications: [...state.verifications, ...results], runApprovals: { ...state.runApprovals, [run.id]: "pending" }, approval: "pending" });
}

export function approveCorrectionRun(id: string, approval: "approved" | "rejected") {
  if (!state.correctionRuns.some((r) => r.id === id)) return;
  setWorkspace({ runApprovals: { ...state.runApprovals, [id]: approval } });
}
