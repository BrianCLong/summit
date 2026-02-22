# Repo Assumptions & Validation (Model Sandbox)

## Verified vs Assumed

| Path | Status | Notes |
| --- | --- | --- |
| `.github/workflows/` | ✅ Verified | Canonical entry workflows root. |
| `.github/actions/` | ✅ Verified | Composite actions root. |
| `.github/scripts/` | ✅ Verified | CI helper scripts root. |
| `.github/policies/` | ✅ Verified | Policy definitions (Rego/JS). |
| `docs/architecture/` | ✅ Verified | Canonical doc root. |
| `docs/security/` | ✅ Verified | Canonical doc root. |
| `docs/standards/` | ✅ Verified | Canonical doc root. |
| `docs/ops/runbooks/` | ✅ Verified | Canonical doc root. |
| `scripts/` | ✅ Verified | Root scripts directory exists. |
| `tools/` | ✅ Verified | Root tools directory exists. |
| `docker-compose.yml` | ✅ Verified | Root anchor exists. |
| `package.json` | ✅ Verified | Root anchor exists. |

## Component Mapping

| Planned Component | Proposed Location |
| --- | --- |
| Model Sandbox Policies | `.github/policies/model-sandbox/` |
| Policy Scripts | `.github/scripts/model-sandbox/` |
| Sandbox Runner | `tools/model-sandbox/` |
| Drift Detector | `.github/scripts/monitoring/` |
| CI Workflows | `.github/workflows/` |

## Validation Checklist

- [x] Confirm presence of `scripts/` at repo root.
- [x] Confirm existing CI gates (e.g., `agent-guardrails.yml`).
- [x] Confirm Rego preference in `.github/policies/` (Rego is used, but we'll add YAML for sandbox config as it's data-heavy).
- [x] Confirm Docker as preferred container runtime.

## Must-not-touch list

- Existing workflows under `.github/workflows/` unless explicitly adding/wiring.
- Existing policy engine logic in `.github/policies/*.rego`.
- Root `package.json` dependencies (unless adding scripts).
