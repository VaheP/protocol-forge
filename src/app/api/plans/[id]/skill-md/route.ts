import { NextResponse } from "next/server";
import { dbGetPlan, dbGetProject, dbListCommentsByPlan, dbUpdatePlanSkillMd } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateText } from "@/lib/llm";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const plan = await dbGetPlan(params.id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const [comments, project] = await Promise.all([
      dbListCommentsByPlan(params.id),
      dbGetProject(plan.project_id)
    ]);

    if (comments.length === 0) {
      return NextResponse.json({ error: "No comments to distill" }, { status: 400 });
    }

    const prompt = prompts.generatePlanSkillMd({
      comments: comments.map((c) => ({
        section: c.section,
        selected_text: c.selected_text,
        comment_text: c.comment_text,
        severity: c.severity,
        is_global: c.is_global
      })),
      domain: project?.domain ?? null,
      experiment_type: project?.experiment_type ?? null
    });

    const result = await generateText(prompt);
    const skillMd = result.text.trim();
    const updated = await dbUpdatePlanSkillMd(params.id, skillMd);

    return NextResponse.json({ skill_md: updated.skill_md, provider: result.provider });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to generate skill memory", message: err?.message ?? String(err) }, { status: 400 });
  }
}
