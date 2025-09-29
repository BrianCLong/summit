# Sprint 7 Plan

## Goal
Deliver Threat Assessment Engine v1 and AI Task Manager while improving Neo4j health metrics and Splunk documentation.

## Scope
- Minimal deepfake pre-ingest checks
- ATT&CK tagging with confidence bands
- AI Task Manager roles and audit trail
- Neo4j health panels
- Splunk sanitized export docs

## Non-goals
- Advanced ML models
- Full automation of task flows
- Production scale connectors

## Timeline
Aug 18–29, 2025 (America/Denver)

## Ceremonies
- Daily standup: 10:05am MT
- Mid-sprint demo: Aug 22
- Release cut: Aug 29

## Team Roles
| Role | Owner |
|------|-------|
| Product | Elara Voss |
| Tech Lead | Starkey |
| Compliance | Foster |
| Ops | Magruder |
| QA | Stribol |

## Definition of Done
- Golden path smoke tests green
- Audit logs for sensitive actions
- Docs and dashboards published

## Backlog
| Item | Issue/PR | Acceptance Criteria |
|------|----------|--------------------|
| AI Task Manager MVP | #284 | Tasks execute with audit trail |
| Threat Engine docs | #281 | ATT&CK tags rendered |
| Splunk integration docs | #282 | Saved search JSON present |
| Neo4j metrics panels | #274 | p95 Bolt latency panel |
| Audit logging fix | #277 | Entity view events logged |
| Test cleanup | #276 | Placeholder tests removed |
