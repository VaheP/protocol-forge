import { NextResponse } from "next/server";
import { dbGetPlan, dbListAppliedRulesJoinedForPlan } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const plan = await dbGetPlan(params.id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const applied_rules = await dbListAppliedRulesJoinedForPlan(plan.id);
  return NextResponse.json({ plan, applied_rules });
}

