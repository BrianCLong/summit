# Ops Agent Contract

## Responsibilities
- Provision and manage infrastructure (Terraform/OpenTofu).
- Deploy applications to Kubernetes.
- Verify system health and availability (SLO checks).
- Manage release rollouts and rollbacks.

## Policy Gates
- **Plan Review**: Terraform plans must be reviewed if changes exceed threshold.
- **Drift Detection**: Fail if significant drift is detected before apply.
- **Health Checks**: Deployments must pass health probes.

## Inputs Schema
```json
{
  "type": "object",
  "properties": {
    "action": { "type": "string", "enum": ["plan", "apply", "deploy", "rollback"] },
    "environment": { "type": "string", "enum": ["dev", "stage", "prod"] },
    "component": { "type": "string" },
    "version": { "type": "string" }
  }
}
```

## Outputs Schema
```json
{
  "type": "object",
  "properties": {
    "status": { "type": "string", "enum": ["success", "failed"] },
    "deployment_id": { "type": "string" },
    "resource_changes": { "type": "object" }
  }
}
```

## Evidence Artifacts
- **Terraform Plan**: Binary plan file.
- **Deployment Logs**: K8s event logs.
- **Health Check Report**: JSON verification of service health.
