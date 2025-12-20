# Mirror of dev with stage namespace/overrides
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = { source = "hashicorp/kubernetes" }
    helm       = { source = "hashicorp/helm" }
  }
}

provider "kubernetes" { config_path = var.kubeconfig }
provider "helm" { kubernetes { config_path = var.kubeconfig } }

variable "kubeconfig" { type = string }
variable "namespace" { type = string  default = "intelgraph-stage" }

resource "kubernetes_namespace" "ns" { metadata { name = var.namespace } }

resource "helm_release" "maestro" {
  name       = "maestro"
  repository = "file://../../..//charts/maestro"
  chart      = "maestro"
  namespace  = kubernetes_namespace.ns.metadata[0].name
  values = [file("${path.module}/values-stage.yaml")]
}

resource "helm_release" "monitoring" {
  name       = "monitoring"
  repository = "file://../../..//charts/monitoring"
  chart      = "monitoring"
  namespace  = kubernetes_namespace.ns.metadata[0].name
  values = [file("${path.module}/values-monitoring.yaml")]
}
