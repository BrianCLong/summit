# SUMMIT READINESS ASSERTION

**Status:** FINAL
**Authority:** CHIEF ARCHITECT
**Enforcement:** CI/CD PIPELINE

## DECLARATION OF READINESS

The Summit Platform is **READY** for deployment in controlled environments. This assertion is absolute and binding. Any deviation from this state is a managed exception, not a defect.

### 1. CERTIFIED CAPABILITIES

The following subsystems are certified for production use under the terms of the V1 Assurance Contract:

*   **Identity & Access Management:**
    *   Strict OIDC-based authentication is enforced for all human operators.
    *   Service-to-service communication is secured via mTLS and short-lived tokens.
    *   RBAC and ABAC policies are enforced by the Open Policy Agent (OPA) engine.

*   **Data Ingestion & Integrity:**
    *   The "IntelGraph" ingestion pipeline guarantees strict schema validation for all incoming entities.
    *   Provenance tracking is immutable; every write operation is cryptographically linked to a source identity.
    *   Graph database consistency is verified by automated integrity checks.

*   **Orchestration:**
    *   The Maestro Orchestrator successfully manages multi-stage analysis workflows.
    *   Job queues are persistent, durable, and monitored for latency and failure rates.

### 2. INTENTIONALLY DEFERRED CAPABILITIES

The following features are **explicitly deferred** to the V2 roadmap. Their absence is a design choice, not a technical debt.

*   **Autonomous Agent Loop:** The "Agentic Mesh" is currently restricted to "Human-in-the-Loop" (HITL) mode. Full autonomy is disabled by configuration.
*   **Real-time Cognitive Warfare Defense:** The "PsyOps" defense module operates in "Passive/Analysis" mode only. Active countermeasures are disabled.
*   **Predictive Geopolitics:** The "Oracle" subsystem is currently running on simulated historical data for calibration purposes.

### 3. CONTRACTUALLY ENFORCED INVARIANTS

The Continuous Integration (CI) pipeline enforces the following invariants. No code enters the `main` branch without satisfying these conditions:

*   **Security:** Zero high-severity vulnerabilities in production dependencies (verified by Trivy/Snyk).
*   **Quality:** 100% pass rate on the "Golden Path" smoke test suite.
*   **Compliance:** All API endpoints must have a corresponding OpenAPI specification entry.
*   **Governance:** Every Pull Request must be linked to a certified Roadmap Item or Issue.

### 4. GOLDEN PATH DEFINITION

The "Golden Path" represents the set of branches and workflows that must remain green to ensure GA readiness.

*   **Golden Branches:**
    *   `main` (Primary Golden Path)
    *   `release/*` (Release Branches)

*   **Required Status Checks:**
    *   **CI Core Gate:** Aggregates unit tests, integration tests, deterministic build, and the golden path smoke test.
    *   **CI Verify Gate:** Aggregates security scans, policy compliance, and evidence collection.

*   **Troubleshooting Common Failures:**
    *   **Golden Path Smoke Test:** If `make smoke` fails, check the `smoke-test-logs` artifact. The test waits up to 120s for UI (port 3000) and Gateway (port 8080). Slow runners may cause timeouts; ensure Docker has sufficient resources.
    *   **Integration Tests:** Database startup issues are mitigated by extended health retries (10x10s). If `pg_isready` fails, verify the `timescale/timescaledb` image pull was successful.

## OPERATING POSTURE

We do not "fix" bugs; we resolve deviations.
We do not "try" features; we certify capabilities.
We do not "hope" for stability; we engineer resilience.

**This assertion stands until formally revoked by a V2 Governance Override.**
