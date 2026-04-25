import type {
  AppliedRule,
  ClarificationAnswer,
  Comment,
  LiteratureQC,
  LiteratureResult,
  Plan,
  Project,
  SkillRule,
  UUID
} from "@/lib/db/types";

function nowIso() {
  return new Date().toISOString();
}

function uuid(): UUID {
  // deterministic-enough for hackathon demo, no crypto dependency
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type Store = {
  projects: Project[];
  clarifications: ClarificationAnswer[];
  literatureQC: LiteratureQC[];
  literatureResults: LiteratureResult[];
  plans: Plan[];
  comments: Comment[];
  skillRules: SkillRule[];
  appliedRules: AppliedRule[];
};

declare global {
  // eslint-disable-next-line no-var
  var __PF_STORE__: Store | undefined;
}

export function getMockStore(): Store {
  if (!globalThis.__PF_STORE__) {
    globalThis.__PF_STORE__ = {
      projects: [],
      clarifications: [],
      literatureQC: [],
      literatureResults: [],
      plans: [],
      comments: [],
      skillRules: [
        {
          id: uuid(),
          source_comment_id: null,
          domain: "Diagnostics",
          experiment_type: "Whole-blood electrochemical biosensor",
          section: "Validation",
          rule_text:
            "For whole-blood electrochemical biosensors, validation must include whole-blood matrix testing and anti-fouling controls, not serum-only validation.",
          keywords: ["whole blood", "biosensor", "electrochemical", "anti-fouling", "validation"],
          severity: "High",
          active: true,
          created_at: nowIso()
        },
        {
          id: uuid(),
          source_comment_id: null,
          domain: "Cell Biology",
          experiment_type: "Cryopreservation",
          section: "Validation",
          rule_text:
            "Cryopreservation experiments should measure viability immediately after thaw and again after a 24-hour recovery period.",
          keywords: ["cryopreservation", "viability", "thaw", "24-hour", "recovery"],
          severity: "Medium",
          active: true,
          created_at: nowIso()
        },
        {
          id: uuid(),
          source_comment_id: null,
          domain: "Animal Study",
          experiment_type: "Gut permeability",
          section: "Controls",
          rule_text:
            "Mouse gut permeability studies should include randomisation, appropriate vehicle controls, animal ethics notes, and FITC-dextran dosing rationale.",
          keywords: ["mouse", "gut permeability", "FITC-dextran", "randomisation", "ethics"],
          severity: "High",
          active: true,
          created_at: nowIso()
        }
      ],
      appliedRules: []
    };
  }
  return globalThis.__PF_STORE__;
}

export const mockIds = { uuid, nowIso };

