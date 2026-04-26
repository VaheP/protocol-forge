import { NextResponse } from "next/server";
import { dbGetPlan, dbListCommentsByPlan } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const plan = await dbGetPlan(params.id);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const comments = await dbListCommentsByPlan(params.id);
    return NextResponse.json({ comments });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load comments", message: err?.message ?? String(err) }, { status: 400 });
  }
}
