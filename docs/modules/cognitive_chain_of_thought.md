### Context

Source: `docs/modules/ETHICS.md`, `docs/modules/prompt_injection_guardrails.md`
Excerpt/why: Ethical guardrails require the system to recognize persuasion attempts and malicious narratives, yet current flows lack structured reasoning for nuanced social inputs. An explicit chain-of-thought protocol is needed to interpret norms and intent before allowing sensitive actions.

### Problem / Goal

Current conversational and workflow agents misinterpret ambiguous social cues, making it difficult to differentiate legitimate collaboration from disallowed influence attempts. Without situational awareness, reviewers must manually triage borderline cases, slowing response times and risking policy violations. The goal is to implement a Cognitive Chain-of-Thought (CoCoT) prompting framework that grounds agents in social context, improves intent disambiguation by 8% on benchmark suites, and enforces alignment, ethics, and safety requirements in production.

### Proposed Approach

- Design a multi-stage prompting template that explicitly captures actors, relationships, norms, and situational stakes prior to task execution.
- Introduce perception passes (scene setting, norm cataloging, risk scan) that mirror human contextual reasoning before generating actions or responses.
- Encode policy guardrails and redlines as structured checks between reasoning stages to halt or escalate when intent appears unsafe.
- Calibrate the CoCoT pipeline against social reasoning benchmarks and internal transcripts to reach ≥8% disambiguation gains.
- Integrate telemetry hooks to log stage-by-stage rationales for auditability and continuous alignment reviews.
- Provide implementation guidelines so downstream teams can adopt CoCoT templates in orchestration flows and safety reviews.

### Tasks

- [ ] Draft the multi-stage CoCoT prompt template covering perception, context, risk, and action recommendations.
- [ ] Map existing ethics/prompt guardrail policies into structured decision checkpoints for the template.
- [ ] Build evaluation harnesses using social reasoning datasets to quantify intent disambiguation improvements.
- [ ] Implement telemetry schemas capturing intermediate CoCoT reasoning outputs for audits.
- [ ] Pilot CoCoT within high-risk conversational workflows and collect qualitative reviewer feedback.
- [ ] Document integration steps for teams embedding CoCoT into automated review pipelines.

### Acceptance Criteria

- Given ambiguous social requests, CoCoT achieves ≥8% higher intent disambiguation accuracy over baseline prompting on benchmark evaluations.
- Safety checks block or escalate scenarios that violate persuasion or targeting policies without regressing allowed workflows.
- Telemetry dashboards expose stage-level reasoning artifacts for compliance reviews.
- Metrics/SLO: False negative rate on restricted intents < 2%; CoCoT stage latency ≤ 400 ms at p95.
- Tests: Automated evaluation harness with reproducible benchmark runs and regression thresholds.
- Observability: Structured logs for each CoCoT stage with correlation IDs for traceability.

### Safety & Policy

- Action class: READ/ANALYZE with gated WRITE authority upon passing policy checks.
- OPA rule(s) evaluated: Ethics gating, prompt injection guardrails, influence prevention policies.

### Dependencies

- Depends on: Alignment policy refresh, telemetry schema updates.
- Blocks: Deployment of autonomous review assistants handling high-risk social workflows.

### DOR / DOD

- DOR: CoCoT prompt template and policy checkpoints approved by ethics and safety reviewers.
- DOD: Template integrated into production workflows, benchmarks + telemetry dashboards operational, alignment review sign-off complete.

### Links

- Code: `<path/to/cocot/prompt_pipeline>`
- Docs: `<link/to/cocot/design_doc>`
