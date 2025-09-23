variable "region" { type = string }
variable "cluster_version" { type = string default = "1.29" }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "instance_types" { type = list(string) default = ["t3.large"] }

variable "db_engine_version" { type = string default = "14.11" }
variable "db_instance_class" { type = string default = "db.t3.medium" }
variable "db_name" { type = string default = "intelgraph" }
variable "db_username" { type = string }
variable "db_password" { type = string sensitive = true }
variable "db_security_group_ids" { type = list(string) }
variable "db_subnet_ids" { type = list(string) }

variable "backup_bucket_name" { type = string }

