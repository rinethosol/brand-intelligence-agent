import { useSyncExternalStore } from "react";
import type { BrandProfile, CreativeBrief, BrandAnalysis, GeneratedCreative, LiveVerification } from "./schemas";
import { demoBrief, demoProfile } from "./demo-data";

type State = { profile: BrandProfile; brief: CreativeBrief; profileIsDemo: boolean; briefIsDemo: boolean; approval: "pending" | "approved" | "rejected"; analyzedBrand: { analysis: BrandAnalysis; fingerprint: string } | null; generatedCreatives: GeneratedCreative[]; verifications: LiveVerification[] };

let state: State = { profile: demoProfile, brief: demoBrief, profileIsDemo: true, briefIsDemo: true, approval: "pending", analyzedBrand: null, generatedCreatives: [], verifications: [] };
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
