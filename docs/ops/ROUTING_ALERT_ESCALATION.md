# Routing Alert Escalation Mapping

## Purpose

Define ownership and escalation wiring for routing incidents (`component=routing`) so BGP/BYOIP reachability failures page the correct responders.

## Scope

- Alert source: Prometheus routing alerts in `monitoring/alert_rules.yml`
- Routing policy: `monitoring/alertmanager.yml` and `monitoring/alertmanager/sre-policy.yml`
- Incident runbook: `RUNBOOKS/bgp-route-withdrawal.md`

## Ownership

- Primary Team: `network-platform`
- Secondary Team: `platform`
- Escalation Authority: Incident Commander / Release Captain

## Required Environment Variables

- `PAGERDUTY_ROUTING_KEY_ROUTING`
  - PagerDuty integration key for the dedicated routing incident service.
  - Used by `monitoring/alertmanager.yml` receiver `routing-critical`.
- `PAGERDUTY_SERVICE_ID_ROUTING`
  - PagerDuty service id for routing in `monitoring/oncall-config.yml`.
- `SLACK_WEBHOOK_URL`
  - Shared webhook for `#alerts-routing` notifications.

## Routing Receiver Behavior

### Critical

- Match: `severity=critical`, `component=routing`
- Receiver: `routing-critical`
- Actions:
  - PagerDuty page (immediate)
  - Slack notification to `#alerts-routing`
- Repeat interval: 5-10 minutes depending on policy file

### Warning

- Match: `severity=warning`, `component=routing`
- Receiver: `routing-warning`
- Actions:
  - Slack notification to `#alerts-routing`
- Repeat interval: 15-60 minutes depending on policy file

## Verification

1. `yq e '.' monitoring/alertmanager.yml >/dev/null`
2. `yq e '.' monitoring/alertmanager/sre-policy.yml >/dev/null`
3. `bash monitoring/synthetic/validate-bgp-probe-matrix.sh`
4. `docker run --rm --entrypoint=/bin/promtool -v "$PWD/monitoring:/work" -w /work prom/prometheus:v2.47.0 check rules prometheus/rules/bgp-routing-resilience.yml`

## Governed Exception Rule

If routing alerts are intentionally suppressed for planned maintenance, create a time-bounded exception with owner, start/end times, and rollback trigger.
