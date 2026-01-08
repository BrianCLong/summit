# Wishbook to Spec Process

## Overview

This document defines the process for converting Wishbook items into buildable Specs. The goal is to stop losing intent in translation and ensure "Wishbook" items are rigorous.

## Workflow

1.  **Wishbook Entry**: Ideas enter the Wishbook.
2.  **Triage**: Each item must result in one of:
    - **Spec**: A `SPEC_TEMPLATE.md` is created.
    - **Kill Note**: Decision to not do it, with reason.
    - **Defer Note**: Decision to wait, with criteria for when to revisit.
3.  **Drafting**: The owner drafts the Spec using `planning/enablement-pack/SPEC_TEMPLATE.md`.
4.  **Review**:
    - SLA: 48 hours for reviewers.
    - Must include designated approvers.
5.  **Approval**: Once approved, the work moves to the backlog.
6.  **Traceability**:
    - Specs must link to Epics/Tickets.
    - Tickets must link back to the Spec.

## Quality Standards

- **Tier-0/1 Work**: Must have "User Story + Acceptance Tests" section.
- **Non-Goals**: Must be explicit to prevent scope creep.
- **Dependencies**: Must list services, schemas, UI components, and vendors.
- **Rollout Plan**: Must include flags, cohorts, telemetry, and rollback criteria.
- **Support Plan**: "No launch without runbook". Must include macros, diagnostics, and known issues.
- **Weekly Spec Review**: We run a weekly review to fix vague specs.

## Anti-Patterns

- **Specs in Slack Threads**: This is deleted as an acceptable workflow. All specs must be in Markdown in the repo.
- **Vague "To Do" tickets**: Every ticket needs a Spec or clear AC.
