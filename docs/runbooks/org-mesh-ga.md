# Org Mesh Twin GA Runbook

## Overview

This runbook covers the operational procedures for the Org Mesh Twin GA release. Org Mesh Twin provides a digital twin of organizational entities (people, repos, assets) to detect drift and narrative risks.

## Architecture

- **Ingest**: Connectors for SCIM (Okta/AzureAD) and GitHub/GitLab.
- **Graph**: Neo4j database storing the entity graph.
- **Detection**: Python-based drift detectors and narrative analysis models.
- **Orchestration**: Maestro agents (Node.js) that propose and execute fixes.

## Deployment

### Prerequisites

- Kubernetes Cluster (EKS/GKE)
- Neo4j (v5+)
- Redis (for caching)

### Helm Install

```bash
helm upgrade --install org-mesh ./helm/org-mesh \
  --set neo4j.password=$NEO4J_PASSWORD \
  --set global.env=production
```

## Incident Response

### Drift Detection Alerts

**Symptom**: High volume of "Drift Detected" alerts.
**Triage**:

1. Check `org_mesh_drift_detection_count` metric in Grafana.
2. If `severity=high` count > 50/hour, investigate source repo.
3. If false positives, adjust policy in `server/src/policy/drift-rules.yaml`.

### Narrative Signal Storm

**Symptom**: "Suspicious Narrative" alerts flooding Slack.
**Triage**:

1. Check `org_mesh_narrative_signals_count`.
2. Review sample signals in Switchboard.
3. If valid, initiate "Campaign Response" workflow.
4. If noise, tune `riskScore` threshold in `narrative-detector` config.

## Scaling

### Horizontal Pod Autoscaling (HPA)

The `maestro-conductor` service is CPU-bound during graph analysis.

- **Trigger**: CPU > 70%
- **Max Replicas**: 10

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: conductor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: conductor
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Metrics & Observability

- **Dashboard**: `http://grafana.internal/d/org-mesh-twin`
- **Key Metrics**:
  - `org_mesh_ingest_duration_seconds`
  - `org_mesh_graph_nodes_count`
  - `org_mesh_agent_action_success_rate`
