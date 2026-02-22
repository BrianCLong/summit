## 2026-02-17 - [Neo4j Batching and CI Fixes]
**Learning:** O(N) network round-trips in Neo4j synchronization were a significant bottleneck. Using UNWIND batching reduces round-trips to O(K). Also, many pre-existing repository issues (merge conflicts, outdated lockfiles, version drift) block CI and must be resolved before any PR can be verified.
**Action:** Use batched operations for graph database sync. Always verify CI readiness by checking for merge markers and lockfile consistency early in the process.
