# A3: ER v1 (Service + Queue + Explain)

Track: A (Core Graph)
Branches: feature/er-service, feature/er-queue-ui, feature/er-explain
Labels: track:A, area:er

Overview

- Implement candidate generation, merge/split APIs, explainers.
- Build adjudication queue UI with reversible actions and history.

Acceptance Criteria

- Golden datasets reproduce merges; feature vectors and weights shown.
- Overrides logged with rationale; UI latency ≤200ms on queue ops.
