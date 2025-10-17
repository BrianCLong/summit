# Developer Journey Maps

## Personas
1. **Feature Developer** – ships product features, interacts with pipelines, observability, and policy guardrails.
2. **Platform Engineer** – curates golden paths, manages environments, tunes orchestration guardrails.
3. **Site Reliability Engineer (SRE)** – oversees incidents, self-healing workflows, and release readiness.

## Journey Highlights
### Feature Developer
1. Discover service template in portal golden paths catalogue.
2. Initialize service via CLI (`tools/deploy/init`) with AI copilot suggestions.
3. Run pipeline dry-run; translator validates against policy and generates rollback plan.
4. Submit change; DX telemetry prompts satisfaction poll and collects friction tags.
5. Monitor release readiness scorecard surfaced by Maestro predictive insights.

### Platform Engineer
1. Review knowledge graph diff for new services/environments.
2. Update policy packs and guardrails; guardrail gateway queues approvals.
3. Run simulation harness to validate autonomous remediations.
4. Publish updated golden path runbooks and broadcast via enablement playbook.

### SRE
1. Receive predictive risk alerts aggregated from cost guard + incidents.
2. Launch self-healing rehearsal; review recommended action plans and approvals.
3. Coordinate with developers via chatops integration; capture post-incident survey.
4. Feed retrospectives into knowledge graph to influence future recommendations.

## Metrics Collected Per Journey
- Time spent per step, success/failure rates.
- Policy violations intercepted vs. escaped.
- Satisfaction rating (1-5) captured inline.
- Knowledge graph update deltas (nodes, relationships touched).
