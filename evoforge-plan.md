# EvoForge Implementation Plan (Guardrail-First, Delivery-Focused)

## Objective
Deliver a staged, human-in-the-loop EvoForge program that measurably accelerates Summit/IntelGraph development (PR assistance, taxonomy validation, CLI ergonomics) without autonomous or unsupervised deployment. Every increment must be reviewable, testable, auditable, and reversible.

## Guiding Constraints
- **Human-in-the-loop only:** No self-deploying or unsupervised agents; every action is traceable through standard review and CI.
- **Security first:** Reuse existing authz/authn pathways; avoid new networked services without explicit review and threat modeling.
- **Feature-flagged by default:** Experimental loops are off by default; ship with kill switches and timeouts.
- **Observability + governance:** Emit structured metrics (latency, failure modes, override counts) and apply redaction before persistence.
- **Incremental blast radius:** Ship the smallest viable slice, validated via tests and manual playbooks, before broadening scope.

## Phase 1: Discovery & Foundations (Days 1–5)
1. **Repository + surface inventory**
   - Catalog agent-adjacent packages and entry points: `ga-graphai/packages/*`, `packages/dpec/`, `services/authz-gateway`, and CLI surfaces under `tools/`.
   - Capture shared schemas/types (e.g., request/response envelopes, policy hooks) to define stable integration seams.
2. **Guardrail validation**
   - Trace current enforcement paths in `services/authz-gateway` and policy packages; document reusable hooks for allow/deny, rate limiting, and audit trails.
   - Define required configuration knobs (env vars + config files) for any experimental loop; default to "disabled" with safe fallbacks.
3. **Observability contract**
   - Specify metrics/log events: start/stop, decision source, redaction applied, error categories, latency buckets, and override counts.
   - Ensure no external network calls are necessary; if unavoidable, gate behind mocks for tests.
4. **Prototype selection**
   - Choose a bounded helper (e.g., schema-aware PR reviewer or CLI recommender) that runs locally, reads repo state, and produces deterministic outputs under tests.

**Deliverables (Phase 1)**
- Inventory doc of integration seams and guardrails.
- Config skeleton with disabled-by-default flags and kill switch.
- Observability event spec and redaction checklist.

## Phase 2: Controlled Prototype (Days 6–15)
1. **Implementation**
   - Build the prototype behind feature flags with dependency injection for model/tool providers; local-only execution, no outbound calls.
   - Add policy interceptors that enforce authz checks before any action and attach audit context to every decision.
2. **Testing & safety**
   - Unit + integration tests covering: flag gating, authz/policy enforcement, deterministic test fixtures, and redaction paths.
   - Add fault-injection tests (timeouts, malformed inputs) to prove kill-switch correctness.
3. **Developer ergonomics**
   - CLI surfaces expose `--dry-run`, `--audit`, `--max-steps`, and `--timeout-ms` to cap execution.
   - Provide sample prompts/playbooks and fixture data for local validation.
4. **Metrics + review loop**
   - Capture and review metrics weekly: success rate, average latency, override frequency, and deviation from expected diffs.
   - Require dual approval for enabling flags outside dev sandboxes.

**Deliverables (Phase 2)**
- Prototype merged behind flags with comprehensive tests and lint compliance.
- Operator guide with enable/disable instructions and expected telemetry.
- Weekly review notes capturing findings and safety outcomes.

## Phase 3: Measured Expansion (Days 16–45)
1. **Workflow wiring**
   - Chain small, time-bounded stages (ingest → reasoning → recommendation) using `ga-graphai` orchestrators with per-stage timeouts and retries.
   - Add circuit breakers for model/tool failures and enforce max token/tool call budgets per session.
2. **Data governance**
   - Inline redaction for PII-like fields before logging; add policy checks that block logging of secrets or access tokens.
   - Validate telemetry schemas via tests to prevent drift.
3. **Benchmarking**
   - Create a benchmark harness focused on PR velocity proxies: suggestion turnaround, lint autofix success, false-positive rate, and reviewer acceptance rate.
   - Track baselines and publish diffs per iteration.
4. **Rollout criteria**
   - Require: (a) ≥99% policy compliance in tests, (b) zero outbound network by default, (c) feature flag + kill switch present, (d) documented rollback steps.

**Deliverables (Phase 3)**
- Benchmark suite + published results vs. baseline.
- Hardened workflows with circuit breakers and budget caps.
- Runbook for safe enablement in pre-prod.

## Phase 4: Sustained Operations (Post-Day 45)
- **Continuous assurance:** Integrate guardrail tests into CI; block merges if kill switches, flags, or policy interceptors regress.
- **Telemetry SLOs:** Alert on elevated error/override rates and latency regressions; rotate keys/configs via existing secret management.
- **Change management:** All expansions require RFC + threat model; mandate rollback validation in staging before production trials.
- **Audit readiness:** Maintain immutable audit trails for agent actions, configs, and operator overrides.

## Risk Controls (applied throughout)
- Default-deny stance for execution; explicit allow lists for file paths, commands, and tool invocations.
- Strict sandboxing for code execution; no dynamic package installs in production paths.
- Red-team style fault tests (prompt fuzzing, malformed inputs, resource exhaustion) before expanding blast radius.

## Success Criteria
- Quantified productivity gains (e.g., reviewer acceptance rate + turnaround time) with maintained or improved policy compliance.
- Zero unsupervised actions; all agent behaviors are observable, reversible, and gated by human approval.
- Documented playbooks, tests, and rollback steps for every capability surfaced.
