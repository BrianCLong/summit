# Playbook: Closing "Review \*.md" Issues via Doc->Task Pipeline

This playbook standardizes how to close issues titled `Review <doc>.md` once the doc-task extraction pipeline has produced a structured task file.

## Preconditions

- The doc-task extractor has been run: `make docs-tasks`.
- The generated task file exists at `docs/tasks/<doc-slug>.tasks.md` and anchors back to the source doc.
- No manual edits are required beyond the automated tasks output unless clarifying a heading/line reference.

## Standard Closure Comment

Use this template verbatim, replacing `<DOC_NAME>` and `<TASKS_PATH>`:

```
Thanks for surfacing this document review request. We now maintain an automated doc -> tasks pipeline, so manual "Review <DOC_NAME>" issues are superseded.

- Extracted tasks: <TASKS_PATH>
- Extraction command: `make docs-tasks`
- Closure reason: superseded by automated doc-task pipeline and tracked task index

If new tasks appear in <DOC_NAME>, please re-run the extractor and update <TASKS_PATH> before re-opening.
```

## Closure Steps

1. Run `make docs-tasks` to refresh extracted tasks and commit any updates.
2. Verify the relevant `docs/tasks/<doc-slug>.tasks.md` file contains anchors back to the source lines.
3. Post the standard closure comment on the issue.
4. Close the issue as "superseded by doc-task pipeline". Apply labels used for documentation hygiene as needed.

## Automation Helper

Use `scripts/triage/generate-closure-comments.ts` to emit ready-to-paste comments for matching issues:

```
npx tsx scripts/triage/generate-closure-comments.ts --repo <owner/name> [--state open|all] [--since 2024-12-01T00:00:00Z]
```

The script:

- Fetches issues whose titles match `^Review .*\.md$` (PRs excluded).
- Outputs per-issue comment text using the standard template.
- Handles pagination and rate limits so the same snapshot yields consistent output when re-run.
