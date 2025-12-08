# Cluster Module Outputs

output "cluster_id" {
  description = "Cluster ID"
  value       = var.provider == "aws" ? module.eks[0].cluster_id : (
    var.provider == "gcp" ? google_container_cluster.gke[0].id :
    azurerm_kubernetes_cluster.aks[0].id
  )
}

output "cluster_endpoint" {
  description = "Cluster API endpoint"
  value       = var.provider == "aws" ? module.eks[0].cluster_endpoint : (
    var.provider == "gcp" ? google_container_cluster.gke[0].endpoint :
    azurerm_kubernetes_cluster.aks[0].kube_config[0].host
  )
  sensitive   = true
}

output "cluster_name" {
  description = "Cluster name"
  value       = var.cluster_name
}

output "cluster_version" {
  description = "Kubernetes version"
  value       = var.kubernetes_version
}

output "kubeconfig" {
  description = "Kubeconfig for cluster access"
  value       = var.provider == "aws" ? module.eks[0].cluster_certificate_authority_data : (
    var.provider == "gcp" ? base64decode(google_container_cluster.gke[0].master_auth[0].cluster_ca_certificate) :
    azurerm_kubernetes_cluster.aks[0].kube_config_raw
  )
  sensitive   = true
}

output "oidc_provider_arn" {
  description = "OIDC provider ARN for IRSA (AWS only)"
  value       = var.provider == "aws" ? module.eks[0].oidc_provider_arn : null
}

output "cluster_security_group_id" {
  description = "Cluster security group ID"
  value       = var.provider == "aws" ? module.eks[0].cluster_security_group_id : null
}
