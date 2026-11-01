import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Fingerprint, Palette, ShieldCheck, RefreshCcw, FileText, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/app/ui-bits";
import { getProviderStatus } from "@/lib/agent/agent.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Brand Intelligence Agent" },
      { name: "description", content: "AI workspace that turns brand identity into verified, self-corrected marketing creative." },
      { property: "og:title", content: "Brand Intelligence Agent" },
      { property: "og:description", content: "From Brand Identity to Verified Creative." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const stages = [
  { to: "/brand", icon: Fingerprint, title: "Understand", text: "Build a structured Brand Identity Profile." },
  { to: "/studio", icon: Palette, title: "Generate", text: "Turn a campaign brief into creative." },
  { to: "/verification", icon: ShieldCheck, title: "Verify", text: "Independently check brand consistency." },
  { to: "/correction", icon: RefreshCcw, title: "Self-correct", text: "Revise violations in a bounded loop." },
  { to: "/report", icon: FileText, title: "Report", text: "Evidence, history and human approval." },
] as const;

function Dashboard() {
  const { data: providers } = useQuery({ queryKey: ["providers"], queryFn: () => getProviderStatus() });
  return (
    <div>
      <section className="rounded-2xl border border-border bg-card/60 p-8 shadow-elegant md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Brand Intelligence Agent</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground md:text-6xl">
          From Brand Identity to <span className="text-gradient">Verified Creative</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Generation is easy. Trust is hard. This agent generates creative, verifies it against your brand with an independent checker, and corrects what fails.
        </p>
        <Button asChild size="lg" className="bg-brand-gradient mt-8 text-primary-foreground shadow-elegant hover:opacity-90">
          <Link to="/brand">Create New Brand Project <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </section>

      <h2 className="mb-4 mt-12 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Workflow</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stages.map((s, i) => (
          <Link key={s.to} to={s.to} className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between"><s.icon className="h-5 w-5 text-primary" /><span className="text-xs text-muted-foreground">0{i + 1}</span></div>
            <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
          </Link>
        ))}
      </div>

      <Panel title="Integration status" className="mt-12">
        <div className="grid gap-3 md:grid-cols-3">
          {(providers ?? []).map((p) => (
            <div key={p.name} className="rounded-lg border border-border bg-background/40 p-4">
              <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-foreground">{p.name}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{p.role}</p>
              <p className={`mt-3 text-xs font-medium ${p.keyPresent ? "text-warning" : "text-muted-foreground"}`}>
                {p.keyPresent ? p.implemented ? "Live integration · key configured" : "Key present · adapter not yet implemented" : "Not configured"}
              </p>
            </div>
          ))}
          {!providers && <p className="text-sm text-muted-foreground">Checking…</p>}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Actual AI analysis and generated images are labeled separately. Verification, corrections and reports remain demo data.</p>
      </Panel>
    </div>
  );
}
