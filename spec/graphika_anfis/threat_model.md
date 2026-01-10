# ANFIS Threat Model

## Threats

- **Poisoned inputs**: adversary injects synthetic content to distort fingerprints.
- **Replay spoofing**: forged determinism tokens used to fake attribution.
- **Unauthorized exports**: leaking raw content outside policy boundaries.
- **Model inversion**: reconstructing sensitive content from metrics.

## Mitigations

- Validate evidence bundles and enforce redaction policies.
- Require signed determinism tokens and validate against snapshot IDs.
- Enforce export effects via policy engine decisions.
- Apply privacy budgets and differential privacy where appropriate.

## Residual Risk

- Cross-platform coordination may be missed if sources are incomplete.
- Human analyst review required for high-stakes attribution.
