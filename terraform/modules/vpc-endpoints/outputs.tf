# Outputs for VPC Endpoints module

output "s3_endpoint_id" {
  description = "The ID of the S3 Gateway Endpoint"
  value       = try(aws_vpc_endpoint.s3[0].id, null)
}

output "s3_endpoint_prefix_list_id" {
  description = "The prefix list ID of the S3 Gateway Endpoint"
  value       = try(aws_vpc_endpoint.s3[0].prefix_list_id, null)
}

output "ecr_api_endpoint_id" {
  description = "The ID of the ECR API Interface Endpoint"
  value       = try(aws_vpc_endpoint.ecr_api[0].id, null)
}

output "ecr_dkr_endpoint_id" {
  description = "The ID of the ECR DKR Interface Endpoint"
  value       = try(aws_vpc_endpoint.ecr_dkr[0].id, null)
}

output "secretsmanager_endpoint_id" {
  description = "The ID of the Secrets Manager Interface Endpoint"
  value       = try(aws_vpc_endpoint.secretsmanager[0].id, null)
}

output "ssm_endpoint_id" {
  description = "The ID of the SSM Interface Endpoint"
  value       = try(aws_vpc_endpoint.ssm[0].id, null)
}

output "logs_endpoint_id" {
  description = "The ID of the CloudWatch Logs Interface Endpoint"
  value       = try(aws_vpc_endpoint.logs[0].id, null)
}

output "sts_endpoint_id" {
  description = "The ID of the STS Interface Endpoint"
  value       = try(aws_vpc_endpoint.sts[0].id, null)
}

output "vpc_endpoints_security_group_id" {
  description = "The ID of the security group for VPC endpoints"
  value       = aws_security_group.vpc_endpoints.id
}

output "estimated_monthly_savings" {
  description = "Estimated monthly cost savings from VPC endpoints"
  value = {
    s3_endpoint                = var.enable_s3_endpoint ? "$40-60" : "$0"
    ecr_endpoints              = var.enable_ecr_endpoints ? "$40-60" : "$0"
    secretsmanager_endpoint    = var.enable_secretsmanager_endpoint ? "$5-10" : "$0"
    logs_endpoint              = var.enable_logs_endpoint ? "$10-20" : "$0"
    total_estimated_savings    = "$80-120 (if all major endpoints enabled)"
  }
}
