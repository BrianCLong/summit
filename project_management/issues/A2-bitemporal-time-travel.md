# A2: Bitemporal Model + Time Travel

Track: A (Core Graph)
Branch: feature/time-travel-queries
Labels: track:A, area:temporal

Overview

- Add validFrom/validTo and observedAt/recordedAt semantics.
- Expose snapshot-at-time queries and delta views; support timeline gap highlighting.

Acceptance Criteria

- Deterministic time-slice results in API and UI.
- Timeline view reflects gaps; tests cover boundary conditions.
