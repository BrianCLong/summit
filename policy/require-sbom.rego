package main

# Policy to validate SBOM content integrity

# Deny if it looks like an SPDX file but lacks a Document Name
deny[msg] {
  input.spdxVersion
  not input.name
  msg := "SPDX SBOM must have a document name"
}

# Deny if it looks like a CycloneDX file but lacks a Serial Number
deny[msg] {
  input.bomFormat == "CycloneDX"
  not input.serialNumber
  msg := "CycloneDX SBOM must have a serial number"
}

# Deny if it lacks a creation timestamp (SPDX)
deny[msg] {
  input.spdxVersion
  not input.creationInfo.created
  msg := "SPDX SBOM must have a creation timestamp"
}

# Deny if it lacks metadata (CycloneDX)
deny[msg] {
  input.bomFormat == "CycloneDX"
  not input.metadata.timestamp
  msg := "CycloneDX SBOM must have metadata timestamp"
}
