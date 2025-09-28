-- Cases, evidence annotations, and triage suggestions
create table if not exists cases (
  id text primary key,
  title text not null,
  status text not null default 'draft',
  created_at timestamp not null default now()
);

create table if not exists evidence_annotations (
  id text primary key,
  evidence_id text not null,
  range text not null,
  note text not null,
  author text,
  created_at timestamp not null default now()
);

create table if not exists triage_suggestions (
  id text primary key,
  type text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  created_at timestamp not null default now()
);
