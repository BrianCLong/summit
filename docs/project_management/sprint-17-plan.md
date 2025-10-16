# Sprint 17 Plan

## Goals

- Deliver Risk Engine v1 with explainable scoring.
- Introduce watchlists with thresholds and expiry.
- Surface risk and watchlists in GraphQL and UI.

## Scope

- Windowed feature aggregation (24h/7d/30d).
- Signed weight verification and logistic calibration.
- Watchlist CRUD, import/export, alert linkage.
- Fairness report and drift monitoring.

## Non-Goals

- Advanced GNN models.
- Auto-remediation based solely on risk.

## Timeline

- Week 1: Risk engine core and watchlist services.
- Week 2: UI integration, docs, and observability.

## Ceremonies

- Daily standup, sprint review, retrospective.

## Definition of Done

- `make sprint17` passes.
- Watchlist→alert→case flow succeeds.
- Weights signed and verified.

## Backlog & Acceptance Criteria

- Risk scoring returns banded scores with contributions.
- Watchlist threshold breach creates alert.
- Fairness report runnable.
- DSAR purge removes risk artifacts.
