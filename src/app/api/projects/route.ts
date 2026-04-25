import { NextResponse } from "next/server";
import { z } from "zod";
import { dbCreateProject, dbListProjects } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateJSON } from "@/lib/llm";
import { computeProjectResume } from "@/lib/resume";

export async function GET() {
  const projects = await dbListProjects(50);
  const enriched = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      resume: await computeProjectResume(p.id)
    }))
  );
  return NextResponse.json({ projects: enriched });
}

const BodySchema = z.object({ hypothesis: z.string().min(10) });

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const prompt = prompts.parseHypothesisAndQueries(body.hypothesis);
    const parsed = await generateJSON<any>({
      schemaName: "parse_hypothesis_queries",
      prompt,
      hypothesisForRouting: body.hypothesis
    });

    const p = await dbCreateProject({
      title: parsed.json.title ?? null,
      original_hypothesis: body.hypothesis,
      domain: parsed.json.domain ?? null,
      experiment_type: parsed.json.experiment_type ?? null,
      target: parsed.json.target ?? null,
      sample_type: parsed.json.sample_or_model ?? null,
      parsed_json: parsed.json
    });

    return NextResponse.json({ project: p, parsed: parsed.json });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to create project", message: err?.message ?? String(err) }, { status: 400 });
  }
}

