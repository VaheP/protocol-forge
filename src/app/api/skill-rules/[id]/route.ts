import { NextResponse } from "next/server";
import { dbDeleteGlobalSkillRule } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await dbDeleteGlobalSkillRule(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete skill rule", message: err?.message ?? String(err) }, { status: 400 });
  }
}

