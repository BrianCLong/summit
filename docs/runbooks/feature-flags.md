# Feature Flags Runbook

## Purpose

Safe rollout, staged ramp, and rapid rollback for high-risk changes under feature flags.

## Staging to Production

1. **Define** flag in `flags/catalog.yaml` with owner, expiry, and kill_switch.
2. **Configure** per-environment rollout in `flags/targets/<env>.yaml`.
3. **Validate** locally: `python tools/flagctl/flagctl.py get feature.policy-guard --env dev`.
4. **CI** enforces metadata and policy via `.github/workflows/flags-ci.yml`.
5. **Deploy** ConfigMap using Helm; verify `flag_rollout_percent` metric on Grafana dashboard.

## Canary and Ramp Plan

- Start at 0% in prod. Promote 0→25→50→100 following canary approval gates.
- Use `flagctl set feature.policy-guard --env prod --value on --percent 25` to ramp.
- Observability: watch `flag_errors_total` and SLO dashboards. Halt ramp on anomalies.

## Kill-Switch Procedure

1. Confirm SLO breach or incident ticket reference.
2. Execute kill switch (<=2 minutes goal):
   ```bash
   python tools/flagctl/flagctl.py kill feature.policy-guard --env prod --reason "SLO breach"
   ```
   or apply the Helm KillSwitch Job with populated `flagKey`/`reason` ConfigMap.
3. Validate traffic recovery and error-rate normalization.
4. Capture audit evidence: `tools/flagctl/audit.log`, Grafana screenshot, trace IDs.
5. File post-incident review and back out residual rollout rules.

## Rollback Matrix

- **Web**: disable `feature.web.flag-hydration`; invalidate CDN cache if SSR layout affected.
- **Gateway**: kill `feature.policy-guard`; watch client latency.
- **Services**: set service-specific flags (e.g., `feature.build.bazel`, `feature.qos.override-api`) to 0%.
- **Background jobs**: pause canary auto-ramp triggers; ensure queues drain.

## Evidence Capture

- Attach audit log line, Grafana panel screenshot, and OTEL trace demonstrating recovery.
- Note actor, timestamp, reason, and related PR/incident IDs.

## Cleanup & Hygiene

- Nightly job (scheduled) should run `python tools/flagctl/validate_flags.py` and open cleanup PRs for expired flags.
- Delete dead code and remove catalog entries only after approval.
