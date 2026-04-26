function trimTavilyResults(results: any[]): { title: string; url: string; snippet: string; score?: number }[] {
  return results.map((r) => ({
    title: String(r.title ?? "").slice(0, 120),
    url: String(r.url ?? ""),
    // content is already extracted abstract/methodology by the small model — allow more through
    snippet: String(r.snippet ?? r.content ?? "").slice(0, 800),
    ...(r.score != null ? { score: r.score } : {}),
  }));
}

function trimPricingContext(ctx: Record<string, { query: string; results: any[]; quotes?: any[] }>) {
  return Object.fromEntries(
    Object.entries(ctx).map(([item, { query, results, quotes }]) => [
      item,
      {
        query,
        results: results.slice(0, 2).map((r) => ({
          title: String(r.title ?? "").slice(0, 120),
          url: String(r.url ?? ""),
          snippet: String(r.snippet ?? r.content ?? "").slice(0, 200),
        })),
        quotes: (quotes ?? []).slice(0, 3).map((q) => ({
          vendor: q.vendor ?? null,
          price: q.price ?? null,
          currency: q.currency ?? null,
          pack_size: q.pack_size ?? null,
          url: q.url ?? null,
          retrieved_at: q.retrieved_at ?? null,
          confidence: q.confidence ?? null
        }))
      },
    ])
  );
}

