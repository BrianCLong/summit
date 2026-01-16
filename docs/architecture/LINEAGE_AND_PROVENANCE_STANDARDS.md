# Lineage and Provenance Standards

**Status:** LOCKED
**Authority:** Jules (Principal Architect)
**Enforcement:** CI/CD Hard Gate
**Scope:** Global (All Summit Services & Dataflows)

---

## 1. Objective & Authority

This document formally establishes the mandatory standards for data lineage and artifact provenance within the Summit platform. These standards are **non-optional** for all General Availability (GA) grade features.

The purpose is to ensure every data transformation, policy decision, and artifact generation is:
1.  **Traceable** (Where did it come from?)
2.  **Reproducible** (How was it made?)
3.  **Auditable** (Who/What authorized it?)

## 2. Standards Lock

We explicitly lock the following external standards as the canonical languages for Summit's engineering operations fabric:

### 2.1 Lineage Standard: OpenLineage
*   **Role:** Captures the *runtime execution* of data processing jobs.
*   **Requirement:** All asynchronous background jobs, ETL pipelines, and model inference steps MUST emit OpenLineage-compliant events.
*   **Version:** Latest stable specification.

### 2.2 Provenance Standard: W3C PROV
*   **Role:** Captures the *semantic history* of static artifacts and policy decisions.
*   **Requirement:** All artifacts (reports, bundles, models) and governance gates (policy checks, approvals) MUST export W3C PROV-O (JSON-LD) or PROV-JSON metadata.
*   **Version:** W3C Recommendation 30 April 2013.

## 3. Canonical Mappings

To ensure consistency across the distributed system, the following mappings are authoritative.

| Summit Concept | Standard Concept | Canonical Implementation / ID Format |
| :--- | :--- | :--- |
| **Summit Job** | **OpenLineage Job** | `namespace.job_name` (e.g., `summit.ingestion`, `summit.report_gen`). Defined in `server/src/jobs/job.definitions.ts`. |
| **Summit Run** | **OpenLineage Run** | The deterministic UUID of the execution instance (e.g., BullMQ Job ID). |
| **Summit Dataset** | **OpenLineage Dataset** | **Inputs:** `scheme://authority/path` (e.g., `s3://bucket/key`, `postgres://db/table`).<br>**Outputs:** `neo4j://graph/{partition}`, `file://artifacts/{sha}`. |
| **Summit Actor** | **PROV Agent** | **Human:** `user:{uuid}` (from JWT).<br>**System:** `service:{name}` (e.g., `service:ingestion-worker`). |
| **Summit Transformation** | **PROV Activity** | The specific process execution that generated an entity (e.g., `activity:compile-report-{runId}`). |
| **Summit Policy** | **PROV Plan** | The specific policy version/definition used (e.g., `policy:opa-gate-v1.2`). |
| **Summit Artifact** | **PROV Entity** | The immutable output object. Must be referenced by Content-Addressable Hash (SHA-256). |

## 4. Implementation Requirements

### 4.1 "Double Emission" Rule
All GA-grade dataflows are required to emit **both** signals where applicable:
1.  **Runtime:** Emit OpenLineage events on `START`, `COMPLETE`, and `FAIL` of the job.
2.  **Static:** Generate a PROV record accompanying the final artifact (e.g., `report.json` + `report.prov.json`).

### 4.2 Determinism
*   **IDs:** Must be deterministic where possible (e.g., hash of inputs) or stably recorded.
*   **Ordering:** All JSON lists and keys in lineage/provenance payloads must be alphabetically sorted to ensure hash stability.

## 5. Non-Compliance Consequences

Failure to adhere to these standards will result in the following automated enforcement actions:

1.  **CI Failure:** The `lineage-provenance-verification` workflow will fail if artifacts are detected without corresponding lineage/provenance sidecars.
2.  **Merge Block:** PRs introducing new "Data Connectors" or "Job Types" without registered lineage definitions will be blocked by the `config-guard`.
3.  **GA Ineligibility:** Features lacking this evidence chain cannot be marked as "Done" in the `GA_readiness` gate and will be excluded from the Release Declaration.

---

**Signed:**
*Jules, Principal Architect*
