# Automated Coding, Engineering, and Ops Agents — Frontier Synthesis (2026-01-14)

**Position:** The field is in a Gen 2 → Gen 3 transition. Execution evidence, governance, and security
are the differentiators, not raw model capability. This document asserts the present and dictates the
next state, aligned to the Summit Readiness Assertion and governance mandates.

## 0) Authority alignment (non-negotiable)

- **Summit Readiness Assertion** is the primary readiness baseline for this runbook’s posture.
- **Constitution + Meta-Governance** define the technical standards and Law of Consistency.
- **Agent Mandates + GA guardrails** define what autonomy is permitted and how it is verified.

This runbook inherits those authorities and constrains all execution to policy-as-code, evidence
bundles, and deterministic attestation.

## 1) Current frontier (research + production reality)

### A. Converged engineering loop

Most high-performing systems follow the same loop:
**(understand repo + localize) → (plan) → (edit) → (execute tests / tools) → (iterate) → (submit patch)**.
SWE-agent showed that _agent-computer interface_ (ACI) quality is a first-order driver of success,
not a secondary implementation detail.

- SWE-agent (ACI): <https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf>
- OpenHands (platformization): <https://arxiv.org/abs/2407.16741>

### B. Benchmarks: rising, then being questioned

SWE-bench and SWE-bench Verified established the baseline. A growing body of work now documents
benchmark illusions and overfitting, pushing the field toward more realistic, goal-oriented
evaluations (e.g., CodeClash).

- SWE-bench: <https://github.com/SWE-bench/SWE-bench>
- SWE-bench illusion critique: <https://arxiv.org/html/2506.12286v3>
- CodeClash (goal-oriented): <https://arxiv.org/abs/2511.00839>

### C. Executable training environments are the scaling lever

The primary constraint is executable, repo-realistic training data. SWE-Gym and SWE-smith aim to
scale training by packaging tasks with environments and tests. Agentless shows that disciplined
procedural decomposition can compete with more exotic architectures.

- SWE-Gym: <https://arxiv.org/html/2412.21139v1>
- SWE-smith: <https://arxiv.org/abs/2504.21798>
- Agentless: <https://arxiv.org/pdf/2407.01489>

### D. Ops agents follow the same loop

Ops agents map telemetry to action via: **(detect) → (triage) → (diagnose) → (remediate) → (verify)
→ (document)**. In practice, telemetry becomes “the repo.”

- AIOps survey: <https://arxiv.org/pdf/2507.12472>
- PagerDuty Generative AI: <https://www.pagerduty.com/platform/generative-ai/>

## 2) Patterns that consistently work

1. **Localization is the bottleneck.** Repo traversal + symbol grounding dominate success rates.
2. **Execution feedback is the discriminator.** Tests, linters, probes, and static checks decide truth.
3. **Interface design > prompt cleverness.** Predictable tools beat clever prompting.
4. **Multi-agent value = workflow decomposition.** Separate locator/reviewer/verifier roles.

## 3) Dominant failure modes

### A. Benchmark illusion risk

High scores can reflect learnable artifacts instead of real correctness. This is a governance and
reliability risk, not a cosmetic issue.

### B. Environment nondeterminism

Dependency drift and nondeterministic builds reduce reproducibility and raise operational risk.

### C. Tool/prompt injection + supply-chain compromise

Granting agents command execution makes security the product. Production deployment must assume
prompt injection, compromised tooling, and dependency drift as baseline threats.

- Industry incident reporting: <https://www.techradar.com/pro/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands>
- Agent UX market signal: <https://www.theverge.com/ai-artificial-intelligence/860730/anthropic-cowork-feature-ai-agents-claude-code>

## 4) Capability generations (by closed-loop authority)

- **Gen 0: Suggesters** — autocomplete/snippets.
- **Gen 1: Copilots** — explain/draft/refactor; user executes.
- **Gen 2: Tool-using agents** — edit, test, open PRs.
- **Gen 3: Change-control agents** — multi-step epics, multi-agent coordination, rollback.
- **Gen 4: Org-scale engineering+ops fabric** — governed autonomy across backlog, CI, security,
  incidents, and compliance evidence.

**Assertion:** The market is transitioning from Gen 2 → Gen 3. Systems quality (interfaces, evals,
governance, security, and operational economics) is the differentiator.

## 5) “Transcend it” design (beyond prevailing patterns)

### Principle 1: Evidence-first autonomy

A change is not done until it yields a reproducible evidence bundle: plan, diff, tests executed,
results, risk assessment, and provenance.

### Principle 2: Deterministic replay for gatekeeping

Split operation into:

- **Exploration mode** (model/tool freedom)
- **Attestation mode** (pinned inputs, cached outputs, stable environments)

### Principle 3: Dual-verifier architecture

Combine **execution-based verification** (tests/runtime probes) with **execution-free verification**
(static analysis, policy checks).

### Principle 4: Goal-oriented, multi-round optimization

Optimize a portfolio over time (reliability, cost, velocity, security), not a single ticket.

### Principle 5: Security model = human with sudo

Default to least privilege, sandboxed actions, explicit escalation gates, provenance enforcement,
and signed/pinned toolchains.

## 6) Reference architecture (coding + ops unified)

**Control Plane**

- Policy engine (allow/deny + escalation gates)
- Identity/permissions broker (per tool, per repo)
- Evidence ledger (append-only, content-addressed)

**Work Plane**

