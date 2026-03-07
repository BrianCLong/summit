# Repo Assumptions

**Verified Paths:**
* `.ci/`
* `.github/`
* `.merge-captain/`
* `.opa/policy/`
* `GOLDEN/datasets/`
* `RUNBOOKS/`
* `SECURITY/`
* `__tests__/`
* `agents/`
* `analysis/`
* `api/`
* `apps/`
* `architecture/`
* `artifact/`
* `artifacts/`

**Assumed Paths:**
* `summit/cli/`
* `summit/kernel/`
* `api/summit_governance/`
* `scripts/summit_*/`

**Must Not Touch Files:**
* `.merge-captain/**`
* `.opa/policy/**`
* `GOLDEN/datasets/**`
* `SECURITY/**`

(Until conventions are validated)

**Smallest Integration Surface for summit explain:**
The CLI command `summit explain <file>` which calls local parsing via tree-sitter, computes metrics, generates an LLM explanation via OpenAI API, and outputs to `artifacts/summit/explain/` generating `report.json`, `metrics.json`, and `stamp.json`.
