"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlaskConical, ChevronRight, Brain, Plus, ArrowRight } from "lucide-react";

type Stage = { done: boolean; href: string };
type Project = {
  id: string;
  title: string | null;
  original_hypothesis: string;
  domain: string | null;
  created_at: string;
  resume: {
    stages: { clarify: Stage; literature: Stage; plan: Stage };
    next: { href: string; label: string };
  };
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 h ago" : `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusFromResume(stages: Project["resume"]["stages"]): { label: string; color: string } {
  if (stages.plan.done) return { label: "Plan ready", color: "text-emerald-700" };
  if (stages.literature.done) return { label: "Generate plan", color: "text-blue-700" };
  if (stages.clarify.done) return { label: "Literature QC", color: "text-blue-700" };
  return { label: "Clarify", color: "text-amber-700" };
}

function Badge({ tone = "neutral", children, icon }: { tone?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-50 text-violet-700 ring-violet-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset whitespace-nowrap ${tones[tone] ?? tones.neutral}`}>
      {icon}{children}
    </span>
  );
}

export function RecentProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((json) => {
        if (json.projects) setProjects(json.projects.slice(0, 5));
        else setError(json.error ?? "Failed to load");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="col-span-12 lg:col-span-8 rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <div className="font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500">Recent plans</div>
          <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Across your lab</div>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-[12px] text-blue-700 hover:text-blue-800 hover:underline underline-offset-2"
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="px-5 py-8 flex items-center gap-3 text-[13px] text-slate-500">
          <span className="h-4 w-4 rounded-full border-2 border-slate-200 border-t-[#2240b3] animate-spin shrink-0" />
          Loading projects…
        </div>
      ) : error ? (
        <div className="px-5 py-4 text-[13px] text-rose-600">{error}</div>
      ) : projects.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="h-10 w-10 rounded-xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center mx-auto">
            <FlaskConical size={16} className="text-slate-400" />
          </div>
          <p className="mt-3 text-[13px] text-slate-500">No plans yet.</p>
          <Link
            href="/new"
            className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-[#2240b3] hover:underline underline-offset-2"
          >
            <Plus size={12} /> Start your first plan
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[var(--line-2)]">
          {projects.map((p) => {
            const status = statusFromResume(p.resume.stages);
            return (
              <Link
                key={p.id}
                href={p.resume.next.href}
                className="px-5 py-3.5 hover:bg-slate-50/70 flex items-center gap-4 group"
              >
                <div className="h-10 w-10 rounded-lg bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-500 shrink-0">
                  <FlaskConical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-900 truncate">
                    {p.title ?? p.original_hypothesis}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                    {p.domain && <Badge tone="neutral">{p.domain}</Badge>}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className={`text-[12px] font-medium ${status.color}`}>{status.label}</div>
                  <div className="font-mono-design text-[10.5px] text-slate-400 uppercase tracking-wider mt-0.5">
                    {relativeTime(p.created_at)}
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
