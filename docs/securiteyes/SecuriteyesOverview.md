# Securiteyes Overview

Securiteyes is a counterintelligence and threat intelligence layer for Summit / Maestro Conductor + IntelGraph. It is designed to detect, track, and mitigate adversarial activity, insider risk, infiltration efforts, disinformation, and abuse of the platform.

**Key Features:**

*   **Defensive & Compliant:** Strictly defensive operations; no offensive tradecraft.
*   **Integrated Ontology:** Extends IntelGraph with ThreatActor, Campaign, TTP, Indicator, etc.
*   **Multi-Tenant:** Strict data isolation and RBAC.
*   **Detection:** Rule-based, statistical, and graph-based detection engines.
*   **Incident Response:** Automated defensive playbooks and forensic evidence bundles.

**Architecture:**

*   **Service Layer:** `SecuriteyesService` (Core CRUD), `DetectionEngine`, `IncidentManager`, `IngestionService`.
*   **Data Store:** Neo4j (Graph), Postgres (Audit/Logs).
*   **API:** `/securiteyes/*` endpoints.

**Usage:**

The system continuously ingests telemetry and threat feeds, runs detection logic, and raises `SuspiciousEvent` nodes. These can be promoted to `Incident` nodes for triage by analysts via the Ops Console.
