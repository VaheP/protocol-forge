"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Plus, Trash2 } from "lucide-react";

type SkillRule = {
  id: string;
  source_comment_id: string | null;
  domain: string | null;
  experiment_type: string | null;
  section: string | null;
  rule_text: string | null;
  keywords: string[] | null;
  severity: string | null;
  active: boolean;
  created_at: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  Diagnostics: "bg-blue-50 text-blue-700 ring-blue-200",
  "Cell Biology": "bg-teal-50 text-teal-700 ring-teal-200",
  "Animal Study": "bg-violet-50 text-violet-700 ring-violet-200",
  General: "bg-slate-100 text-slate-700 ring-slate-200",
};

function domainClass(domain: string | null) {
  return DOMAIN_COLORS[domain ?? ""] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function relativeDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function RuleCard({
  rule,
  index,
  onDelete,
  deleting,
}: {
  rule: SkillRule;
  index: number;
  onDelete: () => void;
  deleting: boolean;
}) {
  const canDelete = Boolean(rule.source_comment_id);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-design text-[10px] text-slate-400 uppercase tracking-wider">
              Rule {String(index + 1).padStart(3, "0")}
            </span>
            {rule.domain && (
              <span className={`inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset ${domainClass(rule.domain)}`}>
                {rule.domain}
              </span>
            )}
            {rule.section && (
              <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-slate-100 text-slate-700 ring-slate-200">
                {rule.section}
              </span>
            )}
            {rule.severity && (
              <span className={`inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset ${
                rule.severity === "High" ? "bg-red-50 text-red-700 ring-red-200" :
                rule.severity === "Medium" ? "bg-orange-50 text-orange-700 ring-orange-200" :
                "bg-yellow-50 text-yellow-700 ring-yellow-200"
              }`}>
                {rule.severity}
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-700">{rule.rule_text ?? "—"}</p>
        </div>

        {canDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            title="Remove from global memory (rule becomes inactive)"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg ring-1 ring-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {rule.keywords && rule.keywords.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--line-2)] flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {rule.keywords.slice(0, 5).map((k) => (
              <span key={k} className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-slate-100 text-slate-600 ring-slate-200">
                {k}
              </span>
            ))}
          </div>
          <span className="font-mono-design text-[10px] text-slate-400 shrink-0">{relativeDate(rule.created_at)}</span>
        </div>
      )}
    </div>
  );
}

export default function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<SkillRule[]>([]);
  const [memoryMd, setMemoryMd] = useState<string>("");
  const [view, setView] = useState<"cards" | "markdown">("cards");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/memory", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        if (!cancelled) {
          setRules((json.rules ?? []).filter((r: SkillRule) => r.active));
          setMemoryMd(json.memory_md ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const activeRules = rules.filter((r) => r.active);

  async function deleteRule(id: string) {
    const ok = window.confirm("Delete this global memory rule? (It will be deactivated, not erased.)");
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/skill-rules/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Delete failed");
      setRules((prev) => prev.filter((r) => r.id !== id));
      try {
        window.dispatchEvent(new CustomEvent("pf:memory-updated", { detail: { deleted_rule_id: id } }));
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-8 pt-6 pb-12 max-w-[1100px] mx-auto fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Skill memory</SectionLabel>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Your reusable notes</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-600">
            Short rules distilled from what you’ve saved on plans. New plans can reuse these automatically.
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
            <div className="text-[22px] font-semibold text-violet-900 leading-none">
              {loading ? "—" : activeRules.length}
            </div>
            <div className="text-[11px] text-violet-700 mt-0.5">active rules</div>
          </div>
        </div>
        <div className="h-8 w-px bg-violet-200" />
        <div>
          <div className="text-[22px] font-semibold text-violet-900 leading-none">
            {loading ? "—" : new Set(activeRules.map((r) => r.domain).filter(Boolean)).size}
          </div>
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

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-700">{error}</div>
      )}

      {view === "cards" ? (
        loading ? (
          <div className="text-[13px] text-slate-500">Loading rules…</div>
        ) : activeRules.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-8 text-center">
            <Brain size={24} className="text-slate-300 mx-auto mb-3" />
            <div className="text-[15px] font-medium text-slate-700">No reusable notes yet</div>
            <div className="mt-1 text-[13px] text-slate-500">
              In any plan, select text and save a comment as a global rule to build your memory.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeRules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                deleting={deletingId === rule.id}
                onDelete={() => deleteRule(rule.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-6">
          <SectionLabel>SKILL.md</SectionLabel>
          {loading ? (
            <div className="mt-4 text-[13px] text-slate-500">Loading memory…</div>
          ) : (
            <pre className="mt-4 whitespace-pre-wrap font-mono-design text-[12.5px] leading-relaxed text-slate-700 bg-slate-50 rounded-xl p-5 ring-1 ring-slate-200 overflow-x-auto">
              {memoryMd || "No memory file found. Rules will appear here after saving expert feedback."}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
