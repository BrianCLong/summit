package supply_chain

# Default to deny
default sbom_signed = false
default provenance_exists = false

deny[msg] {
  not input.sbom_signed
  msg := "SBOM must be signed"
}

deny[msg] {
  not input.provenance_exists
  msg := "Provenance attestation is required"
}

# Helper to check if everything is valid
allow {
  input.sbom_signed
  input.provenance_exists
  count(deny) == 0
}
