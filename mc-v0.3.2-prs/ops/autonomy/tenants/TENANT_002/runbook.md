# TENANT_002 Tier-3 Autonomy Runbook

## Overview
This runbook enables Tier-3 scoped autonomy for TENANT_002 with computed aggregations scope.

## Prerequisites
- `MC_APPROVAL_TOKEN` environment variable set
- TENANT_002 baseline health >99.4% for 14 days
- No active P1 incidents affecting TENANT_002

## Quick Execution
```bash
export MC_APPROVAL_TOKEN=$(op read op://secrets/mc/approvalToken)
bash ops/autonomy/scripts/enable-tier3.sh TENANT_002
```

## Success Criteria
- Simulation success rate ≥99.9%
- Compensation rate ≤0.5%
- Zero privacy/residency violations
- No SLO regression >1%

## Monitoring
- Autonomy success rate: `/metrics/autonomy/success_rate`
- Compensation events: `/metrics/autonomy/compensation_events`
- HITL overrides: `/metrics/autonomy/hitl_overrides`

## Rollback Procedure
```bash
mc autonomy set --tenant TENANT_002 --tier T2 --immediate
mc autonomy compensate --tenant TENANT_002 --all-pending
```

## Evidence Artifacts
- `out/autonomy/TENANT_002/TENANT_002-sim.json` - Simulation results
- `out/autonomy/TENANT_002/TENANT_002-enact.json` - Enactment evidence
- `out/autonomy/TENANT_002/TENANT_002-status.txt` - Status summary
