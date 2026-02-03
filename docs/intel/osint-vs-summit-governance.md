# OSINT vs. Summit: Evidence Discipline & Governance

**Date:** 2026-01-25
**Scope:** Comparative analysis of evidence integrity models.

## The "Snapshot" vs. "Ledger" Paradigm

### External OSINT Platforms (Maltego, i2, 1 TRACE)

Most traditional OSINT platforms operate on a **"Snapshot"** model:

* **State:** Analysts save a "graph" or "chart" at a point in time (e.g., `.mtgx` file).
* **Provenance:** Often limited to metadata fields (e.g., "Source: Twitter API") attached to an entity.
* **Integrity:** The file is a mutable artifact. It can be edited, shared, or altered without a tamper-evident audit trail of *who* changed *what* and *when*.
* **Risk:** "Chain of Custody" is broken the moment the file leaves the original system. In court, this requires manual affidavit support.

### Summit Architecture (IntelGraph + Provenance Ledger)

Summit operates on a **"Ledger"** model (The "Truth Moat"):

* **State:** The graph is a projection of an immutable event log (`ProvenanceLedger`).
* **Provenance:** Every node and edge creation/modification is a signed transaction. We know *exactly* which agent (human or AI), policy, and source authorized the change.
* **Integrity:** The ledger is cryptographically verifiable. Deletions are "tombstones," not erasures.
* **Advantage:** We sell **"Compliance as Code."** An export from Summit is not just a picture; it is a verifiable legal argument.

## Specific Control Comparisons

| Feature | Competitor Standard | Summit Standard |
| :--- | :--- | :--- |
| **Evidence Capture** | Manual "Save to Case" or drag-and-drop. | **Automated.** Every query and result is logged. "Evidence Gates" prevent using unverified data in final reports. |
| **Analyst Actions** | undo/redo stack (local session). | **Persistent Audit Log.** Every "pivot" or "expand" is recorded as a decision point. |
| **Source Attribution** | Metadata string (editable). | **Immutable Reference.** Links back to the raw ingestion event and the specific connector version used. |
| **Contradiction Detection** | Manual visual inspection. | **Automated (Turn #5).** System flags when new evidence contradicts existing claims (e.g., "Person A was in London" vs. "Person A IP in NYC"). |

## Governance Implication

Adopting Summit means moving from **"Intelligence as Art"** (subjective, hard to reproduce) to **"Intelligence as Science"** (reproducible, auditable, falsifiable).
