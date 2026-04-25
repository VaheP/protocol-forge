import { NextResponse } from "next/server";
import { z } from "zod";
import { generateFullPlanFromHypothesis } from "@/lib/pipeline";

const BodySchema = z.object({
  hypothesis: z.string().min(10)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const out = await generateFullPlanFromHypothesis(body.hypothesis);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to generate plan",
        message: err?.message ?? String(err)
      },
      { status: 400 }
    );
  }
}

