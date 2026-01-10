CREATE TABLE IF NOT EXISTS agent_context_turns (
  id UUID PRIMARY KEY,
  run_id TEXT,
  agent_id TEXT,
  task_id TEXT,
  turn_index INTEGER,
  reasoning TEXT NOT NULL,
  action TEXT,
  observation_content TEXT,
  observation_type TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_context_turns_run_id_idx
  ON agent_context_turns (run_id);
CREATE INDEX IF NOT EXISTS agent_context_turns_agent_id_idx
  ON agent_context_turns (agent_id);
CREATE INDEX IF NOT EXISTS agent_context_turns_task_id_idx
  ON agent_context_turns (task_id);
