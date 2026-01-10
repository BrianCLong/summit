# Customer Zero Evaluation Plan

**Objective:** To perform a bounded, 2-3 hour evaluation of the Summit Platform's core GA capabilities.

**Prerequisite:** Successful completion of the "Fast Start" verification in [`CUSTOMER_ZERO_START_HERE.md`](./CUSTOMER_ZERO_START_HERE.md).

---

## Evaluation Phases

This plan is structured in three phases. Each phase builds on the last and is designed to prove a specific aspect of the platform's value.

### Phase 1: Installation & Sanity Proof (30 Minutes)

This phase confirms that you can get the system running and verify its basic health.

*   **Action 1.1: System Installation & Startup.**
    *   **Command:** Follow the setup instructions in the root `README.md` to install dependencies and start the platform. This typically involves `make bootstrap` and `make up`.
    *   **Success Criteria:** All Docker containers start successfully without errors. You can access the web console.

*   **Action 1.2: Run Golden Path Verification.**
    *   **Command:** `make smoke`
    *   **Success Criteria:** The smoke test completes successfully, as described in the "Start Here" document. This re-verifies the core loop of the system.

### Phase 2: Core Workflow Verification (60-90 Minutes)

This phase dives deeper into the GA-scoped capabilities of the platform, allowing you to interact with the core workflows.

*   **Action 2.1: Manual Data Ingestion.**
    *   **Guidance:** Following the developer documentation, use the API or UI to manually ingest a sample entity.
    *   **Success Criteria:** You can successfully ingest a new data entity, and it appears in search results. This proves the data ingestion and indexing pipeline is working.

*   **Action 2.2: Manual Orchestration.**
    *   **Guidance:** Using the Maestro UI or API, manually trigger a pre-defined orchestration workflow on the data you ingested.
    *   **Success Criteria:** The workflow executes successfully. You can see the job status transition from "Queued" to "Completed". This proves the orchestration engine is functional.

*   **Action 2.3: Audit Trail Verification.**
    *   **Guidance:** Access the audit log viewer in the UI or via the API.
    *   **Success Criteria:** You can find immutable log entries corresponding to your manual ingestion and orchestration actions. The logs should contain your user ID, the action performed, and a timestamp. This proves the provenance and non-repudiation guarantees of the platform.

### Phase 3: Governance & Security Proof Points (30 Minutes)

This phase focuses on verifying the platform's built-in security and governance controls. These are not features to be "used" but rather guardrails to be observed.

*   **Action 3.1: Attempt Unauthorized Access.**
    *   **Guidance:** Using an API client, attempt to access data from a different tenant by manipulating the `x-tenant-id` header.
    *   **Success Criteria:** The API request is denied with an authorization error. This proves the tenant isolation documented in `docs/ga/EVIDENCE_SECURITY.md`.

*   **Action 3.2: Verify Input Validation.**
    *   **Guidance:** Attempt to submit a request to an API endpoint with malformed data (e.g., missing required fields, incorrect data types).
    *   **Success Criteria:** The API rejects the request with a clear validation error message. This proves the input validation controls are active.

---

## Exit Criteria

At the end of this evaluation, you should have sufficient information to make a clear decision on the next steps.

*   **Adopt:** The platform's core capabilities meet your requirements, and you are ready to move forward with a production deployment.
*   **Pilot:** The platform is promising, but you need to test it with your own data or integrate it with other systems before making a final decision.
*   **No-Go:** The platform is not a good fit for your current requirements.

This evaluation is designed to be bounded. If you find yourself needing to test capabilities not covered here, please refer to the **[Risk Boundaries](./CUSTOMER_ZERO_RISK_BOUNDARIES.md)** document and engage with our team through the defined support channels.
