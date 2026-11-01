import { assetSourceLabel } from "@/lib/agent/controlled-original";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, StatusBadge } from "./ui-bits";
import type { CorrectionRun, GeneratedCreative, LiveVerification } from "@/lib/agent/schemas";
import { latestRunAsset, latestRunVerification } from "@/lib/agent/correction";

export function Findings({ result }: { result: LiveVerification | null }) {
  if (!result) return <p className="text-sm text-warning">No completed inspection. Human review required.</p>;
  return <div className="space-y-3">
    <StatusBadge status={result.overall} />
    {result.findings.map((f) => <article key={f.rule_id} className="border-b border-border py-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-medium">{f.criterion}</h3><StatusBadge status={f.status} /></div>
      <p className="mt-2 text-sm text-muted-foreground">{f.explanation}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{f.evidence.map((e) => <li key={e}>{e}</li>)}</ul>
      {!f.evidence.length && <p className="mt-2 text-sm text-warning">No reliable evidence; human review required.</p>}
      {f.suggested_correction && <p className="mt-2 text-sm">Next action: {f.suggested_correction}</p>}
      <p className="mt-2 break-words text-xs text-muted-foreground">{f.rule_id} · {f.verification_method} · Source: {f.source_guideline}</p>
    </article>)}
    <p className="break-all text-xs text-muted-foreground">{result.model} · {result.verifiedAt} · SHA-256 {result.imageSha256}</p>
  </div>;
}

function ImageRecord({ asset, title }: { asset: GeneratedCreative | null; title: string }) {
  return <section className="min-w-0">
    <h2 className="mb-3 font-medium">{title}</h2>
    {asset ? <><img src={asset.imageUrl} alt={`${title} for ${asset.metadata.profile.name}`} className="h-auto w-full rounded-md border border-border" />
      <p className="mt-2 text-xs text-muted-foreground">{asset.metadata.width} × {asset.metadata.height} PNG · {assetSourceLabel(asset)} · {asset.metadata.completedAt}</p>
      <Button asChild variant="outline" size="sm" className="mt-3"><a href={asset.imageUrl} download={`${asset.id}.png`}><Download className="mr-2 h-4 w-4" />Download {title.toLowerCase()}</a></Button></> : <p className="text-sm text-muted-foreground">No image returned.</p>}
  </section>;
}

export function CorrectionRunView({ run, detailed = false }: { run: CorrectionRun; detailed?: boolean }) {
  const latest = latestRunAsset(run);
  const final = latestRunVerification(run);
  const original = run.originalVerification;
  const corrected = original?.findings.filter((f) => f.status === "REVISE" && final?.findings.some((n) => n.rule_id === f.rule_id && n.status === "PASS")) ?? [];
  const remaining = final?.findings.filter((f) => f.status === "REVISE") ?? [];
  const review = final?.findings.filter((f) => f.status === "NEEDS_REVIEW") ?? [];
  return <div className="space-y-6">
    <div role="status" className="flex flex-wrap items-center gap-3 border-y border-border py-4"><StatusBadge status={run.finalStatus} /><span className="text-sm">{run.attempts.length} correction attempts · {run.stopReason.replaceAll("_", " ")}</span><span className="text-xs text-muted-foreground">Targeted regeneration · not direct image editing</span></div>
    {run.error && <p role="alert" className="text-sm text-destructive">{run.error}</p>}
    <div className="grid gap-6 md:grid-cols-2"><ImageRecord asset={run.original} title="Original" /><ImageRecord asset={latest} title="Latest creative" /></div>
    <div className="grid gap-6 md:grid-cols-3">
      {[{ title: "Corrected violations", findings: corrected }, { title: "Remaining violations", findings: remaining }, { title: "Human-review requirements", findings: review }].map(({ title, findings }) => <section key={title} className="min-w-0 border-t border-border pt-4"><h2 className="font-medium">{title} · {findings.length}</h2><ul className="mt-2 space-y-2 text-sm text-muted-foreground">{findings.map((f) => <li key={f.rule_id}>{f.rule_id} · {f.criterion}</li>)}</ul></section>)}
    </div>
    <Panel title="Agent activity"><ol className="space-y-4">{run.events.map((e) => <li key={e.id} className="border-l-2 border-primary pl-4"><p className="text-sm font-medium">{e.stage} · attempt {e.attempt}</p><p className="mt-1 text-sm text-muted-foreground">{e.message}</p><p className="mt-1 break-words text-xs text-muted-foreground">{e.at} {e.model && `· ${e.model}`} {e.ruleIds.length > 0 && `· ${e.ruleIds.join(", ")}`}</p></li>)}</ol></Panel>
    <div className="grid items-start gap-6 md:grid-cols-2"><Panel title="Original verification"><Findings result={original} /></Panel><Panel title="Latest verification"><Findings result={final} /></Panel></div>
    {detailed && run.attempts.map((a) => <section key={a.number} className="border-t border-border pt-5"><h2 className="font-medium">Correction attempt {a.number} · {a.mode}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{a.plan.rationale}</p><p className="mt-1 text-xs text-muted-foreground">Muse Spark 1.3 · {a.plannedAt} · response {a.planResponseId} · previous image {a.previousAssetId}</p>
      <ul className="my-4 list-disc space-y-2 pl-5 text-sm">{a.plan.changes.map((c) => <li key={c.rule_id}>{c.rule_id}: {c.instruction}</li>)}</ul>
      <details className="mb-4 text-sm"><summary>Preserved compliant attributes</summary><ul className="mt-2 space-y-2">{a.plan.preserve.map((p) => <li key={p.rule_id}>{p.rule_id}: {p.attribute}</li>)}</ul></details>
      {a.asset && <Button asChild size="sm" variant="outline" className="mb-4"><a href={a.asset.imageUrl} download={`${a.asset.id}.png`}><Download className="mr-2 h-4 w-4" />Download attempt {a.number}</a></Button>}
      {a.error && <p className="mb-4 text-sm text-destructive">{a.error}</p>}<Findings result={a.verification} /></section>)}
  </div>;
}