# Runbook: BGP Route Withdrawal / BYOIP Reachability Loss

## Scope

Use this runbook when Summit services appear healthy internally but are unreachable externally because BYOIP prefixes are partially or fully withdrawn from global routing.

This runbook governs incidents similar to large-scale route withdrawal events where control-plane automation withdraws active prefixes.

## Authority

- Summit Readiness Assertion: `docs/SUMMIT_READINESS_ASSERTION.md`
- Governance baseline: `docs/governance/CONSTITUTION.md`
- Classification: route-withdrawal events are production incidents, not CDN-only degradations.

## MAESTRO Alignment

- MAESTRO Layers: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- Threats Considered: control-plane logic error, unsafe automation rollout, unintended route withdrawal, delayed route restoration, false service-health confidence.
- Mitigations: prefix canarying, automatic rollback, dual-approval for destructive route changes, global multi-ASN probing, failover origin policy, evidence-first incident handling.

## Trigger Signals

- `ByoipPrefixCoverageDropWarning` or `ByoipPrefixCoverageDropCritical` alert fires.
- `RoutingProbeGlobalReachabilityDrop` or `RoutingProbeAsnRegionFailure` alert fires.
- External reports indicate selective reachability loss while `up` and app-level health remain green.
- Internal metric mismatch indicates "service healthy, routes missing".

## Incident Severity Guide

- `SEV-1`: >= 10% BYOIP prefix withdrawal or >= 2 regions and >= 2 ASNs affected.
- `SEV-2`: < 10% BYOIP prefix withdrawal with user-visible impact in a single region/ASN class.
- `SEV-3`: transient routing instability without user-visible impact.

## Immediate Actions (0-15 minutes)

1. Declare incident and freeze all prefix automation.
2. Confirm internal service health (`/health`, database, queue, edge origin health).
3. Validate global routing visibility for impacted prefixes from at least 3 independent views.
4. Compare expected vs announced BYOIP prefix count.
5. Page network/platform incident commander and assign a dedicated failover operator.

## Diagnosis (15-30 minutes)

1. Determine blast radius by prefix, region, and ASN.
2. Identify whether withdrawals map to a recent config rollout or delete/update operation.
3. Verify route origin consistency against policy (primary origin ASN vs failover ASN).
4. Confirm that control-plane reconciler is not repeatedly re-withdrawing restored prefixes.

## BYOIP Failover Policy

### Policy Objective

Preserve external reachability when the primary advertisement path fails, even if primary infrastructure remains healthy.

### Failover Modes

1. `Mode A: Secondary Provider Activation`
- Advertise impacted prefixes from pre-approved secondary provider/origin.
- Apply same traffic policy baseline as primary (DDoS, ACLs, rate controls).
- Keep TTL and health checks unchanged during first 30 minutes.

2. `Mode B: Emergency Advertisement Path`
- Advertise emergency aggregate prefixes from designated emergency origin when per-prefix restore cannot converge quickly.
- Restrict emergency path to approved scope and time-box with expiry.
- Track as Governed Exception with explicit rollback trigger.

### Failover Entry Criteria

- Prefix coverage < 98% for 5 minutes, or
- Reachability < 90% across probe matrix for 3 minutes, or
- Incident commander declares anticipated prolonged primary-path impairment.

### Failover Exit Criteria

- Prefix coverage >= 99.5% sustained 30 minutes on primary path.
- Reachability >= 99% across all required region/ASN probes.
- Control-plane fix validated in canary and approved for full re-enable.

## Restoration

1. Roll back offending control-plane change.
2. Restore advertisements in controlled batches (canary prefixes first).
3. Verify each batch with global probe and route-collector confirmation before next batch.
4. Return traffic from failover path to primary path in staged percentages.

## Change Guardrails for Prefix Automation

1. Canary requirement
- All prefix automation changes must run on a canary set (<= 5% of prefixes) for at least 15 minutes.
- Promotion requires no prefix coverage regression and no reachability alert.

2. Automatic rollback
- Rollback triggers automatically when either condition is true:
  - BYOIP coverage drops below 99%.
  - Reachability drops below 95% in any two distinct region/ASN slices.

3. Manual approval gates
- Destructive operations (withdraw/delete/update of advertised prefixes) require two human approvals:
  - Network DRI
  - Incident commander or release captain
- No self-approval by automation agents.

4. Protected execution window
- Prefix automation changes only during approved network change windows.
- Freeze windows enforced during active incidents and major releases.

## Verification Checklist

- BYOIP advertised prefix count matches expected inventory.
- Multi-region multi-ASN probes are green.
- No active route-withdrawal alerts for 30 minutes.
- Failover path deactivated or formally retained as Governed Exception.
- Incident timeline, decision log, and rollback proof attached.

## Evidence Artifacts

- Incident timeline and decisions: `artifacts/network-routing/incidents/<incident-id>/`
- Probe outputs and alert snapshots: `artifacts/network-routing/probes/<incident-id>/`
- Automation change evidence: `artifacts/network-routing/changes/<change-id>/`

## Escalation

- Escalate to executive incident bridge if `SEV-1` persists beyond 30 minutes.
- Escalate to governance review if any guardrail was bypassed.
- Close incident only after post-incident actions are assigned with owners and due dates.
