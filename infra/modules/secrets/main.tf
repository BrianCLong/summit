# Secrets Module Stub
resource "aws_secretsmanager_secret" "main" {
  name = "${var.environment}/app-secrets"
}

variable "environment" {
  type        = string
  description = "The environment name"
}
