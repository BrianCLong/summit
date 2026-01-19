terraform {
  required_version = ">= 1.7.0"
}

# This is a scaffold.
# Add provider-specific modules and variables as your target cloud is selected.

variable "environment" {
  type        = string
  description = "Deployment environment name (dev|stage|prod)"
}

output "observability_enabled" {
  value = true
}
