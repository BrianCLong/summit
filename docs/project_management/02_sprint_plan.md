
# Sprint Plan

This document outlines the sprint plan for the IntelGraph project.

## Sprint 1: Foundations & Graph Explorer

**Goal:** Lay the foundation for the new UI and deliver the initial version of the Graph Explorer.

**Tasks:**

*   **Epic: Core Platform & Developer Experience**
    *   **Task:** Review and update the `DEVELOPER_ONBOARDING.md` document.
    *   **Task:** Configure `eslint` and `prettier` to enforce the code style guide.
*   **Epic: User Interface & Workflow**
    *   **Task:** Implement the "Graph Explorer" UI as described in `velocity-plan-v6.md`.
    *   **Task:** Integrate the Cytoscape.js library for graph visualization.
    *   **Task:** Allow users to pan and zoom the graph.
    *   **Task:** Allow users to click on nodes and edges to see more details.
*   **Epic: Security & Trust**
    *   **Task:** Implement JWT-based authentication with refresh token rotation.

## Sprint 2: Copilot & Connectors

**Goal:** Deliver the first version of the AI Copilot and the Connector SDK.

**Tasks:**

*   **Epic: User Interface & Workflow**
    *   **Task:** Implement the "Copilot" feature as described in `velocity-plan-v6.md`.
    *   **Task:** Create a set of pre-defined analysis "runbooks" for common investigation scenarios.
*   **Epic: AI & Analytics**
    *   **Task:** Implement the "GraphRAG" feature as described in `VISION.md`.
    *   **Task:** Use graph algorithms to identify key entities and relationships.
*   **Epic: Connectors & Data Ingestion**
    *   **Task:** Create a "Connector SDK" as described in `velocity-plan-v6.md`.
    *   **Task:** Develop a connector for Have I Been Pwned.

## Sprint 3: Collaboration & Security Hardening

**Goal:** Enhance the platform's collaboration features and strengthen its security posture.

**Tasks:**

*   **Epic: User Interface & Workflow**
    *   **Task:** Implement real-time updates for the graph view.
    *   **Task:** Add presence indicators to show which users are currently active in an investigation.
*   **Epic: Security & Trust**
    *   **Task:** Implement role-based access control (RBAC).
    *   **Task:** Integrate with Open Policy Agent (OPA) for fine-grained policy enforcement.
    *   **Task:** Encrypt all data at rest and in transit.
*   **Epic: Observability & Performance**
    *   **Task:** Set up a monitoring stack with Prometheus and Grafana.
