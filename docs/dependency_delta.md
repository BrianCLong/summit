# Dependency Delta Ledger

This document tracks and justifies changes to the project's dependency surface.

## [2026-01-29] ATLAS Multilingual Scaling Planner
- **Added**: `jsonschema` (Python)
- **Justification**: Required for validating ATLAS LanguageTransferMatrix artifacts and evidence bundles against standardized schemas.
- **Risk Assessment**: Low. Standard library for JSON validation. No new network-facing dependencies introduced.
- **Owner**: Jules (Release Captain)
