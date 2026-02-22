# GraphRAG multi-region + edge + federated extractors (design)
Defaults: OFF. Deny-by-default cross-region egress.
Key idea from Dotzlaw: multi-region graph DBs + federated learning + edge instances. (See EVD-MULTIREGIONGRAPHRAG-ARCH-001)

## Architecture

1. **Topology & Routing**:
   - defined in `graphrag/topology/regions.yaml`.
   - `Router` enforces data classification rules (allow_classes).
   - Cross-region egress is denied by default.

2. **Storage**:
   - Region-aware contracts for Graph and Vector stores.
   - Replication log and reconciliation logic for consistency.

3. **Edge**:
   - Edge cache for local retrieval.
   - Filters enforced at edge (redaction, PII).

4. **Federation**:
   - Signed updates for extractors.
   - Rejected if unsigned or invalid.

## Integration

All queries go through `graphrag_bridge.query(...)` which uses the Router.
