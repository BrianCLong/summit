package cleanrooms

default allow = false

allow {
  input.query_name == input.allowed_queries[_]
  input.residency == input.allowed_residency
}

pii_off {
  input.piiOff == true
}
