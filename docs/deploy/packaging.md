# Packaging and deployment quickstart

This quickstart shows how to ship the signer service alongside policy bundles and monitoring assets using the Helm charts and Terraform modules in this repository.

## Helm: signer service and policy bundles

1. Populate secrets required by the signer service (for example, a private key named `signer-key`).
2. Update `helm/values.example.yaml` with registry URLs, bundle revisions, and alert thresholds that match your environment.
3. Deploy the signer service and policy bundle ConfigMap:

   ```bash
   helm upgrade --install signer-service ./helm/signer-service -f helm/values.example.yaml --namespace security --create-namespace
   helm upgrade --install policy-bundles ./helm/policy-bundles -f helm/values.example.yaml --namespace security
   ```

4. Apply monitoring overrides (Grafana dashboards and Prometheus alerts) when installing kube-prometheus-stack:

   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
     -n monitoring --create-namespace \
     -f helm/monitoring/values.yaml -f helm/values.example.yaml
   ```

The monitoring values include dashboards for signer health and policy bundle freshness plus alert rules that watch uptime, error ratios, and bundle download recency.

## Terraform: keys and dashboards

Use the new modules under `terraform/modules` to keep KMS keys and dashboards provisioned as code.

```hcl
variable "region" { default = "us-east-1" }
variable "environment" { default = "dev" }

locals {
  common_tags = { Environment = var.environment }
  signer_keys = {
    signing = {
      description             = "Signer service key"
      enable_key_rotation     = true
      deletion_window_in_days = 30
      aliases                 = ["alias/${var.environment}-signer"]
      key_admin_arns          = ["arn:aws:iam::123456789012:role/admin"]
      key_user_arns           = ["arn:aws:iam::123456789012:role/signer-app"]
    }
  }
  dashboards = {
    "signer-health" = {
      body = file("dashboards/signer-health.json")
    }
  }
}

module "kms_keys" {
  source    = "./modules/kms"
  for_each  = local.signer_keys
  name      = each.key
  aliases   = each.value.aliases
  policy    = lookup(each.value, "policy", null)
  tags      = local.common_tags
  environment            = var.environment
  description            = lookup(each.value, "description", null)
  enable_key_rotation    = lookup(each.value, "enable_key_rotation", true)
  deletion_window_in_days = lookup(each.value, "deletion_window_in_days", 30)
  key_admin_arns         = lookup(each.value, "key_admin_arns", [])
  key_user_arns          = lookup(each.value, "key_user_arns", [])
}

module "dashboards" {
  source     = "./modules/observability"
  dashboards = local.dashboards
}
```

Apply with:

```bash
cd terraform
terraform init
terraform plan -var="region=us-east-1" -var="environment=dev"
terraform apply
```

The KMS module handles rotation, aliasing, and IAM bindings, while the observability module provisions CloudWatch dashboards for the signer and policy bundle telemetry captured by Prometheus.
