# Kubernetes Cluster Module
# Supports AWS EKS, GCP GKE, and Azure AKS

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# ============================================================================
# AWS EKS Cluster
# ============================================================================

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  count = var.provider == "aws" ? 1 : 0

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = var.vpc_id
  subnet_ids = var.subnet_ids

  # Cluster endpoint access
  cluster_endpoint_public_access  = var.enable_public_access
  cluster_endpoint_private_access = true

  # Encryption
  cluster_encryption_config = {
    provider_key_arn = var.kms_key_arn
    resources        = ["secrets"]
  }

  # Enable IRSA (IAM Roles for Service Accounts)
  enable_irsa = true

  # Cluster addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Node groups
  eks_managed_node_groups = {
    general = {
      name            = "${var.cluster_name}-general"
      instance_types  = var.node_instance_types
      capacity_type   = "ON_DEMAND"

      min_size     = var.node_min_count
      max_size     = var.node_max_count
      desired_size = var.node_desired_count

      # Node labels
      labels = {
        role = "general"
        environment = var.environment
      }

      # Taints
      taints = []

      # Security
      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            encrypted             = true
            kms_key_id           = var.kms_key_arn
            delete_on_termination = true
          }
        }
      }
    }
  }

  # Tags
  tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# ============================================================================
# GCP GKE Cluster
# ============================================================================

resource "google_container_cluster" "gke" {
  count = var.provider == "gcp" ? 1 : 0

  name     = var.cluster_name
  location = var.region

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Kubernetes version
  min_master_version = var.kubernetes_version

  # Network
  network    = var.vpc_id
  subnetwork = var.subnet_ids[0]

  # IP allocation
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = var.cluster_ipv4_cidr
    services_ipv4_cidr_block = var.services_ipv4_cidr
  }

  # Security
  workload_identity_config {
    workload_pool = "${var.gcp_project_id}.svc.id.goog"
  }

  # Encryption
  database_encryption {
    state    = "ENCRYPTED"
    key_name = var.kms_key_arn
  }

  # Network policy
  network_policy {
    enabled  = true
    provider = "CALICO"
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }
}

resource "google_container_node_pool" "gke_nodes" {
  count = var.provider == "gcp" ? 1 : 0

  name       = "${var.cluster_name}-node-pool"
  location   = var.region
  cluster    = google_container_cluster.gke[0].name
  node_count = var.node_desired_count

  autoscaling {
    min_node_count = var.node_min_count
    max_node_count = var.node_max_count
  }

  node_config {
    machine_type = var.node_instance_types[0]

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      environment = var.environment
    }

    disk_size_gb = 100
    disk_type    = "pd-standard"

    # Security
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# ============================================================================
# Azure AKS Cluster
# ============================================================================

resource "azurerm_kubernetes_cluster" "aks" {
  count = var.provider == "azure" ? 1 : 0

  name                = var.cluster_name
  location            = var.region
  resource_group_name = var.resource_group_name
  dns_prefix          = var.cluster_name
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_desired_count
    vm_size             = var.node_instance_types[0]
    enable_auto_scaling = true
    min_count           = var.node_min_count
    max_count           = var.node_max_count
    os_disk_size_gb     = 100
    vnet_subnet_id      = var.subnet_ids[0]
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
  }

  # Enable Azure AD integration
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
  }

  # Encryption
  disk_encryption_set_id = var.kms_key_arn

  tags = merge(
    var.tags,
    {
      environment = var.environment
    }
  )
}

# ============================================================================
# Post-Installation: Install Essential Components
# ============================================================================

# Install External Secrets Operator
resource "kubernetes_namespace" "external_secrets" {
  count = var.install_external_secrets ? 1 : 0

  metadata {
    name = "external-secrets"
  }

  depends_on = [
    module.eks,
    google_container_cluster.gke,
    azurerm_kubernetes_cluster.aks
  ]
}

# Install Metrics Server
resource "kubernetes_namespace" "metrics_server" {
  count = var.install_metrics_server ? 1 : 0

  metadata {
    name = "metrics-server"
  }

  depends_on = [
    module.eks,
    google_container_cluster.gke,
    azurerm_kubernetes_cluster.aks
  ]
}
