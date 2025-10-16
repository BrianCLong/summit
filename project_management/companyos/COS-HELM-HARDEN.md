# COS-HELM-HARDEN — Charts, Limits, Secrets

## Goal
Deliver production-grade Helm charts with resource governance, security hardening, and externalized secrets to support reliable CompanyOS deployments.

## Key Outcomes
- Helm charts enforce requests/limits, probes, PodDisruptionBudgets, and security contexts.
- Workloads run as non-root with seccomp profiles, fsGroup, and image digests pinned.
- Autoscaling (HPA/VPA), anti-affinity, and External Secrets integrated for each service.
- Compliance validations (helm lint, CIS, pod-security admission) and chaos drills passed.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Helm Charts | Templated manifests for services with values-driven configuration.
| External Secrets | Syncs secrets from secret manager into Kubernetes secrets.
| Autoscalers (HPA/VPA) | Manage scaling behavior within defined bounds.
| Security Policies | PodSecurity + seccomp profiles enforced per namespace.
| Chaos Testing Harness | Validates resilience under pod/node disruptions.

## Implementation Plan
### Phase 0 — Baseline Assessment (Week 1)
- Audit existing Helm charts for gaps in security, scaling, and resource settings.
- Align with SRE/Security on target CIS benchmarks and pod security standards.

### Phase 1 — Resource & Health Hardening (Weeks 1-2)
- Define CPU/memory requests & limits per workload using performance baselines.
- Add liveness/readiness/startup probes; configure PodDisruptionBudgets and topology spread.
- Implement anti-affinity to distribute replicas across zones/nodes.

### Phase 2 — Security Contexts & Secrets (Weeks 2-3)
- Set `runAsNonRoot`, `runAsUser`, `fsGroup`, `seccompProfile` defaults; disallow privilege escalation.
- Pin container image digests and enforce registry scanning gates.
- Integrate External Secrets references replacing inline Kubernetes secrets.

### Phase 3 — Autoscaling & Resilience (Week 3)
- Configure HPA (CPU/RPS-based) and VPA (recommendation mode) with guardrails.
- Add PDB-aware chaos experiments (pod kill/node drain) ensuring error budget compliance.
- Document scaling guidance and fallback procedures.

### Phase 4 — Validation & Compliance (Week 4)
- Run `helm lint`, CIS benchmark (`kube-bench`), and pod-security admission tests.
- Execute chaos drill and capture metrics demonstrating error budget adherence.
- Publish hardening checklist and update platform documentation.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| Chart audit | Platform Eng | 3d | None |
| Resource tuning | Platform Eng + SRE | 4d | Chart audit |
| Probes & PDBs | Platform Eng | 3d | Resource tuning |
| Security contexts | Platform Eng + Security | 4d | Probes |
| External Secrets integration | Platform Eng | 3d | Security contexts |
| Autoscaling config | Platform Eng + SRE | 4d | Secrets integration |
| Chaos testing | Platform Eng + SRE | 3d | Autoscaling |
| Compliance checks & docs | Platform Eng | 3d | Chaos testing |

## Testing Strategy
- **Static**: `helm lint`, schema validation, image digest enforcement tests.
- **Security**: PodSecurity admission tests, CIS benchmark runs, vulnerability scan enforcement.
- **Resilience**: Chaos experiments (pod kill, node drain) verifying error budgets maintained.
- **Performance**: Load tests to confirm resource requests/limits sustain target throughput.

## Observability & Operations
- Metrics: `autoscaler_recommendations`, `pod_disruption_budget_violations`, `chaos_test_failures_total`.
- Dashboards: Resource utilization vs limits, autoscaler actions, chaos outcomes.
- Alerts: HPA thrash detection, External Secrets sync failures, pod security violations.

## Security & Compliance
- Enforce image signature verification (Cosign) with admission controller.
- Rotate External Secrets credentials and audit access logs.
- Document compliance evidence for security review.

## Documentation & Enablement
- Update platform deployment guide with new Helm values and defaults.
- Provide cookbook for scaling adjustments and chaos drill procedures.
- Train App Eng teams on adopting hardened chart patterns.

## Operational Readiness Checklist
- [ ] Helm charts pass linting and schema validation.
- [ ] CIS and pod-security checks produce compliant reports stored in evidence repository.
- [ ] Chaos drill completed with error budget impact ≤ defined threshold.
- [ ] Documentation updated and reviewed by Security & SRE leads.

## Dependencies
- None beyond cluster tooling; External Secrets controller available.

## Risks & Mitigations
- **HPA thrash**: Implement scaling stabilization windows and disable scale-to-zero off-peak.
- **Misconfigured limits**: Run performance profiling before production rollout.

## Acceptance Criteria
- helm lint runs clean with zero warnings.
- CIS and pod-security admission checks pass for all workloads.
- Chaos kill tests stay within error budget and validate rollback paths.
- No plaintext secrets remain in chart values; all use External Secrets references.
