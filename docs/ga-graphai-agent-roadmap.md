# GA-GraphAI Agent Evolution Roadmap

## Context and Constraints
- Request: evolve dual curriculum-executor agents (Qwen3-8B) with IntelGraph ingestion, 95% auto-merge velocity, backpressure stability, 30% uplift over Agent0 on Summit12 (Leak-Free Runtime @99%, Graph Accuracy @90%), and Fara-7B vision for screen-based GitHub automation.
- Current repo state: no bundled model weights, no orchestration glue for Qwen/Fara, and no automation sandboxes; work must remain offline and security-safe.
- Goal for this iteration: provide a realistic execution plan, risk analysis, and concrete milestones to unblock future implementation without hallucinating unavailable assets.

## Incremental Delivery Plan (200-round evolution compressed into actionable phases)
1. **Foundations (Rounds 1–10)**
   - Stand up IntelGraph schema ingestion pipeline fed by YAML taxonomy samples.
   - Add unit tests for YAML parsing → graph node/edge emission with schema validation.
   - Instrument runtime leak-detection hooks (heap sampling, open-handle audit) in dev harness.
2. **Curriculum Agents (Rounds 11–60)**
   - Introduce dual-agent executor roles (navigator + solver) with pluggable LLM backends; start with mocked adapters before real Qwen3-8B.
   - Implement self-verification loop (plan → act → reflect) with rollback on failed assertions.
   - Track PR velocity metrics (time-to-green, auto-merge rate) via CI metadata collectors.
3. **Graph Performance & Backpressure (Rounds 61–120)**
   - Stress-test IntelGraph ingestion with synthetic taxonomies; add backpressure controls (queue depth caps, circuit breakers) and per-stage latency SLOs.
   - Optimize graph accuracy through schema-aware prompts and deterministic validation gates.
   - Capture Leak-Free Runtime metric via soak tests and regression alerts.
4. **Vision Automation (Rounds 121–170)**
   - Integrate Fara-7B vision adapter behind a feature flag; start with screenshot-to-action mocks for GitHub UI flows.
   - Validate screen-based flows in headless CI with recorded sessions; gate by safety sandbox checks.
5. **Full CLI→PR Pipeline (Rounds 171–200)**
   - Deliver `fara-cli --task "EvolveSummitAgent0" --intelgraph --max_gains 35%` runner wiring planner, executor, and verifier into a single command.
   - Enable auto-PR on convergence with branch hygiene checks, diff linting, and human-in-the-loop override.

## Benchmarks and Success Criteria
- **Summit12 Targets:** ≥30% improvement vs Agent0 baseline on composite score; Leak-Free Runtime ≥99%; Graph Accuracy ≥90% on gold YAML corpora.
- **PR Velocity:** ≥95% auto-merge eligibility measured by lint/test pass rates and diff risk scoring.
- **Safety:** zero writes to production services; all automation confined to ephemeral CI sandboxes.

## Risks and Mitigations
- **Model availability:** Use mock/backfill adapters until licensed Qwen3-8B and Fara-7B weights are provisioned; keep interfaces inversion-friendly.
- **Resource constraints:** Add configurable rate limits and memory caps; prioritize streaming decoding with backpressure-aware queues.
- **Evaluation drift:** Lock benchmark suites and YAML fixtures; automate nightly regressions with alert thresholds.
- **Security/compliance:** No secret material in configs; enforce signed container images and SBOM checks before enabling automation.

## Next Actions
- Add IntelGraph YAML ingestion module skeleton with contract tests.
- Define LLM adapter interface (mocked) for dual-agent curriculum loop.
- Stand up CI job to collect PR velocity metrics and emit leak/backpressure dashboards.
- Prepare vision-automation harness with feature flags and sandbox safeguards.
