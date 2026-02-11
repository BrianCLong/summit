variable "region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

provider "aws" {
  region = var.region
}

# Example resource
resource "aws_ssm_parameter" "service_config" {
  name  = "/__SERVICE_NAME__/${var.environment}/config"
  type  = "String"
  value = "default"
}

output "service_url" {
  value = "http://__SERVICE_NAME__.${var.environment}.svc.cluster.local"
}
