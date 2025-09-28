# Canary Rollout Playbook

## Purpose

Provide the paved-road operating procedure for the Reliability & Release MVP combining Argo
Rollouts, synthetic probes, and the adaptive controller. The playbook binds to the portfolio
rhythm (Mon stand-up, Wed ADR review, Fri evidence) and ensures security guardrails remain
active through signed manifest enforcement.

## Roles

- **Release Captain** – Owns Monday stand-up updates, verifies signed manifests, triggers
  rollout via `rollouts.yaml` template.
- **SRE Oncall** – Monitors Grafana dashboards (`dashboard/grafana/`), receives Alertmanager
  notifications, and coordinates rollback drills.
- **Quality Analyst** – Maintains synthetic probe definitions in `synthetics/`, validates
  HTTP flows against staging, and checks false-abort rate evidence every Friday.

## Pre-flight Checklist (Definition of Ready)

1. Promotion criteria validated in ADR `0002` and mirrored in `rollouts.yaml` annotations.
2. Error-budget policy for target environment (<10% burn) acknowledged in Monday stand-up notes.
3. Synthetic probe suite signed and synced; probe uptime meets 99.9% trailing 7d.
4. Cosign verification green in CI and admission policy preflighted in staging cluster.

## Execution Steps

1. **Kickoff (T-60m)**
   - Confirm Argo Rollout manifest is signed (`cosign verify-blob rollouts.yaml.sig`).
   - Run `syntheticsctl validate synthetics/maestro-api-canary.yaml`.
   - Review Grafana _Canary Release Overview_ dashboard for baseline metrics.
2. **Start Canary (T-0)**
   - Apply rollout: `kubectl apply -f rollouts.yaml`.
   - Enable adaptive feature flag traffic using controller CLI (`adaptive-canary.py --feature-step`).
   - Monitor Alertmanager silence state for planned maintenance window.
3. **Bake & Observe (T+0 → T+30m)**
   - Track composite score, synthetic availability, and error-budget burn thresholds.
   - Trigger chaos-lite experiment via synthetic `rollback-chaos-lite` flow.
   - If synthetic score <0.95 for 2 consecutive intervals, prepare rollback script.
4. **Promotion Decision (T+30m)**
   - Controller emits promote/rollback webhook captured in CI logs.
   - Release Captain confirms evidence (Grafana snapshot + webhook log) and posts to Friday review.
5. **Rollback Path (if triggered)**
   - Auto-rollback executed by controller. Median rollback target <5 minutes measured via
     `maestro_api_rollback_duration_seconds`.
   - Post-incident review executed using incident runbook and `.evidence/` entry.

## Definition of Done

- Canary passes synthetic + real metrics and enters stable channel with signed manifests.
- Auto-rollback executed or skipped per policy with evidence logs uploaded to `.evidence/`.
- Dashboard annotations updated, and `.prbodies/` entry linked for design + evidence reviews.

## References

- `rollouts.yaml`
- `synthetics/maestro-api-canary.yaml`
- `controllers/adaptive-canary.py`
- `alertmanager/canary-routes.yaml`
- Grafana dashboards under `dashboard/grafana/`
