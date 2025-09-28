# PR-15 Deep Performance Tuning Plan

Neo4j GDS
- Ensure GDS memory config fits dataset; cache common projections
- Prefer native projections for centrality/community if available
- Add query hints and limit path depths where feasible

AST Cost Model (prototype)
- Estimate cost from Cypher: node scans, hops, expansions, filters
- Penalize ALL PATHS and wide expansions; reward time filters
- Surface estimated cost in Copilot preview for user trade-offs

UI Slimming
- Perf mode hide non-critical panels (`VITE_PERF_MODE=1`)
- Defer heavy charts until viewport-visible; batch state updates
- Limit Cyto layouts to a budget and resume on demand

Verification
- Compare p95 before/after; include Neo4j PROFILE samples
- Ensure no regression on ingest or ABAC filtering path
