# Playbook: Handling Architecture Drift

## Symptom: `entropy_guard` failure
1. Identify the rule ID that failed.
2. Review the documentation for that rule in `docs/entropy-guard.md`.
3. If the violation is valid, remediate (e.g., move global listener to a lifecycle hook).
4. If the violation is a false positive, report to the owner listed in `policies/entropy_guard/OWNERS`.

## Symptom: Complexity budget exceeded
1. Check `evidence/EVD-ARCHROT-CPLX-001/metrics.json` for details.
2. Consider refactoring large files or reducing excessive imports.
3. Architecture review may be required for structural changes.
