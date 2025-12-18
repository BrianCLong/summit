package intelgraph.ingestion

default allow = false

# Only internal services or admins can trigger ingestion
allow {
  input.user.role == "admin"
}

allow {
  input.user.role == "service"
  # Check allowlisted sources
  allowed_source(input.resource.source_url)
}

allowed_source(url) {
  startswith(url, "https://trusted-source.com")
}

allowed_source(url) {
  startswith(url, "s3://internal-bucket/")
  # Enforce tenant isolation in the bucket path
  contains(url, concat("/", ["s3://internal-bucket", input.user.tenantId]))
}
