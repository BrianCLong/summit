# Release Lifecycle (v0.1.x)
- Branch: `release/v0.1` (maintenance only; **no features**)
- Backports: security & critical fixes only for 90 days after GA
- Merging: PRs require green checks + label `no-feature` + codeowner
- Tags: immutable; protected via ruleset; no deletions/force-push