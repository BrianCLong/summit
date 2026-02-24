# Sigstore Bundle Verification Gate (v1)

## Objective
Establish a bundle-first Sigstore verification gate that enforces cosign version floors for CVE-2026-22703 and ensures trust roots/signing configs are validated when required.

## Scope
- Add or update the sigstore verification composite action.
- Implement bundle-first verification logic in the CI verification script.
- Add OPA policy rules for cosign version floor and trust root pinning.
- Update evidence schema guidance for optional artifact digests.
- Update `docs/roadmap/STATUS.json` to reflect the change.

## Constraints
- Do not introduce network calls in verification scripts beyond cosign.
- Keep gates deny-by-default.
- Ensure tests are added for new policy logic.

## Deliverables
- Composite action wiring bundle verification.
- Verification script enforcing bundle and optional trust-root/signing-config policy.
- OPA policy + tests for version floors and trust pinning.
- Evidence schema digest guidance.
- Roadmap status update.
