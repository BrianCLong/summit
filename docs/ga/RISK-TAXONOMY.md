# Predictive Risk Taxonomy (GA)

This taxonomy enumerates the deterministic risk signals that the Predictive Risk Engine evaluates before CI fails or regressions surface.

## Domains and Signals

### Code Risk

- **GA-critical paths**: server services, policies, provenance pipelines, GA documents.
- **Schema or migration changes**: database migrations, schema files, backward-compatibility contracts.
- **Security-sensitive modules**: authn/authz, secrets management, cryptography, and security packages.
- **High-churn files**: files with recurring changes or incident linkage.
- **Large diffs**: outsized LOC deltas or sweeping refactors that complicate review.
- **Coverage drops**: decreases in required coverage for touched modules.

### CI Risk

- **Flaky suites**: jobs flagged as flaky or historically unstable.
- **Near failures**: jobs that barely met SLAs (timeouts, retries, marginal thresholds).
- **Long-running jobs**: runtime growth above baselines, indicating fragility or contention.
- **Policy edge cases**: unusual policy-engine branches triggered during CI.

### Agent Risk

- **Scope expansion attempts**: attempts to modify files outside the declared safe zone.
- **Prior policy violations**: existing history of governance or safety violations.
- **Debt ratio negative**: more debt introduced than retired for the same effort or agent.
- **Prompt reuse anomalies**: abnormal prompt reuse patterns that hint at misuse or drift.

### Governance Risk

- **Exception load**: accumulating waivers or exceptions without closure.
- **Legacy mode stagnation**: prolonged reliance on legacy compatibility modes.
- **Invariant erosion**: weakening or bypassing of guardrails and invariants.
- **Evidence gaps**: missing or stale audit evidence for mandated controls.

## Bands

- **Low (0–24)**: Routine change; standard verification.
- **Medium (25–49)**: Extra scrutiny recommended; localized verification.
- **High (50–74)**: Strong verification required; scope narrowing and decision artifact.
- **Critical (75–100)**: Auto-merge blocked; governance escalation and full regression/safety sweeps.

## Usage

The taxonomy is authoritative for mapping signals to weights. Scripts read `risk/taxonomy.yaml` to align signal IDs and reporting language. Changes to signals or descriptions require version bumps and coordinated updates to weights and enforcement logic.
