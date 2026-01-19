# @intelgraph/memory-engram

Deterministic Engram-style memory primitives for Summit/Maestro. This package provides
canonicalization, multi-head N-gram hashing, deterministic memory gating, and a lightweight
Maestro memory tool wrapper suitable for offline/fast-path use.

## Scope

- Canonicalization and token normalization
- Multi-head N-gram hashing with tenant salt
- Deterministic memory gate (no LLM calls)
- In-memory store implementation for tests
- Maestro memory lookup wrapper with telemetry

## Non-goals

- Policy engine implementation (must be supplied by caller)
- Embedding generation (allowed only at ingestion time)

## Usage

```ts
import {
  Canonicalizer,
  NgramHasher,
  InMemoryEngramStore,
  MemoryGate,
  MaestroMemoryTool,
} from '@intelgraph/memory-engram';

const canonicalizer = new Canonicalizer();
const hasher = new NgramHasher({ heads: 3, minGram: 2, maxGram: 4, salt: 'tenant-a' });
const store = new InMemoryEngramStore();
const gate = new MemoryGate({ canonicalizer });

const tool = new MaestroMemoryTool({ canonicalizer, hasher, store, gate });
const result = await tool.lookup({
  query: 'List the OPA policy tags for memory records',
  phase: 'planner',
  tenantId: 'tenant-a',
});
```
