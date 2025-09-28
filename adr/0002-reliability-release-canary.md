# 0002-reliability-release-canary

## Status

Accepted

## Context

Reliability regressions during releases have increased change-fail rates and exhausted the
error budget in multiple environments. Existing rollouts lack formal promotion criteria,
signed-manifest enforcement, or synthetic validation, so rollbacks require human judgment and
arrive too late to protect SLOs. The program charter for "Reliability & Release — Canary
Manager, Synthetic Probes, Auto-Rollback" requires a six-week MVP that coordinates canary
traffic shifting, continuous verification, and policy-based rollback while aligning with the
portfolio rhythm (weekly evidence, ADRs, dashboards) and security guardrails (cosign +
admission policies).

## Decision

- Standardize on Argo Rollouts with metric analysis templates for progressive delivery,
  including composite indicators from Prometheus and synthetic probe scores. Promotion criteria
  are codified in `rollouts.yaml` and reference the Maestro API error-budget policy for each
  target environment.
- Deliver canary-specific synthetic probes stored in `synthetics/` that execute
  signed HTTP flow definitions and publish SLO-aligned availability/latency SLIs. Probe uptime
  is tracked via the new Grafana dashboards and Alertmanager routes.
- Implement an auto-rollback engine by extending the adaptive canary controller to react to
  metric/SLO burn alerts, feature-flag feedback, and chaos-lite experiments. Rollback decisions
  are emitted to CI/CD through webhooks and recorded for evidence.
- Enforce signed manifests through new cosign verification in CI workflows and an OPA/Kyverno
  admission policy (`controllers/admission/`) that rejects unsigned container images and
  unsigned rollout manifests.
- Capture operations guidance in a canary rollout playbook and incident runbook under
  `docs/ops/` and `docs-site/runbooks/`, ensuring rituals (Mon stand-up, Wed ADR review, Fri
  evidence) are referenced and evidence attachments land in `.evidence/` with links from
  `.prbodies/` entries.

## Consequences

- Releases gain deterministic promotion/rollback behavior with median rollback time under
  five minutes and synthetic coverage for hidden dependencies, reducing false aborts by using
  multiple indicators.
- Signed manifest enforcement increases deployment security and creates auditable provenance
  proof both in CI and the cluster.
- Engineering teams adopt consistent dashboards, alert routing, and documentation patterns that
  streamline design reviews and Friday evidence reviews.
- Additional automation complexity requires ongoing maintenance and integration testing, but
  documentation plus evidence artifacts lower onboarding cost and keep guardrails visible.
