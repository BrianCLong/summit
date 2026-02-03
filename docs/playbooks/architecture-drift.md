# Operational Playbook: Architecture Drift

## Symptom
`entropy_guard` CI check failed.

## Remediation
1. Check the rule ID in the failure log.
2. Read the rule description in `policies/entropy_guard/rules.v1.yaml`.
3. Fix the code to avoid the pattern.
4. If the pattern is necessary/safe:
   - Add an exception (future).
   - Or modify the rule (requires OWNER approval).
