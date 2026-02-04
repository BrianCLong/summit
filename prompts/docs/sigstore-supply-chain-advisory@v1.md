# Sigstore Supply-Chain Advisory Update (v1)

## Objective

Update Summit supply-chain documentation to reflect current Sigstore advisory guardrails, including
required version floors, cache mitigations, and hardened verification workflow. Record the work in
`docs/roadmap/STATUS.json`.

## Requirements

1. Update `docs/security/SUPPLY_CHAIN.md` with:
   - Advisory summary for Sigstore Golang legacy TUF path traversal.
   - Advisory summary for sigstore-python CSRF/OIDC state validation issue.
   - Required version floors and the `SIGSTORE_NO_CACHE=true` mitigation.
   - Hardened CI verification steps using `cosign verify` and
     `cosign verify-attestation`.
   - Kubernetes policy controller enforcement guidance with Governed Exceptions.
2. Update `docs/roadmap/STATUS.json` with a status entry and revision note.
3. Keep changes documentation-only; do not modify runtime code paths.

## Constraints

- Preserve existing terminology and formatting conventions.
- Use deterministic language and avoid speculative claims.
- Cite files for verification in the PR summary.

## Success Criteria

- Supply-chain guidance reflects Sigstore advisory mitigations and verification steps.
- Roadmap status updated in the same change set.
- No runtime code changes introduced.
