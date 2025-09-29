# Sprint 25 Plan – Publisher Studio & SLSA DP

## Goals
- Enable external publishers to submit differential privacy (DP) templates.
- Verify templates via static lint and dynamic differencing fuzz.
- Produce dual-signed SLSA‑3 provenance and transparency anchors.
- Provide revenue share reporting in test mode.

## Scope
- Publisher Studio server and client workflow.
- Static/dynamic verifiers and policy gates.
- Transparency anchor append for verification and approval.
- Marketplace listing integration and revenue share stubs.

## Non-Goals
- Production payouts or real currency movement.
- Allowing non-template or non-DP uploads.
- Relaxing k-anonymity ≥25 or epsilon caps.

## Timeline
- **Week 1:** Implement verifiers, provenance, and policy.
- **Week 2:** Wire Marketplace, revenue reports, and DSAR script.

## Ceremonies
- Daily stand‑up, backlog grooming, sprint review, and retro.

## Definition of Done
- `make sprint25` and CI green.
- Templates verified, anchored, and listable.
- Docs and dashboards updated.

## Backlog with Acceptance Criteria
1. Static verifier rejects non-DP or kMin<25 templates.
2. Differencing fuzzer detects leaks beyond noise bound.
3. Provenance attestation includes composite signature.
4. Approved templates show in Marketplace catalog.
5. DSAR script purges publisher artifacts and emits receipt.
