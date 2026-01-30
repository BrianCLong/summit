# Required Checks Discovery (Temporary)

## Goal

Capture the authoritative required checks for trajectory workstreams and map them to temporary
placeholders until the real CI names are confirmed.

## Discovery Steps

1. Open the repository settings → Branch protection rules.
2. Enumerate required checks for the default branch.
3. Cross-check with `docs/CI_STANDARDS.md` and `pr-quality-gate.yml` for pipeline names.
4. Record the authoritative names below and update the temporary gate labels.

## Temporary Gate Labels

- `ci/trajectory-schema`
- `ci/trajectory-evidence`
- `ci/trajectory-determinism`

## Notes

- Replace temporary labels once the official names are confirmed.
- Keep the required checks list in sync with the CI workflow definitions.
