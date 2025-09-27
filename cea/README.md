# Consent-Aware Experiment Allocator (CEA)

CEA provides a deterministic experiment allocator implemented in Go with a matching TypeScript SDK. The system enforces consent and exclusion constraints per tenant and purpose, supports stratified traffic splits, sticky bucketing, and automatically rebalances cohorts when consent updates occur. Every assignment transition is persisted in an auditable ledger.

## Go Allocator

The Go package lives in `allocator/` and exposes:

- `Allocator`: in-memory allocator with consent-aware assignment logic.
- `Subject`, `ExperimentConfig`, and related types for describing subjects and experiments.
- `InMemoryLedger`: thread-safe ledger implementation suitable for tests and local workloads.

Run tests from the module root:

```bash
cd cea
go test ./...
```

## TypeScript SDK

The SDK mirrors the allocator contract for client applications. It ships in `sdk/` as an ES module and provides:

- `ConsentAwareAllocator` with the same behaviors as the Go implementation.
- Type definitions for subjects, experiments, assignments, and ledger events.

Build typings from the SDK directory:

```bash
cd cea/sdk
npm install
npm run build
```

Both implementations guarantee deterministic assignments for identical inputs while respecting consent boundaries and maintaining statistical power within tolerance even as participants opt in or out.
