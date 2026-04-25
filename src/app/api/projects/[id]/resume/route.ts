import { NextResponse } from "next/server";
import { computeProjectResume } from "@/lib/resume";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const resume = await computeProjectResume(params.id);
    return NextResponse.json({ resume });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to compute resume", message: err?.message ?? String(err) }, { status: 400 });
  }
}
