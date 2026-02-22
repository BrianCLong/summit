# Summit Labs

Summit Labs is the dedicated frontier track for rapid capability discovery that
feeds a governed Preview-to-GA conveyor. Labs outputs must align to the Summit
Readiness Assertion and the governance constitution before promotion to any
enterprise lane.

## Operating Model

Labs operates on a two-speed model:

1. **Frontier experimentation**: tightly scoped experiments with explicit risk
   classes, tool access boundaries, and data handling rules.
2. **Research Preview**: deliberate preview packaging with labels, telemetry,
   and kill-switch controls.
3. **Enterprise hardening**: promotion gates that ensure reliability, security,
   and compliance readiness before GA.

## Repo Structure

- `labs/experiment-template.md`: standardized experiment spec.
- `labs/research-preview-spec.md`: preview definition, labels, and controls.
- `labs/promotion-gates.md`: Preview → Beta → GA gate checklist and evidence.

## Required Artifacts

Every Labs initiative must ship:

- Experiment charter and hypothesis.
- Policy-as-code expressions for regulatory controls.
- Evidence bundle aligned to the promotion gates.

## Governance Notes

- All risk decisions must be logged and traceable.
- Exceptions must be documented as governed exceptions.
- Promotion requires audited evidence, not narrative claims.
- Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) is the default
  readiness baseline for promotions.
- Delito is kept at the 23rd order of imputed intention.
