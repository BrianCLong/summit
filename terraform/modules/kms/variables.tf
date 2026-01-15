variable "name" {
  type = string
}

variable "environment" {
  type = string
}

variable "description" {
  type     = string
  default  = null
  nullable = true
}

variable "enable_key_rotation" {
  type    = bool
  default = true
}

variable "deletion_window_in_days" {
  type    = number
  default = 30
}

variable "key_admin_arns" {
  type    = list(string)
  default = []
}

variable "key_user_arns" {
  type    = list(string)
  default = []
}

variable "aliases" {
  type    = list(string)
  default = []
}

variable "policy" {
  type     = string
  default  = null
  nullable = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
