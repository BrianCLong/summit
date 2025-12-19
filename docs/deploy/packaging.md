# Packaging quickstart for signer, policy bundles, and dashboards

This guide describes how to ship the signer service, distribute policy bundles, and publish dashboards/alerts using the new Helm and Terraform assets.

## Prerequisites

- Terraform v1.6+ and AWS credentials that allow KMS, S3, CloudWatch, and SNS.
- Helm 3.10+.
- Access to the container registry that hosts the signer image.

## 1) Provision release infrastructure with Terraform

From `/workspace/summit/terraform`:

```bash
terraform init
terraform apply \
  -var="environment=staging" \
  -var="region=us-east-1" \
  -var="metrics_namespace=intelgraph"
```

The modules create:

- A KMS key and alias for signer tokens and bundle verification.
- An encrypted, versioned S3 bucket for policy bundles and exported dashboards.
- A CloudWatch dashboard plus SNS-backed alarms for signer latency and bundle freshness.

Outputs printed by Terraform include the KMS alias ARN, bucket name, dashboard name, and the alert topic.

## 2) Publish policy bundles and dashboards

1. Package the Rego bundles and dashboards as tarballs (or plain JSON files) and upload them to the provisioned S3 bucket.
2. Use the KMS key ARN from Terraform when signing bundles so the signer can verify them.

## 3) Deploy the signer service

Install the Helm chart with the provided example values:

```bash
helm upgrade --install signer ./helm/signer \
  --namespace intelgraph-system --create-namespace \
  -f helm/values.example.yaml
```

- `policyBundles.sources` should point at the S3 objects uploaded in step 2.
- `SIGNING_KEY_ID` and `KMS_KEY_ARN` should use the Terraform outputs.
- The ServiceMonitor included in the chart exposes metrics for Prometheus.

## 4) Deploy dashboards and alerting

Apply the monitoring chart to register the Grafana dashboards and Prometheus alerts:

```bash
helm upgrade --install monitoring ./helm/monitoring \
  --namespace monitoring \
  -f helm/values.example.yaml
```

The chart publishes:

- Grafana dashboards for signer throughput, validation latency, and policy supply-chain health.
- Prometheus rules for signer availability/validation errors and bundle staleness/signature failures.
- An Alertmanager config with default and security routes; update the Slack webhook/channel before production.

## 5) Validate the rollout

- Confirm the signer Pods are ready: `kubectl get pods -n intelgraph-system -l app.kubernetes.io/name=signer`.
- Verify bundles are mounted: `kubectl exec -n intelgraph-system deploy/signer -- cat /etc/policy/bundles.yaml`.
- Check Grafana for the imported dashboards and ensure alerts wire to the SNS topic from Terraform.
