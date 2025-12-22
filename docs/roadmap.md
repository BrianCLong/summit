# SummitThreat Roadmap

This document outlines the future development plans for the SummitThreat platform.

## Immediate (v2.0.x hardening)

*   **Enterprise readiness and GA closure:**
    *   Finish migration activities for the 2.0 release train and document any remaining go/no-go items.
    *   Stabilize CI (keep `pr-quality-gate` green), unblock flaky test suites, and enforce smoke coverage on new services.
*   **Security and governance:**
    *   Clear outstanding security alerts, rotate any stale credentials, and re-run supply chain attestations.
    *   Codify governance/observability defaults (dashboards, alerts, OTel sampling) so new services inherit a vetted baseline.
*   **Scalability and tenancy foundations:**
    *   Add horizontal scaling playbooks for the core data plane and plan the first cut of multi-tenant isolation requirements.
    *   Evaluate additional OSINT source integrations to broaden signal coverage without degrading SLOs.

## Q1 2026: MVP+

*   **Zero-Cost Universal Feed Fusion:**
    *   Integrate with at least 10 live open-source feeds.
    *   Implement a PostgreSQL database for storing IOCs.
    *   Add basic data deduplication and normalization.
*   **Hyper-Predictive GenAI Engine:**
    *   Integrate with a local LLM (e.g., Llama).
    *   Implement a basic RAG pipeline for threat forecasting.
*   **Deployment:**
    *   Provide Docker and Docker Compose files for easy deployment.

## Q2 2026: Alpha Release

*   **Autonomous Attack Surface Emulator:**
    *   Implement a scanner for AWS S3 buckets.
    *   Implement a scanner for public-facing web servers.
*   **Multilingual Deep Web Hunter:**
    *   Implement a passive scraper for a selection of public forums.
    *   Integrate with a translation API.
*   **Frontend:**
    *   Add interactive dashboards with risk heatmaps and timelines.

## Q3 2026: Beta Release

*   **Collaborative Analyst Swarm:**
    *   Implement a basic multi-agent system with pre-defined tasks.
    *   Implement a simple feedback mechanism for human-in-the-loop.
*   **Integrations:**
    *   Add support for exporting data to STIX/JSON/MISP formats.
    *   Provide a basic API for integrating with SIEMs/SOARs.

## Q4 2026: v1.0 Release

*   **Full Feature Implementation:**
    *   Complete the implementation of all five core modules.
*   **Plugin Ecosystem:**
    *   Develop a plugin architecture for extending the platform's capabilities.
*   **Enterprise Features:**
    *   Add support for multi-tenancy and role-based access control.
