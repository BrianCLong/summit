# LLM Provider Failover Playbook

**Primary Pager:** Applied ML SRE (L1)
**Escalation:** ML Platform (L2) → Vendor Management (L3)

## Alert Triggers
- `LLMBurnFast` warning in Prometheus/Alertmanager.
- `LLM Provider Latency p95` panel showing >2.5s for any provider.
- External vendor status pages reporting incident.

## Response Steps
1. **Identify impacted tenants** via query:
   ```bash
   kubectl logs deployment/llm-adapter -c app --since=10m | jq '.tenant' | sort -u
   ```
2. **Check canary**: if a canary rollout is active, halt in Argo Rollouts and consider rollback.
3. **Execute provider failover**
   - Determine secondary provider from configuration (`config/llm/providers.yaml`).
   - Run traffic shift:
     ```bash
     scripts/llm-provider-shift.sh --from anthropic --to openai --percent 100
     ```
   - Validate health: `curl https://status.summit.ai/llm` should return `200`.
4. **Update cost guardrails**: verify new provider budget headroom using cost dashboard panel.

## Communication
- Announce action in `#llm-incident` with ETA and percent of traffic shifted.
- Notify customer support for enterprise tenants >80% budget consumption.

## Rollback Criteria
- Primary provider recovers for 30 consecutive minutes with p95 latency <2s and error ratio <1%.
- SLO burn returns below slow-burn threshold for 2 hours.

## Post-Action
- Create GitHub issue (`llm-provider-recovery`) summarizing impact + time to mitigate.
- Attach canary report + Grafana snapshots.
- Update vendor incident tracker.
