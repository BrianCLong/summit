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

variable "opa_url" {
  description = "OPA base URL for policy evaluation"
  type        = string
  default     = "http://opa.intelgraph.local:8181"
}

variable "notary_url" {
  description = "Notary service URL for signing verification"
  type        = string
  default     = "https://notary.intelgraph.local"
}

variable "notary_key_secret" {
  description = "Secret reference for notary signing key"
  type        = string
  default     = "notary-signer-key"
}

variable "graph_endpoint" {
  description = "Graph API endpoint for signer metadata"
  type        = string
  default     = "http://neo4j.intelgraph.local:7474"
}

variable "secrets_prefix" {
  description = "Secrets manager prefix for signer-related secrets"
  type        = string
  default     = "/intelgraph/dev"
}
