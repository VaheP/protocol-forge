"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlaskConical, Plus, Brain, ChevronRight } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500">
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children, icon }: { tone?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${tones[tone] ?? tones.neutral}`}>
      {icon}{children}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "Plan ready": "text-emerald-700",
  "Clarify": "text-amber-700",
  "Lit QC": "text-blue-700",
};

export default function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed");
      setProjects(json.projects ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    load();
    return () => { cancelled = true; };
  }, []);

  async function confirmDelete() {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Delete failed");
      setDeleteOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="px-8 pt-6 pb-12 max-w-[1100px] mx-auto fade-in">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <SectionLabel>Projects</SectionLabel>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Your lab&apos;s plans</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-600">
            All experiment plans across your workspace.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm shrink-0"
        >
          <Plus size={13} /> New plan
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-700">{error}</div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-12 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-[#2240b3] animate-spin mx-auto" />
          <div className="mt-3 text-[13px] text-slate-500">Loading projects…</div>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-12 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center mx-auto">
            <FlaskConical size={20} className="text-slate-400" />
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-slate-900">No projects yet</h3>
          <p className="mt-1.5 text-[13px] text-slate-500">Create one from a hypothesis to see it here.</p>
          <Link
            href="/new"
            className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm"
          >
            <Plus size={13} /> Start planning
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden">
          <div className="divide-y divide-[var(--line-2)]">
            {projects.map((p) => (
              <div key={p.id} className="px-5 py-4 hover:bg-slate-50/70 flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-lg bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-400 shrink-0">
                  <FlaskConical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-slate-900 truncate">
                    {p.title ?? "Untitled project"}
                  </div>
                  <div className="mt-0.5 text-[12px] text-slate-500 truncate">{p.original_hypothesis}</div>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {p.domain && <Badge tone="neutral">{p.domain}</Badge>}
                    {p.applied_rules_count > 0 && (
                      <Badge tone="violet" icon={<Brain size={10} />}>
                        {p.applied_rules_count} rule{p.applied_rules_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2">
                    <Link
                      href={p.resume?.stages?.clarify?.href ?? `/projects/${p.id}/clarify`}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium ring-1 ring-inset ring-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Clarify
                    </Link>
                    <Link
                      href={p.resume?.stages?.literature?.href ?? `/projects/${p.id}/literature`}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium ring-1 ring-inset ring-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Literature
                    </Link>
                    <Link
                      href={p.resume?.stages?.plan?.href ?? `/projects/${p.id}/plan`}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium bg-[#0b1220] text-white hover:bg-[#1a2540] transition-colors"
                    >
                      Plan
                    </Link>
                  </div>
                  <button
                    onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                    className="h-8 px-3 rounded-lg text-[12.5px] font-medium text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This will delete the project and all associated clarifications, QC results, plans, and applied rules.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[13px]">
            <div className="font-medium text-slate-900">{deleteTarget?.title ?? "Untitled project"}</div>
            <div className="mt-1 text-slate-500 line-clamp-2">{deleteTarget?.original_hypothesis}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
