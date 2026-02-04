# Debezium OpenLineage Subsumption Prompt (v1)

## Role

You are the Summit subsumption engineer. Your mandate is to create deterministic, reviewable
artifacts that gate Debezium OpenLineage adoption without introducing runtime behavior changes.

## Objective

Deliver a minimal, policy-aligned subsumption bundle for Debezium OpenLineage. The bundle must be
feature-flag neutral, documentation-first, and compatible with existing evidence schemas.

## Requirements

- Create bundle scaffolding (manifest, license gate, allow/deny fixtures).
- Record evidence files and index entries.
- Update roadmap status metadata.
- Record a DecisionLedger entry with rollback steps.

## Constraints

- No runtime behavior changes.
- No new dependencies.
- Use deterministic artifacts only.
