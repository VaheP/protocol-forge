"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Plus, ArrowRight } from "lucide-react";

const SKILL_RULES = [
  {
    id: "rule-001", n: 1, title: "Whole-blood biosensor validation",
    domain: "Diagnostics", expType: "Whole-blood electrochemical biosensor", section: "Validation",
    rule: "For whole-blood electrochemical biosensors, validation must include whole-blood matrix testing and anti-fouling controls, not serum-only validation.",
    keywords: ["whole blood", "biosensor", "electrochemical", "anti-fouling"],
    appliedCount: 3, createdAt: "Apr 12, 2026",
  },
  {
    id: "rule-002", n: 2, title: "Cryopreservation recovery timepoints",
    domain: "Cell Biology", expType: "Cryopreservation", section: "Validation",
    rule: "Cryopreservation experiments should measure viability immediately after thaw and again after a 24-hour recovery period.",
    keywords: ["cryopreservation", "viability", "thaw", "24-hour recovery"],
    appliedCount: 2, createdAt: "Apr 18, 2026",
  },
  {
    id: "rule-003", n: 3, title: "Mouse gut permeability quality controls",
    domain: "Animal Study", expType: "Gut permeability", section: "Controls / Validation",
    rule: "Mouse gut permeability studies should include randomisation, appropriate controls, animal ethics notes, and FITC-dextran dosing rationale.",
    keywords: ["mouse", "gut permeability", "FITC-dextran", "randomisation", "ethics"],
    appliedCount: 2, createdAt: "Apr 22, 2026",
  },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Diagnostics": "bg-blue-50 text-blue-700 ring-blue-200",
  "Cell Biology": "bg-teal-50 text-teal-700 ring-teal-200",
  "Animal Study": "bg-violet-50 text-violet-700 ring-violet-200",
};

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children }: { tone?: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    teal: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  );
}

function RuleCard({ rule }: { rule: (typeof SKILL_RULES)[0] }) {
  const domainClass = DOMAIN_COLORS[rule.domain] ?? "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-design text-[10px] text-slate-400 uppercase tracking-wider">Rule {String(rule.n).padStart(3, "0")}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset ${domainClass}`}>
              {rule.domain}
            </span>
            <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-slate-100 text-slate-700 ring-slate-200">
              {rule.section}
            </span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold text-slate-900">{rule.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">{rule.rule}</p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[22px] font-semibold text-slate-900 leading-none">{rule.appliedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">plans</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--line-2)] flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {rule.keywords.slice(0, 4).map((k) => (
            <span key={k} className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-slate-100 text-slate-600 ring-slate-200">
              {k}
            </span>
          ))}
        </div>
        <span className="font-mono-design text-[10px] text-slate-400 shrink-0">{rule.createdAt}</span>
      </div>
    </div>
  );
}

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<string>("");
  const [view, setView] = useState<"cards" | "markdown">("cards");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/memory");
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        if (!cancelled) setMemory(json.memory_md ?? "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="px-8 pt-6 pb-12 max-w-[1100px] mx-auto fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Skill memory</SectionLabel>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Expert feedback memory</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-600">
            Reusable rules distilled from scientist corrections — retrieval-based learning, no fine-tuning.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm shrink-0"
        >
          <Plus size={13} /> New plan
        </Link>
      </div>

      {/* Stats bar */}
      <div className="mb-6 rounded-2xl bg-violet-50 ring-1 ring-violet-200 p-5 flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-100 ring-1 ring-violet-200 grid place-items-center">
            <Brain size={18} className="text-violet-700" />
          </div>
          <div>
            <div className="text-[22px] font-semibold text-violet-900 leading-none">{SKILL_RULES.length}</div>
            <div className="text-[11px] text-violet-700 mt-0.5">active rules</div>
          </div>
        </div>
        <div className="h-8 w-px bg-violet-200" />
        <div>
          <div className="text-[22px] font-semibold text-violet-900 leading-none">
            {SKILL_RULES.reduce((s, r) => s + r.appliedCount, 0)}
          </div>
          <div className="text-[11px] text-violet-700 mt-0.5">total applications</div>
        </div>
        <div className="h-8 w-px bg-violet-200" />
        <div>
          <div className="text-[22px] font-semibold text-violet-900 leading-none">3</div>
          <div className="text-[11px] text-violet-700 mt-0.5">domains covered</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setView("cards")}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors ${
              view === "cards" ? "bg-violet-700 text-white" : "text-violet-700 hover:bg-violet-100"
            }`}
          >
            Rules
          </button>
          <button
            onClick={() => setView("markdown")}
            className={`h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors ${
              view === "markdown" ? "bg-violet-700 text-white" : "text-violet-700 hover:bg-violet-100"
            }`}
          >
            SKILL.md
          </button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="space-y-4">
          {SKILL_RULES.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
        </div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-6">
          <SectionLabel>SKILL.md</SectionLabel>
          {loading ? (
            <div className="mt-4 text-[13px] text-slate-500">Loading memory…</div>
          ) : error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-700">{error}</div>
          ) : (
            <pre className="mt-4 whitespace-pre-wrap font-mono-design text-[12.5px] leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-5 ring-1 ring-slate-200 overflow-x-auto">
              {memory || "No memory file found. Rules will appear here after saving expert feedback."}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
