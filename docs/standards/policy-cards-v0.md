# Policy Cards v0 (Summit)

## Summary
Summit Policy Cards v0 define machine-readable, deployment-layer constraints for Summit agents/services. They provide a standardized way to define allow/deny rules, obligations, and evidence requirements.

## Format
Policy Cards are defined in YAML or JSON, following the schema defined in `@summit/policy-cards`.

### Sections
- **Metadata**: Name, version, description, author, dates.
- **Spec**:
  - **Scope**: Agents and services the policy applies to.
  - **Rules**:
    - `deny_tools`: List of tool names to block (deny-by-default overrides this if strict).
    - `allow_tools`: List of allowed tool names.
    - `never_log`: Sensitive fields that must be scrubbed from logs.
  - **Obligations**: Triggers and actions (e.g., "on tool_use: verify_approval").
  - **Mappings**: References to external standards (EU AI Act, NIST AI RMF).

## Validation
Validation is performed via the `@summit/policy-cards` package.
- **Schema Validation**: Ensures the policy matches the defined structure.
- **Canonicalization**: Normalizes the policy text for consistent hashing.
- **Determinism**: Validation output includes a cryptographic hash of the canonical policy.

## Enforcement
Enforcement happens at two layers:
1.  **CI Gate**: `policy-validate` workflow ensures policies are valid before merge.
2.  **Runtime Interceptor**: The Agent Runtime enforces rules (deny-by-default) using the `POLICY_ENFORCEMENT_ENABLED` flag.

## Audit Export
Every policy validation and enforcement action generates deterministic evidence:
- `report.json`: Validation result and errors.
- `metrics.json`: Performance and usage stats.
- `stamp.json`: Cryptographic proof of the run (Evidence ID + Timestamp + Policy Hash).

## References
- Policy Cards: Machine-Readable Runtime Governance for Autonomous AI Agents (arXiv)
- Summit Policy Cards Schema (`packages/policy-cards`)
