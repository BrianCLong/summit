package supply_chain

# Default to deny
default spdx_sbom_signed = false
default cyclonedx_sbom_signed = false
default provenance_exists = false

deny[msg] {
  not input.spdx_sbom_signed
  msg := "SPDX SBOM must be signed (detected via .bundle)"
}

deny[msg] {
  not input.cyclonedx_sbom_signed
  msg := "CycloneDX SBOM must be signed (detected via .bundle)"
}

deny[msg] {
  not input.provenance_exists
  msg := "Provenance attestation is required"
}

# Helper to check if everything is valid
allow {
  input.spdx_sbom_signed
  input.cyclonedx_sbom_signed
  input.provenance_exists
  count(deny) == 0
}
