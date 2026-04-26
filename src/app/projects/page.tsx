"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FlaskConical, Plus, Brain, ChevronRight, FileText, Sparkles, ArrowUpRight, Trash2 } from "lucide-react";

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

function stageBadge(stage: string | null | undefined) {
  const s = String(stage ?? "");
  if (s === "plan") return { label: "Plan ready", tone: "green" as const };
  if (s === "literature") return { label: "Literature QC", tone: "amber" as const };
  return { label: "Clarify", tone: "amber" as const };
}

export default function ProjectsPage() {
  const reduceMotion = useReducedMotion();
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
      const res = await fetch("/api/projects", { cache: "no-store" });
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
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Your projects</h1>
          <p className="mt-1.5 text-[13.5px] text-slate-600">
            A <span className="font-medium text-slate-800">project</span> is your research question + context. A{" "}
            <span className="font-medium text-slate-800">plan</span> is a specific generated draft for that project (you can create multiple).
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm shrink-0"
        >
          <Plus size={13} /> New plan
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-12 gap-4">
        <div className="col-span-12 md:col-span-7">
          <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5 relative overflow-hidden">
            <div className="absolute inset-0 dot-bg opacity-[0.10] pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-50 ring-1 ring-violet-200 grid place-items-center shrink-0">
                <Sparkles size={18} className="text-violet-700" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-slate-900">Think in “projects”, iterate with “plans”</div>
                <div className="mt-1 text-[12.5px] text-slate-600 leading-relaxed">
                  Open a project to continue where you left off. When you regenerate, you’ll create a <span className="font-medium text-slate-800">new plan draft</span> under the same project.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-5">
          <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
            <SectionLabel>Quick counts</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[22px] font-semibold tracking-tight text-slate-900 leading-none">{loading ? "—" : projects.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">projects</div>
              </div>
              <div>
                <div className="text-[22px] font-semibold tracking-tight text-slate-900 leading-none">
                  {loading ? "—" : projects.filter((p) => Boolean(p?.resume?.stages?.plan?.done)).length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">with a plan draft</div>
              </div>
            </div>
          </div>
        </div>
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
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {projects.map((p, idx) => {
            const nextStage = p?.resume?.next?.stage ?? null;
            const badge = stageBadge(nextStage);
            const openHref = p?.resume?.next?.href ?? `/projects/${p.id}/clarify`;
            const planHref = p?.resume?.stages?.plan?.href ?? `/projects/${p.id}/plan`;
            const hasPlan = Boolean(p?.resume?.stages?.plan?.done);
            return (
              <motion.div
                key={p.id}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: reduceMotion ? 0 : Math.min(idx * 0.03, 0.18), ease: [0.22, 1, 0.36, 1] }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-2xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-500 shrink-0">
                        <FlaskConical size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-slate-900 truncate">{p.title ?? "Untitled project"}</div>
                        <div className="mt-0.5 text-[12px] text-slate-500 line-clamp-2">{p.original_hypothesis}</div>
                      </div>
                    </div>
                    <Badge tone={badge.tone}>
                      <span className={STATUS_COLORS[badge.label] ?? ""}>{badge.label}</span>
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {p.domain && <Badge tone="neutral">{p.domain}</Badge>}
                    {p.applied_rules_count > 0 && (
                      <Badge tone="violet" icon={<Brain size={10} />}>
                        {p.applied_rules_count} rule{p.applied_rules_count > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Badge tone="neutral" icon={<FileText size={10} />}>
                      {hasPlan ? "has a plan draft" : "no plan yet"}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[var(--line-2)] flex items-center justify-between gap-2">
                    <Link
                      href={openHref}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium bg-[#0b1220] text-white hover:bg-[#1a2540] transition-colors"
                    >
                      Continue <ArrowUpRight size={13} className="text-white/70" />
                    </Link>
                    <div className="flex items-center gap-2">
                      <Link
                        href={planHref}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium ring-1 ring-inset ring-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Open latest plan <ChevronRight size={14} className="text-slate-400" />
                      </Link>
                      <button
                        onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 transition-colors"
                        title="Delete project"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
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
