variable "region" { type = string }
variable "identifier" { type = string }
variable "engine_version" { type = string default = "14.11" }
variable "instance_class" { type = string default = "db.t3.medium" }
variable "allocated_storage" { type = number default = 50 }
variable "db_name" { type = string }
variable "username" { type = string }
variable "password" { type = string sensitive = true }
variable "security_group_ids" { type = list(string) }
variable "subnet_ids" { type = list(string) }

