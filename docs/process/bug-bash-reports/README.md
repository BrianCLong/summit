# Bug Bash Reports

Generated summaries from `ops/bug-bash/report.ts` are stored here. Each report is named `<event>-report.md` and includes counts closed during the session, MTTR, severity distribution, contributor leaderboard, component hotspots, and open follow-ups.

Run:

```
node --loader ts-node/register ops/bug-bash/report.ts --input <export.csv> --event "<Month YYYY>"
```

Use the CSV export from the scoring sheet (Google Sheet or Notion) with columns `issue_id`, `title`, `severity`, `component`, `status`, `opened_at`, `closed_at`, `owner`, `score`, and `notes`.
