# Prompt: Strict Issue Intake Gate (v1)

Objective: Implement a strict issue intake gate for Summit that enforces required metadata,
labels, and milestone mappings via issue forms and GitHub Actions automation.

Scope:

- Update issue form templates and config to require priority, area, type, reproducibility, and acceptance criteria.
- Add strict triage and audit workflows to validate intake, apply labels/milestones, and post deterministic checklists.
- Document the strict triage policy and update roadmap status.

Constraints:

- Use automation-owned escalation labels and restrict manual escalation.
- Keep behavior deterministic and idempotent.
- Follow repository governance and reporting requirements.
