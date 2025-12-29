# Two-Quarter Master Roadmap: Agent Safety, Control, and Commercialization

## Purpose and Scope
- Deliver a unified control plane with strong safety, compliance, and commercialization guardrails for all autonomous and semi-autonomous agents.
- Sequence Epics 1–9 into a two-quarter plan that balances foundational controls, defense-in-depth, human accountability, and enterprise readiness.
- Target outcomes: provable enforcement for all tool use, minimized blast radius for agent actions, measurable reduction in policy violations and exfil attempts, and customer-ready governance/ROI narratives.

## Guiding Principles
- **Safety first, autonomy second:** every action gated by policy, approvals, and auditability.
- **Default deny with break-glass:** narrow allowlists, controlled exemptions, time-bound credentials, and explicit blast-radius warnings.
- **Provable enforcement:** policy-as-code (OPA/ABAC) evaluated at tool-call time with tamper-evident logs and trace IDs.
- **Human-in-the-loop by design:** approvals, previews, diffs, and rollbacks precede writes; simulation/dry-run modes everywhere.
- **Tenant isolation and least privilege:** per-tenant sandboxes, scoped data views, and kill switches per agent/tool.
- **Measurable outcomes:** block/allow rates, exfil detection, false positives, rollback MTTR, ROI and usage caps per tier.

## Quarter 1 (Weeks 1–12): Foundation, Control Plane, and Safety Nets
### Workstream A — Agent Control Plane & Policy Engine (Epics 1, 6, 8)
- Deliver role definitions (user copilot, support copilot, ops agent) with RBAC/ABAC capabilities and environment-aware scopes.
- Stand up tool registry with per-tool scopes (read/write, domain, env), rate limits, and ownership metadata; add kill switches and deprecation paths.
- Implement policy-as-code evaluation at tool-call time with context constraints, approval-required rules for high-blast actions, and idempotency keys for writes.
- Add per-tenant/per-user quotas and simulation mode (no-commit) for all write-capable tools.
- Ship safe tooling library v1: typed inputs/outputs, validation, dry-run flag, redaction layer, mocked tools for tests.

### Workstream B — Secure Sandbox Runtime (Epic 2)
- Launch sandboxed execution with strict network egress, filesystem isolation, resource caps, and short-lived credentials.
- Enforce command allowlists, block arbitrary shells by default, and integrate automated secrets scanning on inputs/outputs.
- Produce sandbox attestation reports and tamper-evident logs; add per-agent/per-tool kill switches and chaos tests for escape attempts.

### Workstream C — Prompt Injection & Data Exfil Defense (Epic 3)
- Threat-model agent entry points; add content sanitization, hidden-instruction stripping, and retrieval filtering by sensitivity.
- Enforce least-knowledge prompts, outbound response filters, and jailbreak/instruction-hijack detectors with canary tokens in sensitive stores.
- Add user-visible provenance/citations for externally influenced outputs.

### Workstream D — Eval Harness & Red Team (Epic 4)
- Build privacy-safe eval datasets from real workflows; define success metrics (completion, errors, policy violations, exfil blocks).
- Add regression tests for prompts/tools/policies to CI, including scenario-based adversarial cases and red-team jailbreak suite.
- Version prompts, tools, policies, and eval datasets; wire drift monitoring and alerting for behavioral change.

### Workstream E — Human-in-the-Loop Foundations (Epic 5)
- Require preview/diff/confirmation for writes with blast-radius warnings; approvals queue with role separation and timeouts.
- Add rollback/undo mechanics for agent changes plus rationale/evidence view and immutable approval/audit records.
- Provide safe mode (suggest-only) and auto-escalation on low confidence.

### Workstream F — Observability Baseline (Epic 7)
- Standardize trace IDs across agent decisions/tool calls; capture structured logs (inputs, retrieved sources, policy decisions, outputs).
- Build dashboards for success/retries/failures by tool/domain/tenant, plus alerts on abnormal behavior and policy violations.
- Add per-tenant activity views and cost tracking (tokens, tool calls, latency) with incident timeline reconstruction.

### Workstream G — Commercialization Foundations (Epic 9)
- Define agent tiers (suggest-only, execute-with-approval, autonomous-rare) and enterprise controls (disable agents, restrict tools, export logs).
- Launch AI transparency docs and agent audit exports; add usage metering/billing with caps and ROI reporting.

