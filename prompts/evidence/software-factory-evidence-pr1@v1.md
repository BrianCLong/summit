# Software Factory Evidence PR1 Prompt (v1)

Objective: scaffold software-factory evidence bundle schemas, deterministic writer, and runner skeleton for scenario validation. Produce unit tests for the evidence writer, update required governance status, and keep outputs deterministic with timestamps isolated to stamp.json.

Scope:
- evidence/schemas/{report,metrics,stamp,index}.schema.json
- src/agents/validation/evidence/*
- src/agents/validation/runner.ts
- tests/agents/validation/evidence.test.ts
- docs/roadmap/STATUS.json

Constraints:
- Evidence IDs use the EVD-software-factory-* pattern.
- No secrets or PII.
- Deterministic outputs; timestamps only in stamp.json.
- Add unit tests with Arrange/Act/Assert.
