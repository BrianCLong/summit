variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

variable "primary_region" {
  description = "Primary AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS Region"
  type        = string
  default     = "us-west-2"
}

variable "tertiary_region" {
  description = "Tertiary AWS Region (Europe)"
  type        = string
  default     = "eu-west-1"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "summit.intelgraph.io"
}

variable "vpc_cidrs" {
  type = map(string)
  default = {
    "us-east-1" = "10.0.0.0/16"
    "us-west-2" = "10.1.0.0/16"
    "eu-west-1" = "10.2.0.0/16"
  }
}
