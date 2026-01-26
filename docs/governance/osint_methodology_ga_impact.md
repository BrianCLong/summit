# OSINT Methodology GA Impact Assessment

**Methodology Source:** Automation Turn #5 (2026-01-26)

## 1. GA-Blocking Requirements

These capabilities are non-negotiable for General Availability (GA) as they define the safety and auditability of the system.

- **Provenance-Enforcing Ingestion:**
  - *Requirement:* No data enters the canonical graph without `source_id`, `timestamp`, and `method`.
  - *Gate:* `Graph-Sync-Validator` must reject orphaned nodes.
- **Explainability Keys:**
  - *Requirement:* All analytic outputs must carry a `ReconstructionKey`.
  - *Gate:* API responses failing schema validation for `reconstruction_key` must 500.

## 2. Post-GA Enhancements

These are strategic differentiators to be scheduled for Sprints N+1 to N+6.

- **First-Class State Change Entities:**
  - Transitioning from snapshot-based diffing to event-based `StateChange` nodes.
- **Full Claim Lineage:**
  - Deep modeling of mutation types (translation, paraphrase) in the graph schema.

## 3. CI/CD & Runtime Gates

| Gate Name | Check Type | Trigger | Failure Action |
| :--- | :--- | :--- | :--- |
| **Evidence-ID Consistency** | Static | PR / Merge | Block Merge |
| **Contradiction Exposure** | Runtime | Analysis Request | Flag "Low Confidence" |
| **Reconstruction Integrity** | Runtime | Report Generation | Block Export |

## 4. "Slow Judgment" Mandates

Areas where automation must intentionally introduce friction to prevent *Automation Authority Bias*.

- **High-Stakes Attribution:**
  - *Mechanism:* UI "Break Glass" confirmation requiring user to type "I verify this attribution" before finalizing.
- **Contradiction Resolution:**
  - *Mechanism:* System cannot auto-resolve "High" confidence contradictions; must queue for human review.

---

## 5. Strategic Audit Readiness

### The Audit Question
>
> *If Summit were audited 18 months from now, which of these artifacts would most clearly demonstrate methodological superiority rather than just tooling?*

### The Answer

**The `ReconstructionKey` and the Immutable `RevisionChain` (Evidence Ledger).**

*Why:* Tooling changes, but an unbroken, cryptographic chain of *why* an assessment was made (Reconstruction) and *how* the evidence evolved (Revision Chain) proves that the system prioritizes truth over speed. This protects against "Black Box" liability and demonstrates institutional memory that survives staff turnover.
