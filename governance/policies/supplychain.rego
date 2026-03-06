package supplychain.policy

deny["missing_spdx_sbom"] {
  not input.artifact.sbom_spdx
}

deny["missing_cyclonedx_sbom"] {
  not input.artifact.sbom_cyclonedx
}

deny["missing_provenance_attestation"] {
  not input.artifact.provenance_attestation
}