### Milestones & Exit Criteria (Q1)
- **Week 4:** Tool registry + RBAC/ABAC roles live; sandbox MVP with network egress controls; eval datasets seeded; dashboards v0.
- **Week 8:** Policy-as-code enforced for all tool calls; approval-required high-blast actions; safe tooling v1 shipped; injection/exfil filters active; human preview/diff flow live.
- **Week 12:** Per-tenant quotas + simulation mode; tamper-evident sandbox logs; red-team suite in CI; cost tracking; commercialization tier controls; incident workflow documented.

## Quarter 2 (Weeks 13–24): Hardening, Scale, and Enterprise Readiness
### Workstream A — Control Plane Hardening & Policy Ops (Epics 1, 6, 8)
- Add exceptions registry with expirations, policy simulation for admins, and dashboards for allow/deny/drift.
- Expand safe tooling library with rate-limited bulk tools, batching, and approvals; break-glass tool with expiring access and deep logging.
- Centralize “if admin then…” checks into the policy engine; quarterly policy review/pruning with linting/tests in CI.

### Workstream B — Sandbox Resilience & Data Safety (Epic 2)
- Tighten isolation per tenant/task; add deterministic CPU/mem/time caps with auto-kill; widen chaos testing for escape attempts.
- Deliver scoped data views/redaction defaults, automated secrets scanning SLAs, and refreshed attestations for audits.

### Workstream C — Advanced Prompt Defense & Exfil Monitoring (Epic 3)
- Improve detectors for jailbreaks/instruction hijacks with adaptive models; expand canary coverage and outbound leak filters.
- Add user-visible disclosure banners when external content influences decisions; measure blocked attempts, false positives, time-to-contain.

### Workstream D — Eval & Release Safety (Epic 4)
- Canary rollouts with instant rollback; drift monitoring alerts wired to policy engine; monthly eval scorecard with failures/fixes.
- Block releases that regress safety metrics; add human review sampling for low-confidence outputs.

### Workstream E — Human-in-the-Loop Maturity (Epic 5)
- Enhance approval queues with SLA-based escalation, override tracking/root-cause tagging, and safe-mode defaults for new tools.
- Add richer rationale/evidence views and improved rollback UX; retire manual runbooks in favor of HITL flows.

### Workstream F — Observability & Cost Governance (Epic 7)
- Mature dashboards with per-tenant/feature cost attribution, anomaly detection for loops/spikes, and “time-to-innocence” tracking.
- Add replay capability for debugging with masked inputs; monthly “agent debt” purge to remove unused tools/prompts/policies.

### Workstream G — Commercialization & Trust (Epic 9)
- Harden enterprise controls (restrict tools per tenant, export logs at scale), finalize ROI reporting, and pilot programs with strict guardrails.
- Publish compliant messaging, incident policy, onboarding checklist, and “Agent Safety Releases” alongside features.

### Milestones & Exit Criteria (Q2)
- **Week 16:** Policy simulation + exceptions registry live; break-glass tooling shipped; sandbox caps/enforced; enhanced jailbreak detectors; canary rollouts enabled.
- **Week 20:** Drift alerts + replay debugging; advanced approval workflows with SLA escalations; scoped data views with redaction defaults; commercialization pilots running.
- **Week 24:** Release blocks on safety regressions; monthly eval scorecard cadence; ROI + audit exports available; unused tool/prompt/policy purge completed.

## Cross-Cutting Success Metrics (Tracked Weekly)
- Policy violations blocked; approved vs. denied tool calls; high-blast approvals vs. auto-denies.
- Exfil/jailbreak detection rate, false positives, time-to-contain, and canary trip counts.
- Sandbox escape test pass rate and mean time to kill runaway executions.
- Human approval SLAs, override rates, rollback MTTR, and incident timelines.
- Cost per agent feature (tokens/tool calls) and quota adherence; ROI (hours saved, tickets deflected).
- Adoption: tenants on control plane, % tools with owners/deprecation dates, % traffic in simulation vs. execute.

## Risks & Mitigations
- **False positives blocking work:** start with suggest/preview modes, add exception registry with expirations, tune detectors with red-team feedback.
- **Performance overhead from policy/sandbox layers:** cache policy decisions where safe, batch evaluations, and measure latency budgets in dashboards.
- **Tool/owner gaps:** enforce ownership metadata in registry, kill switches for orphaned tools, monthly debt purge.
- **Compliance drift:** version policies/prompts/tools, enforce CI linting/tests, and maintain audit exports plus attestations.

## Forward-Leaning Enhancements
- Integrate formal verification for high-risk policies (e.g., OPA+Rego model checking) to prove invariants for write actions.
- Add differential privacy for sensitive telemetry and response filters to further reduce leakage risk.
- Explore adaptive risk scoring per request to dynamically switch between simulate/suggest/execute with approval.
