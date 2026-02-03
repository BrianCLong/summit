-- Rollback for initial orchestrator tables
DROP TABLE IF EXISTS orchestrator_events;
DROP TABLE IF EXISTS orchestrator_tasks;
DROP TABLE IF EXISTS orchestrator_runs;
-- (Note: extension not dropped)
