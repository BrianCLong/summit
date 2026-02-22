# Repo Assumptions & Reality Check

## Verified vs Assumed

| Assumption | Status | Reality |
| :--- | :--- | :--- |
| TypeScript, Node 18+, pnpm, GitHub Actions | **Verified** | `package.json` confirms Node >=18.18, `pnpm`. |
| Canonical paths: `src/`, `tests/`, `docs/` | **Verified** | Directories exist. |
| `policies/` at repo root | **Verified** | Directory exists. |
| Existing CI check names | **Adjusted** | `.github/workflows/ci-security.yml` uses `opa-policy`, `dependency-scan`, `cis-benchmark`. Proposed `cti:policy-gate` will be new. |
| Evidence folder conventions | **Verified** | `evidence/` exists with `EVD-...` folders. New path `evidence/cti-briefing-cloud-supplychain/` fits structure. |

## Must-not-touch files

* `package-lock.json` (using pnpm, so `pnpm-lock.yaml` is the source)
* `.github/workflows/ci-security.yml` (unless explicitly adding the new job; prefer new workflow or script integration if possible to minimize merge conflicts)
* Existing `evidence/EVD-*` folders.
