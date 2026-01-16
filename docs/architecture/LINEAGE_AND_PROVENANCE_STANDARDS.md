# Lineage and Provenance Standards

**Status:** APPROVED
**Scope:** Global (All Summit Components)
**Enforcement:** CI/CD & GA Gates

## 1. Standard Mandate

This document formally establishes the mandatory standards for data lineage and provenance within the Summit architecture. All subsystems, including data ingestion, transformation pipelines, and evidence generation, must adhere to these standards without exception.

### 1.1 Lineage Standard: OpenLineage
**OpenLineage** is designated as the sole standard for capturing and reporting data lineage events.
- All data moving through Summit (Ingest → Process → Storage → Export) must emit OpenLineage-compliant events.
- Lineage capture is synchronous with job execution.

### 1.2 Provenance Standard: W3C PROV
**W3C PROV** is designated as the sole standard for semantic provenance modeling.
- All evidence, artifacts, and critical state changes must be modeled using the W3C PROV ontology (Entity, Activity, Agent).
- The Summit Evidence Model is a strict profile of W3C PROV-O.

### 1.3 Dual-Emission Requirement
All GA-grade dataflows MUST emit both OpenLineage events (for operational observability) and PROV assertions (for audit and compliance).

---

## 2. Canonical Mappings

To ensure interoperability and auditability, the following mappings are authoritative.

### 2.1 Lineage Mappings (OpenLineage)

| Summit Concept | OpenLineage Concept | Definition |
| :--- | :--- | :--- |
| **Summit Job** | **Job** | A distinct unit of work definition (e.g., `IngestionJob`, `ReportGenerationJob`). Uniquely identified by namespace and name. |
| **Summit Run** | **Run** | A specific execution instance of a Summit Job. Uniquely identified by a UUID. Must include start/end times and final state. |
| **Summit Dataset** | **Dataset** | Any addressable data resource managed by Summit (e.g., Postgres Table, Neo4j Graph, S3 Object). Identified by a canonical URI. |

### 2.2 Provenance Mappings (W3C PROV)

| Summit Concept | W3C PROV Concept | Definition |
| :--- | :--- | :--- |
| **Summit Actor / Policy** | **Agent** | The entity responsible for an action. <br> - **Users/Services** map to `prov:Person` or `prov:SoftwareAgent`. <br> - **Policies** map to `prov:Plan` or acting `prov:Agent` in automated decisions. |
| **Summit Transformation / Evaluation** | **Activity** | A dynamic process that generates or modifies entities. <br> - **Transformations** (data mutations) map to `prov:Activity`. <br> - **Evaluations** (policy checks) map to `prov:Activity` (generating a Decision). |
| **Summit Artifact / Evidence** | **Entity** | A physical, digital, or conceptual thing with a fixed state. <br> - **Artifacts** (files, records) map to `prov:Entity`. <br> - **Evidence** (receipts, logs) map to `prov:Entity`. |

---

## 3. Non-Compliance Consequences

Failure to adhere to these standards triggers the following enforcement actions:

1.  **CI Failure:** Automated checks in the Continuous Integration pipeline will fail any build that introduces dataflows without defined lineage/provenance emitters.
2.  **Merge Block:** Pull Requests lacking required lineage instrumentation are automatically blocked from merging into `main`.
3.  **GA Ineligibility:** Features or components that do not fully implement these standards are strictly ineligible for General Availability (GA) release. No exceptions or waivers are granted for GA.
