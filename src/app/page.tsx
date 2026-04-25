import Link from "next/link";
import {
  Plus, Brain, BookOpen, MessageSquare, Layers, Shield, Check,
  ArrowRight, ChevronRight, FlaskConical, Sparkles
} from "lucide-react";

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Badge({ tone = "neutral", children, icon }: { tone?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
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

const WORKFLOW_STEPS = [
  { label: "Hypothesis" },
  { label: "Clarify" },
  { label: "Literature QC" },
  { label: "Plan" },
  { label: "Expert Review" },
  { label: "Skill Memory" },
];

const RECENT = [
  {
    id: "p1", title: "Aptamer-FET CRP biosensor — whole-blood validation", domain: "Diagnostics",
    novelty: "similar", status: "Plan ready", updated: "2 h ago", applied: 1,
  },
  {
    id: "p2", title: "HeLa cryopreservation: DMSO + trehalose blend", domain: "Cell Biology",
    novelty: "not-found", status: "Clarify", updated: "yesterday", applied: 1,
  },
  {
    id: "p3", title: "CO₂ → acetate bioelectrochemical reactor (mixed culture)", domain: "Bioelectrochem.",
    novelty: "similar", status: "Lit QC", updated: "3 d ago", applied: 0,
  },
];

const PILLARS = [
  {
    icon: BookOpen, title: "Literature QC", tone: "blue",
    body: "Check whether the exact or similar experiment has already been done — traffic-light novelty with references.",
  },
  {
    icon: MessageSquare, title: "Protocol Clarifier", tone: "teal",
    body: "Ask 4–5 targeted scientific questions before searching, so the plan locks to your real intent.",
  },
  {
    icon: Layers, title: "Operational Plan", tone: "indigo",
    body: "Generate protocol, materials, budget, timeline, validation, controls, and risks — in one document.",
  },
  {
    icon: Brain, title: "Expert Memory", tone: "violet",
    body: "Convert scientist text-level corrections into reusable skill rules. Future plans inherit them.",
  },
];

const PILLAR_TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-700",
  indigo: "bg-indigo-50 text-indigo-700",
  violet: "bg-violet-50 text-violet-700",
};

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400" style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono-design text-xs tabular-nums text-slate-700">{value}%</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      <div className="text-[22px] font-semibold tracking-tight text-slate-900 leading-none">{value}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="px-8 pt-6 pb-12 max-w-[1280px] mx-auto fade-in">
      {/* Hero */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-3xl bg-white ring-1 ring-[var(--line)] soft-shadow p-7 relative overflow-hidden">
            <div className="absolute inset-0 grid-bg pointer-events-none opacity-50" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-800 px-2.5 py-1 text-[11px] font-medium">
                <Sparkles size={11} /> Scientist-in-the-loop · v0.4
              </div>
              <h1 className="mt-5 text-[42px] leading-[1.05] tracking-tight font-semibold text-slate-900">
                From hypothesis<br />to{" "}
                <span className="font-serif-design italic text-[#2240b3]">lab-ready</span> experiment plan.
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600 max-w-[520px]">
                Generate operational experiment plans with literature QC, supplier grounding, budget estimates,
                timelines, validation plans, and scientist-in-the-loop learning.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/new"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm"
                >
                  <Plus size={14} /> Start planning
                </Link>
                <Link
                  href="/memory"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-white text-slate-900 text-sm font-medium ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Brain size={14} /> View skill memory
                </Link>
              </div>

              <div className="mt-7 pt-5 border-t border-[var(--line-2)]">
                <SectionLabel>Workflow</SectionLabel>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto scrollbar-slim pb-1">
                  {WORKFLOW_STEPS.map((s, i) => (
                    <span key={s.label} className="inline-flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 whitespace-nowrap bg-white text-slate-500 ring-slate-200">
                        <span className="h-4 w-4 rounded-full bg-slate-100 grid place-items-center text-[10px] font-medium">{i + 1}</span>
                        <span className="font-medium">{s.label}</span>
                      </span>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <ChevronRight size={12} className="text-slate-300 shrink-0" />
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applied Expert Memory dark card */}
        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-3xl bg-gradient-to-br from-[#0b1220] to-[#1a2540] text-white p-6 soft-shadow ring-1 ring-slate-900 h-full relative overflow-hidden">
            <div className="absolute inset-0 dot-bg opacity-[0.18] pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] ring-1 ring-white/15 px-2.5 py-1 text-[11px] text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-300 pulse-violet" /> Live preview
                </div>
                <span className="font-mono-design text-[10px] text-white/40 uppercase tracking-[0.18em]">Plan view</span>
              </div>

              <div className="mt-4 rounded-xl bg-violet-500/15 ring-1 ring-violet-400/30 p-4">
                <div className="flex items-center gap-2 text-violet-200">
                  <Brain size={14} />
                  <span className="font-mono-design text-[11px] uppercase tracking-[0.16em]">Applied Expert Memory</span>
                </div>
                <p className="mt-2 text-[14px] leading-relaxed text-white/95">
                  Mouse gut permeability studies should include randomisation, appropriate control groups,
                  animal ethics notes, and{" "}
                  <span className="underline decoration-violet-300/70 underline-offset-2">FITC-dextran dosing rationale</span>.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-violet-200/90">
                  <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-violet-400/15 text-violet-100 ring-violet-400/30">
                    Rule 003
                  </span>
                  <span>Applied to: Controls, Validation</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[12.5px] font-medium text-white/90">
                    LGG supplementation and intestinal permeability in C57BL/6 mice
                  </div>
                  <span className="inline-flex items-center rounded-full px-2 py-[3px] text-[11px] font-medium ring-1 ring-inset bg-amber-400/15 text-amber-200 ring-amber-400/30">
                    Similar work
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-white/70">
                  <div>
                    <div className="font-mono-design text-white/40 uppercase tracking-wider text-[10px]">Steps</div>
                    <div className="text-white text-base font-medium">8</div>
                  </div>
                  <div>
                    <div className="font-mono-design text-white/40 uppercase tracking-wider text-[10px]">Materials</div>
                    <div className="text-white text-base font-medium">7</div>
                  </div>
                  <div>
                    <div className="font-mono-design text-white/40 uppercase tracking-wider text-[10px]">Confidence</div>
                    <div className="text-white text-base font-medium">82%</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {[90, 75, 82, 60, 55, 40].map((w, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: "linear-gradient(90deg,#a48aff,#6d3ad6)" }} />
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-[11px] text-white/50 leading-relaxed">
                Future similar plans automatically inherit applied skill rules — the platform learns from corrections.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active rules", value: "3" },
          { label: "Plans drafted", value: "12" },
          { label: "Applied in plans", value: "7" },
          { label: "Avg. plan confidence", value: "78%" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
            <Stat label={s.label} value={s.value} />
            {s.label === "Avg. plan confidence" && (
              <div className="mt-3"><ConfidenceBar value={78} /></div>
            )}
            {s.label !== "Avg. plan confidence" && (
              <div className="mt-3">
                <span className="text-[11px] text-slate-500">+{s.label === "Active rules" ? "1" : s.label === "Plans drafted" ? "3" : "2"} this week</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Capabilities */}
      <div className="mt-8">
        <div className="flex items-end justify-between mb-3">
          <div>
            <SectionLabel>Capabilities</SectionLabel>
            <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
              Four pillars of operational planning
            </h2>
          </div>
          <span className="text-[12px] text-slate-500 hidden sm:block">Each step grounded, traceable, and reviewable.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PILLARS.map((f) => {
            const Ic = f.icon;
            return (
              <div key={f.title} className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5 hover:lift-shadow transition-shadow">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${PILLAR_TONES[f.tone]}`}>
                  <Ic size={16} />
                </div>
                <div className="mt-4 text-[15px] font-semibold text-slate-900">{f.title}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent plans + Safety */}
      <div className="mt-8 grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <SectionLabel>Recent plans</SectionLabel>
              <div className="mt-0.5 text-[15px] font-semibold text-slate-900">Across your lab</div>
            </div>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 text-[12px] text-blue-700 hover:text-blue-800 hover:underline underline-offset-2"
            >
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-[var(--line-2)]">
            {RECENT.map((p) => (
              <div key={p.id} className="px-5 py-3.5 hover:bg-slate-50/70 cursor-pointer flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-500 shrink-0">
                  <FlaskConical size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium text-slate-900 truncate">{p.title}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <Badge tone="neutral">{p.domain}</Badge>
                    <Badge tone={p.novelty === "not-found" ? "green" : "amber"}>
                      {p.novelty === "not-found" ? "Novel" : "Similar work"}
                    </Badge>
                    {p.applied > 0 && (
                      <Badge tone="violet" icon={<Brain size={10} />}>
                        {p.applied} applied rule{p.applied > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[12px] text-slate-500">{p.status}</div>
                  <div className="font-mono-design text-[10.5px] text-slate-400 uppercase tracking-wider mt-0.5">{p.updated}</div>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 rounded-2xl bg-amber-50/30 ring-1 ring-amber-100 soft-shadow p-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 grid place-items-center shrink-0">
              <Shield size={14} />
            </div>
            <div className="text-[13px] font-semibold text-slate-900">Safety & review</div>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-700">
            ProtocolForge produces planning drafts only. Every plan must be reviewed by a qualified scientist,
            institutional ethics board, and relevant safety personnel before execution. The system flags ethics,
            biosafety, and animal welfare considerations explicitly.
          </p>
          <ul className="mt-3 space-y-1.5 text-[12px] text-slate-700">
            {["IACUC / IRB ethics annotation", "Supplier evidence required", "PI sign-off step on every plan"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check size={12} className="text-emerald-600 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
