import { env, hasAnyLLMKey } from "@/lib/env";

type SchemaName =
  | "parse_hypothesis_queries"
  | "clarifying_questions"
  | "literature_qc"
  | "draft_protocol_materials"
  | "final_plan"
  | "distill_skill_rule";

type GenerateJSONResult<T> = { json: T; provider: string };

function safeJsonParse<T>(raw: string): T {
  // tolerate accidental surrounding text by extracting first {...} block
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const slice = raw.slice(first, last + 1);
    return JSON.parse(slice) as T;
  }
  return JSON.parse(raw) as T;
}

function guessMockCase(hypothesis: string) {
  const h = hypothesis.toLowerCase();
  if (h.includes("crp") && (h.includes("biosensor") || h.includes("electrochemical"))) return "crp";
  if (h.includes("hela") || h.includes("cryoprotect") || h.includes("trehalose") || h.includes("dmso")) return "hela";
  if (h.includes("lactobacillus") || h.includes("fitc-dextran") || h.includes("intestinal permeability") || h.includes("c57bl/6"))
    return "gut";
  if (h.includes("il-6") && (h.includes("biosensor") || h.includes("electrochemical"))) return "il6";
  return "generic";
}

function mockGenerate<T>(schemaName: SchemaName, prompt: string, hypothesisForRouting: string): GenerateJSONResult<T> {
  const which = guessMockCase(hypothesisForRouting);

  if (schemaName === "parse_hypothesis_queries") {
    const base =
      which === "gut"
        ? {
            title: "LGG supplementation and gut permeability in C57BL/6 mice",
            domain: "Animal Study",
            experiment_type: "Gut permeability",
            target: "intestinal permeability",
            intervention: "Lactobacillus rhamnosus GG supplementation for 4 weeks",
            outcome: "Reduced FITC-dextran permeability; increased claudin-1/occludin expression",
            control: "untreated or vehicle-treated C57BL/6 mice",
            sample_or_model: "C57BL/6 mice",
            search_queries: [
              "Lactobacillus rhamnosus GG C57BL/6 intestinal permeability FITC-dextran",
              "Lactobacillus rhamnosus GG claudin-1 occludin tight junction mice",
              "probiotic LGG FITC-dextran assay intestinal permeability mouse model"
            ]
          }
        : which === "crp"
          ? {
              title: "Paper-based electrochemical CRP biosensor in whole blood",
              domain: "Diagnostics",
              experiment_type: "Whole-blood electrochemical biosensor",
              target: "C-reactive protein (CRP)",
              intervention: "anti-CRP antibody functionalization on paper-based electrode",
              outcome: "LOD < 0.5 mg/L within 10 minutes",
              control: "blank matrix + known CRP standards + non-specific antibody control",
              sample_or_model: "human whole blood / spiked samples",
              search_queries: [
                "paper-based electrochemical CRP immunosensor whole blood",
                "C-reactive protein electrochemical biosensor validation whole blood",
                "anti-fouling coatings electrochemical sensors whole blood"
              ]
            }
          : which === "il6"
            ? {
                title: "Paper-based electrochemical IL-6 biosensor in whole blood",
                domain: "Diagnostics",
                experiment_type: "Whole-blood electrochemical biosensor",
                target: "Interleukin-6 (IL-6)",
                intervention: "anti-IL-6 antibody functionalization on paper-based electrode",
                outcome: "rapid detection in whole blood",
                control: "blank matrix + spiked IL-6 standards + non-specific antibody control",
                sample_or_model: "human whole blood / spiked samples",
                search_queries: [
                  "paper-based electrochemical IL-6 immunosensor whole blood",
                  "interleukin-6 electrochemical biosensor anti-fouling whole blood"
                ]
              }
            : which === "hela"
              ? {
                  title: "Trehalose vs sucrose in HeLa cryopreservation",
                  domain: "Cell Biology",
                  experiment_type: "Cryopreservation",
                  target: "post-thaw viability",
                  intervention: "trehalose in freezing medium (vs sucrose) with DMSO baseline",
                  outcome: "15 percentage point viability improvement",
                  control: "standard DMSO protocol and/or sucrose substitution control",
                  sample_or_model: "HeLa cells",
                  search_queries: [
                    "trehalose cryopreservation HeLa viability 24 hour recovery",
                    "sucrose trehalose cryoprotectant DMSO post thaw viability"
                  ]
                }
              : {
                  title: "New experiment project",
                  domain: "General",
                  experiment_type: "Experiment",
                  target: "unknown",
                  intervention: "unknown",
                  outcome: "unknown",
                  control: "unknown",
                  sample_or_model: "unknown",
                  search_queries: ["<add specific query 1>", "<add specific query 2>", "<add specific query 3>"]
                };
    return { json: base as any as T, provider: "mock" };
  }

  if (schemaName === "literature_qc") {
    const json =
      which === "crp" || which === "gut" || which === "hela" || which === "il6"
        ? {
            novelty_signal: "similar work exists",
            confidence: 0.62,
            summary:
              "Similar protocols and related studies exist; ensure the exact intervention, model, and assay details are differentiated and validated appropriately.",
            references: [
              { title: "Protocol overview / review (mock)", url: "https://example.org/general-mock", relevance: "Assay and protocol background." }
            ]
          }
        : {
            novelty_signal: "not found",
            confidence: 0.45,
            summary: "No close match found in mock context. Run Tavily for real novelty checks.",
            references: []
          };
    return { json: json as any as T, provider: "mock" };
  }

  if (schemaName === "draft_protocol_materials") {
    const json =
      which === "gut"
        ? {
            draft_protocol_steps: [
              {
                step: 1,
                title: "Study setup and randomisation",
                description: "Randomise C57BL/6 mice into LGG vs control groups; define dosing schedule and blinding where feasible.",
                duration: "2–3 days",
                critical_notes: ["Pre-register primary outcome and exclusion criteria.", "Confirm animal ethics approval."]
              },
              {
                step: 2,
                title: "LGG supplementation phase",
                description: "Administer Lactobacillus rhamnosus GG daily for 4 weeks (oral gavage or in drinking water; keep regimen consistent).",
                duration: "4 weeks",
                critical_notes: ["Track body weight and health daily/weekly per protocol."]
              },
              {
                step: 3,
                title: "FITC-dextran intestinal permeability assay",
                description:
                  "Fast mice as required, administer FITC-dextran by gavage, collect blood at defined timepoint(s), quantify fluorescence in serum/plasma using a plate reader.",
                duration: "1–2 days",
                critical_notes: ["Standardise gavage volume by weight.", "Include dosing rationale and calibration curve."]
              },
              {
                step: 4,
                title: "Tight junction protein readouts",
                description:
                  "Collect intestinal tissue, perform qPCR and/or western blot/IHC for claudin-1 and occludin; normalise to housekeeping controls.",
                duration: "3–7 days",
                critical_notes: ["Ensure tissue handling is consistent across groups."]
              }
            ],
            required_materials: [
              {
                item_name: "Lactobacillus rhamnosus GG (LGG) strain",
                intended_use: "probiotic intervention dosing",
                preferred_supplier_hint: "ATCC or equivalent culture collection",
                search_query: "Lactobacillus rhamnosus GG ATCC catalog number price"
              },
              {
                item_name: "FITC-dextran (4 kDa)",
                intended_use: "intestinal permeability assay",
                preferred_supplier_hint: "Sigma-Aldrich",
                search_query: "FITC-dextran 4 kDa Sigma-Aldrich catalog number price"
              },
              {
                item_name: "Anti-claudin-1 primary antibody",
                intended_use: "tight junction protein detection",
                preferred_supplier_hint: "Cell Signaling Technology or Abcam",
                search_query: "anti-claudin-1 primary antibody catalog number price"
              },
              {
                item_name: "Anti-occludin primary antibody",
                intended_use: "tight junction protein detection",
                preferred_supplier_hint: "Cell Signaling Technology or Abcam",
                search_query: "anti-occludin primary antibody catalog number price"
              },
              {
                item_name: "Fluorescence plate reader consumables (96-well plates)",
                intended_use: "FITC fluorescence quantification",
                preferred_supplier_hint: "Corning or equivalent",
                search_query: "black 96-well plate fluorescence FITC catalog number price"
              }
            ],
            applied_skill_rules: []
          }
        : {
            draft_protocol_steps: [
              { step: 1, title: "Draft protocol", description: "Mock draft protocol steps.", duration: "TBD", critical_notes: [] }
            ],
            required_materials: [
              { item_name: "Key reagent", intended_use: "execute assay", preferred_supplier_hint: "supplier lookup required", search_query: "key reagent catalog number price" }
            ],
            applied_skill_rules: []
          };
    return { json: json as any as T, provider: "mock" };
  }

  if (schemaName === "final_plan") {
    const json =
      which === "gut"
        ? {
            protocol: [
              { step: 1, title: "Study setup and randomisation", description: "Randomise mice into LGG vs control; confirm ethics and endpoints.", duration: "2–3 days", critical_notes: ["Include ethics/randomisation notes."] },
              { step: 2, title: "LGG supplementation", description: "Administer LGG daily for 4 weeks; monitor health and weight.", duration: "4 weeks", critical_notes: ["Keep dosing consistent."] },
              { step: 3, title: "FITC-dextran assay", description: "Administer FITC-dextran, collect blood, quantify fluorescence with calibration curve.", duration: "1–2 days", critical_notes: ["Standardise gavage by weight."] },
              { step: 4, title: "Tight junction readouts", description: "Assess claudin-1/occludin via qPCR and/or western/IHC.", duration: "3–7 days", critical_notes: ["Use consistent tissue handling."] }
            ],
            materials: [
              { item_name: "FITC-dextran (4 kDa)", intended_use: "intestinal permeability assay", supplier: "supplier lookup required", catalog_number: "supplier lookup required", price: null, price_currency: "USD", price_note: "not found in supplied context", source_url: "" }
            ],
            budget: {
              total_estimated_cost: null,
              currency: "USD",
              line_items: [{ category: "Reagents", item_name: "FITC-dextran (4 kDa)", cost: null, note: "Price not grounded; supplier lookup required." }],
              limitations: "Budget line items require supplier grounding; prices not invented."
            },
            timeline: [
              { phase: "Prep + approvals", duration: "1 week", dependencies: [], deliverable: "Approved protocol and randomisation plan" },
              { phase: "Intervention", duration: "4 weeks", dependencies: ["Prep + approvals"], deliverable: "Completed supplementation regimen" },
              { phase: "Assays + analysis", duration: "2 weeks", dependencies: ["Intervention"], deliverable: "Permeability + tight junction results" }
            ],
            validation_approach: [
              { test: "FITC-dextran calibration curve", purpose: "Quantify permeability robustly", success_criterion: "Linear response across relevant range" }
            ],
            controls: [
              { control: "Vehicle-treated / untreated controls", rationale: "Baseline permeability comparison" },
              { control: "Randomisation + blinding (where feasible)", rationale: "Reduce bias" }
            ],
            risks: [
              { risk: "High assay variability due to gavage technique", impact: "Reduced power / false negatives", mitigation: "Training, standardised dosing, replicate measurements" }
            ],
            pi_review_required: "This is a planning draft and must be reviewed by a qualified scientist before lab execution.",
            applied_feedback: []
          }
        : {
            protocol: [{ step: 1, title: "Plan", description: "Mock final plan.", duration: "TBD", critical_notes: [] }],
            materials: [
              { item_name: "Key reagent", intended_use: "execute assay", supplier: "supplier lookup required", catalog_number: "supplier lookup required", price: null, price_currency: "USD", price_note: "not found in supplied context", source_url: "" }
            ],
            budget: { total_estimated_cost: null, currency: "USD", line_items: [], limitations: "Mock." },
            timeline: [{ phase: "Draft", duration: "TBD", dependencies: [], deliverable: "Draft" }],
            validation_approach: [],
            controls: [],
            risks: [],
            pi_review_required: "This is a planning draft and must be reviewed by a qualified scientist before lab execution.",
            applied_feedback: []
          };
    return { json: json as any as T, provider: "mock" };
  }

  if (schemaName === "clarifying_questions") {
    // Without an LLM, we cannot responsibly invent clarification questions.
    // Keep the pipeline unblocked by returning "no clarification needed".
    const json = {
      needs_clarification: false,
      rationale: "No LLM configured: skipping clarification generation (no hardcoded templates).",
      questions: [] as any[]
    };
    return { json: json as any as T, provider: "mock" };
  }

  if (schemaName === "distill_skill_rule") {
    const json = {
      rule_text: "When uncertain, add explicit controls and validation constraints; do not rely on a single matrix or timepoint.",
      keywords: ["controls", "validation", "matrix", "timepoint"],
      section: "Validation",
      severity: "Medium"
    };
    return { json: json as any as T, provider: "mock" };
  }

  return { json: safeJsonParse<T>(prompt) as any as T, provider: "mock" };
}

