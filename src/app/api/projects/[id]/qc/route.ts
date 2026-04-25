import { NextResponse } from "next/server";
import { dbGetLatestLiteratureQC, dbListLiteratureResults } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const qc = await dbGetLatestLiteratureQC(params.id);
    const references = await dbListLiteratureResults(params.id, 10);
    return NextResponse.json({ literature_qc: qc, literature_results: references });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load QC", message: err?.message ?? String(err) }, { status: 400 });
  }
}
