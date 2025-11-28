# Dependency Graph for the 24-Prompt Roadmap

## Layered Execution Model
- **Foundation (Prompts 1–8)** — CI/CD, testing, dependencies, refactoring, documentation, performance, security, deployment. These create the baseline standards, pipelines, and guardrails that every later prompt relies on.
- **Expansion (Prompts 9–16)** — Observability, databases, APIs, modularity, internationalization, compliance, frontend quality, release management. These extend product capabilities and operational coverage while inheriting Foundation guardrails.
- **Resilience & Scale (Prompts 17–24)** — Stress testing, distributed readiness, developer tooling, data pipelines, accessibility, error handling, analytics, and chaos engineering. These assume the prior two layers are in place so results are actionable and safe to automate.

## Dependency Graph (Who Must Precede Whom)
```
Foundation (1–8)
  └─ enables Expansion (9–16)
        └─ enables Resilience & Scale (17–24)
```
Within the **Resilience & Scale** layer, the critical ordering is:
```
17 Stress Testing ─┬─> 18 Distributed Readiness ─┬─> 24 Chaos Engineering
                   │                             └─> 22 Error Handling & Resilience
                   └─> 19 Dev Tooling ----------┐
                               └─> 20 Data Pipeline & ETL
19 Dev Tooling ──┬─> 21 Accessibility
                 └─> 23 Analytics
```
- **Prompt 17 (CI Stress Testing)**: anchor prerequisite for later resilience work so that heavy-load regressions are caught before distributed or chaos exercises.
- **Prompt 18 (Distributed Readiness)**: depends on 17’s load baselines; informs 22 and 24 for consistent retry/backoff and failure envelopes.
- **Prompt 19 (Developer Tooling & Productivity)**: can start in parallel with 17 but should land before prompts that rely on standardized code quality and generation (20, 21, 23).
- **Prompt 20 (Data Pipeline & ETL)**: depends on 19 for linting/templates and on Expansion database work; feeds analytics in 23.
- **Prompt 21 (Accessibility & Inclusive Design)**: can proceed once 19 is available for consistent linting; only lightly coupled to other resilience items.
- **Prompt 22 (Error Handling & Resilience)**: consumes outputs from 18 to normalize retry/degradation patterns across distributed workflows.
- **Prompt 23 (Analytics & User Insights)**: benefits from 19 for templates and 20 for reliable data feeds; should start after minimal data plumbing exists.
- **Prompt 24 (Chaos Engineering & Fault Injection)**: last in chain—relies on 17 for load gates, 18 for distributed behaviors, and 22 for hardened error paths so injected failures are observable and contained.

## Parallelizable Workstreams (Safe to Run Together)
- **Foundation prompts** can mostly run in parallel, except security hardening should finalize before deployment automation.
- **Within Resilience & Scale:**
  - Start **17** and **19** together.
  - Start **21** after 19’s lint/format hooks are available.
  - Start **20** after 19 and Expansion’s database APIs are stable; **23** can begin once 20’s schemas exist.
  - **22** begins once 18 defines distributed patterns.
  - **24** begins only after 17, 18, and 22 are complete and guardrails are monitored.

## Gating & Exit Criteria
- **Load/Stress (17):** documented throughput/latency/error budgets with CI fail-fast thresholds for regression.
- **Distributed Readiness (18):** service discovery configs, retry/backoff defaults, and idempotent workflow proof-points validated in staging.
- **Dev Tooling (19):** pre-commit + static analysis mandatory in CI; local setup script verified on a clean machine.
- **Data Pipeline (20):** schema validation, lineage docs, and freshness/quality monitors passing for staged feeds.
- **Accessibility (21):** automated a11y suite passing and manual keyboard/screen-reader spot checks for primary journeys.
- **Error Handling (22):** standardized exception taxonomy and global handlers exercised by chaos/load tests.
- **Analytics (23):** privacy review complete; dashboards populated from production-like telemetry; anomaly alerts tuned.
- **Chaos (24):** recurring experiments automated in CI/CD with documented blast radius, detection, and recovery runbooks.

Use this graph to schedule parallelizable streams while keeping later fault-injection and distributed validations grounded on tested, observable baselines.
