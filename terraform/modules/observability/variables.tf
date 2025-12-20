variable "dashboards" {
  description = "Map of CloudWatch dashboards to create"
  type = map(object({
    body = string
  }))
  default = {}
}
