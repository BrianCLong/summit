# Air-Gapped Deployment Variables
# Summit IntelGraph Platform

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the air-gapped VPC"
  type        = string
  default     = "10.100.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

variable "private_subnets" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
}

variable "scanning_station_cidr" {
  description = "CIDR block for malware scanning stations"
  type        = string
  default     = "10.100.10.0/24"
}

variable "admin_cidr" {
  description = "CIDR block for administrative access"
  type        = string
  default     = "10.100.20.0/24"
}

variable "monitoring_cidr" {
  description = "CIDR block for SNMP monitoring infrastructure"
  type        = string
  default     = "10.100.30.0/24"
}

variable "ot_sensor_cidr" {
  description = "CIDR block for OT sensors"
  type        = string
  default     = "10.100.40.0/24"
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS nodes"
  type        = list(string)
  default     = ["m6i.large", "m6i.xlarge"]
}

variable "node_min_size" {
  description = "Minimum number of nodes in the node group"
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum number of nodes in the node group"
  type        = number
  default     = 10
}

variable "node_desired_size" {
  description = "Desired number of nodes in the node group"
  type        = number
  default     = 3
}

variable "container_repositories" {
  description = "List of container repositories to create"
  type        = list(string)
  default = [
    "intelgraph-server",
    "intelgraph-client",
    "intelgraph-api-gateway",
    "intelgraph-copilot",
    "intelgraph-analytics",
    "malware-scanner",
    "snmp-monitor",
    "siem-collector"
  ]
}

variable "enable_snmp_monitoring" {
  description = "Enable SNMP health monitoring"
  type        = bool
  default     = true
}

variable "snmp_community_string" {
  description = "SNMP community string (use secrets manager in production)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "slsa_provenance_level" {
  description = "SLSA provenance level to enforce (1-3)"
  type        = number
  default     = 3

  validation {
    condition     = var.slsa_provenance_level >= 1 && var.slsa_provenance_level <= 3
    error_message = "SLSA level must be 1, 2, or 3."
  }
}

variable "malware_scan_retention_days" {
  description = "Days to retain malware scan results"
  type        = number
  default     = 365
}

variable "sbom_format" {
  description = "SBOM format to generate (spdx, cyclonedx)"
  type        = string
  default     = "cyclonedx"

  validation {
    condition     = contains(["spdx", "cyclonedx"], var.sbom_format)
    error_message = "SBOM format must be spdx or cyclonedx."
  }
}

variable "proxy_chain_enabled" {
  description = "Enable proxy chain for sensor management"
  type        = bool
  default     = true
}

variable "siem_backup_enabled" {
  description = "Enable OT sensor backup to isolated SIEM"
  type        = bool
  default     = true
}
