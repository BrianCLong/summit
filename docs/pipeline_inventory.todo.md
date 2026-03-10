# Pipeline Inventory (TODO)

## 1. Streaming Topology
* [x] Identify current entry points for network traffic ingestion.
* [x] Map existing event formats to `GraphSnapshot` requirements.
* [x] Verify if "streaming ingestion path" assumption holds (see Master Plan 1.1).

## 2. Caching Layers
* [x] Locate existing in-memory caches (L1 candidates).
* [x] Locate shared caches (Redis/Memcached) (L2 candidates).
* [x] Confirm tenant isolation mechanisms in current caches.

## 3. Circuit Breaker Integration
* [x] Identify model invocation points suitable for circuit breaker wrapping.
* [x] Document existing degradation/fallback logic (if any).
