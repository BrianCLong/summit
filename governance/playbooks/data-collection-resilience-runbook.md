# Data Collection Resilience Runbook

Use this runbook for API contract drift, archive coverage loss, and scrape-policy/legal stop events.

## MAESTRO Mapping

- MAESTRO Layers: Foundation, Data, Agents, Tools, Infra, Observability, Security
- Threats Considered: API deprecations, archive access denial, legal escalation, tool/provider concentration
- Mitigations: policy preflight, dual evidence capture, canary probes, provider failover, rollback gates

## Trigger Conditions

1. API drift incident:
   - Critical endpoint canary returns 4xx/5xx for 2 consecutive probes.
2. Archive coverage incident:
   - Priority-domain completeness drops below 95% for 24h.
3. Legal stop-the-line incident:
   - New C&D, injunction, or emergency legal hold affecting collection pipelines.
4. Provider concentration incident:
   - Contested-source provider share exceeds 40%.

## Required Inputs

- Failing endpoint IDs and timestamps
- Domain-level capture completeness report
- Policy decision log slice (`allow`, `deny`, `quarantine`)
- Provider concentration snapshot (7-day window)
- Active exception list with owners and expiry

## Immediate Response

1. API drift:
   - Block deprecated method routes.
   - Route traffic to supported API path.
   - Confirm canaries return green for 30 minutes.
2. Archive coverage:
   - Enable dual-source capture for affected priority domains.
   - Mark records with `capture_status=blocked|missing|partial`.
   - Notify consumers that timeline confidence is degraded.
3. Legal stop:
   - Freeze contested-source jobs.
   - Quarantine new artifacts from blocked sources.
   - Require legal sign-off before reopening.
4. Provider concentration:
   - Shift traffic using provider failover policy.
   - Cap contested-source traffic on primary intermediary.

## Decision Rules

- No bypass:
  - Do not override policy checks without an approved exception record.
- Evidence first:
  - Do not release records missing required evidence fields.
- Reversibility:
  - Every mitigation change must have explicit rollback steps and trigger.

## Evidence Requirements

Every incident response bundle must include:

- Decision rationale
- Confidence score (0.0-1.0)
- Rollback trigger and rollback steps
- Accountability window (7/14/30 days)
- Metrics tracked during accountability window

## Rollback Triggers

1. API rollback:
   - Route remap increases error rate by >2% for 15 minutes.
2. Archive rollback:
   - Dual-source mode causes ingestion lag >60 minutes.
3. Legal rollback:
   - Legal approval withdrawn or new restriction issued.
4. Provider rollback:
   - Failover provider error rate exceeds primary by 1.5x over 30 minutes.

## Verification Checklist

- [ ] Policy checks pass (`opa test governance/policies governance/tests -v`)
- [ ] Canary failures cleared
- [ ] Priority archive completeness >= 97% for 24h
- [ ] Contested-source provider share <= 40%
- [ ] Tradeoff ledger entry recorded (if cost/risk/velocity changed)
- [ ] ADR created for material policy or architecture changes

## Escalation

1. Level 1: On-call owner remediates with runbook.
2. Level 2: Security/governance countersign for exceptions or legal stops.
3. Level 3: Release captain decision for sustained incident (>24h).
