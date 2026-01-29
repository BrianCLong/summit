# Required checks discovery (TODO)

## Goal

List the exact GitHub required status checks for the default branch.

## UI method

1. Repo → Settings → Branches → Branch protection rules.
2. Record each required check name exactly.

## API method

Use GitHub API to fetch branch protection and required status checks contexts.

## Temporary gate naming (until discovered)

- ci/agent-verify
- ci/agent-scope
- ci/agent-ledger
- ci/ask-parity
- ci/dep-delta

## Rename plan

Once names are known, add PR to alias/rename CI jobs to match required checks.
