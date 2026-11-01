import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, CreativeMock, DemoNotice } from "@/components/app/ui-bits";
import { CreativeBriefSchema, type CreativeFormat } from "@/lib/agent/schemas";
import { demoAssets } from "@/lib/agent/demo-data";
import { setWorkspace, useWorkspace } from "@/lib/agent/store";
import { runCreativeAgent } from "@/lib/agent/agent.functions";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Creative Studio — Brand Intelligence Agent" },
      { name: "description", content: "Write a campaign brief and generate brand-verified creative." },
      { property: "og:title", content: "Creative Studio" },
      { property: "og:description", content: "Turn a campaign brief into verified creative." },
    ],
  }),
  component: Studio,
});

const formats: { v: CreativeFormat; l: string }[] = [
  { v: "instagram_post", l: "Instagram post (1:1)" }, { v: "instagram_story", l: "Instagram story (9:16)" },
  { v: "facebook_feed", l: "Facebook feed (4:5)" }, { v: "display_banner", l: "Display banner (16:9)" },
];

function Studio() {
  const { profile, brief } = useWorkspace();
  const [format, setFormat] = useState<CreativeFormat>(brief.format);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? "");
    const next = CreativeBriefSchema.parse({ id: crypto.randomUUID(), brandId: profile.id, objective: g("objective"), message: g("message"), targetAudience: g("audience"), format, visualDirection: g("direction") });
    setWorkspace({ brief: next, briefIsDemo: false });
    setRunning(true); setError(null);
    try {
      const res = await runCreativeAgent({ data: { profile, brief: next } });
      if (!res.ok) setError(res.error);
    } catch { setError("Could not reach the agent service."); }
    finally { setRunning(false); }
  }

  return (
    <div>
      <PageHeader eyebrow="Step 02" title="Creative Studio" description={`Campaign brief for ${profile.name}.`} />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Campaign brief" className="lg:col-span-3">
          <form onSubmit={onSubmit} className="grid gap-4">
            <F label="Campaign objective"><Input name="objective" defaultValue={brief.objective} required /></F>
            <F label="Campaign message"><Input name="message" defaultValue={brief.message} required /></F>
            <F label="Target audience"><Input name="audience" defaultValue={brief.targetAudience} /></F>
            <F label="Creative format">
              <Select value={format} onValueChange={(v) => setFormat(v as CreativeFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{formats.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Visual direction"><Textarea name="direction" defaultValue={brief.visualDirection} rows={3} /></F>
            <Button type="submit" disabled={running} size="lg" className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} Generate Creative
            </Button>
            {error && (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div><p className="font-medium">Generation did not run</p><p className="text-muted-foreground">{error}</p></div>
              </div>
            )}
          </form>
        </Panel>
        <div className="lg:col-span-2">
          <DemoNotice>The preview below is a hand-made mockup showing where generated creative will appear. No image has been generated.</DemoNotice>
          <CreativeMock asset={demoAssets[1]!} profile={profile} headline={brief.message} />
          <Button asChild variant="secondary" className="mt-4 w-full"><Link to="/verification">View demo verification</Link></Button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-muted-foreground">{label}</Label>{children}</div>;
}
