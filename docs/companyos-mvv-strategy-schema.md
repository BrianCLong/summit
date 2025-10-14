# companyOS Mission/Vision/Values/Strategy GraphQL Contract

This document describes the additions to the baseline GraphQL schema that encode the companyOS mission, vision, values, and strategy engines as first-class, queryable entities inside IntelGraph. The contract is designed to align directly with the objectives, architecture, and two-week value slice defined by the Topicality leadership brief.

## Core Entities

The schema introduces strongly typed representations for every mission-critical domain object referenced in the program charter:

- **Mission, Vision, Values, Strategy, Themes, Bets, Objectives, Key Results, Initiatives, and Decisions** for modeling the full MVV + Strategy lifecycle.
- **Claims, Risks, Artifacts, Policies, Approvals, and Policy Checks** for provenance, governance, and auditability.
- **Metrics, Financials, CRM Objects, Systems, Dashboards, and Projections** for the closed-loop performance instrumentation that ties initiatives to KPIs, ERP/CRM line items, and scenario analysis.
- **Supporting primitives** such as `GraphRef`, `Timebox`, `Money`, enums, and filter inputs so that downstream services can navigate IntelGraph relationships without custom serializers.

## Query Surface

The `Query` type now exposes collections and single-item fetchers covering every strategic entity. Downstream generators (e.g., Maestro pipelines or artifact renderers) can fetch curated slices of MVV, strategies, objectives, initiatives, KPIs, risks, and governance policies in a single round trip. Filter inputs allow clients to focus on specific owners, time horizons, statuses, or distribution channels.

## Mutation Surface

New mutations let orchestrators register or update core strategic data:

- Lifecycle authoring operations (`createMission`, `proposeVision`, `createValue`, `createStrategy`, `createObjective`, `createInitiative`).
- Governance and provenance capture (`recordDecision`, `recordClaim`, `registerPolicy`, `recordArtifact`, `recordPipelineRun`).
- Operational data links (`upsertMetric`, `upsertFinancials`, `upsertCRMObject`, `registerSystem`, `createProjection`).
- Template registration so derivation generators can attach policy labels and layout metadata to Board, Dispatch, and Disclosure outputs.

These mutations map 1:1 with the Maestro pipeline stages described in the brief, ensuring traceability from proposals through publishable artifacts with SBOM/disclosure attachments.

## Alignment with the Value Slice

The schema contains explicit enums for templates (Dispatch, Board One-Pager, etc.), scenario planning (`ScenarioType`), and ERP/CRM integration (`FinancialMetric`, `CRMObjectType`, `SystemType`). This makes it straightforward to assemble the EBITDA dashboard card, pipeline coverage snapshot, and artifact generators required for the initial two-week delivery while remaining extensible for the 90-day roadmap (scenario planner, audit/export packs, partner playbooks).
