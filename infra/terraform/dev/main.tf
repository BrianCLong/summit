terraform {
  required_version = ">= 1.6.0"
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.29.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.13.0"
    }
  }
}

provider "kubernetes" {
  config_path = var.kubeconfig
}

provider "helm" {
  kubernetes {
    config_path = var.kubeconfig
  }
}

variable "kubeconfig" { type = string }
variable "namespace" { type = string  default = "intelgraph-dev" }

resource "kubernetes_namespace" "ns" {
  metadata { name = var.namespace }
}

resource "helm_release" "maestro" {
  name       = "maestro"
  repository = "file://../../..//charts/maestro"
  chart      = "maestro"
  namespace  = kubernetes_namespace.ns.metadata[0].name
  values = [file("${path.module}/values-dev.yaml")]
  depends_on = [kubernetes_namespace.ns]
}

resource "helm_release" "monitoring" {
  name       = "monitoring"
  repository = "file://../../..//charts/monitoring"
  chart      = "monitoring"
  namespace  = kubernetes_namespace.ns.metadata[0].name
  values = [file("${path.module}/values-monitoring.yaml")]
  depends_on = [kubernetes_namespace.ns]
}
