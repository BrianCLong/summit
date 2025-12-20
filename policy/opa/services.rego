package services

default allow = false

# Allow frontend to access the GraphQL API
allow {
  input.source_spiffe_id == "spiffe://intelgraph.local/frontend"
  input.destination_service == "graphql"
}

# Allow GraphQL API to access the database
allow {
  input.source_spiffe_id == "spiffe://intelgraph.local/graphql"
  input.destination_service == "postgres"
}
