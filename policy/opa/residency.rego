# (Guy IG) OPA — Data Residency Enforcement for streaming
package intelgraph.residency

default allow = false

# EU subjects must be processed in EU topics/clusters only
allow {
  input.action == "publish"
  input.event.subject_region == "EU"
  startswith(input.event.topic, "eu.")
  input.cluster.region == "eu-central"
}

# US subjects must remain in US
allow {
  input.action == "publish"
  input.event.subject_region == "US"
  startswith(input.event.topic, "us.")
  input.cluster.region == "us-east"
}
