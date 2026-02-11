package services

import future.keywords.if
import future.keywords.contains

default allow := false

# Allow frontend to access the GraphQL API
allow if {
  input.source_spiffe_id == "spiffe://intelgraph.local/frontend"
  input.destination_service == "graphql"
}

# Allow GraphQL API to access the database
allow if {
  input.source_spiffe_id == "spiffe://intelgraph.local/graphql"
  input.destination_service == "postgres"
}
