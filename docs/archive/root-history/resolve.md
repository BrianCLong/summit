<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# [https://github.com/BrianCLong/summit/](https://github.com/BrianCLong/summit/) Please provide a prompt to intelligently resolve all conflicts and concerns capturing all work in all PRs and branches so they all merge green.

Here is an intelligent and comprehensive prompt to resolve all conflicts and concerns across all PRs and branches in the BrianCLong/summit GitHub repo to ensure all merge green successfully:

---

### Conflict Resolution Prompt for BrianCLong/summit Repo — All PRs \& Branches Merge Green

**Goal:**
Automate and/or semi-automate resolution of all merge conflicts in every active PR and branch to produce conflict-free merges passing all tests ("green").

**Preconditions:**

- Fetch latest changes from remote branches and PR bases.
- Identify all files with conflicts across branches and PRs.

**Steps:**

1. **Analyze each conflict:**
   - Use conflict markers (<<<<<<<, =======, >>>>>>>) to locate conflicting changes.
   - Identify the source branches of conflicting changes (e.g., base vs PR head).
   - For each conflict, categorize if changes are:
     - Directly overlapping line edits.
   - Non-overlapping changes on different lines.
   - Structural conflicts that require architectural design decisions.
2. **Merge strategy per conflict:**
   - For **non-overlapping** changes, combine both sets of changes to preserve work on all branches.
   - For **overlapping but complementary** changes, manually or AI-assisted merge to combine intents.
   - For **overlapping contradictory** changes, consult author or team for prioritization, falling back to latest valid business logic or test verified outcome.
   - For **complex conflicts** outside simple textual merge, escalate to domain expert for resolution.
3. **Automated tooling:**
   - Run AI-assisted tools such as GitKraken Merge Tool or equivalent to suggest context-aware merges.
   - Use `git mergetool` or editor-based merge tools with side-by-side diff to manually verify and resolve remaining conflicts.
   - Prefer incorporating all non-conflicting changes from all PRs and branches.
4. **Testing \& Validation:** - After conflict resolution, stage all resolved files and commit with clear message:
   `"Resolve merge conflicts by incorporating all PRs and branches changes for green merge"` - Run full unit, integration, and system tests in CI environment to validate no regressions introduced. - Address any test failures iteratively via fixes or revert if inconsistent.
5. **Merge sequencing \& coordination:**
   - Create a merge queue or linear merging order prioritizing PRs by criticality or dependency.
   - Rebase later PRs onto resolved branch continuously to reduce subsequent conflicts.
   - Communicate clearly with contributors on changes.
6. **Provenance \& Documentation:**
   - Maintain detailed commit logs describing rationale and decisions for each conflict resolution.
   - Reference linked issues or PR IDs in commit messages for auditability.
   - Update relevant documentation if conflict resolution involves feature or behavior changes.

---

This prompt prioritizes systematically capturing all changes from all PRs and branches, intelligently combining them with AI-assisted fusion where possible, escalating complex cases, running stringent test validation, and documenting all decisions for compliance and audit.

---

**Usage example for local command line:**

```bash
# Fetch latest branches and PR refs
git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'

# Example pipeline for PR branch conflict resolution
git checkout pr/123
git fetch origin main
git merge origin/main

# Resolve conflicts using AI or manual tools
git mergetool

# Add resolved files
git add .

# Commit merge resolution with provenance message
git commit -m "Resolve merge conflict incorporating PR#123 and main branch changes [refs #123, main]"

# Push resolved branch, trigger CI, repeat for other PRs
git push origin pr/123
```

---

If desired, automation with batch scripts or CI pipelines invoking AI conflict resolution and stepwise merge queue management can be implemented to scale this process.

---

Let me know if an actionable backlog and orchestration plan for this task or full implementation scaffolds and test suites should be produced next.

References:
GitHub Conflict Resolution Docs[^1][^2][^3]
Graphite Merge Queue Best Practices[^4]
GitKraken AI Merge Tool Overview[^5]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^6][^7][^8][^9]</span>

<div style="text-align: center">⁂</div>

[^1]: https://docs.github.com/articles/resolving-a-merge-conflict-on-github

[^2]: https://docs.github.com/articles/resolving-a-merge-conflict-using-the-command-line

[^3]: https://github.blog/developer-skills/github-education/beginners-guide-to-github-merging-a-pull-request/

[^4]: https://graphite.dev/guides/resolve-large-pr-merge-conflicts

[^5]: https://www.gitkraken.com/solutions/gitkraken-merge-tool

[^6]: https://stackoverflow.com/questions/161813/how-do-i-resolve-merge-conflicts-in-a-git-repository

[^7]: https://www.youtube.com/watch?v=JtIX3HJKwfo

[^8]: https://www.youtube.com/watch?v=-_qRHUIRMcM

[^9]: https://www.reddit.com/r/git/comments/1autxuy/what_are_some_best_practices_when_dealing_with/

[^10]: https://www.cloudthat.com/resources/blog/git-best-practices-managing-merge-conflicts/

[^11]: https://www.cloudbees.com/blog/resolve-github-merge-conflicts

[^12]: https://stackoverflow.com/questions/72895572/how-can-i-resolve-complex-merge-conflicts-in-my-pull-request

[^13]: https://www.reddit.com/r/github/comments/1fp0ryv/you_can_now_automate_your_github_workflow_and/

[^14]: https://learn.microsoft.com/en-us/azure/devops/repos/git/merging?view=azure-devops

[^15]: https://graphite.dev/guides/understanding-merge-conflicts-prs

[^16]: https://stackoverflow.com/questions/55518742/automatic-merge-conflict-resolution

[^17]: https://www.youtube.com/watch?v=CaXaWKlSdPE

[^18]: https://www.youtube.com/watch?v=mOJazBNrG-c

[^19]: https://nf-co.re/docs/tutorials/sync/merging_automated_prs

[^20]: https://www.arcadsoftware.com/discover/resources/blog/resolve-git-merge-conflicts-faster-with-artificial-intelligence-ai/
