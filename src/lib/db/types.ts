export type UUID = string;

export type Project = {
  id: UUID;
  title: string | null;
  original_hypothesis: string;
  domain: string | null;
  experiment_type: string | null;
  target: string | null;
  sample_type: string | null;
  parsed_json: any;
  created_at: string;
};

export type ClarificationAnswer = {
  id: UUID;
  project_id: UUID;
  question_id: string;
  question_text: string;
  selected_answer: string;
  created_at: string;
};

export type LiteratureQC = {
  id: UUID;
  project_id: UUID;
  novelty_signal: string | null;
  confidence: number | null;
  summary: string | null;
  created_at: string;
};

export type LiteratureResult = {
  id: UUID;
  project_id: UUID;
  title: string | null;
  url: string | null;
  snippet: string | null;
  source: string | null;
  relevance_score: number | null;
  created_at: string;
};

export type Plan = {
  id: UUID;
  project_id: UUID;
  plan_json: any;
  model_used: string | null;
  created_at: string;
};

export type Comment = {
  id: UUID;
  plan_id: UUID;
  section: string | null;
  selected_text: string | null;
  comment_text: string | null;
  feedback_type: string | null;
  severity: string | null;
  reusable: boolean;
  created_at: string;
};

export type SkillRule = {
  id: UUID;
  source_comment_id: UUID | null;
  domain: string | null;
  experiment_type: string | null;
  section: string | null;
  rule_text: string | null;
  keywords: string[] | null;
  severity: string | null;
  active: boolean;
  created_at: string;
};

export type AppliedRule = {
  id: UUID;
  plan_id: UUID;
  rule_id: UUID;
  applied_to_section: string | null;
  explanation: string | null;
  created_at: string;
};

