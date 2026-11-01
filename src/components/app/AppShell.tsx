import { Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Fingerprint, Palette, ShieldCheck, RefreshCcw, FileText, Sparkles } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/brand", label: "Brand Intelligence", icon: Fingerprint },
  { to: "/studio", label: "Creative Studio", icon: Palette },
  { to: "/verification", label: "Brand Verification", icon: ShieldCheck },
  { to: "/correction", label: "Self-Correction Loop", icon: RefreshCcw },
  { to: "/report", label: "Verification Report", icon: FileText },
] as const;

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <Brand />
        <nav className="mt-10 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto text-xs text-muted-foreground">Meta Global AI Developer Hackathon 2026 · Startup Track</p>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur lg:hidden">
          <div className="px-4 py-3"><Brand /></div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
            {nav.map(({ to, label }) => (
              <Link key={to} to={to} activeOptions={{ exact: to === "/" }} className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs text-muted-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>{label}</Link>
            ))}
          </nav>
        </header>
        <main className="bg-glow min-h-screen px-5 py-8 md:px-10 md:py-12"><div className="mx-auto max-w-6xl"><Outlet /></div></main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="bg-brand-gradient grid h-8 w-8 place-items-center rounded-lg"><Sparkles className="h-4 w-4 text-primary-foreground" /></span>
      <span className="leading-tight"><span className="block text-sm font-semibold text-foreground">Brand Intelligence</span><span className="block text-xs text-muted-foreground">Agent</span></span>
    </Link>
  );
}
