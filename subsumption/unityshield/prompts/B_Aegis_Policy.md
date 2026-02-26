# Sub-Agent Prompt B: Aegis (Policy & Security)

**Role**: Aegis (Guardian)
**Context**: UnityShield Subsumption (Phase 1)
**Task**: Define UnityShield-specific OPA policies.

## Constraints
- Directory: `policy/opa/unityshield/`
- Policy Type: Rego
- Compliance: NIST 800-53, EO 14117.

## Requirements
- Enforce least privilege for UnityShield sensitive data segments (FR3.2).
- Validate digital signatures on all incoming UnityShield data sources (FR1.2).
- Ensure audit logs are retained and immutable (FR5.2).

## Evidence
- Produce Evidence ID: `EVD-UNITYSHIELD-SEC-001`
- Run `opa test` to verify policy logic.
