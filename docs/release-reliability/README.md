# Release Reliability Framework

> **Version**: 0.1.0
> **Owner**: Reliability & Release Team
> **Status**: Active

This directory contains the CompanyOS Release Reliability Framework - everything needed to make safe, frequent releases the default path.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [Release Reliability Framework](./RELEASE_RELIABILITY_FRAMEWORK.md) | Core framework documentation |
| [Release Checklist v0](./RELEASE_CHECKLIST_V0.md) | Pre-flight checklist for every release |
| [Deployment Pipeline](./DEPLOYMENT_PIPELINE.md) | Step-by-step pipeline documentation |
| [Incident Runbook Template](./INCIDENT_RUNBOOK_TEMPLATE.md) | Template for service runbooks |
| [Postmortem Template](./POSTMORTEM_TEMPLATE.md) | Blameless postmortem template |

---

## Directory Structure

```
docs/release-reliability/
├── README.md                          # This file
├── RELEASE_RELIABILITY_FRAMEWORK.md   # Core framework
├── RELEASE_CHECKLIST_V0.md            # Release checklist
├── DEPLOYMENT_PIPELINE.md             # Pipeline documentation
├── INCIDENT_RUNBOOK_TEMPLATE.md       # Runbook template
├── POSTMORTEM_TEMPLATE.md             # Postmortem template
├── policies/
│   └── release_gate.rego              # OPA release gate policy
├── k8s/
│   └── analysis-templates.yaml        # Argo Rollouts analysis templates
└── workflows/
    └── release-gate.yml               # GitHub Actions workflow
```

---

## Framework Overview

### Deployment Strategies

| Strategy | Use Case | Services |
|----------|----------|----------|
| Progressive Canary | Critical path services | api, graphql-gateway, copilot |
| Standard Canary | Supporting services | conductor, audit-svc |
| Blue-Green | Database migrations | Stateful services |
| Rolling Update | Internal tools | devtools, sandbox |
| Feature Flags | Gradual rollout | Any feature |

### Release Gates

```
BUILD → QUALITY → SECURITY → SLO → POLICY → APPROVAL
```

All gates enforced by OPA policy. See [policies/release_gate.rego](./policies/release_gate.rego).

### MTTR Targets

| Severity | Detection | Mitigation | Recovery | Total |
|----------|-----------|------------|----------|-------|
| P1 | 5 min | 15 min | 30 min | 60 min |
| P2 | 15 min | 30 min | 60 min | 2 hours |
| P3 | 1 hour | 2 hours | 4 hours | 8 hours |

---

## Getting Started

### For Developers

1. **Before deploying**: Complete the [Release Checklist](./RELEASE_CHECKLIST_V0.md)
2. **Understanding the pipeline**: Read [Deployment Pipeline](./DEPLOYMENT_PIPELINE.md)
3. **Creating runbooks**: Use [Incident Runbook Template](./INCIDENT_RUNBOOK_TEMPLATE.md)

### For SREs

1. **Evaluate release gates**:
   ```bash
   opa eval -d policies/release_gate.rego -i input.json "data.companyos.release.decision"
   ```

2. **Apply analysis templates**:
   ```bash
   kubectl apply -f k8s/analysis-templates.yaml
   ```

3. **Emergency procedures**: See emergency section in [Release Checklist](./RELEASE_CHECKLIST_V0.md#emergency-release-checklist)

### For Release Captains

1. **Release verification**: Follow [Release Checklist](./RELEASE_CHECKLIST_V0.md)
2. **Gate evaluation**: Check [Release Gate Workflow](./workflows/release-gate.yml)
3. **Incident response**: Use [Runbook Template](./INCIDENT_RUNBOOK_TEMPLATE.md)
4. **Post-incident**: Complete [Postmortem Template](./POSTMORTEM_TEMPLATE.md)

---

## Key Commands

### Release Gate Evaluation

```bash
# Evaluate release gates locally
opa eval \
  -d docs/release-reliability/policies/release_gate.rego \
  -i gate-input.json \
  "data.companyos.release.decision" \
  --format=pretty
```

### Canary Deployment

```bash
# Start canary
kubectl argo rollouts set image SERVICE api=IMAGE:TAG -n production

# Check status
kubectl argo rollouts status SERVICE -n production

# Promote to full rollout
kubectl argo rollouts promote SERVICE -n production

# Abort rollout
kubectl argo rollouts abort SERVICE -n production

# Rollback
kubectl argo rollouts undo SERVICE -n production
```

### Rollback

```bash
# Quick rollback
./scripts/release/canary-rollback-playbook.sh \
  --service SERVICE \
  --environment production \
  --reason "Error rate spike"

# Helm rollback
helm rollback RELEASE REVISION --cleanup-on-fail
```

---

## Error Budget Policy

| Budget Remaining | Policy |
|------------------|--------|
| > 50% | Normal deployments |
| 20-50% | Cautious mode, extended canary |
| < 20% | Bug fixes only, SRE approval required |
| Exhausted | Emergency fixes only, VP approval |

---

## Monitoring

### Key Dashboards

- [SLO Overview](http://grafana:3001/d/slo-overview)
- [Deployment Status](http://grafana:3001/d/deployment-overview)
- [Golden Signals](http://grafana:3001/d/golden-signals)
- [Canary Analysis](http://grafana:3001/d/canary-analysis)

### Key Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| ErrorRateSpike | >2% for 2m | Investigate |
| ErrorRateCritical | >5% for 1m | Auto-rollback |
| LatencyP95High | >500ms for 3m | Investigate |
| ErrorBudgetBurnFast | >5x for 5m | Auto-rollback |

---

## Contributing

1. Update documentation when processes change
2. Test policy changes with `opa test`
3. Review quarterly or after major incidents
4. Get approval from @sre-team for policy changes

---

## Support

| Issue | Contact |
|-------|---------|
| Release questions | #release-captain |
| Incident response | #incidents |
| Framework improvements | #sre-team |
| Policy changes | @sre-team |

---

*Framework maintained by Reliability & Release Team. Last reviewed: 2025-12-06*
