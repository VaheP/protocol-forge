"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Atom, Plus, Layers, Brain, ChevronRight, FlaskConical } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Project = {
  id: string;
  title: string | null;
  original_hypothesis: string;
  domain: string | null;
  created_at: string;
  resume: {
    next: { href: string };
  };
};

const NAV = [
  { href: "/", label: "Dashboard", icon: Atom, exact: true },
  { href: "/new", label: "New plan", icon: Plus, exact: true },
  { href: "/projects", label: "Projects", icon: Layers, exact: false },
  { href: "/memory", label: "Skill memory", icon: Brain, exact: true },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 h ago" : `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeRuleCount, setActiveRuleCount] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => { if (json.projects) setProjects(json.projects); })
      .catch(() => {});
  }, [pathname]); // refetch when navigating so sidebar stays fresh

  useEffect(() => {
    async function refreshCount() {
      try {
        const res = await fetch("/api/memory", { cache: "no-store" });
        const json = await res.json();
        const rules = Array.isArray(json.rules) ? json.rules : [];
        setActiveRuleCount(rules.filter((x: any) => x?.active).length);
      } catch {
        // ignore
      }
    }

    refreshCount();

    function onMemoryUpdated() {
      refreshCount();
    }

    window.addEventListener("pf:memory-updated", onMemoryUpdated as any);
    return () => window.removeEventListener("pf:memory-updated", onMemoryUpdated as any);
  }, [pathname]);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="w-[244px] shrink-0 border-r border-[var(--line)] bg-white/70 backdrop-blur-sm flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-[#0b1220] grid place-items-center">
          <FlaskConical size={14} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">ProtocolForge</div>
          <div className="font-mono-design text-[10.5px] text-slate-500 uppercase tracking-[0.14em]">AI · v0.4</div>
        </div>
      </div>

      {/* New plan button */}
      <div className="px-3 pt-1 pb-2 shrink-0">
        <Link
          href="/new"
          className="w-full inline-flex items-center justify-between gap-2 rounded-lg bg-[#0b1220] text-white h-9 px-3 text-sm font-medium hover:bg-[#1a2540] transition-colors"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={14} /> New experiment plan
          </span>
          <span className="font-mono-design text-[10px] text-white/60 ring-1 ring-white/15 rounded px-1.5 py-0.5">N</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="px-2 mt-2 flex flex-col gap-0.5 shrink-0 pb-1">
        <div className="px-2 pb-1.5">
          <SectionLabel>Workflow</SectionLabel>
        </div>
        {NAV.map((n) => {
          const Ic = n.icon;
          const active = isActive(n.href, n.exact);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`group flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13.5px] transition-colors ${
                active
                  ? "bg-slate-100 text-slate-900 font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Ic size={14} className={active ? "text-[#2240b3]" : "text-slate-400 group-hover:text-slate-600"} />
              <span className="flex-1">{n.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-[#6d3ad6]" />}
            </Link>
          );
        })}
      </nav>

      {/* Recent projects — scrollable, fills remaining space */}
      <div className="flex flex-col min-h-0 flex-1 mt-5">
        <div className="px-4 pb-1.5 shrink-0">
          <SectionLabel>Recent projects</SectionLabel>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-slim px-2 pb-2">
          {projects.length === 0 ? (
            <div className="px-2.5 py-2 text-[12px] text-slate-400">No projects yet</div>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={p.resume.next.href}
                className="block px-2.5 py-1.5 rounded-md hover:bg-slate-50 group"
              >
                <div className="text-[12.5px] text-slate-700 line-clamp-1 group-hover:text-slate-900">
                  {p.title ?? p.original_hypothesis}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {p.domain && (
                    <span className="font-mono-design text-[10.5px] text-slate-400 uppercase tracking-wider truncate">
                      {p.domain}
                    </span>
                  )}
                  {p.domain && <span className="text-slate-300">·</span>}
                  <span className="text-[10.5px] text-slate-400 shrink-0">{relativeTime(p.created_at)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Skill memory widget — pinned to bottom */}
      <div className="p-3 shrink-0">
        <Link href="/memory" className="block rounded-xl ring-1 ring-violet-200 bg-violet-50/60 p-3 hover:bg-violet-50 transition-colors">
          <div className="flex items-center gap-1.5">
            <Brain size={13} className="text-violet-700" />
            <SectionLabel className="!text-violet-700">Skill memory</SectionLabel>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={activeRuleCount == null ? "na" : String(activeRuleCount)}
                initial={reduceMotion ? false : { y: -6, opacity: 0, filter: "blur(2px)", scale: 0.98 }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }}
                exit={reduceMotion ? undefined : { y: 6, opacity: 0, filter: "blur(2px)", scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="text-[20px] font-semibold tracking-tight text-violet-900 tabular-nums"
              >
                {activeRuleCount == null ? "—" : activeRuleCount}
              </motion.span>
            </AnimatePresence>
            <span className="text-[11px] text-violet-700/80">active rules</span>
          </div>
          <div className="text-[11px] text-violet-700/80">applied via retrieval in new plans</div>
        </Link>
      </div>
    </aside>
  );
}

function getBreadcrumb(pathname: string): string[] {
  if (pathname === "/") return ["Workspace", "Dashboard"];
  if (pathname === "/new") return ["Workspace", "New plan"];
  if (pathname === "/projects") return ["Workspace", "Projects"];
  if (pathname === "/memory") return ["Workspace", "Skill memory"];
  if (pathname.includes("/clarify")) return ["Workspace", "Project", "Clarify"];
  if (pathname.includes("/literature")) return ["Workspace", "Project", "Literature QC"];
  if (pathname.includes("/plan")) return ["Workspace", "Project", "Experiment plan"];
  return ["Workspace"];
}

function Topbar({ pathname }: { pathname: string }) {
  const trail = getBreadcrumb(pathname);
  return (
    <div className="h-14 px-6 border-b border-[var(--line)] bg-white/70 backdrop-blur-sm flex items-center justify-between sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        {trail.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className={i === trail.length - 1 ? "text-slate-900 font-medium" : "text-slate-500"}>{t}</span>
            {i < trail.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white text-[11px] font-medium ring-1 ring-slate-200">
          RK
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
      <Sidebar pathname={pathname} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar pathname={pathname} />
        <main className="flex-1 overflow-y-auto scrollbar-slim">
          {children}
        </main>
      </div>
    </div>
  );
}
