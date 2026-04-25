import { NextResponse } from "next/server";
import { z } from "zod";
import { dbGetProject } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateJSON } from "@/lib/llm";

const BodySchema = z.object({
  project_id: z.string().min(10),
  parsed: z.any().optional()
});

const QuestionSchema = z.object({
  id: z.string().min(1),
  question_text: z.string().min(1),
  options: z.array(z.string().min(1)).min(3).max(8)
});

const LLMOutputSchema = z.object({
  needs_clarification: z.boolean(),
  rationale: z.string().optional().default(""),
  questions: z.array(QuestionSchema)
});

type ClarifyingLLMOut = z.infer<typeof LLMOutputSchema>;

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const project = await dbGetProject(body.project_id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const parsed = body.parsed ?? project.parsed_json ?? null;
    const prompt = prompts.clarifyingQuestions({
      hypothesis: project.original_hypothesis,
      parsed
    });

    const out = await generateJSON<ClarifyingLLMOut>({
      schemaName: "clarifying_questions",
      prompt,
      hypothesisForRouting: project.original_hypothesis
    });

    const normalized = LLMOutputSchema.parse(out.json);

    let questions = normalized.questions ?? [];
    if (!normalized.needs_clarification) questions = [];
    questions = questions.slice(0, 5);

    // Extra validation: stable ids + non-empty options
    for (const q of questions) {
      if (!/^[a-z0-9_-]{3,64}$/i.test(q.id)) {
        throw new Error(`Invalid question id: ${q.id}`);
      }
    }

    return NextResponse.json({
      needs_clarification: normalized.needs_clarification && questions.length > 0,
      rationale: normalized.rationale ?? "",
      questions,
      llm_provider: out.provider
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to generate questions", message: err?.message ?? String(err) }, { status: 400 });
  }
}
