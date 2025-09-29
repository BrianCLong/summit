resource "google_container_cluster" "primary" {
  name     = "intelgraph-prod-cluster"
  location = var.gcp_region

  # We can specify a single zone for simplicity in this example, or multiple for high availability
  node_locations = [
    var.gcp_zone
  ]

  initial_node_count = 1 # This will be overridden by the node_pool below

  # Connect to the custom VPC and subnet
  network    = google_compute_network.intelgraph_vpc.name
  subnetwork = google_compute_subnetwork.intelgraph_subnet.name

  # Enable monitoring and logging for observability
  monitoring_service = "monitoring.googleapis.com/kubernetes"
  logging_service    = "logging.googleapis.com/kubernetes"

  # Network policy for security
  network_policy {
    enabled = true
  }

  # Workload Identity for secure access to other Google Cloud services
  # This is crucial for GitHub Actions to authenticate to GKE
  workload_identity_config {
    workload_pool = "${var.gcp_project}.svc.id.goog"
  }

  # Private cluster for enhanced security
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # Set to true if you want to access master endpoint from outside VPC
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Release channel for automatic upgrades
  release_channel {
    channel = "REGULAR"
  }

  # Enable IP aliasing for Pods and Services
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
}

resource "google_container_node_pool" "primary_nodes" {
  name       = "default-node-pool"
  location   = var.gcp_region
  cluster    = google_container_cluster.primary.name
  node_count = 3 # Number of nodes in the node pool

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4" # Adjust machine type as needed
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Associate service account for Workload Identity
    service_account = "${var.gcp_project}.svc.id.goog[${google_container_cluster.primary.name}/default]"
  }

  # Auto-repair and auto-upgrade for node pool
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  depends_on = [
    google_container_cluster.primary
  ]
}
