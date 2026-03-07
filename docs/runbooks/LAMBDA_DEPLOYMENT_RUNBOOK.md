# Lambda Deployment Hardening & Observability Runbook

This runbook describes the standardized process for deploying hardened AWS Lambda functions for IntelGraph using the `lambda-hardened` Terraform module.

## 1. Overview

The `lambda-hardened` module enforces security, reliability, and observability best practices by default. It includes:

- **Security**: IAM Least Privilege, KMS Encryption, VPC support, Inspector (via AWS config).
- **Reliability**: DLQ, Retry Logic, Multi-AZ (if VPC enabled).
- **Observability**: CloudWatch Logs, Metrics, Alarms, X-Ray Tracing, Dashboards.
- **Deployment**: Blue/Green deployment infrastructure via CodeDeploy.

## 2. Prerequisites

- **Terraform**: v1.0+
- **AWS CLI**: v2+
- **AWS Credentials**: Configured with appropriate permissions.
- **Node.js**: (If building the example handler)

## 3. Usage

### Directory Structure

Your deployment code should be structured as follows:

```
deploy/terraform/
├── modules/
│   └── lambda-hardened/
└── examples/
    └── lambda-hardened-example/
```

### Basic Configuration

In your `main.tf`, invoke the module:

```hcl
module "my_lambda" {
  source = "../../modules/lambda-hardened"

  function_name = "my-secure-function"
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  # Source code (zip file)
  filename         = "path/to/lambda.zip"
  source_code_hash = filebase64sha256("path/to/lambda.zip")

  # Environment
  environment_variables = {
    ENV = "production"
  }

  # Secrets Access
  allowed_secret_arns = [
    "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-key"
  ]
}
```

### Automated Deployment (CI/CD)

A sample GitHub Actions workflow is provided in `.github/workflows/lambda-deploy-example.yml`. This workflow:

1. Checks out the code.
2. Configures AWS credentials (via OIDC).
3. Initializes Terraform.
4. Plans the deployment.
5. Applies the changes (on merge to main).

To use this, ensure you have configured OIDC in AWS and updated the IAM Role ARN in the workflow file.

### Manual Deploying

1. Initialize Terraform:
   ```bash
   terraform init
   ```
2. Plan the deployment:
   ```bash
   terraform plan -out=tfplan
   ```
3. Apply the changes:
   ```bash
   terraform apply tfplan
   ```

## 4. Security Hardening

The module implements the following security controls:

- **IAM Roles**: A dedicated IAM role is created for each function. Add custom permissions via `custom_iam_policy_json`.
- **Encryption**: All environment variables and code are encrypted at rest using a dedicated KMS CMK (`aws_kms_key`).
- **VPC Access**: If `vpc_subnet_ids` are provided, the function runs within your VPC. Ensure Security Groups allow necessary outbound traffic.
- **Least Privilege**: The default role only allows Basic Execution, X-Ray, and KMS Decrypt.

## 5. Observability & Monitoring

### Dashboards

A CloudWatch Dashboard is automatically created named `[function-name]-dashboard`. It tracks:

- Invocations
- Errors
- Throttles
- Duration (p95 & Average)
- Concurrent Executions

### Alarms

The following CloudWatch Alarms are created:

- **Errors**: Triggers if > 0 errors in 1 minute.
- **Throttles**: Triggers if > 0 throttles in 1 minute.
- **Duration**: Triggers if Average Duration > 80% of timeout.

### Tracing

AWS X-Ray is enabled (`Active` mode). View traces in the AWS Console -> X-Ray.

## 6. Blue/Green Deployments

The module sets up CodeDeploy resources (`Application` and `DeploymentGroup`) for Canary deployments.

- **Alias**: `live` alias points to the active version.
- **Strategy**: `LambdaCanary10Percent5Minutes` (Traffic shifts 10% for 5 mins, then 100%).
- **Rollback**: Automatic rollback on deployment failure or if alarms trigger.

To trigger a blue/green deployment, you generally update the Lambda code and publish a new version. The CodeDeploy integration usually requires an `AppSpec.yml` or integration with a CI/CD pipeline (like GitHub Actions) that calls the `create-deployment` API.

## 7. Troubleshooting

### Common Errors

- **KMS Access Denied**: Ensure the IAM role has `kms:Decrypt` (handled by module).
- **VPC Timeouts**: Check Security Groups and NACLs. Ensure the subnet has a NAT Gateway if internet access is required.
- **Deployment Failures**: Check CodeDeploy logs. If verification hooks fail, the deployment rolls back.

### Incident Response

If an alarm fires (e.g., High Error Rate):

1. **Acknowledge**: Check the SNS topic (if configured).
2. **Investigate**:
   - Check CloudWatch Logs for stack traces.
   - Check X-Ray for latency bottlenecks or downstream failures.
   - Check Dashboard for correlation with deployment times.
3. **Rollback**: If a recent deployment caused the issue, CodeDeploy should auto-rollback. If not, manually revert the Terraform change or alias pointer.

## 8. Cost Optimization

- **Provisioned Concurrency**: Use sparingly. Configure via `provisioned_concurrency` variable.
- **Memory**: Right-size memory. Monitor the "Duration" metric; faster execution (more memory) can sometimes be cheaper.
- **Log Retention**: Default is 14 days. Adjust `log_retention_days` to save storage costs.

## 9. Important Notes & Future Enhancements

### Asynchronous Invocation Config

The `aws_lambda_function_event_invoke_config` (which controls Retries and DLQ routing) applies specifically to **asynchronous** invocations (e.g., S3 events, SNS, EventBridge). Synchronous invocations (e.g., API Gateway default setup) handle errors immediately and do not use the Lambda internal retry queue.

### Future Enhancements

The following features are recommended for a full production-grade environment but are outside the scope of this core infrastructure module:

- **ElastiCache**: Adding a VPC-based Redis or Memcached cluster for high-performance caching.
- **Advanced Testing**: Integrating a chaos engineering framework (like Gremlin) or a load testing suite (like k6) into the CI/CD pipeline.
- **Security Scanning**: Enabling AWS GuardDuty and Amazon Inspector at the account level for continuous vulnerability scanning.
