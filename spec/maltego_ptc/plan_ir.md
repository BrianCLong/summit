# Plan IR and Optimization

## Plan IR

- Sequence of transform operations compiled with effect/disclosure annotations.
- Supports batching calls to common sources and deduplication.

## Optimization

- Honors policy constraints and disclosure limits while optimizing execution order.
- Cache outputs keyed by transform signature; invalidate on policy version change.
