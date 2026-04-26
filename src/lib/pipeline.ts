import { generateJSON } from "@/lib/llm";
import { prompts } from "@/lib/prompts";
import { tavilySearch } from "@/lib/tavily";
import { groundMaterials, type RequiredMaterial } from "@/lib/materialGrounding";
import { extractRelevantSections } from "@/lib/extraction";
import {
  dbCreatePlan,
  dbCreateProject,
  dbGetProject,
  dbGetPlan,
  dbGetLatestLiteratureQC,
  dbListLiteratureResults,
  dbInsertAppliedRules,
  dbInsertLiteratureResults,
  dbListActiveSkillRules,
  dbGetGlobalSkillUpdatedAt,
  dbUpsertLiteratureQC,
  dbGetClarifications
} from "@/lib/db";
import { selectTopSkillRules } from "@/lib/skillRules";

export type OrchestratorOutput = {
  project: {
    id: string;
    title: string | null;
    domain: string | null;
    experiment_type: string | null;
    original_hypothesis: string;
  };
  plan: {
    id: string;
    model_used: string | null;
    created_at: string;
  };
  literature_qc: {
    novelty_signal: string;
    confidence: number;
    summary: string;
    references: Array<{ title: string; url: string; relevance: string }>;
  };
  experiment_plan: any;
  applied_rules: any[];
  debug: {
    search_queries: string[];
    required_materials: RequiredMaterial[];
    pricing_context_available: boolean;
  };
};

