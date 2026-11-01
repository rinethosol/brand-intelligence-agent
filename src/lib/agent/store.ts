import { useSyncExternalStore } from "react";
import type { BrandProfile, CreativeBrief } from "./schemas";
import { demoBrief, demoProfile } from "./demo-data";

type State = { profile: BrandProfile; brief: CreativeBrief; profileIsDemo: boolean; briefIsDemo: boolean; approval: "pending" | "approved" | "rejected" };

let state: State = { profile: demoProfile, brief: demoBrief, profileIsDemo: true, briefIsDemo: true, approval: "pending" };
const listeners = new Set<() => void>();

export function setWorkspace(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function useWorkspace() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}
