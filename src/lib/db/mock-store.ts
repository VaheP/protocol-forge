import fs from "fs";
import path from "path";
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

function firstWritableStoreFile(): string {
  const envPath = process.env.PF_STORE_FILE?.trim();
  const candidates: Array<string | undefined> = [
    envPath && envPath.length ? envPath : undefined,
    path.join(process.cwd(), ".pf-store.json"),
    path.join(process.env.TMPDIR ?? "/tmp", ".pf-store.json")
  ];

  for (const file of candidates) {
    if (!file) continue;
    try {
      const dir = path.dirname(file);
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return file;
    } catch {
      // try next candidate
    }
  }

  // As a last resort, still return cwd path (may fail, but keeps behavior deterministic).
  return path.join(process.cwd(), ".pf-store.json");
}

const STORE_FILE = firstWritableStoreFile();

const SEED_RULES: SkillRule[] = [
  {
    id: "seed-rule-001",
    source_comment_id: null,
    domain: "Diagnostics",
    experiment_type: "Whole-blood electrochemical biosensor",
    section: "Validation",
    rule_text: "For whole-blood electrochemical biosensors, validation must include whole-blood matrix testing and anti-fouling controls, not serum-only validation.",
    keywords: ["whole blood", "biosensor", "electrochemical", "anti-fouling", "validation"],
    severity: "High",
    active: true,
    created_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "seed-rule-002",
    source_comment_id: null,
    domain: "Cell Biology",
    experiment_type: "Cryopreservation",
    section: "Validation",
    rule_text: "Cryopreservation experiments should measure viability immediately after thaw and again after a 24-hour recovery period.",
    keywords: ["cryopreservation", "viability", "thaw", "24-hour", "recovery"],
    severity: "Medium",
    active: true,
    created_at: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "seed-rule-003",
    source_comment_id: null,
    domain: "Animal Study",
    experiment_type: "Gut permeability",
    section: "Controls",
    rule_text: "Mouse gut permeability studies should include randomisation, appropriate vehicle controls, animal ethics notes, and FITC-dextran dosing rationale.",
    keywords: ["mouse", "gut permeability", "FITC-dextran", "randomisation", "ethics"],
    severity: "High",
    active: true,
    created_at: "2026-01-01T00:00:00.000Z"
  }
];

function defaultStore(): Store {
  return {
    projects: [],
    clarifications: [],
    literatureQC: [],
    literatureResults: [],
    plans: [],
    comments: [],
    skillRules: SEED_RULES,
    appliedRules: []
  };
}

function loadFromDisk(): Store | null {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as Store;
      // Ensure seed rules are always present (merge by id)
      const existingIds = new Set(parsed.skillRules.map((r) => r.id));
      for (const seed of SEED_RULES) {
        if (!existingIds.has(seed.id)) parsed.skillRules.push(seed);
      }
      return parsed;
    }
  } catch {
    // corrupted file — fall through to default
  }
  return null;
}

export function saveMockStore(): void {
  const store = globalThis.__PF_STORE__;
  if (!store) return;
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // best-effort; don't throw
  }
}

export function getMockStore(): Store {
  if (!globalThis.__PF_STORE__) {
    globalThis.__PF_STORE__ = loadFromDisk() ?? defaultStore();
  }
  return globalThis.__PF_STORE__;
}

export const mockIds = { uuid, nowIso };