function isUuid(v: any): v is string {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

type ParsedStep1 = {
  title: string;
  domain: string;
  experiment_type: string;
  target: string;
  intervention: string;
  outcome: string;
  control: string;
  sample_or_model: string;
  search_queries: string[];
};

type LiteratureQCJson = {
  novelty_signal: "not found" | "similar work exists" | "exact match found";
  confidence: number;
  summary: string;
  references: Array<{ title: string; url: string; relevance: string }>;
};

type DraftProtocolJson = {
  draft_protocol_steps: Array<{ step: number; title: string; description: string; duration: string; critical_notes: string[] }>;
  required_materials: RequiredMaterial[];
  applied_skill_rules: Array<{ rule_id: string; applied_change: string }>;
};

type FinalPlanJson = {
  protocol: any[];
  materials: any[];
  budget: any;
  timeline: any[];
  validation_approach: any[];
  controls: any[];
  risks: any[];
  pi_review_required: string;
  applied_feedback: Array<{ rule_id: string; applied_change: string }>;
};

export async function generateFullPlanFromHypothesis(hypothesis: string): Promise<OrchestratorOutput> {
  // Step 1: Parse + query extraction
  const step1Prompt = prompts.parseHypothesisAndQueries(hypothesis);
  const step1 = await generateJSON<ParsedStep1>({
    schemaName: "parse_hypothesis_queries",
    prompt: step1Prompt,
    hypothesisForRouting: hypothesis
  });

  const parsed = step1.json;
  const searchQueries = (parsed.search_queries ?? []).filter(Boolean).slice(0, 3);

  // Persist project early (so we can attach child rows)
  const project = await dbCreateProject({
    title: parsed.title ?? null,
    original_hypothesis: hypothesis,
    domain: parsed.domain ?? null,
    experiment_type: parsed.experiment_type ?? null,
    target: parsed.target ?? null,
    sample_type: parsed.sample_or_model ?? null,
    parsed_json: parsed
  });

  // Load clarifications if any exist (optional in this orchestrator)
  const clarifications = await dbGetClarifications(project.id);

  // Step 2A: Tavily search (all queries)
  const rawTavilyResults = [];
  for (const q of searchQueries) {
    const results = await tavilySearch(q, { maxResults: 3 });
    for (const r of results) {
      rawTavilyResults.push({ query: q, ...r });
    }
  }

  // Step 2A.1: Extract abstract/methodology sections using small model
  const allTavilyResults = await extractRelevantSections(rawTavilyResults);

  // Persist literature results
  await dbInsertLiteratureResults(
    project.id,
    allTavilyResults.slice(0, 15).map((r) => ({
      title: r.title ?? null,
      url: r.url ?? null,
      snippet: (r.snippet ?? r.content ?? null) as any,
      source: r.source ?? "tavily",
      relevance_score: r.score ?? null
    }))
  );

  // Step 2B: novelty QC via LLM
  const step2Prompt = prompts.literatureQC(hypothesis, allTavilyResults);
  const step2 = await generateJSON<LiteratureQCJson>({
    schemaName: "literature_qc",
    prompt: step2Prompt,
    hypothesisForRouting: hypothesis
  });

  const qc = step2.json;
  await dbUpsertLiteratureQC(project.id, {
    novelty_signal: qc.novelty_signal,
    confidence: qc.confidence,
    summary: qc.summary
  });

  const references = (qc.references ?? []).slice(0, 3);

  // Step 3: retrieve relevant skill rules
  const allRules = await dbListActiveSkillRules();
  const globalSkillUpdatedAt = await dbGetGlobalSkillUpdatedAt();
  const relevant = selectTopSkillRules(allRules, {
    domain: project.domain,
    experiment_type: project.experiment_type,
    hypothesis
  });
  const relevantRules = relevant.map((x) => x.rule);
  const alwaysInclude = allRules
    .filter((r: any) => r?.active && r?.source_comment_id) // learned global rules
    .slice(0, 25);
  const byId = new Set(relevantRules.map((r) => r.id));
  const combinedRules = [...relevantRules, ...alwaysInclude.filter((r) => !byId.has(r.id))];

  // Step 4: Draft protocol + material extraction
  const step4Prompt = prompts.draftProtocolAndMaterials({
    hypothesis,
    parsedJson: parsed,
    noveltyJson: qc,
    references,
    clarifications: clarifications.map((c) => ({ question_text: c.question_text, selected_answer: c.selected_answer })),
    relevantRules: combinedRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords }))
  });
  const step4 = await generateJSON<DraftProtocolJson>({
    schemaName: "draft_protocol_materials",
    prompt: step4Prompt,
    hypothesisForRouting: hypothesis
  });

  const draft = step4.json;
  const requiredMaterials = (draft.required_materials ?? []).slice(0, 6);

  // Step 5: Mandatory supply chain grounding via Tavily
  const pricing_context = await groundMaterials(requiredMaterials, { maxResultsPerMaterial: 2 });

  // Step 6: Final plan assembly
  const step6Prompt = prompts.finalPlanAssembly({
    draftProtocolSteps: draft.draft_protocol_steps ?? [],
    requiredMaterials,
    pricingContext: pricing_context
  });

  const step6 = await generateJSON<FinalPlanJson>({
    schemaName: "final_plan",
    prompt: step6Prompt,
    hypothesisForRouting: hypothesis
  });

  const finalPlan = step6.json;

  // Persist plan + applied rules usage
  const plan = await dbCreatePlan(project.id, finalPlan, step6.provider, {
    generated_with_skill_md_at: null,
    generated_with_global_skill_at: globalSkillUpdatedAt
  });

  const applied = (finalPlan.applied_feedback ?? []).filter((a: any) => isUuid(a?.rule_id));
  const appliedRows = applied.map((a) => ({
    rule_id: a.rule_id,
    applied_to_section: null,
    explanation: a.applied_change ?? null
  }));
  const applied_rules = appliedRows.length ? await dbInsertAppliedRules(plan.id, appliedRows as any) : [];

  // Step 7: Frontend handshake
  return {
    project: {
      id: project.id,
      title: project.title ?? parsed.title ?? null,
      domain: project.domain ?? null,
      experiment_type: project.experiment_type ?? null,
      original_hypothesis: project.original_hypothesis
    },
    plan: {
      id: plan.id,
      model_used: plan.model_used ?? null,
      created_at: plan.created_at
    },
    literature_qc: {
      novelty_signal: qc.novelty_signal,
      confidence: qc.confidence,
      summary: qc.summary,
      references
    },
    experiment_plan: {
      ...finalPlan,
      _debug_material_pricing_context: pricing_context
    },
    applied_rules,
    debug: {
      search_queries: searchQueries,
      required_materials: requiredMaterials,
      pricing_context_available: Object.keys(pricing_context).length > 0
    }
  };
}

