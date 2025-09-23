package psi

deny[msg] {
  input.ttlMs > 1800000
  msg = "ttl_too_long"
}
