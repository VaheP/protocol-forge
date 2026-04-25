import {
  dbCountClarifications,
  dbCountLiteratureQC,
  dbCountLiteratureResults,
  dbGetLatestPlanByProject
} from "@/lib/db";
import type { UUID } from "@/lib/db/types";

export type ResumeStage = "clarify" | "literature" | "plan";

export type ProjectResume = {
  project_id: UUID;
  stages: Record<
    ResumeStage,
    {
      done: boolean;
      href: string;
    }
  >;
  next: {
    stage: ResumeStage;
    href: string;
    label: string;
  };
};

export async function computeProjectResume(projectId: UUID): Promise<ProjectResume> {
  const clarifyHref = `/projects/${projectId}/clarify`;
  const literatureHref = `/projects/${projectId}/literature`;

  const clarCount = await dbCountClarifications(projectId);
  const litResCount = await dbCountLiteratureResults(projectId);
  const litQcCount = await dbCountLiteratureQC(projectId);
  const plan = await dbGetLatestPlanByProject(projectId);

  const clarifyDone = clarCount > 0;
  const literatureStarted = litResCount > 0 || litQcCount > 0;
  const literatureDone = litQcCount > 0; // QC implies the QC step completed in our flow
  const planDone = Boolean(plan?.id);

  const stages: ProjectResume["stages"] = {
    // Clarify is considered "done" if answers were saved OR the pipeline already advanced past clarify
    // (e.g. user skipped questions and continued directly to literature QC).
    clarify: { done: clarifyDone || literatureStarted, href: clarifyHref },
    literature: { done: literatureDone, href: literatureHref },
    plan: { done: planDone, href: plan ? `/projects/${projectId}/plan?plan_id=${plan.id}` : `/projects/${projectId}/plan` }
  };

  // Resume policy:
  // - If clarify not completed AND literature hasn't started -> clarify
  // - Else if QC missing -> literature
  // - Else if plan missing -> literature (plan generation starts there)
  // - Else -> plan
  let nextStage: ResumeStage = "clarify";
  let nextHref = clarifyHref;
  let label = "Resume: Clarify";

  const clarifyComplete = clarifyDone || literatureStarted;
  if (!clarifyComplete) {
    nextStage = "clarify";
    nextHref = clarifyHref;
    label = clarificationsNeededLabel(clarCount, literatureStarted);
  } else if (!literatureDone) {
    nextStage = "literature";
    nextHref = literatureHref;
    label = "Resume: Literature QC";
  } else if (!planDone) {
    nextStage = "literature";
    nextHref = literatureHref;
    label = "Resume: Generate plan";
  } else {
    nextStage = "plan";
    nextHref = `/projects/${projectId}/plan?plan_id=${plan!.id}`;
    label = "Open plan";
  }

  return { project_id: projectId, stages, next: { stage: nextStage, href: nextHref, label } };
}

function clarificationsNeededLabel(clarCount: number, literatureStarted: boolean) {
  if (clarCount === 0 && literatureStarted) return "Resume: Clarify (recommended)";
  return "Resume: Clarify";
}
