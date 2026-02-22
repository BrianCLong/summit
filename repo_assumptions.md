# Repo Assumptions & Validation

## Verified vs Assumed Checklist

| Item | Verified | Evidence | Notes |
| --- | --- | --- | --- |
| Tool interface location | ✅ | `src/hooks/runner.ts`, `src/hooks/policy.ts` | Policy gating + redaction in hooks layer; `src/tools/` exists with minimal subdirs. |
| Config system | ✅ | `config/`, `configs/`, `feature_flags.json`, `feature_flags/` | Multiple config entrypoints present; feature flags are file-based. |
| Artifact directory conventions | ✅ | `artifacts/`, `evidence/`, `EVIDENCE_BUNDLE.manifest.json` | `artifacts/agent-runs` exists; evidence bundles tracked. |
| CI job names | ✅ | `.github/workflows/pr-quality-gate.yml`, `ci-*.yml` | PR-quality gate is present; multiple CI workflows are defined. |
| Logging/redaction helpers | ✅ | `src/hooks/policy.ts`, `src/audit/auditMiddleware.ts`, `src/intelgraph/governance/redaction.py` | Redaction utilities exist in both TS and Python stacks. |
| Evidence/provenance schema | ✅ | `PROVENANCE_SCHEMA.md`, `EVIDENCE_BUNDLE.manifest.json` | Provenance schema defined at repo root. |
| Policy-as-code versioning | ✅ | `packages/decision-policy/` | Decision policy package is present. |

## Must-Not-Touch List
- Release workflows under `.github/workflows/release-*.yml`
- Licensing artifacts (`LICENSE`, `NOTICE`, `OSS-MIT-LICENSE`, `THIRD_PARTY_NOTICES*`)
- Security gates and governance workflows (`*.yml` in `.github/workflows/` with `governance`, `security`, `evidence`)

## CI Check Names (Verified)
- `pr-quality-gate.yml`
- `ci-pr.yml`
- `ci-core.yml`
- `ci-governance.yml`
- `evidence-check.yml`

## Existing Policy/Evidence Schema Locations (Verified)
- `PROVENANCE_SCHEMA.md`
- `EVIDENCE_BUNDLE.manifest.json`
- `evidence/`

## Validation Notes
All key locations referenced by the non-public data access standards are present and verified.
Any new connector work must align with the hooks policy layer and evidence/provenance schema.
