# OSINT Methodology GA Impact Assessment

**Methodology Source:** Automation Turn #5 (2026-01-26)

## 1. GA-Blocking Requirements

These capabilities are non-negotiable for General Availability (GA) as they define the safety and auditability of the system.

- **Provenance-Enforcing Ingestion:**
  - _Requirement:_ No data enters the canonical graph without `source_id`, `timestamp`, and `method`.
  - _Gate:_ `Graph-Sync-Validator` must reject orphaned nodes.
- **Explainability Keys:**
  - _Requirement:_ All analytic outputs must carry a `ReconstructionKey`.
  - _Gate:_ API responses failing schema validation for `reconstruction_key` must 500.

## 2. Post-GA Enhancements

These are strategic differentiators to be scheduled for Sprints N+1 to N+6.

- **First-Class State Change Entities:**
  - Transitioning from snapshot-based diffing to event-based `StateChange` nodes.
- **Full Claim Lineage:**
  - Deep modeling of mutation types (translation, paraphrase) in the graph schema.

## 3. CI/CD & Runtime Gates

| Gate Name                    | Check Type | Trigger           | Failure Action        |
| :--------------------------- | :--------- | :---------------- | :-------------------- |
| **Evidence-ID Consistency**  | Static     | PR / Merge        | Block Merge           |
| **Contradiction Exposure**   | Runtime    | Analysis Request  | Flag "Low Confidence" |
| **Reconstruction Integrity** | Runtime    | Report Generation | Block Export          |

### 3.1 OSINT Integration Gate (Post-PR #16916 Trust Expansion)

OSINT integration is a **gated product surface**, not a casual merge path. Merges are **blocked**
until all of the following conditions are enforced and evidenced:

- **Required Checks Policy Enforceable:** Branch protection and CI required checks are actively
  enforced (no bypass) for OSINT-related changes.
- **CI Stability Proven:** CI runs are stable and green with documented pass evidence.
- **End-to-End Provenance/Evidence Schema Validation:** Provenance and evidence schemas must be
  validated end-to-end (ingest → transform → persist → export), not merely present in artifacts.

**Failure Action:** Block merge; record as a **Governed Exception** only with explicit authority
references.

## 4. "Slow Judgment" Mandates

Areas where automation must intentionally introduce friction to prevent _Automation Authority Bias_.

- **High-Stakes Attribution:**
  - _Mechanism:_ UI "Break Glass" confirmation requiring user to type "I verify this attribution" before finalizing.
- **Contradiction Resolution:**
  - _Mechanism:_ System cannot auto-resolve "High" confidence contradictions; must queue for human review.

---

## 5. Strategic Audit Readiness

### The Audit Question

> _If Summit were audited 18 months from now, which of these artifacts would most clearly demonstrate methodological superiority rather than just tooling?_

### The Answer

**The `ReconstructionKey` and the Immutable `RevisionChain` (Evidence Ledger).**

_Why:_ Tooling changes, but an unbroken, cryptographic chain of _why_ an assessment was made (Reconstruction) and _how_ the evidence evolved (Revision Chain) proves that the system prioritizes truth over speed. This protects against "Black Box" liability and demonstrates institutional memory that survives staff turnover.
