"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Atom, CheckCircle2, ChevronRight, FlaskConical, Sparkles, Wand2 } from "lucide-react";

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

type ClarifyingQuestion = { id: string; question_text: string; options: string[] };

function isoNow() {
  return new Date().toISOString();
}

function softScrollIntoView(el: HTMLElement | null) {
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch {
    el.scrollIntoView();
  }
}

export default function NewProjectPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [hypothesis, setHypothesis] = useState(examples[1].hypothesis);
  const [selectedId, setSelectedId] = useState("lgg");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => hypothesis.trim().length >= 10 && !loading, [hypothesis, loading]);
  const showParsed = selectedId === "lgg";

  const [projectId, setProjectId] = useState<string | null>(null);
  const [parsed, setParsed] = useState<any>(null);

  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarifyError, setClarifyError] = useState<string | null>(null);
  const [needsClarification, setNeedsClarification] = useState<boolean | null>(null);
  const [clarifyRationale, setClarifyRationale] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clarificationsSavedAt, setClarificationsSavedAt] = useState<string | null>(null);

  const [qcLoading, setQcLoading] = useState(false);
  const [qcError, setQcError] = useState<string | null>(null);
  const [qc, setQc] = useState<any>(null);
  const [qcRefs, setQcRefs] = useState<any[]>([]);
  const [qcDoneAt, setQcDoneAt] = useState<string | null>(null);

  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const step2Ref = useRef<HTMLDivElement | null>(null);
  const step3Ref = useRef<HTMLDivElement | null>(null);
  const step4Ref = useRef<HTMLDivElement | null>(null);

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
      setProjectId(json.project.id);
      setParsed(json.parsed ?? null);
      setNeedsClarification(null);
      setClarifyRationale(null);
      setQuestions([]);
      setAnswers({});
      setClarificationsSavedAt(null);
      setQc(null);
      setQcRefs([]);
      setQcDoneAt(null);
      setPlanError(null);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadClarifyingQuestions(pid: string) {
    setClarifyLoading(true);
    setClarifyError(null);
    try {
      const res = await fetch("/api/clarifying-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: pid, parsed })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to generate questions");
      setNeedsClarification(Boolean(json.needs_clarification));
      setClarifyRationale(json.rationale ?? null);
      setQuestions((json.questions ?? []) as ClarifyingQuestion[]);
      setAnswers({});
      setClarificationsSavedAt(null);
      queueMicrotask(() => softScrollIntoView(step2Ref.current));
    } catch (e: any) {
      setClarifyError(e?.message ?? String(e));
    } finally {
      setClarifyLoading(false);
    }
  }

  async function saveClarifications() {
    if (!projectId) return;
    setClarifyLoading(true);
    setClarifyError(null);
    try {
      const payload = questions
        .filter((q) => Boolean(answers[q.id]))
        .map((q) => ({
          question_id: q.id,
          question_text: q.question_text,
          selected_answer: answers[q.id]
        }));

      if (needsClarification && payload.length < questions.length) {
        throw new Error("Please answer all questions to continue.");
      }

      if (payload.length) {
        const res = await fetch("/api/save-clarifications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project_id: projectId, answers: payload })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? "Failed to save clarifications");
      }

      setClarificationsSavedAt(isoNow());
      queueMicrotask(() => softScrollIntoView(step3Ref.current));
    } catch (e: any) {
      setClarifyError(e?.message ?? String(e));
    } finally {
      setClarifyLoading(false);
    }
  }

  async function runLiteratureQc() {
    if (!projectId) return;
    setQcLoading(true);
    setQcError(null);
    try {
      const res = await fetch("/api/literature-qc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "QC failed");
      setQc(json.literature_qc);
      setQcRefs(json.references ?? []);
      setQcDoneAt(isoNow());
      queueMicrotask(() => softScrollIntoView(step4Ref.current));
    } catch (e: any) {
      setQcError(e?.message ?? String(e));
    } finally {
      setQcLoading(false);
    }
  }

  async function generatePlan() {
    if (!projectId) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: projectId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Plan generation failed");
      router.push(`/projects/${json.project.id}/plan?plan_id=${json.plan.id}`);
    } catch (e: any) {
      setPlanError(e?.message ?? String(e));
    } finally {
      setPlanLoading(false);
    }
  }

  useEffect(() => {
    if (!projectId) return;
    loadClarifyingQuestions(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const step1Done = Boolean(projectId);
  const step2Done = needsClarification === false || (needsClarification === true && Boolean(clarificationsSavedAt));
  const step3Done = Boolean(qcDoneAt);
  const step4Ready = step3Done;

  return (
    <div className="px-8 pt-6 pb-14 max-w-[980px] mx-auto fade-in">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <SectionLabel>Plan Builder</SectionLabel>
            <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-slate-900">
              One page. Four steps. A plan you can run.
            </h1>
            <p className="mt-1.5 text-[13.5px] text-slate-600 max-w-[70ch]">
              The page expands as you progress: hypothesis → clarifications → evidence scan → generation.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500">
            {[
              { label: "Hypothesis", done: step1Done },
              { label: "Clarify", done: step2Done },
              { label: "Literature", done: step3Done },
              { label: "Generate", done: step4Ready }
            ].map((s) => (
              <span
                key={s.label}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ring-1 ring-inset ${
                  s.done ? "bg-emerald-50 ring-emerald-200 text-emerald-700" : "bg-white ring-slate-200"
                }`}
              >
                <CheckCircle2 size={12} className={s.done ? "" : "opacity-30"} /> {s.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: hypothesis input */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Example chips */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5"
          >
            <SectionLabel>Example hypotheses</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => selectExample(ex)}
                  disabled={loading || step1Done}
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
          </motion.div>

          {/* Hypothesis textarea */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <SectionLabel>Hypothesis</SectionLabel>
                {projectId && (
                  <div className="mt-1 text-[11.5px] text-slate-500">
                    Project created: <span className="font-mono-design text-[11px] text-slate-600">{projectId.slice(0, 8)}…</span>
                  </div>
                )}
              </div>
              {step1Done && (
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 px-2 py-[5px] text-[11px] font-medium">
                  <CheckCircle2 size={12} /> Locked
                </div>
              )}
            </div>
            <div className="mt-3">
              <Textarea
                value={hypothesis}
                onChange={(e) => { setHypothesis(e.target.value); setSelectedId(""); }}
                rows={6}
                className="resize-none text-[14px] leading-relaxed border-slate-200 focus:ring-[#2240b3] focus:border-[#2240b3]"
                placeholder="Enter a scientific hypothesis…"
                disabled={loading || step1Done}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono-design">{hypothesis.length} chars</span>
              <span className="text-[11px] text-slate-400">Min. 10 chars</span>
            </div>
          </motion.div>

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
              ) : step1Done ? (
                <>
                  <CheckCircle2 size={16} className="text-white/70" />
                  Hypothesis locked
                </>
              ) : (
                <>
                  <Wand2 size={16} className="text-white/70" />
                  Start guided build
                </>
              )}
            </button>
            <p className="text-[11.5px] text-slate-500 leading-snug">
              Mock mode works without keys; add Supabase / Tavily / LLM keys for real evidence grounding.
            </p>
          </div>

          {/* Step 2: clarifications */}
          <AnimatePresence>
            {projectId && (
              <motion.div
                ref={step2Ref}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[var(--line-2)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-slate-900 text-white grid place-items-center shadow-sm">
                      <Sparkles size={14} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">Clarify what matters</div>
                      <div className="text-[11.5px] text-slate-500">Answer a few high-impact questions to lock assumptions.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => loadClarifyingQuestions(projectId)}
                    disabled={clarifyLoading}
                    className="text-[12px] text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    Refresh <ChevronRight size={14} />
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  {clarifyError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-700">{clarifyError}</div>
                  )}

                  {clarifyLoading && (
                    <div className="text-[12.5px] text-slate-500 inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
                      Generating clarifying questions…
                    </div>
                  )}

                  {needsClarification === false && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-[13px] font-semibold text-emerald-900 inline-flex items-center gap-2">
                        <CheckCircle2 size={16} /> No clarification needed
                      </div>
                      <div className="mt-1 text-[12px] text-emerald-700">{clarifyRationale ?? "You can proceed."}</div>
                      <div className="mt-3">
                        <button
                          onClick={() => { setClarificationsSavedAt(isoNow()); softScrollIntoView(step3Ref.current); }}
                          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-700 text-white text-[12.5px] font-medium hover:bg-emerald-800 transition-colors"
                        >
                          Continue to literature QC <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {needsClarification && questions.length > 0 && (
                    <div className="space-y-3">
                      {clarifyRationale ? (
                        <div className="text-[12px] text-slate-600">{clarifyRationale}</div>
                      ) : null}

                      {questions.map((q) => (
                        <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                          <div className="text-[13px] font-medium text-slate-900">{q.question_text}</div>
                          <div className="mt-2 grid gap-2">
                            {q.options.map((opt) => {
                              const selected = answers[q.id] === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                  className={`text-left rounded-lg px-3 py-2 text-[12.5px] ring-1 ring-inset transition-colors ${
                                    selected
                                      ? "bg-slate-900 text-white ring-slate-900"
                                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11.5px] text-slate-500">
                          {Object.keys(answers).length}/{questions.length} answered
                        </div>
                        <button
                          onClick={saveClarifications}
                          disabled={clarifyLoading}
                          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-[#0b1220] text-white text-[12.5px] font-medium hover:bg-[#1a2540] transition-colors disabled:opacity-50"
                        >
                          {clarifyLoading ? "Saving…" : clarificationsSavedAt ? "Saved" : "Save & continue"}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3: literature QC */}
          <AnimatePresence>
            {step2Done && projectId && (
              <motion.div
                ref={step3Ref}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-white ring-1 ring-[var(--line)] soft-shadow overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-[var(--line-2)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-violet-700 text-white grid place-items-center shadow-sm">
                      <Atom size={14} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">Literature QC</div>
                      <div className="text-[11.5px] text-slate-500">Quick evidence scan for novelty + risk signals.</div>
                    </div>
                  </div>
                  <button
                    onClick={runLiteratureQc}
                    disabled={qcLoading}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-violet-700 text-white text-[12.5px] font-medium hover:bg-violet-800 transition-colors disabled:opacity-50"
                  >
                    {qcLoading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Running…
                      </>
                    ) : (
                      <>
                        Run QC <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {qcError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12.5px] text-rose-700">{qcError}</div>
                  )}
                  {qc && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4 space-y-2">
                      <div className="text-[12px] text-slate-500">Novelty signal</div>
                      <div className="text-[14px] font-semibold text-slate-900">{String(qc.novelty_signal ?? "unknown")}</div>
                      {qc.summary && <div className="text-[12.5px] text-slate-700 leading-relaxed">{qc.summary}</div>}
                      {qcRefs?.length ? (
                        <div className="pt-2 space-y-2">
                          <div className="text-[12px] text-slate-500">Top references</div>
                          {qcRefs.slice(0, 3).map((r: any, idx: number) => (
                            <a
                              key={idx}
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-lg bg-white ring-1 ring-slate-200 p-3 hover:bg-slate-50 transition-colors"
                            >
                              <div className="text-[12.5px] font-medium text-slate-900">{r.title ?? "Reference"}</div>
                              <div className="mt-1 text-[11.5px] text-slate-500 line-clamp-2">{r.relevance ?? r.snippet ?? ""}</div>
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {qcDoneAt && <div className="text-[11px] text-slate-400 font-mono-design">completed {qcDoneAt}</div>}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 4: generate */}
          <AnimatePresence>
            {step4Ready && projectId && (
              <motion.div
                ref={step4Ref}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-[#0b1220] text-white ring-1 ring-black/10 soft-shadow overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-xl bg-white/10 text-white grid place-items-center shadow-sm">
                      <Wand2 size={14} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold">Generate the plan</div>
                      <div className="text-[11.5px] text-white/70">Ground materials via search and build a runnable protocol.</div>
                    </div>
                  </div>
                  <button
                    onClick={generatePlan}
                    disabled={planLoading}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-[#0b1220] text-[12.5px] font-semibold hover:bg-white/90 transition-colors disabled:opacity-50"
                  >
                    {planLoading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-[#0b1220]/30 border-t-[#0b1220] animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        Create plan <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
                <div className="p-5">
                  {planError && (
                    <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-[12.5px] text-rose-200">
                      {planError}
                    </div>
                  )}
                  <div className="text-[12px] text-white/70">
                    Tip: you can keep this tab open; everything else happens automatically on this page.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
