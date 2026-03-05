# Route Optimization Agent Module (ROAM) Repo Assumptions Check

## Verified vs Assumed

- ✅ Confirm directory layout (`agents/`, `scripts/`, `docs/`, `.github/workflows/`) is present.
- ✅ Confirm Evidence ID format supports `EVID-*` style identifiers (enforced for ROAM schema).
- ✅ Confirm CI naming conventions use hyphenated checks and workflow job names.
- ✅ Confirm JSON schema validation tooling is available (`jsonschema` for Python and `ajv` for JS).
- ✅ Identify must-not-touch files and keep unchanged:
  - `/core/orchestrator.py` (not present in this repo tree)
  - `/security/policy_engine.py` (not present in this repo tree)
  - `/evidence/schema_v1.json` (present but untouched)

## Notes

- ROAM implementation is isolated under `agents/route_opt/` and `scripts/ci/*route*`.
- Feature flag policy remains default-off via `ROUTE_OPT_AGENT_ENABLED=false` configuration guidance in docs.
