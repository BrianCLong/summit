# Azure Infrastructure Module
# Provisions VNet, AKS, storage, and networking resources

locals {
  cluster_name      = "${var.project_name}-${var.environment}-aks"
  resource_group    = "${var.project_name}-${var.environment}-rg"
  log_analytics_ws  = "${var.project_name}-${var.environment}-la"
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = local.resource_group
  location = var.location

  tags = var.tags
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-${var.environment}-vnet"
  address_space       = [var.vnet_cidr]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = var.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 4, 0)]

  service_endpoints = ["Microsoft.Storage", "Microsoft.Sql", "Microsoft.KeyVault"]
}

resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 4, 1)]

  service_endpoints = ["Microsoft.Sql"]
}

resource "azurerm_subnet" "gateway" {
  count = var.enable_vpn || var.enable_express_route ? 1 : 0

  name                 = "GatewaySubnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [cidrsubnet(var.vnet_cidr, 4, 2)]
}

# Network Security Group
resource "azurerm_network_security_group" "aks" {
  name                = "${local.cluster_name}-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  count = var.enable_monitor ? 1 : 0

  name                = local.log_analytics_ws
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = local.cluster_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.cluster_version

  default_node_pool {
    name                = "default"
    node_count          = var.min_nodes
    vm_size             = var.node_vm_size
    vnet_subnet_id      = azurerm_subnet.aks.id
    type                = "VirtualMachineScaleSets"
    enable_auto_scaling = true
    min_count           = var.min_nodes
    max_count           = var.max_nodes
    max_pods            = 110
    os_disk_size_gb     = 100

    upgrade_settings {
      max_surge = "10%"
    }

    tags = var.tags
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "calico"
    load_balancer_sku = "standard"
    service_cidr      = "10.100.0.0/16"
    dns_service_ip    = "10.100.0.10"
  }

  # Enable OIDC and Workload Identity
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # Enable monitoring
  dynamic "oms_agent" {
    for_each = var.enable_monitor ? [1] : []
    content {
      log_analytics_workspace_id = azurerm_log_analytics_workspace.main[0].id
    }
  }

  # Azure Active Directory Integration
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = var.admin_group_object_ids
  }

  # Key Vault Secrets Provider
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  tags = var.tags
}

# Additional Node Pool for spot instances
resource "azurerm_kubernetes_cluster_node_pool" "spot" {
  count = var.enable_spot_instances ? 1 : 0

  name                  = "spot"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.node_vm_size
  vnet_subnet_id        = azurerm_subnet.aks.id

  enable_auto_scaling = true
  min_count           = 0
  max_count           = var.max_nodes
  priority            = "Spot"
  eviction_policy     = "Delete"
  spot_max_price      = -1

  node_labels = {
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "kubernetes.azure.com/scalesetpriority=spot:NoSchedule"
  ]

  tags = var.tags
}

# Key Vault
resource "azurerm_key_vault" "main" {
  count = var.enable_key_vault ? 1 : 0

  name                       = "${var.project_name}${var.environment}kv"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    virtual_network_subnet_ids = [
      azurerm_subnet.aks.id
    ]
  }

  tags = var.tags
}

resource "azurerm_key_vault_access_policy" "aks" {
  count = var.enable_key_vault ? 1 : 0

  key_vault_id = azurerm_key_vault.main[0].id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].object_id

  secret_permissions = [
    "Get",
    "List"
  ]

  certificate_permissions = [
    "Get",
    "List"
  ]
}

# Storage Account
resource "azurerm_storage_account" "main" {
  name                     = "${var.project_name}${var.environment}st"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  account_kind             = "StorageV2"

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }

  tags = var.tags
}

# Blob Container for data
resource "azurerm_storage_container" "data" {
  name                  = "data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Blob Container for backup
resource "azurerm_storage_container" "backup" {
  count = var.enable_blob_backup ? 1 : 0

  name                  = "backup"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Storage Account for backup with lifecycle management
resource "azurerm_storage_management_policy" "backup" {
  count = var.enable_blob_backup ? 1 : 0

  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "archive-old-backups"
    enabled = true

    filters {
      prefix_match = ["backup/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30
        tier_to_archive_after_days_since_modification_greater_than = 90
        delete_after_days_since_modification_greater_than          = 365
      }

      snapshot {
        delete_after_days_since_creation_greater_than = 90
      }
    }
  }
}

# Azure Files for shared storage
resource "azurerm_storage_share" "kubernetes" {
  count = var.enable_azure_files ? 1 : 0

  name                 = "kubernetes"
  storage_account_name = azurerm_storage_account.main.name
  quota                = 100

  metadata = var.tags
}

# Recovery Services Vault for backup
resource "azurerm_recovery_services_vault" "main" {
  name                = "${var.project_name}-${var.environment}-rsv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
  soft_delete_enabled = true

  tags = var.tags
}

# VPN Gateway (optional)
resource "azurerm_public_ip" "vpn" {
  count = var.enable_vpn ? 1 : 0

  name                = "${var.project_name}-${var.environment}-vpn-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = var.tags
}

resource "azurerm_virtual_network_gateway" "vpn" {
  count = var.enable_vpn ? 1 : 0

  name                = "${var.project_name}-${var.environment}-vpn-gw"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"

  active_active = false
  enable_bgp    = false
  sku           = "VpnGw1"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn[0].id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway[0].id
  }

  tags = var.tags
}

# Data sources
data "azurerm_client_config" "current" {}

# Outputs
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_endpoint" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].host
}

output "aks_cluster_ca" {
  value = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
}

output "aks_cluster_token" {
  value     = azurerm_kubernetes_cluster.main.kube_config[0].password
  sensitive = true
}

output "storage_accounts" {
  value = {
    primary = azurerm_storage_account.main.name
  }
}

output "log_analytics_id" {
  value = var.enable_monitor ? azurerm_log_analytics_workspace.main[0].id : null
}

output "recovery_vault_id" {
  value = azurerm_recovery_services_vault.main.id
}

output "key_vault_id" {
  value = var.enable_key_vault ? azurerm_key_vault.main[0].id : null
}
