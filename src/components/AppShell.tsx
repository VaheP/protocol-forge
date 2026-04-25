"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Atom, Plus, Layers, Brain, Bell, Search, ChevronRight,
  FlaskConical, BookOpen, MessageSquare
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: Atom, exact: true },
  { href: "/new", label: "New plan", icon: Plus, exact: true },
  { href: "/projects", label: "Projects", icon: Layers, exact: false },
  { href: "/memory", label: "Skill memory", icon: Brain, exact: true },
];

const RECENT = [
  { title: "Aptamer-FET CRP biosensor — whole-blood validation", domain: "Diagnostics", updated: "2 h ago" },
  { title: "HeLa cryopreservation: DMSO + trehalose blend", domain: "Cell Biology", updated: "yesterday" },
  { title: "CO₂ → acetate bioelectrochemical reactor", domain: "Bioelectrochem.", updated: "3 d ago" },
];

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-[244px] shrink-0 border-r border-[var(--line)] bg-white/70 backdrop-blur-sm flex flex-col h-full overflow-y-auto scrollbar-slim">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-[#0b1220] grid place-items-center">
          <FlaskConical size={14} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight text-slate-900">ProtocolForge</div>
          <div className="font-mono-design text-[10.5px] text-slate-500 uppercase tracking-[0.14em]">AI · v0.4</div>
        </div>
      </div>

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

      <nav className="px-2 mt-2 flex flex-col gap-0.5 shrink-0">
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
              <Ic
                size={14}
                className={active ? "text-[#2240b3]" : "text-slate-400 group-hover:text-slate-600"}
              />
              <span className="flex-1">{n.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-[#6d3ad6]" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 mt-5 shrink-0">
        <div className="px-2 pb-1.5">
          <SectionLabel>Recent projects</SectionLabel>
        </div>
        {RECENT.map((p) => (
          <Link
            key={p.title}
            href="/projects"
            className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-slate-50 group block"
          >
            <div className="text-[12.5px] text-slate-700 line-clamp-1 group-hover:text-slate-900">{p.title}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono-design text-[10.5px] text-slate-400 uppercase tracking-wider">{p.domain}</span>
              <span className="text-slate-300">·</span>
              <span className="text-[10.5px] text-slate-400">{p.updated}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-auto p-3 shrink-0">
        <div className="rounded-xl ring-1 ring-violet-200 bg-violet-50/60 p-3">
          <div className="flex items-center gap-1.5">
            <Brain size={13} className="text-violet-700" />
            <SectionLabel className="!text-violet-700">Skill memory</SectionLabel>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-tight text-violet-900">3</span>
            <span className="text-[11px] text-violet-700/80">active rules</span>
          </div>
          <div className="text-[11px] text-violet-700/80">applied in 7 plans</div>
        </div>
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
            <span className={i === trail.length - 1 ? "text-slate-900 font-medium" : "text-slate-500"}>
              {t}
            </span>
            {i < trail.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg ring-1 ring-slate-200 bg-white pl-2.5 pr-1.5 h-9 w-[280px]">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            placeholder="Search hypotheses, rules, references…"
            className="flex-1 outline-none bg-transparent text-sm placeholder:text-slate-400"
          />
          <span className="font-mono-design text-[10px] text-slate-400 ring-1 ring-slate-200 rounded px-1.5 py-0.5">⌘K</span>
        </div>
        <button className="inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:bg-slate-50 relative">
          <Bell size={14} />
          <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-[#2240b3] text-white text-[9px] flex items-center justify-center font-medium px-1">3</span>
        </button>
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
