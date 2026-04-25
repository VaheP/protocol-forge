import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getMockStore, mockIds } from "@/lib/db/mock-store";
import type {
  AppliedRule,
  ClarificationAnswer,
  Comment,
  LiteratureQC,
  LiteratureResult,
  Plan,
  Project,
  SkillRule,
  UUID
} from "@/lib/db/types";

type InsertProject = Pick<
  Project,
  "title" | "original_hypothesis" | "domain" | "experiment_type" | "target" | "sample_type" | "parsed_json"
>;

export async function dbCreateProject(input: InsertProject): Promise<Project> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: input.title,
        original_hypothesis: input.original_hypothesis,
        domain: input.domain,
        experiment_type: input.experiment_type,
        target: input.target,
        sample_type: input.sample_type,
        parsed_json: input.parsed_json
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Project;
  }

  const store = getMockStore();
  const p: Project = {
    id: mockIds.uuid(),
    title: input.title ?? null,
    original_hypothesis: input.original_hypothesis,
    domain: input.domain ?? null,
    experiment_type: input.experiment_type ?? null,
    target: input.target ?? null,
    sample_type: input.sample_type ?? null,
    parsed_json: input.parsed_json ?? null,
    created_at: mockIds.nowIso()
  };
  store.projects.unshift(p);
  return p;
}

export async function dbGetClarifications(projectId: UUID): Promise<ClarificationAnswer[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("clarification_answers")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as ClarificationAnswer[];
  }

  const store = getMockStore();
  return store.clarifications.filter((c) => c.project_id === projectId);
}

export async function dbCountClarifications(projectId: UUID): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { count, error } = await supabase
      .from("clarification_answers")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const store = getMockStore();
  return store.clarifications.filter((c) => c.project_id === projectId).length;
}

export async function dbCountLiteratureResults(projectId: UUID): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { count, error } = await supabase
      .from("literature_results")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const store = getMockStore();
  return store.literatureResults.filter((r) => r.project_id === projectId).length;
}

export async function dbCountLiteratureQC(projectId: UUID): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { count, error } = await supabase
      .from("literature_qc")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  const store = getMockStore();
  return store.literatureQC.filter((q) => q.project_id === projectId).length;
}

export async function dbInsertLiteratureResults(
  projectId: UUID,
  rows: Omit<LiteratureResult, "id" | "created_at" | "project_id">[]
) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("literature_results").insert(
      rows.map((r) => ({
        project_id: projectId,
        title: r.title,
        url: r.url,
        snippet: r.snippet,
        source: r.source,
        relevance_score: r.relevance_score
      }))
    );
    if (error) throw new Error(error.message);
    return;
  }

  const store = getMockStore();
  for (const r of rows) {
    store.literatureResults.push({
      id: mockIds.uuid(),
      created_at: mockIds.nowIso(),
      ...r,
      project_id: projectId
    });
  }
}

export async function dbUpsertLiteratureQC(
  projectId: UUID,
  qc: Omit<LiteratureQC, "id" | "created_at" | "project_id">
): Promise<LiteratureQC> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    // simplest: insert a new QC row per run
    const { data, error } = await supabase
      .from("literature_qc")
      .insert({
        project_id: projectId,
        novelty_signal: qc.novelty_signal,
        confidence: qc.confidence,
        summary: qc.summary
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as LiteratureQC;
  }

  const store = getMockStore();
  const row: LiteratureQC = {
    id: mockIds.uuid(),
    project_id: projectId,
    novelty_signal: qc.novelty_signal ?? null,
    confidence: qc.confidence ?? null,
    summary: qc.summary ?? null,
    created_at: mockIds.nowIso()
  };
  store.literatureQC.push(row);
  return row;
}

export async function dbListActiveSkillRules(): Promise<SkillRule[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("skill_rules")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SkillRule[];
  }

  const store = getMockStore();
  return store.skillRules.filter((r) => r.active);
}

export async function dbCreatePlan(
  projectId: UUID,
  planJson: any,
  modelUsed: string | null
): Promise<Plan> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("plans")
      .insert({
        project_id: projectId,
        plan_json: planJson,
        model_used: modelUsed
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Plan;
  }

  const store = getMockStore();
  const p: Plan = {
    id: mockIds.uuid(),
    project_id: projectId,
    plan_json: planJson,
    model_used: modelUsed,
    created_at: mockIds.nowIso()
  };
  store.plans.push(p);
  return p;
}

export async function dbInsertAppliedRules(
  planId: UUID,
  rows: Omit<AppliedRule, "id" | "created_at">[]
): Promise<AppliedRule[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("applied_rules")
      .insert(
        rows.map((r) => ({
          plan_id: planId,
          rule_id: r.rule_id,
          applied_to_section: r.applied_to_section,
          explanation: r.explanation
        }))
      )
      .select("*");
    if (error) throw new Error(error.message);
    return (data ?? []) as AppliedRule[];
  }

  const store = getMockStore();
  const inserted = rows.map((r) => ({
    id: mockIds.uuid(),
    created_at: mockIds.nowIso(),
    ...r,
    plan_id: planId
  }));
  store.appliedRules.push(...inserted);
  return inserted;
}

export async function dbListProjects(limit = 20): Promise<Project[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as Project[];
  }
  const store = getMockStore();
  return store.projects.slice(0, limit);
}

