"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentableSection, type SectionComment } from "@/components/plan/CommentableSection";
import { BudgetView, ControlsView, MaterialsView, PiReviewView, ProtocolView, RisksView, TimelineView, ValidationView } from "@/components/plan/PlanViews";
import { Brain, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

function trafficVariant(signal: string) {
  if (signal === "not found") return "green";
  if (signal === "similar work exists") return "yellow";
  if (signal === "exact match found") return "red";
  return "default";
}

function stripDebugPlan(planJson: any) {
  if (!planJson || typeof planJson !== "object") return planJson;
  const { _debug_material_pricing_context, ...rest } = planJson;
  return rest;
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function meaningfulAppliedFeedback(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.filter((x) => {
    const change = x?.applied_change;
    if (!isNonEmptyString(change)) return false;
    const t = String(change).toLowerCase();
    if (t.includes("no explicit change")) return false;
    if (t.includes("not applied")) return false;
    if (t.includes("none")) return false;
    return true;
  });
}

function meaningfulAppliedRules(rows: any[]) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => isNonEmptyString(r?.explanation));
}

function splitAppliedRules(rows: any[]) {
  const meaningful = meaningfulAppliedRules(rows);
  const learned = meaningful.filter((r) => Boolean(r?.skill_rule?.source_comment_id));
  const seeded = meaningful.filter((r) => !r?.skill_rule?.source_comment_id);
  return { learned, seeded };
}

const SECTION_KEYS = ["protocol", "materials", "budget", "timeline", "validation_approach", "controls", "risks"] as const;

function normalizeCommentSection(section: any): string | null {
  if (section == null) return null;
  const raw = String(section);
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Legacy/backfill compatibility: older comments stored section keys matching plan JSON.
  if (s === "validation_approach" || s === "validation approach") return "validation";
  if (s === "pi review required" || s === "pi_review" || s === "pi-review-required") return "pi_review_required";

  // Canonical keys used by the UI.
  return raw;
}

