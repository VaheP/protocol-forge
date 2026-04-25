import { generateJSON } from "@/lib/llm";
import { prompts } from "@/lib/prompts";
import { tavilySearch } from "@/lib/tavily";
import { groundMaterials, type RequiredMaterial } from "@/lib/materialGrounding";
import {
  dbCreatePlan,
  dbCreateProject,
  dbGetProject,
  dbInsertAppliedRules,
  dbInsertLiteratureResults,
  dbListActiveSkillRules,
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
  const searchQueries = (parsed.search_queries ?? []).filter(Boolean).slice(0, 5);

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
  const allTavilyResults = [];
  for (const q of searchQueries) {
    const results = await tavilySearch(q, { maxResults: 4 });
    for (const r of results) {
      allTavilyResults.push({ query: q, ...r });
    }
  }

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
  const step2Prompt = prompts.literatureQC(hypothesis, JSON.stringify(allTavilyResults));
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
  const relevant = selectTopSkillRules(allRules, {
    domain: project.domain,
    experiment_type: project.experiment_type,
    hypothesis
  });
  const relevantRules = relevant.map((x) => x.rule);

  // Step 4: Draft protocol + material extraction
  const step4Prompt = prompts.draftProtocolAndMaterials({
    hypothesis,
    parsedJson: parsed,
    noveltyJson: qc,
    references,
    clarifications: clarifications.map((c) => ({ question_text: c.question_text, selected_answer: c.selected_answer })),
    relevantRules: relevantRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords }))
  });
  const step4 = await generateJSON<DraftProtocolJson>({
    schemaName: "draft_protocol_materials",
    prompt: step4Prompt,
    hypothesisForRouting: hypothesis
  });

  const draft = step4.json;
  const requiredMaterials = (draft.required_materials ?? []).slice(0, 8);

  // Step 5: Mandatory supply chain grounding via Tavily
  const pricing_context = await groundMaterials(requiredMaterials, { maxResultsPerMaterial: 3 });

  // Step 6: Final plan assembly
  const step6Prompt = prompts.finalPlanAssembly({
    hypothesis,
    parsedJson: parsed,
    literatureQC: qc,
    references,
    relevantRules: relevantRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords, severity: r.severity })),
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
  const plan = await dbCreatePlan(project.id, finalPlan, step6.provider);

  const applied = (finalPlan.applied_feedback ?? []).filter((a) => a?.rule_id);
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
  const searchQueries = (parsed.search_queries ?? []).filter(Boolean).slice(0, 5);

  // If there is no literature QC yet, run it now (reusing the same logic as full pipeline)
  const clarifications = await dbGetClarifications(project.id);

  const allTavilyResults = [];
  const effective = searchQueries.length ? searchQueries : [project.original_hypothesis];
  for (const q of effective) {
    const results = await tavilySearch(q, { maxResults: 4 });
    for (const r of results) allTavilyResults.push({ query: q, ...r });
  }

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

  const step2Prompt = prompts.literatureQC(project.original_hypothesis, JSON.stringify(allTavilyResults));
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
  const relevant = selectTopSkillRules(allRules, {
    domain: project.domain,
    experiment_type: project.experiment_type,
    hypothesis: project.original_hypothesis
  });
  const relevantRules = relevant.map((x) => x.rule);

  // Step 4: draft + materials
  const step4Prompt = prompts.draftProtocolAndMaterials({
    hypothesis: project.original_hypothesis,
    parsedJson: parsed,
    noveltyJson: qc,
    references,
    clarifications: clarifications.map((c) => ({ question_text: c.question_text, selected_answer: c.selected_answer })),
    relevantRules: relevantRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords }))
  });
  const step4 = await generateJSON<any>({
    schemaName: "draft_protocol_materials",
    prompt: step4Prompt,
    hypothesisForRouting: project.original_hypothesis
  });
  const draft = step4.json;
  const requiredMaterials = (draft.required_materials ?? []).slice(0, 8);

  // Step 5: ground materials
  const pricing_context = await groundMaterials(requiredMaterials, { maxResultsPerMaterial: 3 });

  // Step 6: assemble final plan
  const step6Prompt = prompts.finalPlanAssembly({
    hypothesis: project.original_hypothesis,
    parsedJson: parsed,
    literatureQC: qc,
    references,
    relevantRules: relevantRules.map((r) => ({ id: r.id, section: r.section, rule_text: r.rule_text, keywords: r.keywords, severity: r.severity })),
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

  const plan = await dbCreatePlan(project.id, finalPlan, step6.provider);
  const applied = (finalPlan.applied_feedback ?? []).filter((a: any) => a?.rule_id);
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

