variable "name" {
  description = "Name for the signer release"
  type        = string
  default     = "policy-signer"
}

variable "namespace" {
  description = "Namespace where the signer will run"
  type        = string
  default     = "intelgraph-dev"
}

variable "image" {
  description = "Container image for the signer service"
  type        = string
}

variable "bundle_url" {
  description = "URL pointing at the signed OPA bundle artifact"
  type        = string
}

variable "signer_key_id" {
  description = "Key identifier used to sign attestations"
  type        = string
}

variable "alerts_version" {
  description = "Prometheus alert ruleset version to apply"
  type        = string
  default     = "v0.3.9"
}

variable "dashboards_path" {
  description = "Path to Grafana dashboards that include signer coverage"
  type        = string
  default     = "grafana/dashboards"
}
