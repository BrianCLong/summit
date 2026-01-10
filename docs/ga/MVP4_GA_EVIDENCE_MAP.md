# MVP4 GA Evidence Map

## 1. Observability & Logging Safety

| Control ID | Description | Evidence Source | Success Criteria |
| :--- | :--- | :--- | :--- |
| **OBS-LOG-01** | Prevent logging of secrets and credentials. | CI Job: `verify` (Step: `Logging Safety Check`) | Script `scripts/ci/check_logging_safety.mjs` exits with code `0`. |
| **OBS-LOG-02** | Prevent logging of raw `process.env`. | CI Job: `verify` | No `process.env` detected in `console.log` calls. |

## 2. Command Reference

To manually verify logging safety locally:

```bash
node scripts/ci/check_logging_safety.mjs
```

*   **Exit Code 0**: Compliance confirmed.
*   **Exit Code 1**: Violations found (blocking mode).

## 3. Artifacts

*   **Rule Definition**: `docs/observability/LOGGING_SAFETY_RULES.md`
*   **Governance**: `docs/observability/OBSERVABILITY_GOVERNANCE.md`
