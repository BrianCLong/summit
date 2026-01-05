# Task Prompt: Metering events for workflow lifecycle

Implement metering events in server-side workflow lifecycle paths.

## Scope

- server/src/maestro
- server/src/metering
- server/src/services
- server/src/graphql
- server/src/conductor
- docs/roadmap/STATUS.json

## Requirements

- Emit metering events for run_started, step_executed, approval_decision, receipt_emitted, evidence_exported, storage_bytes_written.
- Ensure each event includes metadata keys: tenant_id, env, actor_type, workflow_type.
- Add tests that verify metadata presence and completeness.
- Follow repository governance and verification requirements.
