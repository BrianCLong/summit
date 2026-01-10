# CI Action Pinning (Supply-Chain Integrity)

## Purpose

GitHub Actions workflows execute third-party code in a privileged CI environment.
Referencing an action by a floating tag (for example `@v4`, `@main`, or `@master`)
creates a GA-class supply-chain risk: the executed code can change without review or
audit. Summit enforces a pinned action policy for every workflow in
`.github/workflows`.

## Enforcement

The CI gate is implemented in:

- `scripts/ci/action_pinning_gate.mjs`

The gate scans `.github/workflows/*.yml` and fails if it finds any `uses:` reference
that is not one of:

1. Local actions
   - `uses: ./...`
2. Docker actions pinned by digest
   - `uses: docker://<image>@sha256:<64-hex-digest>`
3. Marketplace actions or reusable workflows pinned to a full commit SHA
   - `uses: owner/repo@<40-hex-sha>`
   - `uses: owner/repo/.github/workflows/workflow.yml@<40-hex-sha>`

Dynamic refs are not allowed:

- `uses: owner/repo@${{ ... }}`

## CI SBOM (Actions Inventory)

Each gate run emits a deterministic inventory at:

- `artifacts/ci-sbom/actions-inventory.json`

The inventory includes workflow/job/step coordinates, the `uses:` source, the ref,
and whether the action is first-party (`actions/*` or `github/*`) or third-party.

## How to remediate a failure

Preferred remediation is automatic pinning (then review/commit):

1. Rewrite workflows to pinned SHAs:
   - `node scripts/ci/pin_actions.mjs --write`
2. Verify locally:
   - `node scripts/ci/action_pinning_gate.mjs`
3. Commit the workflow diffs and ensure CI is green.

If the autopinner cannot resolve a ref (private repo, rate limit), pin manually by
looking up the tag/branch commit on GitHub and replacing `@ref` with
`@<40-hex-sha>`.

## Required local commands (for PR description)

- `node scripts/ci/action_pinning_gate.mjs`
- `node --test scripts/ci/__tests__/action_pinning_gate.test.mjs`
- (optional remediation) `node scripts/ci/pin_actions.mjs --write`
