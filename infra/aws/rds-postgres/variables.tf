variable "db_name" { description = "Name of the database to create" type = string }
variable "db_username" { description = "Username for the database" type = string }
variable "db_password" { description = "Password for the database" type = string, sensitive = true }
variable "db_instance_class" { description = "DB instance class" type = string }
variable "db_allocated_storage" { description = "Allocated storage in GB" type = number }
variable "db_engine_version" { description = "PostgreSQL engine version" type = string }
variable "db_port" { description = "Port for the database" type = number }
variable "vpc_security_group_ids" { description = "List of VPC security group IDs" type = list(string) }
variable "db_subnet_group_name" { description = "DB Subnet Group Name" type = string }
variable "region" { description = "AWS region" type = string }
variable "kms_key_id" { description = "KMS Key ID for RDS encryption" type = string }

variable "cluster_name" { type = string, description = "Name of the EKS cluster to attach node groups to." }
variable "node_role_arn" { type = string, description = "ARN of the IAM role for EKS worker nodes." }