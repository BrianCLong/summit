Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: GOV-005, GOV-006, AUD-001
Status: active

# Summit Absorption, Convergence & Anti-Fragmentation Doctrine

**"Everything that joins Summit conforms, or it does not join."**

## Prime Directive

The mission of Summit is to provide a single, coherent, trusted platform for intelligence, governance, and operations. To grow, Summit absorbs external systems, teams, and technologies. However, growth must never come at the cost of architectural coherence or platform integrity.

**This is not integration work. This is controlled convergence.**

## Strategic Objectives

1.  **Absorption Framework**: Defined criteria for what enters the ecosystem.
2.  **Technical & Governance Convergence**: One control plane, one truth model.
3.  **Anti-Fragmentation**: Prevention of parallel or divergent implementations.
4.  **Institutional Memory**: Preservation of knowledge and rationale.

## The Absorption Decision Tree

When evaluating an external system (Target) for absorption:

1.  **Does it serve a core strategic purpose?**
    - No → **Reject**.
    - Yes → Proceed to 2.

2.  **Can it conform to Summit's Governance-as-Code?**
    - (Can it produce Provenance? Can it respect OPA policies?)
    - No → **Quarantine** (Rewrite or Extract IP only).
    - Yes → Proceed to 3.

3.  **Can it adopt the Summit Data Model (Graph + Truth)?**
    - No → **Partial Extraction** (Ingest data only, discard logic).
    - Yes → **Full Absorption**.

## Boundaries & Classifications

- **Canonical**: The core Summit platform. Fully governed, provenanced, and unified.
- **Quarantine**: Systems currently undergoing evaluation or extraction. No write access to Canonical.
- **Legacy**: Absorbed systems scheduled for decommission. Read-only or strictly gated.
- **External**: Systems outside the trust boundary.

## The Iron Laws of Convergence

1.  **One Control Plane**: No parallel dashboards or admin panels.
2.  **One Truth Model**: Data lives in the Knowledge Lattice (Graph), not in siloed databases.
3.  **One Identity**: All access is governed by Summit's Identity & Policy engine.
4.  **No Shadow Logic**: Business rules must be visible and governed, not hidden in code.

---

_This document is enforced by the Orchestrator and the Convergence Architecture Agent._
