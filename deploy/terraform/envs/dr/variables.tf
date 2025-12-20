variable "region" {
  type        = string
  description = "AWS region for DR environment"
}

variable "prefix" {
  type        = string
  description = "Name prefix for DR resources"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for EKS cluster"
}

variable "cluster_role_arn" {
  type        = string
  description = "IAM role ARN for EKS cluster"
}

variable "kubernetes_version" {
  type        = string
  default     = "1.29"
  description = "Kubernetes version for DR cluster"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Additional tags"
}
