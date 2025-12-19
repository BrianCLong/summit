# Zero-Knowledge Threat Model

> Scope: Specifications and governance only. No cryptographic primitives or runtime
> integrations are included in this repository.

## System Overview

The ZK capability is envisioned as a controlled subsystem that accepts structured
requests, validates them against governance policies, and emits determinate responses
and audit evidence. All interactions are mediated through typed envelopes and offline
review; no prover or verifier executes within this codebase.

## Assets

- **ZK request envelopes** (IDs, tenant scope, circuit identifiers, payload hashes)
- **ZK response envelopes** (status, reviewer rationale, safeguards applied)
- **Audit manifests** (immutable references to evidence bundles and review steps)
- **Governance metadata** (risk tier, approver identity, timestamps)

## Trust Boundaries

- **Repository boundary**: Only specifications and interfaces live in-repo; proof
  artifacts and witnesses are out-of-repo and access-controlled.
- **Workflow boundary**: CI guard enforces Tier-4 approval before merges touching ZK
  assets.
- **Tenant boundary**: Each request carries tenant IDs to prevent cross-tenant leakage
  in downstream systems.

## Threat Actors

- Malicious contributors attempting to introduce unsafe cryptographic code
- Supply-chain attackers inserting unvetted ZK dependencies
- Insider threat bypassing approvals to weaken controls
- Configuration drifts that remove auditability or degrade determinism

## Attack Surface

- Pull requests that alter ZK documents, interfaces, or guardrails
- Typings that could be misinterpreted to include secrets or plaintext witnesses
- Missing or inconsistent audit manifest schemas

## Key Threats & Mitigations

| Threat | Impact | Mitigation | Residual Risk |
| --- | --- | --- | --- |
| Introduction of live cryptography without review | High | CI guard requiring `tier-4-approved` label; document-level prohibition; reviewer checklist | Low |
| Leakage of sensitive witness data | High | Envelope requires hashes only; no plaintext allowed; audit manifest redaction requirement | Low |
| Missing provenance for ZK activity | Medium | Mandatory request/response IDs, schema versions, and manifest linkage | Low |
| Ambiguous circuit usage | Medium | Circuit IDs and statement summaries are mandatory; responses must specify safeguards | Low |
| Unauthorized change to ZK specs | Medium | Tier-4 approval requirement; scope-limited paths for ZK assets | Low |
| Dependency supply-chain insertion | High | No runtime hooks permitted; any future dependency requires separate review and SBOM update | Low |

## Assumptions

- All ZK operations occur in isolated services not represented in this repository.
- Evidence storage supports immutable identifiers and retention policies.
- Tier-4 approvers are defined in governance and available during review cycles.

## Validation Checklist (Static)

- [ ] ZK changes limited to docs, interfaces, or CI guardrails
- [ ] No cryptographic implementations, circuits, or keys introduced
- [ ] Request/response envelopes include IDs, tenant scoping, schema version, and
      payload fingerprints
- [ ] Audit manifest schema aligns with evidence storage capabilities
- [ ] CI guard is active and references correct path filters and label name
- [ ] Reviewer sign-off recorded with Tier-4 authority

## Residual Risk and Next Steps

Residual risk remains around human error in reviews and future integration work.
Next steps include tying this threat model into the central Threat Model Index and
introducing automated schema validation once downstream systems are ready.
