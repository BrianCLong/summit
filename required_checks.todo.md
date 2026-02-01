# Required checks discovery
1. In GitHub: Settings → Branches → Branch protection rules → required status checks.
2. List exact check names (case-sensitive).
3. Map to local scripts:
   - ci:decks_evidence → ci/check_decks_evidence.py
   - ci:deck_lint → ci/deck_lint.py
   - ci:deck_build → ci/deck_build.sh
4. If names differ, add an alias job in CI rather than renaming scripts.

# Secure Indexing Required Checks Discovery
- no-index-leak: (EVD-CURSOR-SECURE-INDEXING-SEC-001)
- evidence-schema-validate
- dep-delta
- reuse-flow-e2e
- perf-evidence: (EVD-CURSOR-SECURE-INDEXING-PERF-001)

## Goal
List the repository's *required* CI checks for the default branch, then map them to verifier names
in `ci/verifiers/`.

## GitHub UI steps
1. Repo → Settings → Branches → Branch protection rules.
2. Open the rule for the default branch.
3. Under "Require status checks to pass", copy the exact check names.

## GitHub API steps (alternative)
Use the Branch Protection API to fetch required status checks for the branch:
`GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks`

## Temporary convention
Until discovered, we use temporary verifier names:
- `ci:unit`
- `ci:schema`
- `ci:lint`
- `ci:deps-delta`
- `ci:deepsearchqa-fixtures`
- `ci:codegen-drift`
- `ci:determinism-smoke`
- `ci:supply-chain-delta`
- `summit-gate/data-residency`
- `summit-gate/codespaces-ownership`
- `summit-evidence/validate`
- `summit-verifier/required-checks`

## Rename plan
Once real check names are known:
1. Update CI config to emit the official check names.
2. Add a PR that renames verifiers and keeps backward-compat aliases for one week.

## Archimyst (archsim) checks
- schema-validate
- archsim-foundation
- evidence-gate

## Codespaces data residency rollout
1. Confirm whether required checks include the Summit gates for residency and ownership.
2. Map any provider-specific check names to `summit/ci/verifier/required_checks.json`.
3. Record discrepancies in this file and update CI to emit aligned check names.
