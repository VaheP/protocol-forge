import { NextResponse } from "next/server";
import { z } from "zod";
import { dbCreateComment, dbCreateSkillRule, dbGetPlan, dbGetProject } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateJSON } from "@/lib/llm";

const BodySchema = z.object({
  plan_id: z.string().min(10),
  section: z.string().min(1),
  selected_text: z.string().min(1),
  comment_text: z.string().min(1),
  feedback_type: z.string().min(1),
  severity: z.enum(["Low", "Medium", "High"]).or(z.string()),
  reusable: z.boolean().default(true),
  is_global: z.boolean().default(false),
  char_start: z.number().nullable().optional(),
  char_end: z.number().nullable().optional()
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const plan = await dbGetPlan(body.plan_id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const comment = await dbCreateComment({
      plan_id: body.plan_id,
      section: body.section,
      selected_text: body.selected_text,
      comment_text: body.comment_text,
      feedback_type: body.feedback_type,
      severity: body.severity,
      reusable: body.is_global || body.reusable,
      is_global: body.is_global,
      char_start: body.char_start ?? null,
      char_end: body.char_end ?? null
    });

    if (!body.is_global) return NextResponse.json({ comment_id: comment.id, comment, skill_rule: null });

    // Best-effort pull project domain/type for better distillation
    const project = await dbGetProject(plan.project_id);
    const domain = project?.domain ?? null;
    const experiment_type = project?.experiment_type ?? null;

    const prompt = prompts.distillSkillRule({
      selected_text: body.selected_text,
      comment_text: body.comment_text,
      section: body.section,
      domain,
      experiment_type
    });

    const distilled = await generateJSON<{
      rule_text: string;
      keywords: string[];
      section: string;
      severity: string;
    }>({ schemaName: "distill_skill_rule", prompt, hypothesisForRouting: project?.original_hypothesis ?? "" });

    const skillRule = await dbCreateSkillRule({
      source_comment_id: comment.id,
      domain,
      experiment_type,
      section: distilled.json.section || body.section,
      rule_text: distilled.json.rule_text,
      keywords: distilled.json.keywords ?? [],
      severity: distilled.json.severity ?? body.severity,
      active: true
    });

    return NextResponse.json({ comment_id: comment.id, comment, skill_rule: skillRule });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to save comment", message: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}

