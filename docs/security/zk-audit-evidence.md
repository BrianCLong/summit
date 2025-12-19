# Zero-Knowledge Audit Evidence Plan

## Objective

Provide a repeatable, evidence-first approach for ZK activities without introducing
live cryptography. All artifacts remain specifications or metadata; no proofs or keys
are stored in this repository.

## Evidence Model

- **Manifest**: Primary record linking a ZK request to review steps, controls applied,
  and evidence references.
- **Evidence references**: Immutable content identifiers (hashes, object-store URLs,
  or ledger pointers) that live outside the repo.
- **Lineage**: Request ID → Response ID → Manifest ID; each carries schema version and
  tenant scope.

## Required Fields per Manifest

- Manifest ID and version
- Associated request/response IDs
- Tenant ID and circuit identifier
- Payload/input fingerprints (hashes only)
- Outputs/results fingerprints (hashes only)
- Risk tier and reviewer/approver identity
- Controls applied (e.g., segregation of duties, redaction checks, retention checks)
- Evidence pointers with integrity hashes
- Review timestamps (submitted, reviewed, approved/rejected)

## Processes

1. **Registration**: Create a manifest record when a ZK request is logged; populate
   request metadata and expected evidence inputs.
2. **Review**: Validate payload fingerprints, circuit identifiers, and governance
   prerequisites (e.g., `tier-4-approved` label present on the PR touching ZK files).
3. **Decision**: Record response status, reviewer rationale, safeguards applied, and
   any remediation steps.
4. **Closure**: Update retention timer, lock manifest, and store immutable pointer to
   the evidence bundle.

## Quality Gates

- Manifests must be schema-valid against the shared TypeScript interfaces.
- No plaintext witnesses or keys can appear in manifests.
- Evidence pointers require integrity metadata (hash algorithm, digest, classifier).
- Any change to manifest schema requires Tier-4 review and CI guard satisfaction.

## Retention & Access

- Retain manifests for the greater of legal-hold duration or security policy.
- Access to evidence is role-scoped; references must not encode secrets.
- All reads/writes must be logged in downstream systems (out-of-scope for this repo).

## Audit Readiness Checklist

- [ ] Manifest includes required identifiers, fingerprints, and control tags
- [ ] Evidence pointers use immutable identifiers with recorded digests
- [ ] Response rationale maps to a documented decision code
- [ ] Tier-4 approval captured for any manifest schema change
- [ ] No crypto implementations, circuits, or keys are present in the repo
