# IP Platform Overview

## Purpose

The **IP Platform** is a unified, living system within the Summit/IntelGraph monorepo that:

- **Catalogs and tracks** all IP families, their implementations, maturity levels, and competitive positioning
- **Links IP concepts to code** through lightweight annotations and metadata
- **Organizes roadmaps** across multiple horizons (H0–H3) to outpace any competitor
- **Provides observability** into IP coverage, implementation status, and test coverage
- **Enables operators** to curate, explore, and accelerate IP development through a dedicated console UI
- **Supports later work** on patent prosecution, product strategy, and competitive narratives

This is **engineering-grade, invention-disclosure-ready infrastructure**—not formal patent applications.

---

## Core Components

### 1. IP Registry (Single Source of Truth)

**Location**: `docs/ip/ip-registry.yaml`

A structured, machine-readable catalog of all IP families containing:
- Family ID, name, summary
- Status (idea → partial → MVP → v1 → v2+)
- Owner (placeholder for now)
- Linked modules/paths
- Capabilities enabled
- Horizons (H0 hardening → H1 MVP → H2 v1 → H3 moonshot)
- Dependencies, risks, tags

This registry is the **authoritative source** for all IP family metadata and drives:
- Roadmap planning
- Code annotation validation
- Metrics & observability
- Console UI display

---

### 2. IP–Code Linkage System

**Location**: Distributed across codebase + documented in `docs/ip/LINKING_CODE.md`

**Annotation Scheme**:

1. **TypeScript/JavaScript files**: Lightweight comments at module/class/function level:
   ```typescript
   // @ip-family: F1,F3
   // Implements provenance-first orchestration for families F1 (Multi-LLM Orchestration) and F3 (GraphRAG)
   export class LaunchableOrchestrator { ... }
   ```

2. **Metadata files** (optional, for complex modules):
   ```json
   // packages/prov-ledger/ip.meta.json
   {
     "ip_families": ["F1", "F10"],
     "notes": "Core provenance ledger enabling immutable audit trails and proof-carrying analytics"
   }
   ```

**Goals**:
- **Signal over noise**: Annotate only the most important 20-30 surfaces per family
- **Bidirectional traceability**: From family → code and code → families
- **Low maintenance**: Minimal overhead, no CI enforcement initially

---

### 3. IP Program Roadmap Layer

**Location**: `docs/ip/IP_PROGRAM_ROADMAP.md`

A **unified, cross-family roadmap** organized by themes:
- Provenance & Observability
- PsyOps & Active Measures
- Graph Intelligence & Investigation UX
- Export Controls & Governance
- CompanyOS/Operator Surfaces

Each theme groups initiatives across families into **now/next/later** buckets with:
- Impact (which families + product surfaces)
- Dependencies (technical & IP)
- AI-agent vs. human ownership recommendations
- Epic-level breakdown

This roadmap is **aggressive but executable**—designed to exceed any competitor's plausible vision.

---

### 4. IP Observability & Metrics

**Location**: `docs/ip/OBSERVABILITY.md` + `scripts/ip-metrics.ts`

Tracks per-family:
- % of core modules annotated
- % of planned capabilities implemented (H0/H1 vs H2/H3 backlog)
- Number of tests touching each family (approximate)
- Existence of:
  - Dedicated dashboards
  - Runbooks
  - Security/ABAC integration
  - Invention disclosure docs

**Script**: `scripts/ip-metrics.ts`
- Parses `ip-registry.yaml`
- Scans codebase for `@ip-family` annotations
- Emits markdown or JSON report summarizing coverage/maturity
- **Future**: Wire into CI for pull request checks and trend dashboards

---

### 5. IP Console UI (Operator View)

**Location**: TBD (likely `apps/conductor-ui` or `companyos`)

**Route**: `/ip-console` or `/admin/ip`

**Functionality**:
- **Table/grid of IP families**: family_id, name, status, tags, modules count
- **Detail view**: Pulls from `ip-registry.yaml`, surfaces horizons, capabilities, dependencies
- **Filters**: By tag, status, theme
- **(Future)**: Edit registry, trigger roadmap planning, view metrics trends

**Data source**: Initially static import of `ip-registry.yaml`, later integrated with backend API

**Purpose**: Give operators/leadership a **living dashboard** of IP development—making inventions legible, trackable, and actionable.

---

### 6. Workflow Hooks (Future)

**Potential integrations**:
- **CI checks**: Validate that new features touching critical IP surfaces include appropriate annotations
- **Codegen scaffolding**: `npm run create-ip-family` to scaffold new family docs + boilerplate
- **PR templates**: Prompt developers to specify which IP families are advanced by a PR
- **Release notes**: Auto-generate IP sections in changelogs based on merged PRs

---

## How This Platform Supports Later Work

### Patent Prosecution
- Clean, structured invention disclosures in `docs/ip/FAMILYID-*.md`
- Traceability from abstract concept → implementation → test evidence
- Prior-art-gap narratives for patent counsel

### Product Strategy
- Roadmap alignment: Features mapped directly to IP families
- Prioritization: Focus on high-moat, high-impact families first
- Messaging: "We have IP family F1 at MVP, F2 at v1, F3 in ideation"

### Competitive Moat Narratives
- Documented in `docs/competitive/IP_PLATFORM_MOAT.md`
- Shows how the **platform itself** is a moat (structure, velocity, legibility)
- Maps families to competitor gaps: "To clone this, you'd need to build X, Y, Z and maintain it"

---

## Principles

1. **Living, not static**: The IP Platform evolves with the codebase—always current, never stale.
2. **Engineering-first**: Built by engineers, for engineers—no legal jargon, just technical facts.
3. **Modular and additive**: Each component (registry, annotations, roadmap, metrics, console) adds value independently and compounds together.
4. **Lightweight but rigorous**: Minimal overhead, maximum signal—no process theater.
5. **Evidence-driven**: Every IP family must point to actual code, tests, and capabilities—no vaporware.

---

## Getting Started

1. **Explore the registry**: Open `docs/ip/ip-registry.yaml` to see all IP families
2. **Read family docs**: Dive into `docs/ip/F*-*.md` for detailed invention disclosures
3. **Review the roadmap**: See `docs/ip/IP_PROGRAM_ROADMAP.md` for cross-family initiatives
4. **Run metrics**: Execute `pnpm run ip:metrics` (once implemented) to generate a coverage report
5. **Browse the console**: Navigate to `/ip-console` (once deployed) for an interactive view

---

## Maintenance

- **Add new families**: Update `ip-registry.yaml`, create `docs/ip/FAMILYID-*.md`, annotate code
- **Update status**: As families mature, bump their status in the registry
- **Refine roadmap**: Quarterly, review and adjust horizons based on progress and market intel
- **Track metrics**: Monthly, run `ip-metrics.ts` and review trends in observability dashboards

---

## Questions?

See the registry (`ip-registry.yaml`) for the full catalog, or consult individual family docs for deep dives.

The IP Platform is a **first-class citizen** of the Summit/IntelGraph monorepo—treat it as seriously as the codebase itself.
