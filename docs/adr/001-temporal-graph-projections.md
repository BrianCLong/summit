# ADR-001: Temporal Graph Projections

## Status
Accepted

## Context
Need to track entity state changes over time for audit, rollback, and
temporal queries while maintaining performance for current-state queries.

## Decision
Implement bitemporal graph model with validity periods on version nodes.
Projections from CDC maintain version history automatically.

## Consequences
+ Point-in-time queries enable audit compliance
+ Rollback capability for data corrections
+ Historical relationship analysis
- 2-3x storage overhead for version history
- Query complexity increases for temporal joins

## Implementation
See `streaming/cdc-projection/src/projections/temporal-graph.ts`
