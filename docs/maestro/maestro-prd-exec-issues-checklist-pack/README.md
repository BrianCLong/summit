# Maestro PRD — Exec Brief + Issues + Review Checklist Pack

This bundle includes:

- `briefs/executive_one_pager.md` — a crisp 1‑pager for leadership
- `checklists/review_checklist.md` — v1 acceptance gate
- `github/create_issues_from_prd.sh` — gh‑CLI script to generate epics + tasks
- `jira/jira_issues.csv` — Jira CSV template (update Epic links per your instance)

## GitHub Issues

```bash
# From your repo root (with gh auth and jq installed)
bash github/create_issues_from_prd.sh
```

## Jira CSV Import

1. Import `jira/jira_issues.csv` to your project.
2. If your importer requires Epic Issue Keys, first import epics only, copy their keys, then set **Epic Link** in the stories (CSV or bulk edit) and re‑import/update.

## Review Gate

Use `checklists/review_checklist.md` during the release review to drive sign‑off.
