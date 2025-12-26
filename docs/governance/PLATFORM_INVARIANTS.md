# Platform Invariants & Non-Negotiables

**Status:** APPROVED
**Last Updated:** October 2025
**Effective Date:** Immediate

---

## Overview

This document defines the **absolute invariants** of the Summit platform. These are properties that **must never be compromised** under any circumstances, regardless of feature requests, commercial pressure, or architectural convenience.

An invariant is a property that holds true for every state of the system, throughout its entire lifecycle.

---

## 1. Core Invariants

### 1.1 Tenant Isolation
**Invariant:** Data belonging to one tenant must *never* be accessible to another tenant without explicit, auditable, and revocable consent.
*   **Enforcement:**
    *   Row-level security (RLS) in databases.
    *   `tenant_id` binding in all API contexts.
    *   Strict separation in search indices and graph data.
    *   OPA policy checks on every access attempt.
*   **Non-Negotiable:** "Soft" isolation (application-level filtering only) is insufficient for core data storage.

### 1.2 Policy-First Enforcement
**Invariant:** No action can be taken by the system without a prior policy evaluation.
*   **Enforcement:**
    *   All API mutations must pass through a policy gate (OPA).
    *   No "admin bypass" keys that skip policy checks in production.
    *   Policy changes are versioned and audited.
*   **Non-Negotiable:** Hardcoding authorization logic inside business logic functions without external policy decoupling.

### 1.3 Auditability & Provenance
**Invariant:** Every change to data or configuration must be traceable to an actor (human or agent) and a specific point in time.
*   **Enforcement:**
    *   Immutable audit logs (WORM storage).
    *   `ProvenanceLedger` recording for all entity mutations.
    *   Cryptographic linking of audit chains (where applicable).
*   **Non-Negotiable:** "Fire and forget" operations that leave no trace.

### 1.4 Bounded Autonomy
**Invariant:** Autonomous agents must operate within strict, pre-defined bounds and cannot self-escalate privileges.
*   **Enforcement:**
    *   Resource quotas (CPU, RAM, API calls) enforced at the platform level.
    *   Approval gates for high-impact actions (e.g., mass notifications, data deletion).
    *   Hard kill-switches accessible to human operators.
*   **Non-Negotiable:** Unbounded recursion or self-replication of agents.

### 1.5 Data Lifecycle Guarantees
**Invariant:** Data retention and deletion policies must be strictly honored.
*   **Enforcement:**
    *   Automated TTL expiration for temporary data.
    *   Cryptographic erasure for "Right to be Forgotten" requests.
    *   Legal hold overrides preventing deletion when active.
*   **Non-Negotiable:** "Soft deletes" that persist indefinitely without a governance reason.

---

## 2. Explicit Scope Definitions

### 2.1 What is Invariant (Immutable)
*   The **Data Model Core**: Person, Organization, Event, Document entities and their provenanced relationships.
*   The **Security Model**: Identity-based access control + Attribute-based access control (ABAC).
*   The **Audit Trail**: The structure and immutability of the audit log.

### 2.2 What is Allowed to Evolve (Mutable)
*   **User Interfaces**: The presentation layer can change freely as long as it respects permissions.
*   **AI/ML Models**: The underlying models (LLMs, classifiers) can be swapped or upgraded.
*   **Connectors**: New data sources and integration points can be added.
*   **Orchestration Logic**: Workflow definitions and agent strategies can iterate.

### 2.3 What is Explicitly Out of Scope
*   **General Purpose Compute**: Summit is not a cloud provider; it does not host arbitrary workloads unrelated to its intelligence mission.
*   **Unverified Social Media Botting**: Summit will not support features designed for deceptive mass influence or "astroturfing".
*   **Ad-Hoc Data Warehousing**: Summit is not a dumping ground for unstructured, unmodelled data lakes.

---

## 3. Verification & Enforcement

### 3.1 Automated Checks
*   **CI/CD Pipeline**:
    *   Static analysis ensuring `tenant_id` presence in all queries.
    *   Policy tests validating rejection of unauthorized cross-tenant access.
*   **Runtime Monitoring**:
    *   Alerts on audit log gaps or integrity failures.
    *   Anomaly detection for sudden spikes in agent activity.

### 3.2 Human Review
*   **Architecture Review Board (ARB)**: Must approve any change that touches the persistence or security layers.
*   **Security Audit**: Annual third-party review of invariant enforcement.

---

## 4. Breach Protocol

If an invariant is found to be violated:
1.  **Immediate Stop**: The affected subsystem is taken offline.
2.  **Disclosure**: Affected tenants are notified within 24 hours.
3.  **Remediation**: The root cause is fixed, and a new regression test is added to the invariant suite.
4.  **Accountability**: A post-mortem is published, and responsible parties are held accountable (retraining or removal).
