resource "google_compute_network" "intelgraph_vpc" {
  name                    = "intelgraph-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "intelgraph_subnet" {
  name          = "intelgraph-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = var.gcp_region
  network       = google_compute_network.intelgraph_vpc.id
}
