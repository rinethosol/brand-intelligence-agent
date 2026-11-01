import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader, Panel, StatusBadge, CreativeMock, DemoNotice, Timeline } from "@/components/app/ui-bits";
import { demoAssets, demoEvents, demoVerifications } from "@/lib/agent/demo-data";
import { MAX_CORRECTION_ITERATIONS } from "@/lib/agent/schemas";
import { useWorkspace } from "@/lib/agent/store";

export const Route = createFileRoute("/correction")({
  head: () => ({
    meta: [
      { title: "Self-Correction Loop — Brand Intelligence Agent" },
      { name: "description", content: "Generate, verify, identify violations, revise and verify again — in a bounded loop." },
      { property: "og:title", content: "Self-Correction Loop" },
      { property: "og:description", content: "Watch creatives get corrected against brand rules." },
    ],
  }),
  component: Correction,
});

const steps = ["Generate", "Verify", "Identify Violations", "Revise", "Verify Again"];

function Correction() {
  const { profile, brief } = useWorkspace();
  return (
    <div>
      <PageHeader eyebrow="Step 04" title="Self-Correction Loop" description={`Bounded to ${MAX_CORRECTION_ITERATIONS} iterations, then escalates to a human.`} />
      <DemoNotice>This walkthrough uses hand-written demo states to illustrate the loop. It is not a recorded agent run.</DemoNotice>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground"><span className="mr-1.5 text-primary">{i + 1}</span>{s}</span>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-2">
          {demoAssets.map((a, idx) => {
            const v = demoVerifications[idx]!;
            return (
              <Panel key={a.id} title={idx === 0 ? "Original" : "Revised"} right={<StatusBadge status={v.overall} />}>
                <CreativeMock asset={a} profile={profile} headline={brief.message} />
                <p className="mt-3 text-xs text-muted-foreground">Prompt: {a.prompt}</p>
                <div className="mt-3 text-sm">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Violations</p>
                  {v.violations.length ? <ul className="mt-1 list-disc pl-4 text-destructive">{v.violations.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-1 text-success">None</p>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">{v.criteria.map((c) => <StatusBadge key={c.key} status={c.status} />)}</div>
              </Panel>
            );
          })}
        </div>
        <Panel title="Agent activity" className="self-start"><Timeline events={demoEvents} /></Panel>
      </div>
    </div>
  );
}
