# Merge Policy: Golden Main Merge Engine

## Purpose

This policy defines deterministic pull request triage, ordering, and stop conditions that keep `main` green at all times while preserving all contributor work.

## Lane Model

- **auto-merge**: CI green, conflict-free, non-large, non-quarantine PRs.
- **fix-forward**: CI red but otherwise mergeable; author/owner remediation required.
- **conflicts**: conflict resolution required before queue admission.
- **quarantine**: risk-path touching PRs with non-green CI or explicit quarantine signal.
- **capture-close**: large or persistently blocked work that must be sliced into tracked issues.

## Deterministic Queue Algorithm

Queue order is generated from `artifacts/pr_inventory.json` by stable keys:

1. CI status (`green` first),
2. conflict state (conflict-free first),
3. risk classification (low-risk first),
4. recency (`updatedAt` newest first),
5. PR number ascending as final tie-break.

Same input inventory produces identical queue output.

## Stop Conditions (Merge Train)

Merge train halts immediately when any of the following occurs:

- post-merge required checks on `main` are red,
- merge conflict emerges at merge-time,
- required checks for the PR lane are missing or failing,
- governance/security quarantine conditions are triggered.

## Capture Rules (No Work Lost)

Unmergeable work is not discarded. For `quarantine` and `capture-close` lanes:

- convert blocked PR intent into issues,
- include scope slices with acceptance criteria,
- preserve file-level context and risk/test checklist,
- label for prioritization (`capture-needed`, `needs-triage`).

## Atomic PR Requirement

Merge Engine changes must ship as atomic roadmap increments:

- one roadmap prompt per PR,
- deterministic artifacts attached,
- no speculative merge actions in scaffolding PRs,
- explicit rollback path for execution-phase PRs.
