package intelgraph.ingestion

import future.keywords.in

import future.keywords.if
import future.keywords.contains

default allow := false

# Only internal services or admins can trigger ingestion
allow if {
  input.user.role == "admin"
}

allow if {
  input.user.role == "service"
  # Check allowlisted sources
  allowed_source(input.resource.source_url)
}

allowed_source(url) if {
  startswith(url, "https://trusted-source.com")
}

allowed_source(url) if {
  startswith(url, "s3://internal-bucket/")
  # Enforce tenant isolation in the bucket path
  contains(url, concat("/", ["s3://internal-bucket", input.user.tenantId]))
}
