# Jules: Next 7 Days Directive

## 1. Lock Jules’ 72‑Hour Sprint Outcome

For the Jules GA Readiness sprint, as soon as the window closes:

- Confirm all 10 branches have PRs, green CI, and are merged to `main`.
- Archive any completed sessions and explicitly mark any **spillover** tasks that didn’t make it.
- Re-run a **global scan** (Dependabot, npm audit, Snyk, code scanning) to verify that the “zero alerts / zero vulns / zero warnings” success criteria were actually achieved.

## 2. Establish the Post‑Sprint Truth

Right after that, establish a clear baseline against the GA spec:

- Measure current **test coverage** per repo vs the ≥80% GA target.
- Snapshot **open P0/P1 issues** and **code scanning alert count**.
- Benchmark IntelGraph query latency and Maestro synthesis latency against their p95 targets.
- Check whether OPA consent, PIIDetector v2, and Air-Gap Deploy v1 are actually implemented vs just spec’d.

## 3. Decide the Next Milestone: MVP+ vs Alpha

The GA spec’s milestone table provides the next “north star”:

- If MVP+ isn’t truly done yet, queue Jules next on:
  - OSINT feeds, PostgreSQL persistence, Llama integration, RAG pipeline, Docker-based deploy.
- If MVP+ is effectively satisfied, point Jules at **Alpha**:
  - Scanners (S3, web), dashboards, multilingual OSINT, Switchboard ingestion and routing.

## 4. Concrete “Next” for Jules

Assuming the 72‑hour sprint finishes clean and green, the next mission, in order:

1. **“GA Delta Scan”**: compare post-sprint state to GA Exit Criteria checklist and generate a gap report.
2. **“Coverage & Alerts”**: raise test coverage toward 80% and burn down remaining code scanning alerts and high/critical Dependabot vulns.
3. **“MVP+ Feature Completion”**: implement any missing MVP+ items (feeds, RAG, core deploy path) to lock in a stable demoable platform.
