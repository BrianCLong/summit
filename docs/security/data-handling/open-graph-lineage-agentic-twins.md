# Security Data Handling: Open Graph + Lineage + Agentic Twins

## Purpose

Define mandatory controls for OSINT ingestion, graph mutation, and lineage emission in the
TwinGraph + LineageBus stack.

## Threat Model Matrix

| Threat                                           | Required Mitigation                                                        | Gate                        | Test Fixture                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------- |
| OSINT poisoning inserts malicious entities/links | source allowlist + provenance facet + confidence scoring + quarantine mode | policy + CI security checks | `tests/fixtures/osint/poisoned.json`            |
| Sensitive data exfiltration in lineage payloads  | never-log denylist + redaction before OpenLineage emission                 | unit tests + secret scan    | `tests/observability/lineage_redaction.test.ts` |
| Disallowed action claims compliance              | deny-by-default policy engine on action envelope                           | CI policy tests             | `tests/agents/policy_denies.test.ts`            |
| Graph tampering                                  | signed action envelope + append-only audit sink hash chain                 | e2e audit validation        | `tests/e2e/audit_chain.test.ts`                 |

## Handling Rules

1. No secrets, access tokens, or PII are emitted in lineage payloads.
2. OSINT records without trusted provenance are quarantined by default.
3. Policy evaluation occurs before graph mutation.
4. Every mutation must produce a lineage record and an audit sink record.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: data poisoning, policy bypass, exfiltration, tampering.
- **Mitigations**: quarantine gate, action policy envelope, redaction pipeline, append-only hashes.

## Governed Exceptions

Any exception requires:

- owner approval,
- explicit risk statement,
- rollback trigger + rollback steps, and
- bounded expiry.
