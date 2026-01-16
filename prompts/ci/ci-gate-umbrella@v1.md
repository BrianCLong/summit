# Prompt: CI Gate Umbrella (v1)

## Intent

Establish an always-on GitHub Actions umbrella check that prevents required-check deadlocks by
running on pull_request, merge_group, and push to main, while applying path filtering at the job
level only.

## Scope

- Workflow additions/updates under `.github/workflows/`.
- Documentation under `docs/` that explains CI Gate governance.
- Roadmap status updates in `docs/roadmap/STATUS.json`.

## Requirements

- Produce a single deterministic umbrella check name suitable for branch protection.
- Ensure merge queue compatibility with `merge_group` triggers.
- Keep doc-only changes fast by skipping irrelevant suites.
- Provide admin handoff notes for required-check migration.

## Non-Goals

- Removing or renaming legacy workflows.
- Introducing new external CI services.
