import { NextResponse } from "next/server";
import { dbGetGlobalSkillUpdatedAt, dbGetPlan, dbListAppliedRulesJoinedForPlan } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const plan = await dbGetPlan(params.id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const applied_rules = await dbListAppliedRulesJoinedForPlan(plan.id);
  const global_skill_updated_at = await dbGetGlobalSkillUpdatedAt();
  return NextResponse.json({ plan, applied_rules, global_skill_updated_at });
}

