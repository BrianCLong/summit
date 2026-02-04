# Atomic PR Plan

This document outlines the atomic PR plan for the multi-repo governance framework.

## Workstream 1: Federated Evidence Format

-   **PR Title:** `feat(federation): introduce federated evidence bundle format`
-   **Paths:**
    -   `schemas/federation/federated_bundle.schema.json`
    -   `docs/federation/FEDERATED_BUNDLE_SPEC.md`
    -   `scripts/federation/validate_federated_bundle.ts`
-   **DoD:**
    -   The schema is well-defined and validated.
    -   The spec is clear and comprehensive.
    -   The validator script works as expected.
-   **Evidence Artifacts:**
    -   A sample federated evidence bundle that validates against the schema.

## Workstream 2: Evidence Ingestion + Registry

-   **PR Title:** `feat(federation): implement evidence ingestion and registry`
-   **Paths:**
    -   `federation/registry/registry.json`
    -   `scripts/federation/ingest_bundle.ts`
    -   `scripts/federation/query_registry.ts`
-   **DoD:**
    -   The registry is created and initialized.
    -   The ingestion script can ingest and validate a federated evidence bundle.
    -   The query script can query the registry.
-   **Evidence Artifacts:**
    -   An ingestion receipt.
    -   A stamp file.

## Workstream 3: Cross-Repo Policy Enforcement

-   **PR Title:** `feat(federation): implement cross-repo policy enforcement`
-   **Paths:**
    -   `docs/federation/POLICY_DISTRIBUTION.md`
    -   `policies/security/security_gates.yml`
    -   `policies/ops/slo_policy.yml`
    -   `policies/compliance/control_catalog.yml`
    -   `policies/compliance/control_evidence_map.yml`
    -   `scripts/federation/sync_policies.ts`
    -   `scripts/federation/detect_policy_drift.ts`
-   **DoD:**
    -   The policy distribution model is well-defined.
    -   The policy packs are created and validated.
    -   The sync script can synchronize policies.
    -   The drift detection script can detect and report on policy drift.
-   **Evidence Artifacts:**
    -   A policy drift report.

## Workstream 4: Unified Assurance Graph

-   **PR Title:** `feat(federation): implement unified assurance graph`
-   **Paths:**
    -   `schemas/assurance/assurance_graph.schema.json`
    -   `docs/assurance/ASSURANCE_GRAPH_MODEL.md`
    -   `scripts/assurance/build_assurance_graph.ts`
    -   `scripts/assurance/query.ts`
-   **DoD:**
    -   The assurance graph schema is well-defined and validated.
    -   The assurance graph model is clear and comprehensive.
    -   The build script can build the assurance graph.
    -   The query script can query the assurance graph.
-   **Evidence Artifacts:**
    -   A sample assurance graph.

## Workstream 5: Governance Operating Model for Scale

-   **PR Title:** `docs(federation): define governance operating model for scale`
-   **Paths:**
    -   `docs/federation/GOVERNANCE_OPERATING_MODEL.md`
    -   `docs/federation/SLAS_AND_RESPONSIBILITIES.md`
-   **DoD:**
    -   The governance operating model is well-defined.
    -   The SLAs and responsibilities are clear and comprehensive.
-   **Evidence Artifacts:**
    -   N/A
