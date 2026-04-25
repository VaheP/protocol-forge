"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Atom, FlaskConical } from "lucide-react";

const examples = [
  {
    id: "crp",
    label: "CRP biosensor",
    domain: "Diagnostics",
    hypothesis:
      "A paper-based electrochemical biosensor functionalized with anti-CRP antibodies will detect C-reactive protein in whole blood at concentrations below 0.5 mg/L within 10 minutes, matching laboratory ELISA sensitivity without requiring sample preprocessing."
  },
  {
    id: "lgg",
    label: "LGG gut permeability",
    domain: "Animal Study",
    hypothesis:
      "Supplementing C57BL/6 mice with Lactobacillus rhamnosus GG for 4 weeks will reduce intestinal permeability by at least 30% compared to controls, measured by FITC-dextran assay."
  },
  {
    id: "hela",
    label: "HeLa cryopreservation",
    domain: "Cell Biology",
    hypothesis:
      "Replacing sucrose with trehalose as a cryoprotectant in the freezing medium will increase post-thaw viability of HeLa cells by at least 15 percentage points compared to the standard DMSO protocol."
  },
  {
    id: "co2",
    label: "CO₂ → acetate",
    domain: "Bioelectrochemistry",
    hypothesis:
      "A mixed-culture bioelectrochemical reactor at –0.8 V vs Ag/AgCl will achieve a CO₂-to-acetate Faradaic efficiency ≥45% over 14 days under continuous operation."
  }
];

const PARSED_FIELDS = [
  { k: "Domain", v: "Gut health / animal study" },
  { k: "Experiment type", v: "Probiotic intervention study" },
  { k: "Model", v: "C57BL/6 mice (n≈24, both sexes)" },
  { k: "Intervention", v: "L. rhamnosus GG, daily oral gavage, 4 weeks" },
  { k: "Primary outcome", v: "≥30% reduction in intestinal permeability" },
  { k: "Assay", v: "FITC-dextran serum fluorescence" },
  { k: "Mechanism", v: "Claudin-1 and occludin upregulation" },
  { k: "Control", v: "Untreated or vehicle-treated controls" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono-design text-[10.5px] uppercase tracking-[0.14em] text-slate-500">
      {children}
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();
  const [hypothesis, setHypothesis] = useState(examples[1].hypothesis);
  const [selectedId, setSelectedId] = useState("lgg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => hypothesis.trim().length >= 10 && !loading, [hypothesis, loading]);
  const showParsed = selectedId === "lgg";

  function selectExample(ex: (typeof examples)[0]) {
    setSelectedId(ex.id);
    setHypothesis(ex.hypothesis);
  }

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hypothesis })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed");
      router.push(`/projects/${json.project.id}/clarify`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-8 pt-6 pb-12 max-w-[900px] mx-auto fade-in">
      <div className="mb-6">
        <SectionLabel>New experiment plan</SectionLabel>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-slate-900">Enter your hypothesis</h1>
        <p className="mt-1.5 text-[13.5px] text-slate-600">
          We&apos;ll parse it, ask 3–5 clarifying questions, run literature QC, and generate an operational plan.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: hypothesis input */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Example chips */}
          <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
            <SectionLabel>Example hypotheses</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => selectExample(ex)}
                  disabled={loading}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-medium ring-1 ring-inset transition-colors ${
                    selectedId === ex.id
                      ? "bg-[#0b1220] text-white ring-[#0b1220]"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <FlaskConical size={12} className={selectedId === ex.id ? "text-white/70" : "text-slate-400"} />
                  {ex.label}
                  <span className={`font-mono-design text-[10px] ${selectedId === ex.id ? "text-white/50" : "text-slate-400"}`}>
                    {ex.domain}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Hypothesis textarea */}
          <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5">
            <SectionLabel>Hypothesis</SectionLabel>
            <div className="mt-3">
              <Textarea
                value={hypothesis}
                onChange={(e) => { setHypothesis(e.target.value); setSelectedId(""); }}
                rows={6}
                className="resize-none text-[14px] leading-relaxed border-slate-200 focus:ring-[#2240b3] focus:border-[#2240b3]"
                placeholder="Enter a scientific hypothesis…"
                disabled={loading}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono-design">{hypothesis.length} chars</span>
              <span className="text-[11px] text-slate-400">Min. 10 chars</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-[13px] text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onAnalyze}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[#0b1220] text-white text-sm font-medium hover:bg-[#1a2540] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing…
                </>
              ) : "Analyze hypothesis"}
            </button>
            <p className="text-[11.5px] text-slate-500 leading-snug">
              Mock mode works without keys; add Supabase / Tavily / LLM keys for real evidence grounding.
            </p>
          </div>
        </div>

        {/* Right: parsed preview (shown for lgg example) */}
        {showParsed && (
          <div className="col-span-12 lg:col-span-4">
            <div className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5 sticky top-4">
              <SectionLabel>Parsed fields</SectionLabel>
              <p className="mt-1 text-[11.5px] text-slate-500">Auto-extracted from hypothesis</p>
              <div className="mt-4 space-y-3">
                {PARSED_FIELDS.map((f) => (
                  <div key={f.k}>
                    <div className="font-mono-design text-[10px] text-slate-400 uppercase tracking-wider">{f.k}</div>
                    <div className="mt-0.5 text-[12.5px] text-slate-800">{f.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--line-2)]">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 ring-1 ring-violet-200 text-violet-700 px-2 py-[3px] text-[11px] font-medium">
                  <Atom size={10} /> Skill rule 003 will apply
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
