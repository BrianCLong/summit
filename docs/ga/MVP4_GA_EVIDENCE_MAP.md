# Summit MVP-4 GA Evidence Map

**Purpose:** This document maps the chapters of the `MVP4_GA_DEMO_REHEARSAL_SCRIPT.md` to the specific, certified capabilities and readiness claims asserted in `docs/SUMMIT_READINESS_ASSERTION.md`. It provides the auditable link between the demo actions and the official GA baseline.

---

| Demo Script Chapter | Certified Capability Demonstrated | Link to Readiness Assertion |
| :--- | :--- | :--- |
| **Chapter 1: Environment Bootstrap** | **Data Ingestion & Integrity:** The bootstrap process prepares the environment, including the graph database, which is subject to automated integrity checks. | `docs/SUMMIT_READINESS_ASSERTION.md` |
| **Chapter 2: System Activation** | **Identity & Access Management / Orchestration:** The `make up` command activates all services, including those governed by OIDC, mTLS, and the Maestro Orchestrator. | `docs/SUMMIT_READINESS_ASSERTION.md` |
| **Chapter 3: Golden Path Verification** | **Contractually Enforced Invariants:** The `make smoke` test is the "Golden Path" test suite, which must have a 100% pass rate as a CI-enforced invariant. | `docs/SUMMIT_READINESS_ASSERTION.md` |
