# Repo Assumptions & Validation

## Verified Inventory (Present-State)

| Category | Verified Location | Notes |
| --- | --- | --- |
| Workspace root | `/workspace/summit` | Active monorepo root. |
| Node/TS workspace | `package.json` + `pnpm-workspace.yaml` | pnpm workspace with `packages/*`, `client`, `server`. |
| Python project | `pyproject.toml` | Python 3.11+ project named `intelgraph`. |
| CLI tooling | `tools/summitctl/` | Summit control plane CLI is implemented here. |
| Governance policy | `docs/governance/EVIDENCE_ID_POLICY.yml` | Evidence ID policy present under governance. |
| Evidence artifacts | `evidence/` | Evidence directory exists at repo root. |
| Docs | `docs/` | Primary documentation tree. |
| Scripts | `scripts/` | Root scripts directory. |
| Tests | `tests/` | Root tests directory. |
| CI workflows | `.github/workflows/` | GitHub Actions workflows present. |
| Readiness assertion | `docs/SUMMIT_READINESS_ASSERTION.md` | Absolute readiness baseline for governed changes. |

## Hive Runtime Placement (Intentionally Constrained)

| Proposed Component | Provisional Location | Constraint |
| --- | --- | --- |
| Hive runtime (TS) | `packages/` | Intentionally constrained pending selection of runtime language surface. |
| Hive runtime (Python) | `maestro/` or `api/` | Intentionally constrained pending integration target. |
| CLI surface | `tools/summitctl/` | Summit-native CLI exists; hive commands should align here. |
| Evidence artifacts | `evidence/` | Must follow governance evidence policies. |

## Constraints & Checks (Present-State)

* **Workspace tooling**: pnpm-based workspace with `client/`, `server/`, and `packages/`.  
* **Python scope**: Python packages are declared via `pyproject.toml` with `maestro*` and `api*` included.  
* **Evidence policy**: Evidence ID policy exists at `docs/governance/EVIDENCE_ID_POLICY.yml` and must gate new artifacts.  
* **Readiness authority**: `docs/SUMMIT_READINESS_ASSERTION.md` governs readiness posture and any exceptions must be governed.  

## Assumptions (Deferred Pending Validation)

* **Hive runtime language**: deferred pending a bounded decision between `packages/` (TS) and `maestro/`/`api/` (Python).  
* **Evidence bundle format**: deferred pending confirmation of the current evidence schema used by `evidence/` generation workflows.  

## Must-Not-Touch (Until Explicitly Authorized)

* Production deployment workflows under `.github/workflows/` and `scripts/deploy*`.  
* Policy engines and governance gates under `docs/governance/` and `packages/decision-policy/`.  
* Secrets, credentials, and signing material under `secrets/` and `keys/`.  

## Inline Comment Resolutions (Present-State)

* **Readiness alignment**: governed changes remain anchored to `docs/SUMMIT_READINESS_ASSERTION.md`.  
* **Evidence alignment**: evidence artifact schema confirmation is deferred pending a baseline review of the `evidence/` workflows.  
* **Governance boundaries**: must-not-touch scopes remain enforced until explicit authorization is recorded.  
* **Inline review ledger**: inline comment intake is deferred pending explicitly provided reviewer annotations.  

## Next Directives (Future-State)

1. **Select hive runtime surface**: determine whether the first slice ships in `packages/` (TS) or `maestro/`/`api/` (Python), then lock the zone boundary.  
2. **Align CLI contract**: add `summitctl hive` as the default CLI entrypoint once the runtime surface is selected.  
3. **Validate evidence schema**: confirm current evidence artifact expectations before emitting new hive artifacts.  
