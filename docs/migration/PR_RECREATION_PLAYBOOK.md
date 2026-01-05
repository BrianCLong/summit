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

### After Recreation

1. Open the new PR referencing the old one
2. Request review as normal
3. Once the new PR is merged, close the old PR as **superseded**
4. Add comment to old PR: "Closed as superseded by #<newPR>"

## Labels

PRs affected by unrelated histories will be labeled:

| Label                       | Meaning                                            |
| --------------------------- | -------------------------------------------------- |
| `blocked:unrelated-history` | Cannot merge due to unrelated git histories        |
| `needs:recreated-pr`        | Author needs to recreate PR from current main      |
| `post-ga:migration`         | Post-GA migration item, not part of active release |

## For Maintainers

### Triage Script

Use the triage script to identify and label affected PRs:

```bash
# Dry run (default) - shows what would be done
./scripts/maintainers/triage-unrelated-history-prs.sh

# Actually apply labels and post comments
./scripts/maintainers/triage-unrelated-history-prs.sh --apply
```

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
