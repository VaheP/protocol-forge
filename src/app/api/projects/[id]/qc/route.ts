import { NextResponse } from "next/server";
import { dbGetLatestLiteratureQC, dbListLiteratureResults } from "@/lib/db";

function normUrl(u: any) {
  const s = String(u ?? "").trim();
  if (!s) return "";
  return s.replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
}

function dedupeByUrlOrTitle(items: any[]) {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const r of items ?? []) {
    const url = normUrl(r?.url);
    const title = String(r?.title ?? "").trim().toLowerCase();
    const k = url || title;
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const qc = await dbGetLatestLiteratureQC(params.id);
    const references = await dbListLiteratureResults(params.id, 10);
    return NextResponse.json({ literature_qc: qc, literature_results: dedupeByUrlOrTitle(references) });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load QC", message: err?.message ?? String(err) }, { status: 400 });
  }
}
