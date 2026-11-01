import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, Panel, DemoBadge } from "@/components/app/ui-bits";
import { BrandProfileSchema, type BrandProfile } from "@/lib/agent/schemas";
import { setWorkspace, useWorkspace } from "@/lib/agent/store";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Brand Intelligence — Brand Intelligence Agent" },
      { name: "description", content: "Define brand identity, colors, guidelines and forbidden elements as a structured profile." },
      { property: "og:title", content: "Brand Intelligence" },
      { property: "og:description", content: "Build a structured Brand Identity Profile." },
    ],
  }),
  component: BrandPage,
});

const list = (s: string) => s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function BrandPage() {
  const { profile, profileIsDemo } = useWorkspace();
  const [logo, setLogo] = useState<string | null>(profile.logoUrl);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    const draft: BrandProfile = {
      id: crypto.randomUUID(), name: g("name"), description: g("description"), industry: g("industry"),
      targetAudience: g("audience"), personality: list(g("personality")), colors: list(g("colors")).map((c) => c.toUpperCase()),
      guidelines: list(g("guidelines")), forbiddenElements: list(g("forbidden")), logoUrl: logo,
    };
    const r = BrandProfileSchema.safeParse(draft);
    if (!r.success) { toast.error(r.error.issues[0]?.message ?? "Invalid profile"); return; }
    setWorkspace({ profile: r.data, profileIsDemo: false });
    toast.success("Brand Identity Profile saved");
  }

  return (
    <div>
      <PageHeader eyebrow="Step 01" title="Brand Intelligence" description="Describe the brand. The profile is structured directly from your input — no AI analysis runs yet." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Brand input" className="lg:col-span-3">
          <form onSubmit={onSubmit} className="grid gap-4" key={profile.id}>
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
            <Button type="submit" className="bg-brand-gradient text-primary-foreground hover:opacity-90">Save Brand Profile</Button>
          </form>
        </Panel>

        <Panel title="Brand Identity Profile" className="lg:col-span-2 self-start" right={profileIsDemo ? <DemoBadge /> : undefined}>
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
