---
title: Historical Documentation Index
summary: A comprehensive index of all documentation files across the Summit repository.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Historical Documentation Index

This repository contains over 5,000 Markdown files documenting the evolution of the Summit/IntelGraph platform. This index provides a high-level map of where documentation is located.

## 📂 Core Documentation (Root & /docs)

These files represent the primary entry points and current source of truth for the platform.

- **[README.md](../../README.md)**: Main project overview and Golden Path.
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)**: Guidelines for contributing.
- **[docs/README.md](../README.md)**: Structured Diátaxis index.
- **[docs/get-started/](..//get-started/)**: Onboarding and setup.
- **[docs/how-to/](../how-to/)**: Practical task-focused guides.
- **[docs/concepts/](../concepts/)**: High-level architecture and domain models.
- **[docs/reference/](../reference/)**: CLI and API references.
- **[docs/archive/](../archive/)**: Historical snapshots and deprecated plans.

## 🏗️ Technical & Architecture Docs

- **[ARCHITECTURE.md](../ARCHITECTURE.md)**: Component relationships and data flow.
- **[DATA_MODEL.md](../DATA_MODEL.md)**: Schema definitions for Neo4j and Postgres.
- **[SECURITY.md](../../SECURITY.md)**: Security protocols and compliance.
- **[API_DOCUMENTATION.md](../API_DOCUMENTATION.md)**: GraphQL and REST surface details.

## 🛠️ Application-Specific Docs (`apps/`)

Each application entrypoint contains its own local documentation:

- `apps/ai-core/`: AI/ML engine documentation.
- `apps/analytics-engine/`: Statistical and graph analytics documentation.
- `apps/client/`: Frontend-specific component and state documentation.
- `apps/gateway/`: API gateway and routing logic.
- `apps/server/`: Core backend logic and resolver documentation.

## 📦 Shared Libraries & Utilities (`packages/`)

Over 200 shared packages, each with individual READMEs covering:

- `packages/graphai/`: Core graph-augmented intelligence library.
- `packages/authz-core/`: Policy enforcement and RBAC/ABAC logic.
- `packages/neo4j-backup/`: Persistence and disaster recovery utilities.
- `packages/sdk-*/`: Language-specific SDKs (JS, Python, TS).

## ⚙️ Microservices & Workers (`services/`)

Documentation for the 150+ microservices in the Summit mesh:

- `services/ingest/`: Data ingestion pipeline documentation.
- `services/narrative-sim/`: Simulation engine technical details.
- `services/policy-enforcer/`: OPA integration and policy enforcement.

## 📅 Planning & Initiatives (`planning/` & `docs/archived/`)

Extensive historical record of the project's development:

- **Velocity Plans**: `docs/velocity-plan-v*.md`
- **Mission Briefs**: `docs/WAVE*_MISSION_BRIEFS.md`
- **Research Agendas**: `docs/2026_research_agenda.md`

## 🔍 Search Tip

Since there are over 5,000 `.md` files, the most effective way to find specific historical context is using a global search:

```bash
# Search for specific terms across all documentation
grep -r "your-term" . --include="*.md"

# List all markdown files in a specific area
find apps/web -name "*.md"
```

---

_Note: This index highlights major categories. For a full list of every single file, refer to the repository's file system._
