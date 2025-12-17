variable "region" { type = string }
variable "cluster_name" { type = string }
variable "cluster_version" { type = string  default = "1.29" }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "instance_types" { type = list(string) default = ["t3.large"] }
variable "min_size" { type = number default = 2 }
variable "max_size" { type = number default = 6 }
variable "desired_size" { type = number default = 3 }
variable "enable_spot" { type = bool default = false }
variable "spot_instance_types" { type = list(string) default = ["t3.large"] }
variable "spot_min_size" { type = number default = 0 }
variable "spot_max_size" { type = number default = 10 }
variable "spot_desired_size" { type = number default = 0 }
