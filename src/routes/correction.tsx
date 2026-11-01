import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader } from "@/components/app/ui-bits";
import { CorrectionRunView } from "@/components/app/CorrectionRunView";
import { useWorkspace, retainCorrectionRun } from "@/lib/agent/store";
import { runCorrectionLoop } from "@/lib/agent/agent.functions";

export const Route = createFileRoute("/correction")({
  head: () => ({
    meta: [
      { title: "Self-Correction Loop — Brand Intelligence Agent" },
      { name: "description", content: "Generate, verify, identify violations, revise and verify again — in a bounded loop." },
      { property: "og:title", content: "Self-Correction Loop" },
      { property: "og:description", content: "Watch creatives get corrected against brand rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Correction,
});


function Correction() {
  const { generatedCreatives, correctionRuns } = useWorkspace();
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const invoke = useServerFn(runCorrectionLoop);
  const asset = generatedCreatives.find((a) => a.id === selected) ?? generatedCreatives.at(-1);
  const run = correctionRuns.filter((r) => r.original?.id === asset?.id).at(-1);
  async function onRun() {
    if (!asset?.metadata.analysis) return;
    setSelected(asset.id); setRunning(true); setError("");
    try { retainCorrectionRun(await invoke({ data: { original: asset, analysis: asset.metadata.analysis } })); }
    catch { setError("The correction request could not finish. The original remains unchanged; no completed run was received."); }
    finally { setRunning(false); }
  }
  return <div>
    <PageHeader eyebrow="Step 04" title="Self-Correction Loop" description="Independent verification · up to three targeted regenerations · human approval remains separate" />
    {asset ? <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={asset.id} onValueChange={(id) => { setSelected(id); setError(""); }} disabled={running}><SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger><SelectContent>{generatedCreatives.map((a,i) => <SelectItem key={a.id} value={a.id}>Creative {i+1} · {a.metadata.profile.name}</SelectItem>)}</SelectContent></Select>
        <Button onClick={onRun} disabled={running || !asset.metadata.analysis}>{running ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <WandSparkles className="mr-2 h-4 w-4" />}{running ? "Verifying and correcting…" : "Run Self-Correction"}</Button>
        {run && <Button asChild variant="outline"><Link to="/report">Open verification report</Link></Button>}
      </div>
      {running && <p role="status" className="mb-4 text-sm text-muted-foreground">Muse Spark is inspecting actual images. Evidenced violations may trigger up to three Muse Image regenerations.</p>}
      {!asset.metadata.analysis && <p className="mb-4 text-sm text-warning">No saved validated rules for this image.</p>}
      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
      {run ? <CorrectionRunView run={run} /> : <img src={asset.imageUrl} alt={`Original for ${asset.metadata.profile.name}`} className="h-auto w-full max-w-lg rounded-md border border-border" />}
    </> : <div className="border-y border-border py-8"><p className="mb-4 text-muted-foreground">No generated original in this session.</p><Button asChild><Link to="/studio">Open Creative Studio</Link></Button></div>}
  </div>;
}
