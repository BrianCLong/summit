# Nexus Relay Protocol (NRP)

**Status:** Active specification
**Authority:** Summit Readiness Assertion and Governance Charter
**Purpose:** Establish a transformational, governed communication fabric that enables agents to exchange skills, roles, persona state, and tuned knowledge without sacrificing provenance, policy control, or determinism.

## 1. Authority Alignment (Escalation First)

The protocol is governed by the Summit Readiness Assertion and the ecosystem authority stack. All definitions and enforcement mechanisms inherit their authority from these files, which are treated as the single source of truth for compliance and readiness:

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/governance/AGENT_MANDATES.md`
- `agent-contract.json`

This protocol operates in **READY** posture; any deviation is captured as a **Governed Exception** and logged as a policy-as-code event with immutable provenance.

## 2. Core Concept

NRP is a **bi-directional skill and persona exchange protocol** that allows agents to synchronize capabilities, role context, and learned heuristics while preserving governance constraints. It introduces a structured “relay” mechanism that separates **what** is shared (skill capsules) from **how** it is validated (policy gates) and **why** it is accepted (authority alignment).

## 3. Protocol Primitives

### 3.1 Skill Capsules

Self-contained packages of operational knowledge.

- **Contents:** intents, steps, constraints, required data, validation rules.
- **Format:** deterministic JSON with schema fingerprint and provenance chain.
- **Lifecycle:** draft → validated → certified → activated → retired.

### 3.2 Persona Keys

Stable identifiers that represent role and intent boundaries.

- **Contents:** persona name, scope, privilege envelope, behavioral contract.
- **Requirement:** only one active persona key per agent per session.

### 3.3 Learning Line Nodes (LLNs)

Immutable state nodes that capture validated learning deltas.

- **Purpose:** prevent drift and enforce replayable learning history.
- **Rule:** every LLN must cite the authority files and policy decisions used to validate it.

### 3.4 Governance Tokens

Policy-as-code attestations that gate capsule activation.

- **Issuer:** policy engine.
- **Guarantee:** capsules without governance tokens are rejected at relay.

### 3.5 Governed Exceptions

Legacy or emergency bypasses are not discarded; they are **named, bounded, and recorded** as Governed Exceptions with explicit expiry and remediation triggers.

## 4. Relay Flow

1. **Handshake**
   - Agents exchange persona keys and intent hashes.
   - Policy engine verifies authority alignment and scope boundaries.

2. **Capsule Offer**
   - Origin agent emits a signed skill capsule with provenance chain and LLN references.

3. **Policy Gate**
   - Governance tokens are issued or rejected based on policy-as-code rules.

4. **Adoption & Binding**
   - Recipient agent binds the capsule to a persona key and emits a new LLN.

5. **Audit Commit**
   - Immutable audit log records: persona key, capsule hash, governance token, LLN hash.

## 5. Protocol Data Shapes (Canonical)

```json
{
  "capsule_id": "NRP-CAPSULE-0001",
  "persona_key": "persona:investigator",
  "intent_hash": "sha256:...",
  "capsule_schema": "nrp.skillcapsule.v1",
  "governance_token": "opa:policy:token:...",
  "lln_parent": "lln:000A",
  "lln_child": "lln:000B",
  "provenance": [
    "source:agent:alpha",
    "authority:docs/SUMMIT_READINESS_ASSERTION.md",
    "authority:docs/governance/CONSTITUTION.md"
  ],
  "status": "certified"
}
```

## 6. Protocol Guarantees

- **Consistency:** capsules cannot activate without governance tokens.
- **Traceability:** every LLN is hash-linked to its policy decision and authority files.
- **Role Integrity:** persona keys prevent uncontrolled role blending.
- **Replayability:** LLNs enable deterministic reconstruction of agent learning paths.

## 7. Governance-First Operations

- All compliance logic is expressed as policy-as-code.
- All relay decisions generate an immutable audit event.
- All exceptions are governed, named, and time-bound.

## 8. Rollout Plan

1. **Phase 1 — Spec Lock**
   - Publish NRP schema registry and canonical glossary.

2. **Phase 2 — Policy Gate Integration**
   - Bind governance tokens to OPA policy decisions.

3. **Phase 3 — LLN Ledger Activation**
   - Enforce LLN creation on every capsule adoption.

4. **Phase 4 — Multi-Agent Federation**
   - Enable cross-domain relay with sovereign persona keys.

## 9. Success Metrics

- 100% of capsules carry governance tokens.
- 100% of skill transfers produce LLN audit entries.
- Zero ungoverned persona transitions.

## 10. Non-Negotiables

- No capsule activation without policy-as-code approval.
- No persona switch without re-validation.
- No undocumented exceptions.

## 11. Authority Citations

This protocol is intentionally constrained by the Summit authority stack and readiness assertion. Any change to NRP must cite and align with the governing files listed in Section 1.
