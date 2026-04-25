import type { SkillRule } from "@/lib/db/types";

function norm(s: string) {
  return s.toLowerCase().trim();
}

function includesLoose(haystack: string, needle: string) {
  return norm(haystack).includes(norm(needle));
}

export function scoreSkillRule(rule: SkillRule, input: { domain: string | null; experiment_type: string | null; hypothesis: string }) {
  let score = 0;

  if (rule.domain && input.domain && includesLoose(rule.domain, input.domain)) score += 3;
  if (rule.experiment_type && input.experiment_type && (includesLoose(rule.experiment_type, input.experiment_type) || includesLoose(input.experiment_type, rule.experiment_type)))
    score += 3;

  const hypothesis = input.hypothesis ?? "";
  for (const kw of rule.keywords ?? []) {
    if (kw && includesLoose(hypothesis, kw)) score += 2;
  }

  const section = (rule.section ?? "").toLowerCase();
  if (["protocol", "validation", "controls", "materials", "timeline"].some((s) => section.includes(s))) score += 1;

  return score;
}

export function selectTopSkillRules(
  rules: SkillRule[],
  input: { domain: string | null; experiment_type: string | null; hypothesis: string },
  topN = 5
) {
  return rules
    .map((r) => ({ rule: r, score: scoreSkillRule(r, input) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, topN);
}

