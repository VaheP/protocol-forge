import { NextResponse } from "next/server";
import { dbDeleteProject, dbGetLatestPlanByProject, dbGetProject } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const project = await dbGetProject(params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const plan = await dbGetLatestPlanByProject(project.id);
  return NextResponse.json({ project, plan });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await dbDeleteProject(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to delete project", message: err?.message ?? String(err) }, { status: 400 });
  }
}

