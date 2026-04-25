"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanSection } from "@/components/PlanSection";
import { BudgetView, ControlsView, MaterialsView, PiReviewView, ProtocolView, RisksView, TimelineView, ValidationView } from "@/components/plan/PlanViews";

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

export default function PlanPage({ params }: { params: { id: string } }) {
  const search = useSearchParams();
  const planId = search.get("plan_id");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qcRes = await fetch(`/api/projects/${params.id}/qc`);
        const qcJson = await qcRes.json();
        if (!qcRes.ok) throw new Error(qcJson?.message ?? "Failed to load literature QC");

        // If we have a plan_id, fetch the plan directly; otherwise load latest plan for project.
        if (planId) {
          const planRes = await fetch(`/api/plans/${planId}`);
          const planJson = await planRes.json();
          if (!planRes.ok) throw new Error(planJson?.error ?? "Plan not found");

          const projRes = await fetch(`/api/projects/${params.id}`);
          const projJson = await projRes.json();
          if (!projRes.ok) throw new Error(projJson?.error ?? "Project not found");

          setPayload({
            project: projJson.project,
            plan: planJson.plan,
            experiment_plan: stripDebugPlan(planJson.plan.plan_json),
            literature_qc: qcJson.literature_qc,
            literature_results: qcJson.literature_results ?? [],
            applied_rules: planJson.applied_rules ?? []
          });
        } else {
          const res = await fetch(`/api/projects/${params.id}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "Not found");

          let applied_rules: any[] = [];
          if (json.plan?.id) {
            const planRes = await fetch(`/api/plans/${json.plan.id}`);
            const planJson = await planRes.json();
            if (planRes.ok) applied_rules = planJson.applied_rules ?? [];
          }

          setPayload({
            project: json.project,
            plan: json.plan,
            experiment_plan: stripDebugPlan(json.plan?.plan_json),
            literature_qc: qcJson.literature_qc,
            literature_results: qcJson.literature_results ?? [],
            applied_rules
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, planId]);

  const planJson = payload?.experiment_plan;
  const qc = payload?.literature_qc;

  const appliedFeedback = useMemo(() => meaningfulAppliedFeedback(planJson?.applied_feedback ?? []), [planJson]);
  const { learned: learnedApplied, seeded: seededApplied } = useMemo(
    () => splitAppliedRules(payload?.applied_rules ?? []),
    [payload]
  );

  const appliedBox = useMemo(() => {
    if (appliedFeedback.length === 0 && learnedApplied.length === 0 && seededApplied.length === 0) return null;
    return (
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardHeader>
          <CardTitle className="text-base">Expert memory included</CardTitle>
          <CardDescription>
            Shows reusable rules that influenced this plan via retrieval + prompting. This is not live fine-tuning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {learnedApplied.length ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">From your saved feedback</div>
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
          ) : null}

          {seededApplied.length ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Library / seeded reusable rules</div>
              {seededApplied.map((r: any) => (
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
          ) : null}

          {appliedFeedback.length ? (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Model attribution (from plan JSON)</div>
              {appliedFeedback.map((a: any, idx: number) => (
                <div key={`pf-${idx}`} className="rounded-md border bg-background p-3 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Rule {a.rule_id}</div>
                  <div className="mt-1">{a.applied_change}</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }, [appliedFeedback, learnedApplied, seededApplied]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="text-sm text-muted-foreground">Loading plan…</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Could not load plan</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild>
                <Link href="/new">Start a new plan</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/projects">Projects</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const refs = (payload?.literature_results ?? []).slice(0, 3);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">ProtocolForge AI</div>
            <h1 className="text-2xl font-semibold tracking-tight">{payload?.project?.title ?? "Experiment plan"}</h1>
            <div className="mt-1 text-sm text-muted-foreground">{payload?.project?.original_hypothesis}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/projects">Projects</Link>
            </Button>
            <Button asChild>
              <Link href="/new">New plan</Link>
            </Button>
          </div>
        </div>

        {qc ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Literature QC</CardTitle>
              <CardDescription>Novelty signal from search evidence.</CardDescription>
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
                        <a className="mt-2 inline-block text-xs underline" href={r.url} target="_blank" rel="noreferrer">
                          {r.url}
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {appliedBox}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Experiment plan</CardTitle>
            <CardDescription>Select text in any section to add an expert comment and distill reusable skill memory.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="protocol">
              <TabsList className="flex flex-wrap h-auto">
                {["protocol", "materials", "budget", "timeline", "validation_approach", "controls", "risks", "pi_review_required"].map((k) => (
                  <TabsTrigger key={k} value={k} className="capitalize">
                    {k.split("_").join(" ")}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="protocol">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="protocol" title="Protocol">
                  <ProtocolView steps={planJson?.protocol ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="materials">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="materials" title="Materials (grounded)">
                  <MaterialsView materials={planJson?.materials ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="budget">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="budget" title="Budget">
                  <BudgetView budget={planJson?.budget} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="timeline">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="timeline" title="Timeline">
                  <TimelineView timeline={planJson?.timeline ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="validation_approach">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="validation" title="Validation approach">
                  <ValidationView items={planJson?.validation_approach ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="controls">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="controls" title="Controls">
                  <ControlsView controls={planJson?.controls ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="risks">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="risks" title="Risks">
                  <RisksView risks={planJson?.risks ?? []} />
                </PlanSection>
              </TabsContent>
              <TabsContent value="pi_review_required">
                <PlanSection planId={payload.plan?.id ?? planId ?? ""} sectionKey="pi_review_required" title="PI review warning">
                  <PiReviewView text={String(planJson?.pi_review_required ?? "")} />
                </PlanSection>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground">
          Disclaimer: This is a planning draft and must be reviewed by a qualified scientist before lab execution.
        </div>
      </div>
    </main>
  );
}
