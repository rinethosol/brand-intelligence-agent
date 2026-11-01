import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, StatusBadge, CreativeMock, DemoNotice, CriterionCard } from "@/components/app/ui-bits";
import { demoAssets, demoVerifications } from "@/lib/agent/demo-data";
import { setWorkspace, useWorkspace } from "@/lib/agent/store";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Verification Report — Brand Intelligence Agent" },
      { name: "description", content: "Brand summary, criteria, violations, correction history and human approval." },
      { property: "og:title", content: "Verification Report" },
      { property: "og:description", content: "The audit trail behind every verified creative." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Report,
});

function Report() {
  const { profile, brief, approval } = useWorkspace();
  const final = demoVerifications[demoVerifications.length - 1]!;
  const finalAsset = demoAssets[demoAssets.length - 1]!;
  return (
    <div>
      <PageHeader eyebrow="Step 05" title="Verification Report" description={`${profile.name} · ${brief.objective}`} />
      <DemoNotice>Report assembled from demo data. Approval status is stored only in this browser session.</DemoNotice>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Panel title="Brand identity summary">
            <p className="font-semibold text-foreground">{profile.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
            <div className="mt-3 flex gap-2">{profile.colors.map((c) => <div key={c} className="h-6 w-6 rounded border border-border" style={{ background: c }} title={c} />)}</div>
            <p className="mt-3 text-sm text-foreground">{profile.personality.join(" · ")}</p>
          </Panel>
          <Panel title="Creative preview"><CreativeMock asset={finalAsset} profile={profile} headline={brief.message} /></Panel>
          <Panel title="Final result"><StatusBadge status={final.overall} large /></Panel>
          <Panel title="Human approval">
            <p className="mb-4 text-sm capitalize text-foreground">Status: <span className={approval === "approved" ? "text-success" : approval === "rejected" ? "text-destructive" : "text-warning"}>{approval}</span></p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setWorkspace({ approval: "approved" })}><Check className="mr-1 h-4 w-4" />Approve</Button>
              <Button size="sm" variant="secondary" onClick={() => setWorkspace({ approval: "rejected" })}><X className="mr-1 h-4 w-4" />Reject</Button>
            </div>
          </Panel>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Verification criteria"><div className="space-y-3">{final.criteria.map((c) => <CriterionCard key={c.key} c={c} />)}</div></Panel>
          <Panel title="Detected violations & correction history">
            <ol className="space-y-4">
              {demoVerifications.map((v, i) => (
                <li key={v.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between"><p className="font-medium text-foreground">Iteration {i + 1}</p><StatusBadge status={v.overall} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">Prompt: {demoAssets[i]?.prompt}</p>
                  {v.violations.length ? <ul className="mt-2 list-disc pl-4 text-sm text-destructive">{v.violations.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-2 text-sm text-success">No violations detected</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
