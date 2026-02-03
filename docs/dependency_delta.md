# Dependency Delta Ledger

This document tracks and justifies changes to the project's dependency surface.

## [2026-01-29] ATLAS Multilingual Scaling Planner

- **Added**: `jsonschema` (Python)
- **Justification**: Required for validating ATLAS LanguageTransferMatrix artifacts and evidence bundles against standardized schemas.
- **Risk Assessment**: Low. Standard library for JSON validation. No new network-facing dependencies introduced.
- **Owner**: Jules (Release Captain)

## [2026-01-30] Tidemark temporal community evidence scaffold

- **Added**: None.
- **Justification**: Evidence bundle, schemas, and CI verification script do not introduce new dependencies.
- **Risk Assessment**: None. Dependency surface unchanged.
- **Owner**: Codex (Engineer)

## [2026-02-01] Typhoon-S Master Plan Implementation

- **Added**: None.
- **Justification**: Clean-room implementation of Typhoon-S post-training recipes and evidence/governance structures.
- **Risk Assessment**: None. No new external dependencies introduced.
- **Owner**: Jules (Release Captain)
