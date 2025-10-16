# PR Drafts — v25 Wave

This folder is a scaffold for the next wave of PR drafts. Copy the v24 approach:

- Add `PR-*.md` files with a clear `# H1` title (used to link to PRs after publish)
- Reuse or copy `SHARED-SECTIONS.md` for risk, rollback, and operator commands
- Publish via `scripts/pr-drafts/publish-prs.sh` or your own flow

Quick start

```bash
# Open empty drafts for editing (create your own PR-*.md files first)
bash scripts/pr-drafts/open-drafts.sh project_management/pr_drafts/v25

# Publish to main from current branch, embed shared sections
bash scripts/pr-drafts/publish-prs.sh \
  --dir project_management/pr_drafts/v25 \
  --embed-shared \
  --labels "v25,platform" \
  --milestone "v25"
```

After you push drafts, the multi-wave dashboard will include v25 automatically (configured in `project_management/pr_drafts/waves.json`).
