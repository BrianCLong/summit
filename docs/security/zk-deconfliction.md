# Zero-Knowledge Deconfliction Guardrails

## Purpose

This document defines the scaffolding for zero-knowledge (ZK) workflows within the Summit
platform. The goal is to enable secure design and review without introducing any live
cryptography or runtime hooks. All content here is limited to specifications, validation
checklists, and governance expectations.

## Scope

- ZK proving and verification interfaces (request/response envelopes only)
- Evidence and audit manifests required for ZK lifecycles
- Change-management gates for high-risk ZK paths
- Explicit exclusions: no circuit definitions, prover/verifier implementations, key
  handling, or cryptographic parameter generation

## Design Principles

1. **Safety-first posture**: Treat ZK as a Tier-4 risk domain that requires explicit
   senior approval before any code or documentation change is merged.
2. **Deterministic envelopes**: Standardize requests and responses with deterministic
   metadata so that future verification systems can reason about provenance without
   needing to inspect cryptographic artifacts.
3. **Auditability over performance**: Prioritize evidence capture (manifests, hashes,
   reviewer attestations) ahead of performance considerations.
4. **No implicit coupling**: Keep ZK-specific types isolated from runtime paths; no
   initialization, network calls, or prover hooks are permitted at this stage.
5. **Defense in depth**: Require layered controls—static documentation, typed contracts,
   and CI gates—to reduce the chance of unsafe changes reaching production.

## Control Objectives

- **Change isolation**: All ZK-related assets live under `docs/security/zk-*` and
  typed contracts in `packages/types/src/zk.ts`.
- **Approval workflow**: Any change touching ZK assets must carry a `tier-4-approved`
  label on the pull request before it can merge.
- **Traceability**: ZK requests and responses must include globally unique IDs,
  tenant scoping, schema versions, and integrity fingerprints.
- **Data minimization**: Requests carry hashes/fingerprints only; no plaintext inputs
  to circuits are stored in envelopes.
- **Audit coverage**: Every ZK request maps to an audit manifest entry with retained
  evidence pointers.

## Request/Response Envelope Expectations

- **Requests** include: request ID, tenant ID, circuit ID, statement summary,
  payload fingerprint, evidence bundle IDs, and requester accountability metadata.
- **Responses** include: request ID, status (`accepted`, `rejected`, `needs-review`,
  `blocked`), review rationale, safeguards applied, and audit manifest linkage.
- **Versioning**: Both requests and responses carry schema versions to prevent
  ambiguity during upgrades.

## Evidence and Audit Alignment

- Audit manifests must enumerate inputs (by hash only), outputs (by hash only),
  review steps, and applicable controls (e.g., segregation-of-duties, data
  minimization).
- Retention follows the higher of legal hold or security policy; manifests reference
  off-repo evidence stores with immutable content identifiers.

## Change-Management Guardrails

- A dedicated CI workflow (`zk-deconfliction-guard`) blocks merges when ZK assets are
  modified without a `tier-4-approved` label.
- Reviewers must confirm that no cryptographic implementations or runtime hooks are
  introduced; only specifications, interfaces, and evidence plans are permitted.
- Security Engineering owns final approval authority for Tier-4 ZK changes.

## Out-of-Scope (Explicitly Prohibited)

- Shipping prover/verifier binaries, circuits, keys, or setup parameters
- Adding runtime imports to ZK tooling
- Integrating third-party ZK frameworks at build or runtime
- Persisting plaintext witness data or secrets in the repository

## Roadmap (Safe Next Steps)

- Map ZK threat scenarios to the central Threat Model Index with references to this
  document and the ZK threat model.
- Generate machine-readable policy artifacts (e.g., Rego) once interfaces are stable.
- Add synthetic tests that validate schema adherence without executing cryptographic
  routines.
