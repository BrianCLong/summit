# OSINT Enterprise GA Readiness

## Purpose
This document outlines the acceptance criteria for the OSINT Enterprise feature set, ensuring alignment with the IC OSINT Strategy 2024-2026.

## Acceptance Criteria

### 1. Evidence System (Foundation)
- [x] Evidence schemas (Report, Metrics, Stamp, Index) are defined and validated.
- [x] Evidence writer implementation exists and writes valid artifacts.
- [x] CI workflow verifies evidence schema validity on every PR.

### 2. Governance & Policy (Gate)
- [x] OSINT Policy Gate is implemented in CI.
- [x] Deny-by-default rules are enforced for License, Provenance, and Privacy.
- [x] Fixtures cover both allow and deny scenarios.

### 3. Open Data Catalog (Discovery)
- [x] Catalog types (Asset, License, Provenance, Privacy) are defined.
- [x] In-memory store supports registration and search.
- [x] API stubs (REST/GraphQL) exist.

### 4. Collection Management (Tasking)
- [x] Task creation and deconfliction logic is implemented.
- [x] Metrics for duplication blocks are emitted.

### 5. Innovation (AI/GAI)
- [x] Feature flags for Enrichment and GAI default to OFF.
- [x] Provenance scoring logic provides base score based on source method.
- [x] Negative tests verify low provenance behavior.

## Required Checks
See `.github/MILESTONES/GA-OSINT-Enterprise/required_checks.todo.md` for the list of required status checks.

## Sign-off
- Security: [ ]
- Legal: [ ]
- Product: [ ]
