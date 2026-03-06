# Summit Ledger (WriteSet Journal)

This module implements:
- An append-only WriteSet ledger (system of record)
- Bitemporal semantics: valid_time vs transaction_time
- Replayable materialized views for Reality/Belief/Narrative graphs (RG/BG/NG)
- Deterministic Explain() that must be fully sourced from ledger evidence

Design goals:
- Immutable ingestion journal: no silent mutation of truth
- Courtroom/oversight-ready provenance
- Replay any past state (as-of transaction_time)
- Diff two states (what changed + why)
