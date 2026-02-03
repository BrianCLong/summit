# Spec-Driven Development (SDD) — Claude Code Interop Standard

## Summary

This standard defines a repo-native, deterministic spec-driven workflow and a clean-room optional
export for Claude Code task interop. It does not implement Claude Code task tools; it only provides
structured files for interoperability.

## Scope

- Defines the spec format and checklist contract for Summit.
- Defines deterministic artifacts (tasks, report, metrics, stamp).
- Defines optional export to `.claude/tasks/<list-id>/`.

## Import/Export Matrix

**Import**
- `docs/specs/*.md` (Summit SDD spec format)

**Export**
- `artifacts/sdd/<slug>/tasks.json`
- `artifacts/sdd/<slug>/report.json`
- `artifacts/sdd/<slug>/metrics.json`
- `artifacts/sdd/<slug>/stamp.json`

**Optional Export**
- `.claude/tasks/<list-id>/task-*.json` (Claude task interop)

## Determinism Requirements

- Stable JSON key ordering.
- No timestamps in deterministic artifacts.
- Evidence IDs must use `SDD:<slug>:TASK-###`.

## Non-goals

- Implementing Claude Code task tools.
- Shipping an autonomous agent runner.
- Modifying existing CI required checks policies.

## Compliance Notes

- Specs and tasks are internal engineering metadata.
- Artifacts must honor the never-log list defined in
  `docs/security/data-handling/spec-driven-dev-claude-code.md`.

## Grounding (ITEM claims)

- Disk-persisted tasks: ITEM:CLAIM-04.
- Multi-session task list IDs: ITEM:CLAIM-08.
- Context isolation and atomic commits: ITEM:CLAIM-06.
