import type { ReactNode } from "react";
import { FlaskConical, CheckCircle2, AlertTriangle, Eye, Circle } from "lucide-react";
import type { AgentEvent, CreativeAsset, BrandProfile, CriterionResult, VerificationStatus } from "@/lib/agent/schemas";
import { CRITERIA_LABELS } from "@/lib/agent/schemas";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className, right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-6", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
      <FlaskConical className="h-3 w-3" /> {label}
    </span>
  );
}

export function DemoNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-foreground">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>{children}</div>
    </div>
  );
}

const statusStyle: Record<VerificationStatus, string> = {
  PASS: "border-success/40 bg-success/10 text-success",
  REVISE: "border-destructive/40 bg-destructive/10 text-destructive",
  NEEDS_REVIEW: "border-warning/40 bg-warning/10 text-warning",
};
export function StatusBadge({ status, large }: { status: VerificationStatus; large?: boolean }) {
  const Icon = status === "PASS" ? CheckCircle2 : status === "REVISE" ? AlertTriangle : Eye;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-semibold", statusStyle[status], large ? "px-4 py-1.5 text-sm" : "px-2.5 py-0.5 text-xs")}>
      <Icon className={large ? "h-4 w-4" : "h-3 w-3"} /> {status.replace("_", " ")}
    </span>
  );
}

export function CriterionCard({ c }: { c: CriterionResult }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">{CRITERIA_LABELS[c.key]}</h3>
        <StatusBadge status={c.status} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{c.explanation}</p>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Evidence</p><ul className="mt-1 list-disc pl-4 text-foreground/90">{c.evidence.map((e) => <li key={e}>{e}</li>)}</ul></div>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Findings</p><ul className="mt-1 list-disc pl-4 text-foreground/90">{c.findings.map((e) => <li key={e}>{e}</li>)}</ul></div>
      </div>
    </div>
  );
}

/** Placeholder render of a creative — a labeled mockup, not a generated image. */
export function CreativeMock({ asset, profile, headline }: { asset: CreativeAsset; profile: BrandProfile; headline: string }) {
  const [c1, c2, c3] = profile.colors;
  const off = asset.iteration === 1;
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
      {asset.imageUrl ? (
        <img src={asset.imageUrl} alt={`Creative v${asset.iteration}`} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-end p-5"
          style={{ background: off ? `linear-gradient(160deg, #39FF14 0%, ${c3 ?? "#f60"} 60%, #111 100%)` : `linear-gradient(170deg, ${c2 ?? "#ddd"} 0%, ${c1 ?? "#234"} 75%)` }}
        >
          <p className="text-2xl font-semibold" style={{ color: off ? "#fff" : (c2 ?? "#fff"), fontFamily: "var(--font-display)" }}>{headline}</p>
          <p className="mt-1 text-xs" style={{ color: off ? "#fff" : (c2 ?? "#fff"), opacity: 0.8 }}>{profile.name}</p>
        </div>
      )}
      <span className="absolute left-3 top-3 rounded bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground">v{asset.iteration}</span>
      {asset.source === "demo" && <span className="absolute right-3 top-3"><DemoBadge label="Mockup" /></span>}
    </div>
  );
}

const levelColor: Record<AgentEvent["level"], string> = { info: "text-primary", success: "text-success", warning: "text-warning", error: "text-destructive" };
export function Timeline({ events }: { events: AgentEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((e) => (
        <li key={e.id} className="flex gap-3">
          <Circle className={cn("mt-1 h-3 w-3 shrink-0 fill-current", levelColor[e.level])} />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{e.message}</p>
            <p className="text-xs text-muted-foreground">{e.at} · {e.stage}{e.source === "demo" && " · demo"}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
