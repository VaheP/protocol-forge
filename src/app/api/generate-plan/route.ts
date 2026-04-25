import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlanForExistingProject } from "@/lib/pipeline";

const BodySchema = z.object({
  project_id: z.string().min(10)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const out = await generatePlanForExistingProject(body.project_id);
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to generate plan", message: err?.message ?? String(err) }, { status: 400 });
  }
}

