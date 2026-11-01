import { assetSourceLabel, isControlledOriginal } from "@/lib/agent/controlled-original";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader, Panel, CriterionCard, StatusBadge, CreativeMock, DemoNotice } from "@/components/app/ui-bits";
import { demoAssets, demoVerifications } from "@/lib/agent/demo-data";
import { retainVerification, useWorkspace } from "@/lib/agent/store";
import { verifyCreative } from "@/lib/agent/agent.functions";
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
  const { profile, brief, generatedCreatives, verifications } = useWorkspace();
  const [i, setI] = useState(0);
  const [view, setView] = useState<"live" | "demo">("live");
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const verify = useServerFn(verifyCreative);
  const asset = generatedCreatives.find((a) => a.id === selected) ?? generatedCreatives.at(-1);
  const result = verifications.filter((v) => v.assetId === asset?.id).at(-1);
  const v = demoVerifications[i] ?? demoVerifications[0];
  const mock = demoAssets[i] ?? demoAssets[0];

  async function onVerify() {
    if (!asset) return;
    const analysis = asset.metadata.analysis;
    if (!analysis) { setError("This original has no saved validated rules. Analyze the brand and generate a new creative first."); return; }
    setRunning(true); setError("");
    try {
      const response = await verify({ data: { asset, analysis } });
      if (response.ok) retainVerification(response.verification);
      else setError(response.error);
    } catch { setError("Verification could not be completed. No result was saved."); }
    finally { setRunning(false); }
  }
  return (
    <div>
      <PageHeader eyebrow="Step 03" title="Brand Verification" description="An independent verifier — separate from the generator — evaluates each creative against the brand profile." />
      <div className="mb-6 flex gap-2">
        <Button variant={view === "live" ? "secondary" : "outline"} onClick={() => setView("live")}>Generated originals</Button>
        <Button variant={view === "demo" ? "secondary" : "outline"} onClick={() => setView("demo")}>Demo examples</Button>
      </div>
      {view === "live" ? asset ? <>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Select value={asset.id} onValueChange={(id) => { setSelected(id); setError(""); }} disabled={running}>
            <SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger>
            <SelectContent>{generatedCreatives.map((a, index) => <SelectItem key={a.id} value={a.id}>Original {index + 1} · {a.metadata.profile.name}{isControlledOriginal(a) ? " · Controlled test (user-supplied)" : ""}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={onVerify} disabled={running || !asset.metadata.analysis}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {running ? "Inspecting original image…" : "Verify Creative"}
          </Button>
        </div>
        {!asset.metadata.analysis && <p role="alert" className="mb-4 text-sm text-warning">This original has no saved validated rules. Analyze the brand before generating a new creative.</p>}
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {running && <p role="status" className="mb-4 text-sm text-muted-foreground">Muse Spark is inspecting the actual original PNG…</p>}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <p className="text-sm font-medium text-success">Actual AI-generated original · Muse Image 1.0</p>
            <img src={asset.imageUrl} alt={`Original campaign creative for ${asset.metadata.profile.name}`} className="h-auto w-full rounded-md border border-border" />
            <p className="text-xs text-muted-foreground">{asset.metadata.width} × {asset.metadata.height} PNG · {assetSourceLabel(asset)} · Rules and brief from this original’s saved record</p>
            <Panel title="Overall status">
              <StatusBadge status={result?.overall ?? "NEEDS_REVIEW"} large />
              <p className="mt-3 text-sm text-muted-foreground">{result ? `Inspected by ${result.model}` : "Not inspected yet"}</p>
              {result && <><p className="mt-2 text-xs text-muted-foreground">{new Date(result.verifiedAt).toLocaleString()} · {result.method}</p><p className="mt-2 break-all text-xs text-muted-foreground">Original SHA-256: {result.imageSha256}</p></>}
            </Panel>
            {result && <Button asChild variant="outline" className="w-full"><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result,null,2))}`} download={`${result.id}-verification.json`}><Download className="mr-2 h-4 w-4" />Download findings</a></Button>}
          </div>
          <div className="space-y-4 lg:col-span-2" aria-live="polite">
            {result ? <>
              <p role="status" className="text-sm font-medium text-foreground">Image inspection complete · {result.findings.filter((f) => f.status === "REVISE").length} corrections · {result.findings.filter((f) => f.status === "NEEDS_REVIEW").length} human-review checks</p>
              <div className="border-b border-border pb-4"><h2 className="font-medium">Visible image observations</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{result.imageObservations.map((o) => <li key={o}>{o}</li>)}</ul></div>
              {result.findings.map((f) => <article key={f.rule_id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words font-medium">{f.criterion}</h3><StatusBadge status={f.status} /></div>
                <p className="mt-2 text-sm text-muted-foreground">{f.explanation}</p>
                <p className="mt-3 text-xs font-medium text-muted-foreground">Evidence</p>
                {f.evidence.length ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{f.evidence.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="mt-1 text-sm text-warning">No reliable evidence available — human review required.</p>}
                {f.suggested_correction && <p className="mt-3 text-sm"><span className="font-medium">Next action: </span>{f.suggested_correction}</p>}
                <p className="mt-3 text-xs text-muted-foreground">Method: {f.verification_method} · Rule: {f.rule_id}</p>
                <p className="mt-1 text-xs text-muted-foreground">Source: “{f.source_guideline}”</p>
              </article>)}
            </> : <p className="text-sm text-muted-foreground">No live findings for this original. Logo, typography and product facts require human review.</p>}
          </div>
        </div>
      </> : <div className="border-y border-border py-8"><p className="mb-4 text-muted-foreground">No generated original in this session.</p><Button asChild><Link to="/studio">Open Creative Studio</Link></Button></div> : <>
      <DemoNotice>Illustrative results written by hand. These examples are not live verification results.</DemoNotice>
      <div className="mb-6 flex gap-2">
        {demoAssets.map((a, idx) => (
          <Button key={a.id} variant="outline" onClick={() => setI(idx)} className={cn("text-sm", idx === i ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground")}>Creative v{a.iteration}</Button>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          {mock && <CreativeMock asset={mock} profile={profile} headline={brief.message} />}
          {v && <Panel title="Overall status"><StatusBadge status={v.overall} large /><p className="mt-3 text-xs text-muted-foreground">Verifier: {v.verifier}</p></Panel>}
        </div>
        <div className="space-y-4 lg:col-span-2">{v?.criteria.map((c) => <CriterionCard key={c.key} c={c} />)}</div>
      </div>
      </>}
    </div>
  );
}
