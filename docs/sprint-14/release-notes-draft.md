# Release Notes - v0.14.0 (Sprint 14)

**Codename:** Provenance First
**Release Date:** September 12, 2025 (Target)
**Tag:** `v0.14.0`

## Overview

Sprint 14 delivers the **Provenance Ledger Beta**, enabling end-to-end evidence registration, bundle export, and independent verification. It also introduces the **Tri-Pane Analyst Interface** skeleton, **Field-Level Security** via OPA, and a **Natural Language to Cypher Sandbox** for safe query experimentation.

## 🚀 Key Features

### 1. Provenance Ledger & Bundle Export (Beta)
*   **Evidence Registration**: New API (`/evidence/register`) to record file checksums, licenses, and transform chains.
*   **Verifiable Bundles**: Analysts can export case data as a signed `.zip` bundle containing a Merkle tree manifest.
*   **Verifier CLI**: Standalone Python tool to cryptographically verify bundle integrity off-platform.

### 2. Security & Governance
*   **ABAC/OPA Integration**: Field-level authorization policies are now enforced by an OPA sidecar.
*   **Field Elision**: Restricted fields (e.g., `sensitivity=restricted`) are automatically removed from responses based on user role.
*   **Reason-for-Access**: Sensitive queries now trigger a mandatory justification prompt, logged to an immutable audit stream.

### 3. Analyst Experience (Tri-Pane UI)
*   **Unified View**: New 3-pane layout synchronizing Graph, Map, and Timeline views.
*   **Brushing**: Selecting a time range on the timeline filters the graph and map instantly.
*   **Provenance Tooltips**: Hovering over nodes reveals source credibility, license, and confidence scores.

### 4. Graph Innovation
*   **NL → Cypher Sandbox**: Users can generate Cypher queries from natural language.
*   **Safe Execution**: Generated queries run in ephemeral, sandboxed Neo4j containers to prevent production impact.
*   **Cost Estimation**: Pre-flight checks estimate query cost and row count before execution.

### 5. Reliability & Ops
*   **Cost Guard**: Automatic cancellation of queries exceeding budget or time limits (Slow Query Killer).
*   **SLO Dashboards**: New Grafana panels tracking p95/p99 latency and SLO burn rates.

## ⚠️ Known Issues / Limitations
*   **Sandbox Latency**: Initial cold start for ephemeral containers may take ~2s.
*   **Verifier CLI**: Currently supports CLI only; GUI wrapper planned for v0.15.0.
*   **Policy Caching**: Policy updates may have a 30s propagation delay to sidecars.

## 📝 Upgrade Instructions
1.  **Helm Chart**: Upgrade `intelgraph-platform` to `0.14.0`.
    ```bash
    helm upgrade intelgraph intelgraph/platform --version 0.14.0
    ```
2.  **Database Migrations**:
    *   Run `pnpm db:migrate` to apply new `claim` and `evidence` schemas.
3.  **Policy Bundle**:
    *   Ensure the latest OPA bundle is published to the policy registry.

##  contributors
Special thanks to the Core Graph, Prov-Ledger, and Security teams for landing this vertical!
