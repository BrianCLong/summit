# PR Recreation Playbook

This playbook explains how to handle PRs that have "unrelated histories" after a repository restructure.

## Background

After the GA v4.1.0 release, approximately 139 PRs remain open but cannot be merged due to **unrelated git histories**. This occurs when:

1. The repository underwent a history rewrite or major restructure
2. Branches were created before this restructure
3. Git refuses to merge because the branches share no common ancestor

These PRs are **not blocked by merge conflicts** - they are **migration artifacts** that require recreation.

## Symptoms

When attempting to merge main into an affected PR branch:

```bash
$ git merge origin/main --no-ff
fatal: refusing to merge unrelated histories
```

Using `--allow-unrelated-histories` results in 50+ add/add conflicts on nearly every file.

## Resolution: Superseding PR Workflow

The correct fix is to **recreate the PR** from current `main`, not to force-merge unrelated histories.

### Step-by-Step Instructions for PR Authors

```bash
# 1) Get latest main
git fetch origin
git checkout main
git pull --ff-only

# 2) Fetch your old PR branch
git fetch origin <old_branch>:<old_branch>

# 3) Create new branch off current main
git checkout -b recreate/<topic> origin/main

# 4) Port commits (preferred method)
# Identify the feature commits on the old branch, then cherry-pick them:
git log --oneline <old_branch>  # find your commits
git cherry-pick <commit1> <commit2> ...

# Alternative: if cherry-pick is messy, generate and apply patches:
git checkout <old_branch>
git format-patch -o /tmp/pr_patches $(git merge-base origin/main <old_branch>)..HEAD
git checkout recreate/<topic>
git am /tmp/pr_patches/*.patch

# 5) Resolve any conflicts, run tests, push
git push -u origin recreate/<topic>

# 6) Open a new PR
# Title: "<original title> (recreated)"
# Description: "Supersedes #<oldPR> due to repo history restructure."
```

### Using the Recreation Helper Script

For convenience, use the helper script to automate branch setup:

```bash
# Dry run - see what would happen
./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature

# Actually create the branch and attempt cherry-picks
./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature --apply

# If you know the exact commit range
./scripts/migration/recreate-pr.sh --old-pr 15400 --old-branch feature/my-feature \
  --start abc123 --end def456 --apply
```

The script will:

1. Create a new branch `recreate/pr-<num>-<slug>` from `origin/main`
2. Attempt to cherry-pick commits from the old branch
3. Print next steps (test, push, open PR)

**Note:** The script never pushes or opens PRs automatically - you retain full control.

### After Recreation

1. Open the new PR referencing the old one
2. Request review as normal
3. Once the new PR is merged, close the old PR as **superseded**
4. Add comment to old PR: "Closed as superseded by #<newPR>"

## Important: Include "Supersedes #<oldPR>" in Your Description

When opening your recreated PR, **include one of these phrases in the description**:

- `Supersedes #1234`
- `Recreates #1234`
- `Replaces #1234`

This enables automated linking between old and new PRs. Our tooling will:

1. Detect the reference in your new PR
2. Add the `post-ga:migration` label to your new PR
3. Add the `superseded` label to the old PR
4. Post comments linking both PRs together

**Example PR description:**

```markdown
## Summary

This PR implements XYZ feature.

Supersedes #1234 due to repo history restructure.

## Changes

- Added foo
- Updated bar
```

## Labels

PRs affected by unrelated histories will be labeled:

| Label                       | Meaning                                            |
| --------------------------- | -------------------------------------------------- |
| `blocked:unrelated-history` | Cannot merge due to unrelated git histories        |
| `needs:recreated-pr`        | Author needs to recreate PR from current main      |
| `post-ga:migration`         | Post-GA migration item, not part of active release |
| `superseded`                | This PR has been superseded by a recreated PR      |

## For Maintainers

### Triage Script

Use the triage script to identify and label affected PRs:

```bash
# Dry run (default) - shows what would be done
./scripts/maintainers/triage-unrelated-history-prs.sh

# Actually apply labels and post comments
./scripts/maintainers/triage-unrelated-history-prs.sh --apply
```

### Supersedes Detector

When authors recreate PRs with "Supersedes #<old>" references, run the detector to link them:

```bash
# Dry run (default) - shows what would be linked
./scripts/maintainers/migration-supersedes.sh

# Actually apply labels and post comments
./scripts/maintainers/migration-supersedes.sh --apply
```

This script:

- Scans open PRs for "Supersedes #", "Recreates #", "Replaces #" patterns
- Adds `post-ga:migration` label to the new PR
- Adds `superseded` label to the old PR
- Posts linking comments on both PRs
- **Never auto-closes PRs** (closing requires manual action)

### Migration Status Report

Generate a report of migration progress:

```bash
# Print to terminal
./scripts/maintainers/migration-report.sh

# Write to markdown file
./scripts/maintainers/migration-report.sh --out docs/migration/MIGRATION_STATUS.md

# Output as JSON
./scripts/maintainers/migration-report.sh --json
```

Report includes:

- Total counts by label
- PRs by author (top 10)
- PRs by age (oldest first)
- Progress percentage

### Standard Comment Template

When commenting on affected PRs:

```markdown
This PR has **unrelated git histories** due to a repository restructure and cannot be merged directly.

**To resolve:** Please recreate this PR from current `main` using the instructions in our [PR Recreation Playbook](../docs/migration/PR_RECREATION_PLAYBOOK.md).

Quick steps:

1. Create a new branch from `main`
2. Cherry-pick or patch your changes onto the new branch
3. Open a new PR referencing this one ("Supersedes #XXXX")
4. This PR will be closed once the new one is merged

Labels applied: `blocked:unrelated-history`, `needs:recreated-pr`, `post-ga:migration`
```

## Timeline

- **GA Release**: v4.1.0 shipped (P6_DONE)
- **Migration Window**: Ongoing until all 139 PRs are recreated or closed
- **Priority**: Authors should recreate PRs based on feature priority (P0 > P1 > P2)

## Questions?

If you need help recreating your PR, reach out in the team channel or add a comment requesting assistance.
