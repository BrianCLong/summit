# GA Gate Activation Prompt

## Objective

Enable the GA composite gate as a required check and align enforcement artifacts across branch protection policy, drift tooling, and documentation.

## Scope

- scripts/release/check_branch_protection_drift.sh
- .github/protection-rules.yml
- docs/ci/REQUIRED_CHECKS_POLICY.yml
- docs/roadmap/STATUS.json

## Required Actions

1. Harden required-check parsing to normalize quoted check names.
2. Add "ga / gate" to branch protection required status checks.
3. Update required checks policy with timestamps and canonical gate notes.
4. Refresh roadmap status metadata for the activation work.

## Constraints

- Keep changes aligned with governance documentation.
- Use conventional commits and include PR metadata.
