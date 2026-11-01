import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload, ArrowRight, Sparkles, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, DemoBadge } from "@/components/app/ui-bits";
import { BrandProfileSchema, BrandAnalysisInputSchema, type BrandAnalysis, type BrandProfile } from "@/lib/agent/schemas";
import { analyzeBrand } from "@/lib/agent/agent.functions";
import { setWorkspace, useWorkspace } from "@/lib/agent/store";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand Intelligence — Brand Intelligence Agent" },
      { name: "description", content: "Define brand identity, colors, guidelines and forbidden elements as a structured profile." },
      { property: "og:title", content: "Brand Intelligence" },
      { property: "og:description", content: "Build a structured Brand Identity Profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandPage,
});

const list = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function BrandPage() {
  const { profile, profileIsDemo } = useWorkspace();
  const [logo, setLogo] = useState<string | null>(profile.logoUrl);
  const formRef = useRef<HTMLFormElement>(null);
  const analyze = useServerFn(analyzeBrand);
  const [analysis, setAnalysis] = useState<BrandAnalysis | null>(null);
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [analysisError, setAnalysisError] = useState("");
  const requestVersion = useRef(0);

  function invalidateAnalysis() {
    requestVersion.current += 1;
    setAnalysis(null);
    setRequestStatus("idle");
    setAnalysisError("");
  }

  function readDraft(form: HTMLFormElement): BrandProfile {
    const f = new FormData(form);
    const g = (k: string) => String(f.get(k) ?? "");
    return {
      id: crypto.randomUUID(), name: g("name"), description: g("description"), industry: g("industry"),
      targetAudience: g("audience"), personality: list(g("personality")), colors: list(g("colors")).map((c) => c.toUpperCase()),
      guidelines: list(g("guidelines")), forbiddenElements: list(g("forbidden")), logoUrl: logo,
    };
  }

  async function onAnalyze() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const parsed = BrandAnalysisInputSchema.safeParse(readDraft(form));
    setAnalysis(null);
    if (!parsed.success) {
      setRequestStatus("error");
      setAnalysisError(parsed.error.issues[0]?.message ?? "Invalid brand profile");
      return;
    }
    const version = ++requestVersion.current;
    setRequestStatus("loading");
    setAnalysisError("");
    try {
      const result = await analyze({ data: parsed.data });
      if (version !== requestVersion.current) return;
      if (!result.ok) { setRequestStatus("error"); setAnalysisError(result.error); return; }
      setAnalysis(result.analysis);
      setRequestStatus("success");
    } catch {
      if (version !== requestVersion.current) return;
      setRequestStatus("error");
      setAnalysisError("Brand analysis could not be completed. Please try again.");
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const draft = readDraft(e.currentTarget);
    const r = BrandProfileSchema.safeParse(draft);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Invalid profile"); return; }
    setWorkspace({ profile: r.data, profileIsDemo: false });
    toast.success("Brand Identity Profile saved");
  }

  return (
    <div>
      <PageHeader eyebrow="Step 01" title="Brand Intelligence" />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Brand input" className="lg:col-span-3">
          <form ref={formRef} onSubmit={onSubmit} onChange={invalidateAnalysis} className="grid gap-4" key={profile.id}>
            <div className="grid gap-4 sm:grid-cols-2">
              <F label="Brand name"><Input name="name" defaultValue={profile.name} required /></F>
              <F label="Industry"><Input name="industry" defaultValue={profile.industry} /></F>
            </div>
            <F label="Brand description"><Textarea name="description" defaultValue={profile.description} rows={3} /></F>
            <F label="Target audience"><Input name="audience" defaultValue={profile.targetAudience} /></F>
            <F label="Brand personality (comma separated)"><Input name="personality" defaultValue={profile.personality.join(", ")} /></F>
            <F label="Brand colors (HEX, comma separated)"><Input name="colors" defaultValue={profile.colors.join(", ")} placeholder="#1F3B2D, #E8DCC4" /></F>
            <F label="Brand guidelines (one per line)"><Textarea name="guidelines" defaultValue={profile.guidelines.join("\n")} rows={3} /></F>
            <F label="Forbidden visual elements (one per line)"><Textarea name="forbidden" defaultValue={profile.forbiddenElements.join("\n")} rows={3} /></F>
            <F label="Logo">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground hover:border-primary/50">
                {logo ? <img src={logo} alt="Logo" className="h-10 w-10 rounded object-contain" /> : <Upload className="h-5 w-5" />}
                {logo ? "Replace logo" : "Upload PNG, SVG or JPG"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setLogo(URL.createObjectURL(file)); }} />
              </label>
            </F>
            <Button type="submit" disabled={requestStatus === "loading"} className="bg-brand-gradient text-primary-foreground hover:opacity-90">Save Brand Profile</Button>
            <Button type="button" variant="secondary" disabled={requestStatus === "loading"} onClick={onAnalyze}>
              {requestStatus === "loading" ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {requestStatus === "loading" ? "Analyzing brand…" : "Analyze Brand with AI"}
            </Button>
          </form>
        </Panel>

        <Panel title="Brand Identity Profile" className="lg:col-span-2 self-start" right={profileIsDemo ? <DemoBadge /> : undefined}>
          <p className="mb-3 text-xs font-medium text-muted-foreground">User-entered profile{profileIsDemo ? " · fictional sample" : ""}</p>
          <div className="flex items-center gap-3">
            {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-10 w-10 rounded object-contain" /> : <div className="grid h-10 w-10 place-items-center rounded bg-secondary text-sm font-semibold text-foreground">{profile.name.slice(0, 1)}</div>}
            <div><p className="font-semibold text-foreground">{profile.name}</p><p className="text-xs text-muted-foreground">{profile.industry}</p></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{profile.description}</p>
          <Row k="Audience">{profile.targetAudience}</Row>
          <Row k="Personality"><div className="flex flex-wrap gap-1.5">{profile.personality.map((p) => <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{p}</span>)}</div></Row>
          <Row k="Palette"><div className="flex gap-2">{profile.colors.map((c) => <div key={c} className="text-center"><div className="h-9 w-9 rounded-md border border-border" style={{ background: c }} /><p className="mt-1 text-[10px] text-muted-foreground">{c}</p></div>)}</div></Row>
          <Row k="Guidelines"><ul className="list-disc pl-4">{profile.guidelines.map((g) => <li key={g}>{g}</li>)}</ul></Row>
          <Row k="Forbidden"><ul className="list-disc pl-4 text-destructive">{profile.forbiddenElements.map((g) => <li key={g}>{g}</li>)}</ul></Row>
          <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">View JSON</summary><pre className="mt-2 overflow-auto rounded bg-background p-3 text-muted-foreground">{JSON.stringify({ ...profile, logoUrl: profile.logoUrl ? "[uploaded]" : null }, null, 2)}</pre></details>
          <div aria-live="polite" aria-busy={requestStatus === "loading"} className="mt-5 border-t border-border pt-5">
            {requestStatus === "loading" && <p role="status" className="text-sm text-muted-foreground">Waiting for Muse Spark 1.3…</p>}
            {requestStatus === "error" && <p role="alert" className="text-sm text-destructive">{analysisError}</p>}
            {analysis && <div className="min-w-0 break-words">
              <p role="status" className="text-sm font-semibold text-success">AI analysis complete · Muse Spark 1.3</p>
              <Row k="AI brand name">{analysis.brand_name}</Row>
              <Row k="AI brand personality">{analysis.brand_personality.join(", ")}</Row>
              <Row k="AI approved colors">{analysis.approved_colors.join(", ")}</Row>
              <Row k="AI prohibited elements">{analysis.prohibited_elements.join(", ") || "None supplied"}</Row>
              <Row k="AI verification rules"><ol className="space-y-4">{analysis.verification_rules.map((rule) => <li key={rule.id} className="border-l-2 border-primary pl-3">
                <p className="font-medium">{rule.criterion}</p>
                <p className="mt-1">{rule.expected_result}</p>
                <p className="mt-1 text-muted-foreground">Method: {rule.verification_method}</p>
                <p className="mt-1 text-xs text-muted-foreground">Source: “{rule.source_guideline}”</p>
              </li>)}</ol></Row>
              <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">View AI JSON</summary><pre className="mt-2 max-h-80 overflow-auto rounded bg-background p-3 text-muted-foreground">{JSON.stringify(analysis, null, 2)}</pre></details>
            </div>}
          </div>
          <Button asChild variant="secondary" className="mt-5 w-full"><Link to="/studio">Continue to Creative Studio <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </Panel>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-muted-foreground">{label}</Label>{children}</div>;
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return <div className="mt-4 text-sm text-foreground"><p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">{k}</p>{children}</div>;
}
