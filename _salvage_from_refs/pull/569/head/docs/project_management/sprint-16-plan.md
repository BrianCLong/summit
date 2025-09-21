# Sprint 16 Plan

## Goals
- Deliver Hunting Studio with saved hunts and pattern library.
- Provide read-only NL→Cypher Copilot with query budgets and DLP.
- Introduce Temporal Analytics v1 with sliding windows and temporal paths.
- Enable sanitized hunt→report export linked to Cases.

## Scope
- Hunting Studio UI and server endpoints.
- QueryBudgetGuard and ReadOnlyGuard enforcement.
- Temporal indexing and path services.
- Starter pattern library and installation script.

## Non-Goals
- Graph embeddings or advanced anomaly models.
- Write transactions from Hunting Studio.
- Full production deployment automation.

## Timeline
- Sprint length: 2 weeks.
- Code freeze: T-48h prior to demo.
- Mid-sprint demo: end of week 1.

## Ceremonies
- Daily stand‑ups.
- Weekly backlog grooming.
- Sprint review and retrospective at end.

## Definition of Done
- Code merged with passing tests and lint.
- Documentation updated.
- `make sprint16` runs successfully.
- Features demoed to stakeholders.

## Backlog with Acceptance Criteria
1. **Hunting Studio**
   - AC: Users can run starter patterns, save hunts, and view run history.
2. **NL→Cypher Copilot**
   - AC: Copilot returns explain-only plans; promotion requires reviewer.
3. **Temporal Analytics v1**
   - AC: k-shortest temporal paths and window queries available.
4. **Hunt Report Generator**
   - AC: Exports markdown/PDF with PII off by default.