export const prompts = {
  parseHypothesisAndQueries: (hypothesis: string) => `
You are a scientific search-query planner.
Given the user’s hypothesis, extract:
1. A short project title
2. Domain
3. Experiment type
4. Target or biological system
5. Intervention
6. Measurable outcome
7. Likely control condition
8. Sample/model system
9. 3–5 highly specific search queries to find existing scientific literature or protocols matching this hypothesis.

Return strict JSON:
{
  "title": "",
  "domain": "",
  "experiment_type": "",
  "target": "",
  "intervention": "",
  "outcome": "",
  "control": "",
  "sample_or_model": "",
  "search_queries": []
}

Hypothesis:
"""${hypothesis}"""
`.trim(),

  clarifyingQuestions: (input: { hypothesis: string; parsed: any }) => `
You are a senior scientific program manager helping turn a hypothesis into an executable experiment plan.

You will be given:
- the raw hypothesis text
- structured fields already extracted from the hypothesis (may be incomplete)

Your job:
1) Decide whether additional clarification is needed to produce a high-quality, operationally realistic plan.
2) If clarification is needed, propose 3–5 multiple-choice questions that resolve the highest-impact ambiguities.
3) If clarification is NOT needed, return an empty questions array.

Rules for questions:
- Only ask questions that materially change experimental design, validation, controls, model system, timeline, budget assumptions, or safety/ethics framing.
- Prefer questions that disambiguate missing or conflicting details implied by the hypothesis.
- Each question must have 4–6 options.
- Include an explicit "Not sure — recommend default" style option when appropriate.
- Do NOT ask generic filler questions if the hypothesis is already sufficiently specified.
- Do NOT ask the user to paste more text; questions must be multiple choice only.

Return strict JSON:
{
  "needs_clarification": true,
  "rationale": "",
  "questions": [
    {
      "id": "snake_case_id",
      "question_text": "",
      "options": ["", "", "", ""]
    }
  ]
}

If needs_clarification is false, questions must be [].

Hypothesis:
"""${input.hypothesis}"""

Parsed fields (JSON):
${JSON.stringify(input.parsed ?? null)}
`.trim(),

  literatureQC: (hypothesis: string, tavilyResults: any[]) => `
You are a scientific literature quality-control assistant.
Evaluate the novelty of the user’s hypothesis against the provided search results.

You must output exactly one novelty signal:
- not found
- similar work exists
- exact match found

Be conservative:
- If the exact same intervention, model, outcome, and assay are found, return exact match found.
- If only some parts match, return similar work exists.
- If no close match is found, return not found.

Return strict JSON:
{
  "novelty_signal": "not found | similar work exists | exact match found",
  "confidence": 0.0,
  "summary": "",
  "references": [
    { "title": "", "url": "", "relevance": "" }
  ]
}

Return 1–3 references maximum.

Hypothesis:
"""${hypothesis}"""

Search results (JSON):
${JSON.stringify(trimTavilyResults(tavilyResults))}
`.trim(),

  draftProtocolAndMaterials: (input: {
    hypothesis: string;
    parsedJson: any;
    noveltyJson: any;
    references: any[];
    clarifications: { question_text: string; selected_answer: string }[];
    relevantRules: { id: string; section: string | null; rule_text: string | null; keywords: string[] | null }[];
    planSkillMd?: string | null;
  }) => `
You are a senior scientific operations planner.
Draft a practical step-by-step experimental methodology grounded in real published protocols where possible.
Then extract a strict JSON array of the top 5–8 specific physical materials required to execute this protocol.

Important:
- Do not guess prices.
- Do not guess catalog numbers.
- Include only physical reagents, kits, biological materials, assays, cell lines, animal model items, antibodies, or equipment-critical consumables.
- If a material needs later supplier grounding, include it in required_materials.
- Apply relevant skill rules where appropriate.

Return strict JSON:
{
  "draft_protocol_steps": [
    { "step": 1, "title": "", "description": "", "duration": "", "critical_notes": [] }
  ],
  "required_materials": [
    { "item_name": "", "intended_use": "", "preferred_supplier_hint": "", "search_query": "" }
  ],
  "applied_skill_rules": [
    { "rule_id": "", "applied_change": "" }
  ]
}

Hypothesis:
"""${input.hypothesis}"""

Parsed hypothesis (JSON):
${JSON.stringify(input.parsedJson)}

Literature QC (JSON):
${JSON.stringify(input.noveltyJson)}

Selected references (JSON):
${JSON.stringify(input.references)}

Clarification answers (JSON):
${JSON.stringify(input.clarifications)}

Relevant skill rules (JSON):
${JSON.stringify(input.relevantRules)}

Plan-specific skill memory (SKILL.md, markdown):
${input.planSkillMd ? input.planSkillMd : "(none)"}
`.trim(),

  finalPlanAssembly: (input: {
    draftProtocolSteps: any[];
    requiredMaterials: any[];
    pricingContext: any;
  }) => `
You are a senior PI and scientific operations planner.
Expand the draft protocol and materials below into a complete final experiment plan.

Rules:
- Use the draft protocol steps as-is; expand descriptions where useful but do not contradict them.
- Use only pricing_context to fill supplier, catalog_number, and price fields.
- Do not invent catalog numbers or prices. Use null / "supplier lookup required" when absent.
- Include realistic budget, timeline, validation approach, controls, and risks.

Return strict JSON:
{
  "protocol": [
    { "step": 1, "title": "", "description": "", "duration": "", "critical_notes": [] }
  ],
  "materials": [
    {
      "item_name": "",
      "intended_use": "",
      "supplier": "",
      "catalog_number": "",
      "price": null,
      "price_currency": "",
      "price_note": "",
      "source_url": ""
    }
  ],
  "budget": {
    "total_estimated_cost": null,
    "currency": "USD",
    "line_items": [{ "category": "", "item_name": "", "cost": null, "note": "" }],
    "limitations": ""
  },
  "timeline": [{ "phase": "", "duration": "", "dependencies": [], "deliverable": "" }],
  "validation_approach": [{ "test": "", "purpose": "", "success_criterion": "" }],
  "controls": [{ "control": "", "rationale": "" }],
  "risks": [{ "risk": "", "impact": "", "mitigation": "" }],
  "pi_review_required": "This is a planning draft and must be reviewed by a qualified scientist before lab execution.",
  "applied_feedback": [{ "rule_id": "", "applied_change": "" }]
}

Draft protocol steps (JSON):
${JSON.stringify(input.draftProtocolSteps)}

Required materials (JSON):
${JSON.stringify(input.requiredMaterials)}

Pricing context (supplier lookup results, JSON):
${JSON.stringify(trimPricingContext(input.pricingContext))}
`.trim(),

  generatePlanSkillMd: (input: {
    comments: { section: string | null; selected_text: string | null; comment_text: string | null; severity: string | null; is_global: boolean }[];
    domain: string | null;
    experiment_type: string | null;
  }) => `
You are a scientific operations expert distilling expert annotations into a structured skill document.
Given a list of comments left by a scientist on an experiment plan, write a SKILL.md document for this specific plan.

Format:
# Plan Skill Memory

## Key Corrections
(bullet list of the most important corrections, referencing which section they apply to)

## Patterns to Apply Next Time
(bullet list of reusable lessons learned, framed as rules for future plans of this domain/type)

## Watch Out For
(bullet list of risks or oversights flagged in these comments)

Rules:
- Be concise, specific, and actionable.
- Do not repeat the raw comment text verbatim; distill into lessons.
- Group by section where it makes sense.
- If is_global=true on a comment, mark it with "(→ global rule)" to indicate it applies beyond this plan.

Domain: ${input.domain ?? "Unknown"}
Experiment type: ${input.experiment_type ?? "Unknown"}

Comments (JSON):
${JSON.stringify(input.comments)}
`.trim(),

  distillSkillRule: (input: {
    selected_text: string;
    comment_text: string;
    section: string;
    domain: string | null;
    experiment_type: string | null;
  }) => `
You are converting a scientist’s text-level correction into a reusable experiment-planning rule.
Given:
- selected text
- scientist comment
- section
- domain
- experiment type
Return strict JSON:
{
  "rule_text": "",
  "keywords": [],
  "section": "",
  "severity": ""
}
The rule should be general enough to help future similar experiments, but not overgeneralized.

selected_text:
"""${input.selected_text}"""

scientist_comment:
"""${input.comment_text}"""

section: ${input.section}
domain: ${input.domain ?? "null"}
experiment_type: ${input.experiment_type ?? "null"}
`.trim()
};

