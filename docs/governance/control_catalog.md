# Summit Governance Control Catalog

**Canonical Source:** `docs/governance/control_domain_map.yaml`
**Enforcement:** `scripts/ci/verify_governance_docs.mjs`

## Overview

This catalog defines the control domains governing the Summit platform, mapped to industry standards.

## 1. AI Lifecycle Governance
*   **Description:** End-to-end governance of AI model lifecycle from design to decommissioning.
*   **Alignment:**
    *   **NIST AI RMF:** GOVERN 1.1, MAP 1.2, MANAGE 2.4
    *   **SOC-2:** CC3.2, CC5.1, CC5.2
    *   **EU AI Act:** Articles 14, 15

## 2. Data Governance
*   **Description:** Governance of data lineage, provenance, quality, and licensing.
*   **Alignment:**
    *   **NIST AI RMF:** MAP 2.1, MEASURE 2.2
    *   **SOC-2:** CC3.3, CC6.1
    *   **EU AI Act:** Article 10

## 3. Continuous Governance
*   **Description:** Runtime monitoring, drift detection, and adaptive control application.
*   **Alignment:**
    *   **NIST AI RMF:** MANAGE 3.2, MANAGE 3.3
    *   **SOC-2:** CC7.1, CC7.2

## 4. Accountability
*   **Description:** Role definition, ownership assignment, and escalation protocols.
*   **Alignment:**
    *   **NIST AI RMF:** GOVERN 1.2, GOVERN 1.3
    *   **SOC-2:** CC1.2, CC1.3

## 5. Zero-Trust Data
*   **Description:** Strict metadata enforcement, source trust scoring, and provenance verification.
*   **Alignment:**
    *   **NIST AI RMF:** MAP 2.2
    *   **EU AI Act:** Article 10(2)(g)
