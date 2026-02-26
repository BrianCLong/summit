
# Maestro Spec Standards

This document defines the standards for Maestro-generated specification bundles within the Summit ecosystem.

## Standards Overview

1. **Requirement IDs**: Every functional requirement must have a unique, stable ID matching `^REQ-[0-9]+$`.
2. **Completeness**: Specs must achieve a minimum score of 20/25 according to the DoD rubric.
3. **Traceability**: Requirements must be linked to Jules task seeds and Codex implementation seeds.
4. **Deterministic Output**: Output artifacts must be deterministic and verifiable.

## DoD Rubric

| Category | Criteria | Points |
|----------|----------|--------|
| Scope | Clearly defined scope | 5 |
| Functional | At least one REQ-xxx requirement | 5 |
| Non-Functional | At least one NFR-xxx requirement | 5 |
| Seeds | Jules and Codex tasks generated | 5 |
| Clarity | Zero open blocking questions | 5 |

Total: 25 points. Minimum required: 20.
