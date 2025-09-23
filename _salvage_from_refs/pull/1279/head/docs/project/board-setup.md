# IntelGraph Projects v2 Board — Setup

## Create Project
- Ensure gh CLI is logged in with org write scopes.
- Create project and Status field (Now/Next/Later):
  - `REPO_SLUG=BrianCLong/summit PROJECT_OWNER=BrianCLong PROJECT_TITLE="IntelGraph Execution Board" bash scripts/github/bootstrap_project_v2.sh`

## Seed Issues
- Seed Kanban CSVs with Status mapping:
  - `REPO_SLUG=BrianCLong/summit PROJECT_TITLE="IntelGraph Execution Board" python3 scripts/github/seed_issues_to_project_v2.py project_management/issues-now.csv Now`
  - `... issues-next.csv Next`
  - `... issues-later.csv Later`
- Or run all at once: `bash scripts/github/seed_all_kanban_to_project.sh`

## Views (UI)
- In the Project UI, add a Board view and group by `Status`.
- Create three saved views:
  - Now: filter `Status = Now`
  - Next: filter `Status = Next`
  - Later: filter `Status = Later`

## Tips
- Use labels from CSVs to drive automation.
- Assign owners via ASSIGNEE env var: `ASSIGNEE=@handle ... seed_issues_to_project_v2.py ...`
- Re-run seeding to append items; duplicates will create new issues by design.
