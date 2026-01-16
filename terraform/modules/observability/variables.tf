variable "dashboards" {
  description = "Map of CloudWatch dashboards to manage"
  type = map(object({
    body = string
  }))
}
