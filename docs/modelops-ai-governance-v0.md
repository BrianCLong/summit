# ModelOps & AI Governance v0

This outline establishes lifecycle, governance, evaluation, and operational practices for models powering CompanyOS intelligence features (including co-pilots). It is optimized for predictability, observability, and fast rollback.

## 1. Model lifecycle

**Stages**

- **Experiment**: Rapid iterations; sandboxed compute; synthetic or de-identified data only.
- **Candidate**: Reproducible training run with fixed dataset snapshot and config; packaged artifact (image or model bundle); baseline offline eval complete.
- **Canary**: Deployed to <5% traffic or flagged tenants; feature flag + shadow mode supported; online metrics and safety guardrails active.
- **Production**: Default serving path; SLOs enforced; rollback target exists (previous prod version) with automated switch.
- **Deprecated**: Frozen for reference; no new traffic; scheduled removal with migration plan.

**Artifacts tracked**

- **Datasets**: Immutable snapshots with schema/version manifest and provenance (source, consent, retention).
- **Configs**: Training + inference params, feature flags, safety settings, prompts/templates.
- **Code**: Training pipelines, preprocessing, inference services, prompt builders.
- **Metrics**: Offline benchmarks (quality, robustness), online KPIs (latency, cost, safety triggers), infra metrics.
- **Evaluations**: Test sets, red-team results, bias/fairness audits, human review notes.

**Versioning & rollback**

- Semantic model versions: `major.minor.patch-build` (major = architecture change, minor = data/config change, patch = bug/safety fix).
- Every stage promotion creates an immutable release record (git tag + registry tag + dataset manifest checksum).
- Rollback policy: always keep N-1 production image and config live; toggles via feature flag/traffic switch in <15 minutes; downstream caches invalidated.

## 2. Governance & approval

**Promotion criteria**

- **Quality**: Offline metrics beat current prod by pre-set margins; zero-blocker regression tests; eval on long-tail and adversarial cases.
- **Safety**: Safety classifier and content filters meet thresholds; jailbreak/red-team suite pass rate ≥ target; PII leak tests clean; toxicity/bias limits met.
- **Bias/Fairness**: Demographically stratified metrics within tolerance; fairness report signed; mitigation plan for any gaps.
- **Reliability & Cost**: Latency and p99 within SLO; cost per 1k requests within budget; autoscaling and rate limits validated.

**Data policy**

- Training data requires documented source, license, consent, and retention plan; no unauthorized personal data.
- Inference data retention minimized; no unencrypted logging of sensitive fields; prompts/responses redacted and token-limited for storage.
- Vendors/foundational models must have DP/PII commitments and no training-on-requests unless explicitly approved.

**Approvals & documentation**

- Required sign-offs for production: Model owner, Product/UX lead (user impact), Security/Privacy, Responsible AI/Legal, SRE (operability).
- Docs to attach to release record: model card, evaluation report, data sheet, risk assessment, playbook/runbook, rollout plan with kill-switch.

## 3. Evaluation & monitoring

**Offline evaluation**

- Golden datasets with acceptance thresholds; periodic refresh with drift checks.
- Scenario-based tests: hallucination, refusal behavior, policy adherence, bias stress tests.
- Red-team automation with jailbreak suites and prompt-injection cases; summarize residual risks.

**Online monitoring**

- Quality: acceptance rate, assist rate, task success, user thumbs up/down ratio, override/correction rate.
- Safety: block rate, escalation rate to human review, PII leakage detector hits.
- Performance: latency p50/p95/p99, timeouts, error rates, saturation, token usage, cost per request.
- Drift: embedding/feature distribution drift vs. baseline; spike alerts on intent mix changes.
- Dashboards per stage (canary vs. production) with anomaly detection and pager duty.

**Feedback loops**

- In-product feedback (thumbs, freeform corrections) tied to model version and prompt variant.
- Human-in-the-loop review queue for flagged interactions; labels feed back into eval datasets.
- Weekly triage reviewing complaints, safety incidents, and override samples; prioritize patches or prompt updates.

**Regressions & rollback**

- Automated guardrails trigger traffic reduction/rollback when SLOs or safety thresholds breach.
- One-click revert to previous prod version with config sync; communicate to stakeholders and annotate incident ticket.
- Post-incident analysis updates tests/evals to prevent recurrence.

## 4. Example promotion flow (co-pilot model)

1. **Experiment → Candidate**: Run training pipeline with dataset snapshot; produce model bundle; run offline benchmarks + red-team; create model card draft.
2. **Candidate → Canary**: Security/Privacy review dataset; deploy behind feature flag to internal tenants; enable shadow mode; collect online metrics and user feedback for ≥48 hours.
3. **Canary → Production**: Compare canary vs. prod KPIs; SRE validates SLOs/capacity; Responsible AI signs fairness/safety; Product approves UX impact; publish release record with rollback target.
4. **Production → Deprecated**: Schedule migration to newer model; freeze configs; retain documentation and evals; remove traffic after migration.

## 5. Production-eligibility checklist

A model is production-eligible if:

- [ ] Versioned artifacts exist: code, dataset manifest, config, model image/bundle with checksums.
- [ ] Model card, data sheet, risk assessment, and runbook published and linked in release record.
- [ ] Offline quality beats prod baseline; red-team and bias evaluations meet thresholds.
- [ ] Safety systems enabled: content filters, PII detectors, rate limits, guardrail prompts/tests.
- [ ] Latency, reliability, and cost meet SLO/SLA in load tests; autoscaling configured.
- [ ] Observability wired: tracing, metrics, logs with redaction, dashboard + alerts per SLO.
- [ ] Rollback plan verified: previous version available; feature flag/traffic dial tested.
- [ ] Access controls set: secrets managed, roles/permissions configured, data retention/TTL set.
- [ ] Stakeholder approvals recorded: Product, Security/Privacy, Responsible AI/Legal, SRE, Model owner.
- [ ] Incident response and feedback loops ready: escalation paths, triage cadence, feedback ingestion tagged by model version.
