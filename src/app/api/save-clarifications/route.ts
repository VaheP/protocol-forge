import { NextResponse } from "next/server";
import { z } from "zod";
import { dbInsertClarificationAnswers } from "@/lib/db";

const BodySchema = z.object({
  project_id: z.string().min(10),
  answers: z
    .array(
      z.object({
        question_id: z.string().min(1),
        question_text: z.string().min(1),
        selected_answer: z.string().min(1)
      })
    )
    .min(1)
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    await dbInsertClarificationAnswers(body.project_id, body.answers);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save clarifications", message: err?.message ?? String(err) }, { status: 400 });
  }
}

