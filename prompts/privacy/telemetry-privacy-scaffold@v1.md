# Telemetry Privacy Scaffold (v1)

## Objective

Ship the initial telemetry privacy allowlist, CI gate, and evidence artifacts for
denial-by-default field classification.

## Scope

- `telemetry/privacy/`
- `ci/check_telemetry_privacy.py`
- `tests/privacy/`
- `docs/privacy/`
- `evidence/privtel/`
- `evidence/index.json`
- `required_checks.todo.md`
- `docs/roadmap/STATUS.json`
- `governance/decisions/ADR-AG-PRIVTEL-001.md`
- `deps_delta/`
- `agents/examples/`
- `prompts/registry.yaml`

## Constraints

- Deny-by-default for unannotated telemetry fields.
- No new dependencies.
- Evidence artifacts must be deterministic and schema-compliant.
- Terminology must use pseudonymization, not anonymization, by default.

## Deliverables

- Telemetry privacy policy schema and allowlist.
- CI gate with restricted PII enforcement.
- Evidence bundle and decision record.
- Task spec aligned to `agents/task-spec.schema.json`.
