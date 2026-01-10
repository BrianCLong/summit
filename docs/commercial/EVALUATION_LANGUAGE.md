# Summit Platform Evaluation Language

## 1. Purpose

This document provides guidance for technical evaluators to conduct a productive and focused review of the Summit Platform's General Availability (GA) release. Our goal is to ensure you can verify the platform's core, certified capabilities within a structured timeframe.

## 2. What GA Is (and Is Not)

The Summit GA release represents a stable, secure, and performant baseline for controlled production environments. It is not a feature-complete preview of our entire V2 roadmap.

**GA Is:**
- **Certified:** Key capabilities in Identity & Access Management, Data Ingestion, and Orchestration have been certified for production use.
- **Securely Governed:** The platform is protected by an automated security framework that enforces a consistent security baseline.
- **Evidence-Based:** All certified capabilities are backed by verifiable evidence and automated checks.

**GA Is Not:**
- **A Demo of All Future Features:** Advanced capabilities like the "Agentic Mesh" (autonomous agents) and "PsyOps" (active cognitive defense) are intentionally deferred and operate in a constrained, human-in-the-loop mode. They are not part of the GA evaluation scope.
- **Exempt from Hardening:** As part of our commitment to security, we are actively remediating a set of critical vulnerabilities identified during a recent audit. Areas related to these vulnerabilities are out of scope for this evaluation.

## 3. Recommended Evaluation Scenarios

We recommend the following time-boxed scenarios to verify the core GA functionality.

### 30-Minute Verification ("The Golden Path")

This scenario validates the main workflow of the platform.
1.  **Ingest an Entity:** Add a new entity (e.g., a person, organization) through the UI or API.
2.  **Establish a Relationship:** Link the new entity to an existing one.
3.  **Run a Query:** Use the GraphQL API or UI to query the relationship you just created.
4.  **Verify Provenance:** Confirm that the creation and linking events are recorded in the provenance log.

### 2-Hour In-Depth Verification

This scenario extends the Golden Path to include security and operational verification.
1.  **Complete the 30-Minute Verification.**
2.  **Run Automated Security Checks:** Execute the security baseline verification script from the repository root:
    ```bash
    pnpm verify
    ```
    Confirm that all 12 checks pass. This verifies the core security framework.
3.  **Test Access Policies:**
    - As a standard user, attempt to access an admin-only endpoint (e.g., `/admin/tenants`). Verify access is denied.
    - As a user from Tenant A, attempt to query data belonging to Tenant B. Verify the query returns an empty or unauthorized result.
4.  **Review the Customer Zero Pack:** Examine the artifacts in the Customer Zero adoption pack to understand the onboarding and operational runbooks used for initial deployment.

## 4. Unsupported and Out-of-Scope Areas

To ensure a productive evaluation, the following areas are explicitly **unsupported and out of scope** for the GA evaluation:

- **Advanced Autonomous Agents:** Any feature described as "Agentic Mesh" or requiring full autonomy.
- **Active Defense Modules:** The "PsyOps" and other active countermeasure systems.
- **Predictive Analytics:** The "Oracle" subsystem and other predictive geopolitical features.
- **Specific Authentication Flows:** Certain authentication and authorization pathways are currently being hardened as part of our transparent remediation process. A clean security ledger is the target deliverable upon completion.

Attempting to evaluate these areas may produce unexpected results and is not representative of the certified GA capabilities. We appreciate your cooperation in focusing on the stable, verifiable core of the platform.
