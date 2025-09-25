variable "region" {
  type        = string
  default     = "us-west-2"
  description = "AWS region for the EKS cluster."
}
variable "project" {
  type        = string
  default     = "summit-company"
  description = "Project name, used for resource tagging and naming."
}
variable "vpc_cidr" {
  type        = string
  default     = "10.80.0.0/16"
  description = "CIDR block for the VPC."
}
variable "public_subnets" {
  type        = list(string)
  default     = ["10.80.0.0/20", "10.80.16.0/20"]
  description = "List of CIDR blocks for public subnets."
}
variable "private_subnets" {
  type        = list(string)
  default     = ["10.80.32.0/20", "10.80.48.0/20"]
  description = "List of CIDR blocks for private subnets."
}

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster to attach node groups to."
}

variable "node_role_arn" {
  type        = string
  description = "ARN of the IAM role for EKS worker nodes."
}
