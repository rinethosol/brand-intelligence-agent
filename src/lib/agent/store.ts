import { useSyncExternalStore } from "react";
import type { BrandProfile, CreativeBrief, BrandAnalysis, GeneratedCreative } from "./schemas";
import { demoBrief, demoProfile } from "./demo-data";

type State = { profile: BrandProfile; brief: CreativeBrief; profileIsDemo: boolean; briefIsDemo: boolean; approval: "pending" | "approved" | "rejected"; analyzedBrand: { analysis: BrandAnalysis; fingerprint: string } | null; generatedCreatives: GeneratedCreative[] };

let state: State = { profile: demoProfile, brief: demoBrief, profileIsDemo: true, briefIsDemo: true, approval: "pending", analyzedBrand: null, generatedCreatives: [] };
const listeners = new Set<() => void>();

export function setWorkspace(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function retainGeneratedCreative(asset: GeneratedCreative) {
  setWorkspace({ generatedCreatives: [...state.generatedCreatives, asset], approval: "pending" });
}

export function useWorkspace() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}
