variable "enable_vertex_vector" { type = bool; default = false }
variable "vertex_location" { type = string; default = "us-central1" }
variable "vertex_project" { type = string }

resource "google_vertex_ai_index" "intelgraph" {
  count    = var.enable_vertex_vector ? 1 : 0
  project  = var.vertex_project
  region   = var.vertex_location
  display_name = "intelgraph-case-index"
  metadata = jsonencode({
    contentsDeltaUri = null
    config = {
      dimensions = 768
      algorithmConfig = { treeAhConfig = { leafNodeEmbeddingCount = 1000, leafNodesToSearchPercent = 5 } }
    }
  })
}

resource "google_vertex_ai_index_endpoint" "intelgraph" {
  count    = var.enable_vertex_vector ? 1 : 0
  project  = var.vertex_project
  region   = var.vertex_location
  display_name = "intelgraph-index-endpoint"
}
