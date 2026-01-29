# Zero-Trust Data Governance Blueprint

**Version:** 1.0.0
**Status:** PILOT
**Owner:** @summit/governance

## Executive Summary

Summit adopts a **Zero-Trust Data Governance** model where data is not trusted by default. Instead, trust is derived from **explicit registration**, **verifiable provenance**, and **continuous validation**.

This blueprint moves governance from "policy-on-paper" to "policy-as-code," enforced by CI/CD gates.

## Core Principles

1.  **No Hidden Assets**: If it's not in `governance/registry.json`, it doesn't exist to the governance engine.
2.  **No Provenance, No Trust**: Data without a SLSA provenance attestation is considered "untrusted" and blocked from production pipelines.
3.  **Owner Accountability**: Every asset must have a defined owner (person or team) responsible for its lifecycle.

## Architecture

### 1. The Registry (`governance/registry.json`)
The single source of truth for all governed data assets. It defines:
*   **Identity**: Unique URN.
*   **Location**: File path in the repo.
*   **Ownership**: Responsible GitHub team.
*   **Classification**: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED.
*   **Controls**: Whether provenance is required.

### 2. The Enforcement Gate (`scripts/ci/verify_data_registry.mjs`)
A CI script that runs on every PR to ensure:
*   The registry is valid JSON.
*   All referenced files exist.
*   All assets have valid owners.
*   (Future) All assets marked `provenance_required: true` have a corresponding `.intoto.json` provenance file.

### 3. Integration with Policy Engine
Rego policies (`policy/provenance.rego`) consume the provenance files to validate signatures and build metadata.

## Pilot Scope

The initial pilot covers:
*   Governance artifacts (Taxonomies, Control Maps).
*   Policy definitions.

## Roadmap

*   **Phase 1 (Now)**: Static registry and CI verification.
*   **Phase 2**: Automated provenance generation for registered assets.
*   **Phase 3**: Runtime blocking of unregistered data ingestion.
