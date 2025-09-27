package intelgraph.retention

default tier := "standard-365d"

pii := input.attributes.sensitivity == "pii"
legal_hold := input.legal_hold == true

tier := when {
  legal_hold
} then "legal-hold" else when {
  pii
} then "short-30d" else tier
