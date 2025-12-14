
variable "region" { type = string }
variable "engine_version" { type = string }
variable "database_name" { type = string }
variable "master_username" { type = string }
variable "master_password" { type = string sensitive = true }
variable "security_group_id" { type = string }
variable "db_subnet_group" { type = string }
