# Multi-Cloud Infrastructure Orchestration
# Supports AWS, Azure, GCP, and hybrid deployments

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  # Remote state management with encryption
  backend "s3" {
    bucket         = var.terraform_state_bucket
    key            = "multi-cloud/terraform.tfstate"
    region         = var.primary_region
    encrypt        = true
    dynamodb_table = var.terraform_lock_table

    # Support for alternative backends
    # backend "azurerm" for Azure Storage
    # backend "gcs" for Google Cloud Storage
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_primary_region

  default_tags {
    tags = merge(
      var.common_tags,
      {
        ManagedBy    = "Terraform"
        Environment  = var.environment
        Project      = "Summit"
        CostCenter   = var.cost_center
      }
    )
  }
}

provider "aws" {
  alias  = "secondary"
  region = var.aws_secondary_region

  default_tags {
    tags = merge(
      var.common_tags,
      {
        ManagedBy    = "Terraform"
        Environment  = var.environment
        Project      = "Summit"
        CostCenter   = var.cost_center
      }
    )
  }
}

# Azure Provider Configuration
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }

  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}

# Google Cloud Provider Configuration
provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_primary_region

  default_labels = merge(
    var.common_tags,
    {
      managed_by   = "terraform"
      environment  = var.environment
      project      = "summit"
      cost_center  = var.cost_center
    }
  )
}

provider "google" {
  alias   = "secondary"
  project = var.gcp_project_id
  region  = var.gcp_secondary_region
}

# Kubernetes Provider (multi-cluster support)
provider "kubernetes" {
  alias = "aws_primary"

  host                   = module.aws_infrastructure.eks_cluster_endpoint
  cluster_ca_certificate = base64decode(module.aws_infrastructure.eks_cluster_ca)
  token                  = module.aws_infrastructure.eks_cluster_token
}

provider "kubernetes" {
  alias = "azure_primary"

  host                   = module.azure_infrastructure.aks_cluster_endpoint
  cluster_ca_certificate = base64decode(module.azure_infrastructure.aks_cluster_ca)
  token                  = module.azure_infrastructure.aks_cluster_token
}

provider "kubernetes" {
  alias = "gcp_primary"

  host                   = module.gcp_infrastructure.gke_cluster_endpoint
  cluster_ca_certificate = base64decode(module.gcp_infrastructure.gke_cluster_ca)
  token                  = module.gcp_infrastructure.gke_cluster_token
}

# Helm Provider for service mesh and add-ons
provider "helm" {
  kubernetes {
    host                   = module.aws_infrastructure.eks_cluster_endpoint
    cluster_ca_certificate = base64decode(module.aws_infrastructure.eks_cluster_ca)
    token                  = module.aws_infrastructure.eks_cluster_token
  }
}

# Data sources for existing resources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {}

# Multi-Cloud Infrastructure Modules
module "aws_infrastructure" {
  source = "./aws"

  environment          = var.environment
  project_name         = var.project_name
  vpc_cidr             = var.aws_vpc_cidr
  availability_zones   = data.aws_availability_zones.available.names
  enable_vpn           = var.enable_vpn
  enable_direct_connect = var.enable_direct_connect

  # EKS Configuration
  cluster_version      = var.kubernetes_version
  node_instance_types  = var.aws_node_instance_types
  min_nodes            = var.min_nodes
  max_nodes            = var.max_nodes
  desired_nodes        = var.desired_nodes

  # Storage Configuration
  enable_efs           = true
  enable_s3_backup     = true

  # Security
  enable_secrets_manager = true
  enable_kms           = true

  # Monitoring
  enable_cloudwatch    = true

  tags = var.common_tags
}

module "azure_infrastructure" {
  source = "./azure"

  environment          = var.environment
  project_name         = var.project_name
  location             = var.azure_location
  vnet_cidr            = var.azure_vnet_cidr
  enable_vpn           = var.enable_vpn
  enable_express_route = var.enable_express_route

  # AKS Configuration
  cluster_version      = var.kubernetes_version
  node_vm_size         = var.azure_node_vm_size
  min_nodes            = var.min_nodes
  max_nodes            = var.max_nodes

  # Storage Configuration
  enable_azure_files   = true
  enable_blob_backup   = true

  # Security
  enable_key_vault     = true

  # Monitoring
  enable_monitor       = true

  tags = var.common_tags
}

module "gcp_infrastructure" {
  source = "./gcp"

  environment          = var.environment
  project_name         = var.project_name
  project_id           = var.gcp_project_id
  region               = var.gcp_primary_region
  vpc_cidr             = var.gcp_vpc_cidr
  enable_vpn           = var.enable_vpn
  enable_interconnect  = var.enable_interconnect

  # GKE Configuration
  cluster_version      = var.kubernetes_version
  machine_type         = var.gcp_machine_type
  min_nodes            = var.min_nodes
  max_nodes            = var.max_nodes

  # Storage Configuration
  enable_filestore     = true
  enable_gcs_backup    = true

