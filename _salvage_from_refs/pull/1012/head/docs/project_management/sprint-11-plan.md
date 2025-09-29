# Sprint 11 Plan

## Goals
- Deliver GA-grade resilience with active/passive failover.
- Enforce zero-trust edge with mTLS and JWT rotation.
- Establish FinOps controls and performance SLO dashboards.

## Scope
- Multi-region failover, zero-trust edge, FinOps telemetry.
- Data residency enforcement and chaos drill automation.

## Non-Goals
- Feature expansion beyond RC2 scope.
- Changes to RC1 contracts.

## Timeline
- Week 1: implement resilience services and security guards.
- Week 2: run chaos drills and finalize release collateral.

## Ceremonies
- Daily standup, mid-sprint review, failover game day.

## Definition of Done
- `make rc2` passes.
- Runbook and policy docs published.

## Backlog
- [ ] Residency policy wiring (AC: deny disallowed regions)
- [ ] JWKS rotation alarm (AC: warn at 20h)
- [ ] Salted decision cache (AC: per-tenant)
- [ ] Failover runbook (AC: promote within 15m)