- Repo/telemetry indexers (code graph, docs, runbooks, dashboards)
- Specialist agents (Localizer, Planner, Implementer, Verifier, Reviewer, Release Captain,
  Incident Commander, RCA Analyst)
- Sandboxed executors (build/test runners, safe shell, infra APIs)

**Evaluation Plane**

- Continuous benchmark suite (public + internal + holdout)
- Drift detection (artifact-overfitting detection)
- Cost/perf telemetry (token cost, wall time, failure classes)

## 7) Summit-aligned priorities for generational advantage

1. **Internal evaluations that mirror actual work** (multi-round, goal-oriented, messy environments).
2. **Evidence + replay architecture** to scale autonomy safely.
3. **Security hardening for agent tooling** (IDE/CLI integrations).
4. **Ops-agent integration** so “fix in code” and “fix in prod” close the same loop.

## 8) Forward-leaning enhancement (state-of-the-art)

**Proposal:** Implement a _Policy-Gated Evidence Replay_ (PGER) layer that enforces deterministic
attestation for merges and incident remediations.

- **Inputs:** pinned model outputs, immutable tool transcripts, deterministic container images.
- **Gates:** policy-as-code checks, static analysis, and signed evidence bundles.
- **Outputs:** merge-ready evidence artifacts and rollback playbooks.

This advances Summit toward Gen 3 change-control agents with Gen 4 governance posture.

## 9) 23rd-order implication map (compressed, final)

1. **Authority-first execution**: every action is bounded by readiness, constitution, and policy-as-code.
2. **Evidence as a control surface**: evidence bundles become the operational contract, not prose.
3. **Determinism as merge currency**: replayable attestations gate merges and incident closeouts.
4. **Evaluation drift containment**: holdout suites prevent benchmark illusion in production KPIs.
5. **Telemetry = repo equivalence**: ops signals are treated as first-class code surfaces.
6. **Multi-agent decomposition**: control over specialization beats generalist autonomy.
7. **Prompt-injection resilience**: provenance controls become non-optional infrastructure.
8. **Supply-chain closure**: pinned tooling plus signed artifacts become baseline requirements.
9. **Cost governance**: token and wall-time budgets become production SLO inputs.
10. **Rollbacks as first-class artifacts**: rollback playbooks are part of the evidence bundle.
11. **Auditability by default**: immutable ledgers replace subjective approval narratives.
12. **Policy change control**: policy-as-code updates are validated as carefully as code changes.
13. **Human authority boundary**: human sign-off remains the final decision right.
14. **Escalation compression**: escalations are pre-encoded and eliminate latency.
15. **Operational continuity**: governance applies equally to build, deploy, and incident loops.
16. **Security parity with sudo**: agent privilege is treated as human-root equivalent.
17. **Reproducibility gating**: non-replayable actions are **Deferred pending deterministic replay**.
18. **Evidence quality threshold**: evidence bundles below standard are **Governed Exceptions**.
19. **Data-residency compliance**: model inputs and logs obey residency and retention constraints.
20. **Policy drift detection**: automated checks prevent divergence from authority files.
21. **Zero-trust integration**: identity and permission brokers mediate every tool call.
22. **Cross-surface coherence**: code, infra, and ops share identical authority definitions.
23. **Feedback-loop minimization**: short loops are structural, not optional.
24. **Production readiness invariant**: every commit remains deployable by default.

## 10) Runbook application (governed execution)

1. **Policy alignment gate**: confirm policy-as-code checks are defined for the target surface and
   escalation paths are documented.
2. **Localization gate**: record the top 3 candidate surfaces (files, services, dashboards) and
   the retrieval evidence used to select the primary target.
3. **Evidence-first execution**: capture plan, diff, test commands, and outputs in an evidence
   bundle.
4. **Dual-verifier gate**: run execution-based tests plus execution-free policy checks before
   attestation.
5. **Attestation gate**: produce deterministic replay artifacts for merge or incident closeout.

### Governed exceptions

Legacy or emergency bypasses are documented as **Governed Exceptions** with explicit scope, owner,
and expiration date. If a requirement cannot be expressed as policy-as-code, the implementation is
**Deferred pending policy codification**.

### Evidence & receipts (required artifacts)

- Plan + scope summary (with localization evidence)
- Diff + rationale
- Test commands + outputs
- Policy checks + outcomes
- Attestation metadata (inputs pinned, outputs cached)

## 11) Sources (primary)

- SWE-agent (ACI): <https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf>
- OpenHands: <https://arxiv.org/abs/2407.16741>
- SWE-bench: <https://github.com/SWE-bench/SWE-bench>
- SWE-bench illusion critique: <https://arxiv.org/html/2506.12286v3>
- CodeClash: <https://arxiv.org/abs/2511.00839>
- SWE-Gym: <https://arxiv.org/html/2412.21139v1>
- SWE-smith: <https://arxiv.org/abs/2504.21798>
- Agentless: <https://arxiv.org/pdf/2407.01489>
- AIOps survey: <https://arxiv.org/pdf/2507.12472>
- PagerDuty Generative AI: <https://www.pagerduty.com/platform/generative-ai/>
- The Verge (agent UX signal): <https://www.theverge.com/ai-artificial-intelligence/860730/anthropic-cowork-feature-ai-agents-claude-code>
- TechRadar (agent security incident): <https://www.techradar.com/pro/amazon-ai-coding-agent-hacked-to-inject-data-wiping-commands>