async function openAIChat(prompt: string): Promise<string> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function groqChat(prompt: string): Promise<string> {
  const apiKey = env("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY missing");
  const model = env("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq error: HTTP ${res.status}. ${text.slice(0, 200)}`.trim());
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function openRouterChat(prompt: string): Promise<string> {
  const apiKey = env("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY missing");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

async function ollamaChat(prompt: string): Promise<string> {
  const base = env("OLLAMA_BASE_URL");
  if (!base) throw new Error("OLLAMA_BASE_URL missing");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1",
      prompt,
      stream: false
    })
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const json = await res.json();
  return json.response ?? "";
}

export async function generateJSON<T>(args: { schemaName: SchemaName; prompt: string; hypothesisForRouting: string }): Promise<GenerateJSONResult<T>> {
  if (!hasAnyLLMKey()) return mockGenerate<T>(args.schemaName, args.prompt, args.hypothesisForRouting);

  const order: Array<{ name: string; enabled: boolean; run: (p: string) => Promise<string> }> = [
    { name: "openai", enabled: Boolean(env("OPENAI_API_KEY")), run: openAIChat },
    { name: "groq", enabled: Boolean(env("GROQ_API_KEY")), run: groqChat },
    { name: "openrouter", enabled: Boolean(env("OPENROUTER_API_KEY")), run: openRouterChat },
    { name: "ollama", enabled: Boolean(env("OLLAMA_BASE_URL")), run: ollamaChat }
  ];

  const provider = order.find((p) => p.enabled);
  if (!provider) return mockGenerate<T>(args.schemaName, args.prompt, args.hypothesisForRouting);

  try {
    const raw = await provider.run(args.prompt);
    const json = safeJsonParse<T>(raw);
    return { json, provider: provider.name };
  } catch (e) {
    // In "real mode" (keys present), surface the error rather than silently returning mock.
    // This prevents confusing "mock" outputs when you expect real provider calls.
    throw e;
  }
}

