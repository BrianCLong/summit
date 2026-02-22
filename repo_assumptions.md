# Repo Assumptions & Validation

## Structure Validation

| Plan Path | Actual Path | Status | Notes |
| --- | --- | --- | --- |
| `schemas/` | `schemas/` | ✅ Exists | JSON schema store; contains evidence schemas used as reference. |
| `docs/standards/` | `docs/standards/` | ✅ Exists | Standards documentation directory. |
| `.github/workflows/` | `.github/workflows/` | ✅ Exists | CI workflows live here; naming still under review. |
| `artifacts/` | `artifacts/` | ✅ Exists | Artifact output directory used by governance tooling. |
| `cli/` | `cli/` | ✅ Exists | CLI-related code present; entrypoint still needs validation. |

## Component Mapping (Bottlenecks MWS)

| Planned Component | Proposed Location | Actual Location / Action |
| --- | --- | --- |
| Bottlenecks report schema | `schemas/bottlenecks.report.schema.json` | Added under `schemas/` to align with existing schema layout. |
| Standards doc | `docs/standards/ai-growth-bottlenecks-2026-investorplace.md` | Added under `docs/standards/`. |
| CLI extractor | `cli/` or `src/` | **Assumed**; needs validation before implementation. |
| Test runner | `pytest` / `pnpm` | **Assumed**; verify per `pytest.ini`, `package.json`, and CI workflow usage. |

## Assumptions Pending Validation

* CLI entrypoint (Python/Node) and command wiring are not yet confirmed.
* Schema validation library (jsonschema/pydantic/zod) is not yet confirmed.
* CI workflow names for new gates are not yet confirmed.
* Evidence ID convention should follow `docs/governance/EVIDENCE_ID_POLICY.yml`.

## Must-Not-Touch (Discovered)

* Release workflows and governance enforcement configs.
* Security policy docs in `docs/governance/` unless explicitly required.
* Existing CI gate registries without explicit approval.

## Next Validation Steps

1. Locate CLI entrypoint and command registry.
2. Identify existing schema validation utilities and artifact hashing conventions.
3. Confirm CI workflow patterns and required gates before adding new checks.
