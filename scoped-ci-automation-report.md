# Scoped CI Automation Playbook

## Overview
This playbook ships a hardened `scripts/scoped_ci_automation.sh` helper that executes the full scoped-CI preparation sequence end-to-end. The script:
- synchronizes refs via `git fetch --all --prune`;
- iterates over `feat/mstc`, `feat/trr`, and `feat/opa` (or any branches passed as arguments);
- runs `scripts/pr_sanitize.sh` when present, but logs a warning instead of aborting if it is missing or fails;
- rebases each branch onto `origin/main`, aborting the rebase safely when conflicts occur;
- force-pushes updates with `--force-with-lease` to preserve remote protection; and
- opens a pull request with the corrected `[SCOPE] Scoped CI: ready for review` title when the GitHub CLI is available.

When `gh` is not installed, the script skips PR creation and the CI run inspection commands, emitting actionable warnings so operators know which manual steps remain.

## Usage
```
bash scripts/scoped_ci_automation.sh             # process the default scoped CI branches
bash scripts/scoped_ci_automation.sh feat/foo     # process a custom branch list
bash scripts/scoped_ci_automation.sh --help       # display inline usage docs
```

## Failure Handling & Reporting
- **Missing branches** are collected and reported at the end of the run without interrupting other branches.
- **Rebase conflicts** trigger an automatic `git rebase --abort` and are summarized for manual follow-up.
- **Missing GitHub CLI** is detected once; the script continues pushing changes while reminding the operator to install `gh` for PR creation and workflow inspection.
- **Workflow visibility**: if `gh` is available, the helper mirrors the manual `gh run list`/`gh run view` commands so operators immediately confirm that the scoped pipelines were triggered.

## Operational Checklist
1. Ensure you have fetch permissions for the scoped branches and that `scripts/pr_sanitize.sh` is executable in your clone.
2. Install and authenticate [GitHub CLI](https://cli.github.com/) when you need automatic PR creation or CI log inspection.
3. Run the helper from the repository root; it automatically returns to your starting branch when finished.
4. Review the final summary for any skipped branches, rebase conflicts, or warnings before considering the workflow complete.
