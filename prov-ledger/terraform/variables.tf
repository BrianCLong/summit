variable "repository_name" {
  type = string
}

variable "chart_repository" {
  type = string
}

variable "chart_version" {
  type = string
}

variable "namespace" {
  type    = string
  default = "default"
}
