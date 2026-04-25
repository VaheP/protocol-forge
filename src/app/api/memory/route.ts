import { NextResponse } from "next/server";
import { dbListSkillRules } from "@/lib/db";

function toMemoryMarkdown(rules: Array<{ id: string; domain: string | null; experiment_type: string | null; section: string | null; rule_text: string | null; active: boolean }>) {
  const active = rules.filter((r) => r.active);
  const lines: string[] = [];
  lines.push("# ProtocolForge Skill Memory");
  lines.push("");
  lines.push("## Base Rules");
  lines.push("- Always include protocol, materials, budget, timeline, validation, controls, and risks.");
  lines.push("- Do not invent catalog numbers unless supported by retrieved evidence.");
  lines.push("- Mark uncertain supplier details as “supplier lookup required”.");
  lines.push("- Include a PI review warning before execution.");
  lines.push("");
  lines.push("## Learned Expert Rules");
  lines.push("");

  active.forEach((r, idx) => {
    const n = String(idx + 1).padStart(3, "0");
    lines.push(`### Rule ${n}`);
    lines.push(`Domain: ${r.domain ?? "Unknown"}`);
    lines.push(`Experiment type: ${r.experiment_type ?? "Unknown"}`);
    lines.push(`Section: ${r.section ?? "General"}`);
    lines.push(`Rule: ${r.rule_text ?? ""}`.trim());
    lines.push("");
  });

  return lines.join("\n");
}

export async function GET() {
  const rules = await dbListSkillRules(200);
  const memory_md = toMemoryMarkdown(rules);
  return NextResponse.json({ rules, memory_md });
}

