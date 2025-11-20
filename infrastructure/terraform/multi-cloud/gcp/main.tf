# GCP Infrastructure Module
# Provisions VPC, GKE, storage, and networking resources

locals {
  cluster_name = "${var.project_name}-${var.environment}-gke"
  network_name = "${var.project_name}-${var.environment}-vpc"
}

# VPC Network
resource "google_compute_network" "main" {
  name                    = local.network_name
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"

  project = var.project_id
}

# Subnets
resource "google_compute_subnetwork" "gke" {
  name          = "${local.network_name}-gke"
  ip_cidr_range = cidrsubnet(var.vpc_cidr, 4, 0)
  region        = var.region
  network       = google_compute_network.main.id

  # Secondary IP ranges for pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = cidrsubnet(var.vpc_cidr, 2, 1)
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = cidrsubnet(var.vpc_cidr, 4, 1)
  }

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }

  project = var.project_id
}

# Cloud Router for NAT
resource "google_compute_router" "main" {
  name    = "${local.network_name}-router"
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn = 64514
  }

  project = var.project_id
}

# Cloud NAT
resource "google_compute_router_nat" "main" {
  name                               = "${local.network_name}-nat"
  router                             = google_compute_router.main.name
  region                             = google_compute_router.main.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }

  project = var.project_id
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "${local.network_name}-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "icmp"
  }

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  source_ranges = [var.vpc_cidr]

  project = var.project_id
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "${local.network_name}-allow-ssh"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"] # IAP range

  project = var.project_id
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = local.cluster_name
  location = var.region

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.gke.name

  # Network configuration
  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All"
    }
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
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

    gce_persistent_disk_csi_driver_config {
      enabled = true
    }

    gcs_fuse_csi_driver_config {
      enabled = true
    }

    gcp_filestore_csi_driver_config {
      enabled = var.enable_filestore
    }
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

  # Monitoring and logging
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]

    managed_prometheus {
      enabled = true
    }
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  # Binary authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Enable Shielded Nodes
  enable_shielded_nodes = true

  # Resource labels
  resource_labels = var.labels

  project = var.project_id
}

# Primary node pool
resource "google_container_node_pool" "primary" {
  name       = "primary"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = var.min_nodes

  autoscaling {
    min_node_count = var.min_nodes
    max_node_count = var.max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    preemptible  = false
    machine_type = var.machine_type

    disk_size_gb = 100
    disk_type    = "pd-standard"

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.gke.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = merge(
      var.labels,
      {
        "nodepool" = "primary"
      }
    )

    tags = ["gke-node", "${local.cluster_name}-node"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  project = var.project_id
}

# Spot node pool for cost optimization
resource "google_container_node_pool" "spot" {
  count = var.enable_spot_instances ? 1 : 0

  name       = "spot"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 0

  autoscaling {
    min_node_count = 0
    max_node_count = var.max_nodes
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  node_config {
    preemptible  = true
    machine_type = var.machine_type

    disk_size_gb = 100
    disk_type    = "pd-standard"

    service_account = google_service_account.gke.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = merge(
      var.labels,
      {
        "nodepool" = "spot"
      }
    )

    taint {
      key    = "spot"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    tags = ["gke-node", "${local.cluster_name}-spot-node"]

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }

  project = var.project_id
}

# Service Account for GKE
resource "google_service_account" "gke" {
  account_id   = "${var.project_name}-${var.environment}-gke"
  display_name = "GKE service account for ${local.cluster_name}"

  project = var.project_id
}

resource "google_project_iam_member" "gke_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke.email}"
}

resource "google_project_iam_member" "gke_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke.email}"
}

resource "google_project_iam_member" "gke_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke.email}"
}

# Cloud Storage Buckets
resource "google_storage_bucket" "data" {
  name     = "${var.project_name}-${var.environment}-data-${var.project_id}"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.gke.id
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  labels = var.labels
}

resource "google_storage_bucket" "backup" {
  count = var.enable_gcs_backup ? 1 : 0

  name     = "${var.project_name}-${var.environment}-backup-${var.project_id}"
  location = var.region
  project  = var.project_id

  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 180
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  labels = var.labels
}

# Cloud KMS
resource "google_kms_key_ring" "gke" {
  count = var.enable_kms ? 1 : 0

  name     = "${local.cluster_name}-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "gke" {
  name     = "${local.cluster_name}-key"
  key_ring = var.enable_kms ? google_kms_key_ring.gke[0].id : google_kms_key_ring.gke_default[0].id

  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }

  labels = var.labels
}

# Default key ring if KMS is disabled (for storage encryption)
resource "google_kms_key_ring" "gke_default" {
  count = var.enable_kms ? 0 : 1

  name     = "${local.cluster_name}-default-keyring"
  location = var.region
  project  = var.project_id
}

# Secret Manager
resource "google_secret_manager_secret" "cluster" {
  count = var.enable_secret_manager ? 1 : 0

  secret_id = "${local.cluster_name}-secrets"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = var.labels
}

# Filestore for shared storage
resource "google_filestore_instance" "kubernetes" {
  count = var.enable_filestore ? 1 : 0

  name     = "${local.cluster_name}-filestore"
  location = var.region
  tier     = "BASIC_HDD"

  file_shares {
    capacity_gb = 1024
    name        = "kubernetes"
  }

  networks {
    network = google_compute_network.main.name
    modes   = ["MODE_IPV4"]
  }

  labels  = var.labels
  project = var.project_id
}

# Cloud VPN (optional)
resource "google_compute_address" "vpn" {
  count = var.enable_vpn ? 1 : 0

  name         = "${local.network_name}-vpn-ip"
  region       = var.region
  address_type = "EXTERNAL"
  project      = var.project_id
}

resource "google_compute_vpn_gateway" "main" {
  count = var.enable_vpn ? 1 : 0

  name    = "${local.network_name}-vpn-gw"
  network = google_compute_network.main.id
  region  = var.region
  project = var.project_id
}

# Backup Plan
resource "google_gke_backup_backup_plan" "cluster" {
  count = var.enable_gcs_backup ? 1 : 0

  name     = "${local.cluster_name}-backup-plan"
  cluster  = google_container_cluster.primary.id
  location = var.region
  project  = var.project_id

  retention_policy {
    backup_delete_lock_days = 30
    backup_retain_days      = 90
  }

  backup_schedule {
    cron_schedule = "0 2 * * *"
  }

  backup_config {
    include_volume_data = true
    include_secrets     = true

    selected_namespaces {
      namespaces = ["default", "kube-system"]
    }
  }
}

# Outputs
output "network_id" {
  value = google_compute_network.main.id
}

output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  value = google_container_cluster.primary.endpoint
}

output "gke_cluster_ca" {
  value = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
}

output "gke_cluster_token" {
  value     = data.google_client_config.default.access_token
  sensitive = true
}

output "storage_buckets" {
  value = {
    data   = google_storage_bucket.data.name
    backup = var.enable_gcs_backup ? google_storage_bucket.backup[0].name : null
  }
}

output "backup_plan_id" {
  value = var.enable_gcs_backup ? google_gke_backup_backup_plan.cluster[0].id : null
}

data "google_client_config" "default" {}