export async function dbGetProject(projectId: UUID): Promise<Project | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Project) ?? null;
  }
  const store = getMockStore();
  return store.projects.find((p) => p.id === projectId) ?? null;
}

export async function dbDeleteProject(projectId: UUID) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) throw new Error(error.message);
    return;
  }
  const store = getMockStore();
  store.projects = store.projects.filter((p) => p.id !== projectId);
  store.clarifications = store.clarifications.filter((c) => c.project_id !== projectId);
  store.literatureQC = store.literatureQC.filter((q) => q.project_id !== projectId);
  store.literatureResults = store.literatureResults.filter((r) => r.project_id !== projectId);
  const planIds = new Set(store.plans.filter((p) => p.project_id === projectId).map((p) => p.id));
  store.plans = store.plans.filter((p) => p.project_id !== projectId);
  store.comments = store.comments.filter((c) => !planIds.has(c.plan_id));
  store.appliedRules = store.appliedRules.filter((a) => !planIds.has(a.plan_id));
}

export async function dbGetLatestPlanByProject(projectId: UUID): Promise<Plan | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Plan) ?? null;
  }
  const store = getMockStore();
  const plans = store.plans.filter((p) => p.project_id === projectId);
  return plans.length ? plans[plans.length - 1] : null;
}

export async function dbGetPlan(planId: UUID): Promise<Plan | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("plans").select("*").eq("id", planId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Plan) ?? null;
  }
  const store = getMockStore();
  return store.plans.find((p) => p.id === planId) ?? null;
}

export async function dbListAppliedRulesForPlan(planId: UUID): Promise<AppliedRule[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("applied_rules")
      .select("*")
      .eq("plan_id", planId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AppliedRule[];
  }
  const store = getMockStore();
  return store.appliedRules.filter((a) => a.plan_id === planId);
}

export type AppliedRuleJoined = AppliedRule & { skill_rule: SkillRule | null };

export async function dbListAppliedRulesJoinedForPlan(planId: UUID): Promise<AppliedRuleJoined[]> {
  const applied = await dbListAppliedRulesForPlan(planId);
  if (applied.length === 0) return [];

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const ruleIds = Array.from(new Set(applied.map((a) => a.rule_id)));
    const { data: rules, error } = await supabase.from("skill_rules").select("*").in("id", ruleIds);
    if (error) throw new Error(error.message);
    const byId = new Map<string, SkillRule>();
    for (const r of (rules ?? []) as SkillRule[]) byId.set(r.id, r);
    return applied.map((a) => ({ ...a, skill_rule: byId.get(a.rule_id) ?? null }));
  }

  const store = getMockStore();
  const byId = new Map(store.skillRules.map((r) => [r.id, r] as const));
  return applied.map((a) => ({ ...a, skill_rule: byId.get(a.rule_id) ?? null }));
}

export async function dbCreateComment(input: Omit<Comment, "id" | "created_at">): Promise<Comment> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("comments")
      .insert({
        plan_id: input.plan_id,
        section: input.section,
        selected_text: input.selected_text,
        comment_text: input.comment_text,
        feedback_type: input.feedback_type,
        severity: input.severity,
        reusable: input.reusable
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Comment;
  }
  const store = getMockStore();
  const c: Comment = { id: mockIds.uuid(), created_at: mockIds.nowIso(), ...input };
  store.comments.push(c);
  return c;
}

export async function dbCreateSkillRule(input: Omit<SkillRule, "id" | "created_at">): Promise<SkillRule> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("skill_rules")
      .insert({
        source_comment_id: input.source_comment_id,
        domain: input.domain,
        experiment_type: input.experiment_type,
        section: input.section,
        rule_text: input.rule_text,
        keywords: input.keywords,
        severity: input.severity,
        active: input.active
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as SkillRule;
  }
  const store = getMockStore();
  const r: SkillRule = { id: mockIds.uuid(), created_at: mockIds.nowIso(), ...input };
  store.skillRules.unshift(r);
  return r;
}

export async function dbListSkillRules(limit = 200): Promise<SkillRule[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("skill_rules").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []) as SkillRule[];
  }
  const store = getMockStore();
  return store.skillRules.slice(0, limit);
}

export async function dbInsertClarificationAnswers(
  projectId: UUID,
  answers: Array<{ question_id: string; question_text: string; selected_answer: string }>
) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("clarification_answers").insert(
      answers.map((a) => ({
        project_id: projectId,
        question_id: a.question_id,
        question_text: a.question_text,
        selected_answer: a.selected_answer
      }))
    );
    if (error) throw new Error(error.message);
    return;
  }
  const store = getMockStore();
  for (const a of answers) {
    store.clarifications.push({
      id: mockIds.uuid(),
      project_id: projectId,
      question_id: a.question_id,
      question_text: a.question_text,
      selected_answer: a.selected_answer,
      created_at: mockIds.nowIso()
    });
  }
}

export async function dbListLiteratureResults(projectId: UUID, limit = 20) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("literature_results")
      .select("*")
      .eq("project_id", projectId)
      .order("relevance_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }
  const store = getMockStore();
  return store.literatureResults.filter((r) => r.project_id === projectId).slice(0, limit);
}

export async function dbGetLatestLiteratureQC(projectId: UUID) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from("literature_qc")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  }
  const store = getMockStore();
  const rows = store.literatureQC.filter((r) => r.project_id === projectId);
  return rows.length ? rows[rows.length - 1] : null;
}

