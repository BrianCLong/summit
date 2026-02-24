# BGP Routing Resilience Monitoring Checklist

Use this checklist to validate routing-level resilience before production rollout and after any prefix-automation change.

## 1. Inventory & Baseline

- [ ] BYOIP prefix inventory is authoritative and versioned.
- [ ] `bgp_prefix_expected_total{prefix_class="byoip"}` is exported from inventory.
- [ ] `bgp_prefix_announced_total{prefix_class="byoip"}` is exported from route collectors.
- [ ] Prefix coverage SLO is set: warning `< 98%`, critical `< 95%`.

## 2. Global Routing Visibility Checks

- [ ] Route collector sources include at least 3 independent networks.
- [ ] Collector refresh interval is <= 60 seconds.
- [ ] Prefix coverage dashboard shows expected vs announced counts.
- [ ] Alert rules are active:
  - [ ] `ByoipPrefixCoverageDropWarning`
  - [ ] `ByoipPrefixCoverageDropCritical`

## 3. Multi-Region / Multi-ASN Synthetic Probes

- [ ] Blackbox probe job `blackbox-routing` is configured.
- [ ] Every probe has labels: `region`, `asn`, `provider`, `target`.
- [ ] Probe matrix includes at least:
  - [ ] 3 geographic regions
  - [ ] 2 cloud providers
  - [ ] 6 unique ASNs
- [ ] Probe success SLO is set: global `>= 99%`, region/ASN slice `>= 95%`.
- [ ] Alert rules are active:
  - [ ] `RoutingProbeGlobalReachabilityDrop`
  - [ ] `RoutingProbeAsnRegionFailure`
  - [ ] `ServiceHealthyButRoutingBroken`

## 4. BYOIP Failover Readiness

- [ ] Secondary provider advertisements are pre-provisioned and tested.
- [ ] Emergency advertisement path exists with explicit blast-radius limits.
- [ ] Failover activation and rollback commands are documented and rehearsed.
- [ ] RTO target is documented for primary-to-secondary route failover.

## 5. Prefix Automation Guardrails

- [ ] Canary policy enforces <= 5% prefix impact before promotion.
- [ ] Automatic rollback is enabled for coverage and reachability regressions.
- [ ] Destructive operations require two human approvals.
- [ ] Change window and freeze controls are enforced in CI/CD.
- [ ] All decisions and exceptions are logged as evidence artifacts.

## 6. Incident Readiness

- [ ] On-call has reviewed `RUNBOOKS/bgp-route-withdrawal.md`.
- [ ] Incident template includes "infra healthy, routes missing" decision branch.
- [ ] Gameday includes route-withdrawal scenario at least once per quarter.
- [ ] Post-incident review captures control-plane root cause and policy fixes.

## 7. Evidence Pack (Required)

- [ ] Alert snapshots
- [ ] Route collector screenshots or JSON output
- [ ] Probe matrix results by region and ASN
- [ ] Failover execution log (if triggered)
- [ ] Rollback proof for any automation issue
