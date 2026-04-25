import { NextResponse } from "next/server";
import { z } from "zod";
import { dbGetClarifications, dbGetProject, dbInsertLiteratureResults, dbUpsertLiteratureQC } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateJSON } from "@/lib/llm";
import { tavilySearch } from "@/lib/tavily";

const BodySchema = z.object({
  project_id: z.string().min(10)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const project = await dbGetProject(body.project_id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const parsed = project.parsed_json ?? {};
    const queries: string[] = (parsed.search_queries ?? []).filter(Boolean).slice(0, 5);

    // If no queries, fall back to a generic hypothesis query
    const effective = queries.length ? queries : [project.original_hypothesis];

    const all = [];
    for (const q of effective) {
      const results = await tavilySearch(q, { maxResults: 4 });
      for (const r of results) all.push({ query: q, ...r });
    }

    await dbInsertLiteratureResults(
      project.id,
      all.slice(0, 15).map((r) => ({
        title: r.title ?? null,
        url: r.url ?? null,
        snippet: (r.snippet ?? r.content ?? null) as any,
        source: r.source ?? "tavily",
        relevance_score: r.score ?? null
      }))
    );

    const clarifications = await dbGetClarifications(project.id);
    const prompt = prompts.literatureQC(
      project.original_hypothesis +
        "\n\nClarifications:\n" +
        JSON.stringify(clarifications.map((c) => ({ q: c.question_text, a: c.selected_answer }))),
      JSON.stringify(all)
    );

    const qc = await generateJSON<any>({
      schemaName: "literature_qc",
      prompt,
      hypothesisForRouting: project.original_hypothesis
    });

    const persisted = await dbUpsertLiteratureQC(project.id, {
      novelty_signal: qc.json.novelty_signal,
      confidence: qc.json.confidence,
      summary: qc.json.summary
    });

    return NextResponse.json({
      literature_qc: persisted,
      references: (qc.json.references ?? []).slice(0, 3),
      debug: { search_queries: effective, llm_provider: qc.provider }
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to run literature QC", message: err?.message ?? String(err) }, { status: 400 });
  }
}

