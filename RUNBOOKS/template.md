# <Service> Incident Runbook

**Owners:** @team
**Pager:** <rotation>
**Dashboards:** <links>
**SLOs:** <links>

## Detect
- Alerts: <list>
- Golden signals to check first

## Mitigate
- Safe toggles / feature flags
- Rollback command: `gh workflow run Deploy-to-Prod --ref main -f image=<prev-sha>`

## Verify
- Smoke: `scripts/smoke.sh <url>`
- Error budget burn back to baseline

## Comms
- Incident channel: `#inc-<service>-<date>`
- Customer update template
