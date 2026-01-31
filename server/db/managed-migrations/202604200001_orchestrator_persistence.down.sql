-- Down Migration: Orchestrator Persistence

DROP TABLE IF EXISTS orchestrator_outbox;
DROP TABLE IF EXISTS orchestrator_events;
DROP TABLE IF EXISTS orchestrator_tasks;
DROP TABLE IF EXISTS orchestrator_runs;
