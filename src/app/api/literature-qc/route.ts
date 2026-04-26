import { NextResponse } from "next/server";
import { z } from "zod";
import { dbGetClarifications, dbGetProject, dbInsertLiteratureResults, dbListLiteratureResults, dbUpsertLiteratureQC } from "@/lib/db";
import { prompts } from "@/lib/prompts";
import { generateJSON } from "@/lib/llm";
import { tavilySearch } from "@/lib/tavily";
import { extractRelevantSections } from "@/lib/extraction";

function normUrl(u: any) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  return s.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
}

function refKey(r: any) {
  const url = normUrl(r?.url);
  const title = String(r?.title ?? "").trim().toLowerCase();
  return url || title;
}

function dedupeRefs<T extends { title?: any; url?: any }>(refs: T[]) {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const r of refs ?? []) {
    const k = refKey(r);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

const BodySchema = z.object({
  project_id: z.string().min(10)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const project = await dbGetProject(body.project_id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const parsed = project.parsed_json ?? {};
    const queries: string[] = (parsed.search_queries ?? []).filter(Boolean).slice(0, 3);

    const effective = queries.length ? queries : [project.original_hypothesis];

    const raw = [];
    for (const q of effective) {
      const results = await tavilySearch(q, { maxResults: 3 });
      for (const r of results) raw.push({ query: q, ...r });
    }

    const all = await extractRelevantSections(raw);

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
      all
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

    // De-dupe LLM-picked references (they sometimes repeat verbatim).
    const qcRefs = dedupeRefs((qc.json.references ?? []) as any[]).slice(0, 8);

    // Persist QC-picked references into literature_results so the plan page and QC view agree.
    // Only insert ones we haven't already stored (best-effort based on URL).
    const existing = await dbListLiteratureResults(project.id, 50);
    const existingUrls = new Set(existing.map((r: any) => normUrl(r?.url)).filter(Boolean));
    const toInsert = qcRefs
      .filter((r: any) => {
        const u = normUrl(r?.url);
        if (!u) return false;
        return !existingUrls.has(u);
      })
      .slice(0, 5)
      .map((r: any) => ({
        title: r.title ?? null,
        url: r.url ?? null,
        snippet: (r.relevance ?? null) as any,
        source: "qc_ref",
        relevance_score: 0.99
      }));

    if (toInsert.length) {
      await dbInsertLiteratureResults(project.id, toInsert as any);
    }

    // Return the union of: QC-picked refs + stored literature refs (deduped).
    const after = await dbListLiteratureResults(project.id, 15);
    const union = dedupeRefs([
      ...qcRefs.map((r: any) => ({ title: r.title, url: r.url, relevance: r.relevance ?? "" })),
      ...after.map((r: any) => ({ title: r.title, url: r.url, relevance: r.snippet ?? "" }))
    ]).slice(0, 5);

    return NextResponse.json({
      literature_qc: persisted,
      references: union,
      debug: { search_queries: effective, llm_provider: qc.provider }
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to run literature QC", message: err?.message ?? String(err) }, { status: 400 });
  }
}

