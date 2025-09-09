package deploy.gates

# Require cosign signature, SBOM, and no critical vulns
allow {
  input.image.signed
  input.image.slsa_level >= 3
  not input.image.has_critical_vulns
  input.artifacts.sbom_present
}