# Sprint 10 Plan

## Scope
- Multi-tenant RBAC with @tenantScoped directive
- Policy-as-code enforcement using OPA
- Active learning loop from reviewed data to model promotion
- Disaster recovery and retention automation

## Non-Goals
- New feature experiments outside RC1 scope

## Timeline
- Sprint length: 2 weeks
- Daily standups at 10:05 MT
- Mid-sprint demo and T-48h code freeze

## Ceremonies
- Standup, planning, review, retrospective

## Definition of Done
- Tenant e2e harness
- Rollback playbook

## Backlog
| ID | Item | Acceptance Criteria |
|----|------|--------------------|
| S10-1 | Implement @tenantScoped directive | All write mutations require tenant context |
| S10-2 | OPA write gate | Cross-tenant writes denied |
| S10-3 | Active learning bundle export | Bundle includes DLP masks and manifest |
| S10-4 | DR restore runbook | Scripted backup/restore validated |