  # Security
  enable_secret_manager = true
  enable_kms           = true

  # Monitoring
  enable_cloud_monitoring = true

  labels = var.common_tags
}

# Hybrid Cloud Connectivity
module "hybrid_connectivity" {
  source = "./modules/hybrid-connectivity"

  aws_vpc_id           = module.aws_infrastructure.vpc_id
  azure_vnet_id        = module.azure_infrastructure.vnet_id
  gcp_network_id       = module.gcp_infrastructure.network_id

  enable_cross_cloud_peering = var.enable_cross_cloud_peering
  enable_sd_wan        = var.enable_sd_wan

  # VPN Configuration
  vpn_shared_secret    = var.vpn_shared_secret
  on_premise_cidrs     = var.on_premise_cidrs

  tags = var.common_tags
}

# Service Mesh (Istio)
module "service_mesh" {
  source = "./modules/service-mesh"

  aws_cluster_name     = module.aws_infrastructure.cluster_name
  azure_cluster_name   = module.azure_infrastructure.cluster_name
  gcp_cluster_name     = module.gcp_infrastructure.cluster_name

  enable_multi_cluster = var.enable_multi_cluster_mesh
  enable_mtls          = true

  # Traffic Management
  enable_circuit_breaker = true
  enable_retry_policy    = true
  enable_rate_limiting   = true

  depends_on = [
    module.aws_infrastructure,
    module.azure_infrastructure,
    module.gcp_infrastructure
  ]
}

# Cost Optimization
module "cost_optimization" {
  source = "./modules/cost-optimization"

  aws_account_id       = data.aws_caller_identity.current.account_id
  azure_subscription_id = var.azure_subscription_id
  gcp_project_id       = var.gcp_project_id

  # Tagging Strategy
  required_tags        = ["Environment", "CostCenter", "Project", "Owner"]
  cost_allocation_tags = var.cost_allocation_tags

  # Optimization
  enable_rightsizing   = true
  enable_spot_instances = var.enable_spot_instances
  enable_savings_plans = true

  # Alerts
  budget_amount        = var.monthly_budget
  budget_threshold     = 80
  alert_email          = var.cost_alert_email
}

# Disaster Recovery
module "disaster_recovery" {
  source = "./modules/disaster-recovery"

  # Backup Configuration
  aws_backup_vault     = module.aws_infrastructure.backup_vault_arn
  azure_recovery_vault = module.azure_infrastructure.recovery_vault_id
  gcp_backup_plan      = module.gcp_infrastructure.backup_plan_id

  # Replication
  enable_cross_region  = true
  enable_cross_cloud   = var.enable_cross_cloud_dr

  # Recovery Targets
  rto_minutes          = var.rto_minutes
  rpo_minutes          = var.rpo_minutes

  # Testing
  enable_dr_testing    = true
  test_schedule        = "0 2 * * SUN"

  tags = var.common_tags
}

# Monitoring and Observability
module "monitoring" {
  source = "./modules/monitoring"

  # Cloud-native monitoring
  aws_cloudwatch_log_group = module.aws_infrastructure.log_group_name
  azure_log_analytics_id   = module.azure_infrastructure.log_analytics_id
  gcp_logging_project      = var.gcp_project_id

  # Unified observability
  enable_prometheus    = true
  enable_grafana       = true
  enable_jaeger        = true
  enable_elk_stack     = true

  # Metrics aggregation
  enable_cross_cloud_metrics = true

  # Alerting
  alert_endpoints      = var.alert_endpoints

  tags = var.common_tags
}

# Outputs
output "aws_infrastructure" {
  value = {
    vpc_id               = module.aws_infrastructure.vpc_id
    eks_cluster_endpoint = module.aws_infrastructure.eks_cluster_endpoint
    s3_buckets           = module.aws_infrastructure.s3_buckets
  }
  sensitive = true
}

output "azure_infrastructure" {
  value = {
    vnet_id              = module.azure_infrastructure.vnet_id
    aks_cluster_endpoint = module.azure_infrastructure.aks_cluster_endpoint
    storage_accounts     = module.azure_infrastructure.storage_accounts
  }
  sensitive = true
}

output "gcp_infrastructure" {
  value = {
    network_id           = module.gcp_infrastructure.network_id
    gke_cluster_endpoint = module.gcp_infrastructure.gke_cluster_endpoint
    storage_buckets      = module.gcp_infrastructure.storage_buckets
  }
  sensitive = true
}

output "kubeconfig_commands" {
  value = {
    aws   = "aws eks update-kubeconfig --name ${module.aws_infrastructure.cluster_name} --region ${var.aws_primary_region}"
    azure = "az aks get-credentials --name ${module.azure_infrastructure.cluster_name} --resource-group ${module.azure_infrastructure.resource_group_name}"
    gcp   = "gcloud container clusters get-credentials ${module.gcp_infrastructure.cluster_name} --region ${var.gcp_primary_region}"
  }
  description = "Commands to configure kubectl for each cloud"
}
