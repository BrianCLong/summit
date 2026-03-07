# 0018 - API Versioning & Deprecation Tradeoffs

## Status

Accepted

## Context

Multiple services expose public APIs consumed by customers and internal tools. Breaking changes have slipped without clear governance, causing outages for downstream clients.

## Decision

- Adopt URI-based major versions with optional `Accept-Version` header for minor negotiation.
- Require deprecation workflow: headers + sunset date, migration guide, and compatibility tests kept until EOL.
- Generate API changelog per release from OpenAPI diffs; block breaking changes without version bump + docs.

## Alternatives Considered

1. **Header-only versioning**: flexible but less visible; rejected for external clarity.
2. **No explicit versions (semantic change via docs)**: too risky; rejected.
3. **Date-based versions**: predictable but noisy churn; rejected.

## Consequences

- - Predictable compatibility guarantees; + consumers know upgrade timelines.
- - Slight duplication maintaining multiple versions; - more CI cycles for compatibility tests.

## Validation

- Compatibility harness runs against published versions; failing tests block merge unless version bumped and guides added.

## References

- `docs/wave13/api-versioning-governance.md`
