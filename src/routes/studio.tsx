import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, AlertCircle, Download, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, CreativeMock, DemoNotice } from "@/components/app/ui-bits";
import { GenerateCreativeInputSchema, type CreativeFormat } from "@/lib/agent/schemas";
import { demoAssets } from "@/lib/agent/demo-data";
import { retainGeneratedCreative, setWorkspace, useWorkspace } from "@/lib/agent/store";
import { generateCreative } from "@/lib/agent/agent.functions";
import { profileFingerprint } from "@/lib/agent/creative-generation";
import { assetSourceLabel, buildControlledOriginal, ControlledOriginalError, isControlledOriginal } from "@/lib/agent/controlled-original";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — Brand Intelligence Agent" },
      { name: "description", content: "Write a campaign brief and generate creative for independent brand verification." },
      { property: "og:title", content: "Creative Studio" },
      { property: "og:description", content: "Generate original campaign images; compliance requires independent verification and human review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

const formats: { v: CreativeFormat; l: string }[] = [
  { v: "instagram_post", l: "Instagram post (1:1)" }, { v: "instagram_story", l: "Instagram story (9:16)" },
  { v: "facebook_feed", l: "Facebook feed (4:5)" }, { v: "display_banner", l: "Display banner (16:9)" },
];

function Studio() {
  const { profile, brief, analyzedBrand, generatedCreatives } = useWorkspace();
  const generate = useServerFn(generateCreative);
  const asset = generatedCreatives.at(-1);
  const [format, setFormat] = useState<CreativeFormat>(brief.format);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const currentAnalysis = analyzedBrand?.fingerprint === profileFingerprint(profile) ? analyzedBrand.analysis : undefined;

  function readInput(form: HTMLFormElement) {
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? "");
    return GenerateCreativeInputSchema.safeParse({ profile,
      brief: { id: crypto.randomUUID(), brandId: profile.id, objective: g("objective"), message: g("message"), targetAudience: g("audience"), format, visualDirection: g("direction") },
      analysis: currentAnalysis,
    });
  }

  async function onControlledUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    setUploadError(null);
    if (!file || !formRef.current) return;
    const parsed = readInput(formRef.current);
    if (!parsed.success) { setUploadError("Complete the campaign brief first; the controlled original is bound to it."); return; }
    try {
      const imageUrl = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error("read")); r.readAsDataURL(file); });
      const asset = buildControlledOriginal({ imageUrl, byteLength: file.size, mimeType: file.type, profile: parsed.data.profile, brief: parsed.data.brief, analysis: currentAnalysis });
      setWorkspace({ brief: parsed.data.brief, briefIsDemo: false });
      retainGeneratedCreative(asset);
    } catch (err) { setUploadError(err instanceof ControlledOriginalError ? err.message : "The file could not be read as a valid PNG."); }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    const parsed = GenerateCreativeInputSchema.safeParse({ profile,
      brief: { id: crypto.randomUUID(), brandId: profile.id, objective: g("objective"), message: g("message"), targetAudience: g("audience"), format, visualDirection: g("direction") },
      analysis: analyzedBrand?.fingerprint === profileFingerprint(profile) ? analyzedBrand.analysis : undefined,
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the brand profile and campaign brief."); return; }
    const next = parsed.data.brief;
    setWorkspace({ brief: next, briefIsDemo: false });
    setRunning(true); setError(null);
    try {
      const res = await generate({ data: parsed.data });
      if (!res.ok) setError(res.error);
      else retainGeneratedCreative(res.asset);
    } catch { setError("Could not reach the agent service."); }
    finally { setRunning(false); }
  }

  return (
    <div>
      <PageHeader eyebrow="Step 02" title="Creative Studio" description={`Campaign brief for ${profile.name}.`} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Campaign brief" className="lg:col-span-3">
          <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
            <F label="Campaign objective"><Input name="objective" defaultValue={brief.objective} required /></F>
            <F label="Campaign message"><Input name="message" defaultValue={brief.message} required /></F>
            <F label="Target audience"><Input name="audience" defaultValue={brief.targetAudience} required /></F>
            <F label="Creative format">
              <Select value={format} onValueChange={(v) => setFormat(v as CreativeFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{formats.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Visual direction"><Textarea name="direction" defaultValue={brief.visualDirection} rows={3} required /></F>
            <Button type="submit" disabled={running} size="lg" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="mr-2 h-4 w-4" />} {running ? "Generating with Muse Image…" : "Generate Creative"}
            </Button>
            {running && <p role="status" className="text-sm text-muted-foreground">Waiting for Meta’s image…</p>}
            {error && (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div role="alert"><p className="font-medium">Generation did not complete</p><p className="text-muted-foreground">{error}</p></div>
              </div>
            )}
          </form>
          <section aria-labelledby="controlled-title" className="mt-6 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
            <h3 id="controlled-title" className="flex items-center gap-2 font-semibold text-foreground"><FlaskConical className="h-4 w-4 text-warning" />Controlled Test — Deliberately Noncompliant Original</h3>
            <p className="mt-1 text-muted-foreground">For demonstrating correction only. Upload your own PNG (max 8 MB, 256–4096 px, matching the selected format’s aspect ratio). It is labeled “User-supplied controlled test image”, bound to this brief and the analyzed rules, and is never presented as Muse-generated. No Meta call is made on upload.</p>
            {!currentAnalysis && <p className="mt-2 text-warning">Analyze the current brand profile first.</p>}
            <Label className="mt-3 inline-flex">
              <span className={`inline-flex cursor-pointer items-center rounded-md border border-border bg-secondary px-3 py-2 font-medium text-secondary-foreground ${!currentAnalysis ? "pointer-events-none opacity-50" : ""}`}>Upload controlled test PNG</span>
              <input type="file" accept="image/png" className="sr-only" disabled={!currentAnalysis || running} onChange={onControlledUpload} aria-label="Upload controlled test PNG" />
            </Label>
            {uploadError && <p role="alert" className="mt-2 text-destructive">{uploadError}</p>}
          </section>
        </Panel>
        <div className="lg:col-span-2">
          {asset ? <div className="grid gap-3" aria-live="polite">
            <p role="status" className={`text-sm font-semibold ${isControlledOriginal(asset) ? "text-warning" : "text-success"}`}>{isControlledOriginal(asset) ? "Controlled test — deliberately noncompliant · " : ""}{assetSourceLabel(asset)}</p>
            <img src={asset.imageUrl} alt={`${isControlledOriginal(asset) ? "User-supplied controlled test image" : "Generated campaign creative"} for ${asset.metadata.profile.name}: ${asset.metadata.brief.message}`} className="h-auto w-full rounded-md border border-border" />
            <p className="text-xs text-muted-foreground">Original PNG · {asset.metadata.width} × {asset.metadata.height} · {new Date(asset.metadata.completedAt).toLocaleString()}</p>
            <p className="text-sm text-warning">Needs review · Brand compliance is not verified. Logo and campaign lettering require verification or deterministic post-processing.</p>
            <Button asChild variant="secondary"><a href={asset.imageUrl} download={`${asset.id}.png`}><Download className="mr-2 h-4 w-4" />Download original image</a></Button>
            <Button asChild><Link to="/verification">Verify original creative</Link></Button>
            <Button asChild variant="outline"><a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({ id: asset.id, prompt: asset.prompt, metadata: asset.metadata }, null, 2))}`} download={`${asset.id}-metadata.json`}><Download className="mr-2 h-4 w-4" />Download {isControlledOriginal(asset) ? "provenance" : "generation"} record</a></Button>
            <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Generation details</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({ prompt: asset.prompt, ...asset.metadata, profile: { ...asset.metadata.profile, logoUrl: asset.metadata.profile.logoUrl ? "[local logo not submitted]" : null } }, null, 2)}</pre></details>
            <p className="text-xs text-muted-foreground">{generatedCreatives.length} original{generatedCreatives.length === 1 ? "" : "s"} retained in this session. Download before reloading.</p>
          </div> : <>
          <DemoNotice>The preview below is a hand-made mockup showing where generated creative will appear. No image has been generated.</DemoNotice>
          {demoAssets[1] && <CreativeMock asset={demoAssets[1]} profile={profile} headline={brief.message} />}
          <Button asChild variant="secondary" className="mt-4 w-full"><Link to="/verification">View demo verification</Link></Button>
          </>}
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-muted-foreground">{label}</Label>{children}</div>;
}
