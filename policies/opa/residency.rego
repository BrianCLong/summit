package opa.residency

import future.keywords

deny[msg] {
  not input.artifact.region in input.tenant.allowed_regions
  msg := "Data residency violation"
}
