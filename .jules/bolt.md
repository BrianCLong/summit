## 2025-05-15 - [Batching vs. Fallback Resilience]
**Learning:** In highly unreliable data ingestion paths (like OSINT feeds), a batch-with-fallback pattern is superior to pure batching. If a single record in a 100-item batch violates a constraint (e.g., duplicate value), many database drivers (like `pg`) will abort the entire query. A fallback to individual inserts for that specific chunk ensures that 99% of the data still gets through, maintaining high availability without sacrificing the performance of the common case.
**Action:** Use chunked batching with a `try-catch` individual fallback for all non-critical data ingestion routes.

## 2025-05-15 - [PR Scope Management]
**Learning:** Attempting to fix "broken windows" (CI failures, merge markers) while submitting a performance PR can be perceived as destructive or suspicious by reviewers if the changes appear to bypass security gates.
**Action:** Keep performance PRs hyper-focused. If the environment is broken, document it in the PR description or fix only the absolute minimum required to pass, and never by disabling CI gates.
