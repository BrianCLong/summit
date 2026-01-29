# Pipeline Inventory (TODO)

## 1. Streaming Topology
* [ ] Identify current entry points for network traffic ingestion.
* [ ] Map existing event formats to `GraphSnapshot` requirements.
* [ ] Verify if "streaming ingestion path" assumption holds (see Master Plan 1.1).

## 2. Caching Layers
* [ ] Locate existing in-memory caches (L1 candidates).
* [ ] Locate shared caches (Redis/Memcached) (L2 candidates).
* [ ] Confirm tenant isolation mechanisms in current caches.

## 3. Circuit Breaker Integration
* [ ] Identify model invocation points suitable for circuit breaker wrapping.
* [ ] Document existing degradation/fallback logic (if any).
