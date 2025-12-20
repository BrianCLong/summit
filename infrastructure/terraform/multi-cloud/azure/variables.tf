# Azure Infrastructure Variables

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "location" {
  description = "Azure location"
  type        = string
}

variable "vnet_cidr" {
  description = "VNet CIDR block"
  type        = string
}

variable "enable_vpn" {
  description = "Enable VPN gateway"
  type        = bool
  default     = false
}

variable "enable_express_route" {
  description = "Enable ExpressRoute"
  type        = bool
  default     = false
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
}

variable "node_vm_size" {
  description = "VM size for AKS nodes"
  type        = string
}

variable "min_nodes" {
  description = "Minimum number of nodes"
  type        = number
}

variable "max_nodes" {
  description = "Maximum number of nodes"
  type        = number
}

variable "enable_azure_files" {
  description = "Enable Azure Files"
  type        = bool
  default     = true
}

variable "enable_blob_backup" {
  description = "Enable blob backup"
  type        = bool
  default     = true
}

variable "enable_key_vault" {
  description = "Enable Key Vault"
  type        = bool
  default     = true
}

variable "enable_monitor" {
  description = "Enable Azure Monitor"
  type        = bool
  default     = true
}

variable "enable_spot_instances" {
  description = "Enable spot instances"
  type        = bool
  default     = false
}

variable "admin_group_object_ids" {
  description = "Azure AD admin group object IDs"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
