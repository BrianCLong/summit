# Required Checks Discovery (TODO)

## Goal
Capture the canonical list of required GitHub checks for protected branches so that
CI job names can align with branch protection rules.

## UI Steps
1. Navigate to the repository on GitHub.
2. Open Settings → Branches.
3. Select the protected branch rule (ex: main).
4. Under "Require status checks to pass before merging", record every check name.
5. Copy the list into this file under "Canonical Checks".

## API Steps (gh cli)
```bash
gh api repos/:owner/:repo/branches/main/protection --jq '.required_status_checks.contexts'
```

## Canonical Checks
- [ ] TODO: Add discovered check names here.

## Temporary Check Aliases (until canonical list is confirmed)
- adoption-evidence-verify (temporary)
- evidence-schema-validate (temporary)

## Rename Plan
Once the canonical list is confirmed, update workflow job names to match the
required checks and remove temporary aliases.
