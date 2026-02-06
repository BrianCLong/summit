# Threat Model: Adaptive Tradecraft Graph (ATG)

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security
- **Threats Considered:** prompt injection, harmful instruction generation, evidence spoofing, tenant data bleed, HR misuse
- **Mitigations:** structured ingestion, output policy + classifier + denylist + safe rewrite, evidence hashing/signing, tenant-scoped partitions, policy capsules + ABAC + never-log

## Threats → Mitigations → Gates

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Prompt injection via ingested text | Strict structuring; default: do not pass raw text into LLM | CI security suite | `tests/security/atg_prompt_injection.spec.ts` |
| “Red agent” produces harmful instructions | Output policy + classifier + regex denylist + safe rewrite | CI output lint | `tests/security/atg_output_policy.spec.ts` |
| Evidence spoofing | Evidence IDs content-hashed & source-signed where possible | CI schema + hash verify | `tests/security/atg_evidence_integrity.spec.ts` |
| Tenant data bleed | Tenant-scoped partitions & snapshot isolation | CI multi-tenant fixture | `tests/security/atg_tenant_isolation.spec.ts` |
| HR misuse | Policy capsule + ABAC + never-log | CI never-log scan | `tests/security/atg_hr_policy.spec.ts` |

## Evidence-First Output

- Evidence bundles (UEF) emitted prior to narrative outputs.
- Narrative steps are bound to `evidence_ids[]` from ESG snapshots only.

## Observability Hooks

- Equilibrium convergence metrics and ERI deltas logged to telemetry.
- Drift detector flags control drift and risk rebound.

