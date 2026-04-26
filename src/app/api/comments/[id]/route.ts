import { NextResponse } from "next/server";
import { z } from "zod";
import { dbDeleteComment, dbUpdateComment } from "@/lib/db";

const PatchSchema = z.object({
  comment_text: z.string().min(1).optional(),
  severity: z.string().optional(),
  feedback_type: z.string().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = PatchSchema.parse(await req.json());
    const updated = await dbUpdateComment(params.id, body);
    return NextResponse.json({ comment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to update comment", message: err?.message ?? String(err) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await dbDeleteComment(params.id);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete comment", message: err?.message ?? String(err) }, { status: 400 });
  }
}
