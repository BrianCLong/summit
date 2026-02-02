# Required checks discovery (TODO)

## Goal
Discover the repo's required CI check names so Summit gates can match/extend them.

## UI steps (GitHub)
1. Go to: Settings → Branches → Branch protection rules.
2. For the default branch rule, record:
   - Required status checks (names)
   - Required reviews / code owners
   - Required signed commits (if any)

## API steps (GitHub)
- Use GitHub REST API:
  - Get branch protection for default branch
  - Extract `required_status_checks.contexts`

## Temporary gate naming (until discovered)
- summit-gates / verify-evidence
- summit-gates / policy-deny-default
- summit-gates / deps-delta

## Rename plan
Once required checks are known:
1. Update `.github/workflows/summit-gates.yml` job names to match required contexts.
2. Keep old names for 1 week with a parallel job to avoid breaking merges.