export async function generatePlanForExistingProject(projectId: string): Promise<OrchestratorOutput> {
  const project = await dbGetProject(projectId);
  if (!project) throw new Error("Project not found");

  // If parsed_json is missing, re-run Step 1 quickly (rare)
  const parsed = project.parsed_json ?? {};
  const searchQueries = (parsed.search_queries ?? []).filter(Boolean).slice(0, 3);

  // If there is no literature QC yet, run it now (reusing the same logic as full pipeline)
  const clarifications = await dbGetClarifications(project.id);

  const rawTavilyResults = [];
  const effective = searchQueries.length ? searchQueries : [project.original_hypothesis];
  for (const q of effective) {
    const results = await tavilySearch(q, { maxResults: 3 });
    for (const r of results) rawTavilyResults.push({ query: q, ...r });
  }

  const allTavilyResults = await extractRelevantSections(rawTavilyResults);

  // Persist literature results for traceability
  await dbInsertLiteratureResults(
    project.id,
    allTavilyResults.slice(0, 15).map((r) => ({
      title: r.title ?? null,
      url: r.url ?? null,
      snippet: (r.snippet ?? r.content ?? null) as any,
      source: r.source ?? "tavily",
      relevance_score: r.score ?? null
    }))
  );

  const step2Prompt = prompts.literatureQC(project.original_hypothesis, allTavilyResults);
  const step2 = await generateJSON<any>({
    schemaName: "literature_qc",
    prompt: step2Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const qc = step2.json;
  await dbUpsertLiteratureQC(project.id, {
    novelty_signal: qc.novelty_signal,
    confidence: qc.confidence,
    summary: qc.summary
  });
  const references = (qc.references ?? []).slice(0, 3);

  // Step 3: rules
  const allRules = await dbListActiveSkillRules();
  const globalSkillUpdatedAt = await dbGetGlobalSkillUpdatedAt();
  const relevant = selectTopSkillRules(allRules, {
    domain: project.domain,
    experiment_type: project.experiment_type,
    hypothesis: project.original_hypothesis
  });
  const relevantRules = relevant.map((x) => x.rule);
  const alwaysInclude = allRules
    .filter((r: any) => r?.active && r?.source_comment_id)
    .slice(0, 25);
  const byId = new Set(relevantRules.map((r) => r.id));
  const combinedRules = [...relevantRules, ...alwaysInclude.filter((r) => !byId.has(r.id))];

  // Step 4: draft + materials
  const step4Prompt = prompts.draftProtocolAndMaterials({
    hypothesis: project.original_hypothesis,
    parsedJson: parsed,
    noveltyJson: qc,
    references,
    clarifications: clarifications.map((c) => ({ question_text: c.question_text, selected_answer: c.selected_answer })),
    relevantRules: combinedRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords }))
  });
  const step4 = await generateJSON<any>({
    schemaName: "draft_protocol_materials",
    prompt: step4Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const draft = step4.json;
  const requiredMaterials = (draft.required_materials ?? []).slice(0, 6);

  // Step 5: ground materials
  const pricing_context = await groundMaterials(requiredMaterials, { maxResultsPerMaterial: 2 });

  // Step 6: assemble final plan
  const step6Prompt = prompts.finalPlanAssembly({
    draftProtocolSteps: draft.draft_protocol_steps ?? [],
    requiredMaterials,
    pricingContext: pricing_context
  });
  const step6 = await generateJSON<any>({
    schemaName: "final_plan",
    prompt: step6Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const finalPlan = step6.json;

  const plan = await dbCreatePlan(project.id, finalPlan, step6.provider, {
    generated_with_skill_md_at: null,
    generated_with_global_skill_at: globalSkillUpdatedAt
  });
  const applied = (finalPlan.applied_feedback ?? []).filter((a: any) => isUuid(a?.rule_id));
  const appliedRows = applied.map((a: any) => ({
    rule_id: a.rule_id,
    applied_to_section: null,
    explanation: a.applied_change ?? null
  }));
  const applied_rules = appliedRows.length ? await dbInsertAppliedRules(plan.id, appliedRows as any) : [];

  return {
    project: {
      id: project.id,
      title: project.title ?? null,
      domain: project.domain ?? null,
      experiment_type: project.experiment_type ?? null,
      original_hypothesis: project.original_hypothesis
    },
    plan: { id: plan.id, model_used: plan.model_used ?? null, created_at: plan.created_at },
    literature_qc: {
      novelty_signal: qc.novelty_signal,
      confidence: qc.confidence,
      summary: qc.summary,
      references
    },
    experiment_plan: { ...finalPlan, _debug_material_pricing_context: pricing_context },
    applied_rules,
    debug: {
      search_queries: effective,
      required_materials: requiredMaterials,
      pricing_context_available: Object.keys(pricing_context).length > 0
    }
  };
}

export async function regeneratePlanFromPlanSkills(planId: string): Promise<OrchestratorOutput> {
  const plan = await dbGetPlan(planId);
  if (!plan) throw new Error("Plan not found");
  const project = await dbGetProject(plan.project_id);
  if (!project) throw new Error("Project not found");

  // Prefer using existing persisted QC + references to avoid re-running search.
  const [qc, literatureResults, clarifications, allRules, globalSkillUpdatedAt] = await Promise.all([
    dbGetLatestLiteratureQC(project.id),
    dbListLiteratureResults(project.id, 10),
    dbGetClarifications(project.id),
    dbListActiveSkillRules(),
    dbGetGlobalSkillUpdatedAt()
  ]);

  const parsed = project.parsed_json ?? {};
  const references = (literatureResults ?? []).slice(0, 3).map((r: any) => ({ title: r.title, url: r.url, relevance: r.snippet ?? "" }));

  // If QC is missing, fall back to the normal generator (which will populate it).
  if (!qc) return await generatePlanForExistingProject(project.id);

  const relevant = selectTopSkillRules(allRules, {
    domain: project.domain,
    experiment_type: project.experiment_type,
    hypothesis: project.original_hypothesis
  });
  const relevantRules = relevant.map((x) => x.rule);
  const alwaysInclude = allRules
    .filter((r: any) => r?.active && r?.source_comment_id)
    .slice(0, 25);
  const byId = new Set(relevantRules.map((r) => r.id));
  const combinedRules = [...relevantRules, ...alwaysInclude.filter((r) => !byId.has(r.id))];

  const step4Prompt = prompts.draftProtocolAndMaterials({
    hypothesis: project.original_hypothesis,
    parsedJson: parsed,
    noveltyJson: qc,
    references,
    clarifications: clarifications.map((c) => ({ question_text: c.question_text, selected_answer: c.selected_answer })),
    relevantRules: combinedRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords })),
    planSkillMd: plan.skill_md
  });

  const step4 = await generateJSON<any>({
    schemaName: "draft_protocol_materials",
    prompt: step4Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const draft = step4.json;
  const requiredMaterials = (draft.required_materials ?? []).slice(0, 6);

  const pricing_context = await groundMaterials(requiredMaterials, { maxResultsPerMaterial: 2 });

  const step6Prompt = prompts.finalPlanAssembly({
    draftProtocolSteps: draft.draft_protocol_steps ?? [],
    requiredMaterials,
    pricingContext: pricing_context
  });
  const step6 = await generateJSON<any>({
    schemaName: "final_plan",
    prompt: step6Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const finalPlan = step6.json;

  const newPlan = await dbCreatePlan(project.id, finalPlan, step6.provider, {
    generated_with_skill_md_at: plan.skill_md_updated_at ?? null,
    generated_with_global_skill_at: globalSkillUpdatedAt
  });

  const applied = (finalPlan.applied_feedback ?? []).filter((a: any) => isUuid(a?.rule_id));
  const appliedRows = applied.map((a: any) => ({
    rule_id: a.rule_id,
    applied_to_section: null,
    explanation: a.applied_change ?? null
  }));
  const applied_rules = appliedRows.length ? await dbInsertAppliedRules(newPlan.id, appliedRows as any) : [];

  return {
    project: {
      id: project.id,
      title: project.title ?? null,
      domain: project.domain ?? null,
      experiment_type: project.experiment_type ?? null,
      original_hypothesis: project.original_hypothesis
    },
    plan: { id: newPlan.id, model_used: newPlan.model_used ?? null, created_at: newPlan.created_at },
    literature_qc: {
      novelty_signal: (qc as any).novelty_signal,
      confidence: (qc as any).confidence,
      summary: (qc as any).summary,
      references
    },
    experiment_plan: { ...finalPlan, _debug_material_pricing_context: pricing_context },
    applied_rules,
    debug: {
      search_queries: (parsed.search_queries ?? []).filter(Boolean).slice(0, 3),
      required_materials: requiredMaterials,
      pricing_context_available: Object.keys(pricing_context).length > 0
    }
  };
}

