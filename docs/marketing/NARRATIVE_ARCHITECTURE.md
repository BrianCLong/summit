# Summit Narrative Architecture

This document defines the single source of truth for explaining Summit. All external communication—website, docs, sales decks—must align with these definitions.

---

## 1. The One-Liner

**Summit is the Truth-First Platform for High-Stakes Intelligence.**

- _Usage:_ Headlines, Landing Pages, Twitter Bio.

---

## 2. The 30-Second Pitch

Organizations dealing with high-stakes data—finance, defense, healthcare—face a choice: move fast and risk compliance, or move slow and lose the edge.

Summit eliminates this trade-off. It’s an intelligence platform with **governance baked into the kernel**. We strictly isolate tenants, enforce policy as code, and maintain a forensic ledger of every action. You get the agility of a modern data platform with the assurance of a bank vault.

- _Usage:_ Intros, Elevator Rides, "What do you do?"

---

## 3. The 5-Minute Technical Overview

Summit is a **multi-tenant, graph-native intelligence platform** designed for environments where data integrity is paramount.

It is built on three pillars:

1.  **Zero-Trust Kernel:** We don't rely on application logic for security. We use OPA for policy decisions and `TenantSafe` database wrappers to mechanically enforce isolation. Identity is verified via short-lived JWTs and step-up authentication for critical actions.
2.  **Verifiable Provenance:** Every insight is traceable. The `ProvenanceLedger` records the lineage of data—from ingestion to transformation to consumption. We know _which_ model generated a summary, _which_ user approved a report, and _which_ dataset grounded a prediction.
3.  **Resilient Orchestration:** We treat compute like a finite resource. The `Maestro` orchestrator and `BudgetTracker` ensure that priority workloads get resources while enforcing strict quotas to prevent runaway costs or "neighbor noise" in multi-tenant environments.

Under the hood, it’s a TypeScript/Node.js monorepo using PostgreSQL for reliable storage and Neo4j for high-dimensional graph analysis, all deployed with a "fail-closed" security posture.

- _Usage:_ Technical Sales, Engineering Onboarding, Whitepapers.

---

## 4. Key Terminology (Do/Don't)

| Concept           | **SAY THIS (Summit)**                               | **NOT THIS (Generic/Weak)**             |
| :---------------- | :-------------------------------------------------- | :-------------------------------------- |
| **Security**      | "Enforced Governance" / "Mechanically Isolated"     | "Secure by design" / "Enterprise Grade" |
| **Logging**       | "Forensic Provenance" / "Tamper-Evident Ledger"     | "Logs" / "Audit Trails"                 |
| **AI**            | "Cognitive Services" / "Deterministic Intelligence" | "Magic" / "GenAI"                       |
| **Scale**         | "Bounded Autonomy" / "Predictable Throughput"       | "Infinite Scale" / "Blazing Fast"       |
| **Multi-Tenancy** | "Hard Isolation" / "Tenant Partitioning"            | "Shared Resources"                      |

---

## 5. Narrative Pillars & Evidence

| Pillar      | Narrative Goal                                            | Mechanical Evidence                   |
| :---------- | :-------------------------------------------------------- | :------------------------------------ |
| **Truth**   | The system does not hallucinate or lie about data origin. | `ProvenanceLedger`, `ArtifactSigning` |
| **Safety**  | The system protects itself and its users from harm.       | `TenantSafePostgres`, `OPA` Gates     |
| **Control** | The operator is always in command of cost and risk.       | `BudgetTracker`, `QuotaManager`       |
