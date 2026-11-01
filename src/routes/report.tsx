import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader, Panel } from "@/components/app/ui-bits";
import { CorrectionRunView } from "@/components/app/CorrectionRunView";
import { approveCorrectionRun, useWorkspace } from "@/lib/agent/store";
import { correctionReport } from "@/lib/agent/correction";

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
  const { correctionRuns, runApprovals } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const run = correctionRuns.find((r) => r.id === selected) ?? correctionRuns.at(-1);
  const approval = run ? runApprovals[run.id] ?? "pending" : "pending";
  function downloadReport() {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(correctionReport(run, approval), null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${run.id}-correction-report.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div>
    <PageHeader eyebrow="Step 05" title="Verification Report" description={run ? run.label : "No live correction report in this session"} />
    {run ? <>
      <div className="mb-6 flex flex-wrap items-center gap-3"><Select value={run.id} onValueChange={setSelected}><SelectTrigger className="w-full sm:w-96"><SelectValue /></SelectTrigger><SelectContent>{correctionRuns.map((r,i) => <SelectItem key={r.id} value={r.id}>Run {i+1} · {r.label}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={downloadReport}><Download className="mr-2 h-4 w-4" />Download report</Button></div>
      <Panel title="Human approval" className="mb-6"><p className="mb-3 text-sm">Decision: <span className="capitalize">{approval}</span> · independent of the AI verdict</p><div className="flex gap-2"><Button size="sm" onClick={() => approveCorrectionRun(run.id, "approved")}><Check className="mr-2 h-4 w-4" />Approve</Button><Button size="sm" variant="secondary" onClick={() => approveCorrectionRun(run.id, "rejected")}><X className="mr-2 h-4 w-4" />Reject</Button></div></Panel>
      <CorrectionRunView run={run} detailed />
    </> : <div className="border-y border-border py-8"><p className="mb-4 text-muted-foreground">No completed correction run. Reports and approval decisions are retained only in this session.</p><Button asChild><Link to="/correction">Open Self-Correction</Link></Button></div>}
  </div>;
}
