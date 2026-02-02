# Narrative Dominance Suite (NDS) v0.1 Standard

## Purpose
Define the governance-grade, deterministic standards for the Narrative Dominance Suite (NDS)
subsystem in Summit. NDS is advisory-only and deny-by-default, focused on narrative risk modeling
and resilience.

## Core principles
1. **Governance-first**: policy-as-code gates every simulation output.
2. **Determinism**: evidence artifacts are stable, ordered, and time-bucketed.
3. **Auditability**: all decisions are recorded with tamper-evident audit trails.
4. **Advisory-only**: no automated execution, publishing, or influence operations.
5. **Bring-your-own-data**: fixtures and approved feeds only.

## Scope (v0.1)
- Narrative Operating Graph (NOG) snapshot builder.
- Lifecycle tagging (`seed | amplify | peak | mutate | decline`).
- Policy Decision Record (PDR) outputs for simulation plans.
- Deterministic evidence artifacts (report/metrics/stamp).
- Append-only audit events with hash chaining.

## Non-goals (v0.1)
- Automated execution or intervention.
- Microtargeting or identity-based persuasion tooling.
- User-level psychographic profiling.

## Evidence ID standard
```
evidence_id = "nds.v0_1:" + base32(sha256(canonical_inputs)).slice(0,20)
```
Canonical inputs include fixture hash, config hash, policy hash, and code version.

## Determinism rules
- No wall-clock timestamps in artifacts.
- Use stable hash-based IDs.
- Sort object keys and arrays.
- Time is bucketed into fixed intervals when needed.

## Evidence artifacts (v0.1)
- `artifacts/nds/nog.snapshot.json`
- `artifacts/nds/metrics.json`
- `artifacts/nds/pdr.json`
- `artifacts/nds/stamp.nds.json`

## Governance alignment
- Policy-as-code enforcement (OPA-compatible interface).
- Audit log hash chains for tamper detection.
- Deny-by-default when policy constraints are violated.

## Threat-informed constraints
- Prevent manipulative influence operations (policy gates + feature flags).
- Prevent cross-tenant leakage (ABAC enforcement).
- Prevent evidence tampering (hash-chain validation).
- Treat OSINT content as untrusted input (no execution).
