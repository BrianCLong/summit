# GDELT GKG Connector (Governed Integration)

This connector ingests narrative intelligence from the GDELT Global Knowledge Graph.

## Governance Invariants

1. **Signal Isolation**: GDELT observations are stored in the "Signal Plane" and never automatically promoted to the "Fact Plane".
2. **Deterministic Ingest**: All ingestion runs are idempotent and verify checksums.
3. **Policy Gating**: Graph traversals across GDELT data are subject to strict budget limits and policy enforcements.

## Configuration

See `manifest.yaml` for default configuration and rate limits.