export default function PlanPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const search = useSearchParams();
  const planId = search.get("plan_id");
  const celebrateGuidance = search.get("celebrate_guidance") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  // Comments state
  const [comments, setComments] = useState<SectionComment[]>([]);
  const [skillMd, setSkillMd] = useState<string | null>(null);
  const [skillMdOpen, setSkillMdOpen] = useState(false);
  const [generatingSkillMd, setGeneratingSkillMd] = useState(false);
  const [skillMdError, setSkillMdError] = useState<string | null>(null);
  const [skillMdUpdatedAtLocal, setSkillMdUpdatedAtLocal] = useState<string | null>(null);
  const [globalSkillUpdatedAt, setGlobalSkillUpdatedAt] = useState<string | null>(null);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const effectivePlanId = payload?.plan?.id ?? planId ?? "";
  const planMeta = payload?.plan ?? null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qcRes = await fetch(`/api/projects/${params.id}/qc`, { cache: "no-store" });
        const qcJson = await qcRes.json();
        if (!qcRes.ok) throw new Error(qcJson?.message ?? "Failed to load literature QC");

        if (planId) {
          const planRes = await fetch(`/api/plans/${planId}`, { cache: "no-store" });
          const planJson = await planRes.json();
          if (!planRes.ok) throw new Error(planJson?.error ?? "Plan not found");

          const projRes = await fetch(`/api/projects/${params.id}`, { cache: "no-store" });
          const projJson = await projRes.json();
          if (!projRes.ok) throw new Error(projJson?.error ?? "Project not found");

          if (!cancelled) {
            setPayload({
              project: projJson.project,
              plan: planJson.plan,
              experiment_plan: stripDebugPlan(planJson.plan.plan_json),
              literature_qc: qcJson.literature_qc,
              literature_results: qcJson.literature_results ?? [],
              applied_rules: planJson.applied_rules ?? []
            });
            setSkillMd(planJson.plan?.skill_md ?? null);
            setSkillMdUpdatedAtLocal(planJson.plan?.skill_md_updated_at ?? null);
            setGlobalSkillUpdatedAt(planJson.global_skill_updated_at ?? null);
          }
        } else {
          const res = await fetch(`/api/projects/${params.id}`, { cache: "no-store" });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "Not found");

          let applied_rules: any[] = [];
          let plan: any = json.plan;
          if (json.plan?.id) {
            const planRes = await fetch(`/api/plans/${json.plan.id}`, { cache: "no-store" });
            const planJson = await planRes.json();
            if (planRes.ok) {
              applied_rules = planJson.applied_rules ?? [];
              plan = planJson.plan ?? json.plan;
              setGlobalSkillUpdatedAt(planJson.global_skill_updated_at ?? null);
            }
          }

          if (!cancelled) {
            setPayload({
              project: json.project,
              plan,
              experiment_plan: stripDebugPlan(plan?.plan_json ?? json.plan?.plan_json),
              literature_qc: qcJson.literature_qc,
              literature_results: qcJson.literature_results ?? [],
              applied_rules
            });
            setSkillMd(plan?.skill_md ?? null);
            setSkillMdUpdatedAtLocal(plan?.skill_md_updated_at ?? null);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params.id, planId]);

  // Load comments after plan is known
  useEffect(() => {
    if (!effectivePlanId) return;
    fetch(`/api/plans/${effectivePlanId}/comments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (!Array.isArray(json.comments)) return;
        setComments(
          json.comments.map((c: any) => ({
            ...c,
            section: normalizeCommentSection(c.section)
          }))
        );
      })
      .catch(() => {});
  }, [effectivePlanId]);

  const onCommentAdded = useCallback((comment: SectionComment) => {
    setComments((prev) => {
      const idx = prev.findIndex((c) => c.id === comment.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = comment;
        return next;
      }
      return [...prev, comment];
    });
  }, []);

  const onCommentDeleted = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  async function regenerateSkillMd() {
    if (!effectivePlanId) return;
    setGeneratingSkillMd(true);
    setSkillMdError(null);
    try {
      const res = await fetch(`/api/plans/${effectivePlanId}/skill-md`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Generation failed");
      setSkillMd(json.skill_md);
      setSkillMdOpen(true);
      setSkillMdUpdatedAtLocal(new Date().toISOString());
      // Best-effort: update local plan meta so gating can re-evaluate immediately.
      setPayload((prev: any) => {
        if (!prev?.plan) return prev;
        return { ...prev, plan: { ...prev.plan, skill_md: json.skill_md, skill_md_updated_at: new Date().toISOString() } };
      });
    } catch (err: any) {
      setSkillMdError(err?.message ?? String(err));
    } finally {
      setGeneratingSkillMd(false);
    }
  }

  const canRegeneratePlan = useMemo(() => {
    if (!effectivePlanId) return false;
    const skillUpdatedAt = planMeta?.skill_md_updated_at ?? skillMdUpdatedAtLocal ?? null;
    const usedSkillAt = planMeta?.generated_with_skill_md_at ?? null;
    const usedGlobalAt = planMeta?.generated_with_global_skill_at ?? null;

    // If the DB doesn't have generation timestamps yet, treat any generated skill_md as a “change”
    // until the plan is regenerated once.
    const lacksSkillTracking = usedSkillAt == null && planMeta?.generated_with_skill_md_at === undefined;
    const skillChanged = Boolean(
      skillUpdatedAt &&
        ((!usedSkillAt || skillUpdatedAt > usedSkillAt) || (lacksSkillTracking && Boolean(skillMd)))
    );

    const lacksGlobalTracking = usedGlobalAt == null && planMeta?.generated_with_global_skill_at === undefined;
    const globalChanged = Boolean(
      globalSkillUpdatedAt &&
        ((!usedGlobalAt || globalSkillUpdatedAt > usedGlobalAt) || lacksGlobalTracking)
    );

    return (skillChanged || globalChanged) && !regeneratingPlan;
  }, [effectivePlanId, planMeta, globalSkillUpdatedAt, regeneratingPlan, skillMdUpdatedAtLocal, skillMd]);

  async function regeneratePlan() {
    if (!effectivePlanId) return;
    setRegeneratingPlan(true);
    setRegenerateError(null);
    try {
      const res = await fetch(`/api/plans/${effectivePlanId}/regenerate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Regeneration failed");
      router.push(`/projects/${json.project.id}/plan?plan_id=${json.plan.id}&celebrate_guidance=1`);
    } catch (err: any) {
      setRegenerateError(err?.message ?? String(err));
    } finally {
      setRegeneratingPlan(false);
    }
  }

  const planJson = payload?.experiment_plan;
  const qc = payload?.literature_qc;

  const appliedFeedback = useMemo(() => meaningfulAppliedFeedback(planJson?.applied_feedback ?? []), [planJson]);
  const { learned: learnedApplied, seeded: seededApplied } = useMemo(
    () => splitAppliedRules(payload?.applied_rules ?? []),
    [payload]
  );

  const appliedBox = useMemo(() => {
    // Only show this when your saved guidance actually influenced the plan.
    if (learnedApplied.length === 0 && !celebrateGuidance) return null;

    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-base">Your guidance applied</CardTitle>
            <CardDescription>
              These are the reusable notes you’ve saved that shaped this plan (retrieval + prompting, not fine-tuning).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learnedApplied.length ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">From notes you’ve saved</div>
                {learnedApplied.map((r: any) => (
                  <div key={r.id} className="rounded-md border bg-background p-3 text-sm">
                    <div className="text-xs font-medium text-muted-foreground">Rule</div>
                    <div className="mt-1 font-medium">{r.skill_rule?.rule_text ?? r.rule_id}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Applied change: </span>
                      {r.explanation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-white/70 p-4">
                <div className="text-[13px] font-semibold text-emerald-900">Nice — this draft used your saved guidance.</div>
                <div className="mt-1 text-[12.5px] text-emerald-800">
                  Want to see the exact notes it pulled from? Open Skill memory, or regenerate again after adding another global rule.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }, [appliedFeedback, learnedApplied, seededApplied, celebrateGuidance, reduceMotion]);

  const refs = useMemo(() => {
    function normUrl(u: any) {
      const s = String(u ?? "").trim();
      if (!s) return "";
      return s.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
    }

    const items = (payload?.literature_results ?? []) as any[];
    const out: any[] = [];
    const seen = new Set<string>();
    for (const r of items) {
      const url = normUrl(r?.url);
      const title = String(r?.title ?? "").trim().toLowerCase();
      const k = url || title;
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
      if (out.length >= 3) break;
    }
    return out;
  }, [payload]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-sm text-muted-foreground">Loading plan…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Could not load plan</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild><Link href="/new">Start a new plan</Link></Button>
            <Button variant="outline" asChild><Link href="/projects">Projects</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sectionComments = (key: string) => comments.filter((c) => c.section === key);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">ProtocolForge AI</div>
          <h1 className="text-2xl font-semibold tracking-tight">{payload?.project?.title ?? "Experiment plan"}</h1>
          <div className="mt-1 text-sm text-muted-foreground">{payload?.project?.original_hypothesis}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/projects">Projects</Link></Button>
          <Button asChild><Link href="/new">New plan</Link></Button>
        </div>
      </div>

      {/* Skill memory panel */}
      {(comments.length > 0 || skillMd) && (
        <div className="rounded-xl ring-1 ring-violet-200 bg-violet-50/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-violet-700" />
              <span className="text-[13px] font-medium text-violet-900">Plan skill memory</span>
              {comments.length > 0 && (
                <span className="text-[11px] text-violet-600">{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {comments.length > 0 && (
                <button
                  onClick={regenerateSkillMd}
                  disabled={generatingSkillMd}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-violet-800 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={11} className={generatingSkillMd ? "animate-spin" : ""} />
                  {generatingSkillMd ? "Generating…" : skillMd ? "Regenerate skill.md" : "Generate skill.md"}
                </button>
              )}
              <button
                onClick={regeneratePlan}
                disabled={!canRegeneratePlan}
                title={
                  canRegeneratePlan
                    ? "Regenerate the plan using updated skills"
                    : "Disabled until plan skill or global skill rules have changed"
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-medium px-3 py-1.5 hover:bg-slate-950 disabled:opacity-40 transition-colors"
              >
                {regeneratingPlan ? "Regenerating…" : "Regenerate plan"}
              </button>
              {skillMd && (
                <button
                  onClick={() => setSkillMdOpen((v) => !v)}
                  className="text-[12px] text-violet-700 hover:text-violet-900 inline-flex items-center gap-1"
                >
                  {skillMdOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {skillMdOpen ? "Hide" : "View"}
                </button>
              )}
            </div>
          </div>
          {skillMdError && (
            <div className="px-4 pb-3 text-[12px] text-red-600">{skillMdError}</div>
          )}
          {regenerateError && (
            <div className="px-4 pb-3 text-[12px] text-red-600">{regenerateError}</div>
          )}
          {skillMdOpen && skillMd && (
            <div className="border-t border-violet-200 px-4 py-3">
              <pre className="whitespace-pre-wrap text-[12px] text-violet-900 font-mono leading-relaxed">{skillMd}</pre>
            </div>
          )}
        </div>
      )}

      {/* Literature QC */}
      {qc ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Research scan</CardTitle>
            <CardDescription>A quick check for novelty + close prior work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={trafficVariant(String(qc.novelty_signal ?? "")) as any}>{String(qc.novelty_signal ?? "unknown")}</Badge>
              <div className="text-xs text-muted-foreground">Confidence: {qc.confidence ?? "—"}</div>
            </div>
            <div className="text-sm">{qc.summary}</div>
            {refs.length ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">References</div>
                {refs.map((r: any, idx: number) => (
                  <div key={idx} className="rounded-md border bg-background p-3 text-sm">
                    <div className="font-medium">{r.title ?? "Reference"}</div>
                    {r.snippet ? <div className="mt-2 text-xs text-muted-foreground">{r.snippet}</div> : null}
                    {r.url ? (
                      <a className="mt-2 inline-block text-xs underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {appliedBox}

      {/* Plan sections with commentable areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experiment plan</CardTitle>
          <CardDescription>Select any text to add an expert comment. Click a highlight to view or edit it.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="protocol">
            <TabsList className="flex flex-wrap h-auto">
              {SECTION_KEYS.map((k) => (
                <TabsTrigger key={k} value={k} className="capitalize">
                  {k.split("_").join(" ")}
                  {sectionComments(k === "validation_approach" ? "validation" : k).length > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-400 text-white text-[9px] font-bold px-1">
                      {sectionComments(k === "validation_approach" ? "validation" : k).length}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="protocol" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="protocol" title="Protocol"
                comments={sectionComments("protocol")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <ProtocolView steps={planJson?.protocol ?? []} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="materials" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="materials" title="Materials (grounded)"
                comments={sectionComments("materials")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <MaterialsView materials={planJson?.materials ?? []} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="budget" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="budget" title="Budget"
                comments={sectionComments("budget")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <BudgetView budget={planJson?.budget} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="timeline" title="Timeline"
                comments={sectionComments("timeline")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <TimelineView timeline={planJson?.timeline ?? []} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="validation_approach" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="validation" title="Validation approach"
                comments={sectionComments("validation")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <ValidationView items={planJson?.validation_approach ?? []} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="controls" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="controls" title="Controls"
                comments={sectionComments("controls")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <ControlsView controls={planJson?.controls ?? []} />
              </CommentableSection>
            </TabsContent>
            <TabsContent value="risks" className="mt-4">
              <CommentableSection planId={effectivePlanId} sectionKey="risks" title="Risks"
                comments={sectionComments("risks")} onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted}>
                <RisksView risks={planJson?.risks ?? []} />
              </CommentableSection>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        Disclaimer: This is a planning draft and must be reviewed by a qualified scientist before lab execution.
      </div>
    </div>
  );
}
