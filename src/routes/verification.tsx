import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, CriterionCard, StatusBadge, CreativeMock, DemoNotice } from "@/components/app/ui-bits";
import { demoAssets, demoVerifications } from "@/lib/agent/demo-data";
import { useWorkspace } from "@/lib/agent/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Brand Verification — Brand Intelligence Agent" },
      { name: "description", content: "Independent checks for color, personality, forbidden elements and brief alignment." },
      { property: "og:title", content: "Brand Verification" },
      { property: "og:description", content: "Evidence-based brand consistency checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Verification,
});

function Verification() {
  const { profile, brief } = useWorkspace();
  const [i, setI] = useState(0);
  const v = demoVerifications[i] ?? demoVerifications[0]!;
  return (
    <div>
      <PageHeader eyebrow="Step 03" title="Brand Verification" description="An independent verifier — separate from the generator — evaluates each creative against the brand profile." />
      <DemoNotice>Illustrative results written by hand. No verification service is connected, and no score shown here was computed.</DemoNotice>
      <div className="mb-6 flex gap-2">
        {demoAssets.map((a, idx) => (
          <button key={a.id} onClick={() => setI(idx)} className={cn("rounded-full border px-4 py-1.5 text-sm", idx === i ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground")}>Creative v{a.iteration}</button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <CreativeMock asset={demoAssets[i] ?? demoAssets[0]!} profile={profile} headline={brief.message} />
          <Panel title="Overall status"><StatusBadge status={v.overall} large /><p className="mt-3 text-xs text-muted-foreground">Verifier: {v.verifier}</p></Panel>
        </div>
        <div className="space-y-4 lg:col-span-2">{v.criteria.map((c) => <CriterionCard key={c.key} c={c} />)}</div>
      </div>
    </div>
  );
}
