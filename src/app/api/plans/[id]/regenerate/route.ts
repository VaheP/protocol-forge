import { NextResponse } from "next/server";
import { regeneratePlanFromPlanSkills } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    const out = await regeneratePlanFromPlanSkills(params.id);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to regenerate plan", message: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}

