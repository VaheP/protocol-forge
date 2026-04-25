-- ProtocolForge AI schema + minimal seeds (run in Supabase SQL editor)

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  title text,
  original_hypothesis text not null,
  domain text,
  experiment_type text,
  target text,
  sample_type text,
  parsed_json jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists clarification_answers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  question_id text,
  question_text text,
  selected_answer text,
  created_at timestamp with time zone default now()
);

create table if not exists literature_qc (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  novelty_signal text,
  confidence float,
  summary text,
  created_at timestamp with time zone default now()
);

create table if not exists literature_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text,
  url text,
  snippet text,
  source text,
  relevance_score float,
  created_at timestamp with time zone default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  plan_json jsonb not null,
  model_used text,
  created_at timestamp with time zone default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  section text,
  selected_text text,
  comment_text text,
  feedback_type text,
  severity text,
  reusable boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists skill_rules (
  id uuid primary key default gen_random_uuid(),
  source_comment_id uuid references comments(id) on delete set null,
  domain text,
  experiment_type text,
  section text,
  rule_text text,
  keywords text[],
  severity text,
  active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists applied_rules (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references plans(id) on delete cascade,
  rule_id uuid references skill_rules(id) on delete cascade,
  applied_to_section text,
  explanation text,
  created_at timestamp with time zone default now()
);

-- Seed MVP skill rules (safe defaults; editable in-app later)
insert into skill_rules (domain, experiment_type, section, rule_text, keywords, severity, active)
values
  (
    'Diagnostics',
    'Whole-blood electrochemical biosensor',
    'Validation',
    'For whole-blood electrochemical biosensors, validation must include whole-blood matrix testing and anti-fouling controls, not serum-only validation.',
    array['whole blood','biosensor','electrochemical','anti-fouling','validation'],
    'High',
    true
  ),
  (
    'Cell Biology',
    'Cryopreservation',
    'Validation',
    'Cryopreservation experiments should measure viability immediately after thaw and again after a 24-hour recovery period.',
    array['cryopreservation','viability','thaw','24-hour','recovery'],
    'Medium',
    true
  ),
  (
    'Animal Study',
    'Gut permeability',
    'Controls',
    'Mouse gut permeability studies should include randomisation, appropriate vehicle controls, animal ethics notes, and FITC-dextran dosing rationale.',
    array['mouse','gut permeability','FITC-dextran','randomisation','ethics'],
    'High',
    true
  )
on conflict do nothing;

