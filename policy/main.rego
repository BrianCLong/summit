package intelgraph.main

import data.intelgraph.graphql
import data.intelgraph.rest
import data.intelgraph.ingestion
import data.intelgraph.migrations

default allow = false

# Main dispatch logic based on input.resource.source
allow {
  input.resource.source == "graphql"
  graphql.allow
}

allow {
  input.resource.source == "rest"
  rest.allow
}

allow {
  input.resource.source == "ingestion"
  ingestion.allow
}

allow {
  input.resource.source == "migration"
  migrations.allow
}
