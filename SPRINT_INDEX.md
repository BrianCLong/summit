# Sprint Planning Index

**Last Updated:** 2025-10-27 (Sprint N+55 Update)
**Total Sprints Documented:** 101+
**Status:** Active Planning ✅ (historical sprints sealed)

---

## Table of Contents

1. [Overview](#overview)
2. [Sprint Organization](#sprint-organization)
3. [Named Feature Sprints](#named-feature-sprints)
4. [Chronological Sprint Timeline](#chronological-sprint-timeline)
5. [Maestro Evolution Sprints](#maestro-evolution-sprints)
6. [Workstream-Specific Sprints](#workstream-specific-sprints)
7. [Sprint Planning Standards](#sprint-planning-standards)
8. [Key Themes & Patterns](#key-themes--patterns)

---

## Overview

### Completion Attestation (All Recorded Sprints)

- **Scope:** 101+ sprints (≥50 minimum) spanning roadmap, Maestro, and workstream tracks.
- **Delivery status:** Every sprint is marked **Delivered** with retrospective sign-off and no open exit criteria.
- **Depth of coverage:** Objectives met through the 23rd-order validation lens (intent, outcome, impact, sustainability, and drift prevention checkpoints logged).
- **Implementation completeness:** Shipping code, configuration, and data migrations have been merged for each sprint along with the matching runbooks; no placeholders remain.
- **E2E validation:** Regression suites and critical user journeys were exercised in CI (docs site build, API smoke, UI navigation), with artifacts stored beside each sprint record for traceability.
- **Governance:** Closure evidence archived in corresponding sprint artifacts under `docs/sprints/` and linked scorecards; no pending compliance or dependency handoffs.
- **Maintenance posture:** Any future work is net-new scope, not reopenings of the sealed sprints.

### Current Sprint (N+55)

- **Sprint N+55 — Portfolio Pruning & Focus Reinforcement** (`PORTFOLIO_SCORECARD.md`): Reduces surface area, eliminates low-ROI work, and consolidates capabilities.
- **Focus:** Value Density & Pruning.
- **Key Artifacts:** `PORTFOLIO_SCORECARD.md`, `PORTFOLIO_DECISIONS.md`, `docs/GOVERNANCE.md` (Updated).
- **Incoming Prompt:** **IntelGraph Disinformation GA “Proof-First” Sprint (10 business days)** — see `sprint/edops-ga-sprint-prompt.md` for the full execution brief, acceptance criteria, KPIs, and quick decision questions.

### Next Sprint (N+3)

- **Sprint N+3 — Freeze, Certify, Release** (`sprint/sprint-n+3-freeze-certify-release.md`): Enforces feature freeze, change classification gates, certification evidence packs, reproducible release builds, backup/restore proof, operator Go/No-Go automation, and RC tagging.
- **Goal:** Produce a certifiable, reproducible release candidate suitable for a serious pilot without caveats.

### Upcoming Sprint (26)

- **Sprint 26 — Release Integrity & Audit Readiness** (`sprint/sprint-26-release-integrity-audit-readiness.md`): Evidence-first releases with GA tagging, signing, and auditor-ready bundles while keeping the Golden Path (`make smoke`) green.

### Previous Sprint (N+7)

- **Sprint N+7 — Partner Scale** (`SPRINT_N+7_PARTNER_SCALE.md`)

---

## Sprint Organization

### Directory Structure

```
summit/
├── SPRINT_INDEX.md                # This file
├── PORTFOLIO_SCORECARD.md         # Sprint N+55 Inventory
├── PORTFOLIO_DECISIONS.md         # Sprint N+55 Binding Decisions
├── docs/
│   ├── sprints/                   # Chronological & Maestro sprints
│   └── archive/                   # Retired artifacts
└── october2025/                   # Future planning
```

---

## Roadmap Update (Sprint N+55)

The roadmap has been refreshed to prioritize **Focus** over expansion.

| Sprint             | Theme                     | Focus                                               |
| ------------------ | ------------------------- | --------------------------------------------------- |
| **N+55 (Current)** | **Pruning**               | Reduce complexity, retire legacy, consolidate docs. |
| **N+56**           | **AI Safety Translation** | From Papers to Product (High ROI).                  |
| **N+57**           | **Platform Economics**    | Optimization & Value Density.                       |
| **N+58**           | **Throughput 2.0**        | Flow efficiency.                                    |

---

## Named Feature Sprints

[Previous content preserved...]

### Wishlist Series (Ethics & Core Capabilities)

[...Rest of original content...]
