# GitHub Roadmap Import Packets

Files generated on 2025-10-03 to materialize the Summit roadmap inside GitHub.

## Files

- `github-roadmap-issues.csv` — bulk issue seed compatible with `gh issue import` or CSV upload to GitHub Projects.
- `github-project-items.json` — structure for Projects v2 (areas, priorities, milestones) to replay via `gh projects item-add` scripting.

## Usage

1. Ensure project(s) and milestones exist (see `docs/generated/github-roadmap.md` §4).
2. Import issues:
   ```bash
   gh issue import --input project_management/import/github-roadmap-issues.csv
   ```
   - For CSV import, replace `;` in `Labels` column with commas during processing if tool requires.
3. Populate projects by linking imported issues and setting field values:
   ```bash
   python scripts/apply_project_items.py project_management/import/github-project-items.json
   ```
   (Implement helper script or use `gh projects items add` interactively.)
4. Update status weekly; keep CSV/JSON in sync with GitHub using automation.

> Keep these files authoritative—regenerate after major roadmap changes.
